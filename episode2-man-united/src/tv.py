"""What plays on the television: the Martinez interview captions (documented
wording, see SOURCES.md), the 1999 broadcast glow, the 2013 farewell, etc.

Frames are 1920x1080 (16:9). The opening shot starts so close that only the
central ~30% column is visible, so all text lives in that column.
"""
import math
from style import C, svg_png, ease

TW, TH = 1920, 1080
CX = TW / 2

def _txt(x, y, s, size, fill, weight=400, family="Noto Serif SC", anchor="middle", op=1.0, ls=0):
    return (f'<text x="{x:.1f}" y="{y:.1f}" font-family="{family}" font-size="{size}" font-weight="{weight}" '
            f'fill="{fill}" fill-opacity="{op:.3f}" text-anchor="{anchor}" letter-spacing="{ls}">{s}</text>')

def _backdrop(op=1.0, tint="#20262C"):
    """Generic interview backdrop: a soft grid of blank boards, no logos."""
    out = [f'<rect width="{TW}" height="{TH}" fill="{tint}"/>']
    for r in range(6):
        for c in range(12):
            x = c * 170 - 60 + (r % 2) * 85
            y = r * 190 - 40
            out.append(f'<rect x="{x}" y="{y}" width="150" height="80" rx="4" fill="#2C343B" opacity="{op * .9:.2f}"/>')
    out.append(f'<rect x="{CX - 300}" y="0" width="600" height="{TH}" fill="#000" opacity="{.28 * op:.2f}"/>')
    return out

QUOTE1 = [  # (zh lines, en line, appear time)
    (["真的很差。", "真的很差。"], "Really poor. Really poor.", 0.9),
    (["有时候，这就是", "俱乐部现状的", "一面镜子。"], "Sometimes it's a reflection of the mirror|of how is our club at the moment", 2.9),
    (["我们期待", "高层做得更多。"], "We expect more from the top.", 5.2),
]
QUOTE2 = [
    (["如果我们不说真话，", "什么都不会改变。"], "If we don't say the truth,|nothing will change.", 0.6),
]

def martinez(t, which=1, hold_all=False):
    q = QUOTE1 if which == 1 else QUOTE2
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{TW}" height="{TH}">']
    out += _backdrop(min(1, t / 0.6) if not hold_all else 1)
    a0 = 1 if hold_all else ease((t - .3) / .6)
    out.append(_txt(CX, 130, "赛后采访 · 2026.10.13" if which == 1 else "接受采访 · 2026年10月", 26, "#C9C2B2", op=a0, ls=2))
    out.append(f'<rect x="{CX - 40}" y="150" width="80" height="3" fill="{C["red_l"]}" opacity="{a0:.2f}"/>')
    y = 250 if which == 1 else 420
    for zh, en, ts in q:
        a = 1 if hold_all else ease((t - ts) / .5)
        dy = 0 if hold_all else (1 - a) * 14
        for line in zh:
            out.append(_txt(CX, y + dy, line, 50, "#F1EADB", 600, op=a))
            y += 66
        for k, e in enumerate(en.split("|")):
            out.append(_txt(CX, y - 14 + dy + k * 24, e, 17, "#A9A293", op=a * .9))
        y += 48 + 24 * en.count("|")
    a = 1 if hold_all else ease((t - (6.4 if which == 1 else 1.6)) / .6)
    out.append(_txt(CX, TH - 150, "—— 利桑德罗·马丁内斯", 30, "#E2D9C6", op=a))
    out.append(_txt(CX, TH - 108, ("欧冠 · 马竞 2-0 曼联 · Prime Video" if which == 1 else "曼联后卫 · 2026年10月"), 21, "#A9A293", op=a, ls=1))
    out.append('</svg>')
    return svg_png("\n".join(out))

def glow(col="#7FA3B8", t=0.0, flicker=0.15):
    """Abstract broadcast light for wide shots where the picture is unreadable."""
    k = 1 + flicker * math.sin(t * 7.3) * math.sin(t * 2.1)
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{TW}" height="{TH}">',
           f'<rect width="{TW}" height="{TH}" fill="#2F5A3A"/>',
           f'<rect y="{TH * .55}" width="{TW}" height="{TH * .45}" fill="#3C6B45"/>',
           f'<rect width="{TW}" height="{TH * .25}" fill="#1D2B33"/>',
           f'<rect width="{TW}" height="{TH}" fill="{col}" opacity="{.12 * k:.2f}"/>', '</svg>']
    return svg_png("\n".join(out))

def match(t, score="MUN 0-1 BAY"):
    """Simplified broadcast: striped pitch in perspective, a few moving dots."""
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{TW}" height="{TH}">',
           f'<rect width="{TW}" height="{TH}" fill="#2C3A33"/>',
           f'<polygon points="0,300 {TW},300 {TW},{TH} 0,{TH}" fill="#3F6A45"/>']
    for i in range(9):
        x0 = -400 + i * 340
        out.append(f'<polygon points="{x0 + 100},300 {x0 + 270},300 {x0 * 1.6 + 500},{TH} {x0 * 1.6 + 210},{TH}" fill="#4A7850"/>')
    out.append(f'<line x1="0" y1="300" x2="{TW}" y2="300" stroke="#DCE6D4" stroke-width="4"/>')
    out.append(f'<rect width="{TW}" height="300" fill="#1F2629"/>')
    for k in range(40):
        out.append(f'<rect x="{k * 50 + 5}" y="{120 + (k % 3) * 40}" width="36" height="22" fill="#2E363A"/>')
    for k in range(10):
        x = 300 + k * 140 + 90 * math.sin(t * 0.7 + k * 1.9)
        y = 480 + (k % 4) * 120 + 40 * math.sin(t * 0.5 + k)
        c = "#C53A33" if k % 2 else "#E8E4DA"
        out.append(f'<rect x="{x:.0f}" y="{y:.0f}" width="16" height="34" fill="{c}"/>')
    out.append(f'<rect x="60" y="40" width="330" height="62" fill="#111"/>')
    out.append(_txt(225, 84, score, 34, "#F1EADB", 600, family="Noto Serif SC"))
    out.append('</svg>')
    return svg_png("\n".join(out))

def farewell(t):
    """Wide stadium shot with one small figure on the pitch, waving."""
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{TW}" height="{TH}">',
           f'<rect width="{TW}" height="{TH}" fill="#2A2E31"/>',
           f'<polygon points="0,560 {TW},560 {TW},{TH} 0,{TH}" fill="#45704A"/>']
    for r in range(8):
        out.append(f'<rect x="0" y="{120 + r * 52}" width="{TW}" height="30" fill="{["#7A1C21", "#5E1A1E"][r % 2]}"/>')
    wave = math.sin(t * 5) * 18
    out.append(f'<rect x="940" y="700" width="40" height="120" fill="#1B1B1B"/>')
    out.append(f'<circle cx="960" cy="680" r="22" fill="#D9B48C"/>')
    out.append(f'<line x1="975" y1="720" x2="{1020 + wave:.0f}" y2="640" stroke="#1B1B1B" stroke-width="14"/>')
    out.append(f'<rect x="0" y="{TH - 150}" width="{TW}" height="80" fill="#111" opacity=".85"/>')
    out.append(_txt(TW / 2, TH - 96, "弗格森宣布退休", 44, "#F1EADB", 600))
    out.append('</svg>')
    return svg_png("\n".join(out))
