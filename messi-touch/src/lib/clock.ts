// Scene clocks: scene-local frame -> world time t (seconds from contact).

import { spring, interpolate } from "remotion";
import { ERAS } from "./eras";
import { FPS, S1, S4 } from "./timeline";
import { T_FREEZE } from "./touch";
import { scene1FrameToT, tToScene1Frame } from "./gait";

// ---------------------------------------------------------------- Scene 1

/** World time of a Scene 1 frame. The picture holds on the frozen frame from S1.freeze on. */
export const scene1T = (frame: number) => (frame >= S1.freeze ? T_FREEZE : scene1FrameToT(frame));

/** The user's era mapping, verbatim: index steps every 70 frames between 180 and 600. */
export const eraIndexAt = (frame: number) =>
  Math.floor(
    interpolate(frame, [...S1.eraSweep], [0, ERAS.length - 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

/** Frames (Scene 1) at which the era changes: 250, 320, ..., 600. Each one is a footfall. */
export const ERA_SWITCH_FRAMES = ERAS.slice(1).map((_, i) =>
  Math.round(S1.eraSweep[0] + ((i + 1) * (S1.eraSweep[1] - S1.eraSweep[0])) / (ERAS.length - 1)),
);

const SCALE_SPRING = { damping: 13, stiffness: 170, mass: 0.7 } as const;

/** Body scale in Scene 1: each era change springs the body to that era's size (1 -> 0.65). */
export const eraScaleAtFrame = (frame: number) => {
  let s = ERAS[0].scale;
  ERA_SWITCH_FRAMES.forEach((f0, i) => {
    if (frame < f0) return;
    const k = spring({ frame: frame - f0, fps: FPS, config: SCALE_SPRING });
    s += (ERAS[i + 1].scale - ERAS[i].scale) * k;
  });
  return s;
};

/** Same, as a function of world time (the rig needs past scales to place planted feet). */
export const eraScaleAtT = (t: number) => eraScaleAtFrame(Math.min(tToScene1Frame(t), S1.freeze));

// ---------------------------------------------------------------- Scene 4

// Frozen until S4.resume. Then time creeps (speed rising as u^2) so that the
// last centimetre closes exactly on S4.touch; after contact the speed eases
// (smoothstep) back to real time by S4.realtime.
const A_FRAMES = S4.touch - S4.resume;
/** Playback speed at contact, world seconds per screen second. */
export const SPEED_AT_CONTACT = (-T_FREEZE * 3 * FPS) / A_FRAMES;
const B_FRAMES = S4.realtime - S4.touch;

const tAfterContact = (df: number) => {
  if (df <= 0) return 0;
  const u = Math.min(1, df / B_FRAMES);
  const ramp = (1 - SPEED_AT_CONTACT) * (B_FRAMES / FPS) * (u * u * u - (u * u * u * u) / 2);
  const tail = df > B_FRAMES ? (df - B_FRAMES) / FPS : 0;
  return (Math.min(df, B_FRAMES) / FPS) * SPEED_AT_CONTACT + ramp + tail;
};

/** World time of a Scene 4 frame (fractional frames allowed). */
export const scene4T = (frame: number) => {
  if (frame <= S4.resume) return T_FREEZE;
  if (frame <= S4.touch) {
    const u = (frame - S4.resume) / A_FRAMES;
    return T_FREEZE + (SPEED_AT_CONTACT * A_FRAMES * u * u * u) / (3 * FPS);
  }
  return tAfterContact(frame - S4.touch);
};

/** Playback speed (world s per screen s) of a Scene 4 frame, for motion blur and sound. */
export const scene4Speed = (frame: number) => (scene4T(frame + 0.5) - scene4T(frame - 0.5)) * FPS;
