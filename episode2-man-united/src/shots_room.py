"""Shots set in the living room (Blender plates + SVG figures)."""
import math, os
from functools import lru_cache
import numpy as np
from PIL import Image, ImageFilter
from style import *
from chars import Figure, seated_back, standing_back, walking_front, seated_side, standing_side
from comp import *
import tv

SEAT = (-0.30, -0.55, 0.47)
SEAT_R = (0.38, -0.55, 0.47)
SEAT_L = (-0.98, -0.55, 0.47)
STAND = (-0.30, -0.12, 0.0)     # standing spot in front of the protagonist's seat
STAND_R = (0.38, -0.12, 0.0)

ADULT, CHILD, TEEN, FATHER = Figure("adult"), Figure("child"), Figure("teen"), Figure("father")
MATE1, MATE2 = Figure("mate1"), Figure("mate2")
ADULT_SCARF = Figure("adult"); ADULT_SCARF.scarf = True

SHADOW_DEF = ('<defs><radialGradient id="cs"><stop offset="0" stop-color="#1E1A17" stop-opacity="0.5"/>'
              '<stop offset="0.6" stop-color="#1E1A17" stop-opacity="0.22"/><stop offset="1" stop-color="#1E1A17" stop-opacity="0"/></radialGradient></defs>')

def place(fig, pose, P, world, view, seed=0, flip=False, expr=None, k=1.0):
    if fig is CHILD and "ft_l" not in pose:
        world = (world[0], world[1], world[2] + 0.15)  # a small boy kneels up on the cushion
    x, y, ppm = P(world)
    svg = fig.svg(pose, x, y, ppm * UNIT * k, view, flip=flip, seed=seed, expr=expr)
    if "ft_l" in pose and world[2] < 0.05:
        # soft contact shadow on the floor, squashed by the camera's view of the floor
        rx = 0.34 * ppm * fig.body_s; ry = 0.07 * ppm * fig.body_s
        svg = SHADOW_DEF + f'<ellipse cx="{x:.1f}" cy="{y + 2:.1f}" rx="{rx:.1f}" ry="{ry:.1f}" fill="url(#cs)"/>' + svg
    return svg

ERA_LIGHT = {"1999": ("#F4DDB2", "#D9EBC9"), "2013": ("#E6E3D3", "#DCE4EA"),
             "2019": ("#DFDFE0", "#CFDCEA"), "2026": ("#D8DCE3", "#C6D8EA")}
FIG_DARK = 0.0   # extra darkening when figures sit in front of a bright TV (set by shots2)

def grade_figs(lay, era, dark=0.0, rim=0.5, rim_dir=(0, 6)):
    """Sit the flat figures in the room's light: lose some saturation, take the
    room's colour, fall off toward the floor, and catch a rim of TV light on
    their upper edges."""
    a = np.asarray(lay, np.float32)
    al = a[..., 3:4] / 255
    if al.max() == 0:
        return lay
    rgb = a[..., :3]
    g = rgb.mean(2, keepdims=True)
    rgb = g + (rgb - g) * 0.8
    tint, rimc = ERA_LIGHT.get(era, ("#E0E0E0", "#D0DCE8"))
    tc = np.array(hex2rgb(tint), np.float32) / 255
    rgb = rgb * (0.62 + 0.38 * tc)
    ys = np.linspace(0, 1, H, dtype=np.float32)[:, None, None]
    rgb = rgb * (1.04 - 0.16 * ys) * (1 - dark)
    A = al[..., 0]
    sh = np.roll(np.roll(A, rim_dir[1], 0), rim_dir[0], 1)
    edge = np.clip(A - sh, 0, 1)
    edge = np.asarray(Image.fromarray((edge * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2.5)), np.float32)[..., None] / 255
    rc = np.array(hex2rgb(rimc), np.float32)
    rgb = rgb + (rc - rgb) * np.clip(edge * rim * (1 + dark), 0, 0.8)
    out = np.concatenate([rgb.clip(0, 255), a[..., 3:4]], 2).astype(np.uint8)
    return Image.fromarray(out, "RGBA")

def path_pos(pts, d):
    """Point at distance d along polyline pts (xy ground), plus total length."""
    segs = [(pts[i], pts[i + 1]) for i in range(len(pts) - 1)]
    tot = sum(math.dist(a, b) for a, b in segs)
    d = max(0, min(tot, d))
    for a, b in segs:
        L = math.dist(a, b)
        if d <= L:
            t = d / L if L else 0
            return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t), tot
        d -= L
    return pts[-1], tot

