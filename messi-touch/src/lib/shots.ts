// Camera work. Each scene's camera is a pure function of its frame and never
// of the variant, so two variants rendered on the same frame share the
// camera exactly. FREEZE_SHOT is shared by the end of Scene 1 and the start
// of Scene 4.

import { ballAt } from "./ball";
import { ERAS } from "./eras";
import { pelvisXCanonical, RUN } from "./gait";
import { easeInOutSine, invLerp, clamp } from "./math";
import { solvePose } from "./rig";
import { S1, S4 } from "./timeline";
import { CONTACT_POINT, T_FREEZE } from "./touch";
import { Shot, mixShots } from "./world";
import { scene1T, scene4T } from "./clock";

type Key = { f: number; shot: (frame: number) => Shot; ease?: (u: number) => number };

const keyed = (frame: number, keys: readonly Key[]): Shot => {
  if (frame <= keys[0].f) return keys[0].shot(frame);
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (frame <= b.f) {
      const u = (b.ease ?? easeInOutSine)(clamp(invLerp(a.f, b.f, frame)));
      return mixShots(a.shot(frame), b.shot(frame), u);
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

const vetAtFreeze = solvePose(T_FREEZE, ERAS[0]);

/** Close on his eyes while time is frozen. */
export const EYES_SHOT: Shot = {
  lookX: vetAtFreeze.head.center.x + 0.03,
  lookY: vetAtFreeze.head.center.y - 0.01,
  screenX: 540,
  screenY: 860,
  pxPerM: 2300,
  height: vetAtFreeze.head.center.y,
};

/** Ground-level close-up of the toe and the ball; the match cut happens inside it. */
export const CLOSEUP_SHOT: Shot = {
  lookX: CONTACT_POINT.x + 0.05,
  lookY: 0.1,
  screenX: 540,
  screenY: 1120,
  pxPerM: 1750,
  height: 0.14,
};

// ---------------------------------------------------------------- Scene 1

const track = (lead: number, base: Omit<Shot, "lookX">) => (frame: number): Shot => ({
  ...base,
  lookX: pelvisXCanonical(scene1T(frame)) + lead,
});

const S1_KEYS: readonly Key[] = [
  { f: 0, shot: track(1.25, { lookY: 0.95, screenX: 540, screenY: 1160, pxPerM: 250, height: 1.5 }) },
  { f: 170, shot: track(1.15, { lookY: 0.85, screenX: 540, screenY: 1160, pxPerM: 300, height: 1.1 }) },
  { f: 560, shot: track(1.0, { lookY: 0.75, screenX: 540, screenY: 1170, pxPerM: 330, height: 0.9 }) },
  {
    f: 618,
    shot: track(0.9, { lookY: 0.6, screenX: 540, screenY: 1170, pxPerM: 400, height: 0.7 }),
  },
  // The push-in tracks the runner too, so it lands on FREEZE_SHOT exactly at the freeze.
  {
    f: S1.freeze,
    shot: track(FREEZE_SHOT.lookX - pelvisXCanonical(T_FREEZE), FREEZE_SHOT),
    ease: (u) => 1 - Math.pow(1 - u, 2.2),
  },
];

export const scene1Shot = (frame: number): Shot => keyed(Math.min(frame, S1.freeze), S1_KEYS);

// ---------------------------------------------------------------- Scene 4

/** The boy's hips once he runs on. */
const kidX = (frame: number) => {
  const t = scene4T(frame);
  return pelvisXCanonical(t) + (1 - ERAS[ERAS.length - 1].scale) * RUN.reach;
};

/** How far the action (the boy and the ball, averaged) has moved since contact. */
const actionMoved = (frame: number) => {
  const t = scene4T(frame);
  if (t <= 0) return 0;
  return (ballAt(t).x - ballAt(0).x + pelvisXCanonical(t) - pelvisXCanonical(0)) / 2;
};

/** The close-up drifts with the action once the ball is struck (identical for both variants). */
const closeupFollow = (zoom: number) => (frame: number): Shot => ({
  ...CLOSEUP_SHOT,
  lookX: CLOSEUP_SHOT.lookX + actionMoved(frame),
  pxPerM: CLOSEUP_SHOT.pxPerM * zoom,
});

const S4_KEYS: readonly Key[] = [
  { f: S4.unshuffle[1], shot: () => FREEZE_SHOT },
  { f: S4.toEyes[1], shot: () => EYES_SHOT },
  { f: S4.eyesHold[1], shot: () => ({ ...EYES_SHOT, pxPerM: EYES_SHOT.pxPerM * 1.06 }), ease: (u) => u },
  { f: S4.toFoot[1], shot: closeupFollow(1) },
  { f: S4.release[0], shot: closeupFollow(1.04), ease: (u) => u },
  {
    f: S4.release[1],
    shot: (frame) => ({ lookX: CLOSEUP_SHOT.lookX + actionMoved(frame) - 0.3, lookY: 0.55, screenX: 540, screenY: 1180, pxPerM: 440, height: 0.55 }),
  },
  {
    f: S4.pullBack[1],
    shot: (frame) => ({ lookX: kidX(frame) + 0.3, lookY: 1.6, screenX: 540, screenY: 1080, pxPerM: 210, height: 1.1 }),
    ease: (u) => 1 - Math.pow(1 - u, 1.6),
  },
];

export const scene4Shot = (frame: number): Shot => keyed(frame, S4_KEYS);
