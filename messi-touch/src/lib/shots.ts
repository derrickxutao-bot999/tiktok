// Camera work. Each scene's camera is a pure function of its frame and never
// of the variant, so two variants rendered on the same frame share the
// camera exactly. FREEZE_SHOT is shared by the end of Scene 1 and the start
// of Scene 4.
//
// Moves are keyed. Between two keys the camera zooms (log scale) while the
// next key's look point travels in a straight line on screen to its mark,
// which reads as a deliberate push to a subject rather than a swing.

import { BALL, ballAt } from "./ball";
import { ERAS, VARIANT_LOOK } from "./eras";
import { pelvisXCanonical, RUN, TOUCH_LAND_T } from "./gait";
import { eyePoint } from "../components/athlete/head";
import { easeInOutSine, invLerp, clamp, smoothMin, smootherstep } from "./math";
import { solvePose } from "./rig";
import { S1, S4 } from "./timeline";
import { CONTACT_POINT, T_FREEZE, toeAt } from "./touch";
import { Shot, cameraFromShot, mixShots, project } from "./world";
import { scene1T, scene4T } from "./clock";

type Key = { f: number; shot: (frame: number) => Shot; ease?: (u: number) => number };

/** The same camera, described as framing the world point (x, y). */
const reanchor = (s: Shot, x: number, y: number): Shot => {
  const p = project(cameraFromShot(s), x, y);
  return { ...s, lookX: x, lookY: y, screenX: p.x, screenY: p.y };
};

const keyed = (frame: number, keys: readonly Key[]): Shot => {
  if (frame <= keys[0].f) return keys[0].shot(frame);
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (frame < b.f) {
      const u = (b.ease ?? easeInOutSine)(clamp(invLerp(a.f, b.f, frame)));
      const to = b.shot(frame);
      return mixShots(reanchor(a.shot(frame), to.lookX, to.lookY), to, u);
    }
  }
  return keys[keys.length - 1].shot(frame);
};

/** The frozen frame: the whole figure, the ball, and the 1 cm between them. */
export const FREEZE_SHOT: Shot = {
  lookX: CONTACT_POINT.x - 0.5,
  lookY: 0.5,
  screenX: 540,
  screenY: 1150,
  pxPerM: 540,
  height: 0.5,
};

const VETERAN_FROZEN = solvePose(T_FREEZE, VARIANT_LOOK["veteran-39"]);
// Where the drawn eye is (the head's geometry owns it).
const EYE = eyePoint(VETERAN_FROZEN);

/** Extreme close-up on his eye while time is frozen. */
export const EYES_SHOT: Shot = {
  lookX: EYE.x,
  lookY: EYE.y,
  screenX: 540,
  screenY: 900,
  pxPerM: 6500,
  height: EYE.y,
};

/** Ground-level close-up of the toe and the ball; the match cut happens inside it. */
export const CLOSEUP_SHOT: Shot = {
  lookX: CONTACT_POINT.x,
  lookY: 0.1,
  screenX: 540,
  screenY: 1120,
  pxPerM: 1750,
  height: 0.14,
};

// ---------------------------------------------------------------- Scene 1

/** Frames the runner's hips `lead` metres left of screen centre. */
const track = (lead: number, base: Omit<Shot, "lookX">) => (frame: number): Shot => ({
  ...base,
  lookX: pelvisXCanonical(scene1T(frame)) + lead,
});

// The runner sits about 330 px from the left with the ball ahead of him; the
// framing holds through the era sweep so his shrinking reads against it.
const S1_RUN = { lookY: 0.85, screenX: 540, screenY: 1150, pxPerM: 300, height: 1.05 } as const;
const S1_LEAD = 0.7;

const S1_KEYS: readonly Key[] = [
  { f: 0, shot: track(0.85, { lookY: 1.0, screenX: 540, screenY: 1120, pxPerM: 255, height: 1.35 }) },
  { f: 150, shot: track(S1_LEAD, S1_RUN) },
  { f: S1.pushIn[0], shot: track(S1_LEAD, S1_RUN), ease: (u) => u },
  // The push-in tracks the runner too, so it lands on FREEZE_SHOT exactly at the freeze.
  { f: S1.freeze, shot: track(FREEZE_SHOT.lookX - pelvisXCanonical(T_FREEZE), FREEZE_SHOT), ease: smootherstep01 },
];

