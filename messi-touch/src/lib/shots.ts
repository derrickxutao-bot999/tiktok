// Camera work. Each scene's camera is a pure function of its frame and never
// of the variant, so two variants rendered on the same frame share the
// camera exactly. FREEZE_SHOT is shared by the end of Scene 1 and the start
// of Scene 4.
//
// Moves are keyed. Between two keys the camera zooms (log scale) while the
// next key's look point travels in a straight line on screen to its mark,
// which reads as a deliberate push to a subject rather than a swing.

import { ballAt } from "./ball";
import { ERAS, VARIANT_LOOK } from "./eras";
import { pelvisXCanonical, RUN } from "./gait";
import { eyePoint } from "../components/athlete/head";
import { easeInOutSine, invLerp, clamp, smootherstep } from "./math";
import { solvePose } from "./rig";
import { S1, S4 } from "./timeline";
import { CONTACT_POINT, T_FREEZE } from "./touch";
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

/** How far the action (the boy and the ball, averaged) has moved since contact. */
const actionMoved = (frame: number) => {
  const t = scene4T(frame);
  if (t <= 0) return 0;
  return (ballAt(t).x - ballAt(0).x + pelvisXCanonical(t) - pelvisXCanonical(0)) / 2;
};

/** Midway between the boy and the ball. */
const pairX = (frame: number) => (kidX(frame) + ballAt(scene4T(frame)).x) / 2;

/**
 * The close-up eases into following the action after contact (identical for
 * both variants), then hands its aim over to the boy-and-ball pair that the
 * pull-back frames, so neither ever leaves the picture.
 */
const closeupFollow = (zoom: number) => (frame: number): Shot => {
  const follow = CLOSEUP_SHOT.lookX + actionMoved(frame) * smootherstep(S4.touch, S4.touch + 60, frame);
  return {
    ...CLOSEUP_SHOT,
    lookX: follow + (pairX(frame) - follow) * smootherstep(S4.holdShoe[0] + 30, S4.pullBack[0] + 120, frame),
    pxPerM: CLOSEUP_SHOT.pxPerM * zoom,
  };
};

/** The last frame: the boy and the ball together in the middle, the sunset above. */
const sunsetWide = (frame: number): Shot => ({
  lookX: pairX(frame),
  lookY: 1.6,
  screenX: 540,
  screenY: 930,
  pxPerM: 210,
  height: 1.1,
});

const S4_KEYS: readonly Key[] = [
  { f: S4.unshuffle[1], shot: () => FREEZE_SHOT },
  { f: S4.toEyes[1], shot: () => EYES_SHOT },
  { f: S4.eyesHold[1] - 1, shot: () => ({ ...EYES_SHOT, pxPerM: EYES_SHOT.pxPerM * 1.08 }) },
];

const S4_FOOT_KEYS: readonly Key[] = [
  { f: S4.toFoot, shot: () => ({ ...CLOSEUP_SHOT, pxPerM: CLOSEUP_SHOT.pxPerM * 0.97 }) },
  { f: S4.touch, shot: closeupFollow(1), ease: (u) => 1 - (1 - u) * (1 - u) },
  { f: S4.holdShoe[1], shot: closeupFollow(1.04) },
  { f: S4.pullBack[1], shot: sunsetWide },
];

export const scene4Shot = (frame: number): Shot =>
  // The eyeline cut: from his eye straight to what he is looking at.
  frame < S4.toFoot ? keyed(frame, S4_KEYS) : keyed(frame, S4_FOOT_KEYS);
