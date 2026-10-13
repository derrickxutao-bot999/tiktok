# 动画版 · 奔跑

A 5.2-second vertical clip (1080×1920, 30 fps) that redraws a real football clip as cel-shaded animation, frame by frame. The player runs in the Barça kit, then in Argentina's, then in the Barça kit again with the ball.

Final video: `messi-toon.mp4`

Source: a 540×720 Douyin clip from 抖音号 mingze006611. The redraw covers that account's watermark, so credit it when you post.

## How it is made

`toon.py` processes each frame in this order:

1. **Watermark inpaint.** Only the pixels that stand out from the grass inside the two Douyin watermark boxes are masked, then filled with OpenCV's Telea inpainting.
2. **2× upscale.** Lanczos resampling takes the frame from 540×720 to 1080×1440.
3. **Flattening.** Two bilateral passes and one mean-shift pass remove grass texture and soften motion-blur smears. Edges are kept.
4. **9:16 extension.** The frame is extended to 1080×1920 with smooth, pitch-coloured fill above and below.
5. **Painted pitch.** A green/yellow-green mask finds the grass, which is replaced with its own heavily diffused colour under a fixed light falloff. The result looks like a flat painted background.
6. **Cel colour.** The player is quantised to one 14-colour palette (k-means in Lab). The palette is fitted once for the whole clip, so the colours don't flicker between frames. Colours are then brightened and saturated.
7. **Ink.** XDoG lines are drawn for interior detail, plus a bold outline wherever the player meets the pitch.

The original audio is kept unchanged.

## Rebuild

```bash
pip install opencv-python-headless numpy
python3 toon.py SOURCE.mov out          # -> out/frames/0001.png …
ffmpeg -framerate 30 -i out/frames/%04d.png -i SOURCE.mov -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -movflags +faststart \
  -c:a aac -b:a 192k -shortest messi-toon.mp4
```

To preview a few frames only, set `ONLY=1,60,145`. A full run takes about 8 minutes on one CPU, and most of that time is the mean-shift pass.

## Character reference

`character/` holds the cartoon player as a fixed reference, so the character looks the same in later edits or AI video tools:

| File | Pose (source frame) |
|---|---|
| `barca-stride.png` | Barça kit, full stride (145) |
| `barca-upright.png` | Barça kit, upright (16) |
| `argentina-stride.png` | Argentina kit, stride (53) |
| `argentina-reach.png` | Argentina kit, reaching (59) |
| `sheet.png` | All four side by side, labelled |

Each pose is a transparent PNG with a bold sticker outline. All four share one colour palette and use the same ink style as the animation. The ball is left out.

```bash
python3 char_sheet.py SOURCE.mov character     # rebuild, about 30 s
python3 score_frames.py out/src                 # rank frames by sharpness to pick new poses
```

To change the poses, edit `POSES` in `char_sheet.py`. The sharpness score is only a starting point, so check the frames by eye: motion blur on the legs makes some high-scoring frames poor references.
