"""Where the Prime Video interview (13 Oct 2026, after Atletico 2-0 Man United)
appears on the TV. Each entry maps film time to clip time:
(film_start, film_end, clip_start, gain_db, muffle)

The opening is a tight edit of three continuous passages of the clip:
  6.35-9.55   "Really poor. Really poor."
  15.0-21.65  "...sometimes it's a reflection of the mirror of how is our club at the moment."
  25.7-33.1   "...now we expect more from the top, from up, to bring more players..."
"""
import os
from functools import lru_cache
from PIL import Image
from style import BUILD

CLIP = os.path.join(BUILD, "clip")

SEGMENTS = [
    (0.00, 3.20, 6.35, 0.0, 0.0),     # close on the screen: full voice
    (3.20, 9.85, 15.00, 0.0, 0.25),   # pull-back starts at 6.5
    (9.85, 13.0, 25.70, -2.0, 0.6),
    (13.0, 17.25, 28.85, -7.0, 1.0),  # profile close-up + wide: through the room
    (44.0, 50.0, 3.70, -3.0, 1.0),    # loop closes: "Really poor" at 47.2, again at 49.2 over the title cut
    (217.8, 226.5, 126.0, -20.0, 1.0),# the ending: TV back on, under the narration
]

# Martinez lines as subtitles (film time, Chinese), shown as quotes
SUBS = [
    (0.45, 3.25, "真的很差。真的很差。"),
    (3.45, 6.55, "有时候，这就是"),
    (6.55, 9.85, "俱乐部现状的一面镜子。"),
    (10.0, 12.6, "我们期待高层做得更多。"),
    (47.15, 48.0, "真的很差。"),
    (49.15, 50.0, "真的很差。"),
]

def clip_time(film_t):
    for a, b, c, g, m in SEGMENTS:
        if a <= film_t < b:
            return c + (film_t - a)
    return None

@lru_cache(maxsize=64)
def frame(clip_t):
    """Nearest clip frame (25 fps) as RGB image."""
    if clip_t < 36:
        i = min(899, max(0, int(round(clip_t * 25))))
        p = os.path.join(CLIP, "f", f"a_{i:04d}.jpg")
    else:
        i = min(299, max(0, int(round((clip_t - 125) * 25))))
        p = os.path.join(CLIP, "f", f"b_{i:04d}.jpg")
    return _treat(Image.open(p).convert("RGB"))

_lines = None
def _treat(im):
    """Make the footage read as a picture on a television: a little less
    saturation and contrast, faint scanlines."""
    import numpy as np
    global _lines
    a = np.asarray(im, np.float32)
    g = a.mean(2, keepdims=True)
    a = g + (a - g) * 0.82
    a = 128 + (a - 128) * 0.93
    if _lines is None:
        _lines = (1 - 0.07 * (np.arange(a.shape[0]) % 3 == 0))[:, None, None].astype(np.float32)
    a *= _lines
    return Image.fromarray(a.clip(0, 255).astype(np.uint8))

def at(film_t):
    ct = clip_time(film_t)
    return None if ct is None else frame(round(ct * 25) / 25)
