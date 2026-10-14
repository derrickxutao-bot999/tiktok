# 最后一触 · The Touch

A 60-second vertical film (1080×1920, 60 fps, 3600 frames) built in [Remotion](https://www.remotion.dev/) as minimalist vector art. A 39-year-old No. 10 sprints along the touchline after a ball that is about to go out. Every step takes him back one era, until a boy in Rosario is running. His last touch match-cuts to that boy, who is still playing.

| Scene | Time | Frames | Status |
|---|---|---|---|
| 1 Pursuit and reverse flow | 0–12 s | 0–720 | **built** |
| 2 Rosario, the starting point | 12–25 s | 720–1500 | planned (slate) |
| 3 The great journey | 25–45 s | 1500–2700 | planned (slate) |
| 4 The fateful touch | 45–60 s | 2700–3600 | **built** |

Previews (720p): `previews/scene1-pursuit.mp4` and `previews/scene4-the-touch.mp4`. `previews/matchcut-frame3000.png` shows the cut frame as both variants side by side, with the engine's toe point (magenta) and ball outline (cyan). `npm run render` writes the full 1080p film to `out/messi-touch.mp4` in about 11 minutes on 4 cores.

The look is "Chronograph" (see `STYLE.md`). Light is the only material: figures are dark volumes drawn by a glowing contour, and the jersey is the one saturated colour at night, the sun at dusk. Lines are hairline-fine, and time is made visible in Marey-style echoes, footfall rings, a stopwatch countdown and a measured last centimetre.

## How the match cut is exact

Everything on screen is a pure function of three things:

- **`t`**: the world clock, in seconds from the moment the toe meets the ball.
- **`shot`**: the camera framing.
- **`variant`**: who is running.

`<TheTouch variant t shot />` (`src/components/TheTouch.tsx`) draws the whole picture from those three props.

- **The ball** (`src/lib/ball.ts`) depends only on `t`.
- **The camera** (`src/lib/shots.ts`) depends only on the scene frame, never on the variant.
- **The touching toe** (`src/lib/touch.ts`) follows an absolute path in world space from just before contact until the foot lands. The rest of the body hangs off that toe through two-bone inverse kinematics (`src/lib/rig.ts`). Smaller bodies keep their hips in reach because the pelvis is offset by `(1 − scale) × reach`.
- **The drawn boot** is built in the foot's own frame, so its tip is the engine's toe point. While the touch is in effect, its outline strokes are clipped at the contact plane.

As a result, the 39-year-old (scale 1) and the boy (scale 0.65) put the same toe, at the same angle, on the same ball, on the same pixels, at every shared `t`. Scene 4 switches `variant` on frame 300 of the scene (film frame 3000), 15 frames after contact on film frame 2985.

- **Identical across the cut:** the camera, the clock, the toe and the ball's outline (including its contact squash).
- **Becomes the boy's:** the body and his worn shoe, the ball's leather, the world and its light (ground, sky, shadows, the colour of the glows).

`MATCH_CUT_DISSOLVE` in `src/lib/timeline.ts` turns the hard cut into a cross-dissolve of up to 16 frames. Both variants then render with the same clock and camera, and the world's colours (vignette, readout, background) blend with the picture.

The same idea links the two ends of the film:

- Scene 1 freezes when the toe is exactly 1 cm from the ball (`T_FREEZE = −1 cm / closing speed`).
- Scene 4 opens on the identical frozen instant (`FREEZE_SHOT`, the same `t`) and the same plate of seven eras, which then settles on the 39-year-old.
- The frozen deck, its bands and grade live in `src/scenes/Frozen.tsx`, shared by both scenes.

`npm test` checks the following:

- the 1 cm gap;
- that era changes land on footfalls;
- that cadence only ever rises;
- that both scenes share the frozen camera and clock;
- that Scene 1's frozen boy and Scene 4's frozen veteran share the toe;
- that every era's toe position and angle are identical from the freeze through the cut;
- that a dissolve window stays on the shared toe path;
- that the ball is continuous;
- that feet plant rather than skid;
- that the camera never jerks outside its two deliberate breaks (the freeze and the eyeline cut);
- that every pose is finite and in reach;
- that the drawn boot tip is the engine toe for both variants;
- that the ball has the same outline and squash in both worlds and is cut flat by the ground;
- that the "OUT" countdown stays left of the band where social-video buttons sit.

`node tools/matchcut.mjs` renders the cut frame both ways with the engine's toe and ball markers, as visual proof.

## Scene 1: pursuit and reverse flow

- **Tracking shot.** One side-on tracking shot along the touchline at night. The camera is a real pinhole with perspective, so the mowing stripes swing and slide with parallax as it tracks. Their hairline seams glow brightest nearest the lens.
- **Framing.** The camera holds its framing through the era sweep, so his shrinking reads against a fixed frame. The ball rolls just ahead of him and he closes the gap in a late burst. Its dotted path runs to "OUT", and a stopwatch count ("OUT IN 1.0 s") ticks down.
- **Footfalls.** Every footfall rings out on the grass. He leaves a contour echo of himself in the era of that step, after Marey: the echoes fall behind like a long exposure.
- **Eras.** The era index is the formula from the brief, verbatim: `Math.floor(interpolate(frame, [180, 600], [0, eras.length − 1]))`. It changes on frames 250, 320, 390, 460, 530 and 600. The step phase is shaped so that each of those frames is a footfall: every step back in time is literally a step, with a time-slip glitch.
  - The order runs from 2026 Argentina 10 → Inter Miami pink 10 → Qatar 2022 → Barcelona 10 → long-haired Barcelona 19 → Barcelona 30 → a boy in Newell's Old Boys red and black.
  - Each change swaps the jersey's `<linearGradient>`, the hair path and the beard, and springs the body scale from 1 down to 0.65.
- **Cadence.** Step frequency rises from about 3.3 to about 6 steps per second: the boy's quick feet.
- **Freeze.** On frame 648 the toe is 1 cm from the ball and the picture freezes. A dimension line measures the gap, and a "DETAIL A · 10:1" lens magnifies it.
- **Shuffle.** The frozen frame is shuffled band by band through every era's version of the same instant. It locks into one figure built from seven eras, from the 39-year-old's head to the boy's feet, then burns to white on the last frame. Scene 2 opens on that white.

## Scene 4: the touch and eternity

| Frames (scene) | What happens |
|---|---|
| 0–26 | Hard cut back to the frozen plate. It settles on the 39-year-old, and the "1 cm" callout returns. |
| 26–168 | Time stays frozen. The camera pushes in to his eye and holds. One by one, seven reflections light up in his cornea in the era colours, from 2026 back to 1994: his career in his eye. |
| 168 | Eyeline cut to what he is looking at: his left boot and the ball, at ground level. |
| 214–285 | Time resumes in extreme slow motion. A chronograph readout counts `T −0.0083 s` to zero, and the dimension line counts the gap down to "0.0 cm". He taps the ball with the tip of his left boot (film frame 2985). |
| 300 | **The match cut** (film frame 3000): same camera, toe and ball. It is now the boy's broken, oversized shoe on the red dirt of Rosario at sunset. |
| 300–580 | Slow motion ramps back to real time. The close-up widens just enough to keep the boy's shoe and the parting ball together. |
| 380–900 | One long pull-back, carried on the ball, towards a sun cut by horizontal slits. The boy and the ball run in the middle of the frame. |
| 600–700 | The 39-year-old's touch is etched in the sky as glowing line art. The sun stands in for his ball. |
| 706–900 | Closing line: *His story is told. The boy is still playing.* |

## Structure

```
src/
  index.ts, Root.tsx        compositions: Film, Scene1-4, MatchCutProbe
  Film.tsx                  the four scenes in sequence
  MatchCutProbe.tsx         one Scene 4 frame in a chosen variant, with engine markers
  lib/                      the engine: pure functions, no React
    timeline.ts             fps, size, scene ranges, every beat both scenes share
    world.ts                metres, pinhole camera with lens shift, Shot <-> Camera
    ball.ts                 ball state as a function of t (roll, contact squash)
    touch.ts                contact geometry, T_FREEZE, the absolute toe path
    gait.ts                 step phase (footfalls on the era frames), pelvis path
    rig.ts                  pose solver: planted feet, swing paths, IK, arms, head
    clock.ts                scene frame -> t (Scene 4's freeze and slow motion), era index and scale springs
    shots.ts                camera work for Scenes 1 and 4 (straight-line pushes, eyeline cut)
    eras.ts                 the seven looks (kit, hair, beard, boots, scale), variants
    palette.ts              colours and light for both worlds, font stacks
    fonts.ts                local font loading (OFL fonts in public/fonts)
    math.ts                 vectors, easing, interpolation, smooth min, hashes
  components/
    TheTouch.tsx            the shared shot
    DetailInset.tsx         "DETAIL A · 10:1": the frozen gap magnified ten times
    Athlete.tsx (+athlete/) the vector athlete; AthleteShadow; EtchedAthlete (line art)
    Environment.tsx (+env/) Backdrop, Ground and Foreground for the stadium night and Rosario dusk
    Ball.tsx                match ball / old leather ball, shadow
    fx/                     FootfallPulses, BallPath, Glitch, FrameShuffle, WhiteOut, Grain,
                            Vignette, EraCaption, Subtitle, GapMeasure, ContactPulse
  scenes/
    Frozen.tsx              the frozen instant both scenes share (deck, bands, plate, grade)
    Scene1Pursuit.tsx       built
    Scene2Rosario.tsx       slate; see plan below
    Scene3Journey.tsx       slate; see plan below
    Scene4TheTouch.tsx      built
    Placeholder.tsx         the slate
  lab/                      separate entry points to develop components in isolation
  tests/                    engine.test.ts, ball.test.ts: the guarantees above
                            (components/athlete/*.test.ts check the boots, the toe clip, the eye point)
tools/
  stills.mjs                render chosen frames (one bundle) + contact sheet
  matchcut.mjs              visual proof of the match cut
```

### Plan for Scenes 2 and 3

- **Scene 2, Rosario.** `scenes/Scene2Rosario.tsx` reuses the `rosario-dusk` world and the boy's look.
  - New components:
    - `components/GiantShadows.tsx`: tall dark geometric defenders that press in on the small figure.
    - `components/TrailEffect.tsx`: SVG afterimages behind the dribble.
    - `components/CampNouGlow.tsx`: the stadium's outline drawn with `stroke-dashoffset` on the horizon.
  - The scene opens on Scene 1's white.
- **Scene 3, the great journey.** `scenes/Scene3Journey.tsx` is a montage on a rolling-forward camera.
  - New components:
    - `components/data/StatPulse.tsx`: the 91 goals of 2012.
    - `components/data/StarField.tsx`: eight Ballon d'Or stars.
    - `components/data/BootTally.tsx`: six European Golden Shoes.
    - `components/RainNight2014.tsx`: the cold palette.
    - `components/RibbonParticles.tsx`: gold ribbons over Lusail.
    - `components/TrophySilhouette.tsx`.
  - Every line drawing uses the draw-on technique already in `GapMeasure` and `EtchedAthlete`.
  - The scene ends on the hard cut into Scene 4's frozen frame.

## Build

```bash
npm install
./fetch-fonts.sh                          # OFL fonts -> public/fonts/
npm test                                  # engine guarantees
npm run typecheck
npm run studio                            # preview in the browser
node tools/stills.mjs Scene1 0,250,600,648 --sheet out/s1.png   # quick frames
npm run matchcut                          # out/matchcut/*.png
npm run render                            # out/messi-touch.mp4 (whole film)
npm run render:scene1 && npm run render:scene4
```

`remotion.config.ts` uses the preinstalled Chromium headless shell when it exists (cloud containers). Set `REMOTION_BROWSER` to use another one.

The film is pure SVG and CSS, so no GL backend is set. A software GL backend made renders about 8 times slower. Set `REMOTION_GL` if a future scene needs WebGL.

## Notes

- The brief lists "New York Red Bulls red and black" as the earliest jersey. The boyhood red-and-black club in Rosario is **Newell's Old Boys**, so the last era uses Newell's colours.
- Kits are colours only, with no crests, sponsors or brand marks. The figure is a stylised character, not a traced likeness.
- Remotion is free for individuals and small companies (up to 3 people). Larger companies need a [company licence](https://www.remotion.dev/license).
