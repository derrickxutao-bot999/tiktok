// The sprint, as functions of the world clock t (seconds from contact).
//
// Step phase n(t): every integer is a footfall; odd = left foot, even = right.
// Scene 1's era changes land exactly on footfalls (frames 250, 320, ... 600 are
// integer steps), so every step back in time is literally a step.

import { FPS, S1 } from "./timeline";
import { T_FREEZE, CONTACT_POINT } from "./touch";
import { BALL } from "./ball";
import { piecewiseLinear, smoothstep } from "./math";

/** Scene 1 frame at which contact would happen if the picture did not freeze (freeze + the last 1 cm). */
export const S1_CONTACT_FRAME = S1.freeze - T_FREEZE * FPS;
export const scene1FrameToT = (f: number) => (f - S1_CONTACT_FRAME) / FPS;
export const tToScene1Frame = (t: number) => t * FPS + S1_CONTACT_FRAME;

/** The left footfall that the touch replaces. */
export const TOUCH_FOOTFALL = 43;
/** Step phase at contact: three quarters of the way into the step before that footfall. */
export const TOUCH_STEP = 42.75;

// The cadence is constant within runs of equal era blocks and only ever steps
// up, on era-change footfalls (where the glitch and the new body hide the
// change): 10 steps over 0-180, then 4 + 4 steps (180-320), 5 + 5 + 5 + 5
// (320-600), and the boy's 4.75 to contact. Every era frame lands on a whole step.
const KNOT_FRAMES = [0, 180, 320, 600, S1_CONTACT_FRAME];
const KNOT_STEPS = [0, 10, 18, 38, TOUCH_STEP];

// After contact the boy keeps the cadence he arrived with (his quick small feet).
const phase = piecewiseLinear(KNOT_FRAMES.map(scene1FrameToT), KNOT_STEPS);

export const stepAt = (t: number) => phase.value(t);
export const cadenceAt = (t: number) => phase.slope(t);
export const timeOfStep = (n: number) => phase.inverse(n, -40, 40);

/** World time at which the left boot lands after the touch. */
export const TOUCH_LAND_T = timeOfStep(TOUCH_FOOTFALL);

export const isLeftStep = (n: number) => Math.abs(n % 2) === 1;

/** Canonical (scale 1) running parameters. */
export const RUN = {
  /** Pelvis speed at contact, m/s. He runs with the ball, then closes the gap in a late burst. */
  vContact: 6.6,
  burstTau: 1,
  /** After the touch the runner settles in behind the ball. */
  settle: 0.3,
  dropBack: 0.15,
  dropBackTau: 1.5,
  /** Pelvis height while sprinting and at the reach of the touch. */
  height: 0.87,
  bob: 0.022,
  touchHeight: 0.81,
  /** Hip-to-contact horizontal distance for the canonical body at contact. */
  reach: 0.72,
  /** Fraction of a step the foot is on the ground. */
  stance: 0.36,
  /** Ball of the foot lands this far ahead of the hips (canonical m). */
  landAhead: 0.3,
} as const;

const X0 = CONTACT_POINT.x - RUN.reach;

/** Canonical pelvis x. Variant bodies are offset from it (see rig). */
const cosH = Math.cos(BALL.heading);
const ballXBefore = (t: number) => (BALL.vIn * t - (BALL.decelIn * t * t) / 2) * cosH;
const burst = RUN.vContact - BALL.vIn * cosH;

export const pelvisXCanonical = (t: number) => {
  // Before contact: the ball's own pace plus a closing speed that grows towards the touch.
  if (t <= 0) return X0 + ballXBefore(t) + burst * RUN.burstTau * (Math.exp(t / RUN.burstTau) - 1);
  const tau = RUN.settle;
  const tb = RUN.dropBackTau;
  return (
    X0 +
    BALL.vOut * t -
    (BALL.decelOut * t * t) / 2 +
    (RUN.vContact - BALL.vOut) * tau * (1 - Math.exp(-t / tau)) -
    RUN.dropBack * (t - tb * (1 - Math.exp(-t / tb)))
  );
};

/** Weight of the touch reach (0 while running, 1 at contact). */
export const touchWeight = (t: number) => smoothstep(-0.22, -0.06, t) * (1 - smoothstep(0.03, 0.22, t));

/** Canonical pelvis height including the running bob and the dip of the reach. */
export const pelvisYCanonical = (t: number) => {
  const n = stepAt(t);
  const frac = n - Math.floor(n);
  const run = RUN.height + RUN.bob * Math.cos(2 * Math.PI * (frac - 0.7));
  const w = touchWeight(t);
  return run + (RUN.touchHeight - run) * w;
};
