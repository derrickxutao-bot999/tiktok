"""SVG motion-graphics shots on paper. Diagrams of documented events are marked
"示意" (schematic): they show the sequence, not exact player positions."""
import math, random
from functools import lru_cache
import numpy as np
from PIL import Image
from style import *
from comp import finish, figures_layer
from chars import Figure, walking_front, standing_side, seated_side

INK, RED, OCH, IV = C["ink"], C["red"], C["ochre"], C["ivory"]

def svg_open(bg=IV):
    return [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}">', f'<rect width="{W}" height="{H}" fill="{bg}"/>']

def T(x, y, s, size, fill=INK, w=400, fam="Noto Serif SC", anchor="middle", op=1.0, ls=0, extra=""):
    return (f'<text x="{x:.1f}" y="{y:.1f}" font-family="{fam}" font-size="{size}" font-weight="{w}" fill="{fill}" '
            f'fill-opacity="{max(0, min(1, op)):.3f}" text-anchor="{anchor}" letter-spacing="{ls}" {extra}>{s}</text>')

def wobble_line(pts, w=3, col=INK, seed=0, op=1.0, amp=1.2, dash=None):
    rng = random.Random(seed)
    p = " ".join(f"{x + rng.uniform(-amp, amp):.1f},{y + rng.uniform(-amp, amp):.1f}" for x, y in pts)
    d = f'stroke-dasharray="{dash}"' if dash else ""
    return f'<polyline points="{p}" fill="none" stroke="{col}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round" opacity="{op:.2f}" {d}/>'

def stamp(x, y, lines, t, t0=0.0, col=INK, size=30, label="史实"):
    """Documentary date label: small box tag + lines, typed in."""
    a = ease((t - t0) / .5)
    out = [f'<g opacity="{a:.2f}">',
           f'<rect x="{x}" y="{y - 30}" width="{len(label) * 30 + 26}" height="42" fill="none" stroke="{col}" stroke-width="2"/>',
           T(x + 13 + len(label) * 15, y, label, 24, col, 600, ls=4),
           '</g>']
    for i, ln in enumerate(lines):
        ai = ease((t - t0 - .25 - i * .35) / .5)
        out.append(T(x, y + 70 + i * (size + 22), ln, size, INK, 400, anchor="start", op=ai))
    return out

