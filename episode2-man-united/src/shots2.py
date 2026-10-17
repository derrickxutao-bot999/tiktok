"""Cut 2 shots: the cut-1 shot code, retimed to the beat, with camera moves
(parallax dollies, push-ins, a zoom through the CRT, shake) and effects."""
import math, os, random
from functools import lru_cache
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from style import *
import shots_room as R
import shots_gfx as G
from comp import finish, anchors, projector, warp_into, BL
from edit2 import BEAT, BAR, clip_time

def ease_in(t):
    t = max(0.0, min(1.0, t)); return t * t * t

def ease_out(t):
    t = max(0.0, min(1.0, t)); return 1 - (1 - t) ** 3

def lin(t, a, b, x0, x1):
    """Map t in [a, b] to [x0, x1], clamped."""
    k = max(0.0, min(1.0, (t - a) / (b - a)))
    return x0 + (x1 - x0) * k

def zoom(arr, z, c=(W / 2, H / 2), rot=0.0, dx=0.0, dy=0.0, centre=0.0):
    """2D camera on a finished frame: zoom about c, small roll, offset."""
    if abs(z - 1) < 1e-4 and not rot and not dx and not dy:
        return arr
    im = Image.fromarray(arr)
    a = math.radians(rot)
    ca, sa = math.cos(a) / z, math.sin(a) / z
    # output pixel (x, y) samples input at c + R^-1 (p - centre)/z
    # c stays put on screen (centre=0) or travels to the frame centre (centre=1)
    ox = c[0] + (W / 2 - c[0]) * centre + dx
    oy = c[1] + (H / 2 - c[1]) * centre + dy
    m = (ca, sa, c[0] - ca * ox - sa * oy, -sa, ca, c[1] + sa * ox - ca * oy)
    return np.asarray(im.transform((W, H), Image.AFFINE, m, Image.BICUBIC))

def shake(t, t0, dur, amp=18.0, seed=1):
    """Decaying hand-held shake after a hit at t0."""
    if not (t0 <= t < t0 + dur):
        return 0.0, 0.0, 0.0
    k = 1 - (t - t0) / dur
    rng = np.random.default_rng(int((t - t0) * 24) + seed)
    return tuple(float(v) for v in rng.normal(0, 1, 3) * np.array([amp, amp, 0.8]) * k * k)

