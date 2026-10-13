#!/usr/bin/env python3
"""Ball-driven transitions for the Messi Barça/Argentina switch edit.

The source edit loops every 250 frames (60 fps): a Barça shot with the ball
(frames 250k .. 250k+57) hard-cuts to an Argentina shot (250k+58 .. 250k+249).
This script replaces each hard cut with a transition led by a football and
writes one sample video per style, plus a 2x2 comparison.

    python3 render.py SOURCE.mov OUTDIR [style ...]

Styles: wipe, zoom, impact, whip.
"""
import math
import subprocess
import sys

import cv2
import numpy as np

import people as P

SRC_W, SRC_H = 540, 720
W, H = 1080, 1440
FPS = 60
LOOP = 250
B_TO_A = 58            # Barça -> Argentina cut, frame offset within a loop
FIRST, LAST = 190, 620  # sample range in source frames (~7.2 s)
HALF = 12               # transition half-width in output frames


# ---------------------------------------------------------------- source

def load_frames(path):
    cmd = ["ffmpeg", "-v", "error", "-i", path, "-pix_fmt", "rgb24", "-f", "rawvideo", "-"]
    raw = subprocess.run(cmd, stdout=subprocess.PIPE, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, SRC_H, SRC_W, 3)


def cuts_in_range():
    cuts = []
    for k in range(0, 8):
        for off in (0, B_TO_A):
            c = k * LOOP + off
            if FIRST + HALF < c < LAST - HALF:
                cuts.append(c)
    return sorted(cuts)


def src_frame(frames, f):
    """Fractional source frame, blended between neighbours, upscaled to W x H."""
    i = int(math.floor(f))
    lo = frames[min(max(i, 0), len(frames) - 1)].astype(np.float32)
    t = f - i
    if t > 1e-3:
        hi = frames[min(i + 1, len(frames) - 1)].astype(np.float32)
        lo = lo * (1 - t) + hi * t
    return cv2.resize(lo, (W, H), interpolation=cv2.INTER_CUBIC)


def transition_pair(frames, t, c):
    """Outgoing / incoming images for output frame t near cut c.

    Both sides play at half speed inside the window, so the timeline length is
    unchanged and the soundtrack stays in sync."""
    u = (t - (c - HALF)) / 2.0
    out_f = min(c - HALF + u, c - 1)
    in_f = c + u
    return src_frame(frames, out_f), src_frame(frames, in_f)


# ---------------------------------------------------------------- the ball

def _ball_centres():
    phi = (1 + 5 ** 0.5) / 2
    ico = []
    for a in (-1, 1):
        for b in (-phi, phi):
            ico += [(0, a, b), (a, b, 0), (b, 0, a)]
    ico = np.array(ico, np.float32)
    dod = []                                       # icosahedron face centres
    for i in range(12):
        for j in range(i + 1, 12):
            for k in range(j + 1, 12):
                tri = ico[[i, j, k]]
                if all(abs(np.linalg.norm(tri[a] - tri[b]) - 2) < 1e-3
                       for a, b in ((0, 1), (1, 2), (0, 2))):
                    dod.append(tuple(tri.mean(0)))
    assert len(dod) == 20
    pts = np.vstack([ico, np.array(dod, np.float32)])
    return pts / np.linalg.norm(pts, axis=1, keepdims=True)


# 12 pentagon centres then 20 hexagon centres: their Voronoi cells on the
# sphere are the faces of a truncated icosahedron, i.e. a classic football.
CENTRES = _ball_centres()
LIGHT = np.array([-0.45, -0.65, 0.62], np.float32)
LIGHT /= np.linalg.norm(LIGHT)
HALFV = LIGHT + np.array([0, 0, 1], np.float32)
HALFV /= np.linalg.norm(HALFV)
# Central projection onto the truncated icosahedron: the face hit first is the
# max of dot / face distance (pentagon 2.3274, hexagon 2.2672 for unit edge).
FACE = np.r_[np.full(12, 1 / 2.3274), np.full(20, 1 / 2.2672)].astype(np.float32) * 2.3


