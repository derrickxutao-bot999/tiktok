// The head in profile, facing +x, authored in head units (1 = head radius,
// origin at the head centre, y up) and rotated by the head pitch. A boy's
// head (look.head > 1) gets a rounder cranium and a smaller, softer face.
//
// Hair and beard are graphic shapes with their own contour. Inside them,
// engraved hairlines (clipped to the shape by Face) give them grain: short
// cuts carry concentric lines that follow the skull like the guilloche of a
// watch dial; long hair carries flow lines from the crown to its tips.

import { Beard, Hair, Look } from "../../lib/eras";
import { clamp, hash2, lerp, smoothstep } from "../../lib/math";
import { Frame, Pt, inFrame } from "./geom";

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
  // 2006: to the collar, over the ears, layered at the ends; tails are
  // authored as if the head were upright (they hang, see `swept`).
  long: {
    arc: [[18, 0.04], [36, 0.12], [75, 0.13], [120, 0.14], [160, 0.15], [192, 0.15]],
    tail: [[-1.1, -0.5, 0], [-1.06, -1.0, 0], [-0.98, -1.5, 1], [-0.86, -1.32, 0], [-0.72, -1.4, 1], [-0.6, -1.18, 0]],
    inner: [[-0.4, -1.0, 0], [-0.18, -0.86, 0], [0.0, -0.92, 1], [0.06, -0.55, 0], [0.12, -0.1, 0], [0.18, 0.2, 0], [0.44, 0.33, 0], [0.7, 0.27, 0], [0.81, 0.3, 1]],
    sweep: 0.04,
    coversEar: true,
    flow: [
      [[0.3, 0.98], [-0.42, 0.88], [-0.92, 0.36], [-1.04, -0.5], [-0.98, -1.4]],
      [[0.46, 0.84], [-0.24, 0.74], [-0.74, 0.34], [-0.9, -0.46], [-0.84, -1.28]],
      [[0.56, 0.66], [0.0, 0.58], [-0.5, 0.26], [-0.7, -0.5], [-0.7, -1.3]],
      [[0.6, 0.52], [0.12, 0.42], [-0.28, 0.12], [-0.46, -0.5], [-0.46, -1.08]],
      [[0.66, 0.44], [0.32, 0.34], [0.12, 0.04], [0.04, -0.44], [0.0, -0.86]],
      [[0.72, 0.42], [0.5, 0.36], [0.28, 0.22]],
    ],
  },
  // 2004: a fuller mop to the middle of the neck, a long fringe down to the brow.
  mop: {
    arc: [[10, 0.04], [30, 0.16], [70, 0.17], [115, 0.17], [155, 0.17], [192, 0.15]],
    tail: [[-1.08, -0.42, 0], [-1.02, -0.72, 0], [-0.96, -0.94, 1], [-0.84, -0.84, 0], [-0.7, -0.9, 1], [-0.58, -0.78, 0]],
    inner: [[-0.36, -0.7, 0], [-0.16, -0.58, 0], [-0.02, -0.62, 1], [0.06, -0.3, 0], [0.12, -0.02, 0], [0.2, 0.16, 0], [0.46, 0.2, 0], [0.68, 0.11, 0], [0.86, 0.05, 1], [0.88, 0.2, 0]],
    sweep: 0.03,
    coversEar: true,
    flow: [
      [[0.4, 0.98], [-0.32, 0.9], [-0.86, 0.34], [-1.0, -0.4], [-0.94, -0.86]],
      [[0.6, 0.72], [0.0, 0.72], [-0.55, 0.3], [-0.78, -0.4], [-0.72, -0.84]],
      [[0.5, 0.6], [-0.1, 0.5], [-0.42, 0.14], [-0.5, -0.36], [-0.44, -0.66]],
      [[0.42, 0.66], [0.66, 0.46], [0.84, 0.12]],
      [[0.22, 0.6], [0.5, 0.4], [0.68, 0.14]],
      [[0.1, 0.5], [0.3, 0.3], [0.44, 0.22]],
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
  eye: {
    upper: Pt[];
    lower: Pt[];
    crease: Pt[];
    /** The open eye between the lids (for the sclera and to clip the iris). */
    opening: Pt[];
    /** The cornea's bulge in profile, where the light sits. */
    cornea: Pt[];
    /** Iris seen edge-on: a narrow ellipse (centre, vertical axis end, horizontal axis end). */
    iris: { c: Pt; top: Pt; side: Pt };
    /** The point of light, and the floodlights caught along the cornea (main one first). */
    light: Pt;
    catches: Pt[];
    /** The touchline, reflected as a sliver across the lower cornea. */
    reflection: Pt[];
  };
};

/** Head geometry in world metres. `phase` (the step phase) moves long hair. */
export const headGeometry = (look: Look, frame: Frame, phase: number): HeadGeo => {
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

  const hs = HAIR[look.hair];
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

  // The eye sits a little lower and larger on a child's face.
  const ex = lerp(0.63, 0.6, c);
  const ey = lerp(-0.03, -0.13, c);
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
    lines.push({ pts: [L([-0.04, -0.66, 0], [-0.02, -0.62, 0]), L([-0.08, -0.46, 0], [-0.07, -0.44, 0])], weight: 0.35 });
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

  // Long hair carries flow lines from the crown to its tips.
  const strands = (hs.flow ?? []).map((l, i) => ({ pts: l.map(([x, y]) => swept(x, y)), weight: 0.48 - 0.04 * i }));

  const es = 1.15;
  const E = (x: number, y: number) => P(ex + x * es, ey + y * es);

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
    eye: {
      upper: [E(-0.1, 0.0), E(-0.02, 0.05), E(0.07, 0.04), E(0.098, 0.01)],
      lower: [E(-0.09, -0.008), E(0.0, -0.032), E(0.078, -0.02)],
      crease: [E(-0.08, 0.064), E(0.0, 0.092), E(0.068, 0.076)],
      opening: [E(-0.1, 0.0), E(-0.02, 0.05), E(0.07, 0.04), E(0.098, 0.01), E(0.1, -0.004), E(0.078, -0.02), E(0.0, -0.032), E(-0.09, -0.008)],
      cornea: [E(0.072, 0.034), E(0.1, 0.004), E(0.076, -0.024)],
      iris: { c: E(0.062, 0.003), top: E(0.062, 0.044), side: E(0.075, 0.003) },
      light: E(0.083, 0.024),
      catches: [E(0.083, 0.024), E(0.0915, 0.015), E(0.097, 0.0055), E(0.0995, -0.0035)],
      reflection: [E(0.07, -0.013), E(0.088, -0.0105), E(0.097, -0.005)],
    },
  };
};
