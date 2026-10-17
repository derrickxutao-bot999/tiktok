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
    ev.sort()
    return [(a, min(b, ev[i + 1][0] - 0.02) if i + 1 < len(ev) else b, c, q) for i, (a, b, c, q) in enumerate(ev)]

_fonts = {}
def font(path, size):
    if (path, size) not in _fonts:
        _fonts[(path, size)] = ImageFont.truetype(path, size)
    return _fonts[(path, size)]

def draw_sub(img, text, quote, a):
    d = ImageDraw.Draw(img, "RGBA")
    f = font(SERIF, 50)
    y = 1520
    region = np.asarray(img.crop((140, y - 40, W - 140, y + 40)).convert("L"), np.float32).mean()
    bright = region > 150
    if bright:
        fill = (*hex2rgb(C["red_d"] if quote else C["ink"]), int(255 * a))
        d.text((W / 2, y), text, font=f, fill=fill, anchor="mm")
    else:
        fill = (*hex2rgb(C["ochre_l"] if quote else C["paper"]), int(255 * a))
        d.text((W / 2 + 2, y + 3), text, font=f, fill=(20, 18, 16, int(150 * a)), anchor="mm")
        d.text((W / 2, y), text, font=f, fill=fill, anchor="mm", stroke_width=2, stroke_fill=(30, 26, 24, int(120 * a)))

def draw_tag(img, text, a):
    d = ImageDraw.Draw(img, "RGBA")
    f = font(SERIF, 30)
    y = 210
    region = np.asarray(img.crop((300, y - 25, W - 300, y + 25)).convert("L"), np.float32).mean()
    col = hex2rgb(C["ink"]) if region > 150 else hex2rgb(C["paper"])
    d.text((W / 2, y), "  ".join(text) if len(text) <= 4 else text, font=f, fill=(*col, int(230 * a)), anchor="mm")

def final():
    segs = [os.path.join(SEG, f"{s[0]}.mp4") for s in SHOTS]
    lst = os.path.join(BUILD, "concat.txt")
    open(lst, "w").write("".join(f"file '{p}'\n" for p in segs))
    ev = subtitle_events()
    dec = subprocess.Popen(["ffmpeg", "-v", "error", "-f", "concat", "-safe", "0", "-i", lst, "-f", "rawvideo",
                            "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    out = os.path.join(BUILD, "video_subs.mp4")
    enc = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                            "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "17",
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
        print(out)
    elif cmd == "still":
        t = float(sys.argv[2])
        sid, start, dur, _ = [s for s in SHOTS if s[1] <= t][-1]
        a = shot_fn(sid)(t - start, int(t * FPS))
        Image.fromarray(np.asarray(a)).save(os.path.join(BUILD, "still.png"))