def rot(angle, axis):
    axis = np.asarray(axis, np.float32)
    axis = axis / np.linalg.norm(axis)
    x, y, z = axis
    c, s = math.cos(angle), math.sin(angle)
    C = 1 - c
    return np.array([[c + x * x * C, x * y * C - z * s, x * z * C + y * s],
                     [y * x * C + z * s, c + y * y * C, y * z * C - x * s],
                     [z * x * C - y * s, z * y * C + x * s, c + z * z * C]], np.float32)


def draw_ball(img, cx, cy, r, R, hole=0.0, alpha=1.0):
    """Composite a shaded football onto img (float32 RGB, in place).

    hole: radius fraction of a transparent disc punched in the middle (used to
    fly *through* the ball)."""
    if r < 1:
        return img
    x0, x1 = int(max(cx - r - 2, 0)), int(min(cx + r + 2, W))
    y0, y1 = int(max(cy - r - 2, 0)), int(min(cy + r + 2, H))
    if x0 >= x1 or y0 >= y1:
        return img
    ys, xs = np.mgrid[y0:y1, x0:x1].astype(np.float32)
    nx, ny = (xs + 0.5 - cx) / r, (ys + 0.5 - cy) / r
    d2 = nx * nx + ny * ny
    d = np.sqrt(d2)
    cover = np.clip((1 - d) * r + 0.5, 0, 1)
    if hole > 0:
        cover *= np.clip((d - hole) * r + 0.5, 0, 1)
    mask = cover > 0
    if not mask.any():
        return img
    nz = np.sqrt(np.clip(1 - d2, 0, 1))
    n = np.stack([nx, ny, nz], -1)[mask]          # view-space normals
    p = n @ R                                     # ball-space (R^T n)
    dots = (p @ CENTRES.T) * FACE
    top2 = np.partition(dots, -2, axis=1)[:, -2:]
    best = dots.argmax(1)
    gap = top2[:, 1] - top2[:, 0]
    px = 1.0 / r                                  # one pixel in dot units, roughly
    seam = np.clip(gap / (2.2 * px + 0.012), 0, 1)
    pent = (best < 12).astype(np.float32)
    base = 0.96 - pent * 0.86
    col = base * (0.35 + 0.65 * seam)            # dark seams between panels
    col = np.where(pent > 0, base * (0.6 + 0.4 * seam), col)
    lam = np.clip(n @ LIGHT, 0, 1)
    rim = np.clip(1 - n[:, 2], 0, 1) ** 2
    spec = np.clip(n @ HALFV, 0, 1) ** 60
    shade = 0.30 + 0.62 * lam - 0.22 * rim
    rgb = np.clip(col * shade, 0, 1)[:, None] * np.array([255, 252, 246], np.float32)
    rgb += (spec * 140)[:, None]
    a = (cover[mask] * alpha)[:, None]
    region = img[y0:y1, x0:x1]
    region[mask] = region[mask] * (1 - a) + np.clip(rgb, 0, 255) * a
    return img


def ball_trail(img, pts, r, R, n=6):
    """Fading ghost copies behind a fast ball, then the ball itself."""
    for k in range(n, 0, -1):
        j = len(pts) - 1 - k
        if j < 0:
            continue
        x, y = pts[j]
        draw_ball(img, x, y, r * (1 - 0.04 * k), R, alpha=0.18 * (1 - k / (n + 1)))
    x, y = pts[-1]
    return draw_ball(img, x, y, r, R)


# ---------------------------------------------------------------- helpers

def ease_io(x):
    x = min(max(x, 0.0), 1.0)
    return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2


def ease_in(x):
    x = min(max(x, 0.0), 1.0)
    return x ** 3


def ease_out(x):
    x = min(max(x, 0.0), 1.0)
    return 1 - (1 - x) ** 3


def ease_back(x):
    x = min(max(x, 0.0), 1.0)
    c1 = 1.70158
    return 1 + (c1 + 1) * (x - 1) ** 3 + c1 * (x - 1) ** 2


