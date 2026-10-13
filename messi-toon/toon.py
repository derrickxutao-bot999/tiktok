"""Redraw a short clip as cel-shaded animation, frame for frame.

    python3 toon.py SRC.mov OUT_DIR

Writes OUT_DIR/frames/%04d.png at 1080x1920. Steps per frame:
watermark inpaint -> 2x upscale -> edge-preserving flattening ->
fixed-palette colour quantisation (one palette for the whole clip, so
the colours don't flicker) -> XDoG ink lines -> 9:16 pitch extension.
"""
import os
import subprocess
import sys

import cv2
import numpy as np

W, H = 1080, 1920          # delivery frame
SCALE = 2                  # 540x720 source -> 1080x1440
K = 14                     # palette size

# Douyin watermark boxes in source pixels (y0, y1, x0, x1).
WM_BOXES = [(8, 96, 12, 242), (672, 712, 140, 402)]


def read_frames(src, tmp):
    os.makedirs(tmp, exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-vsync", "0",
                    os.path.join(tmp, "%04d.png")], check=True)
    names = sorted(n for n in os.listdir(tmp) if n.endswith(".png"))
    return [cv2.imread(os.path.join(tmp, n)) for n in names]


def remove_watermarks(f):
    """Inpaint only the pixels that stand out from the grass in each box."""
    bg = cv2.medianBlur(f, 31).astype(np.int16)
    diff = np.abs(f.astype(np.int16) - bg).max(axis=2)
    mask = np.zeros(f.shape[:2], np.uint8)
    for y0, y1, x0, x1 in WM_BOXES:
        mask[y0:y1, x0:x1] = (diff[y0:y1, x0:x1] > 28) * 255
    mask = cv2.dilate(mask, np.ones((7, 7), np.uint8))
    return cv2.inpaint(f, mask, 6, cv2.INPAINT_TELEA)


def flatten(f):
    """Smooth away grass noise and motion-blur mush, keep shape edges."""
    out = f
    for _ in range(2):
        out = cv2.bilateralFilter(out, 9, 40, 9)
    return cv2.pyrMeanShiftFiltering(out, 10, 22, maxLevel=1)


def fit_palette(frames):
    lab = [cv2.cvtColor(f, cv2.COLOR_BGR2LAB).reshape(-1, 3) for f in frames]
    rng = np.random.default_rng(7)
    sample = np.concatenate([x[rng.choice(len(x), 6000, replace=False)] for x in lab])
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 60, 0.2)
    _, _, centers = cv2.kmeans(sample.astype(np.float32), K, None, crit, 6,
                               cv2.KMEANS_PP_CENTERS)
    return centers


def quantise(f, centers):
    lab = cv2.cvtColor(f, cv2.COLOR_BGR2LAB).reshape(-1, 3).astype(np.float32)
    d = ((lab[:, None, :] - centers[None]) ** 2).sum(-1)
    labels = d.argmin(1).reshape(f.shape[:2]).astype(np.uint8)
    labels = cv2.medianBlur(labels, 7)           # drop speckles
    q = centers[labels].astype(np.uint8)
    return cv2.cvtColor(q, cv2.COLOR_LAB2BGR)


def grass_mask(f):
    """1 where the pixel is pitch (green or the yellow-green blur halo)."""
    hsv = cv2.cvtColor(f, cv2.COLOR_BGR2HSV)
    h, sat, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    m = ((h >= 24) & (h <= 90) & (sat >= 70) & (v >= 25)).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    # Keep only big connected pitch regions, so green-ish specks on the
    # player stay part of the player.
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m, 8)
    big = np.zeros(n, np.uint8)
    big[1:] = stats[1:, cv2.CC_STAT_AREA] > 20000
    return big[lab]


