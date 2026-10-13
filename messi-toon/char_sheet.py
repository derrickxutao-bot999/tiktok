"""Cut the cartoon player out of chosen frames as a character reference.

    python3 char_sheet.py SOURCE.mov OUT_DIR

Writes OUT_DIR/<name>.png (transparent cutouts) and OUT_DIR/sheet.png.
Uses the same flatten / palette / ink steps as toon.py, so the cutouts
match the animation.
"""
import os
import subprocess
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

from toon import SCALE, fit_palette, flatten, ink, quantise, remove_watermarks

# Source frame, cutout name, sheet label. Picked for clear, unblurred poses.
POSES = [
    (145, "barca-stride", "Barça · full stride"),
    (16, "barca-upright", "Barça · upright"),
    (53, "argentina-stride", "Argentina · stride"),
    (59, "argentina-reach", "Argentina · reaching"),
]
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def frame(src, n):
    out = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-vf",
                          f"select=eq(n\\,{n - 1})", "-vsync", "0", "-frames:v", "1",
                          "-f", "image2pipe", "-vcodec", "png", "-"],
                         check=True, capture_output=True).stdout
    return cv2.imdecode(np.frombuffer(out, np.uint8), cv2.IMREAD_COLOR)


def player_alpha(f):
    """Everything that isn't grass, as one solid figure (the ball is dropped)."""
    hsv = cv2.cvtColor(f, cv2.COLOR_BGR2HSV)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    # Wider than toon.py's grass test: also drops the olive motion-blur fringe.
    grass = (h >= 19) & (h <= 90) & (s >= 45) & (v >= 25)
    m = (~grass).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    # Watermark-free source can still have a dark edge row; ignore borders.
    m[:16], m[-16:], m[:, :6], m[:, -6:] = 0, 0, 0, 0
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m, 8)
    keep = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
    m = (lab == keep).astype(np.uint8)
    # Fill tiny enclosed specks, keep real gaps (between legs, under arms).
    inv = 1 - m
    n, lab, stats, _ = cv2.connectedComponentsWithStats(inv, 4)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] < 1500:
            m[lab == i] = 1
    return m


def cutout(f, centers):
    a = player_alpha(f)
    cel = quantise(f, centers).astype(np.float32)
    hsv = cv2.cvtColor(cel.astype(np.uint8), cv2.COLOR_BGR2HSV).astype(np.float32)
    hsv[..., 1] = np.clip(hsv[..., 1] * 1.25, 0, 255)
    hsv[..., 2] = np.clip(255 * (hsv[..., 2] / 255) ** 0.72, 0, 255)
    cel = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR).astype(np.float32)
    # Any olive fringe left inside the figure is repainted from its neighbours.
    ch = cv2.cvtColor(cel.astype(np.uint8), cv2.COLOR_BGR2HSV)
    olive = ((ch[..., 0] >= 19) & (ch[..., 0] <= 45) & (ch[..., 1] >= 50)
             & (ch[..., 2] >= 100) & (a == 1))
    olive = cv2.dilate(olive.astype(np.uint8), np.ones((3, 3), np.uint8))
    cel = cv2.inpaint(cel.astype(np.uint8), olive, 7, cv2.INPAINT_TELEA).astype(np.float32)
    toon = cel * (0.1 + 0.9 * ink(f))
    # Bold ink outline drawn just outside the figure, sticker style.
    outer = cv2.dilate(a, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    toon[(outer == 1) & (a == 0)] = (24, 20, 20)
    alpha = cv2.GaussianBlur(outer.astype(np.float32), (0, 0), 0.9)
    rgba = np.dstack([toon.astype(np.uint8), (alpha * 255).astype(np.uint8)])
    ys, xs = np.where(outer)
    p = 24
    y0, y1 = max(ys.min() - p, 0), min(ys.max() + p, f.shape[0])
    x0, x1 = max(xs.min() - p, 0), min(xs.max() + p, f.shape[1])
    return rgba[y0:y1, x0:x1]


def sheet(cuts, labels, path):
    cell_h = 1000
    imgs = []
    for c in cuts:
        im = Image.fromarray(cv2.cvtColor(c, cv2.COLOR_BGRA2RGBA))
        s = (cell_h - 140) / im.height
        imgs.append(im.resize((round(im.width * s), cell_h - 140), Image.LANCZOS))
    gap = 60
    w = sum(i.width for i in imgs) + gap * (len(imgs) + 1)
    out = Image.new("RGB", (w, cell_h + 120), (244, 240, 230))
    d = ImageDraw.Draw(out)
    title = ImageFont.truetype(FONT, 46)
    lab = ImageFont.truetype(FONT, 30)
    d.text((gap, 34), "CHARACTER REFERENCE · No. 10", font=title, fill=(30, 30, 34))
    x = gap
    for im, t in zip(imgs, labels):
        y = 130
        d.ellipse((x + im.width * 0.15, y + im.height - 28,
                   x + im.width * 0.85, y + im.height + 10), fill=(214, 208, 194))
        out.paste(im, (x, y), im)
        d.text((x + im.width / 2, cell_h + 50), t, font=lab, fill=(70, 70, 76), anchor="mm")
        x += im.width + gap
    out.save(path)


def main(src, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    flat = []
    for n, *_ in POSES:
        f = remove_watermarks(frame(src, n))
        up = cv2.resize(f, None, fx=SCALE, fy=SCALE, interpolation=cv2.INTER_LANCZOS4)
        flat.append(flatten(up))
    centers = fit_palette(flat)
    cuts = []
    for f, (_, name, _) in zip(flat, POSES):
        c = cutout(f, centers)
        cv2.imwrite(os.path.join(out_dir, f"{name}.png"), c)
        cuts.append(c)
    sheet(cuts, [p[2] for p in POSES], os.path.join(out_dir, "sheet.png"))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