def scale_about(img, s, cx=W / 2, cy=H / 2, dx=0.0, dy=0.0):
    M = np.array([[s, 0, (1 - s) * cx + dx], [0, s, (1 - s) * cy + dy]], np.float32)
    return cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)


def zoom_blur(img, strength, cx=W / 2, cy=H / 2, taps=8):
    if strength < 0.004:
        return img
    acc = np.zeros_like(img)
    for k in range(taps):
        acc += scale_about(img, 1 + strength * k / (taps - 1), cx, cy)
    return acc / taps


def hblur(img, length):
    length = int(length)
    if length < 2:
        return img
    k = np.ones((1, length), np.float32) / length
    return cv2.filter2D(img, -1, k, borderType=cv2.BORDER_REFLECT)


def rgb_split(img, px):
    if px < 0.5:
        return img
    out = img.copy()
    M = np.float32([[1, 0, px], [0, 1, 0]])
    out[..., 0] = cv2.warpAffine(img[..., 0], M, (W, H), borderMode=cv2.BORDER_REFLECT)
    M = np.float32([[1, 0, -px], [0, 1, 0]])
    out[..., 2] = cv2.warpAffine(img[..., 2], M, (W, H), borderMode=cv2.BORDER_REFLECT)
    return out


YS, XS = np.mgrid[0:H, 0:W].astype(np.float32)


# ---------------------------------------------------------------- styles
# Each style gets (frames, t, c) with t inside [c-HALF, c+HALF) and returns
# the composited float32 frame. p runs 0 -> 1 across the window.

def layers(img):
    m, plate = P.person_layers(img)
    cx, cy = P.centroid(m)
    return m, plate, cx, cy


def style_wipe(frames, t, c):
    """The ball is kicked across the frame and drags the next clip in behind it.
    The old player is swept away in its wake; the new one runs in after it."""
    out, inc = transition_pair(frames, t, c)
    mo, po, ox, oy = layers(out)
    mi, pi, ix, iy = layers(inc)
    p = (t - (c - HALF)) / (2 * HALF)
    start, end = np.array([-0.10 * W, 0.95 * H]), np.array([1.25 * W, 0.10 * H])
    d = (end - start) / np.linalg.norm(end - start)
    def pos(tt):
        x = min(max((tt - (c - HALF)) / (2 * HALF), 0.0), 1.0)
        return start + (end - start) * (x * x * (3 - 2 * x))
    bx, by = pos(t)
    side = (XS - bx) * d[0] + (YS - by) * d[1]    # >0 ahead of the ball
    edge = np.clip(side / 40 + 0.5, 0, 1)[..., None]
    img = pi * (1 - edge) + po * edge
    glow = np.exp(-(side / 18) ** 2)[..., None]
    img = img + glow * np.array([255, 250, 235], np.float32) * 0.55
    # new player sprints in from behind the ball and skids into place
    u = min(max((p - 0.28) / 0.62, 0.0), 1.0)
    e = ease_back(u)
    img = P.paste(img, inc, mi, s=0.8 + 0.2 * e, ax=ix, ay=iy,
                  dx=-d[0] * 0.75 * W * (1 - e), dy=-d[1] * 0.75 * W * (1 - e),
                  angle=12 * (1 - e), alpha=min(1.0, u * 4), blur=40 * (1 - u))
    # old player gets clipped by the ball and flung off along its path
    hit = -((ox - bx) * d[0] + (oy - by) * d[1]) / (0.55 * W)
    k = min(max(hit, 0.0), 1.0)
    img = P.paste(img, out, mo, s=1 - 0.35 * k, ax=ox, ay=oy,
                  dx=d[0] * 1.1 * W * ease_in(k) + 0.0, dy=d[1] * 1.1 * W * ease_in(k),
                  angle=-40 * ease_in(k), alpha=1 - ease_in(k), blur=50 * k)
    r = 0.10 * W
    R = rot(-(t - c) * 0.55, (d[1], -d[0], 0.25))
    pts = [pos(t - k * 0.5) for k in range(6, -1, -1)]
    return ball_trail(img, pts, r, R)


