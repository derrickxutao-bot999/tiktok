// Pose solver: world clock + body -> joint positions in world metres.
//
// The pelvis follows the canonical run, offset so that smaller bodies stay
// in reach of the same contact point:  X_s(t) = X_c(t) + (1 - s) * reach.
// Planted feet are fixed in the world; swinging feet follow a path drawn
// relative to the hips; and the left foot during the touch follows the
// absolute toe path from touch.ts. Legs are solved by two-bone IK.

import { Look } from "./eras";
import {
  RUN,
  TOUCH_FOOTFALL,
  TOUCH_LAND_T,
  isLeftStep,
  pelvisXCanonical,
  pelvisYCanonical,
  stepAt,
  timeOfStep,
  touchWeight,
} from "./gait";
import { DEG, Vec2, add, catmullRom, clamp, dist, lerp, mul, norm, rot, smoothstep, sub, v } from "./math";
import { TOUCH, toeAt, toePitchAt } from "./touch";

/** Canonical body, 1.70 m. Lengths in metres. */
export const BODY = {
  thigh: 0.43,
  shin: 0.42,
  torso: 0.5,
  neck: 0.07,
  headR: 0.112,
  upperArm: 0.29,
  forearm: 0.25,
  hand: 0.085,
  /** Shoulder joint sits this far below the neck base, along the torso. */
  shoulderDrop: 0.06,
  /** Foot, in the foot frame (origin at the ankle, +x towards the toe, y up). */
  toeTip: v(0.19, -0.062),
  footBall: v(0.13, -0.08),
  heel: v(-0.065, -0.06),
} as const;

export type LegPose = {
  hip: Vec2;
  knee: Vec2;
  ankle: Vec2;
  toe: Vec2;
  heel: Vec2;
  /** Foot pitch, radians, y up; negative = toe down. */
  pitch: number;
  planted: boolean;
  /** How far the IK had to pull the ankle in (0 = target reached). */
  reachError: number;
};

export type ArmPose = { shoulder: Vec2; elbow: Vec2; wrist: Vec2; hand: Vec2 };

export type Pose = {
  t: number;
  step: number;
  scale: number;
  look: Look;
  pelvis: Vec2;
  neck: Vec2;
  /** Torso lean from vertical, radians, positive = forward. */
  lean: number;
  head: { center: Vec2; radius: number; pitch: number };
  /** L is the near side (faces the camera); R is the far side. */
  legs: { L: LegPose; R: LegPose };
  arms: { L: ArmPose; R: ArmPose };
  /** Body dimensions for this frame, world metres. */
  dims: { thigh: number; shin: number; upperArm: number; forearm: number; foot: number; torso: number; headR: number };
  /** 0..1 how much of the touch is in effect. */
  touch: number;
};

export type ScaleAt = (t: number) => number;

const pelvisAt = (t: number, s: number): Vec2 =>
  v(pelvisXCanonical(t) + (1 - s) * RUN.reach, s * pelvisYCanonical(t));

/** Point of the foot (local foot frame) in the world, given the ankle and pitch. */
const footPoint = (ankle: Vec2, pitch: number, local: Vec2, fs: number) => add(ankle, mul(rot(local, pitch), fs));
const ankleFromPoint = (p: Vec2, pitch: number, local: Vec2, fs: number) => sub(p, mul(rot(local, pitch), fs));

/** Two-bone IK. The knee bends forward (towards +x). */
export const solveTwoBone = (root: Vec2, target: Vec2, a: number, b: number, bendSign = 1) => {
  const d = dist(root, target);
  const dd = clamp(d, Math.abs(a - b) + 1e-4, a + b - 1e-4);
  const dir = norm(sub(target, root));
  const cosA = clamp((a * a + dd * dd - b * b) / (2 * a * dd), -1, 1);
  const ang = Math.acos(cosA) * bendSign;
  const mid = add(root, mul(rot(dir, ang), a));
  const end = add(root, mul(dir, dd));
  return { mid, end, error: d - dd };
};

type FootTarget = { ankle: Vec2; pitch: number; planted: boolean };

const STANCE_PITCH_MID = 0;
const STANCE_PITCH_OFF = -50 * DEG;
const LAND_PITCH = -6 * DEG;

/** Ball-of-foot pivot of footfall n (world). */
const pivotOf = (n: number, scaleAt: ScaleAt, fs: number): Vec2 => {
  if (n === TOUCH_FOOTFALL) {
    const toe = toeAt(TOUCH_LAND_T, TOUCH_LAND_T);
    const ankle = ankleFromPoint(toe, TOUCH.pitchLanding, BODY.toeTip, fs);
    return footPoint(ankle, TOUCH.pitchLanding, BODY.footBall, fs);
  }
  const tn = timeOfStep(n);
  const s = scaleAt(tn);
  return v(pelvisAt(tn, s).x + s * RUN.landAhead, 0);
};

