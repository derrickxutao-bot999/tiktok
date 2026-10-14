// The head in profile, facing +x, authored in head units (1 = head radius,
// origin at the head centre, y up) and rotated by the head pitch. A boy's
// head (look.head > 1) gets a rounder cranium and a smaller, softer face.
//
// Hair and beard are graphic shapes with their own contour. Inside them,
// engraved hairlines (clipped to the shape by Face) give them grain: short
// cuts carry concentric lines that follow the skull like the guilloche of a
// watch dial; long hair carries flow lines from the crown to its tips.

import { Beard, Hair, Look } from "../../lib/eras";
import { Vec2, clamp, hash2, lerp, smoothstep } from "../../lib/math";
import { Pose } from "../../lib/rig";
import { Frame, Pt, inFrame } from "./geom";

/** The eye's own unit (head units per eye unit) and its centre on the face, head units: a child's eye sits a little lower. */
const EYE_SCALE = 1.3;
const eyeAt = (look: Look) => {
  const c = smoothstep(1.02, 1.2, look.head);
  return { x: lerp(0.63, 0.6, c), y: lerp(-0.03, -0.13, c) };
};
/** The centre of the open eye between the lids, eye units from eyeAt. */
const EYE_OPEN_C = { x: 0.0, y: 0.009 };

/** World point (metres) at the centre of the visible eye: aim the camera here for "stories in his eyes". */
export const eyePoint = (pose: Pose): Vec2 => {
  const e = eyeAt(pose.look);
  const q = inFrame({ o: pose.head.center, a: pose.head.pitch, s: pose.head.radius }, e.x + EYE_OPEN_C.x * EYE_SCALE, e.y + EYE_OPEN_C.y * EYE_SCALE);
  return { x: q.x, y: q.y };
};

/** (x, y, sharp) in head units. */
type K = readonly [number, number, 0 | 1];

type Skull = { cx: number; cy: number; rx: number; ry: number };
const SKULL_A: Skull = { cx: -0.1, cy: 0.12, rx: 0.87, ry: 0.88 };
const SKULL_C: Skull = { cx: -0.11, cy: 0.14, rx: 0.9, ry: 0.86 };

// Adult and child profiles, point for point: from the forehead down the face,
// under the jaw, then over the neck to the nape; the skull arc closes it.
// Adult thirds: hairline 0.52, brow 0.12, nose base -0.46, chin -1.0. A
// child's face is shorter, its nose small and soft, under a bigger cranium.
const FACE_A: readonly K[] = [
  [0.8, 0.32, 0], [0.845, 0.12, 0], [0.8, -0.01, 0], [0.9, -0.17, 0], [1.06, -0.345, 0], [1.02, -0.415, 0], [0.87, -0.46, 1],
  [0.895, -0.55, 0], [0.845, -0.615, 0], [0.875, -0.685, 0], [0.8, -0.77, 0], [0.85, -0.89, 0], [0.71, -1.0, 0],
  [0.38, -0.97, 0], [-0.04, -0.66, 0], [-0.3, -0.6, 0], [-0.62, -0.55, 0], [-0.88, -0.22, 0],
];
const FACE_C: readonly K[] = [
  [0.8, 0.2, 0], [0.8, 0.0, 0], [0.76, -0.1, 0], [0.82, -0.24, 0], [0.92, -0.37, 0], [0.89, -0.43, 0], [0.77, -0.47, 1],
  [0.8, -0.55, 0], [0.765, -0.61, 0], [0.79, -0.67, 0], [0.73, -0.74, 0], [0.76, -0.82, 0], [0.63, -0.92, 0],
  [0.34, -0.88, 0], [-0.02, -0.62, 0], [-0.3, -0.58, 0], [-0.62, -0.54, 0], [-0.9, -0.2, 0],
];

/** Skull arc, degrees from +x, counter-clockwise: from behind the nape over the crown to the forehead. */
const SKULL_ARC = [200, 188, 160, 125, 90, 58, 25];

type HairSpec = {
  /** Outer arc: [angle deg, thickness] from the front over the crown to the back. */
  arc: readonly (readonly [number, number])[];
  /** Points after the arc (hair falling behind); the run sweeps them back. */
  tail: readonly K[];
  /** The inner edge, from the back round the ear to the front hairline. */
  inner: readonly K[];
  sweep: number;
  /** Whether the hair covers the ear. */
  coversEar: boolean;
  /** Flow lines of long hair, crown to tips. Short cuts are engraved with skull-parallel lines instead. */
  flow?: readonly (readonly (readonly [number, number])[])[];
};

// The hairline of a short cut: nape, behind and over the ear, sideburn, temple, forehead.
const CROP_INNER: readonly K[] = [
  [-0.6, -0.49, 0], [-0.36, -0.2, 0], [-0.2, 0.1, 0], [-0.06, 0.05, 0], [-0.04, -0.2, 1], [0.05, -0.18, 1], [0.14, 0.2, 0], [0.42, 0.4, 0], [0.66, 0.5, 0],
];

