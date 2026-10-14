// Boots, authored in the canonical foot frame (origin at the ankle, +x to the
// toe, y up, metres) and mapped by the leg's pitch and pose.dims.foot.
//
// CONTRACT: BODY.toeTip (T) is the support point of every outline for any
// direction between the foot's +x and 40 degrees above it. At contact the
// ball's normal sits 35 degrees above the foot's +x (TOUCH_DIR 20 deg minus
// the -15 deg contact pitch), so nothing of the boot ever reaches past the
// toe towards the ball: the measured centimetre is the drawn centimetre, and
// at the touch the boot meets the ball at exactly one point. Each toe leaves
// T upwards along the 40-degree tangent and arrives from below vertically,
// a crisp tip rounded only underneath. boots.test.ts checks it.
//
// The match cut aligns T between the 39-year-old and the boy, pixel for pixel.

import { Boot } from "../../lib/eras";
import { DEG, Vec2, add, lerp, rot, smoothstep, sub, v } from "../../lib/math";
import { BODY } from "../../lib/rig";
import { Cmd } from "./geom";

export const T = BODY.toeTip;
const p = (x: number, y: number) => v(x, y);

/** Upper bound of the contact normals the toe must clear (foot frame, from +x). */
export const TOE_CONE = 40 * DEG;

/** Modern boot: low cut, a long sloping vamp, a raised heel tab, a thin plate. */
const MODERN: Cmd[] = [
  ["M", T],
  ["C", p(0.1845, -0.0555), p(0.1729, -0.0423), p(0.163, -0.0375)],
  ["C", p(0.1468, -0.0297), p(0.11, -0.021), p(0.076, -0.01)],
  ["C", p(0.052, -0.002), p(0.036, 0.012), p(0.029, 0.029)],
  ["C", p(0.027, 0.036), p(0.019, 0.04), p(0.011, 0.037)],
  ["C", p(-0.01, 0.028), p(-0.03, 0.02), p(-0.046, 0.025)],
  ["C", p(-0.056, 0.029), p(-0.063, 0.03), p(-0.067, 0.022)],
  ["C", p(-0.073, 0.0), p(-0.079, -0.03), p(-0.075, -0.052)],
  ["C", p(-0.073, -0.064), p(-0.065, -0.072), p(-0.05, -0.074)],
  ["C", p(-0.01, -0.076), p(0.07, -0.08), p(0.13, -0.08)],
  ["C", p(0.163, -0.08), p(T.x, -0.0755), T],
  ["Z"],
];

/** Classic boot: taller toe box, laced instep, low collar. */
const CLASSIC: Cmd[] = [
  ["M", T],
  ["C", p(0.1836, -0.0544), p(0.169, -0.0385), p(0.155, -0.031)],
  ["C", p(0.1409, -0.0234), p(0.1, -0.0145), p(0.072, -0.004)],
  ["C", p(0.05, 0.005), p(0.034, 0.018), p(0.027, 0.03)],
  ["C", p(0.024, 0.036), p(0.016, 0.039), p(0.009, 0.035)],
  ["C", p(-0.012, 0.024), p(-0.032, 0.018), p(-0.05, 0.022)],
  ["C", p(-0.06, 0.024), p(-0.066, 0.022), p(-0.069, 0.014)],
  ["C", p(-0.075, -0.006), p(-0.08, -0.034), p(-0.076, -0.054)],
  ["C", p(-0.074, -0.065), p(-0.066, -0.072), p(-0.052, -0.074)],
  ["C", p(-0.01, -0.076), p(0.07, -0.08), p(0.13, -0.08)],
  ["C", p(0.16, -0.08), p(T.x, -0.076), T],
  ["Z"],
];

/** Underside of the modern and classic soles (foot frame y at x). */
const solePlate = (x: number) => lerp(-0.074, -0.08, smoothstep(-0.05, 0.12, x));

/**
 * Studs as one compound outline, their roots sunk 3 mm into the sole so only
 * the tips break the silhouette: bladed for the modern plate, round for the classic.
 */
const studs = (xs: readonly number[], round: boolean): Cmd[] =>
  xs.flatMap((x): Cmd[] => {
    const y = solePlate(x) + 0.003;
    const h = 0.011;
    const w = 0.0065;
    return round
      ? [["M", p(x - w, y)], ["L", p(x - w, y - h * 0.45)], ["C", p(x - w, y - h * 1.05), p(x + w, y - h * 1.05), p(x + w, y - h * 0.45)], ["L", p(x + w, y)], ["Z"]]
      : [["M", p(x - w, y)], ["L", p(x - w * 0.5, y - h)], ["L", p(x + w * 0.5, y - h)], ["L", p(x + w, y)], ["Z"]];
  });

