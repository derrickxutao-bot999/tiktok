// The touch, authored in world space.
//
// From TOE_ABS_START until the left foot lands again, the tip of the left boot
// follows one absolute path, the same for every body that wears it. Bodies of
// different sizes hang off that path through inverse kinematics. That is what
// makes the match cut exact: at any shared t, the toe, the shoe angle and the
// ball are identical whether the variant is the 39-year-old or the boy.

import { BALL, TOUCH_DIR, ballAt } from "./ball";
import { DEG, Vec2, fromAngle, v } from "./math";

export const TOUCH = {
  /** Closing speed of the toe on the ball, m/s (a gentle tap, not a kick). */
  vClose: 1.2,
  /** Gap on the frozen frame. */
  gapAtFreeze: 0.01,
  /** Before this, the swing is drawn relative to the hips; after it, the toe path is absolute. */
  absStart: -0.07,
  /** Foot pitch (rad, y up, negative = toe down) along the path. */
  pitchApproach: -24 * DEG,
  pitchContact: -15 * DEG,
  pitchLanding: -4 * DEG,
  /** Toe height when it lands (the boot tip rests just above the turf). */
  landToeY: 0.018,
  /** Follow-through: the toe keeps rising briefly, then is driven down. */
  followUp: 0.45,
  followDrag: 18,
} as const;

/** World time of the frozen frame: the toe is exactly 1 cm from the ball. */
export const T_FREEZE = -TOUCH.gapAtFreeze / TOUCH.vClose;

const dir = fromAngle(TOUCH_DIR);
/** The point on the ball the toe meets (behind and below the centre). */
export const contactPointAt = (t: number): Vec2 => {
  const b = ballAt(t);
  return v(b.x - dir.x * BALL.r, b.y - dir.y * BALL.r);
};
export const CONTACT_POINT = contactPointAt(0);

/** Distance from the toe tip to the ball surface. */
export const gapAt = (t: number) => {
  const b = ballAt(t);
  const p = toeAt(t, TOE_LAND_T_DEFAULT);
  return Math.hypot(p.x - b.x, p.y - b.y) - BALL.r;
};

const toeVelAtContactEnd = (): Vec2 => {
  const b = ballAt(BALL.contact);
  return v(b.vx, TOUCH.followUp);
};

/** Landing time used when no gait is supplied (the rig passes its own). */
export const TOE_LAND_T_DEFAULT = 0.052;

/**
 * Absolute toe tip position for t >= TOUCH.absStart.
 * `landT` is when the foot plants after the follow-through (the gait decides it).
 */
export const toeAt = (t: number, landT: number): Vec2 => {
  const tc = BALL.contact;
  if (t <= 0) {
    const b = ballAt(t);
    const back = BALL.r + TOUCH.vClose * -t;
    return v(b.x - dir.x * back, b.y - dir.y * back);
  }
  if (t <= tc) return contactPointAt(t);
  // Ballistic-looking follow-through that lands at landT.
  const p0 = contactPointAt(tc);
  const v0 = toeVelAtContactEnd();
  const tau = Math.min(t, landT) - tc;
  const T = landT - tc;
  // x: decelerating drag, y: chosen so that the toe reaches landToeY at landT.
  const x = p0.x + v0.x * tau - (TOUCH.followDrag * tau * tau) / 2;
  const g = (2 * (p0.y + v0.y * T - TOUCH.landToeY)) / (T * T);
  const y = p0.y + v0.y * tau - (g * tau * tau) / 2;
  return v(x, y);
};

/** Foot pitch along the authored path. */
export const toePitchAt = (t: number, landT: number): number => {
  const tc = BALL.contact;
  if (t <= TOUCH.absStart) return TOUCH.pitchApproach;
  if (t <= 0) {
    const u = (t - TOUCH.absStart) / -TOUCH.absStart;
    return TOUCH.pitchApproach + (TOUCH.pitchContact - TOUCH.pitchApproach) * u * (2 - u);
  }
  if (t <= tc) return TOUCH.pitchContact;
  const u = Math.min(1, (t - tc) / (landT - tc));
  const e = u * u * (3 - 2 * u);
  return TOUCH.pitchContact + (TOUCH.pitchLanding - TOUCH.pitchContact) * e;
};
