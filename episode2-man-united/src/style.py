"""Shared palette, sizes and small helpers."""
import io, os
import numpy as np
from PIL import Image

W, H, FPS = 1080, 1920, 24
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BUILD = os.path.join(ROOT, "build")
FONT_DIR = "/opt/assets"
SERIF = f"{FONT_DIR}/NotoSerifSC.otf"
SERIF_B = f"{FONT_DIR}/NotoSerifSC-SemiBold.otf"
KAI = f"{FONT_DIR}/LXGWWenKai-Regular.ttf"

C = dict(
    ivory="#EFE5CF", paper="#F4ECDA", ivory_d="#E2D5B8",
    ink="#2A2522", charcoal="#3B3632", grey="#8C8273", grey_l="#B9AE98",
    ochre="#B8893B", ochre_l="#D8B874", ochre_d="#8E6527",
    red="#A3262B", red_d="#7A1C21", red_l="#C2493F",
    skin="#E3B98F", skin_d="#C99A70",
    hair="#2F2622", hair_f="#5A5049",
    green="#3F5B3B", gold="#C9A23F",
    night="#2E3236", tv="#1E1C1B",
)

def hex2rgb(h):
    h = h.lstrip("#"); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

def svg_png(svg, w=None, h=None):
    import cairosvg
    b = cairosvg.svg2png(bytestring=svg.encode(), output_width=w, output_height=h)
    return Image.open(io.BytesIO(b)).convert("RGBA")

def ease(t):
    t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)

def ease_io(t, p=3):
    t = max(0.0, min(1.0, t))
    return 4 * t ** 3 if p == 3 and t < .5 else (1 - (-2 * t + 2) ** 3 / 2 if p == 3 else t)

def lerp(a, b, t):
    return a + (b - a) * t

def lerp_pt(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)

_paper = None
def paper_texture():
    """Subtle paper fibre texture, multiplicative, values ~0.93-1.03."""
    global _paper
    if _paper is None:
        p = os.path.join(BUILD, "paper.npy")
        if os.path.exists(p):
            _paper = np.load(p)
        else:
            rng = np.random.default_rng(7)
            def blur_noise(scale):
                n = rng.standard_normal((H // scale + 2, W // scale + 2)).astype(np.float32)
                im = Image.fromarray(((n - n.min()) / (np.ptp(n)) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)
                return np.asarray(im, np.float32) / 255 - .5
            fib = rng.standard_normal((H, W)).astype(np.float32)
            fib = np.asarray(Image.fromarray(((fib * 30) + 128).clip(0, 255).astype(np.uint8)).resize((W // 2, H * 2)).resize((W, H)), np.float32) / 255 - .5
            t = 1 + .035 * blur_noise(240) + .022 * blur_noise(40) + .018 * fib
            _paper = t.astype(np.float32)
            os.makedirs(BUILD, exist_ok=True); np.save(p, _paper)
    return _paper
