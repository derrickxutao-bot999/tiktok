"""Render shots to clean segments, then the final pass with subtitles.

  python3 render.py shots [ids...]   # clean segments -> build/seg/<id>.mp4
  python3 render.py final            # concat + subtitles + audio -> out/
  python3 render.py still <sec>      # one finished frame to build/still.png
"""
import json, os, re, subprocess, sys
from multiprocessing import Pool
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from style import *
from timeline import SHOTS, VO, TAGS, TOTAL
from script import LINES, NARRATOR

SEG = os.path.join(BUILD, "seg"); os.makedirs(SEG, exist_ok=True)
OUTDIR = os.path.join(ROOT, "out"); os.makedirs(OUTDIR, exist_ok=True)

def shot_fn(sid):
    key = sid.split("_")[0]
    import shots_room, shots_gfx
    return getattr(shots_room, key, None) or getattr(shots_gfx, key)

def render_shot(sid):
    _, start, dur, _ = next(s for s in SHOTS if s[0] == sid)
    fn = shot_fn(sid)
    n = int(round(dur * FPS))
    f0 = int(round(start * FPS))
    path = os.path.join(SEG, f"{sid}.mp4")
    p = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                          "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "12",
                          "-pix_fmt", "yuv444p", path], stdin=subprocess.PIPE)
    for i in range(n):
        a = fn(i / FPS, f0 + i)
        if isinstance(a, Image.Image):
            a = np.asarray(a.convert("RGB"))
        p.stdin.write(np.ascontiguousarray(a).tobytes())
    p.stdin.close(); p.wait()
    return sid

# ------------------------------------------------------------------ subtitles
def chunks(text, maxlen=15):
    out = []
    for sent in re.split(r"(?<=[。？！])", text):
        if sent:
            out += _clauses(sent, maxlen)
    return out

def _clauses(text, maxlen):
    parts = re.split(r"(?<=[，：；])", text)
    out, cur = [], ""
    for ptxt in parts:
        if not ptxt:
            continue
        if len(cur) + len(ptxt) <= maxlen:
            cur += ptxt
        else:
            if cur:
                out.append(cur)
            cur = ptxt
    if cur:
        out.append(cur)
    return out

def subtitle_events():
    durs = json.load(open(os.path.join(BUILD, "vo", "durations.json")))
    ev = []
    for k, t0 in VO.items():
        spk, text = LINES[k]
        d = durs[k]
        cs = chunks(text)
        tot = sum(len(c) for c in cs)
        t = t0
        for j, c in enumerate(cs):
            dd = d * len(c) / tot
            shown = c.rstrip("，。：；").replace("，", "  ")
            if spk is not NARRATOR:
                shown = "「" + shown + "」"
            tail = 0.35 if j == len(cs) - 1 else 0.0
            ev.append((t, t + dd + tail, shown, spk is not NARRATOR))
            t += dd
    import clipmap
    for a, b, s in clipmap.SUBS:
        ev.append((a, b, "「" + s.rstrip("。").replace("。", "  ") + "」", True))
    ev.sort()
    return [(a, min(b, ev[i + 1][0] - 0.02) if i + 1 < len(ev) else b, c, q) for i, (a, b, c, q) in enumerate(ev)]

_fonts = {}
def font(path, size):
    if (path, size) not in _fonts:
        _fonts[(path, size)] = ImageFont.truetype(path, size)
    return _fonts[(path, size)]

def _halo_text(img, xy, text, f, fill, halo, a, anchor="mm", blur=9, strength=0.6):
    """Text with a soft blurred halo behind it, so it reads on any background."""
    from PIL import ImageFilter
    m = Image.new("L", img.size, 0)
    ImageDraw.Draw(m).text(xy, text, font=f, fill=255, anchor=anchor, stroke_width=6)
    bbox = m.getbbox()
    if bbox:
        pad = 40
        box = (max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(W, bbox[2] + pad), min(H, bbox[3] + pad))
        sub = m.crop(box).filter(ImageFilter.GaussianBlur(blur))
        sub = sub.point(lambda v: int(min(255, v * 1.6) * strength * a))
        layer = Image.new("RGBA", (box[2] - box[0], box[3] - box[1]), (*halo, 255))
        layer.putalpha(sub)
        img.alpha_composite(layer, (box[0], box[1]))
    ImageDraw.Draw(img).text(xy, text, font=f, fill=(*fill, int(255 * a)), anchor=anchor)