def style_zoom(frames, t, c):
    """Kicked straight at the lens: the ball fills the screen, we fly through it.
    The old player is sucked in after the ball; the new one bursts out of it."""
    out, inc = transition_pair(frames, t, c)
    p = (t - (c - HALF)) / (2 * HALF)
    sx, sy = 0.56 * W, 0.84 * H                    # off Messi's boot
    R = rot(p * 7.0, (1, 0.3, 0.2))
    if t < c:
        mo, po, ox, oy = layers(out)
        q = p * 2                                   # 0 -> 1 up to the cut
        r = 26 * (math.hypot(W, H) * 0.62 / 26) ** ease_in(q)
        cx = sx + (W / 2 - sx) * ease_io(q)
        cy = sy + (H * 0.5 - sy) * ease_io(q)
        img = zoom_blur(scale_about(po, 1 + 0.12 * ease_in(q), cx, cy), 0.10 * ease_in(q), cx, cy)
        e = ease_in(q)
        img = P.paste(img, out, mo, s=1 + 1.4 * e, ax=ox, ay=oy,
                      dx=(cx - ox) * 0.5 * e, dy=(cy - oy) * 0.5 * e, angle=-14 * e)
        return draw_ball(img, cx, cy, r, R)
    mi, pi, ix, iy = layers(inc)
    q = p * 2 - 1                                   # 0 -> 1 after the cut
    img = zoom_blur(scale_about(pi, 1.25 - 0.25 * ease_out(q)), 0.12 * (1 - ease_out(q)))
    e = ease_back(min(q * 1.25, 1.0))
    img = P.paste(img, inc, mi, s=0.3 + 0.7 * e, ax=ix, ay=iy,
                  dx=(W / 2 - ix) * (1 - e), dy=(H / 2 - iy) * (1 - e), angle=20 * (1 - e))
    r = math.hypot(W, H) * 0.62 * (1 + 2.5 * ease_in(q))
    return draw_ball(img, W / 2, H / 2, r, R, hole=0.15 + 0.85 * ease_out(q) ** 0.8)


RNG = np.random.default_rng(7)
SHAKE = RNG.normal(0, 1, (4096, 2)).astype(np.float32)


def style_impact(frames, t, c):
    """A hard-hit ball smashes the cut: flash, punch-in, shake, shockwave.
    The players pop off the pitch as white-outlined stickers."""
    out, inc = transition_pair(frames, t, c)
    p = (t - (c - HALF)) / (2 * HALF)
    sx, sy = 0.56 * W, 0.84 * H
    R = rot(p * 9.0, (0.2, 1, 0.3))
    if t < c:
        mo, po, ox, oy = layers(out)
        q = p * 2
        img = scale_about(po, 1 + 0.10 * ease_in(q), sx, sy)
        e = ease_out(min(q * 1.6, 1.0))
        img = P.paste(img, out, mo, s=1 + 0.22 * e + 0.1 * ease_in(q), ax=ox, ay=oy + 0.15 * H,
                      dy=-30 * e, angle=-6 * e, outline=e, shadow=e)
        pts = []
        for k in range(6, -1, -1):
            qq = max(q - k * 0.04, 0)
            pts.append((sx + (0.5 * W - sx) * ease_in(qq), sy + (0.42 * H - sy) * ease_in(qq)))
        r = 30 + 330 * ease_in(q)
        return ball_trail(img, pts, r, R)
    mi, pi, ix, iy = layers(inc)
    q = (t - c) / HALF
    s = 1.18 - 0.18 * ease_out(q)
    amp = 34 * (1 - q) ** 2
    dx, dy = SHAKE[(t * 3) % len(SHAKE)] * amp
    img = scale_about(pi, s, dx=dx, dy=dy)
    img = rgb_split(img, 16 * (1 - q) ** 2)
    ring_r = 60 + 1500 * ease_out(q)
    dist = np.sqrt((XS - W / 2) ** 2 + (YS - 0.42 * H) ** 2)
    ring = np.exp(-((dist - ring_r) / (22 + 60 * q)) ** 2) * (1 - q) ** 1.5
    img = img + ring[..., None] * 200
    # sticker slams down onto the pitch, outline fades as it settles
    e = ease_out(min(q * 1.4, 1.0))
    look = max(0.0, 1 - q * 1.3)
    img = P.paste(img, inc, mi, s=1.45 - 0.45 * e, ax=ix, ay=iy + 0.15 * H,
                  dx=dx * 0.3, dy=dy * 0.3, angle=8 * (1 - e), outline=look, shadow=look)
    flash = max(0.0, 1 - (t - c) / 4.0)
    img = img * (1 - flash) + 255 * flash
    return img