const landPitchOf = (n: number) => (n === TOUCH_FOOTFALL ? TOUCH.pitchLanding : LAND_PITCH);

const stanceTarget = (n: number, u: number, scaleAt: ScaleAt, fs: number): FootTarget => {
  const p = pivotOf(n, scaleAt, fs);
  const b0 = landPitchOf(n);
  const pitch =
    u < 0.35 ? lerp(b0, STANCE_PITCH_MID, smoothstep(0, 0.35, u)) : lerp(STANCE_PITCH_MID, STANCE_PITCH_OFF, smoothstep(0.35, 1, u));
  return { ankle: ankleFromPoint(p, pitch, BODY.footBall, fs), pitch, planted: true };
};

// Swing path keyframes, ankle relative to the hip, canonical metres.
// Trailing leg stretched out behind after push-off, then the heel folds up
// under the hips as the knee drives through, then the leg reaches forward.
const SWING_KEYS = [v(-0.52, -0.5), v(-0.08, -0.36), v(0.34, -0.6)];
const SWING_PITCH = [-62 * DEG, -40 * DEG, -4 * DEG];

const swingTarget = (
  t: number,
  nOff: number,
  scaleAt: ScaleAt,
  fs: number,
  hipNow: Vec2,
  s: number,
): FootTarget => {
  const tOff = timeOfStep(nOff + RUN.stance);
  const off = stanceTarget(nOff, 1, scaleAt, fs);
  const sOff = scaleAt(tOff);
  const hipOff = pelvisAt(tOff, sOff);
  const nLand = nOff + 2;
  const touchSwing = nLand === TOUCH_FOOTFALL;

  // End of the swing: the next footfall, or for the touch, the toe on the ball at t = 0.
  let tEnd: number;
  let endAnkle: Vec2;
  let endPitch: number;
  if (touchSwing) {
    tEnd = 0;
    endPitch = TOUCH.pitchContact;
    endAnkle = ankleFromPoint(toeAt(0, TOUCH_LAND_T), endPitch, BODY.toeTip, fs);
  } else {
    tEnd = timeOfStep(nLand);
    const land = stanceTarget(nLand, 0, scaleAt, fs);
    endAnkle = land.ankle;
    endPitch = land.pitch;
  }
  const sEnd = scaleAt(tEnd);
  const hipEnd = pelvisAt(tEnd, sEnd);

  const u = clamp((t - tOff) / (tEnd - tOff));
  const keys = [
    sub(off.ankle, hipOff),
    ...SWING_KEYS.map((k) => mul(k, s)),
    sub(endAnkle, hipEnd),
  ];
  const rel = catmullRom(keys, u);
  const pitches = [off.pitch, ...SWING_PITCH, endPitch];
  const pf = u * (pitches.length - 1);
  const i = Math.min(pitches.length - 2, Math.floor(pf));
  const pitch = lerp(pitches[i], pitches[i + 1], smoothstep(0, 1, pf - i));
  const rel_target: FootTarget = { ankle: add(hipNow, rel), pitch, planted: false };

  if (!touchSwing) return rel_target;

  // Hand over to the absolute toe path.
  const w = smoothstep(TOUCH.absStart, TOUCH.absStart + 0.04, t);
  if (w <= 0) return rel_target;
  const absPitch = toePitchAt(t, TOUCH_LAND_T);
  const absAnkle = ankleFromPoint(toeAt(t, TOUCH_LAND_T), absPitch, BODY.toeTip, fs);
  return {
    ankle: v(lerp(rel_target.ankle.x, absAnkle.x, w), lerp(rel_target.ankle.y, absAnkle.y, w)),
    pitch: lerp(rel_target.pitch, absPitch, w),
    planted: false,
  };
};

/** Is the left foot on the absolute touch path (exactly, no blending) at t? */
export const onAbsoluteTouchPath = (t: number) => t >= TOUCH.absStart + 0.04 && t <= TOUCH_LAND_T;

const footTarget = (
  side: "L" | "R",
  t: number,
  scaleAt: ScaleAt,
  fs: number,
  hipNow: Vec2,
  s: number,
): FootTarget => {
  const n = stepAt(t);
  let k = Math.floor(n);
  if (isLeftStep(k) !== (side === "L")) k -= 1;
  // The touch swing ends at the touch landing, which happens at TOUCH_LAND_T.
  if (side === "L" && k === TOUCH_FOOTFALL - 2 && t <= TOUCH_LAND_T) {
    const inStance = n - k < RUN.stance;
    if (inStance) return stanceTarget(k, (n - k) / RUN.stance, scaleAt, fs);
    if (t >= 0) {
      const pitch = toePitchAt(t, TOUCH_LAND_T);
      return { ankle: ankleFromPoint(toeAt(t, TOUCH_LAND_T), pitch, BODY.toeTip, fs), pitch, planted: false };
    }
    return swingTarget(t, k, scaleAt, fs, hipNow, s);
  }
  const into = n - k;
  if (into < RUN.stance) return stanceTarget(k, into / RUN.stance, scaleAt, fs);
  return swingTarget(t, k, scaleAt, fs, hipNow, s);
};

