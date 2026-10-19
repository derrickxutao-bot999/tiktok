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

def zoom(arr, z, c=(W / 2, H / 2), rot=0.0, dx=0.0, dy=0.0, centre=0.0, fill=None):
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
    if fill is None:
        # extend with the nearest edge colour rather than black
        fill = tuple(int(v) for v in np.asarray(arr)[[0, -1, 0, -1], [0, 0, -1, -1]].mean(0))
    return np.asarray(im.transform((W, H), Image.AFFINE, m, Image.BICUBIC, fillcolor=fill))

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
    # standup, exit and empty are one continuous take (R.leave)
    R.CAM = R.leave_cam(t)
    return R.leave(t, fi)

def exit_(t, fi):
    R.CAM = R.leave_cam(1.25 + t)
    return R.leave(1.25 + t, fi)

def empty(t, fi):
    R.CAM = R.leave_cam(3.5 + t)
    return R.leave(3.5 + t, fi)

def enter(t, fi):
    """Picks up on the closed door where the 2026 take ended: it opens on
    1999, and the camera eases back as father and son walk in."""
    end = R.leave_cam(R.LEAVE_LEN)
    k = ease_io((t - 0.9) / 1.5)
    z = end["z"] + (1.0 - end["z"]) * k
    c = end["c"]
    to = (end["to"][0] + (c[0] - end["to"][0]) * k, end["to"][1] + (c[1] - end["to"][1]) * k)
    R.CAM = dict(z=z, c=c, to=to, par=1.25, figpar=1.0 + 0.25 * k)
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
        clk = Image.fromarray(minute_card(0.6, fi, "90+1'", [(0.15, "贝克汉姆 · 角球")], "0 – 1"))
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

# Real footage is used only where the story needs it, briefly, from sources a
# rights holder can license, cropped clear of broadcaster logos:
#   corner2: Solskjaer's winner, 1999 final (UEFA), last 2.5 s of the shot
#   dorm:    Ferguson's farewell speech, 12 May 2013 (Premier League), last 2.5 s

def corner2(t, fi):
    """The second corner as a diagram, then the real winner on the family's CRT."""
    if t < 2.5:
        a = G.s12(t * 1.6, fi)
        return zoom(a, 1.0 + 0.1 * ease_in(t / 2.5), (W / 2, 520))
    T_SHOT[0] = 2.5
    tt = t - 2.5
    src = 348.0 + tt * 0.92          # ball crosses the line at ~350.3 -> film 59.95
    zf = _z_fill("1999", "m")
    pc = seated_back(lean=0.3, head_drop=-0.2)
    return tvroom("1999", tt, fi, FT.frame("ucl", src, "crt"), FAMILY_99(None, pc), zf * 0.9, zf * 1.02, grade=("#E3CBA4", .1))

_dorm_room = dorm
def dorm(t, fi):
    """The silent dorm, then a push into the TV: Ferguson's farewell speech."""
    if t < 2.5:
        return _dorm_room(t, fi)
    T_SHOT[0] = 2.5
    tt = t - 2.5
    zf = _z_fill("2013", "m")
    figs = [(R.MATE1, seated_back(head_drop=.3), R.SEAT_L), (R.MATE2, seated_back(arm="chin"), R.SEAT_R),
            (R.TEEN, seated_back(head_drop=0.4), R.SEAT)]
    return tvroom("2013", tt, fi, FT.frame("fergie", 204.6 + tt, "modern"), figs, zf * 0.62, zf * 0.82, grade=("#C9CCC4", .14))

FN.update({"corner2": corner2, "dorm": dorm})

# ------------------------------------------------------------------ text instead of tactics boards
def minute_card(t, fi, minute, lines, score0, score1=None, t_flip=None, hit=None):
    """Kinetic type: the minute slams in, a line or two of what happens, the
    score flips on the hit. lines: [(t_in, text), ...]"""
    p = G.svg_open()
    k = ease_out(t / 0.3)
    sc = 1.25 - 0.25 * k
    p.append(f'<g transform="translate({W / 2} 760) scale({sc:.3f}) translate({-W / 2} -760)" opacity="{min(1, t / .15):.2f}">')
    p.append(G.T(W / 2, 800, minute, 250, C["red"], 600, fam="Noto Serif SC", ls=4))
    p.append('</g>')
    p.append(G.wobble_line([(W / 2 - 150 * k, 880), (W / 2 + 150 * k, 880)], 3, C["ink"], seed=5))
    for i, (ti, txt) in enumerate(lines):
        a = ease((t - ti) / .25)
        if a > 0:
            p.append(G.T(W / 2, 990 + i * 78 + (1 - a) * 14, txt, 54, C["ink"], 400, op=a, ls=3))
    flipped = t_flip is not None and t >= t_flip
    s = score1 if flipped else score0
    kk = ease((t - t_flip) / .25) if flipped else 1
    box_y = 1180 + len(lines) * 30
    p.append(f'<rect x="{W / 2 - 230}" y="{box_y}" width="460" height="96" fill="{C["ink"]}"/>')
    p.append(G.T(W / 2 - 150, box_y + 63, "曼联", 36, C["paper"], 600))
    p.append(G.T(W / 2 + 150, box_y + 63, "拜仁", 36, C["paper"], 600))
    p.append(G.T(W / 2, box_y + 66, s, 54, C["ochre_l"] if flipped else C["paper"], 600, op=kk))
    a = G.out_frame(p, fi)
    if hit is not None and t >= hit:
        dx, dy, r = shake(t, hit, .5, 14)
        a = zoom(a, 1.0 + 0.04 * max(0, 1 - (t - hit) / .5), (W / 2, 900), r, dx, dy)
        a = flash(a, 0.4 * max(0, 1 - (t - hit) / .2))
    return zoom(a, 1.0 + 0.03 * t / 2.5, (W / 2, 900))