def arc_pts(a, b, bend, n=40, upto=1.0):
    (x0, y0), (x1, y1) = a, b
    mx, my = (x0 + x1) / 2, (y0 + y1) / 2
    dx, dy = x1 - x0, y1 - y0
    L = math.hypot(dx, dy) or 1
    cx, cy = mx - dy / L * bend, my + dx / L * bend
    pts = []
    for i in range(int(n * upto) + 1):
        t = i / n
        pts.append(((1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1, (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1))
    return pts

def out_frame(parts, fi, grade=None, vignette=.12, grain=3.5):
    img = svg_png("\n".join(parts + ["</svg>"]))
    return finish(img, fi, grade=grade, vignette=vignette, grain=grain)

# ------------------------------------------------------------------ pitch
PX0, PX1, PY0, PY1 = 140, 940, 420, 1440   # attacking half, goal at top

def pitch(op=1.0, zoom=1.0):
    """Top half of a pitch, goal at the top, drawn as ink on paper."""
    cx = (PX0 + PX1) / 2
    out = [f'<g opacity="{op:.2f}">',
           f'<rect x="{PX0}" y="{PY0}" width="{PX1 - PX0}" height="{PY1 - PY0}" fill="#E4D8BC"/>']
    for i in range(6):
        if i % 2 == 0:
            out.append(f'<rect x="{PX0}" y="{PY0 + i * (PY1 - PY0) / 6:.0f}" width="{PX1 - PX0}" height="{(PY1 - PY0) / 6:.0f}" fill="#DCCEAF"/>')
    out.append(wobble_line([(PX0, PY0), (PX1, PY0), (PX1, PY1), (PX0, PY1), (PX0, PY0)], 3, seed=1))
    bw, bh = 520, 230
    out.append(wobble_line([(cx - bw / 2, PY0), (cx - bw / 2, PY0 + bh), (cx + bw / 2, PY0 + bh), (cx + bw / 2, PY0)], 2.6, seed=2))
    out.append(wobble_line([(cx - 120, PY0), (cx - 120, PY0 + 80), (cx + 120, PY0 + 80), (cx + 120, PY0)], 2.6, seed=3))
    out.append(wobble_line([(cx - 60, PY0), (cx - 60, PY0 - 34), (cx + 60, PY0 - 34), (cx + 60, PY0)], 3.4, seed=4))
    out.append(f'<circle cx="{cx}" cy="{PY0 + 160}" r="4" fill="{INK}"/>')
    arc = [(cx + 120 * math.cos(a), PY0 + 160 + 120 * math.sin(a)) for a in np.linspace(0.65, math.pi - 0.65, 20)]
    out.append(wobble_line(arc, 2.6, seed=5))
    out.append('</g>')
    return out

def dot(x, y, col, r=13, label=None, op=1.0, side="right"):
    o = [f'<g opacity="{op:.2f}"><circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="{col}" stroke="{INK}" stroke-width="2.4"/>']
    if label:
        dx = 24 if side == "right" else -24
        o.append(T(x + dx, y + 9, label, 26, INK, 400, anchor="start" if side == "right" else "end"))
    o.append('</g>')
    return o

def ball(x, y):
    return [f'<circle cx="{x:.1f}" cy="{y:.1f}" r="8" fill="#FBF6EA" stroke="{INK}" stroke-width="2.4"/>']

def scoreboard(home, away, t_flip=None, t=0.0, y=250, minute=None):
    out = [f'<rect x="{W / 2 - 250}" y="{y - 60}" width="500" height="84" fill="{INK}"/>',
           T(W / 2 - 150, y, "曼联", 34, IV, 600), T(W / 2 + 150, y, "拜仁", 34, IV, 600)]
    if t_flip is not None and t >= t_flip:
        k = ease((t - t_flip) / .35)
        out.append(T(W / 2, y + 2, f"{home} – {away}", 46, C["ochre_l"], 600, op=k))
        out.append(f'<rect x="{W / 2 - 64}" y="{y - 58}" width="128" height="80" fill="{RED}" opacity="{(1 - k) * .9:.2f}"/>')
    else:
        h0 = home - 1 if t_flip is not None else home
        out.append(T(W / 2, y + 2, f"{h0} – {away}", 46, IV, 600))
    if minute:
        out.append(T(W / 2, y + 70, minute, 30, INK, 600, ls=2))
    return out

# ------------------------------------------------------------------ s07 title
def s07(t, fi):
    p = svg_open()
    a = ease(t / 1.0) * (1 - ease((t - 5.2) / .8))
    L = 520 * ease((t - .2) / 1.4)
    p.append(wobble_line([(W / 2 - L / 2, 820), (W / 2 + L / 2, 820)], 3, RED, seed=9, op=a))
    p.append(T(W / 2, 1000, "再等一会儿", 118, INK, 400, fam="LXGW WenKai", op=a * ease((t - .4) / 1.2), ls=10))
    p.append(T(W / 2, 1090, "JUST A LITTLE LONGER", 30, C["grey"], 400, op=a * ease((t - 1.2) / 1.0), ls=8))
    p.append(T(W / 2, 1220, "曼联球迷的忠诚，与他们的要求", 36, INK, 400, op=a * ease((t - 1.8) / 1.0), ls=4))
    p.append(T(W / 2, 1300, "第二集", 28, C["grey"], 400, op=a * ease((t - 2.2) / 1.0), ls=6))
    return out_frame(p, fi)

# ------------------------------------------------------------------ s08 Basler
def s08(t, fi):
    p = svg_open()
    if t < 4.6:
        a = 1 - ease((t - 4.0) / .6)
        p.append(f'<g opacity="{a:.2f}">')
        p += stamp(130, 640, ["1999年5月26日", "欧洲冠军联赛决赛", "巴塞罗那 · 诺坎普球场", "曼联  对  拜仁慕尼黑"], t, 0.2, size=52)
        p.append('</g>')
        return out_frame(p, fi)
    tt = t - 4.6
    p += pitch(ease(tt / .5))
    cx = (PX0 + PX1) / 2
    # wall and keeper, Basler's free kick from outside the box (schematic)
    fk = (cx - 80, PY0 + 330)
    for i in range(4):
        p += dot(cx - 150 + i * 30, PY0 + 255, RED, 12, op=ease(tt / .6))
    p += dot(cx + 10, PY0 + 22, RED, 13, "舒梅切尔", op=ease(tt / .6), side="right")
    p += dot(fk[0] - 20, fk[1] + 34, "#9E9A90", 13, "巴斯勒", op=ease(tt / .6), side="left")
    goal = (cx - 50, PY0 - 14)
    k = ease((tt - 1.4) / 0.9)
    path = arc_pts(fk, goal, -70, upto=max(0.01, k))
    p.append(wobble_line(path, 3, INK, seed=11, dash="10 8"))
    p += ball(*path[-1])
    if tt > 2.3:
        p.append(T(W / 2, PY0 - 70, "6'", 64, RED, 600, op=ease((tt - 2.3) / .4)))
    p += scoreboard(0, 1, t_flip=None if tt < 2.4 else 2.4, t=tt, minute=None)
    p.append(T(W - 70, PY1 + 50, "示意图", 22, C["grey"], anchor="end"))
    return out_frame(p, fi)

# ------------------------------------------------------------------ s10 clock
def s10(t, fi):
    p = svg_open()
    a = ease(t / .4)
    p.append(T(W / 2, 760, "90:00", 210, INK, 600, op=a, ls=6))
    p.append(T(W / 2, 860, "曼联 0 – 1 拜仁", 40, C["grey"], op=a))
    # the fourth official's board rises
    k = ease((t - 1.6) / .8)
    by = 1500 - 360 * k
    p.append(f'<g opacity="{k:.2f}">')
    p.append(f'<rect x="{W / 2 - 14}" y="{by + 150}" width="28" height="260" fill="{C["charcoal"]}"/>')
    p.append(f'<rect x="{W / 2 - 170}" y="{by - 30}" width="340" height="190" fill="{INK}" stroke="{INK}" stroke-width="4"/>')
    p.append(f'<rect x="{W / 2 - 150}" y="{by - 12}" width="300" height="154" fill="#1A1716"/>')
    p.append(T(W / 2, by + 112, "+3", 130, "#E2493D", 600))
    p.append('</g>')
    return out_frame(p, fi)

# ------------------------------------------------------------------ s11/12 corners
def _corner(t, fi, which):
    p = svg_open()
    p += pitch(1.0)
    cx = (PX0 + PX1) / 2
    corner = (PX0 + 6, PY0 + 6)
    p += dot(corner[0] + 12, corner[1] + 30, RED, 13, "贝克汉姆", side="right")
    p += dot(cx + 10, PY0 + 22, "#9E9A90", 13, op=1.0)
    if which == 1:
        giggs = (cx + 30, PY0 + 290)
        sher = (cx - 20, PY0 + 120)
        p += dot(*giggs, RED, 13, "吉格斯", side="right")
        p += dot(*sher, RED, 13, "谢林汉姆", side="left")
        k1 = ease((t - 0.8) / 1.2)
        seg1 = arc_pts(corner, (giggs[0] - 20, giggs[1] - 30), 140, upto=max(.01, k1))
        p.append(wobble_line(seg1, 3, INK, seed=21, dash="10 8"))
        bpos = seg1[-1]
        if t > 2.2:
            k2 = ease((t - 2.4) / .6)
            seg2 = arc_pts((giggs[0] - 20, giggs[1] - 30), sher, 10, upto=max(.01, k2))
            p.append(wobble_line(seg2, 3, INK, seed=22, dash="10 8")); bpos = seg2[-1]
        if t > 3.1:
            k3 = ease((t - 3.2) / .5)
            seg3 = arc_pts(sher, (cx - 30, PY0 - 14), 8, upto=max(.01, k3))
            p.append(wobble_line(seg3, 3.4, RED, seed=23)); bpos = seg3[-1]
        p += ball(*bpos)
        tg, minute = 3.8, "第91分钟"
        score = (1, 1)
    else:
        sher = (cx - 70, PY0 + 150)
        ole = (cx + 30, PY0 + 70)
        p += dot(*sher, RED, 13, "谢林汉姆", side="left")
        p += dot(*ole, RED, 13, "索尔斯克亚", side="right")
        k1 = ease((t - 0.8) / 1.3)
        seg1 = arc_pts(corner, sher, 120, upto=max(.01, k1))
        p.append(wobble_line(seg1, 3, INK, seed=31, dash="10 8")); bpos = seg1[-1]
        if t > 2.3:
            k2 = ease((t - 4.6) / .5)
            seg2 = arc_pts(sher, ole, -20, upto=max(.01, k2))
            p.append(wobble_line(seg2, 3, INK, seed=32, dash="10 8")); bpos = seg2[-1]
        if t > 5.1:
            k3 = ease((t - 5.4) / .4)
            seg3 = arc_pts(ole, (cx + 10, PY0 - 16), 0, upto=max(.01, k3))
            p.append(wobble_line(seg3, 3.4, RED, seed=33)); bpos = seg3[-1]
        p += ball(*bpos)
        tg, minute = 5.85, "第93分钟"
        score = (2, 1)
    if t > tg:
        # net ripple
        r = (t - tg) * 260
        p.append(f'<circle cx="{cx}" cy="{PY0 - 16}" r="{r:.0f}" fill="none" stroke="{RED}" stroke-width="3" opacity="{max(0, 1 - (t - tg) / 1.2):.2f}"/>')
    p += scoreboard(score[0], score[1], t_flip=tg + .15, t=t, minute=minute if t > tg else ("90+" if which == 1 else ""))
    p.append(T(W - 70, PY1 + 50, "示意图", 22, C["grey"], anchor="end"))
    return out_frame(p, fi)

def s11(t, fi):
    return _corner(t, fi, 1)

def s12(t, fi):
    return _corner(t, fi, 2)

# ------------------------------------------------------------------ s14 Ferguson
def s14(t, fi):
    p = svg_open(C["ink"])
    a = ease(t / .8) * (1 - ease((t - 4.4) / .6))
    p.append(T(W / 2, 860, "“Football.", 92, IV, 400, op=a))
    p.append(T(W / 2, 980, "Bloody hell.”", 92, IV, 400, op=a * ease((t - .6) / .8)))
    p.append(T(W / 2, 1110, "足球，真是见鬼了。", 46, C["ochre_l"], 400, op=a * ease((t - 1.2) / .8), ls=4))
    p.append(T(W / 2, 1220, "—— 亚历克斯·弗格森，1999年欧冠决赛后接受电视采访", 26, "#A9A293", op=a * ease((t - 1.6) / .8)))
    return out_frame(p, fi, vignette=.25)

# ------------------------------------------------------------------ s16 seasons
SEASONS = ["13/14", "14/15", "15/16", "16/17", "17/18", "18/19", "19/20", "20/21", "21/22", "22/23", "23/24", "24/25", "25/26"]
LIGHTS = {"15/16": ["足总杯"], "16/17": ["联赛杯", "欧联杯"], "22/23": ["联赛杯"], "23/24": ["足总杯"]}

def s16(t, fi):
    p = svg_open()
    n = len(SEASONS)
    step = 104
    # rows appear one per ~1.05s; the list drifts up so the newest row sits mid-frame
    per = 1.05
    shown = min(n, int(t / per) + 1)
    scroll = max(0, (t / per - 7)) * step
    top = 360 - scroll
    for i in range(shown):
        y = top + i * step
        if y < 120 or y > H - 280:
            continue
        a = ease((t - i * per) / .5)
        s = SEASONS[i]
        p.append(T(150, y, s, 44, INK, 600, anchor="start", op=a))
        L = 380 * ease((t - i * per - .1) / .8)
        p.append(wobble_line([(330, y - 14), (330 + L, y - 14)], 2.4, C["grey"], seed=40 + i, op=a))
        if s in LIGHTS:
            for j, nm in enumerate(LIGHTS[s]):
                k = ease((t - i * per - .5) / .6)
                gx = 420 + j * 210
                p.append(f'<circle cx="{gx}" cy="{y - 14}" r="{30 * k:.1f}" fill="{C["ochre_l"]}" opacity="{.35 * k:.2f}"/>')
                p.append(f'<circle cx="{gx}" cy="{y - 14}" r="{11 * k:.1f}" fill="{OCH}" stroke="{INK}" stroke-width="2"/>')
                p.append(T(gx + 24, y - 2, nm, 30, INK, 400, anchor="start", op=k))
        else:
            k = ease((t - i * per - .6) / .6)
            p.append(T(930, y - 2, "再等一会儿", 40, C["red_d"], 400, fam="LXGW WenKai", anchor="end", op=k * (.5 + .45 * (i / n))))
    return out_frame(p, fi)

# ------------------------------------------------------------------ s17 FA Cup 2024
def s17(t, fi):
    p = svg_open()
    p += stamp(130, 420, ["2024年5月25日", "足总杯决赛 · 温布利"], t, 0.1, size=52)
    a = ease((t - 1.6) / .6)
    y0 = 860
    p.append(f'<rect x="{W / 2 - 300}" y="{y0 - 70}" width="600" height="100" fill="{INK}" opacity="{a:.2f}"/>')
    p.append(T(W / 2 - 190, y0, "曼联", 42, IV, 600, op=a))
    p.append(T(W / 2 + 190, y0, "曼城", 42, IV, 600, op=a))
    goals_m = [(30, "加纳乔", RED), (39, "梅努", RED), (87, "多库", "#8C8273")]
    tl0, tl1, ty = 150, 930, 1130
    clock_min = min(90, max(0, (t - 3.0) / 6.5 * 90))
    hs = sum(1 for m, _, c in goals_m if c == RED and m <= clock_min)
    as_ = sum(1 for m, _, c in goals_m if c != RED and m <= clock_min)
    p.append(T(W / 2, y0 + 2, f"{hs} – {as_}", 56, C["ochre_l"], 600, op=a))
    p.append(wobble_line([(tl0, ty), (tl1, ty)], 3, C["grey"], seed=50, op=a))
    xm = tl0 + (tl1 - tl0) * clock_min / 90
    p.append(wobble_line([(tl0, ty), (xm, ty)], 6, INK, seed=51, op=a))
    for m, nm, c in goals_m:
        if clock_min >= m:
            k = ease((clock_min - m) / 6)
            x = tl0 + (tl1 - tl0) * m / 90
            p.append(f'<circle cx="{x:.0f}" cy="{ty}" r="{16 * k:.1f}" fill="{c}" stroke="{INK}" stroke-width="2.4"/>')
            p.append(T(x, ty - 44, f"{m}'", 32, INK, 600, op=k))
            p.append(T(x, ty + 66, nm, 32, INK, 400, op=k))
    p.append(T(tl0, ty + 140, "0'", 24, C["grey"], anchor="start", op=a))
    p.append(T(tl1, ty + 140, "90'", 24, C["grey"], anchor="end", op=a))
    if t > 10.2:
        p.append(T(W / 2, 1460, "加纳乔 19岁 · 梅努 19岁", 32, C["grey"], op=ease((t - 10.2) / .6)))
    return out_frame(p, fi)

# ------------------------------------------------------------------ s19 takeover
def s19(t, fi):
    p = svg_open()
    p += stamp(130, 380, ["2005年", "格雷泽家族完成收购"], t, 0.1, size=52)
    # the club as a stand silhouette
    base_y = 1300
    a = ease((t - .8) / .6)
    p.append(f'<g opacity="{a:.2f}">')
    p.append(f'<polygon points="200,{base_y} 200,{base_y - 200} 300,{base_y - 250} 780,{base_y - 250} 880,{base_y - 200} 880,{base_y}" fill="{RED}" stroke="{INK}" stroke-width="3"/>')
    for i in range(7):
        p.append(f'<rect x="{250 + i * 85}" y="{base_y - 180}" width="50" height="120" fill="{C["red_d"]}"/>')
    p.append(wobble_line([(140, base_y), (940, base_y)], 3, seed=60))
    p.append('</g>')
    # debt blocks fall and stack on the roof; the building squashes slightly
    labels = ["贷款", "利息", "债务"]
    for i, lb in enumerate(labels):
        k = ease((t - 2.4 - i * .9) / .6)
        y = (base_y - 250 - 80 - i * 110) - (1 - k) * 900
        p.append(f'<rect x="{330 + i * 20}" y="{y:.0f}" width="420" height="100" fill="{C["charcoal"]}" stroke="{INK}" stroke-width="3" opacity="{min(1, k * 3):.2f}"/>')
        p.append(T(540 + i * 20, y + 66, lb, 44, IV, 600, op=min(1, k * 3)))
    if t > 5.6:
        p.append(T(W / 2, 1460, "杠杆收购：借钱买下俱乐部，再由俱乐部背上这笔债", 32, INK, op=ease((t - 5.6) / .6)))
    return out_frame(p, fi)

# ------------------------------------------------------------------ s20 green & gold
def s20(t, fi):
    p = svg_open()
    cx = W / 2
    if t < 5.0:
        a = ease(t / .6) * (1 - ease((t - 4.4) / .6))
        p.append(f'<g opacity="{a:.2f}">')
        # Newton Heath halves shirt
        pts = [(cx - 230, 620), (cx - 90, 560), (cx - 50, 600), (cx + 50, 600), (cx + 90, 560), (cx + 230, 620),
               (cx + 280, 800), (cx + 180, 830), (cx + 170, 1160), (cx - 170, 1160), (cx - 180, 830), (cx - 280, 800)]
        left = [pt for pt in pts if pt[0] <= cx] + [(cx, 1160), (cx, 600)]
        P = lambda q: " ".join(f"{x:.0f},{y:.0f}" for x, y in q)
        p.append(f'<polygon points="{P(pts)}" fill="{C["gold"]}"/>')
        p.append(f'<polygon points="{P([(cx, 600), (cx - 50, 600), (cx - 90, 560), (cx - 230, 620), (cx - 280, 800), (cx - 180, 830), (cx - 170, 1160), (cx, 1160)])}" fill="{C["green"]}"/>')
        p.append(f'<polygon points="{P(pts)}" fill="none" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>')
        p.append(T(cx, 1290, "牛顿希斯 · 1878", 48, INK, 600, ls=4))
        p.append(T(cx, 1360, "曼联的前身", 32, C["grey"]))
        p.append('</g>')
        return out_frame(p, fi)
    tt = t - 5.0
    # a stand of supporters; green-and-gold specks spread through the red
    p += stamp(130, 360, ["2010年前后"], tt, 0.0, size=52, label="史实")
    rng = random.Random(4)
    rows, cols = 16, 22
    k = ease((tt - 1.0) / 5.5)
    for r in range(rows):
        for c in range(cols):
            x = 90 + c * 42 + (r % 2) * 21
            y = 640 + r * 46
            v = rng.random()
            col = RED if v > k * 0.55 else (C["green"] if rng.random() < .5 else C["gold"])
            p.append(f'<rect x="{x}" y="{y}" width="28" height="30" rx="3" fill="{col}"/>')
    p.append(wobble_line([(70, 620), (1010, 620)], 3, seed=70))
    return out_frame(p, fi)

# ------------------------------------------------------------------ s21 fans
def s21(t, fi):
    p = svg_open()
    rng = random.Random(8)
    rows = []
    for row in range(4):
        sc = 0.42 + row * 0.13
        y = 700 + row * 260
        n = 7 - row
        for i in range(n):
            x = 1080 * (i + .5) / n + rng.uniform(-30, 30) + (row % 2) * 40 - 20
            f = Figure(rng.choice(["adult", "mate1", "mate2", "adult", "teen"]))
            f.shirt = RED; f.scarf = True; f.collar = C["paper"]; f.cap = False
            f.hairstyle = rng.choice(["short", "bowl", "curly"])
            f.hair = rng.choice(["#2F2622", "#5A4030", "#7A5A3A", "#1F1A18", "#8C8273"])
            pose = walking_front(0.0, stride=0.0)
            nk = pose["neck"]
            up = (i + row) % 3 == 0
            if up:
                lift = 1 + .06 * math.sin(t * 3 + i)
                pose.update(el_l=(-70, nk[1] - 40), ha_l=(-80, nk[1] - 160 * lift),
                            el_r=(70, nk[1] - 40), ha_r=(80, nk[1] - 160 * lift))
            g = f.svg(pose, x, y + 330 * sc, sc, "front", seed=fi // 2 + i * 7 + row)
            if up:
                hy = y + 330 * sc + (nk[1] - 160 * lift) * sc * f.body_s
                band = []
                for k in range(6):
                    xx = x + (-80 + k * 32) * sc
                    band.append(f'<rect x="{xx:.0f}" y="{hy - 14 * sc:.0f}" width="{32 * sc + 1:.0f}" height="{30 * sc:.0f}" fill="{C["green"] if k % 2 == 0 else C["gold"]}"/>')
                band.append(f'<rect x="{x - 80 * sc:.0f}" y="{hy - 14 * sc:.0f}" width="{192 * sc:.0f}" height="{30 * sc:.0f}" fill="none" stroke="{INK}" stroke-width="2"/>')
                g += "".join(band)
            rows.append(g)
    p += rows
    return out_frame(p, fi)

# ------------------------------------------------------------------ s22 protest
def s22(t, fi):
    p = svg_open("#E6DAC0")
    p += stamp(110, 300, ["2021年5月2日 · 老特拉福德", "曼联 对 利物浦"], t, 0.1, size=44)
    # stadium exterior
    p.append(f'<polygon points="0,1050 0,760 120,700 960,700 1080,760 1080,1050" fill="{C["red_d"]}" stroke="{INK}" stroke-width="3"/>')
    for i in range(11):
        p.append(f'<rect x="{40 + i * 95}" y="780" width="60" height="200" fill="#5E1A1E"/>')
    p.append(f'<polygon points="0,700 1080,700 1080,650 0,650" fill="{C["charcoal"]}"/>')
    # crowd silhouettes with banners and green-gold smoke
    rng = random.Random(12)
    for i in range(70):
        x = rng.uniform(-20, 1100); y = rng.uniform(1120, 1700)
        s = 0.6 + (y - 1120) / 600
        sway = math.sin(t * 2 + i) * 3
        p.append(f'<rect x="{x - 14 * s + sway:.0f}" y="{y - 60 * s:.0f}" width="{28 * s:.0f}" height="{70 * s:.0f}" fill="{RED if i % 3 else C["charcoal"]}"/>')
        p.append(f'<circle cx="{x + sway:.0f}" cy="{y - 74 * s:.0f}" r="{13 * s:.0f}" fill="{C["skin_d"]}"/>')
    for j, bx in enumerate((160, 520, 840)):
        up = 6 * math.sin(t * 1.7 + j)
        p.append(f'<rect x="{bx - 120}" y="{1040 + up:.0f}" width="240" height="70" fill="{C["green"] if j != 1 else C["gold"]}" stroke="{INK}" stroke-width="3"/>')
        p.append(f'<rect x="{bx - 120}" y="{1062 + up:.0f}" width="240" height="22" fill="{C["gold"] if j != 1 else C["green"]}"/>')
    for j in range(4):
        sx = 200 + j * 230
        r = 60 + 40 * ((t * .3 + j * .25) % 1)
        p.append(f'<circle cx="{sx}" cy="{1000 - 60 * ((t * .3 + j * .25) % 1):.0f}" r="{r:.0f}" fill="{C["green"] if j % 2 else C["gold"]}" opacity=".22"/>')
    if t > 6.4:
        k = ease((t - 6.4) / .35)
        sc = 1.6 - .6 * k
        p.append(f'<g transform="translate(540 1330) rotate(-8) scale({sc:.2f})" opacity="{k:.2f}">'
                 f'<rect x="-210" y="-70" width="420" height="120" fill="{IV}" stroke="{RED}" stroke-width="7"/>'
                 + T(0, 22, "比赛推迟", 72, RED, 600, ls=8) + '</g>')
    return out_frame(p, fi)

# ------------------------------------------------------------------ s23 scarf (hallway, SVG)
def s23(t, fi):
    p = svg_open("#D6C6A3")
    p.append(f'<rect x="0" y="1500" width="{W}" height="420" fill="#8B7356"/>')
    p.append(f'<rect x="0" y="1490" width="{W}" height="16" fill="{C["paper"]}"/>')
    p.append(f'<rect x="760" y="420" width="250" height="1080" fill="#9A7148" stroke="{INK}" stroke-width="3"/>')
    p.append(f'<rect x="740" y="400" width="290" height="24" fill="{C["paper"]}" stroke="{INK}" stroke-width="2"/>')
    p.append(f'<rect x="200" y="560" width="190" height="240" fill="{C["ink"]}"/><rect x="214" y="574" width="162" height="212" fill="#B9AE98"/>')
    # hook with scarf until he takes it
    hook_x, hook_y = 640, 760
    p.append(f'<rect x="{hook_x - 40}" y="{hook_y - 12}" width="80" height="14" fill="{C["ink"]}"/>')
    f = Figure("adult")
    has = t > 1.7
    f.scarf = has
    if t < 1.2:
        pose = standing_side()
        nk = pose["neck"]
        reach = ease(t / 1.0)
        pose.update(el_l=(-60 - 60 * reach, nk[1] + 120 - 60 * reach), ha_l=(-80 - 120 * reach, nk[1] + 220 - 200 * reach))
    elif t < 2.2:
        pose = standing_side(arm="scarf2")
    elif t < 4.6:
        pose = standing_side(arm="scarf" if int(t * 3) % 2 else "scarf2")
    else:
        pose = standing_side(arm="down", head_drop=-0.2)
    if not has:
        for i in range(6):
            p.append(f'<rect x="{hook_x - 14 + (i % 2) * 2}" y="{hook_y + i * 30}" width="28" height="30" fill="{C["green"] if i % 2 == 0 else C["gold"]}" stroke="{INK}" stroke-width="1.5"/>')
    expr = dict(brow=0 if t < 4.6 else 2, mouth=0 if t < 5.2 else -1)
    p.append(f.svg(pose, 520, 1560, 1.55, "side", flip=True, seed=fi // 2, expr=expr))
    return out_frame(p, fi, grade=("#EAD9B8", .08))

# ------------------------------------------------------------------ s25 final words
def s25(t, fi):
    p = svg_open()
    a1 = ease((t - .6) / 1.0)
    p.append(T(W / 2, 900, "再等一会儿。", 92, INK, 400, fam="LXGW WenKai", op=a1, ls=8))
    a2 = ease((t - 2.8) / 1.0)
    p.append(T(W / 2, 1060, "但不是永远。", 92, RED, 400, fam="LXGW WenKai", op=a2, ls=8))
    fade = 1 - ease((t - 5.8) / .7)
    img = svg_png("\n".join(p + ["</svg>"]))
    arr = finish(img, fi)
    return (arr * fade + np.array(hex2rgb(IV)) * (1 - fade)).astype(np.uint8)

# ------------------------------------------------------------------ s26 sources
def s26(t, fi):
    p = svg_open()
    a = ease(t / .8)
    lines = [
        ("说明", 34, INK, 600),
        ("片中球迷父子、室友等人物与家庭场景为虚构。", 28, INK, 400),
        ("标注“史实”的日期、比分与引语依据公开报道。", 28, INK, 400),
        ("", 20, INK, 400),
        ("资料来源", 34, INK, 600),
        ("开场电视画面：Prime Video Sport 马丁内斯赛后采访（2026.10.13）", 24, C["charcoal"], 400),
        ("—— 据 PA / Irish Times、Yahoo Sports、The Independent 报道", 24, C["charcoal"], 400),
        ("1999年欧冠决赛、2024年足总杯决赛：比赛记录", 24, C["charcoal"], 400),
        ("2021年5月2日老特拉福德抗议：BBC、CBS Sports 等报道", 24, C["charcoal"], 400),
        ("格雷泽家族2005年杠杆收购；绿金围巾运动（2010）", 24, C["charcoal"], 400),
        ("", 20, INK, 400),
        ("原创配乐 · 中文旁白 · 插画与三维场景均为本片制作", 24, C["grey"], 400),
    ]
    y = 560
    for s, sz, col, w in lines:
        p.append(T(110, y, s, sz, col, w, anchor="start", op=a))
        y += sz + 30
    return out_frame(p, fi)
