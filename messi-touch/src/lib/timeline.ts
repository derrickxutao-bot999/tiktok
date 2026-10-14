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
  /** The toe is exactly 1 cm from the ball on this frame, and the picture freezes. */
  freeze: 660,
  /** The frozen picture is sliced and shuffled through the eras... */
  shuffle: [664, 708] as const,
  /** ...and is fully white from here to the end of the scene. */
  white: 712,
} as const;

/** Scene 4 beats, in frames local to the scene. */
export const S4 = {
  /** Hard cut back to the frozen frame; the shuffled strips settle on the 39-year-old. */
  unshuffle: [0, 26] as const,
  /** Time is frozen while the camera drifts up to his eyes... */
  toEyes: [26, 120] as const,
  /** ...holds there... */
  eyesHold: [120, 150] as const,
  /** ...and travels down to the foot and the ball. */
  toFoot: [150, 228] as const,
  /** Time starts again, in extreme slow motion. */
  resume: 214,
  /** Contact. Film frame 2985. */
  touch: 285,
  /** 15 frames after contact the 39-year-old becomes the boy. Film frame 3000. */
  matchCut: 300,
  /** Slow motion ramps back to real time by here. */
  realtime: 470,
  /** The close-up opens out and follows the boy. */
  release: [330, 600] as const,
  /** The camera pulls back towards the sunset. */
  pullBack: [600, 900] as const,
  subtitle: [636, 900] as const,
} as const;

export const TOUCH_FILM_FRAME = SCENES.touch.from + S4.touch; // 2985
export const MATCH_CUT_FILM_FRAME = SCENES.touch.from + S4.matchCut; // 3000