const HAIR: Record<Hair, HairSpec> = {
  "crop-grey": {
    arc: [[27, 0.008], [45, 0.035], [90, 0.045], [130, 0.045], [170, 0.04], [205, 0.026], [228, 0.004]],
    tail: [],
    inner: CROP_INNER,
    sweep: 0,
    coversEar: false,
  },
  crop: {
    arc: [[27, 0.01], [45, 0.045], [90, 0.055], [130, 0.055], [170, 0.048], [205, 0.03], [228, 0.005]],
    tail: [],
    inner: CROP_INNER,
    sweep: 0,
    coversEar: false,
  },
  // 2009: fuller on top, a small fringe tip over the forehead.
  short: {
    arc: [[22, 0.03], [38, 0.16], [70, 0.14], [110, 0.11], [160, 0.08], [205, 0.05], [228, 0.008]],
    tail: [],
    inner: [[-0.6, -0.5, 0], [-0.36, -0.2, 0], [-0.2, 0.11, 0], [-0.06, 0.06, 0], [-0.04, -0.17, 1], [0.05, -0.15, 1], [0.15, 0.24, 0], [0.44, 0.42, 0], [0.66, 0.41, 0], [0.82, 0.33, 1]],
    sweep: 0,
    coversEar: false,
  },
  // 2006, age 19: swept back off an open forehead, close over the crown, and
  // streaming out behind in long locks past the collar. Tails are authored as
  // if the head were upright (they hang and stream, see `swept`). Read at a
  // glance by its silhouette: a comet tail behind the head.
  long: {
    arc: [[26, 0.03], [36, 0.1], [60, 0.11], [100, 0.1], [140, 0.11], [175, 0.14], [196, 0.17]],
    tail: [
      [-1.2, -0.42, 0], [-1.3, -0.86, 0], [-1.44, -1.3, 0], [-1.58, -1.64, 1], [-1.36, -1.42, 0], [-1.3, -1.72, 1], [-1.14, -1.46, 0],
      [-1.0, -1.66, 1], [-0.88, -1.34, 0],
    ],
    inner: [[-0.64, -1.0, 0], [-0.36, -0.74, 0], [-0.1, -0.6, 1], [0.04, -0.34, 0], [0.1, -0.02, 0], [0.22, 0.26, 0], [0.44, 0.42, 0], [0.62, 0.5, 1]],
    sweep: 0.12,
    coversEar: true,
    flow: [
      [[0.52, 0.66], [-0.2, 0.92], [-0.86, 0.52], [-1.16, -0.3], [-1.5, -1.5]],
      [[0.56, 0.58], [-0.1, 0.78], [-0.7, 0.44], [-1.04, -0.36], [-1.28, -1.56]],
      [[0.5, 0.5], [0.0, 0.62], [-0.52, 0.34], [-0.86, -0.4], [-1.04, -1.5]],
      [[0.4, 0.44], [0.04, 0.46], [-0.34, 0.22], [-0.62, -0.44], [-0.9, -1.28]],
      [[0.26, 0.3], [0.08, 0.16], [-0.06, -0.14], [-0.3, -0.6], [-0.62, -1.0]],
    ],
  },
  // 2004, age 17: a rounder, fuller mop that hides the forehead under a heavy
  // blunt fringe down to the brow and ends square at the middle of the neck.
  mop: {
    arc: [[4, 0.15], [18, 0.2], [45, 0.24], [90, 0.25], [135, 0.25], [175, 0.24], [205, 0.17]],
    tail: [[-1.1, -0.56, 0], [-1.06, -0.8, 0], [-0.98, -0.9, 1], [-0.84, -0.86, 0], [-0.72, -0.92, 1], [-0.6, -0.8, 0]],
    inner: [
      [-0.42, -0.74, 0], [-0.2, -0.68, 0], [-0.04, -0.62, 1], [0.06, -0.32, 0], [0.12, -0.02, 0], [0.22, 0.12, 0], [0.4, 0.17, 0], [0.62, 0.15, 0],
      [0.8, 0.13, 0], [0.93, 0.12, 1],
    ],
    sweep: 0.03,
    coversEar: true,
    flow: [
      [[0.86, 0.5], [0.3, 1.1], [-0.5, 1.0], [-1.06, 0.3], [-1.04, -0.7]],
      [[0.8, 0.36], [0.2, 0.92], [-0.48, 0.82], [-0.92, 0.2], [-0.9, -0.74]],
      [[0.66, 0.3], [0.08, 0.66], [-0.46, 0.5], [-0.72, -0.1], [-0.68, -0.76]],
      [[0.36, 0.86], [0.7, 0.62], [0.88, 0.18]],
      [[0.12, 0.8], [0.5, 0.52], [0.7, 0.16]],
      [[-0.04, 0.6], [0.26, 0.36], [0.44, 0.18]],
    ],
  },
  // The boy's cut, short with a soft fringe.
  kid: {
    arc: [[20, 0.03], [36, 0.09], [80, 0.09], [125, 0.085], [165, 0.075], [205, 0.05], [228, 0.008]],
    tail: [],
    inner: [[-0.6, -0.5, 0], [-0.38, -0.24, 0], [-0.22, 0.02, 0], [-0.06, -0.02, 0], [-0.04, -0.2, 1], [0.04, -0.18, 1], [0.18, 0.18, 0], [0.52, 0.3, 0], [0.74, 0.3, 0], [0.81, 0.24, 1]],
    sweep: 0,
    coversEar: false,
  },
};

