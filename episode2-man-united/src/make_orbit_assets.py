"""Cards and TV sequences for the orbit montage (25.0-35.0 s, 240 frames, 60 per era)."""
import os
from style import *
from chars import Figure, seated_back
from make_tv_seq import hero_card
import tv, clipmap

OUT = os.path.join(BUILD, "orbit_assets"); os.makedirs(OUT, exist_ok=True)
ERAS = [("1999", 0, 59), ("2013", 60, 119), ("2019", 120, 179), ("2026", 180, 239)]

def card(name, kind, **kw):
    p = os.path.join(OUT, name + ".png")
    hero_card(p, kw, kind)
    return p

if __name__ == "__main__":
    card("father", "father"); card("child", "child"); card("teen", "teen")
    card("mate1", "mate1"); card("mate2", "mate2", arm="chin")
    card("adult19", "adult", arm="chin"); card("adult26", "adult", arm="remote_low")
    for era, f0, f1 in ERAS:
        d = os.path.join(OUT, f"tv{era}"); os.makedirs(d, exist_ok=True)
        for i, f in enumerate(range(f0, f1 + 1)):
            t = 25.0 + f / FPS
            if era == "2026":
                im = clipmap.frame(round((5.9 + (t - 32.5)) * 25) / 25)
            else:
                im = tv.match(t, "MUN 0-1 BAY" if era == "1999" else ("MUN 1-0 ---" if era == "2013" else "MUN 0-0 ---"))
            im.convert("RGB").resize((960, 540)).save(os.path.join(d, f"{i + 1:04d}.png"))
    print("ok")
