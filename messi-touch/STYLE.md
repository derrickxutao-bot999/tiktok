# Chronograph: the look of *The Touch*

The film is about time running backwards and one instant that lasts forever. The look is built around that: **light is the only material, and time is something you can see.**

The lineage is Étienne-Jules Marey's chronophotographs of runners, long-exposure light painting, the hairlines of a stopwatch dial and an engineering drawing, and the restraint of a Swiss poster. It is all rendered as crisp, minimal vector art.

This look is new to this repository. Do not reuse the older films' assets or code. Ink-black cut-out silhouettes and rain-and-fog atmosphere are exactly what we are moving away from.

## Seven rules

1. **Light is the only material.** Backgrounds are near-black (night) or one smooth warm field (dusk). Things exist because light touches them: contours, rims, glints and glows.
   - No flat black cut-outs.
   - No cartoon outlines of uniform black.
   - No gradients for their own sake.
2. **One hero colour per frame.** At night the jersey is the only saturated thing on screen; it glows like stained glass lit from inside. At dusk the sun is the hero, and the jersey answers it.
3. **Hairline precision.** Lines are 1–2.5 px at 1080 wide.
   - Geometry is exact: concentric, perspective-true, measured.
   - Use ticks, rulers, dimension lines and small mono annotations sparingly, like the marks on a chronograph bezel.
4. **Time made visible.**
   - Motion leaves contour echoes, after Marey.
   - Footfalls ring out as concentric ellipses of light on the ground.
   - The ball's fate is drawn as a dotted path.
   - The frozen instant is measured to the centimetre.
5. **Negative space is the frame.**
   - The vertical canvas is mostly air. The upper half is atmosphere and a few words of type.
   - Never fill space just because it is there.
6. **Soft only where there is light.** Bloom and glow belong to light sources, contours and the touchline. Everything else is razor sharp.
7. **Film, not screen.** Bind every frame with fine grain, gentle halation on highlights and a vignette that draws the eye to the action.

## The figure of light (athlete)

- **Body.** A dark volume one or two steps lighter than the background, never pure black. At night it is deep indigo; at dusk it is deep burnt umber. It is shaded with a soft gradient towards the light.
- **Contour.** One continuous luminous outline around the whole silhouette.
  - To get it, stroke every part first in the contour colour, then fill every part on top, so only the outer edge survives.
  - The contour is brighter on the side facing the light and dims away from it. It carries one soft glow.
  - Interior hairlines (fainter) separate the near limbs from the body.
- **Jersey.** This is the colour of the film: a luminous gradient patch in the kit's pattern (stripes, halves or solid), saturated and slightly emissive.
  - It has a soft inner glow, a thin bright edge, and light falling off towards the shadow side.
  - The number is a crisp shape in condensed type.
- **Shorts and socks.** Kit colours pulled down towards the body tone, so the shirt stays the hero.
- **Boots.**
  - Modern boots are a dark volume with an accent hairline glow.
  - The boy's worn shoes are warm leather: scuffed, oversized, with stitches and a sole peeling away at the toe.
- **Head.** A refined profile line.
  - The eye is a single point of light. "Stories in his eyes": at 2300 px/m it must be the most beautiful thing in the frame.
  - Hair and beard are graphic shapes with their own contour. Grey shows as a few silver hairlines.

## Chronophotographic echoes

At every footfall in Scene 1, the figure leaves a contour-only echo of itself on the pitch, in the era it wore at that instant. Each echo is held in world space and fades over about a second. As the camera tracks, the echoes stream away behind him: a record of the career he is unwinding. They are drawn with `EtchedAthlete`.

## Worlds

### Stadium night (the farewell)

- **Grass.** Velvet bands in two very close dark greens. They are the mowing stripes in true perspective.
  - Every band boundary is a hairline of slightly lighter green converging on the vanishing point.
  - The lines swing and slide with parallax as the camera tracks. These are the "rolling grass lines".
- **Touchline.** A crisp white line with bloom: the glowing border of the world.
  - A ruler runs along its outer side: a tick every metre, and a tiny mono label every five metres.
- **Beyond the line.** A narrow strip, then the advertising boards reduced to a single luminous band with slow accent pulses. No words.
- **The stadium.** An abstraction.
  - A horizon band of out-of-focus bokeh discs: crowd lights in mixed sizes, mostly cool with a few warm.
  - A hairline arc for the roof edge.
  - Four floodlight stars high up, with long horizontal anamorphic streaks.
  - Deep, mostly empty sky.

### Rosario dusk (the beginning)

- **Sky.** One smooth gradient: deep violet at the top, through rose, to amber at the horizon.
- **Sun.** A large disc low on the horizon, right of centre. Its lower part is cut by horizontal slits, a retro poster sunset and the signature graphic of this world.
- **Distance.** Flat layers in atmospheric perspective: low houses, a water tank, eucalyptus, power lines as drooping hairline catenaries, and a crumbling low wall.
- **Ground.** Terracotta in true perspective, with hairline ruts converging on the vanishing point, scattered pebbles, and a hand-chalked touchline.
- **Air.** Floating dust motes catch the light as points.

## Type

- **Era captions.** In the upper third: a tiny mono line (`ERA 03 / 07`), a tall condensed year in light weight with wide tracking, then the club and number in condensed. A hairline rule draws on. They are calm, sparse and premium.
- **Measurements.** Engineering-drawing callouts in mono.
- **Closing line.** A refined serif italic, centred, words easing in one at a time.

## Motion

- Springs are for growth and change (body scale, captions). Ease-in-out is for camera moves. Linear motion is only for physics.
- Glitches are precise "time slips": slit displacement and a restrained chromatic fringe. No noisy junk.
- Nothing moves without a reason.

## Palette

The palette is in `src/lib/palette.ts`. Use its tokens rather than inventing new colours. Each era has an `accent` in `src/lib/eras.ts` for pulses, echoes and captions.