// Beards cover the moustache, wrap the mouth and the chin and run up the jaw
// to the sideburn. 'trim' hugs the jaw within 3 cm; 'full' stands off it and
// fills out at the chin.
const BEARD: Record<Exclude<Beard, "none">, readonly K[]> = {
  full: [
    [-0.04, -0.18, 1], [0.2, -0.35, 0], [0.42, -0.43, 0], [0.63, -0.42, 0], [0.79, -0.435, 0], [0.875, -0.47, 1], [0.925, -0.55, 0], [0.862, -0.615, 1],
    [0.905, -0.69, 0], [0.885, -0.8, 0], [0.92, -0.95, 0], [0.74, -1.09, 0], [0.38, -1.04, 0], [-0.08, -0.71, 0], [-0.1, -0.42, 0],
  ],
  trim: [
    [-0.03, -0.22, 1], [0.22, -0.44, 0], [0.45, -0.52, 0], [0.65, -0.5, 0], [0.79, -0.47, 0], [0.874, -0.468, 1], [0.91, -0.55, 0], [0.858, -0.615, 1],
    [0.89, -0.688, 0], [0.82, -0.775, 0], [0.87, -0.9, 0], [0.72, -1.025, 0], [0.38, -0.995, 0], [-0.06, -0.68, 0], [-0.06, -0.44, 0],
  ],
};

/** Is (x, y) inside a polygon of key points (even-odd)? */
const insidePoly = (poly: readonly K[], x: number, y: number) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

/** The point at fraction t of a polyline's length. */
const alongPoly = (pts: readonly (readonly [number, number])[], t: number): [number, number] => {
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  let d = clamp(t) * lens.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const u = lens[i] ? clamp(d / lens[i]) : 0;
      return [lerp(pts[i][0], pts[i + 1][0], u), lerp(pts[i][1], pts[i + 1][1], u)];
    }
    d -= lens[i];
  }
  return [pts[0][0], pts[0][1]];
};

export type HeadGeo = {
  outline: Pt[];
  hair: Pt[];
  beard: Pt[] | null;
  /** Hairlines: ear, brow, nostril, mouth, jaw (only where no beard). */
  lines: { pts: Pt[]; weight: number }[];
  /** Short silver hairs of the grey crop (clipped to the hair). */
  silver: Pt[][];
  /** Flow lines of long hair, crown to tips (clipped to it). */
  strands: { pts: Pt[]; weight: number }[];
  /** Hatching of a short cut: two-point strokes combed along the skull (clipped to the hair). */
  grain: Pt[][];
  /** The beard: its edge on the cheek, and short strokes of grain along the jaw. */
  beardEdge: Pt[] | null;
  beardGrain: Pt[][];
  /** Grey flecks in the beard (age 35 and over). */
  beardSilver: Pt[][];
  /** Close-up grain (drawn only when the head is huge on screen): the beard's fine hair (three-point strokes along its flow), its grey share, the brow's hairs. */
  beardFine: Pt[][];
  beardFineSilver: Pt[][];
  brow: Pt[][];
  /** Close-up hair of a short cut: dense grain combed back over the crown and down the side (clipped to the hair), its silver share. */
  hairFine: Pt[][];
  hairFineSilver: Pt[][];
  /** Short strands breaking the front hairline, the temple and the front of the silhouette (not clipped), and their silver share. */
  fringe: Pt[][];
  fringeSilver: Pt[][];
  /** The front hairline of a short cut, sideburn to forehead: the hair is feathered into the skin along it in the close-up (null: long hair). */
  hairline: Pt[] | null;
  eye: {
    upper: Pt[];
    lower: Pt[];
    crease: Pt[];
    /** The open eye between the lids (for the sclera and to clip the iris). */
    opening: Pt[];
    /** The cornea's bulge in profile, where the light sits. */
    cornea: Pt[];
    /** Iris seen nearly edge-on: a narrow ellipse (centre, vertical axis end, horizontal axis end). */
    iris: { c: Pt; top: Pt; side: Pt };
    /** The point of light, and the floodlights caught along the cornea (main one first). */
    light: Pt;
    catches: Pt[];
    /** Where the four floodlights sit in the extreme close-up (main one first): over the upper iris, clear of the era lights on the cornea's arc. */
    catchesClose: Pt[];
    /** The touchline, reflected as a curve across the lower iris and cornea. */
    reflection: Pt[];
    // Macro detail, for the extreme close-up.
    /** The upper lid's thickness: its margin, just above the lid line. */
    margin: Pt[];
    /** Upper lashes (base, bend, tip) and a few short lower ones. */
    lashes: Pt[][];
    lowerLashes: Pt[][];
    /** The wet rim of the lower lid, catching light. */
    waterline: Pt[];
    /** The pupil within the iris, and the iris's fibres (pupil to rim). */
    pupil: { c: Pt; top: Pt; side: Pt };
    fibres: Pt[][];
    /** The clear dome of the cornea, between its arc and the iris. */
    dome: Pt[];
    /** His career reflected in his eye: one light per era (ERAS order, 2026 first) along the cornea's highlight, top to bottom. */
    jewels: Pt[];
  };
};

/**
 * Head geometry in world metres. `phase` (the step phase) moves long hair.
 * `radiusPx` (the head's radius on screen, optional) lets the extreme
 * close-up taper a short cut's front into the forehead, so it has no ledge.
 */
