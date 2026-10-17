"""Cut 2 renderer.

  python3 render2.py shots [ids...]   # clean segments -> build/seg2/<id>.mp4
  python3 render2.py final            # transitions + captions + mix -> out/
  python3 render2.py still <sec>
"""
import math, os, subprocess, sys
from multiprocessing import Pool
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from style import *
from edit2 import SHOTS, CAPTIONS, TOTAL, BEAT

SEG = os.path.join(BUILD, "seg2"); os.makedirs(SEG, exist_ok=True)
OUTDIR = os.path.join(ROOT, "out"); os.makedirs(OUTDIR, exist_ok=True)

def nframes(start, dur):
    return int(round((start + dur) * FPS)) - int(round(start * FPS))

def render_shot(sid):
    import shots2
    _, start, dur, _ = next(s for s in SHOTS if s[0] == sid)
    fn = shots2.FN[sid]
    n = nframes(start, dur)
    f0 = int(round(start * FPS))
    p = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                          "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "fast", "-crf", "12",
                          "-pix_fmt", "yuv444p", os.path.join(SEG, f"{sid}.mp4")], stdin=subprocess.PIPE)
    for i in range(n):
        a = fn(i / FPS, f0 + i)
        p.stdin.write(np.ascontiguousarray(np.asarray(a, np.uint8)).tobytes())
    p.stdin.close(); p.wait()
    return sid

# ------------------------------------------------------------------ transitions
def smear(a, dx, dy, k=9):
    """Directional motion blur + offset (whip pan)."""
    acc = np.zeros_like(a, np.float32)
    for i in range(k):
        s = (i - k / 2) / k
        acc += np.roll(np.roll(a, int(dx + dx * s * 1.6), 1), int(dy + dy * s * 1.6), 0)
    return (acc / k).astype(np.uint8)

_yy, _xx = None, None
def _grid():
    global _yy, _xx
    if _yy is None:
        _yy, _xx = np.mgrid[0:H, 0:W].astype(np.float32)
    return _yy, _xx

def ink_mask(k, seed=0):
    """Growing ink blots with ragged edges, 0..1."""
    yy, xx = _grid()
    rng = np.random.default_rng(seed)
    m = np.zeros((H, W), np.float32)
    blots = [(W * .5, H * .5, 1.0)] + [(rng.uniform(0, W), rng.uniform(0, H), rng.uniform(.5, .9)) for _ in range(5)]
    ang = np.arctan2(yy - H / 2, xx - W / 2)
    rag = 1 + 0.07 * np.sin(ang * 7 + seed) + 0.05 * np.sin(ang * 13 + 2 * seed)
    for cx, cy, s in blots:
        r = (k ** 1.4) * 1500 * s
        d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / rag
        m = np.maximum(m, np.clip((r - d) / 18, 0, 1))
    return m

def iris_mask(k):
    yy, xx = _grid()
    r = (k ** 1.6) * 1150
    d = np.sqrt((xx - W / 2) ** 2 + (yy - H * .48) ** 2)
    return np.clip((r - d) / 6, 0, 1)