def basler(t, fi):
    return minute_card(t, fi, "6'", [(0.2, "巴斯勒 · 任意球")], "0 – 0", "0 – 1", 2.05, 2.05)

def corner1(t, fi):
    if t < 2.5:
        return minute_card(t, fi, "90+1'", [(0.15, "贝克汉姆 · 角球"), (1.3, "谢林汉姆 · 扫进")], "0 – 1", "1 – 1", 2.45, 2.45)
    return minute_card(t, fi, "90+1'", [(0.0, "贝克汉姆 · 角球"), (0.0, "谢林汉姆 · 扫进")], "1 – 1", "1 – 1", 0.0) if t < 3.75 else \
        minute_card(t - 3.75, fi, "90+3'", [(0.1, "又是角球")], "1 – 1")

_corner2_tv = corner2
def corner2(t, fi):
    if t < 2.5:
        return minute_card(t + 1.25, fi, "90+3'", [(0.1, "又是角球"), (1.0, "谢林汉姆 · 头球一摆")], "1 – 1")
    return _corner2_tv(t, fi)

FN.update({"basler": basler, "corner1": corner1, "corner2": corner2})

# ------------------------------------------------------------------ cut 3: deeper content
from chars import Figure
OLDFATHER = Figure("oldfather")

def nfather(t, fi):
    """1999, after the winner: the boy against his father, the room quiet again."""
    R.CAM = dict(z=1.04 + 0.05 * t / 2.5, c=(W * .5, H * .55), par=1.4)
    return R.s13(5.0 + t * 0.6, fi)

def pair(t, fi):
    """2026: the father, older now, back on the sofa beside his son."""
    era = "2026"; P = projector(era)
    q = anchors(era)["screen"]
    c = ((R.SEAT[0] + R.SEAT_R[0]) / 2, 0)
    sx, sy, _ = P((-0.0, -0.55, 1.1))
    R.CAM = dict(z=1.22 + 0.08 * ease_io(t / 5.0), c=(sx, sy), par=1.35)
    img = R.room_base(era, 209.5 + 8.3 + 10 + t, tvk="clip")
    seed = fi // 2
    look = min(1.0, max(0.0, (t - 2.2) / 0.4))
    items = [R.place(OLDFATHER, seated_back(lean=0.1, tilt=-6 * (1 - look), head_drop=0.15), P, R.SEAT_R, "back", seed),
             R.place(R.ADULT_SCARF, seated_back(tilt=8 * look, breathe=R.breathe(t)), P, R.SEAT, "back", seed)]
    img = R.with_sofa(img, era, items)
    light = R.tv_light(era, img, 0.22)
    return finish(img, fi, grade=("#C3C8CF", .2), light=light)

FN.update({"nfather": nfather, "munich": G.munich, "seats": G.seats, "wembley": G.wembley,
           "debt": G.cost_debt, "rain": G.cost_rain, "tickets": G.cost_tickets, "jobs": G.cost_jobs, "pair": pair})

# ------------------------------------------------------------------ cut 4: transitions inside shots
def open_(t, fi):
    """Cut 4 keeps 0-3.0 (close on his face) and 9.65-12.5, where the whole
    pull-back now happens, fast."""
    import clipmap
    if t < 9.65:
        i = 1 + int(min(t, 6.4) * FPS)
    else:
        i = 157 + int(round(ease_io((t - 9.65) / 2.6) * 155))
    i = max(1, min(312, i))
    img = Image.open(os.path.join(BL, "2026", f"pull_{i:04d}.png")).convert("RGBA")
    q = _pull_quads()[str(i)]
    ct = clip_time(t)
    warp_into(img, clipmap.frame(round(ct * 25) / 25), q)
    k = ease((t - 9.65) / 2.6)
    cx = sum(p[0] for p in q) / 4; cy = sum(p[1] for p in q) / 4
    light = R.light_pool((W, H), (cx, cy), abs(q[1][0] - q[0][0]) * 2.0, "#9FB8C8", 0.18 * k) if k > 0 else None
    a = finish(img, fi, grade=("#C7CCD6", .16 * k), light=light, grain=2.0)
    if t < 3.0:
        a = zoom(a, 1.0 + 0.04 * t / 3.0)
    return a