function smootherstep01(u: number) {
  return smootherstep(0, 1, u);
}

export const scene1Shot = (frame: number): Shot => keyed(Math.min(frame, S1.freeze), S1_KEYS);

// ---------------------------------------------------------------- Scene 4

const KID_REACH = (1 - ERAS[ERAS.length - 1].scale) * RUN.reach;
/** The boy's hips once he runs on. */
const kidX = (frame: number) => pelvisXCanonical(scene4T(frame)) + KID_REACH;

const R = BALL.r;
/** Where the boy's touching foot came down after the tap. */
const SHOE_X = toeAt(TOUCH_LAND_T, TOUCH_LAND_T).x;

/**
 * A framing expressed on the ball (so that moves between these keys carry the
 * ball in a straight line on screen): the ball sits at (bx, by) on screen.
 */
const onBall = (frame: number, bx: number, by: number, pxPerM: number, height: number): Shot => {
  const b = ballAt(scene4T(frame));
  return { lookX: b.x, lookY: R, screenX: bx, screenY: by, pxPerM, height };
};

/** Ball's screen x that centres the span [x0, ball's far edge], clamped clear of the right-hand UI band. */
const centredBallX = (frame: number, x0: number, pxPerM: number) => {
  const b = ballAt(scene4T(frame)).x;
  const mid = (x0 + b + R) / 2;
  return smoothMin(540 + (b - mid) * pxPerM, 900 - R * pxPerM, 40);
};

/** The close-up after contact: the planted shoe and the ball, widening as they part. */
const shoeAndBall = (frame: number): Shot => {
  const k = 1500;
  return onBall(frame, centredBallX(frame, SHOE_X - 0.22, k), CLOSEUP_SHOT.screenY + (CLOSEUP_SHOT.lookY - R) * k * 0.7, k, 0.16);
};

/** The boy's legs and the ball, low. */
const legsAndBall = (frame: number): Shot => {
  const k = 860;
  return onBall(frame, centredBallX(frame, kidX(frame) - 0.35, k), 1260, k, 0.3);
};

/** The whole boy and the ball in the middle of the frame. */
const boyAndBall = (frame: number): Shot => {
  const k = 520;
  return onBall(frame, centredBallX(frame, kidX(frame) - 0.3, k), 1290 - R * k, k, 0.6);
};

/** The last frame: the boy and the ball together in the middle, the sunset above (feet near y 1266). */
const sunsetWide = (frame: number): Shot => {
  const k = 210;
  return onBall(frame, centredBallX(frame, kidX(frame) - 0.25, k), 1266 - R * k, k, 1.1);
};

const S4_KEYS: readonly Key[] = [
  { f: S4.unshuffle[1], shot: () => FREEZE_SHOT },
  { f: S4.toEyes[1], shot: () => EYES_SHOT },
  { f: S4.eyesHold[1] - 1, shot: () => ({ ...EYES_SHOT, pxPerM: EYES_SHOT.pxPerM * 1.08 }) },
];

const S4_FOOT_KEYS: readonly Key[] = [
  { f: S4.toFoot, shot: () => ({ ...CLOSEUP_SHOT, pxPerM: CLOSEUP_SHOT.pxPerM * 0.97 }) },
  { f: S4.touch, shot: () => CLOSEUP_SHOT, ease: (u) => 1 - (1 - u) * (1 - u) },
  { f: S4.holdShoe[0] + 40, shot: shoeAndBall },
  { f: S4.holdShoe[1] + 60, shot: legsAndBall },
  { f: 600, shot: boyAndBall },
  { f: S4.pullBack[1], shot: sunsetWide },
];

export const scene4Shot = (frame: number): Shot =>
  // The eyeline cut: from his eye straight to what he is looking at.
  frame < S4.toFoot ? keyed(frame, S4_KEYS) : keyed(frame, S4_FOOT_KEYS);