def apply_transition(tr, i, a_last, b):
    kind = tr[0]
    if kind == "cut" or a_last is None:
        return b
    if kind == "flash":
        col, n = tr[1], tr[2]
        if i >= n:
            return b
        k = 1 - i / n
        return (b * (1 - k) + np.array(hex2rgb(col)) * k).astype(np.uint8)
    if kind == "whip":
        d, n = tr[1], tr[2]
        if i >= n:
            return b
        h = n / 2
        mag = 260
        vx, vy = {"left": (-1, 0), "right": (1, 0), "up": (0, -1), "down": (0, 1)}[d]
        if i < h:
            k = (i + 1) / h
            return smear(a_last, vx * mag * k, vy * mag * k)
        k = 1 - (i - h) / h
        return smear(b, -vx * mag * k, -vy * mag * k)
    if kind in ("ink", "iris", "dissolve"):
        n = tr[1] if kind != "ink" else tr[1]
        if i >= n:
            return b
        k = (i + 1) / n
        m = ink_mask(k, seed=len(str(a_last.shape)) + i // 100) if kind == "ink" else (iris_mask(k) if kind == "iris" else np.full((H, W), k, np.float32))
        m = m[..., None]
        return (a_last * (1 - m) + b * m).astype(np.uint8)
    if kind == "dip":
        col, n = np.array(hex2rgb(tr[1]), np.float32), tr[2]
        if i >= n:
            return b
        h = n / 2
        if i < h:
            k = (i + 1) / h
            return (a_last * (1 - k) + col * k).astype(np.uint8)
        k = (i - h + 1) / h
        return (col * (1 - k) + b * k).astype(np.uint8)
    return b

# ------------------------------------------------------------------ captions
_fonts = {}
def font(path, size):
    if (path, size) not in _fonts:
        _fonts[(path, size)] = ImageFont.truetype(path, size)
    return _fonts[(path, size)]

def halo_text(img, xy, text, f, fill, halo, a, blur=10, strength=0.7, anchor="mm"):
    if a <= 0:
        return
    m = Image.new("L", img.size, 0)
    ImageDraw.Draw(m).text(xy, text, font=f, fill=255, anchor=anchor, stroke_width=6)
    bb = m.getbbox()
    if bb:
        pad = 44
        box = (max(0, bb[0] - pad), max(0, bb[1] - pad), min(W, bb[2] + pad), min(H, bb[3] + pad))
        sub = m.crop(box).filter(ImageFilter.GaussianBlur(blur)).point(lambda v: int(min(255, v * 1.6) * strength * a))
        lay = Image.new("RGBA", (box[2] - box[0], box[3] - box[1]), (*halo, 255)); lay.putalpha(sub)
        img.alpha_composite(lay, (box[0], box[1]))
    ImageDraw.Draw(img).text(xy, text, font=f, fill=(*fill, int(255 * a)), anchor=anchor)

def lum(img, box):
    return np.asarray(img.crop(box).convert("L"), np.float32).mean()

def split2(text, maxlen=15):
    if len(text) <= maxlen:
        return [text]
    # prefer a sentence break, then a comma or colon, nearest the middle
    for marks in ("。", "，：；·"):
        cands = [i for i, ch in enumerate(text) if ch in marks and 2 < i < len(text) - 2]
        if cands:
            cut = min(cands, key=lambda i: abs(i - len(text) / 2))
            break
    else:
        cut = len(text) // 2
    a, b = text[:cut + 1].strip(), text[cut + 1:].strip()
    return [a.rstrip("·").strip(), b] if a.endswith("·") else [a, b]

def draw_caption(img, t, t0, t1, text, style):
    a_in = ease((t - t0) / 0.22)
    a_out = 1 - ease((t - (t1 - 0.2)) / 0.2)
    a = min(a_in, a_out)
    if a <= 0:
        return
    rise = (1 - a_in) * 16
    if style == "tag":
        y = 250
        light = lum(img, (300, y - 25, W - 300, y + 25)) > 150
        col = hex2rgb(C["ink"]) if light else hex2rgb(C["paper"])
        halo = hex2rgb(C["paper"]) if light else (18, 16, 14)
        for k, line in enumerate(text.split("|")):
            ff = font(SERIF, 30 if k == 0 else 24)
            halo_text(img, (W / 2, y + k * 42), line, ff, col, halo, a * .92, blur=7, strength=.6)
        return
    if style == "big":
        k = ease_out_back(min(1, (t - t0) / 0.35))
        f = font(SERIF_B, int(130 * (0.85 + 0.15 * k)))
        light = lum(img, (200, 720, W - 200, 920)) > 150
        halo_text(img, (W / 2, 820), text, f, hex2rgb(C["red_d"] if light else C["paper"]),
                  hex2rgb(C["paper"]) if light else (18, 16, 14), a, blur=14, strength=.75)
        return
    if style == "hand":
        n = max(1, int(len(text) * min(1, (t - t0) / 0.6)))
        f = font(KAI, 84)
        light = lum(img, (200, 1340, W - 200, 1500)) > 150
        halo_text(img, (W / 2, 1420 - rise), text[:n], f, hex2rgb(C["red_d"] if light else C["ochre_l"]),
                  hex2rgb(C["paper"]) if light else (18, 16, 14), a, strength=.75)
        return
    # cap / quote: one or two lines, typed on quickly
    lines = split2(text)
    shown = int(len(text) * min(1, (t - t0) / max(0.25, min(0.6, len(text) * 0.028)))) + 1
    f = font(SERIF, 54 if style == "cap" else 56)
    y0 = 1480 - (len(lines) - 1) * 40
    light = lum(img, (140, y0 - 50, W - 140, y0 + 50 + (len(lines) - 1) * 80)) > 150
    used = 0
    for k, line in enumerate(lines):
        vis = line[:max(0, shown - used)]
        used += len(line)
        if style == "quote":
            vis = ("「" if k == 0 else "") + vis + ("」" if k == len(lines) - 1 and len(vis) == len(line) else "")
            fill = hex2rgb(C["red_d"] if light else C["ochre_l"])
        else:
            fill = hex2rgb(C["ink"] if light else C["paper"])
        halo_text(img, (W / 2, y0 + k * 80 - rise), vis, f, fill,
                  hex2rgb(C["paper"]) if light else (18, 16, 14), a, strength=.85 if light else .72)

def ease_out_back(x):
    c1 = 1.70158; c3 = c1 + 1
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2

# ------------------------------------------------------------------ final
def final():
    out_raw = os.path.join(BUILD, "video2.mp4")
    enc = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                            "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "fast", "-crf", "16",
                            "-pix_fmt", "yuv420p", out_raw], stdin=subprocess.PIPE)
    a_last = None
    fi = 0
    for sid, start, dur, tr in SHOTS:
        n = nframes(start, dur)
        dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", os.path.join(SEG, f"{sid}.mp4"), "-f", "rawvideo",
                                "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
        last = None
        for i in range(n):
            raw = dec.stdout.read(W * H * 3)
            if len(raw) == W * H * 3:
                b = np.frombuffer(raw, np.uint8).reshape(H, W, 3)
                last = b
            else:
                b = last
            frame = apply_transition(tr, i, a_last, b)
            t = fi / FPS
            img = Image.fromarray(frame).convert("RGBA")
            for t0, t1, text, style in CAPTIONS:
                if t0 <= t < t1:
                    draw_caption(img, t, t0, t1, text, style)
            enc.stdin.write(img.convert("RGB").tobytes())
            fi += 1
        dec.stdout.close(); dec.wait()
        a_last = last.copy()
    enc.stdin.close(); enc.wait()
    out = os.path.join(OUTDIR, "ep2_man_united_v3.mp4")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", out_raw, "-i", os.path.join(BUILD, "mix2.wav"),
                    "-af", "loudnorm=I=-14:TP=-1.2:LRA=12", "-ar", "48000", "-c:v", "libx264", "-preset", "slow",
                    "-crf", "19", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest",
                    "-movflags", "+faststart", out], check=True)
    return out

if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "shots":
        ids = sys.argv[2:] or [s[0] for s in SHOTS]
        with Pool(int(os.environ.get("JOBS", 3))) as pool:
            for sid in pool.imap_unordered(render_shot, ids):
                print("done", sid, flush=True)
    elif cmd == "final":
        print(final())
    elif cmd == "still":
        import shots2
        t = float(sys.argv[2])
        sid, start, dur, _ = [s for s in SHOTS if s[1] <= t][-1]
        Image.fromarray(np.asarray(shots2.FN[sid](t - start, int(t * FPS)))).save(os.path.join(BUILD, "still.png"))