export type SolveOptions = {
  /** Body scale over time (Scene 1 shrinks him era by era). Defaults to look.scale. */
  scaleAt?: ScaleAt;
};

export const solvePose = (t: number, look: Look, opts: SolveOptions = {}): Pose => {
  const scaleAt: ScaleAt = opts.scaleAt ?? (() => look.scale);
  const s = scaleAt(t);
  const fs = s * look.foot;
  const n = stepAt(t);
  const w = touchWeight(t);
  const thigh = BODY.thigh * s;
  const shin = BODY.shin * s;

  let pelvis = pelvisAt(t, s);

  const targets = {
    L: footTarget("L", t, scaleAt, fs, pelvis, s),
    R: footTarget("R", t, scaleAt, fs, pelvis, s),
  };

  // On the absolute path the toe must land exactly; if the hips are out of
  // reach, bring the hips to the foot rather than the foot to the hips.
  if (t >= TOUCH.absStart && t <= TOUCH_LAND_T) {
    const maxReach = (thigh + shin) * 0.985;
    const d = dist(pelvis, targets.L.ankle);
    if (d > maxReach) pelvis = add(targets.L.ankle, mul(norm(sub(pelvis, targets.L.ankle)), maxReach));
  }

  const leg = (side: "L" | "R"): LegPose => {
    const tg = targets[side];
    const ik = solveTwoBone(pelvis, tg.ankle, thigh, shin, 1);
    const ankle = ik.end;
    return {
      hip: pelvis,
      knee: ik.mid,
      ankle,
      toe: footPoint(ankle, tg.pitch, BODY.toeTip, fs),
      heel: footPoint(ankle, tg.pitch, BODY.heel, fs),
      pitch: tg.pitch,
      planted: tg.planted,
      reachError: ik.error,
    };
  };

  // Torso: forward lean while sprinting, more upright in the reach.
  const sway = 1.5 * DEG * Math.sin(2 * Math.PI * n);
  const lean = lerp(13 * DEG, 5 * DEG, w) + sway;
  const axis = v(Math.sin(lean), Math.cos(lean));
  const neck = add(pelvis, mul(axis, BODY.torso * s));
  const shoulder = sub(neck, mul(axis, BODY.shoulderDrop * s));

  // Head: looks ahead while running, down at the ball for the touch.
  const headPitch = lerp(-4 * DEG, -24 * DEG, w);
  const headR = BODY.headR * s * look.head;
  const headCenter = add(neck, mul(rot(axis, -headPitch * 0.4), BODY.neck * s + headR * 0.92));

  // Arms swing against the legs: left arm back when the left leg is forward.
  const c = Math.cos(Math.PI * (n - 1));
  const arm = (side: "L" | "R"): ArmPose => {
    const sign = side === "L" ? -1 : 1;
    const swing = (-3 + 47 * c * sign) * DEG;
    const elbowFlex = (84 + 18 * clamp(swing / (45 * DEG), -1, 1)) * DEG;
    const ua = v(Math.sin(swing + lean), -Math.cos(swing + lean));
    const elbow = add(shoulder, mul(ua, BODY.upperArm * s));
    const fa = rot(ua, elbowFlex);
    const wrist = add(elbow, mul(fa, BODY.forearm * s));
    const hand = add(wrist, mul(fa, BODY.hand * s));
    return { shoulder, elbow, wrist, hand };
  };

  return {
    t,
    step: n,
    scale: s,
    look,
    pelvis,
    neck,
    lean,
    head: { center: headCenter, radius: headR, pitch: headPitch },
    legs: { L: leg("L"), R: leg("R") },
    arms: { L: arm("L"), R: arm("R") },
    dims: { thigh, shin, upperArm: BODY.upperArm * s, forearm: BODY.forearm * s, foot: fs, torso: BODY.torso * s, headR },
    touch: w,
  };
};

export type Footfall = { n: number; t: number; side: "L" | "R"; x: number };

/** Footfalls (and where the ball of the foot landed) with t in [t0, t1]. */
export const footfallsBetween = (t0: number, t1: number, look: Look, opts: SolveOptions = {}): Footfall[] => {
  const scaleAt: ScaleAt = opts.scaleAt ?? (() => look.scale);
  const out: Footfall[] = [];
  const n0 = Math.ceil(stepAt(t0));
  const n1 = Math.floor(stepAt(t1));
  for (let n = n0; n <= n1; n++) {
    const tn = timeOfStep(n);
    out.push({ n, t: tn, side: isLeftStep(n) ? "L" : "R", x: pivotOf(n, scaleAt, scaleAt(tn) * look.foot).x });
  }
  return out;
};