// The worn shoe: a tall toe box raked back from the tip, a wide collar that
// the thin ankle rattles in, and a sole that has split from the upper at the
// front and hangs open around a hinge under the ball of the foot.
const WORN_UPPER: Cmd[] = [
  ["M", T],
  ["C", p(0.1829, -0.0536), p(0.15, -0.0185), p(0.142, -0.016)],
  ["C", p(0.1306, -0.0124), p(0.116, -0.008), p(0.1, -0.002)],
  ["C", p(0.076, 0.007), p(0.052, 0.021), p(0.041, 0.037)],
  ["C", p(0.037, 0.045), p(0.027, 0.05), p(0.016, 0.046)],
  ["C", p(0.0, 0.03), p(-0.03, 0.024), p(-0.05, 0.03)],
  ["C", p(-0.062, 0.034), p(-0.07, 0.028), p(-0.074, 0.016)],
  ["C", p(-0.082, -0.01), p(-0.085, -0.04), p(-0.078, -0.058)],
  ["C", p(-0.074, -0.065), p(-0.068, -0.066), p(-0.06, -0.066)],
  ["L", p(0.055, -0.066)],
  ["C", p(0.11, -0.066), p(0.17, -0.07), p(0.184, -0.068)],
  ["C", p(0.188, -0.066), p(T.x, -0.064), T],
  ["Z"],
];

const PEEL = 10 * DEG;
const HINGE = v(0.055, -0.068);
/** Bends a point of the sole down around the hinge; the bend grows over the first 5 cm. */
const peel = (open: number) => (q: Vec2): Vec2 =>
  q.x <= HINGE.x ? q : add(HINGE, rot(sub(q, HINGE), -PEEL * open * Math.min(1, (q.x - HINGE.x) / 0.05)));

const WORN_SOLE = [p(-0.074, -0.064), p(0.06, -0.066), p(0.12, -0.067), p(0.17, -0.069), p(0.18, -0.073), p(0.176, -0.081), p(0.12, -0.082), p(0.06, -0.082), p(-0.066, -0.079), p(-0.08, -0.072)];
/** The dark mouth between the upper and the peeled sole: the upper's lower edge, then the sole's top edge. */
const MOUTH_TOP = [p(0.05, -0.066), p(0.184, -0.068)];
const MOUTH_SOLE = [p(0.174, -0.069), p(0.12, -0.067), p(0.06, -0.066)];

export type BootGeo = {
  upper: Cmd[];
  /** Studs (one compound outline), or null. */
  studs: Cmd[] | null;
  /** Separate sole strip and mouth (worn shoe only), as point loops. */
  sole: Vec2[] | null;
  mouth: Vec2[] | null;
  /** Hairline details, open polylines in the foot frame. */
  seam: Vec2[];
  laces: Vec2[][];
  patch: Vec2[] | null;
  scuffs: Vec2[][];
  /** A highlight along the top of the vamp, where the key light skims the upper. */
  sheen: Vec2[];
  /** Flex creases across the vamp. */
  creases: Vec2[][];
};

/** `open` (0..1) is how far the worn sole hangs open: wide in the air, shut under the foot's weight. */
export const bootGeometry = (kind: Boot, open: number): BootGeo => {
  if (kind === "worn") {
    const bend = peel(open);
    return {
      upper: WORN_UPPER,
      studs: null,
      sole: WORN_SOLE.map(bend),
      mouth: [...MOUTH_TOP, ...MOUTH_SOLE.map(bend)],
      seam: [p(-0.076, -0.056), p(0.0, -0.058), p(0.05, -0.059)],
      laces: [0, 1, 2, 3].map((i) => {
        const x = 0.034 + i * 0.015;
        const y = 0.03 - i * 0.0095;
        return [p(x - 0.006, y + 0.002), p(x + 0.011, y - 0.003)];
      }),
      patch: [p(0.064, -0.052), p(0.11, -0.05), p(0.114, -0.026), p(0.068, -0.023)],
      scuffs: [
        [p(0.15, -0.03), p(0.163, -0.038)],
        [p(0.148, -0.046), p(0.16, -0.052)],
        [p(-0.074, -0.02), p(-0.068, 0.004)],
        [p(0.12, -0.012), p(0.126, -0.03)],
      ],
      sheen: [p(0.162, -0.036), p(0.147, -0.021), p(0.125, -0.012)],
      creases: [
        [p(0.098, -0.006), p(0.104, -0.022), p(0.1, -0.036)],
        [p(0.088, -0.002), p(0.092, -0.014)],
      ],
    };
  }
  const modern = kind === "modern";
  return {
    upper: modern ? MODERN : CLASSIC,
    studs: studs(modern ? [-0.052, -0.022, 0.05, 0.085, 0.118, 0.148] : [-0.05, -0.02, 0.055, 0.1, 0.14], !modern),
    sole: null,
    mouth: null,
    seam: modern ? [p(-0.072, -0.063), p(0.0, -0.068), p(0.1, -0.0715), p(0.176, -0.068)] : [p(-0.074, -0.066), p(0.0, -0.072), p(0.1, -0.075), p(0.178, -0.071)],
    laces: modern ? [] : [0, 1, 2].map((i) => [p(0.03 + i * 0.016, 0.022 - i * 0.009), p(0.045 + i * 0.016, 0.017 - i * 0.009)]),
    patch: null,
    scuffs: [],
    sheen: modern ? [p(0.168, -0.044), p(0.145, -0.032), p(0.1, -0.021), p(0.066, -0.008)] : [p(0.16, -0.036), p(0.135, -0.025), p(0.1, -0.016), p(0.068, -0.004)],
    creases: [],
  };
};
