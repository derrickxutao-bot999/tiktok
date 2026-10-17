"""Real match footage played on the TVs (frames pre-extracted to build/footage/fr).

Clips are addressed by source time; each extracted range is (prefix, start, fps).
"""
import os
from functools import lru_cache
import numpy as np
from PIL import Image
from style import BUILD

FR = os.path.join(BUILD, "footage", "fr")
RANGES = {
    "ucl": [("u030", 30.0, 29.97), ("u060", 60.0, 29.97), ("u303", 303.0, 29.97), ("u340", 340.0, 29.97)],
    "fergie": [("f140", 140.0, 23.976), ("f203", 203.0, 23.976)],
    "rp": [("r352", 352.0, 60.0), ("r717", 717.0, 60.0), ("r735", 735.0, 60.0)],
    "nos": [("n669", 669.5, 50.0)],
}

@lru_cache(maxsize=96)
def _load(path, era_look):
    im = Image.open(path).convert("RGB")
    return tv_look(im, era_look)

def frame(src, t, look="modern"):
    best = None
    for pre, s0, fps in RANGES[src]:
        n = len([f for f in os.listdir(FR) if f.startswith(pre + "_")]) if False else None
        i = int(round((t - s0) * fps))
        p = os.path.join(FR, f"{pre}_{i:04d}.jpg")
        if i >= 0 and os.path.exists(p):
            return _load(p, look)
        if i >= 0:
            best = best or None
    # clamp to the last available frame of the nearest range
    pre, s0, fps = min(RANGES[src], key=lambda r: abs(t - r[1]))
    files = sorted(f for f in os.listdir(FR) if f.startswith(pre + "_"))
    i = max(0, min(len(files) - 1, int(round((t - s0) * fps))))
    return _load(os.path.join(FR, files[i]), look)

def tv_look(im, look):
    """Picture on a television: softer contrast, a touch of the era, scanlines."""
    a = np.asarray(im, np.float32)
    g = a.mean(2, keepdims=True)
    if look == "crt":
        a = g + (a - g) * 0.85
        a = 120 + (a - 128) * 0.92
        a[..., 0] *= 1.04; a[..., 2] *= 0.94
        lines = (1 - 0.12 * (np.arange(a.shape[0]) % 2 == 0))[:, None, None]
    else:
        a = g + (a - g) * 0.88
        a = 126 + (a - 128) * 0.94
        lines = (1 - 0.05 * (np.arange(a.shape[0]) % 3 == 0))[:, None, None]
    a *= lines
    return Image.fromarray(a.clip(0, 255).astype(np.uint8))
