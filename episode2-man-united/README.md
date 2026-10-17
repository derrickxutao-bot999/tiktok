# 第二集 · 再等一会儿 (Episode 2 · Just a Little Longer)

A Chinese-language animated documentary for TikTok (1080×1920, 24 fps, about 4 minutes).
It is about Manchester United fans: why they stay loyal through disappointment, and why loyalty can also mean demanding change.

- Final video: `out/ep2_man_united.mp4` (master) and `out/ep2_man_united_tiktok.mp4` (92 MB). Both are kept out of git because they contain Prime Video broadcast footage; the interview clip comes from Prime Video Sport UK's post of 13 Oct 2026 (see SOURCES.md).
- Facts, quotes and sources: [`SOURCES.md`](SOURCES.md). Fictional scenes are labelled 虚构 on screen.
- Music for Logic Pro: `music/score.mid` (one track per instrument, tempo 60 bpm so 1 beat = 1 second of picture), plus audio stems in `music/stems/`.

## Structure

| Time | Section |
|---|---|
| 0:00 | Martínez's words fill the screen. The camera pulls back to a TV in a 2026 flat. He switches it off and leaves. The room stays empty. |
| 0:26 | The door opens on 1999: a father and his small son. The same seat in 1999, 2013, 2019 and 2026 brings the loop back to the same interview. |
| 0:49 | Title: 再等一会儿 |
| 0:55 | 1999 final: Basler 6', "再等一会儿", +3, Sheringham, Solskjær, joy |
| 1:50 | 2013 Ferguson retires. The seasons pass with a few small lights. The 2024 FA Cup final. A phone call to his father. |
| 2:43 | 2005 takeover, Newton Heath's green and gold, 2010 scarves, 2 May 2021 |
| 3:21 | Red shirt, green-and-gold scarf. He comes back into the room. Martínez: "如果我们不说真话，什么都不会改变。" |
| 3:46 | 再等一会儿。但不是永远。 Then the sources card. |

## How it is made

- `src/chars.py`: SVG cut-out characters in a vintage editorial style (angular silhouettes, irregular ink outlines slightly out of register with flat fills). The protagonist keeps the same hair flick and nose from age 7 to 34.
- `src/blender_room.py`: Blender sets for the same room in four eras, rendered flat (matte emission shading, two-tone faces, Freestyle ink lines with noise). It outputs layered plates (background, sofa occluder, door-leaf angles) plus camera data, so the 2D figures sit correctly in 3D space. The opening pull-back is a full per-frame Blender render.
- `src/shots_room.py`, `src/shots_gfx.py`: shot code (room composites and SVG motion graphics).
- `src/script.py`, `src/tts.py`: narration (edge-tts, zh-CN voices). `src/timeline.py`: master timing.
- `src/music.py`: original score written note by note against the picture. The five-note motif for "再等一会儿" (A–B–D–E–C♯) hangs on C♯ and resolves to D only when the waiting pays off.
- `src/sound.py`: synthesised sound effects, ducking and mix. `src/render.py`: segments, subtitles and final encode.

Rebuild (needs Blender 4.2, ffmpeg, Python with cairosvg, numpy, scipy, tinysoundfont, edge-tts):

```
cd src
python3 tts.py
blender -b -P blender_room.py -- 2026 plates door      # also: 1999 plates door, 2013 plates, 2019 plates,
                                                       # 1999 plates medium, 2013 plates medium
python3 make_tv_seq.py 312
blender -b -P blender_room.py -- 2026 pullback $PWD/../build/tv/martinez1/0001.png $PWD/../build/tv/hero_seated.png 156 156
python3 music.py && python3 sound.py
python3 render.py shots && python3 render.py final
```
