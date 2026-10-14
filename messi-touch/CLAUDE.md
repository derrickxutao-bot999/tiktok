# The Touch: notes for future work

This is the base project for *The Touch* (最后一触), a 60-second vertical film made with Remotion (1080×1920, 60 fps).

- **Built:** Scenes 1 and 4. They are finished, reviewed twice, and rendered.
- **Not built:** Scenes 2 and 3 are slates. Their plan is in `README.md` under "Plan for Scenes 2 and 3".
- **Start here:** read `README.md` for the architecture and beats, and `STYLE.md` for the look.
- **Base snapshot:** git tag `messi-touch-base-v1`.

## Rules that keep the film correct

- **Pure functions.** Everything on screen is a pure function of the world clock `t`, the camera `shot` and the `variant`.
  - The engine in `src/lib/` has no React.
  - Never use `Math.random`, `Date` or `performance.now`; use `hash`, `hash2` or `prng` from `src/lib/math.ts`.
- **The camera never depends on the variant.** Camera functions (`src/lib/shots.ts`) take the scene frame only. That is what makes the match cut and the Scene 1 → Scene 4 freeze exact.
- **The touching toe follows an absolute path.** From `TOUCH.absStart` to `TOUCH_LAND_T` the left toe follows `src/lib/touch.ts` for every body. Do not make that path depend on the look or the scale.
- **The boot tip is the engine's toe point.** The drawn boot tip must be `pose.legs.L.toe`, and the ball must be drawn exactly at `project(ball)` with radius `BALL.r·k`. Tests guard both.
- **Prefixed SVG ids.** Every SVG `<defs>` id takes the component's `idPrefix`, because several `<TheTouch>` renders share a frame (the shuffle, the dissolve, the detail lens).
- **The look is Chronograph.** Light is the only material, there is one saturated colour per frame, and lines are hairlines. Do not reuse anything from the older films in this repository (`messi-storm`, `messi-toon`, `banana-39`, `forest-stadium`, `barcelona-1925`); the director rejected them as a source.

## How to work

- **Develop a component in its lab.** Each lab is a separate Remotion entry, so a half-edited file elsewhere cannot break it:
  `node tools/stills.mjs LabAthlete 0,20,33 --entry src/lab/athlete/entry.ts --sheet out/x.png`
- **Check scenes with stills.** `node tools/stills.mjs Scene4 280-310:5 --scale 0.4 --sheet out/s4.png`, then look at the PNG.
- **Before committing:** run `npm test` (engine, ball and boot guarantees) and `npm run typecheck`.
- **After any change near the cut:** run `npm run matchcut`.
- **Rendering:**
  - The full film takes about 11 minutes on 4 cores: `npm run render` writes `out/messi-touch.mp4`.
  - `out/` is git-ignored. Re-encode the 720p previews in `previews/` from it when the scenes change.
  - Keep the GL backend off. A software GL made renders about 8 times slower.
- **Fonts:** fetch them with `./fetch-fonts.sh` (they are git-ignored). A render stops if a font is missing.

## Open items (from the second review)

- **Scene 4 close-up (frames about 445–484):** feet still slip about 40 px against the dirt in the last frame before touchdown.
- **Seven era lights in his eye:** they read at 1080p but are small on a phone. To enlarge them, raise `eraR` in `src/components/athlete/Face.tsx`, or push the eye hold past 6500 px/m.
- **Seven-era plate:** the 2006 and 2004 bands show only legs, so their coloured year labels carry them.
- **Scenes 2 and 3:** to be built. Reuse the `rosario-dusk` world, `EtchedAthlete`, `GapMeasure`-style draw-on lines and the palette tokens. Scene 2 must open on Scene 1's white. Scene 3 must end on the hard cut into Scene 4's frozen plate (`src/scenes/Frozen.tsx`).