def paint_pitch(f, m):
    """Smooth painted pitch: grass colour diffused under the player."""
    src = f.astype(np.float32) * m[..., None]
    w = m.astype(np.float32)
    k = (0, 0)
    num = cv2.GaussianBlur(src, k, 60)
    den = cv2.GaussianBlur(w, k, 60)[..., None]
    pitch = num / np.maximum(den, 1e-3)
    # A fixed top-to-bottom light falloff, the same every frame.
    y = np.linspace(1.06, 0.9, f.shape[0], dtype=np.float32)[:, None, None]
    return pitch * y


def ink(f):
    """XDoG line art: dark where the difference of Gaussians dips."""
    g = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
    s = 1.4
    d = cv2.GaussianBlur(g, (0, 0), s) - cv2.GaussianBlur(g, (0, 0), s * 1.6)
    eps = -0.006
    e = np.where(d >= eps, 1.0, 1 + np.tanh(120 * (d - eps)))
    e = cv2.GaussianBlur(np.clip(e, 0, 1), (0, 0), 0.8)
    return e[..., None]


def extend_to_portrait(img):
    """Grow 1080x1440 to 1080x1920 with flat, painted-looking pitch."""
    img = img[8:-8]                       # source has dark rows at the edges
    pad = (H - img.shape[0]) // 2
    big = cv2.copyMakeBorder(img, pad, H - img.shape[0] - pad, 0, 0,
                             cv2.BORDER_REPLICATE)
    soft = cv2.blur(big, (301, 1))
    soft = cv2.GaussianBlur(soft, (0, 0), 25)
    # Blend: sharp inside the source area, fading to the soft fill.
    y = np.arange(H, dtype=np.float32)
    dist = np.maximum(pad - y, y - (pad + img.shape[0] - 1))
    a = np.clip(-dist / 60, 0, 1)[:, None, None]
    return (big * a + soft * (1 - a)).astype(np.uint8)


def main(src, out_dir):
    frames = read_frames(src, os.path.join(out_dir, "src"))
    only = os.environ.get("ONLY")             # e.g. ONLY=1,60,145 for previews
    keep = [int(x) for x in only.split(",")] if only else range(1, len(frames) + 1)
    frames = [frames[i - 1] for i in keep]
    frames = [remove_watermarks(f) for f in frames]
    up = [cv2.resize(f, None, fx=SCALE, fy=SCALE, interpolation=cv2.INTER_LANCZOS4)
          for f in frames]
    flat = []
    for i, f in enumerate(up):
        flat.append(extend_to_portrait(flatten(f)))
        print(f"flatten {i + 1}/{len(up)}", end="\r", flush=True)
    print()
    centers = fit_palette(flat[::4] if len(flat) > 8 else flat)
    dst = os.path.join(out_dir, "frames")
    os.makedirs(dst, exist_ok=True)
    for i, f in enumerate(flat):
        m = grass_mask(f)
        mf = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 1.2)[..., None]
        cel = quantise(f, centers).astype(np.float32)
        cel = paint_pitch(f, m) * mf + cel * (1 - mf)
        lines = ink(f) * (1 - 0.6 * mf) + 0.6 * mf      # quieter ink on grass
        # Bold silhouette outline where the player meets the pitch.
        edge = cv2.morphologyEx(m, cv2.MORPH_GRADIENT, np.ones((5, 5), np.uint8))
        edge = cv2.GaussianBlur(edge.astype(np.float32), (0, 0), 1.0)[..., None]
        lines = np.minimum(lines, 1 - 0.9 * np.clip(edge * 1.6, 0, 1))
        # Brighter, more saturated cel colours for the animated look.
        hsv = cv2.cvtColor(cel.astype(np.uint8), cv2.COLOR_BGR2HSV).astype(np.float32)
        hsv[..., 1] = np.clip(hsv[..., 1] * 1.25, 0, 255)
        hsv[..., 2] = np.clip(255 * (hsv[..., 2] / 255) ** 0.72, 0, 255)
        cel = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR).astype(np.float32)
        toon = (cel * (0.1 + 0.9 * lines)).astype(np.uint8)
        cv2.imwrite(os.path.join(dst, f"{keep[i]:04d}.png"), toon)
        print(f"draw {i + 1}/{len(flat)}", end="\r", flush=True)
    print()


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
