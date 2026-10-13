# 巴萨 1925 · 沉默的六个月

A 28.5-second vertical animation (1080×1920, 30 fps) for Douyin. It tells the story of FC Barcelona's 1925 closure: on 14 June 1925 the Les Corts crowd whistled the Spanish anthem, and Primo de Rivera's dictatorship ordered the club to stop all activity for six months. Around ten thousand members kept paying their dues, and people who weren't fans sent money too.

Final video: `barcelona-1925.mp4`

| Time | Scene |
|---|---|
| 0–3.2 s | Hook: the year rolls back to 1925 |
| 3.2–8.2 s | Les Corts fills with fans; the anthem is drowned out by whistles (嘘) |
| 8.2–12.6 s | Night falls: a red 禁 seal, the gates drop and lock, the crowd drains away |
| 12.6–19 s | The calendar flips from June to December; gold seats light up as members keep paying, and the counter climbs to 10,000 |
| 19–23.4 s | Pull back to the Barcelona skyline (Sagrada Família, chimneys); gold sparks travel from the city's windows to the stadium |
| 23.4–28.5 s | A blaugrana stripe wipe, the gates open, the stands refill. *Més que un club* |

## Rebuild

```bash
./fetch-fonts.sh            # OFL fonts from Google Fonts -> fonts/
python3 soundtrack.py       # synthesized score + SFX -> out/soundtrack.wav (numpy)
node render.mjs             # headless Chromium + ffmpeg -> out/barcelona-1925.mp4
node render.mjs --stills 5,15   # quick PNG checks
```

To preview live, serve the folder and open `index.html`. Add `?t=12` to start at 12 s.
