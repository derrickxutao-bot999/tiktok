# 最后一触 · The Touch

A 60-second vertical film (1080×1920, 60 fps, 3600 frames) built in [Remotion](https://www.remotion.dev/) as minimalist vector art. A 39-year-old No. 10 sprints along the touchline after a ball that is about to go out. Every step takes him back one era, until a boy in Rosario is running. His last touch match-cuts to that boy, who is still playing.

| Scene | Time | Frames | Status |
|---|---|---|---|
| 1 Pursuit and reverse flow | 0–12 s | 0–720 | **built** |
| 2 Rosario, the starting point | 12–25 s | 720–1500 | planned (slate) |
| 3 The great journey | 25–45 s | 1500–2700 | planned (slate) |
| 4 The fateful touch | 45–60 s | 2700–3600 | **built** |

## How the match cut is exact

Everything on screen is a pure function of three things:

- **`t`**: the world clock, in seconds from the moment the toe meets the ball.
- **`shot`**: the camera framing.
- **`variant`**: who is running.

`<TheTouch variant t shot />` (`src/components/TheTouch.tsx`) draws the whole picture from those three props.

- **The ball** (`src/lib/ball.ts`) depends only on `t`.
- **The camera** (`src/lib/shots.ts`) depends only on the scene frame, never on the variant.
- **The touching toe** (`src/lib/touch.ts`) follows an absolute path in world space from just before contact until the foot lands. The rest of the body hangs off that toe through two-bone inverse kinematics (`src/lib/rig.ts`). Smaller bodies keep their hips in reach because the pelvis is offset by `(1 − scale) × reach`.

As a result, the 39-year-old (scale 1) and the boy (scale 0.65) put the same toe, at the same angle, on the same ball, on the same pixels, at every shared `t`. Scene 4 switches `variant` on frame 300 of the scene (film frame 3000), 15 frames after contact on film frame 2985, and nothing else changes. Only the shoe, the leg, the ground and the sky become the boy's. `MATCH_CUT_DISSOLVE` in `src/lib/timeline.ts` turns the hard cut into a cross-dissolve; that works because both variants share `t` and `shot`.

The same trick links the two ends of the film:

- Scene 1 freezes when the toe is exactly 1 cm from the ball (`T_FREEZE = −1 cm / closing speed`).
- Scene 4 opens on the identical frame (`FREEZE_SHOT`, the same `t`), now with the 39-year-old.

`src/tests/engine.test.ts` checks the following:

- the 1 cm gap;
- that era changes land on footfalls;
- that cadence rises;
- that both scenes share the frozen camera and clock;
- that every era's toe position and angle are identical from the freeze through the cut (the toe follows the same world-space path for every era);
- that the ball is continuous;
- that poses stay finite and in reach.

`node tools/matchcut.mjs` renders the cut frame both ways with the engine's toe and ball markers, as visual proof.

## Scene 1: pursuit and reverse flow

- **Tracking shot.** One side-on tracking shot along the touchline at night. The camera is a real pinhole with perspective, so the mowing stripes swing and slide with parallax as it tracks.
- **Footfalls.** Every footfall sends a ripple across the grass and flicks the picture.
- **Eras.** The era index is the formula from the brief, verbatim: `Math.floor(interpolate(frame, [180, 600], [0, eras.length − 1]))`. It changes on frames 250, 320, 390, 460, 530 and 600. The step phase is shaped so that each of those frames is a footfall: every step back in time is literally a step, with a stronger glitch.
  - The order runs from 2026 Argentina 10 → Inter Miami pink 10 → Qatar 2022 → Barcelona 10 → long-haired Barcelona 19 → Barcelona 30 → a boy in Newell's Old Boys red and black.
  - Each change swaps the jersey's `<linearGradient>`, the hair path and the beard, and springs the body scale from 1 down to 0.65.
- **Cadence.** Step frequency rises from about 3.3 to 4.7 steps per second.
- **Freeze.** On frame 660 the toe is 1 cm from the ball. The picture freezes and a dimension line measures the last centimetre. The frozen frame is then cut into strips that shuffle through every era's version of the same instant, and it burns to white by frame 712.

## Scene 4: the touch and eternity

| Frames (scene) | What happens |
|---|---|
| 0–26 | Hard cut back to the frozen frame. The strips settle on the 39-year-old. |
| 26–228 | Time stays frozen. The camera drifts up to his eyes, holds, then travels down to his left boot at ground level. The dimension line returns and counts down. |
| 214–285 | Time resumes in extreme slow motion (about 1/47 speed at contact). The last centimetre closes and he taps the ball with the tip of his left boot (film frame 2985). |
| 300 | **The match cut** (film frame 3000): same camera, toe and ball. It is now the boy's broken, oversized shoe on the red dirt of Rosario at sunset. |
| 300–470 | Slow motion ramps back to real time. The boy's foot lands and he runs on after the ball. |
| 470–900 | The close-up opens out and pulls back. The boy runs towards the sunset in the centre of the frame. The 39-year-old's touch is etched in the sky as glowing line art. Closing line: *His story is told. The boy is still playing.* |

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
    shots.ts                camera work for Scenes 1 and 4; FREEZE/EYES/CLOSEUP shots
    eras.ts                 the seven looks (kit, hair, beard, boots, scale), variants
    palette.ts              colours and light for both worlds, font stacks
    fonts.ts                local font loading (OFL fonts in public/fonts)
    math.ts                 vectors, easing, monotone cubic, hashes
  components/
    TheTouch.tsx            the shared shot
    Athlete.tsx (+athlete/) the vector athlete; AthleteShadow; EtchedAthlete (line art)
    Environment.tsx (+env/) Backdrop and Ground for the stadium night and Rosario dusk
    Ball.tsx                match ball / old leather ball, shadow
    fx/                     FootfallPulses, Glitch, FrameShuffle, WhiteOut, Grain,
                            Vignette, EraCaption, Subtitle, GapMeasure, ContactPulse
  scenes/
    Scene1Pursuit.tsx       built
    Scene2Rosario.tsx       slate; see plan below
    Scene3Journey.tsx       slate; see plan below
    Scene4TheTouch.tsx      built
    Placeholder.tsx         the slate
  lab/                      separate entry points to develop components in isolation
  tests/engine.test.ts      the guarantees above
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
node tools/stills.mjs Scene1 0,250,600,660 --sheet out/s1.png   # quick frames
npm run matchcut                          # out/matchcut/*.png
npm run render                            # out/messi-touch.mp4 (whole film)
npm run render:scene1 && npm run render:scene4
```

`remotion.config.ts` uses the preinstalled Chromium headless shell when it exists (cloud containers). Set `REMOTION_BROWSER` to use another one.

## Notes

- The brief lists "New York Red Bulls red and black" as the earliest jersey. The boyhood red-and-black club in Rosario is **Newell's Old Boys**, so the last era uses Newell's colours.
- Kits are colours only, with no crests, sponsors or brand marks. The figure is a stylised character, not a traced likeness.
- Remotion is free for individuals and small companies (up to 3 people). Larger companies need a [company licence](https://www.remotion.dev/license).
