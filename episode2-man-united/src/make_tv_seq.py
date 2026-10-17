"""Pre-render TV content sequences and the hero card used inside Blender."""
import os, sys
from style import *
from chars import Figure, seated_back
import tv

def hero_card(path, pose_kw=None, kind="adult"):
    k = 2.0
    w, h = 400 * k, 580 * k
    f = Figure(kind)
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{w:.0f}" height="{h:.0f}">' + \
          f.svg(seated_back(**(pose_kw or {})), w / 2, (580 - 248) * k, k, "back") + '</svg>'
    svg_png(svg).save(path)

if __name__ == "__main__":
    out = os.path.join(BUILD, "tv", "martinez1"); os.makedirs(out, exist_ok=True)
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 312
    for i in range(1, n + 1):
        p = f"{out}/{i:04d}.png"
        if not os.path.exists(p):
            tv.martinez((i - 1) / FPS).convert("RGB").save(p)
    hero_card(os.path.join(BUILD, "tv", "hero_seated.png"), dict(arm="remote_low"))
