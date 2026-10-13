# 森林里的球场 · 足球与城市 第二集

A 59-second vertical film (1080×1920, 30 fps) for Douyin about 1. FC Union Berlin and the fans who kept their club alive. It runs in three acts, **血 · 汗 · 歌** (blood, sweat, song).

Final video: `forest-stadium.mp4`

## Story and timeline

| Time | Shot | What happens |
|---|---|---|
| 0–5 s | Candle | A single candle is lit; a rack focus reveals thousands more behind it. Hook: 有一座球场，是球迷用血和汗守住的 |
| 4.5–10 s | Reveal | The stadium in the snowy forest, every terrace holding a candle. Title 森林里的球场. The colour drains to cold. |
| 9.6–20.3 s | I · 血 · 2004 | A brush-stroke chapter card. A queue in a cold street where only the red scarves keep their colour. Blood drops turn a dark pool red until it fills the frame. |
| 20–35 s | II · 汗 · 2008 | The red becomes a low sun. The crumbling terrace at golden hour, then a time-lapse of volunteers rebuilding it row by row (2,300+ volunteers, 140,000 hours). The roof goes on and the flag goes up. |
| 35–47 s | III · 歌 · 2003– | 2003: 89 fans climb the gate and sing on the old snowy steps. Today: candles spread from 89 to 28,500 voices. |
| 47–52 s | Floodlights | The masts ignite, scarves go up, the EISERN UNION banner appears. 2019 Bundesliga, 2023 Champions League. |
| 51.6–59 s | Exterior | The stadium glowing in the forest. 有的球场，是用钱买来的 / 这一座，是球迷亲手建起来的. End card. |

### Facts and sources

- **2004, "Bluten für Union":** with the club in financial trouble and its licence at risk, fans gave blood and donated the money they were paid to the club.
- **June 2008 to July 2009:** more than 2,300 volunteers gave 140,000 working hours to renovate and roof the standing terraces. Source: the club's stadium page.
- **Carols:** in 2003, 89 fans climbed the gates at night and sang carols on the empty terraces. The event became official in 2005 and is held every 23 December, with about 28,500 people, candles, a brass band and *Stille Nacht*. Source: the club's history of the event and the Berliner Zeitung.
- **Recent results:** first Bundesliga promotion in 2019; Champions League in 2023–24.

## How it is made

- **Pictures:** `js/*.js` draws every shot on a 2D canvas, built from parallax layers, silhouettes, particles, snow and bokeh.
- **Colour grading:** `js/grade.js` grades every frame in WebGL2. The chain is bloom (13-tap mip chain) → halation → white balance and exposure → filmic shoulder → selective saturation (Act I keeps only the reds) → contrast → split toning → lift/gamma/gain → vignette → film grain. Each shot has its own look:
  - teal-amber candlelight
  - cold bleach-bypass
  - golden hour
  - moonlit blue
  - floodlight

  Looks blend across dissolves (`LOOKS` in `js/main.js`).
- **Subtitles:** bilingual subtitles are drawn on an ungraded overlay so they stay clean.
- **Music:** `soundtrack.py` is an orchestral score cued to the picture. It uses real instrument recordings from the [University of Iowa Musical Instrument Samples](https://theremin.music.uiowa.edu/MIS.html), which are "freely available … for any projects, without restrictions". Instruments include string sections, horns, trombones, trumpet, piano, glockenspiel, vibraphone, cymbals and tam-tams. The choir, sub-hits and sound effects are synthesised in `audio/synth.py`. The theme is *Stille Nacht* (1818, public domain).

### Music cues

- **Opening:** a glockenspiel music box.
- **Act I:** a tam-tam on each brush stroke, a solo cello lament over the queue, and a piano note on every blood drop.
- **Sun hit:** the music lands on F major as the red pool becomes the sun.
- **Time-lapse:** a pizzicato work song.
- **Act III:** a brass-band carol under the choir.
- **Floodlights:** a fanfare as the masts ignite.
- **Ending:** the last phrase of *Stille Nacht*.

## Rebuild

```bash
./fetch-fonts.sh                    # OFL fonts -> fonts/
python3 audio/fetch_samples.py      # ~1 GB of instrument samples -> audio/samples/ (once)
python3 soundtrack.py               # -> out/soundtrack.wav
ln -s /path/to/node_modules .       # needs playwright; Chromium with WebGL (SwiftShader is fine)
node render.mjs --workers 4         # -> out/forest-stadium.mp4 (~54 MB, for upload), out/master.mp4 (CRF 17), out/forest-stadium-preview.mp4 (<30 MB)
node render.mjs --stills 6.5,28,46  # quick PNG checks
```

To preview live, serve the folder and open `index.html`. Add `?t=41` to start at 41 s.

`narration.txt` and `subtitles.*.srt` contain the narration with timecodes, for an optional AI voiceover in 剪映 (CapCut) or for platform captions.
