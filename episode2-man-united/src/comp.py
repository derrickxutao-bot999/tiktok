"""2D compositing helpers: Blender plates + SVG figures + TV content + finish."""
import json, math, os
from functools import lru_cache
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops
from style import *

BL = os.path.join(BUILD, "blender")

@lru_cache(maxsize=64)
def plate(era, name):
    return Image.open(os.path.join(BL, era, name)).convert("RGBA")

@lru_cache(maxsize=8)
def anchors(era, side=False):
    name = {False: "anchors.json", True: "anchors_side.json", "m": "m_anchors.json"}[side]
    return json.load(open(os.path.join(BL, era, name)))

def door_layer(era, angle):
    a = int(round(max(0, min(100, angle)) / 4) * 4)
    return plate(era, f"door_{a:03d}.png")

def figures_layer(items):
    """items: list of svg fragments (already in screen space)."""
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}">' + "\n".join(items) + '</svg>'
    return svg_png(svg)

def _coeffs(dst, src):
    """Perspective coefficients mapping output (dst quad) to input (src quad)."""
    A = []; B = []
    for (x, y), (u, v) in zip(dst, src):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); B.append(u)
        A.append([0, 0, 0, x, y, 1, -v * x, -v * y]); B.append(v)
    return np.linalg.solve(np.array(A, float), np.array(B, float)).tolist()

def warp_into(base, content, quad, opacity=1.0, glow_amt=0.0):
    """Perspective-warp `content` (RGB/RGBA) into screen quad (tl,tr,br,bl)."""
    cw, ch = content.size
    src = [(0, 0), (cw, 0), (cw, ch), (0, ch)]
    co = _coeffs(quad, src)
    im = content.convert("RGBA").transform((W, H), Image.PERSPECTIVE, co, Image.BICUBIC)
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).polygon([tuple(p) for p in quad], fill=int(255 * opacity))
    im.putalpha(ImageChops.multiply(im.getchannel("A"), mask))
    base.alpha_composite(im)
    if glow_amt > 0:
        g = im.filter(ImageFilter.GaussianBlur(60))
        arr = np.asarray(g, np.float32)
        arr[..., 3] *= glow_amt
        base.alpha_composite(Image.fromarray(arr.clip(0, 255).astype(np.uint8)))
    return base

def poly_mask(quad, feather=0):
    m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m).polygon([tuple(p) for p in quad], fill=255)
    if feather:
        m = m.filter(ImageFilter.GaussianBlur(feather))
    return m

def masked(layer, mask):
    l = layer.copy()
    l.putalpha(ImageChops.multiply(l.getchannel("A"), mask))
    return l

def tint(img, col, amt):
    """Multiply-tint an RGBA image toward a colour (mood grading)."""
    a = np.asarray(img, np.float32)
    c = np.array(hex2rgb(col), np.float32) / 255
    a[..., :3] = a[..., :3] * (1 - amt + amt * c)
    return Image.fromarray(a.clip(0, 255).astype(np.uint8))

def light_pool(size_wh, center, radius, col, strength):
    """Soft additive light (screen blend) for TV glow / door light."""
    w, h = size_wh
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt((xx - center[0]) ** 2 + (yy - center[1]) ** 2) / radius
    f = np.clip(1 - d, 0, 1) ** 2 * strength
    c = np.array(hex2rgb(col), np.float32)
    return f[..., None] * c[None, None, :]

_grain_rng = np.random.default_rng(3)
_vig = None

def finish(img, frame_idx, grade=None, vignette=0.18, grain=4.0, light=None):
    """Paper texture, gentle vignette, grain held on twos. Returns RGB uint8 array."""
    global _vig
    a = np.asarray(img.convert("RGB"), np.float32)
    if light is not None:
        a = 255 - (255 - a) * (1 - light / 255)  # screen
    if grade is not None:
        col, amt = grade
        c = np.array(hex2rgb(col), np.float32) / 255
        a = a * (1 - amt + amt * c)
    a *= paper_texture()[..., None]
    if _vig is None:
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        d = np.sqrt(((xx - W / 2) / (W * .75)) ** 2 + ((yy - H / 2) / (H * .7)) ** 2)
        _vig = np.clip(d, 0, 1.2) ** 2.2
    a *= (1 - vignette * _vig)[..., None]
    if grain:
        rng = np.random.default_rng(frame_idx // 2)
        g = rng.standard_normal((H // 2, W // 2)).astype(np.float32)
        g = np.repeat(np.repeat(g, 2, 0), 2, 1)
        a += g[..., None] * grain
    return a.clip(0, 255).astype(np.uint8)

def projector(era, side=False):
    """Return f(world_xyz) -> (x, y, px_per_m) for the plate camera."""
    A = anchors(era, side)
    M = np.array(A["cam"]["mw_inv"], float)
    fpx = A["cam"]["lens"] / A["cam"]["sensor_h"] * H
    def f(p):
        v = M @ np.array([p[0], p[1], p[2], 1.0])
        z = -v[2]
        return (W / 2 + fpx * v[0] / z, H / 2 - fpx * v[1] / z, fpx / z)
    return f

UNIT = 0.0025  # metres per figure unit
