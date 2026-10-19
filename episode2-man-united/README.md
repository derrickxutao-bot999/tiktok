# 第二集 · 再等一会儿 (Episode 2 · Just a Little Longer)

A Chinese-language animated documentary for TikTok (1080×1920, 24 fps, about 4 minutes).
It is about Manchester United fans: why they stay loyal through disappointment, and why loyalty can also mean demanding change.

- Final video: `out/ep2_man_united.mp4` (master) and `out/ep2_man_united_tiktok.mp4` (92 MB). Both are kept out of git because they contain Prime Video broadcast footage; the interview clip comes from Prime Video Sport UK's post of 13 Oct 2026 (see SOURCES.md).
- Facts, quotes and sources: [`SOURCES.md`](SOURCES.md). Fictional scenes are labelled 虚构 on screen.
- Music for Logic Pro: `music/score.mid` (one track per instrument, tempo 60 bpm so 1 beat = 1 second of picture), plus audio stems in `music/stems/`.

## Cut 2 (current): no narration, music only, 2:40

Cut 2 drops the voice-over. A 96 BPM score (beat = 15 frames, bar = 2.5 s) carries the film, every cut lands on a bar or beat, and short kinetic Chinese captions tell the story. The only voice is Martínez himself in the opening, de-noised. There are no ambient noise beds, just a TV click and a door.

- `src/edit2.py`: the cut list (with the transition into each shot), the captions and the Martínez audio edit
- `src/shots2.py`: cut-1 shots retimed to the beat, with parallax dollies (sofa and figures move more than the back wall), a push through the 1999 CRT into the 90:00 clock, shake and confetti on the winner
- Blender `orbit` mode: one continuous camera move around the seat. Each era renders its own slice of the same path, so on every bar the room changes from 1999 to 2013, 2019 and 2026 while the camera keeps moving and he stays in the same place on screen.
- `src/render2.py`: transitions (whip pan, ink blot, iris, flash, dip, dissolve) and kinetic captions
- `src/music2.py`: the score (piano, clarinet, harp, strings, bass, drums, timpani). `music/score2.mid` is at 96 BPM for Logic Pro.

| Time | Section |
|---|---|
| 0:00 | Martínez on the TV, with his own voice and subtitles. The camera pulls back, he clicks it off and leaves, and the room is empty. |
| 0:20 | The door opens on 1999. An orbit around the same seat changes era on every bar. Title. |
| 0:37 | 1999 final: Basler, "再等一会儿", a push through the CRT into 90:00 +3, the two corners, the joy, Ferguson |
| 1:07 | 2013, the seasons ticking on the beat, the 2024 FA Cup final, the phone call, the morning after |
| 1:40 | 2005 takeover, Newton Heath, the scarves, the fans, 2 May 2021, the red shirt and green-and-gold scarf |
| 2:12 | He comes back. 二十七年. 再等一会儿。但不是永远。 Then the sources. |

## How it is made

- `src/chars.py`: SVG cut-out characters in a vintage editorial style (angular silhouettes, irregular ink outlines slightly out of register with flat fills). The protagonist keeps the same hair flick and nose from age 7 to 34.
- `src/blender_room.py`: Blender sets for the same room in four eras, rendered flat (matte emission shading, two-tone faces, one clean Freestyle ink stroke per edge, no noise, so lines stay solid and still when the camera moves). It outputs layered plates (background, sofa occluder, door-leaf angles) plus camera data, so the 2D figures sit correctly in 3D space. The opening pull-back is a full per-frame Blender render.
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