def seq(t, keys):
    """Piecewise eased interpolation of a scalar over (time, value) keys."""
    if t <= keys[0][0]:
        return keys[0][1]
    for (t0, v0), (t1, v1) in zip(keys, keys[1:]):
        if t <= t1:
            return v0 + (v1 - v0) * ease((t - t0) / (t1 - t0))
    return keys[-1][1]

@lru_cache(maxsize=4)
def _tv_hold(which):
    return tv.martinez(20, which, hold_all=True)

def tv_content(kind, t):
    if kind == "clip":
        import clipmap
        return clipmap.at(t)
    if kind == "clip2":
        import clipmap, edit2
        ct = edit2.clip_time(t)
        return None if ct is None else clipmap.frame(round(ct * 25) / 25)
    if kind == "inject":
        return TV_INJECT
    if kind == "martinez":
        return _tv_hold(1)
    if kind == "martinez2":
        return tv.martinez(t, 2)
    if kind == "match":
        return tv.match(t)
    if kind == "farewell":
        return tv.farewell(t)
    if kind == "off":
        return None
    return tv.glow(t=t)

def room_base(era, t, door=0.0, tvk="match", tvop=1.0, side=False, cam=False):
    """Background plate with the TV picture and the door at an angle."""
    key = "m" if cam == "m" else False
    pre = "m_" if cam == "m" else ""
    if TV_OVERRIDE:
        tvk = TV_OVERRIDE
    if door > 0.5 and not pre:
        img = plate(era, "bg_nodoor.png").copy()
        img.alpha_composite(door_layer(era, door))
    else:
        img = plate(era, pre + "bg.png").copy()
    c = tv_content(tvk, t)
    if c is not None and tvop > 0:
        warp_into(img, c, anchors(era, key)["screen"], opacity=tvop)
    return img

def tv_light(era, img, strength, col="#9FB8C8", cam=False):
    q = anchors(era, "m" if cam == "m" else False)["screen"]
    cx = sum(p[0] for p in q) / 4; cy = sum(p[1] for p in q) / 4
    r = abs(q[1][0] - q[0][0]) * 2.2
    return light_pool((W, H), (cx, cy), r, col, strength)

TV_INJECT = None
TV_OVERRIDE = None
CAM = None   # dict(z=zoom, c=(x, y) focus, par=extra zoom factor for foreground) set by shots2

def _zoom_layer(im, z, c):
    if abs(z - 1) < 1e-4:
        return im
    x0 = c[0] * (1 - 1 / z); y0 = c[1] * (1 - 1 / z)   # c stays fixed on screen
    return im.transform((W, H), Image.AFFINE, (1 / z, 0, x0, 0, 1 / z, y0), Image.BICUBIC)

def with_sofa(img, era, items, cam=False, behind=None):
    """Composite: plate -> (behind items) -> sofa -> figures in front? No:
    seated figures sit *behind* the sofa back from the camera's view, so the
    order is plate -> figures -> sofa."""
    pre = "m_" if cam == "m" else ""
    fg = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    if items:
        fg.alpha_composite(grade_figs(figures_layer(items), era, FIG_DARK))
    fg.alpha_composite(plate(era, pre + "sofa.png"))
    if CAM:
        z, c, par = CAM["z"], CAM["c"], CAM.get("par", 1.3)
        img = _zoom_layer(img.convert("RGBA"), z, c)
        fg = _zoom_layer(fg, 1 + (z - 1) * par, c)
    img = img.convert("RGBA")
    img.alpha_composite(fg)
    return img

def breathe(t, f=0.23, ph=0.0):
    return math.sin(2 * math.pi * f * t + ph)

# ---------------------------------------------------------------- s01
@lru_cache(maxsize=1)
def _pull_quads():
    import json
    return json.load(open(os.path.join(BL, "2026", "pull_quads.json")))

def s01(t, fi):
    import clipmap
    i = min(312, int(t * FPS) + 1)
    img = Image.open(os.path.join(BL, "2026", f"pull_{i:04d}.png")).convert("RGBA")
    q = _pull_quads()[str(i)]
    warp_into(img, clipmap.at(t), q)
    k = ease((t - 6.5) / 6.5)   # the TV glow only matters once the room is visible
    cx = sum(p[0] for p in q) / 4; cy = sum(p[1] for p in q) / 4
    light = light_pool((W, H), (cx, cy), abs(q[1][0] - q[0][0]) * 2.0, "#9FB8C8", 0.18 * k) if k > 0 else None
    return finish(img, fi, grade=("#C7CCD6", .16 * k), light=light)