def style_whip(frames, t, c):
    """Whip-pan chasing the ball: both clips stream sideways in a motion blur.
    The players ride a faster layer, so they overtake the pitch and skid in."""
    out, inc = transition_pair(frames, t, c)
    mo, po, ox, oy = layers(out)
    mi, pi, ix, iy = layers(inc)
    p = (t - (c - HALF)) / (2 * HALF)
    s = ease_io(p)
    off = s * W
    vel = (ease_io(p + 0.5 / (2 * HALF)) - ease_io(p - 0.5 / (2 * HALF))) * W
    M1 = np.float32([[1, 0, -off], [0, 1, 0]])
    M2 = np.float32([[1, 0, W - off], [0, 1, 0]])
    a = cv2.warpAffine(po, M1, (W, H), borderMode=cv2.BORDER_CONSTANT)
    b = cv2.warpAffine(pi, M2, (W, H), borderMode=cv2.BORDER_CONSTANT)
    img = hblur(a + b, vel * 1.6)
    eo = ease_in(min(p * 1.6, 1.0))
    img = P.paste(img, out, mo, ax=ox, ay=oy, dx=-1.5 * W * eo, angle=8 * eo,
                  alpha=1 - ease_in(min(p * 1.8, 1.0)) * 0.3, blur=vel * 0.5)
    u = min(max((p - 0.25) / 0.75, 0.0), 1.0)
    ei = ease_back(u)
    img = P.paste(img, inc, mi, ax=ix, ay=iy, dx=1.2 * W * (1 - ei), angle=-10 * (1 - ei),
                  alpha=min(1.0, u * 5), blur=vel * 0.5 * (1 - u))
    bx = 0.08 * W + 0.84 * W * p
    by = 0.62 * H - math.sin(p * math.pi) * 0.12 * H
    pts = [(bx - k * vel * 0.25, by) for k in range(6, -1, -1)]
    return ball_trail(img, pts, 0.07 * W, rot(p * 10, (0, 0, 1)))


STYLES = {"wipe": style_wipe, "zoom": style_zoom, "impact": style_impact, "whip": style_whip}
LABELS = {"wipe": "A  Ball Wipe", "zoom": "B  Through the Ball",
          "impact": "C  Impact Flash", "whip": "D  Whip Pan"}


# ---------------------------------------------------------------- sound

SR = 48000


def whoosh(n, rng):
    noise = rng.normal(0, 1, n).astype(np.float32)
    env = np.sin(np.linspace(0, math.pi, n)) ** 2
    # rising band-pass sweep via a one-pole low-pass with moving cutoff
    out = np.zeros(n, np.float32)
    lp = 0.0
    for i in range(n):
        k = 0.02 + 0.25 * (i / n)
        lp += k * (noise[i] - lp)
        out[i] = noise[i] - lp * 0.6 + lp
    return out * env * 0.22


def thump(n):
    tt = np.arange(n) / SR
    f = 120 * np.exp(-tt * 18) + 45
    return (np.sin(2 * math.pi * np.cumsum(f) / SR) * np.exp(-tt * 10) * 0.6).astype(np.float32)