class Confetti:
    def __init__(self, n=140, seed=3):
        rng = random.Random(seed)
        self.p = [(rng.uniform(-100, W + 100), rng.uniform(-900, -40), rng.uniform(-60, 60), rng.uniform(380, 720),
                   rng.uniform(0, 6.28), rng.uniform(-7, 7), rng.uniform(14, 30), rng.choice([C["red"], C["paper"], C["ochre_l"], C["red_d"], C["gold"]]))
                  for _ in range(n)]

    def draw(self, arr, t):
        if t < 0:
            return arr
        im = Image.fromarray(arr).convert("RGBA")
        lay = Image.new("RGBA", im.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(lay)
        for x0, y0, vx, vy, a0, va, s, col in self.p:
            x = x0 + vx * t + 30 * math.sin(t * 2 + a0)
            y = y0 + vy * t
            if y > H + 60:
                continue
            a = a0 + va * t
            w = s * abs(math.cos(a * 0.7)) + 2
            pts = [(x + math.cos(a) * dx - math.sin(a) * dy, y + math.sin(a) * dx + math.cos(a) * dy)
                   for dx, dy in ((-w / 2, -s / 3), (w / 2, -s / 3), (w / 2, s / 3), (-w / 2, s / 3))]
            d.polygon(pts, fill=(*hex2rgb(col), 235), outline=(42, 37, 34, 200))
        im.alpha_composite(lay)
        return np.asarray(im.convert("RGB"))

CONF = Confetti()

def flash(arr, a, col=(255, 252, 240)):
    if a <= 0:
        return arr
    return (arr * (1 - a) + np.array(col) * a).astype(np.uint8)

# ------------------------------------------------------------------ shots
@lru_cache(maxsize=1)
def _pull_quads():
    import json
    return json.load(open(os.path.join(BL, "2026", "pull_quads.json")))

def open_(t, fi):
    """Martinez fills the frame; hold, then the Blender pull-back (frames
    157-312) is retimed over 5.0-12.5 s."""
    import clipmap
    if t < 5.0:
        i = 1 + int(t * FPS)
    else:
        i = 157 + int(round(ease_io((t - 5.0) / 7.5) * 155))
    i = max(1, min(312, i))
    img = Image.open(os.path.join(BL, "2026", f"pull_{i:04d}.png")).convert("RGBA")
    q = _pull_quads()[str(i)]
    ct = clip_time(t)
    warp_into(img, clipmap.frame(round(ct * 25) / 25), q)
    k = ease((t - 5.0) / 7.5)
    cx = sum(p[0] for p in q) / 4; cy = sum(p[1] for p in q) / 4
    light = R.light_pool((W, H), (cx, cy), abs(q[1][0] - q[0][0]) * 2.0, "#9FB8C8", 0.18 * k) if k > 0 else None
    a = finish(img, fi, grade=("#C7CCD6", .16 * k), light=light, grain=2.0)
    # very slow drift while we are close on his face
    if t < 5.0:
        a = zoom(a, 1.0 + 0.03 * t / 5.0)
    return a

def profile(t, fi):
    R.CAM = None
    a = R.s02(0.5 + t * 1.25, fi)
    return zoom(a, 1.0 + 0.05 * t / 1.5, (W * .55, H * .4))

def standup(t, fi):
    era = "2026"
    R.CAM = dict(z=1.0 + 0.06 * t / 1.25, c=(W * .45, H * .5), par=1.4)
    return R.s03(2.5 + t * 0.75, fi)

def exit_(t, fi):
    # cut-in: closer on the door, slow push as it closes
    q = anchors("2026")["door_open"]
    c = ((q[0][0] + q[1][0]) / 2, (q[0][1] + q[2][1]) / 2)
    R.CAM = dict(z=1.55 + 0.1 * t / 2.25, c=c, par=1.0)
    return R.s03(5.45 + t * 1.05, fi)

def empty(t, fi):
    R.CAM = dict(z=1.0 + 0.04 * t / 2.5, c=(W / 2, H * .45), par=1.6)
    return R.s04(t, fi)

def enter(t, fi):
    q = anchors("1999")["door_open"]
    dc = ((q[0][0] + q[1][0]) / 2, (q[0][1] + q[2][1]) / 2)
    # push toward the opening door, then ease back as they walk in
    z = 1.0 + 0.22 * ease_out(t / 1.1) - 0.22 * ease((t - 1.6) / 2.4)
    R.CAM = dict(z=z, c=dc, par=1.2)
    old = t * 1.2 if t < 1.0 else 1.2 + (t - 1.0) * 1.3
    a = R.s05(old, fi)
    if 0.75 < t < 1.25:   # light bloom as the room becomes 1999
        a = flash(a, 0.35 * math.sin((t - .75) / .5 * math.pi), (255, 236, 196))
    return a

def orbit(t, fi):
    """Blender orbit: one continuous move, the era cuts on every bar."""
    f = min(239, int(t * FPS))
    era, base = [("1999", 0), ("2013", 60), ("2019", 120), ("2026", 180)][f // 60]
    img = Image.open(os.path.join(ROOT, "build", "orbit", f"o{era}_{f - base + 1:04d}.png")).convert("RGB")
    grade = {"1999": ("#E9D3B0", .1), "2013": ("#D8D8C8", .1), "2019": ("#C9CDD2", .16), "2026": ("#BCC4CF", .2)}[era]
    a = finish(img, fi, grade=grade)
    k = (t % BAR) / BAR
    if f // 60 > 0 and k < 0.12:  # bloom on each era cut
        a = flash(a, 0.4 * (1 - k / 0.12))
    return a

def title(t, fi):
    p = G.svg_open()
    k = ease_out(t / .45)
    sc = 1.35 - 0.35 * k
    p.append(f'<g transform="translate({W / 2} 990) scale({sc:.3f}) translate({-W / 2} -990)">')
    L = 560 * ease_out((t - .1) / .6)
    p.append(G.wobble_line([(W / 2 - L / 2, 820), (W / 2 + L / 2, 820)], 4, C["red"], seed=9))
    p.append(G.T(W / 2, 1010, "再等一会儿", 132, C["ink"], 400, fam="LXGW WenKai", op=k, ls=12))
    p.append('</g>')
    p.append(G.T(W / 2, 1110, "JUST A LITTLE LONGER", 30, C["grey"], op=ease((t - .5) / .6), ls=10))
    p.append(G.T(W / 2, 1220, "曼联球迷的忠诚，与他们的要求 · 第二集", 34, C["ink"], op=ease((t - .8) / .6), ls=4))
    out = 1 - ease((t - 2.2) / .3)
    a = G.out_frame(p, fi)
    return (a * out + np.array(hex2rgb(C["ivory"])) * (1 - out)).astype(np.uint8)

def date99(t, fi):
    return zoom(G.s08(0.2 + t * 1.6, fi), 1.0 + 0.04 * t / 2.5)

def basler(t, fi):
    a = G.s08(4.6 + t * 1.2, fi)
    dx, dy, r = shake(t, 2.05, .5, 10)
    return zoom(a, 1.0 + 0.05 * t / 2.5, (W / 2, 700), r, dx, dy)

def sleepy(t, fi):
    """Medium shot; ends by pushing through the CRT into the 90:00 clock."""
    R.CAM = dict(z=1.0 + 0.06 * min(t, 4.0) / 4.0, c=(W * .4, H * .5), par=1.3)
    if t > 3.9:
        clk = Image.fromarray(G.s10(1.2, fi))
        R.TV_INJECT = clk.crop((0, 960 - 405, 1080, 960 + 405))
        tvk = "inject"
    else:
        tvk = "match"
    old = t * 2.0
    a = _s09_with_tv(old, fi, tvk)
    R.TV_INJECT = None
    if t > 3.9:
        q = anchors("1999", "m")["screen"]
        z0 = 1.0 + 0.06
        cx = sum(p[0] for p in q) / 4; cy = sum(p[1] for p in q) / 4
        need = W / abs(q[1][0] - q[0][0]) * 1.12
        z = z0 * (need / z0) ** ease_in((t - 3.9) / 1.1)
        a = zoom(a, z / z0, (cx, cy), centre=ease((t - 3.9) / 1.1))
        a = flash(a, 0.5 * ease_in((t - 4.7) / .3))
    return a

def _s09_with_tv(old, fi, tvk):
    R.TV_OVERRIDE = tvk
    try:
        return R.s09(old, fi)
    finally:
        R.TV_OVERRIDE = None

def clock(t, fi):
    a = G.s10(1.2 + t * 1.6, fi)
    return zoom(a, 1.0 + 0.08 * ease_out(t / 2.5))

def corner1(t, fi):
    a = G.s11(t * 1.52, fi)
    dx, dy, r = shake(t, 2.5, .7, 14)
    a = zoom(a, 1.0 + 0.06 * t / 5.0, (W / 2, 640), r, dx, dy)
    return flash(a, 0.5 * max(0, 1 - (t - 2.5) / .25) if t >= 2.5 else 0)

def corner2(t, fi):
    a = G.s12(t * 1.18, fi)
    z = 1.0 + 0.18 * ease_in(t / 5.0)  # creeping push toward the goal
    return zoom(a, z, (W / 2, 520))

def joy(t, fi):
    R.CAM = dict(z=1.04 - 0.04 * ease_out(t / 5), c=(W * .5, 0), par=1.3)
    old = t * (4.0 / 3.5) if t < 3.5 else 4.0 + (t - 3.5) * 1.3
    a = R.s13(old, fi)
    dx, dy, r = shake(t, 0.0, 2.2, 22)
    a = zoom(a, 1.03, (W / 2, 120), r, dx, abs(dy) * .5)
    a = CONF.draw(a, t - 0.05)
    return a

def fergie(t, fi):
    return zoom(G.s14(0.3 + t * 1.7, fi), 1.0 + 0.05 * t / 2.5)

def dorm(t, fi):
    R.CAM = dict(z=1.0 + 0.08 * t / 5.0, c=(W * .5, H * .45), par=1.4)
    return R.s15(1.0 + t * 1.6, fi)

def seasons(t, fi):
    return G.s16b(t, fi, per=BEAT)

def facup(t, fi):
    old = t if t < 1.5 else (1.5 + (t - 1.5) * 1.4 if t < 6.5 else 8.5 + (t - 6.5) * 2.0)
    a = G.s17(old, fi)
    return zoom(a, 1.0 + 0.05 * t / 7.5, (W / 2, 1000))

def phone(t, fi):
    R.CAM = None
    old = 0.5 + t * 1.0 if t < 5.0 else 5.5 + (t - 5.0) * 1.1
    a = R.s18(old, fi)
    return zoom(a, 1.0 + 0.05 * t / 7.5, (W * .55, H * .35))

def morning(t, fi):
    a = R.s18(9.0 + t * 1.2, fi)
    return zoom(a, 1.05 - 0.05 * t / 2.5, (W * .55, H * .35))

def takeover(t, fi):
    a = G.s19(t * 1.6, fi)
    hits = [1.875, 2.44, 3.0]
    for h in hits:
        dx, dy, r = shake(t, h, .35, 9, seed=int(h * 10))
        if dx or dy:
            return zoom(a, 1.0, (W / 2, H / 2), r, dx, dy)
    return a

def newton(t, fi):
    return zoom(G.s20(0.4 + t * 1.6, fi), 1.12 - 0.12 * ease_out(t / 2.5))

def stands(t, fi):
    return zoom(G.s20(5.0 + t * 1.6, fi), 1.0 + 0.06 * t / 5.0, (W / 2, 900))

def fans(t, fi):
    a = G.s21(t, fi)
    return zoom(a, 1.0 + 0.22 * ease_io(t / 5.0), (W / 2, H * .62))

def protest(t, fi):
    a = G.s22(t * 1.28, fi)
    dx, dy, r = shake(t, 5.0, .6, 16)
    a = zoom(a, 1.0 + 0.05 * t / 7.5, (W / 2, H * .55), r, dx, dy)
    return a

def scarf(t, fi):
    a = G.s23(t * 1.13, fi)
    return zoom(a, 1.0 + 0.1 * ease_io(t / 7.5), (W * .48, H * .42))

def return_(t, fi):
    # long parallax dolly toward the seat and the TV
    q = anchors("2026")["screen"]
    c = (sum(p[0] for p in q) / 4, sum(p[1] for p in q) / 4 + 230)
    R.CAM = dict(z=1.0 + 0.18 * ease_io(t / 15.0), c=c, par=1.45)
    old = 2.0 + t * 1.25 if t < 12.0 else 17.0
    return R.s24(min(old, 16.95), fi)

def final(t, fi):
    return G.s25(min(6.4, 0.3 + t * 1.0), fi)

def end(t, fi):
    return G.s26(t, fi)

FN = {"open": open_, "profile": profile, "standup": standup, "exit": exit_, "empty": empty, "enter": enter,
      "orbit": orbit, "title": title, "date99": date99, "basler": basler, "sleepy": sleepy, "clock": clock,
      "corner1": corner1, "corner2": corner2, "joy": joy, "fergie": fergie, "dorm": dorm, "seasons": seasons,
      "facup": facup, "phone": phone, "morning": morning, "takeover": takeover, "newton": newton,
      "stands": stands, "fans": fans, "protest": protest, "scarf": scarf, "return": return_, "final": final, "end": end}

# ------------------------------------------------------------------ real footage on the TVs
import footage as FT
from chars import seated_back

def tvroom(era, t, fi, content, figs, z0, z1, cam="m", centre=1.0, grade=None, dark=0.35, glow=0.32, drift=(0, 0)):
    """Push in on a TV in the room until its picture nearly fills the frame;
    the family stays as silhouettes in the foreground. The footage is warped
    in after the zoom so it keeps its full resolution."""
    R.CAM = None
    R.FIG_DARK = dark
    R.TV_OVERRIDE = "off"
    try:
        img = R.room_base(era, t, tvk="off", cam=cam)
        P = R.projector_m(era) if cam == "m" else projector(era)
        items = [R.place(f, p, P, w, "back", fi // 2) for f, p, w in figs]
        img = R.with_sofa(img, era, items, cam=cam)
    finally:
        R.FIG_DARK = 0.0
        R.TV_OVERRIDE = None
    q = anchors(era, "m" if cam == "m" else False)["screen"]
    cx = sum(p[0] for p in q) / 4; cy = sum(p[1] for p in q) / 4
    z = z0 + (z1 - z0) * ease_io(t / max(1e-3, T_SHOT[0]))
    ox = cx + (W / 2 - cx) * centre + drift[0]; oy = cy + (H / 2 - cy) * centre + drift[1]
    a = zoom(np.asarray(img.convert("RGB")), z, (cx, cy), 0, ox - (cx + (W / 2 - cx) * centre), oy - (cy + (H / 2 - cy) * centre), centre)
    im = Image.fromarray(a).convert("RGBA")
    zq = [(ox + (p[0] - cx) * z, oy + (p[1] - cy) * z) for p in q]
    warp_into(im, content, zq)
    light = R.light_pool((W, H), (ox, oy), abs(zq[1][0] - zq[0][0]) * 0.9, "#E8EEF2", glow)
    return finish(im, fi, grade=grade, light=light, vignette=.3)

T_SHOT = [5.0]

def _z_fill(era, cam, frac=0.92):
    q = anchors(era, "m" if cam == "m" else False)["screen"]
    return frac * W / abs(q[1][0] - q[0][0])

FAMILY_99 = lambda pf=None, pc=None: [(R.FATHER, pf or seated_back(), R.SEAT_R), (R.CHILD, pc or seated_back(), R.SEAT)]

def basler(t, fi):
    T_SHOT[0] = 2.5
    src = 32.6 + t * 1.25
    zf = _z_fill("1999", "m")
    a = tvroom("1999", t, fi, FT.frame("ucl", src, "crt"), FAMILY_99(), zf * 0.55, zf * 0.75, grade=("#E3CBA4", .1))
    dx, dy, r = shake(t, 2.16, .4, 8)
    return zoom(a, 1.0, (W / 2, H / 2), r, dx, dy)

def corner1(t, fi):
    T_SHOT[0] = 5.0
    src = 306.5 + t * 1.4 if t < 2.5 else 311.0 + (t - 2.5) * 1.6
    zf = _z_fill("1999", "m")
    up = t >= 2.5
    pc = seated_back(arm="up" if up else "rest", lean=0.0 if up else 0.25)
    pf = seated_back(arm="up" if up else "rest")
    a = tvroom("1999", t, fi, FT.frame("ucl", src, "crt"), FAMILY_99(pf, pc), zf * 0.7, zf * 0.9, grade=("#E3CBA4", .1))
    dx, dy, r = shake(t, 2.5, .6, 14)
    a = zoom(a, 1.0, (W / 2, H / 2), r, dx, dy)
    return flash(a, 0.45 * max(0, 1 - (t - 2.5) / .25) if t >= 2.5 else 0)

def corner2(t, fi):
    T_SHOT[0] = 5.0
    src = 342.5 + t * 1.56
    zf = _z_fill("1999", "m")
    pc = seated_back(lean=0.3 * min(1, t / 4), head_drop=-0.2)
    a = tvroom("1999", t, fi, FT.frame("ucl", src, "crt"), FAMILY_99(None, pc), zf * 0.62, zf * 1.02, grade=("#E3CBA4", .1))
    return a

def fergie(t, fi):
    T_SHOT[0] = 2.5
    src = 313.4 + t * 0.85
    zf = _z_fill("1999", "m")
    pc = seated_back(arm="up", tilt=5 * math.sin(t * 6)); pf = seated_back(arm="up")
    return tvroom("1999", t, fi, FT.frame("ucl", src, "crt"), FAMILY_99(pf, pc), zf * 0.95, zf * 1.05, grade=("#E3CBA4", .1))

def dorm(t, fi):
    T_SHOT[0] = 5.0
    src = 141.5 + t if t < 2.5 else 204.0 + (t - 2.5)
    zf = _z_fill("2013", "m")
    figs = [(R.MATE1, seated_back(head_drop=.3), R.SEAT_L), (R.MATE2, seated_back(arm="chin"), R.SEAT_R),
            (R.TEEN, seated_back(head_drop=0.4 * min(1, t / 4)), R.SEAT)]
    return tvroom("2013", t, fi, FT.frame("fergie", src, "modern"), figs, zf * 0.5, zf * 0.78, grade=("#C9CCC4", .14))

def tv2024(t, fi):
    T_SHOT[0] = 5.0
    if t < 1.6:
        im = FT.frame("rp", 352.4 + t, "modern")
    elif t < 2.8:
        im = FT.frame("nos", 670.0 + (t - 1.6), "modern")
    elif t < 3.8:
        im = FT.frame("rp", 718.0 + (t - 2.8), "modern")
    else:
        im = FT.frame("rp", 736.0 + (t - 3.8), "modern")
    zf = _z_fill("2026", False)
    up = t > 3.8
    figs = [(R.ADULT, seated_back(arm="up" if up else "rest"), R.SEAT)]
    return tvroom("2026", t, fi, im, figs, zf * 0.62, zf * 0.85, cam=False, grade=("#BCC4CF", .16), dark=0.4)

def facup(t, fi):
    a = G.s17(t * 1.0 if t < 1.5 else 1.5 + (t - 1.5) * 5.0, fi)
    return zoom(a, 1.0 + 0.05 * t / 2.5, (W / 2, 1000))

_sleepy_old = sleepy
def sleepy(t, fi):
    if t <= 3.9:
        R.TV_INJECT = FT.frame("ucl", 60.0 + t * 1.5, "crt")
        R.TV_OVERRIDE = "inject"
        try:
            R.CAM = dict(z=1.0 + 0.06 * min(t, 4.0) / 4.0, c=(W * .4, H * .5), par=1.3)
            return R.s09(t * 2.0, fi)
        finally:
            R.TV_OVERRIDE = None; R.TV_INJECT = None
    return _sleepy_old(t, fi)

_joy_old = joy
def joy(t, fi):
    R.TV_INJECT = FT.frame("ucl", 351.3 + min(t, 3.0), "crt")
    R.TV_OVERRIDE = "inject"
    try:
        return _joy_old(t, fi)
    finally:
        R.TV_OVERRIDE = None; R.TV_INJECT = None

FN.update({"basler": basler, "corner1": corner1, "corner2": corner2, "fergie": fergie, "dorm": dorm,
           "tv2024": tv2024, "facup": facup, "sleepy": sleepy, "joy": joy})