def basler(t, fi):
    return minute_card(t, fi, "6'", [(0.1, "1999 · 欧冠决赛"), (0.4, "巴斯勒 · 任意球")], "0 – 0", "0 – 1", 2.05, 2.05)

_sleepy3 = sleepy
def sleepy(t, fi):
    """Starts inside the CRT showing the 6' card, pulls back into the room."""
    if t >= 0.8:
        return _sleepy3(t, fi)
    card = Image.fromarray(minute_card(2.4, fi, "6'", [(0.0, "1999 · 欧冠决赛"), (0.0, "巴斯勒 · 任意球")], "0 – 1"))
    R.TV_INJECT = card.crop((0, 960 - 405, 1080, 960 + 405))
    R.TV_OVERRIDE = "inject"
    try:
        R.CAM = dict(z=1.0, c=(W * .4, H * .5), par=1.3)
        a = R.s09(0.0, fi)
    finally:
        R.TV_OVERRIDE = None; R.TV_INJECT = None
    q = anchors("1999", "m")["screen"]
    cx = sum(p[0] for p in q) / 4; cy = sum(p[1] for p in q) / 4
    need = W / abs(q[1][0] - q[0][0]) * 1.12
    k = ease_out(t / 0.8)
    return zoom(a, need ** (1 - k), (cx, cy), centre=1 - k)

def nfather(t, fi):
    """1999, after the winner, in the wide shot. The camera pushes into the
    wall clock; its hands run backwards to 3:04 for the cut to Munich."""
    era = "1999"
    R.CAM = None
    img, grade = R._era_frame(era, 0.0 + t, fi)
    a = finish(img, fi, grade=grade)
    P = projector(era)
    cx0, cy0, ppm = P((1.85, 2.97 - 0.02, 2.0))
    r0 = 0.17 * ppm
    mx, my, mr = G.MUNICH_CLOCK
    k = ease_in(max(0.0, (t - 0.9) / 1.6))
    zend = mr / r0
    z = zend ** k
    a = zoom(a, z, (cx0, cy0), centre=k, fill=(46, 50, 54))
    # the room falls away into the dark of the next shot
    dark = np.array(hex2rgb("#2E3236"), np.float32)
    a = (a * (1 - 0.95 * k) + dark * 0.95 * k).astype(np.uint8)
    ox = cx0 + (W / 2 - cx0) * k; oy = cy0 + (my - cy0) * k   # where the clock sits now
    ox = cx0 + (mx - cx0) * k
    minutes = 21 * 60 + 52 - (21 * 60 + 52 - (3 * 60 + 4)) * ease_in(max(0.0, (t - 0.6) / 1.9))
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}">' + "".join(G.clock_svg(ox, oy, r0 * z, minutes)) + '</svg>'
    im = Image.fromarray(a).convert("RGBA")
    im.alpha_composite(svg_png(svg))
    return np.asarray(im.convert("RGB"))

def seasons(t, fi):
    """Ends by pushing into the glowing 23/24 FA Cup dot."""
    a = G.s16b(t, fi, per=BEAT)
    if t > 8.9:
        per = BEAT
        scroll = max(0.0, (t / per - 6)) * 110
        y = 520 - scroll + 10 * 110 - 15
        k = ease_in((t - 8.9) / 1.1)
        a = zoom(a, 1 + 5 * k, (420, y), centre=k)
        a = flash(a, 0.6 * ease_in((t - 9.6) / 0.4), (255, 246, 222))
    return a

_scarf3 = scarf
def scarf(t, fi):
    """Ends with the hallway door flooding with light: he goes through."""
    a = _scarf3(t, fi)
    if t > 6.7:
        k = ease_in((t - 6.7) / 0.8)
        x0, x1, y0, y1 = 760, 1010, 420, 1500
        X0 = x0 - (x0) * k; X1 = x1 + (W - x1) * k; Y0 = y0 - y0 * k; Y1 = y1 + (H - y1) * k
        im = Image.fromarray(a).convert("RGBA")
        lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(lay).rectangle([X0, Y0, X1, Y1], fill=(255, 248, 236, int(255 * min(1, 0.55 + 0.45 * k))))
        lay = lay.filter(ImageFilter.GaussianBlur(30 * (1 - k) + 4))
        im.alpha_composite(lay)
        a = np.asarray(im.convert("RGB"))
    return a

FN.update({"open": open_, "basler": basler, "sleepy": sleepy, "nfather": nfather, "seasons": seasons, "scarf": scarf})


# ------------------------------------------------------------------ cut 5: the scarf explained (replaces the 2021 postponement)
def protest(t, fi):
    return zoom(G.scarf_meaning(t, fi), 1.0 + 0.04 * t / 7.5, (W / 2, 900))

FN.update({"protest": protest})