# ---------------------------------------------------------------- s02
@lru_cache(maxsize=1)
def _profile_bg():
    """Soft out-of-focus wall behind the close-up: the 2026 plate, blurred."""
    im = plate("2026", "bg.png").copy()
    im = im.resize((W // 4, H // 4)).filter(ImageFilter.GaussianBlur(10)).resize((W, H), Image.BICUBIC)
    return tint(im, "#7D8796", .45)

def s02(t, fi):
    img = _profile_bg().copy()
    lid = t > 0.9
    blink = 1.55 < t < 1.68
    hd = seq(t, [(0, 0.0), (2.6, 0.7)])
    pose = seated_side(head_drop=hd, arm="low")
    expr = dict(closed=blink, lid=lid and not blink, brow=seq(t, [(0, 0), (1.2, -3)]), mouth=1 if t > 1.5 else 0)
    s = 4.8 + 0.05 * t           # very slow push
    x, y = W * 0.62, H * 0.38 + 280 * s
    svg = ADULT.svg(pose, x, y, s, "side", seed=fi // 2, expr=expr)
    img.alpha_composite(grade_figs(figures_layer([svg]), "2026", rim=0.9, rim_dir=(14, 0)))
    light = light_pool((W, H), (-80, H * 0.36), 900, "#9FB8C8", 0.35 * (1 + .1 * math.sin(t * 9)))
    return finish(img, fi, grade=("#BFC7D2", .18), light=light, vignette=.3)

# ---------------------------------------------------------------- s03
WALK_OUT = [(STAND[0], STAND[1]), (0.35, 0.9), (0.80, 2.15), (0.86, 2.35)]
THROUGH = [(0.86, 2.35), (0.97, 3.0), (0.97, 3.75)]

def s03(t, fi):
    era = "2026"
    P = projector(era)
    T_CLICK = 1.25
    tv_on = t < T_CLICK
    # TV switches off: picture collapses to a bright line in 0.2s
    door = seq(t, [(5.65, 0), (6.35, 82), (7.15, 82), (7.75, 0)])
    img = room_base(era, 16.0 + t, door=door, tvk="clip" if tv_on else "off")
    if T_CLICK <= t < T_CLICK + 0.22:
        q = anchors(era)["screen"]
        k = (t - T_CLICK) / 0.22
        cy = (q[0][1] + q[3][1]) / 2
        hh = (q[3][1] - q[0][1]) / 2 * (1 - k) ** 3
        from PIL import ImageDraw
        d = ImageDraw.Draw(img)
        d.rectangle([q[0][0] + 6, cy - max(1.5, hh), q[1][0] - 6, cy + max(1.5, hh)], fill=(235, 238, 240, int(255 * (1 - k * .6))))
    items = []; over = []
    seed = fi // 2
    if t < 2.6:
        arm = "remote_low" if t < 0.55 else ("remote" if t < 1.9 else "remote_low")
        hd = seq(t, [(1.4, 0), (2.4, 0.8)])
        items.append(place(ADULT, seated_back(arm=arm, head_drop=hd, breathe=breathe(t)), P, SEAT, "back", seed))
    elif t < 3.35:
        k = ease((t - 2.6) / 0.75)
        x, y, ppm = P(STAND)
        lift = (1 - k) * 0.46 * ppm  # rises from the seat; legs hidden by the sofa
        items.append(ADULT.svg(standing_back(), x, y + lift, ppm * UNIT, "back", seed=seed))
    else:
        tw = t - 3.35
        speed = 1.05
        (gx, gy), tot = path_pos(WALK_OUT, tw * speed)
        if tw * speed < tot:
            ph = (tw * speed) / 1.3
            items.append(place(ADULT, standing_back(phase=ph), P, (gx, gy, 0), "back", seed))
        elif t < 6.35:
            items.append(place(ADULT, standing_back(), P, (gx, gy, 0), "back", seed))
        else:
            d2 = (t - 6.35) * 0.95
            (gx, gy), tot2 = path_pos(THROUGH, d2)
            ph = d2 / 1.3
            svg = place(ADULT, standing_back(phase=ph if d2 < tot2 else None), P, (gx, gy, 0), "back", seed)
            if gy > 2.98:
                over.append(svg)   # beyond the threshold: clipped to the doorway
            else:
                items.append(svg)
    if over:
        lay = masked(grade_figs(figures_layer(over), era), poly_mask(anchors(era)["door_open"]))
        # redraw door on top so the closing leaf covers him
        base = plate(era, "bg_nodoor.png").copy()
        img2 = img.copy()
        img2.alpha_composite(lay)
        if door > 0.5:
            img2.alpha_composite(door_layer(era, door))
        img = img2
    img = with_sofa(img, era, items)
    light = tv_light(era, img, 0.22) if tv_on else None
    return finish(img, fi, grade=("#BCC4CF", .2 if tv_on else .27), light=light)

# ---------------------------------------------------------------- s04
def s04(t, fi):
    img = room_base("2026", t, tvk="off")
    img = with_sofa(img, "2026", [])
    return finish(img, fi, grade=("#B5BDC9", .28))

# ---------------------------------------------------------------- s05
ENTER_F = [(0.97, 3.55), (0.86, 2.4), (0.45, 0.7), (STAND_R[0], STAND_R[1])]
ENTER_B = [(0.80, 3.55), (0.66, 2.4), (-0.05, 0.75), (STAND[0], STAND[1])]

def _radial_mix(a, b, center, r, feather=220):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.sqrt((xx - center[0]) ** 2 + (yy - center[1]) ** 2)
    m = np.clip((r - d) / feather, 0, 1)[..., None]
    A = np.asarray(a, np.float32); B = np.asarray(b, np.float32)
    return Image.fromarray((A * (1 - m) + B * m).astype(np.uint8))

def _enter_figs(t, P, t_walk0=1.25):
    """Father and boy walk in from the hall, turn and sit."""
    items = []; over = []
    seed = int(t * 12)
    tw = t - t_walk0
    if tw < 0:
        return items, over
    dF, dB = tw * 0.95, tw * 0.95
    (fx, fy), totF = path_pos(ENTER_F, dF)
    (bx, by), totB = path_pos(ENTER_B, dB)
    # the boy holds his father's hand: arm raised toward him
    def walker(fig, pt, d, tot, stand_spot, seat, kscale, arm=None):
        if d < tot:
            pose = walking_front(d / (1.1 if fig is FATHER else 0.75), stride=1.0 if fig is FATHER else 0.8, arm_l=None)
            if arm:
                pose.update(el_r=arm[0], ha_r=arm[1])
            return place(fig, pose, P, (pt[0], pt[1], 0), "front", seed), pt[1]
        k = (d - tot) / 0.95  # seconds past arrival (approx)
        if k < 0.3:
            return place(fig, standing_back(), P, (stand_spot[0], stand_spot[1], 0), "back", seed), stand_spot[1]
        sk = ease((k - 0.3) / 0.5)
        if sk < 1:
            x, y, ppm = P((stand_spot[0], stand_spot[1], 0))
            return fig.svg(standing_back(), x, y + sk * 0.46 * ppm * (1 if fig is FATHER else .6), ppm * UNIT, "back", seed=seed), stand_spot[1]
        bob = max(0, math.sin((k - .8) * 6)) * 0.4 if fig is CHILD and k < 3 else 0
        return place(fig, seated_back(breathe=bob * 5, tilt=4 * bob), P, seat, "back", seed), seat[1]
    sf, yf = walker(FATHER, (fx, fy), dF, totF, STAND_R, SEAT_R, 1.0)
    sb, yb = walker(CHILD, (bx, by), dB, totB, STAND, SEAT, 0.62, arm=((60, -330), (120, -390)))
    for svg, y in sorted([(sf, yf), (sb, yb)], key=lambda a: -a[1]):
        (over if y > 2.98 else items).append(svg)
    return items, over

def s05(t, fi):
    door = seq(t, [(0.0, 0), (1.1, 84)])
    a = room_base("2026", t, door=door, tvk="off")
    b = room_base("1999", t, door=door, tvk="match", tvop=seq(t, [(1.6, 0), (2.4, 1)]))
    q = anchors("1999")["door_open"]
    dc = ((q[0][0] + q[1][0]) / 2, (q[0][1] + q[2][1]) / 2)
    r = seq(t, [(0.25, 0), (2.2, 2300)])
    img = _radial_mix(a, b, dc, r).convert("RGBA") if r < 2290 else b
    P = projector("1999")
    items, over = _enter_figs(t, P)
    if over:
        lay = masked(grade_figs(figures_layer(over), "1999"), poly_mask(q))
        img.alpha_composite(lay)
        img.alpha_composite(door_layer("1999", door))
    img = with_sofa(img, "1999", items)
    # warm spill from the open door
    light = light_pool((W, H), (dc[0], dc[1] + 200), 700, "#F2C878", 0.35 * ease(t / 1.2))
    g = seq(t, [(0, .28), (2.0, .1)])
    col = "#B5BDC9" if t < 1.0 else "#E9D3B0"
    return finish(img, fi, grade=(col, g), light=light)

# ---------------------------------------------------------------- s06
ERAS6 = [(0.0, "1999"), (3.6, "2013"), (7.4, "2019"), (11.0, "2026")]

def _era_frame(era, t, fi):
    P = projector(era)
    seed = fi // 2
    items = []
    if era == "1999":
        img = room_base(era, t, tvk="match")
        items.append(place(FATHER, seated_back(breathe=breathe(t, ph=1)), P, SEAT_R, "back", seed))
        items.append(place(CHILD, seated_back(breathe=breathe(t), tilt=3 * math.sin(t * 1.3)), P, SEAT, "back", seed))
        grade = ("#E9D3B0", .1)
    elif era == "2013":
        img = room_base(era, t, tvk="match")
        items.append(place(MATE1, seated_back(breathe=breathe(t, ph=2)), P, SEAT_L, "back", seed))
        items.append(place(MATE2, seated_back(breathe=breathe(t, ph=.5), arm="chin"), P, SEAT_R, "back", seed))
        items.append(place(TEEN, seated_back(breathe=breathe(t)), P, SEAT, "back", seed))
        grade = ("#D8D8C8", .1)
    elif era == "2019":
        img = room_base(era, t, tvk="match")
        items.append(place(ADULT, seated_back(breathe=breathe(t), arm="chin"), P, SEAT, "back", seed))
        grade = ("#C9CDD2", .16)
    else:
        img = room_base(era, 33.0 + t, tvk="clip")
        items.append(place(ADULT, seated_back(breathe=breathe(t), arm="remote_low"), P, SEAT, "back", seed))
        grade = ("#BCC4CF", .2)
    img = with_sofa(img, era, items)
    return img, grade

def s06(t, fi):
    cur = [e for e in ERAS6 if e[0] <= t][-1]
    idx = ERAS6.index(cur)
    img, grade = _era_frame(cur[1], t, fi)
    if idx > 0 and t - cur[0] < 0.6:
        prev, g0 = _era_frame(ERAS6[idx - 1][1], t, fi)
        k = ease((t - cur[0]) / 0.6)
        img = Image.blend(prev.convert("RGB"), img.convert("RGB"), k).convert("RGBA")
        grade = (grade[0], g0[1] * (1 - k) + grade[1] * k)
    # final beat: slow push toward the TV, which shows the same interview
    if t > 12.5:
        z = 1 + 0.12 * ease((t - 12.5) / 3.5)
        q = anchors("2026")["screen"]
        cx = sum(p[0] for p in q) / 4; cy = sum(p[1] for p in q) / 4 + 120
        img = _zoom(img, z, (cx, cy))
    light = tv_light(cur[1], img, 0.18)
    return finish(img, fi, grade=grade, light=light)

def _zoom(img, z, c):
    w, h = W / z, H / z
    x0 = min(max(0, c[0] - w / 2), W - w); y0 = min(max(0, c[1] - h / 2), H - h)
    return img.crop((int(x0), int(y0), int(x0 + w), int(y0 + h))).resize((W, H), Image.BICUBIC)

# ---------------------------------------------------------------- s09 (1999 medium)
def father_arm_pose(p, reach):
    """Father's left arm reaches across to the boy's shoulder."""
    nk = p["neck"]
    p.update(el_l=(nk[0] - 70 - 40 * reach, nk[1] + 100 - 30 * reach),
             ha_l=(nk[0] - 90 - 150 * reach, nk[1] + 40 - 10 * reach), arm_l_front=True)
    return p

def s09(t, fi):
    era = "1999"; P = projector_m(era)
    img = room_base(era, t, tvk="match", cam="m")
    seed = fi // 2
    reach = seq(t, [(5.0, 0), (5.9, 1)])
    fp = father_arm_pose(seated_back(breathe=breathe(t, ph=1), tilt=-2 * reach), reach)
    drop = seq(t, [(0.3, 0), (4.0, 1.0), (7.0, 1.0), (7.8, 0.15)])
    tilt = seq(t, [(0.3, 0), (4.0, 14), (7.0, 14), (7.8, 2)])
    cp = seated_back(head_drop=drop, tilt=tilt, lean=0.25 * drop, breathe=breathe(t, .3))
    items = [place(FATHER, fp, P, SEAT_R, "back", seed), place(CHILD, cp, P, SEAT, "back", seed)]
    img = with_sofa(img, era, items, cam="m")
    light = tv_light(era, img, 0.25, "#B9D3B0", cam="m")
    return finish(img, fi, grade=("#E3CBA4", .14), light=light)

def projector_m(era):
    A = anchors(era, "m")
    M = np.array(A["cam"]["mw_inv"], float)
    fpx = A["cam"]["lens"] / A["cam"]["sensor_h"] * H
    def f(p):
        v = M @ np.array([p[0], p[1], p[2], 1.0])
        z = -v[2]
        return (W / 2 + fpx * v[0] / z, H / 2 - fpx * v[1] / z, fpx / z)
    return f

# ---------------------------------------------------------------- s13 (joy)
def s13(t, fi):
    era = "1999"; P = projector_m(era)
    img = room_base(era, t, tvk="match", cam="m")
    seed = fi // 2
    items = []
    if t < 4.0:
        up = ease(t / 0.35)
        bounce = abs(math.sin(t * 5.2)) * 26 * (1 - ease((t - 2.6) / 1.4))
        x, y, ppm = P((STAND_R[0] - 0.2, STAND_R[1], 0))
        s = ppm * UNIT
        fp = standing_back()
        nk = fp["neck"]
        fp.update(el_l=(nk[0] - 70, nk[1] - 60), ha_l=(nk[0] - 60, nk[1] - 150),
                  el_r=(nk[0] + 70, nk[1] - 60), ha_r=(nk[0] + 60, nk[1] - 150), arm_l_front=True, arm_r_front=True)
        yy = y + (1 - up) * 0.46 * ppm - bounce * s
        items.append(FATHER.svg(fp, x, yy, s, "back", seed=seed))
        # the boy held up high, arms up
        cpz = standing_back(phase=(t * 1.6) % 1)
        cn = cpz["neck"]
        cpz.update(el_l=(-70, cn[1] - 50), ha_l=(-84, cn[1] - 150), el_r=(70, cn[1] - 50), ha_r=(84, cn[1] - 150),
                   tilt=6 * math.sin(t * 7))
        # pelvis held at the father's hands
        items.insert(0, CHILD.svg(cpz, x, yy + (nk[1] - 150) * s - cpz["pelvis"][1] * s * CHILD.body_s, s, "back", seed=seed))
    else:
        k = ease((t - 4.0) / 0.8)
        fp = father_arm_pose(seated_back(breathe=breathe(t, ph=1)), 1.0)
        cp = seated_back(tilt=6, lean=0.2, breathe=breathe(t, .3))
        items = [place(FATHER, fp, P, SEAT_R, "back", seed), place(CHILD, cp, P, SEAT, "back", seed)]
    img = with_sofa(img, era, items, cam="m")
    if t < 4.0:
        light = tv_light(era, img, 0.45 * (1 - ease((t - 2.5) / 1.5)), "#F6E2B0", cam="m")
    else:
        light = tv_light(era, img, 0.22, "#B9D3B0", cam="m")
    return finish(img, fi, grade=("#E6CFA6", .12), light=light)

# ---------------------------------------------------------------- s15 (2013 dorm)
def s15(t, fi):
    era = "2013"; P = projector_m(era)
    img = room_base(era, t, tvk="farewell", cam="m")
    seed = fi // 2
    items = [place(MATE1, seated_back(breathe=breathe(t, ph=2), head_drop=.3), P, SEAT_L, "back", seed),
             place(MATE2, seated_back(arm="chin", breathe=breathe(t, ph=.5)), P, SEAT_R, "back", seed),
             place(TEEN, seated_back(breathe=breathe(t), head_drop=seq(t, [(5, 0), (8, .5)])), P, SEAT, "back", seed)]
    img = with_sofa(img, era, items, cam="m")
    light = tv_light(era, img, 0.2, "#C8CFD6", cam="m")
    return finish(img, fi, grade=("#C9CCC4", .16), light=light)

# ---------------------------------------------------------------- s24 (return)
WALK_IN = [(0.97, 3.55), (0.86, 2.4), (0.10, 0.6), (STAND[0], STAND[1])]

def s24(t, fi):
    era = "2026"; P = projector(era)
    seed = fi // 2
    door = seq(t, [(1.6, 0), (2.5, 84), (6.0, 84), (6.8, 0)])
    tv_on_t = 8.3
    tvk = "clip" if t >= tv_on_t else "off"
    img = room_base(era, 209.5 + t, door=door, tvk=tvk)
    items = []; over = []
    tw = t - 2.4
    if tw >= 0:
        d = tw * 0.95
        (gx, gy), tot = path_pos(WALK_IN, d)
        if d < tot:
            svg = place(ADULT_SCARF, walking_front(d / 1.1), P, (gx, gy, 0), "front", seed)
            (over if gy > 2.98 else items).append(svg)
        else:
            k = t - (2.4 + tot / 0.95)
            if k < 0.25:
                items.append(place(ADULT_SCARF, standing_back(), P, STAND, "back", seed))
            elif k < 0.85:
                x, y, ppm = P(STAND)
                sk = ease((k - .25) / .6)
                items.append(ADULT_SCARF.svg(standing_back(), x, y + sk * .46 * ppm, ppm * UNIT, "back", seed=seed))
            else:
                arm = "remote" if tv_on_t - 0.8 < t < tv_on_t + 0.6 else "rest"
                items.append(place(ADULT_SCARF, seated_back(arm=arm, breathe=breathe(t)), P, SEAT, "back", seed))
    if over:
        q = anchors(era)["door_open"]
        img.alpha_composite(masked(grade_figs(figures_layer(over), era), poly_mask(q)))
        img.alpha_composite(door_layer(era, door))
    img = with_sofa(img, era, items)
    if t > 9.0:
        z = 1 + 0.16 * ease((t - 9.0) / 8.0)
        q = anchors(era)["screen"]
        img = _zoom(img, z, (sum(p[0] for p in q) / 4, sum(p[1] for p in q) / 4 + 160))
    hall = light_pool((W, H), (W * .62, H * .45), 600, "#E9C98A", 0.25 * seq(t, [(1.6, 0), (2.5, 1), (6.0, 1), (6.8, 0)]))
    light = hall + (tv_light(era, img, 0.2) if t >= tv_on_t else 0)
    return finish(img, fi, grade=("#C3C8CF", .2), light=light)

# ---------------------------------------------------------------- s18 (phone call, 2024)
def s18(t, fi):
    img = _profile_bg().copy()
    morning = ease((t - 9.2) / 1.6)
    if morning > 0:
        warm = tint(_profile_bg(), "#D9D2C2", .5)
        img = Image.blend(img.convert("RGB"), warm.convert("RGB"), morning).convert("RGBA")
    phone = 0.9 < t < 6.6
    pose = seated_side(arm="phone" if phone else "low", head_drop=0.15 if t < 1.5 else seq(t, [(6.6, 0), (8.0, .4), (10.0, .9)]))
    smile = 1.6 < t < 7.5
    expr = dict(mouth=-2 if smile else 1, brow=2 if smile else (-2 if t > 9 else 0),
                closed=(4.2 < t < 4.4), lid=t > 9.5)
    s = 4.6
    x, y = W * 0.62, H * 0.40 + 280 * s
    img.alpha_composite(grade_figs(figures_layer([ADULT.svg(pose, x, y, s, "side", seed=fi // 2, expr=expr)]), "2026",
                                   rim=0.9 * (1 - morning), rim_dir=(14, 0)))
    tvl = (1 - morning) * 0.35 * (1 + .08 * math.sin(t * 8.1))
    light = light_pool((W, H), (-60, H * .4), 950, "#B9D3B0", tvl)
    if morning > 0:
        light = light + light_pool((W, H), (W * 1.1, H * .2), 1100, "#F0E6CF", .22 * morning)
    return finish(img, fi, grade=("#C3CAD3", .16 * (1 - morning) + .05), light=light, vignette=.28)
