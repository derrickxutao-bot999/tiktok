# Ball switch: animated transitions for the Barça / Argentina edit

Sample transitions for the Messi running edit (540×720, 60 fps). The edit loops every 250 frames: a Barça shot with the ball (frames 250k to 250k+57) hard-cuts to an Argentina shot (250k+58 to 250k+249). Each sample replaces those hard cuts with a transition led by the ball. The players are cut off the pitch and animated too.

Each sample is 7.2 s (source frames 190–620), 1080×1440, and shows four switches: two Argentina→Barça and two Barça→Argentina.

| File | Style | Ball | Players |
|---|---|---|---|
| `samples/sample-wipe.mp4` | **A · Ball Wipe** | Kicked diagonally across the frame. The next clip is revealed behind it along a glowing seam. | The old Messi gets clipped by the ball and flung off along its path. The new one sprints in behind it and skids into place. |
| `samples/sample-zoom.mp4` | **B · Through the Ball** | Struck from Messi's boot at the lens until it fills the screen. Then the camera flies through a hole in the ball. | The old player is sucked in after the ball. The new one bursts out of its centre and overshoots into position. |
| `samples/sample-impact.mp4` | **C · Impact Flash** | Smashed at the camera, followed by a white flash, a punch-in, a camera shake, RGB split and a shockwave ring. | Both players pop off the pitch as white-outlined stickers with a drop shadow. The new one slams down and settles. |
| `samples/sample-whip.mp4` | **D · Whip Pan** | Both clips stream sideways in a motion-blurred whip pan that chases the ball. | The players ride a faster layer than the pitch. The old one overtakes the pan and the new one skids in with an overshoot. |
| `samples/compare-all.mp4` | All four in a 2×2 grid | | |

`samples/strips-all.jpg` shows one Barça→Argentina switch frame by frame for each style, one row per style (A–D).

## How it works

- **Timing.** Inside each 24-frame (0.4 s) window, both clips play at half speed with frame blending. The total length doesn't change, so the original soundtrack stays in sync. A whoosh is added at each switch, plus a low thump for B and C.
- **Ball.** The ball isn't footage. It is drawn as a 3D truncated icosahedron (12 pentagons and 20 hexagons) with shading and spin, so it stays sharp at any size.
- **Players** (`people.py`). The grass is keyed out, and the largest remaining blob is taken as the player. The hole he leaves is filled with OpenCV inpainting to make a clean plate. The player can then be moved, scaled, rotated and outlined on top of either plate.

## Rendering

```
pip install opencv-python-headless numpy
python3 render.py SOURCE.mov samples            # all four + compare-all.mp4
python3 render.py SOURCE.mov samples wipe zoom  # selected styles
```

To apply a style to the full clip, change `FIRST` / `LAST` in `render.py` (the source is 1748 frames). Use `HALF` to change the transition length.