def draw_sub(img, text, quote, a):
    f = font(SERIF, 50)
    y = 1480
    region = np.asarray(img.crop((140, y - 40, W - 140, y + 40)).convert("L"), np.float32).mean()
    if region > 150:
        _halo_text(img, (W / 2, y), text, f, hex2rgb(C["red_d"] if quote else C["ink"]), hex2rgb(C["paper"]), a, strength=.85)
    else:
        _halo_text(img, (W / 2, y), text, f, hex2rgb(C["ochre_l"] if quote else C["paper"]), (18, 16, 14), a, strength=.7)

def draw_tag(img, text, a):
    f = font(SERIF, 30)
    y = 250
    region = np.asarray(img.crop((300, y - 25, W - 300, y + 25)).convert("L"), np.float32).mean()
    light = region > 150
    col = hex2rgb(C["ink"]) if light else hex2rgb(C["paper"])
    halo = hex2rgb(C["paper"]) if light else (18, 16, 14)
    for k, line in enumerate(text.split("|")):
        ff = f if k == 0 else font(SERIF, 24)
        _halo_text(img, (W / 2, y + k * 42), "  ".join(line) if len(line) <= 4 else line, ff, col, halo, a * .92, blur=7, strength=.6)

def final():
    segs = [os.path.join(SEG, f"{s[0]}.mp4") for s in SHOTS]
    lst = os.path.join(BUILD, "concat.txt")
    open(lst, "w").write("".join(f"file '{p}'\n" for p in segs))
    ev = subtitle_events()
    dec = subprocess.Popen(["ffmpeg", "-v", "error", "-f", "concat", "-safe", "0", "-i", lst, "-f", "rawvideo",
                            "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    out = os.path.join(BUILD, "video_subs.mp4")
    enc = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                            "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "fast", "-crf", "16",
                            "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
    n = int(TOTAL * FPS)
    for i in range(n):
        raw = dec.stdout.read(W * H * 3)
        if len(raw) < W * H * 3:
            break
        t = i / FPS
        img = Image.frombuffer("RGB", (W, H), raw).convert("RGBA")
        for t0, t1, s, q in ev:
            if t0 <= t < t1:
                a = min(1, (t - t0) / .12, (t1 - t) / .12)
                draw_sub(img, s, q, a)
        for t0, t1, s in TAGS:
            if t0 <= t < t1:
                draw_tag(img, s, min(1, (t - t0) / .4, (t1 - t) / .4))
        enc.stdin.write(img.convert("RGB").tobytes())
    enc.stdin.close(); enc.wait(); dec.wait()
    return out

if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "shots":
        ids = sys.argv[2:] or [s[0] for s in SHOTS]
        ids = [s[0] for s in SHOTS if any(s[0].startswith(i) for i in ids)]
        with Pool(int(os.environ.get("JOBS", 3))) as pool:
            for sid in pool.imap_unordered(render_shot, ids):
                print("done", sid, flush=True)
    elif cmd == "final":
        v = final() if "--mux-only" not in sys.argv else os.path.join(BUILD, "video_subs.mp4")
        out = os.path.join(OUTDIR, "ep2_man_united.mp4")
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", v, "-i", os.path.join(BUILD, "mix.wav"),
                        "-af", "loudnorm=I=-15:TP=-1.5:LRA=14", "-ar", "48000",
                        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out], check=True)
        # repo/TikTok copy under 100 MB: light grain clean-up, two-pass ~2.9 Mbps
        small = os.path.join(OUTDIR, "ep2_man_united_tiktok.mp4")
        base = ["ffmpeg", "-y", "-v", "error", "-i", out, "-vf", "hqdn3d=1.2:1.2:3:3", "-c:v", "libx264",
                "-preset", "slow", "-b:v", "2900k", "-pix_fmt", "yuv420p"]
        subprocess.run(base + ["-pass", "1", "-passlogfile", os.path.join(BUILD, "x264"), "-an", "-f", "mp4", "/dev/null"], check=True)
        subprocess.run(base + ["-pass", "2", "-passlogfile", os.path.join(BUILD, "x264"), "-c:a", "aac", "-b:a", "160k",
                               "-movflags", "+faststart", small], check=True)
        print(out, small)
    elif cmd == "still":
        t = float(sys.argv[2])
        sid, start, dur, _ = [s for s in SHOTS if s[1] <= t][-1]
        a = shot_fn(sid)(t - start, int(t * FPS))
        Image.fromarray(np.asarray(a)).save(os.path.join(BUILD, "still.png"))