export const headGeometry = (look: Look, frame: Frame, phase: number, radiusPx = 0): HeadGeo => {
  const c = smoothstep(1.02, 1.2, look.head);
  const P = (x: number, y: number, sh = false) => inFrame(frame, x, y, sh);
  const K2 = (a: K) => P(a[0], a[1], a[2] === 1);
  const L = (a: K, b: K) => P(lerp(a[0], b[0], c), lerp(a[1], b[1], c), a[2] === 1);
  const sk: Skull = {
    cx: lerp(SKULL_A.cx, SKULL_C.cx, c),
    cy: lerp(SKULL_A.cy, SKULL_C.cy, c),
    rx: lerp(SKULL_A.rx, SKULL_C.rx, c),
    ry: lerp(SKULL_A.ry, SKULL_C.ry, c),
  };
  /** A point on the skull (or `out` head units off it), in head units and in the world. */
  const skullL = (deg: number, out = 0) => {
    const a = (deg * Math.PI) / 180;
    return { x: sk.cx + (sk.rx + out) * Math.cos(a), y: sk.cy + (sk.ry + out) * Math.sin(a) };
  };
  const skull = (deg: number, out = 0) => {
    const q = skullL(deg, out);
    return P(q.x, q.y);
  };

  const outline = [...FACE_A.map((a, i) => L(a, FACE_C[i])), ...SKULL_ARC.map((d) => skull(d))];

  const spec = HAIR[look.hair];
  // In the close-up a short cut thins out towards its front instead of standing
  // off the forehead in a step, and its hairline (from the front of the
  // sideburn, the inner edge's second corner, to the forehead) wavers a little
  // instead of running ruler-straight.
  const taper = spec.flow ? 0 : smoothstep(300, 520, radiusPx);
  const c1 = spec.inner.flatMap((q, i) => (q[2] === 1 ? [i] : []))[1] ?? 0;
  const wavy = (pts: readonly K[]): K[] => {
    const line = pts.map(([x, y]) => [x, y] as [number, number]);
    return Array.from({ length: 25 }, (_, i) => {
      const t = i / 24;
      const [x, y] = alongPoly(line, t);
      const [x1, y1] = alongPoly(line, Math.max(0, t - 0.01));
      const [x2, y2] = alongPoly(line, Math.min(1, t + 0.01));
      const l = Math.hypot(x2 - x1, y2 - y1) || 1;
      const w =
        taper *
        Math.sqrt(Math.sin(Math.PI * t)) *
        (0.011 * Math.sin(2 * Math.PI * 3.3 * t + 0.7) + 0.006 * Math.sin(2 * Math.PI * 7.9 * t + 2.1) + 0.006 * (hash2(i, 223) - 0.5));
      return [x + ((y2 - y1) / l) * w, y - ((x2 - x1) / l) * w, i === 0 ? pts[0][2] : 0];
    });
  };
  const d0 = spec.arc[0][0];
  const hs: HairSpec =
    taper > 0
      ? {
          ...spec,
          arc: spec.arc.map(([d, t]) => [d, t * lerp(1, Math.pow(smoothstep(d0, d0 + 48, d), 0.7), taper)] as const),
          inner: [...spec.inner.slice(0, c1), ...wavy(spec.inner.slice(c1))],
        }
      : spec;
  // The run sweeps the lower, trailing hair back.
  // Hair below the ears hangs: it is turned back against the head's pitch
  // about the nape (so it falls with gravity when he looks down), and the
  // run sweeps it back a little.
  const sway = hs.sweep * (0.6 + 0.4 * Math.sin(2 * Math.PI * phase));
  const swept = (x: number, y: number, sh = false) => {
    const w = clamp((-y - 0.3) / 0.7);
    const a = -frame.a * w;
    const px = -0.85;
    const py = -0.2;
    const hx = px + (x - px) * Math.cos(a) - (y - py) * Math.sin(a);
    const hy = py + (x - px) * Math.sin(a) + (y - py) * Math.cos(a);
    return P(hx - sway * w, hy, sh);
  };
  const hair = [
    ...hs.arc.map(([d, t]) => skull(d, t)),
    ...hs.tail.map(([x, y, s]) => swept(x, y, s === 1)),
    ...hs.inner.map(([x, y, sh]) => (hs.tail.length ? swept(x, y, sh === 1) : P(x, y, sh === 1))),
  ];

  const beard = look.beard === "none" ? null : BEARD[look.beard].map(K2);

  // The eye sits a little lower on a child's face.
  const { x: ex, y: ey } = eyeAt(look);
  const lines: HeadGeo["lines"] = [];
  const ed = lerp(0, -0.08, c);
  if (!hs.coversEar) {
    lines.push({ pts: [P(-0.06, 0.02 + ed), P(-0.2, 0.06 + ed), P(-0.32, -0.06 + ed), P(-0.32, -0.28 + ed), P(-0.2, -0.44 + ed), P(-0.1, -0.42 + ed)], weight: 0.75 });
    lines.push({ pts: [P(-0.12, -0.04 + ed), P(-0.22, -0.06 + ed), P(-0.24, -0.22 + ed), P(-0.16, -0.32 + ed)], weight: 0.4 });
  }
  // Brow, nostril wing, the line of the mouth, and the jaw where no beard hides it.
  lines.push({ pts: [P(ex - 0.14, ey + 0.15), P(ex + 0.02, ey + 0.2), P(ex + 0.19, ey + 0.19)], weight: 0.6 });
  lines.push({ pts: [L([0.84, -0.33, 0], [0.77, -0.36, 0]), L([0.87, -0.4, 0], [0.8, -0.425, 0]), L([0.92, -0.43, 0], [0.84, -0.45, 0])], weight: 0.55 });
  // The line of the lips (a beard keeps it, a little shorter).
  lines.push({ pts: [L([0.845, -0.615, 0], [0.765, -0.61, 0]), L([beard ? 0.79 : 0.76, -0.6, 0], [0.7, -0.6, 0])], weight: beard ? 0.5 : 0.6 });
  if (!beard) {
    // A clean-shaven jaw: one line from under the chin to the angle of the jaw and up the ramus, so the jaw reads without a beard.
    lines.push({
      pts: [L([0.6, -0.995, 0], [0.52, -0.91, 0]), L([0.3, -0.9, 0], [0.26, -0.83, 0]), L([-0.04, -0.66, 0], [-0.02, -0.62, 0]), L([-0.08, -0.46, 0], [-0.07, -0.44, 0])],
      weight: 0.8,
    });
  }

  const grey = look.hair === "crop-grey";
  const bk = look.beard === "none" ? null : BEARD[look.beard];
  // The beard's edge across the cheek runs from the sideburn to the moustache (its second corner).
  const beardEdge = bk ? bk.slice(0, bk.findIndex((q, i) => i > 0 && q[2] === 1) + 1).map(K2) : null;

  // Grain, as short strokes laid along the growth. Positions are jittered by
  // a fixed hash, so every frame and every render draws the same hairs.
  const stroke = (x: number, y: number, ang: number, len: number): Pt[] => [P(x, y), P(x + len * Math.cos(ang), y + len * Math.sin(ang))];
  const jit = (i: number, salt: number) => hash2(i, salt) - 0.5;

  // A short cut: rows of hatching parallel to the skull, combed back over the crown.
  const thick = (deg: number) => {
    const arc = hs.arc;
    if (deg <= arc[0][0]) return arc[0][1];
    for (let i = 0; i < arc.length - 1; i++) if (deg <= arc[i + 1][0]) return lerp(arc[i][1], arc[i + 1][1], (deg - arc[i][0]) / (arc[i + 1][0] - arc[i][0]));
    return arc[arc.length - 1][1];
  };
  const grain: Pt[][] = [];
  if (!hs.flow) {
    const a0 = hs.arc[0][0] + 6;
    const a1 = hs.arc[hs.arc.length - 1][0] - 4;
    [0.03, 0.1, 0.17, 0.25, 0.34].forEach((r, row) => {
      for (let d = a0 + 5 * row, i = 0; d < a1; d += 10, i++) {
        const dd = d + 4 * jit(i, row);
        const rr = r + 0.02 * jit(i, row + 9);
        const q = skullL(dd, thick(dd) - rr);
        const a = (dd * Math.PI) / 180;
        // Along the skull, pointing back over the crown, tipped slightly inwards.
        const ang = Math.atan2(Math.cos(a) * sk.ry, -Math.sin(a) * sk.rx) - 0.12 + 0.1 * jit(i, row + 17);
        grain.push(stroke(q.x, q.y, ang, 0.07 + 0.03 * hash2(i, row + 31)));
      }
    });
  }

  // Grey at the temple and above the ear: short silver hairs combed up and back.
  const silverAt = [
    [-0.36, -0.2, -0.2, 0.1],
    [-0.2, 0.1, -0.06, 0.05],
    [0.05, -0.18, 0.14, 0.2],
    [0.14, 0.2, 0.42, 0.4],
  ] as const;
  const silver: Pt[][] = grey
    ? silverAt.flatMap(([x0, y0, x1, y1], seg) =>
        [0.12, 0.37, 0.62, 0.87].flatMap((t, i) => {
          const n = seg * 4 + i;
          if (hash2(n, 2) < 0.3) return [];
          const x = lerp(x0, x1, t + 0.2 * jit(n, 3));
          const y = lerp(y0, y1, t + 0.2 * jit(n, 4));
          const inward = 0.02 + 0.12 * hash2(n, 5);
          const dx = -0.1 - x;
          const dy = 0.5 - y;
          const dl = Math.hypot(dx, dy);
          return [stroke(x + (dx / dl) * inward, y + (dy / dl) * inward, 1.9 + 0.8 * jit(n, 7), 0.035 + 0.06 * hash2(n, 11))];
        }),
      )
    : [];

  // The beard grows down: strokes along the jaw and up the chin, inside its edge.
  const beardGrain: Pt[][] = bk
    ? Array.from({ length: 16 }, (_, i) => {
        const t = i / 15;
        const jaw = t < 0.7;
        const u = jaw ? t / 0.7 : (t - 0.7) / 0.3;
        // Jaw: from the angle of the jaw (13) to under the chin (11); then up the chin (10).
        const [p0, p1] = jaw ? [bk[13], bk[11]] : [bk[11], bk[10]];
        const x = lerp(p0[0], p1[0], u);
        const y = lerp(p0[1], p1[1], u);
        const lift = 0.05 + 0.08 * hash2(i, 13);
        return stroke(x - 0.02, y + lift, -1.32 + 0.3 * jit(i, 17), 0.06 + 0.04 * hash2(i, 19));
      })
    : [];
  const beardSilver: Pt[][] =
    bk && look.age >= 35 ? [0, 1, 2, 3, 4].map((i) => stroke(0.42 + 0.1 * i + 0.03 * jit(i, 23), -0.9 - 0.025 * i + 0.04 * jit(i, 29), -1.3 + 0.3 * jit(i, 31), 0.07)) : [];

  // Close-up grain: dense short strokes on a jittered grid inside the beard
  // (clipped to it), each bending along the beard's flow: down the cheek,
  // forward along the jaw to the chin, down off the chin and over the lip. A
  // share of them is silver on the older beards. The brow is fine hairs
  // combed back towards the temple.
  const beardFine: Pt[][] = [];
  const beardFineSilver: Pt[][] = [];
  if (bk) {
    const jaw = [bk[13], bk[12], bk[11]];
    const flow = (x: number, y: number) => {
      // Nearest point of the jaw line, and its direction (towards the chin).
      let best = { d: Infinity, tx: 1, ty: 0 };
      for (let s = 0; s < jaw.length - 1; s++) {
        const [ax, ay] = jaw[s];
        const dx = jaw[s + 1][0] - ax;
        const dy = jaw[s + 1][1] - ay;
        const l2 = dx * dx + dy * dy;
        const u = clamp(((x - ax) * dx + (y - ay) * dy) / l2);
        const d = Math.hypot(x - ax - u * dx, y - ay - u * dy);
        if (d < best.d) best = { d, tx: dx / Math.sqrt(l2), ty: dy / Math.sqrt(l2) - 0.12 };
      }
      const wJaw = 1 - smoothstep(0.04, 0.4, best.d);
      const wChin = smoothstep(0.66, 0.86, x) * smoothstep(-0.62, -0.78, y);
      const wLip = smoothstep(0.6, 0.78, x) * smoothstep(-0.7, -0.58, y);
      const wCheek = (1 - wJaw) * (1 - wChin) * (1 - wLip);
      const fx = 0.4 * wCheek + best.tx * wJaw * (1 - wChin) - 0.15 * wChin + 0.45 * wLip;
      const fy = -0.95 * wCheek + best.ty * wJaw * (1 - wChin) - 0.99 * wChin - 0.89 * wLip;
      return Math.atan2(fy, fx);
    };
    const step = 0.027;
    for (let gy = 0, n = 0; gy < 36; gy++) {
      for (let gx = 0; gx < 41; gx++, n++) {
        const x = -0.12 + (gx + 0.5 + 0.9 * jit(n, 41)) * step;
        const y = -1.12 + (gy + 0.5 + 0.9 * jit(n, 43)) * step;
        if (!insidePoly(bk, x, y)) continue;
        // Neighbouring hairs lie together in loose locks, each with its own small turn.
        const a = flow(x, y) + 0.22 * Math.sin(9 * x + 4 * y) + 0.32 * jit(n, 47);
        const len = 0.028 + 0.03 * hash2(n, 53);
        const curl = 0.6 * jit(n, 57);
        const m = { x: x + 0.5 * len * Math.cos(a), y: y + 0.5 * len * Math.sin(a) };
        const st = [P(x, y), P(m.x, m.y), P(m.x + 0.5 * len * Math.cos(a + curl), m.y + 0.5 * len * Math.sin(a + curl))];
        (look.age >= 35 && hash2(n, 59) < (grey ? 0.45 : 0.12) ? beardFineSilver : beardFine).push(st);
      }
    }
  }

  // Close-up hair of a short cut. Dense grain inside it, combed back over the
  // crown and down and back over the side of the head; a broken hairline:
  // short strands crossing the front hairline and the temple onto the skin, a
  // few stray hairs in front of it, and short hairs standing out of the
  // silhouette at the front, so the crop never reads as a helmet.
  const hairFine: Pt[][] = [];
  const hairFineSilver: Pt[][] = [];
  const fringe: Pt[][] = [];
  const fringeSilver: Pt[][] = [];
  let hairline: Pt[] | null = null;
  if (!hs.flow) {
    const silverShare = grey ? 0.45 : 0;
    const poly: K[] = [...hs.arc.map(([d, t]): K => [skullL(d, t).x, skullL(d, t).y, 0]), ...hs.inner];
    const step = 0.03;
    for (let gy = 0, n = 0; gy < 40; gy++) {
      for (let gx = 0; gx < 64; gx++, n++) {
        const x = -1.1 + (gx + 0.5 + 0.9 * jit(n, 131)) * step;
        const y = -0.62 + (gy + 0.5 + 0.9 * jit(n, 137)) * step;
        if (!insidePoly(poly, x, y)) continue;
        const ex = (x - sk.cx) / sk.rx;
        const ey = (y - sk.cy) / sk.ry;
        const rho = Math.hypot(ex, ey);
        const a = Math.atan2(ey, ex);
        // Along the skull (back over the crown) near the top; down and back on the side.
        const w = smoothstep(0.5, 0.88, rho);
        const fx = w * -Math.sin(a) * sk.rx - (1 - w) * 0.45;
        const fy = w * Math.cos(a) * sk.ry - (1 - w) * 0.89;
        const ang = Math.atan2(fy, fx) - 0.1 + 0.3 * jit(n, 139);
        (hash2(n, 149) < silverShare ? hairFineSilver : hairFine).push(stroke(x, y, ang, 0.02 + 0.022 * hash2(n, 151)));
      }
    }
    const line = hs.inner.slice(c1).map(([x, y]) => [x, y] as [number, number]);
    hairline = line.map(([x, y]) => P(x, y));
    for (let i = 0; i < 150; i++) {
      const t = (i + hash2(i, 157)) / 150;
      const [x, y] = alongPoly(line, t);
      const [x2, y2] = alongPoly(line, Math.min(1, t + 0.01));
      const [x1, y1] = alongPoly(line, Math.max(0, t - 0.01));
      const tl = Math.hypot(x2 - x1, y2 - y1) || 1;
      // Towards the skin (right of the line's direction) and along it (towards the front).
      const sx = (y2 - y1) / tl;
      const sy = -(x2 - x1) / tl;
      // Most start inside the thinning edge of the hair; a few stray hairs stand on the skin in front of it.
      const into = 0.035 - 0.055 * hash2(i, 167) ** 2;
      // Swept forwards, onto the forehead and down the temple.
      const ang = Math.atan2(sy, sx) + 0.6 + 0.8 * jit(i, 173);
      const len = into < 0 ? 0.006 + 0.01 * hash2(i, 179) : 0.016 + 0.03 * hash2(i, 179);
      (hash2(i, 181) < Math.max(0.25, silverShare) ? fringeSilver : fringe).push(stroke(x - sx * into, y - sy * into, ang, len));
    }
    // Short hairs standing out of the silhouette at the front, combed back.
    for (let i = 0; i < 26; i++) {
      const d = hs.arc[0][0] + 1 + 56 * Math.pow((i + 0.7 * hash2(i, 191)) / 26, 1.5);
      const q = skullL(d, thick(d) - 0.006 - 0.008 * hash2(i, 193));
      const a = (d * Math.PI) / 180;
      const out = Math.atan2(Math.sin(a) * sk.rx, Math.cos(a) * sk.ry);
      (hash2(i, 197) < Math.max(0.3, silverShare) ? fringeSilver : fringe).push(stroke(q.x, q.y, out + 0.55 + 0.35 * jit(i, 199), 0.014 + 0.02 * hash2(i, 211)));
    }
  }
  const browPts: [number, number][] = [[ex - 0.15, ey + 0.15], [ex + 0.02, ey + 0.205], [ex + 0.19, ey + 0.19]];
  const brow: Pt[][] = Array.from({ length: 22 }, (_, i) => {
    const t = (i + 0.5 * hash2(i, 61)) / 22;
    const [a, b] = t < 0.5 ? [browPts[0], browPts[1]] : [browPts[1], browPts[2]];
    const u = t < 0.5 ? t / 0.5 : (t - 0.5) / 0.5;
    const x = lerp(a[0], b[0], u);
    const y = lerp(a[1], b[1], u) + 0.022 * jit(i, 67) - 0.012;
    // Combed back towards the temple, lifting at the inner end.
    return stroke(x, y, Math.PI - 0.12 - 0.5 * (1 - t) * (1 - t) + 0.2 * jit(i, 71), 0.045 + 0.03 * hash2(i, 73));
  });

  // Long hair carries flow lines from the crown to its tips.
  const strands = (hs.flow ?? []).map((l, i) => ({ pts: l.map(([x, y]) => swept(x, y)), weight: 0.48 - 0.04 * i }));

  const E = (x: number, y: number) => P(ex + x * EYE_SCALE, ey + y * EYE_SCALE);
  const Ev = (q: readonly [number, number]) => E(q[0], q[1]);

  // The eye in eye units (x forward, y up). The cornea is a quadratic arc
  // from the upper lid over its front to the lower lid; reflections sit on
  // arcs just inside it.
  const UPPER: [number, number][] = [[-0.1, 0.0], [-0.02, 0.05], [0.07, 0.04], [0.098, 0.01]];
  const LOWER: [number, number][] = [[-0.09, -0.008], [0.0, -0.032], [0.078, -0.02]];
  const CA = [0.072, 0.034] as const;
  const CB = [0.1, 0.004] as const;
  const CC = [0.076, -0.024] as const;
  const CQ = [2 * CB[0] - (CA[0] + CC[0]) / 2, 2 * CB[1] - (CA[1] + CC[1]) / 2] as const;
  /** A point on the cornea arc (t: 0 top, 1 bottom), `inset` eye units inside it. */
  const onCornea = (t: number, inset: number): [number, number] => {
    const u = 1 - t;
    const x = u * u * CA[0] + 2 * t * u * CQ[0] + t * t * CC[0];
    const y = u * u * CA[1] + 2 * t * u * CQ[1] + t * t * CC[1];
    const tx = 2 * u * (CQ[0] - CA[0]) + 2 * t * (CC[0] - CQ[0]);
    const ty = 2 * u * (CQ[1] - CA[1]) + 2 * t * (CC[1] - CQ[1]);
    const l = Math.hypot(tx, ty) || 1;
    return [x - (-ty / l) * inset, y - (tx / l) * inset];
  };
  /** The cornea's arc just inside its bright line, for spacing the era lights evenly by length; lower down it keeps clear of the lower lid. */
  const arcIn = Array.from({ length: 41 }, (_, i) => onCornea(i / 40, 0.0032 + 0.004 * (i / 40) ** 1.5));
  /** Lashes grow from a lid: base at t along it, leaving at `a0` and curling to `a1`. */
  const lash = (lid: [number, number][], t: number, a0: number, a1: number, len: number): Pt[] => {
    const [bx, by] = alongPoly(lid, t);
    return [E(bx, by), E(bx + 0.5 * len * Math.cos(a0), by + 0.5 * len * Math.sin(a0)), E(bx + len * (0.5 * Math.cos(a0) + 0.5 * Math.cos(a1)), by + len * (0.5 * Math.sin(a0) + 0.5 * Math.sin(a1)))];
  };
  const lashes = Array.from({ length: 8 }, (_, i) => {
    const u = i / 7;
    const a = lerp(1.45, 0.42, u);
    const len = 0.017 + 0.012 * Math.sin(Math.PI * (0.2 + 0.7 * u)) + 0.008 * jit(i, 79);
    return lash(UPPER, lerp(0.46, 0.95, u) + 0.025 * jit(i, 83), a - 0.3 + 0.2 * jit(i, 87), a + 0.18 + 0.2 * jit(i, 91), len);
  });
  const lowerLashes = Array.from({ length: 5 }, (_, i) => {
    const u = i / 4;
    const a = lerp(-1.95, -1.05, u);
    return lash(LOWER, lerp(0.42, 0.9, u), a + 0.12, a - 0.1, 0.01 + 0.005 * Math.sin(Math.PI * u));
  });

  // The iris, a little turned towards us so it has room for the light; its
  // fibres radiate from the pupil like the guilloche of a dial.
  const IC = [0.064, 0.006] as const;
  const IR = [0.021, 0.04] as const;
  const fibres = Array.from({ length: 24 }, (_, i) => {
    const th = (2 * Math.PI * (i + 0.35 * jit(i, 89))) / 24;
    const r0 = 0.42 + 0.04 * hash2(i, 97);
    const r1 = 0.8 + 0.14 * hash2(i, 101);
    return [E(IC[0] + IR[0] * r0 * Math.cos(th), IC[1] + IR[1] * r0 * Math.sin(th)), E(IC[0] + IR[0] * r1 * Math.cos(th), IC[1] + IR[1] * r1 * Math.sin(th))];
  });
  // The touchline he is chasing, reflected as a curve across the lower iris
  // and cornea.
  const RJ = [[0.046, -0.008], [0.072, -0.017], [0.098, -0.001]] as const;
  const onLine = (t: number) => {
    const u = 1 - t;
    return E(u * u * RJ[0][0] + 2 * t * u * RJ[1][0] + t * t * RJ[2][0], u * u * RJ[0][1] + 2 * t * u * RJ[1][1] + t * t * RJ[2][1]);
  };

  return {
    outline,
    hair,
    beard,
    lines,
    silver,
    strands,
    grain,
    beardEdge,
    beardGrain,
    beardSilver,
    beardFine,
    beardFineSilver,
    brow,
    hairFine,
    hairFineSilver,
    fringe,
    fringeSilver,
    hairline,
    eye: {
      upper: [E(-0.1, 0.0), E(-0.02, 0.05), E(0.07, 0.04), E(0.098, 0.01)],
      lower: [E(-0.09, -0.008), E(0.0, -0.032), E(0.078, -0.02)],
      crease: [E(-0.08, 0.064), E(0.0, 0.092), E(0.068, 0.076)],
      opening: [E(-0.1, 0.0), E(-0.02, 0.05), E(0.07, 0.04), E(0.098, 0.01), E(0.1, -0.004), E(0.078, -0.02), E(0.0, -0.032), E(-0.09, -0.008)],
      cornea: [E(0.072, 0.034), E(0.1, 0.004), E(0.076, -0.024)],
      iris: { c: E(IC[0], IC[1]), top: E(IC[0], IC[1] + IR[1]), side: E(IC[0] + IR[0], IC[1]) },
      light: Ev(onCornea(0.2, 0.005)),
      // The four floodlights, high in the cornea, the main one first.
      catches: [Ev(onCornea(0.2, 0.005)), Ev(onCornea(0.1, 0.0035)), Ev(onCornea(0.3, 0.0032)), Ev(onCornea(0.39, 0.003))],
      reflection: [0, 0.25, 0.5, 0.75, 1].map(onLine),
      margin: [E(-0.094, 0.008), E(-0.02, 0.059), E(0.068, 0.05), E(0.094, 0.019)],
      lashes,
      lowerLashes,
      waterline: [E(0.072, -0.0165), E(0.03, -0.0255), E(-0.03, -0.0235), E(-0.07, -0.011)],
      pupil: { c: E(IC[0], IC[1]), top: E(IC[0], IC[1] + 0.38 * IR[1]), side: E(IC[0] + 0.38 * IR[0], IC[1]) },
      fibres,
      dome: [Ev(CA), Ev(CB), Ev(CC), E(0.079, -0.014), E(0.085, 0.006), E(0.079, 0.026)],
      // A row high over the pupil and the upper iris, well behind the cornea's arc.
      catchesClose: [E(0.0702, 0.015), E(0.0662, 0.0186), E(0.0621, 0.0204), E(0.058, 0.021)],
      jewels: Array.from({ length: 7 }, (_, i) => Ev(alongPoly(arcIn, lerp(0.1, 0.88, i / 6)))),
    },
  };
};