def sfx_track(style, cuts, n_out):
    rng = np.random.default_rng(3)
    trk = np.zeros(int(n_out / FPS * SR) + SR, np.float32)
    for c in cuts:
        at = (c - FIRST - HALF) / FPS
        i = int(at * SR)
        w = whoosh(int(2 * HALF / FPS * SR * 1.2), rng)
        trk[i:i + len(w)] += w
        if style in ("impact", "zoom"):
            j = int((c - FIRST) / FPS * SR)
            th = thump(int(0.35 * SR))
            trk[j:j + len(th)] += th
    return trk


# ---------------------------------------------------------------- main

def label(img, text):
    cv2.putText(img, text, (34, H - 52), cv2.FONT_HERSHEY_DUPLEX, 1.6, (0, 0, 0), 9, cv2.LINE_AA)
    cv2.putText(img, text, (34, H - 52), cv2.FONT_HERSHEY_DUPLEX, 1.6, (255, 255, 255), 3, cv2.LINE_AA)


def render(frames, style, src_path, outdir):
    cuts = cuts_in_range()
    fn = STYLES[style]
    n_out = LAST - FIRST
    sfx = sfx_track(style, cuts, n_out)
    sfx_path = f"{outdir}/.sfx_{style}.f32"
    sfx.tofile(sfx_path)
    out_path = f"{outdir}/sample-{style}.mp4"
    cmd = ["ffmpeg", "-v", "error", "-y",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
           "-ss", f"{FIRST / FPS:.4f}", "-t", f"{n_out / FPS:.4f}", "-i", src_path,
           "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", sfx_path,
           "-filter_complex", "[1:a]aresample=48000,volume=0.9[m];[2:a]volume=1.0[s];"
                              "[m][s]amix=inputs=2:normalize=0,alimiter=limit=0.95[a]",
           "-map", "0:v", "-map", "[a]",
           "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", out_path]
    enc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    stills = []
    for t in range(FIRST, LAST):
        c = next((c for c in cuts if c - HALF <= t < c + HALF), None)
        img = fn(frames, t, c) if c is not None else src_frame(frames, t)
        img = np.clip(img, 0, 255).astype(np.uint8)
        if c == cuts[1]:
            stills.append(img)
        enc.stdin.write(img.tobytes())
    enc.stdin.close()
    enc.wait()
    # contact strip of the second cut (Barça -> Argentina), every 3rd frame
    strip = [cv2.resize(s, (W // 4, H // 4), interpolation=cv2.INTER_AREA) for s in stills[::3]]
    sheet = np.hstack(strip)
    cv2.imwrite(f"{outdir}/strip-{style}.jpg", cv2.cvtColor(sheet, cv2.COLOR_RGB2BGR),
                [cv2.IMWRITE_JPEG_QUALITY, 88])
    print("wrote", out_path)


def compare(outdir, styles):
    ins = []
    for s in styles:
        ins += ["-i", f"{outdir}/sample-{s}.mp4"]
    draw = []
    for i, s in enumerate(styles):
        draw.append(f"[{i}:v]scale=540:720,drawtext=text='{LABELS[s]}':x=20:y=h-50:fontsize=30:"
                    f"fontcolor=white:borderw=4:bordercolor=black[v{i}]")
    fc = ";".join(draw) + ";" + "".join(f"[v{i}]" for i in range(len(styles))) + \
         "xstack=inputs=4:layout=0_0|w0_0|0_h0|w0_h0[v]"
    cmd = ["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", fc,
           "-map", "[v]", "-map", "0:a", "-c:v", "libx264", "-crf", "20", "-pix_fmt", "yuv420p",
           "-c:a", "copy", "-movflags", "+faststart", f"{outdir}/compare-all.mp4"]
    subprocess.run(cmd, check=True)
    print("wrote", f"{outdir}/compare-all.mp4")


if __name__ == "__main__":
    src, outdir = sys.argv[1], sys.argv[2]
    styles = sys.argv[3:] or list(STYLES)
    frames = load_frames(src)
    for s in styles:
        render(frames, s, src, outdir)
    if len(styles) == 4:
        compare(outdir, styles)
