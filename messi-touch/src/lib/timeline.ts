// Frame budget of the film (60 fps, vertical 1080x1920).
// Every number that two scenes must agree on lives here.

export const FPS = 60;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const FILM_FRAMES = 3600;

export const SCENES = {
  /** Scene 1: pursuit and reverse flow (farewell -> youth). 0-12 s. */
  pursuit: { from: 0, duration: 720 },
  /** Scene 2: Rosario, the starting point. 12-25 s. (planned) */
  rosario: { from: 720, duration: 780 },
  /** Scene 3: the great journey, the weight of glory. 25-45 s. (planned) */
  journey: { from: 1500, duration: 1200 },
  /** Scene 4: the fateful touch and eternity. 45-60 s. */
  touch: { from: 2700, duration: 900 },
} as const;

/** Scene 1 beats, in frames local to the scene. */
export const S1 = {
  /** The era index sweeps over this window: Math.floor(interpolate(frame, ERA_SWEEP, [0, eras.length - 1])). */
  eraSweep: [180, 600] as const,
  /** The camera holds its framing through the sweep, so the shrink reads; then it pushes in. */
  pushIn: [612, 648] as const,
  /** The toe is exactly 1 cm from the ball on this frame, and the picture freezes. */
  freeze: 648,
  /** On the held frame the last centimetre is measured, with a magnified detail... */
  measure: [650, 662] as const,
  /** ...then the frozen picture is shuffled through every era, locks into a plate, and burns to white
   *  at the scene's last frame (Scene 2 opens on that white). */
  shuffle: [686, 720] as const,
} as const;

/** Frames of cross-dissolve at the match cut; 0 = a hard cut on S4.matchCut. */
export const MATCH_CUT_DISSOLVE = 0;

/** Scene 4 beats, in frames local to the scene. */
export const S4 = {
  /** Hard cut back to the frozen plate; the strips settle on the 39-year-old. */
  unshuffle: [0, 26] as const,
  /** Time is frozen while the camera pushes in on his eye... */
  toEyes: [26, 92] as const,
  /** ...and holds there ("stories in his eyes"). */
  eyesHold: [92, 168] as const,
  /** Eyeline cut: from his eye to what it sees, the boot and the ball (still frozen). */
  toFoot: 168,
  /** Time starts again, in extreme slow motion. */
  resume: 214,
  /** Contact. Film frame 2985. */
  touch: 285,
  /** 15 frames after contact the 39-year-old becomes the boy. Film frame 3000. */
  matchCut: 300,
  /** Slow motion ramps back to real time by here (late, so the shoe and the ball stay together). */
  realtime: 580,
  /** The close-up widens just enough to keep the boy's shoe and the ball together... */
  holdShoe: [300, 380] as const,
  /** ...then one long, slow pull-back towards the sunset. */
  pullBack: [380, 900] as const,
  /** The legend is etched into the sky, then the closing line is written. */
  legend: [600, 700] as const,
  subtitle: [706, 900] as const,
} as const;

export const TOUCH_FILM_FRAME = SCENES.touch.from + S4.touch; // 2985
export const MATCH_CUT_FILM_FRAME = SCENES.touch.from + S4.matchCut; // 3000
