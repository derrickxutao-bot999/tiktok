# 梅西 · 风雨（风格测试）

A 15-second vertical style test (1080×1920, 30 fps) for a Messi episode, in the kinetic-typography style of the Su Shi "定风波" video: one small figure in a storm, text as scenery, hard hits on the beat.

- 0–3 s: thousands of characters fly in and slam into a "10"; "他输掉了三个决赛".
- 3–10.5 s: the characters fall as rain onto an empty pitch; three lost finals drop and shatter on the beat:
  - 2014 World Cup final, 0-1 (Germany, after extra time)
  - 2015 Copa América final, lost 1-4 on penalties (Chile)
  - 2016 Copa América final, lost 2-4 on penalties (Chile)
- 10.5–12 s: his 2016 penalty goes over the bar.
- 12–15 s: his words after that final, "对我来说，国家队生涯结束了" (he said the national team was over for him; he later returned).

Build: `python3 score.py` (synthesised test score), then `node render.mjs` → `out/messi-storm.mp4`; `node render.mjs --stills 1,5` for frames. Fonts come from `../banana-39/fonts` (run `../banana-39/fetch-fonts.sh`).

## Music candidates (CC BY 4.0, commercial use allowed with credit)

All by Kevin MacLeod (incompetech.com), licensed under Creative Commons: By Attribution 4.0 (https://creativecommons.org/licenses/by/4.0/). Credit line for the video description: `Music: "<title>" Kevin MacLeod (incompetech.com), CC BY 4.0`.

| Sample | Track | Why |
|---|---|---|
| `music/samples/A-Hero-Down.mp3` | Hero Down (from 2:00) | a lonely, quiet section that returns big: the fall and the comeback |
| `music/samples/B-Rynos-Theme.mp3` | Rynos Theme (from 0:18) | starts small, builds to a big drop |
| `music/samples/C-Tempting-Secrets.mp3` | Tempting Secrets (from 0:00) | opens on a big hit, then strings and a flute; choir later |
| `music/samples/D-Undaunted.mp3` | Undaunted (from 1:40) | big cinematic drums |

## Character

Messi is an ink silhouette, like the lone figure in the Su Shi video: one dark tone, and the posture
carries the likeness. Reference photos are used only for poses; nothing is traced.

- `silhouette.js` builds the figure from a joint skeleton with continuous anatomical contours
  (thigh-knee-calf-ankle, deltoid-elbow-forearm-wrist), sleeve and shorts hems, hands (open, fist,
  pointing, holding the ball), beard/no-beard heads, the shirt number and name, captain's armband
  and a rim light. Poses: `skyBack` (fingers to the sky, from behind), `backWalk`, `relaxed`,
  `shush`, `crossed`, `hips`, `sky`, `sideWalk`, `dribble`.
- `atmos.js` is the rain-night stadium: floodlight bloom, fog, layered rain, wet pitch with
  reflections and splashes, vignette and grain.
- `key.html` -> `key-frame.png`: the closing image. `eras.html` -> `eras-frame.png`: three eras
  (young, the shush with the ball, the captain). `poses.html` -> `poses-sheet.png`: all poses.

Render a frame: `node tools/shot.mjs key.html key-frame.png 1080 1920`.
