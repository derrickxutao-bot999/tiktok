// The ball is a pure function of the world clock t (seconds from contact).
// It never depends on who is kicking it, so every shot that shares t shares
// the ball to the pixel.

import { D0 } from "./world";
import { DEG, smoothstep } from "./math";

export const BALL = {
  r: 0.11,
  /** Speed at contact on the way in, m/s, and its rolling deceleration. */
  vIn: 5.6,
  decelIn: 0.1,
  /** Heading on the way in: drifting from the pitch towards the touchline. */
  heading: 1.8 * DEG,
  /** After the tap it runs straight down the line. */
  vOut: 6.2,
  decelOut: 0.16,
  /** Duration of foot-ball contact, s. */
  contact: 0.008,
  /** Peak compression of the ball during contact. */
  squash: 0.08,
} as const;

export type BallState = {
  x: number;
  y: number;
  z: number;
  /** Rolling angle, radians, clockwise on screen when it rolls to the right. */
  roll: number;
  /** 0..1 compression along squashAngle. */
  squash: number;
  /** Direction of the compression (the contact normal), radians, y up. */
  squashAngle: number;
  vx: number;
};

const cosH = Math.cos(BALL.heading);
const sinH = Math.sin(BALL.heading);
const tc = BALL.contact;
const vInX = BALL.vIn * cosH;
/** x travelled during the contact window. */
const contactX = (t: number) => {
  const u = Math.min(1, Math.max(0, t / tc));
  return vInX * t + (BALL.vOut - vInX) * tc * (u * u * u - (u * u * u * u) / 2);
};
const xAfterContact = contactX(tc);
const tStop = BALL.vOut / BALL.decelOut;

/** Contact normal: the toe drives into the ball along this direction. */
export const TOUCH_DIR = 20 * DEG;

export const ballAt = (t: number): BallState => {
  let x: number;
  let z = D0;
  let vx: number;
  if (t < 0) {
    // Path length measured back from the contact point (negative before it).
    const s = BALL.vIn * t - (BALL.decelIn * t * t) / 2;
    x = s * cosH;
    z = D0 + s * sinH;
    vx = (BALL.vIn - BALL.decelIn * t) * cosH;
  } else if (t < tc) {
    x = contactX(t);
    vx = vInX + (BALL.vOut - vInX) * smoothstep(0, tc, t);
  } else {
    const tau = Math.min(t - tc, tStop);
    x = xAfterContact + BALL.vOut * tau - (BALL.decelOut * tau * tau) / 2;
    vx = Math.max(0, BALL.vOut - BALL.decelOut * tau);
  }
  const squash =
    t <= 0 ? 0 : t < tc * 2.2 ? BALL.squash * Math.sin((Math.PI * t) / (tc * 2.2)) : 0;
  return { x, y: BALL.r, z, roll: x / BALL.r, squash, squashAngle: TOUCH_DIR, vx };
};
