"""Lift the player off the grass: a key against the green pitch, the largest
non-grass blob as the person, and an inpainted clean plate behind him."""
import cv2
import numpy as np

SW, SH = 270, 360          # work resolution for the key


def person_layers(img):
    """img: float32 RGB at full size. Returns (mask HxW float 0..1, plate)."""
    H, W = img.shape[:2]
    small = cv2.resize(img, (SW, SH), interpolation=cv2.INTER_AREA)
    r, g, b = small[..., 0], small[..., 1], small[..., 2]
    grass = (g > r + 12) & (g > b + 8) & (r + g + b < 520)
    fg = (~grass).astype(np.uint8)
    fg[: int(SH * 0.085)] = 0                      # watermark strip
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    fg = cv2.morphologyEx(fg, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(fg, 8)
    mask = np.zeros_like(fg)
    if n > 1:
        areas = stats[1:, cv2.CC_STAT_AREA]
        best = 1 + int(areas.argmax())
        keep = [best] + [1 + i for i, a in enumerate(areas)
                         if a > 0.15 * areas.max() and 1 + i != best
                         and _near(stats[1 + i], stats[best])]
        mask = np.isin(lab, keep).astype(np.uint8)
        # fill holes
        inv = (1 - mask).copy()
        ff = np.zeros((SH + 2, SW + 2), np.uint8)
        cv2.floodFill(inv, ff, (0, 0), 0)
        mask |= inv
    hard = cv2.dilate(mask, np.ones((5, 5), np.uint8))
    wide = cv2.dilate(hard, np.ones((11, 11), np.uint8))
    plate_s = cv2.inpaint(np.clip(small, 0, 255).astype(np.uint8), wide,
                          7, cv2.INPAINT_TELEA).astype(np.float32)
    plate_s = cv2.GaussianBlur(plate_s, (0, 0), 2.0) * wide[..., None] + small * (1 - wide[..., None])
    soft = cv2.GaussianBlur(hard.astype(np.float32), (0, 0), 1.2)
    m = cv2.resize(soft, (W, H), interpolation=cv2.INTER_LINEAR)
    hole = cv2.resize(cv2.GaussianBlur(wide.astype(np.float32), (0, 0), 2.0),
                      (W, H))[..., None]
    plate = img * (1 - hole) + cv2.resize(plate_s, (W, H), interpolation=cv2.INTER_CUBIC) * hole
    return np.clip(m, 0, 1), plate


def _near(a, b):
    ax, ay, aw, ah = a[:4]
    bx, by, bw, bh = b[:4]
    return not (ax > bx + bw + 20 or bx > ax + aw + 20 or ay > by + bh + 20 or by > ay + ah + 20)


def centroid(m):
    ys, xs = np.nonzero(m[::8, ::8] > 0.5)
    if len(xs) == 0:
        return m.shape[1] / 2, m.shape[0] / 2
    return xs.mean() * 8, ys.mean() * 8


def warp(img, s, ax, ay, dx, dy, angle=0.0):
    H, W = img.shape[:2]
    M = cv2.getRotationMatrix2D((ax, ay), angle, s)
    M[0, 2] += dx
    M[1, 2] += dy
    return cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)


def paste(bg, fg, m, s=1.0, ax=0.0, ay=0.0, dx=0.0, dy=0.0, angle=0.0, alpha=1.0,
          outline=0.0, shadow=0.0, blur=0):
    """Composite the cut-out player (fg masked by m) onto bg with a transform."""
    if alpha <= 0.01:
        return bg
    mw = warp(m, s, ax, ay, dx, dy, angle)
    fw = warp(fg, s, ax, ay, dx, dy, angle)
    if blur >= 2:
        k = np.ones((1, int(blur)), np.float32) / int(blur)
        mw = cv2.filter2D(mw, -1, k)
        fw = cv2.filter2D(fw, -1, k)
    out = bg
    if shadow > 0:
        sh = cv2.GaussianBlur(warp(m, s, ax, ay, dx + 18, dy + 26, angle), (0, 0), 14)
        out = out * (1 - (sh * shadow * alpha)[..., None] * 0.6)
    if outline > 0:
        k = max(3, int(14 * s) | 1)
        ring = cv2.GaussianBlur(cv2.dilate(mw, np.ones((k, k), np.uint8)), (0, 0), 1.5)
        a = (ring * outline * alpha)[..., None]
        out = out * (1 - a) + 255 * a
    a = (mw * alpha)[..., None]
    return out * (1 - a) + fw * a
