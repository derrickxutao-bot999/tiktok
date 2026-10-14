// Ball surface patterns, built once on a unit sphere and projected onto the
// unit disc. The ball rolls about the camera's view axis, so its visible face
// is always the same hemisphere: a roll is a pure 2D rotation of these
// drawings, which is exactly what the screen shows.
//
// Coordinates are SVG-style (y down), radius 1, centred on the ball.

type V3 = [number, number, number];
export type Pt = [number, number];

const norm3 = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const add3 = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const lerp3 = (a: V3, b: V3, u: number): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];

/** A fixed tilt so that neither pattern faces the camera symmetrically. */
const orient = (rx: number, ry: number, rz: number) => (p: V3): V3 => {
  let [x, y, z] = p;
  [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
  [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
  [x, y] = [x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz)];
  return [x, y, z];
};

/** Splits a 3D polyline into the runs on the visible hemisphere, projected (y down). */
const visibleRuns = (pts: V3[], minZ = 0.02): Pt[][] => {
  const runs: Pt[][] = [];
  let cur: Pt[] = [];
  for (const p of pts) {
    if (p[2] > minZ) cur.push([p[0], -p[1]]);
    else if (cur.length) {
      if (cur.length > 1) runs.push(cur);
      cur = [];
    }
  }
  if (cur.length > 1) runs.push(cur);
  return runs;
};

// ---------------------------------------------------------------- modern ball

/**
 * Six propeller panels: the twelve edges of a cube pushed onto the sphere,
 * each bent into an S. The S is the same whichever way an edge is walked, so
 * every panel gets the same twist.
 */
const buildModern = () => {
  const o = orient(0.62, 0.45, 0.3);
  const verts: V3[] = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) verts.push(norm3([x, y, z]));
  const seams: Pt[][] = [];
  for (let i = 0; i < 8; i++)
    for (let j = i + 1; j < 8; j++) {
      const a = verts[i];
      const b = verts[j];
      if (Math.abs(dot(a, b) - 1 / 3) > 1e-6) continue;
      const n = norm3(cross(a, b));
      const pts: V3[] = [];
      for (let s = 0; s <= 40; s++) {
        const u = s / 40;
        pts.push(o(norm3(add3(norm3(lerp3(a, b, u)), n, 0.24 * Math.sin(2 * Math.PI * u)))));
      }
      seams.push(...visibleRuns(pts));
    }
  return { seams };
};

// ---------------------------------------------------------------- leather ball

/** The 32-panel ball: a truncated icosahedron, its edges stitched. */
const buildLeather = () => {
  const o = orient(0.35, 0.9, -0.2);
  const phi = (1 + Math.sqrt(5)) / 2;
  const base: V3[] = [];
  const signs = (v: V3): V3[] => {
    const out: V3[] = [];
    for (const sx of v[0] ? [-1, 1] : [1]) for (const sy of v[1] ? [-1, 1] : [1]) for (const sz of v[2] ? [-1, 1] : [1]) out.push([v[0] * sx, v[1] * sy, v[2] * sz]);
    return out;
  };
  const cyc = (v: V3): V3[] => [v, [v[1], v[2], v[0]], [v[2], v[0], v[1]]];
  for (const g of [
    [0, 1, 3 * phi],
    [1, 2 + phi, 2 * phi],
    [phi, 2, 2 * phi + 1],
  ] as V3[])
    for (const c of cyc(g)) base.push(...signs(c));
  const verts = base.map(norm3);
  // Edges join vertices 2 apart on the unscaled solid.
  const edges: [number, number][] = [];
  for (let i = 0; i < base.length; i++)
    for (let j = i + 1; j < base.length; j++) {
      const d = Math.hypot(base[i][0] - base[j][0], base[i][1] - base[j][1], base[i][2] - base[j][2]);
      if (Math.abs(d - 2) < 1e-6) edges.push([i, j]);
    }

  const seams: Pt[][] = [];
  const stitches: Pt[][] = [];
  for (const [i, j] of edges) {
    const a = verts[i];
    const b = verts[j];
    const pts: V3[] = [];
    for (let s = 0; s <= 8; s++) pts.push(o(norm3(lerp3(a, b, s / 8))));
    seams.push(...visibleRuns(pts));
    // Cross-stitches: short bars across the seam.
    const n = norm3(cross(a, b));
    for (let s = 1; s < 9; s++) {
      const p = norm3(lerp3(a, b, s / 9));
      const q0 = o(norm3(add3(p, n, 0.03)));
      const q1 = o(norm3(add3(p, n, -0.03)));
      if (q0[2] > 0.08 && q1[2] > 0.08) stitches.push([
        [q0[0], -q0[1]],
        [q1[0], -q1[1]],
      ]);
    }
  }

  // Panels: five or six vertices around each face centre, ordered by angle.
  const centres: { c: V3; n: number }[] = [];
  for (const c of cyc([0, 1, phi])) for (const s of signs(c)) centres.push({ c: norm3(s), n: 5 });
  for (const s of signs([1, 1, 1])) centres.push({ c: norm3(s), n: 6 });
  for (const c of cyc([0, 1 / phi, phi])) for (const s of signs(c)) centres.push({ c: norm3(s), n: 6 });
  const panels: { pts: Pt[]; pent: boolean; tone: number }[] = [];
  centres.forEach(({ c, n }, idx) => {
    const near = verts
      .map((v, i) => ({ i, d: dot(v, c) }))
      .sort((p, q) => q.d - p.d)
      .slice(0, n)
      .map((p) => verts[p.i]);
    const e1 = norm3(cross(c, Math.abs(c[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]));
    const e2 = cross(c, e1);
    near.sort((p, q) => Math.atan2(dot(p, e2), dot(p, e1)) - Math.atan2(dot(q, e2), dot(q, e1)));
    const ring: V3[] = [];
    near.forEach((p, k) => {
      const q = near[(k + 1) % n];
      for (let s = 0; s < 4; s++) ring.push(o(norm3(lerp3(p, q, s / 4))));
    });
    // Only panels fully on the visible side are tinted; the base tone covers the rest.
    if (ring.every((p) => p[2] > 0.01)) panels.push({ pts: ring.map((p) => [p[0], -p[1]] as Pt), pent: n === 5, tone: ((idx * 37) % 11) / 10 });
  });

  // Scuffs: abraded patches where the leather has worn pale.
  const scuffs: Pt[][] = [];
  [
    [0.25, -0.35, 0.16],
    [-0.42, 0.2, 0.11],
    [0.1, 0.48, 0.09],
    [-0.15, -0.6, 0.07],
    [0.55, 0.15, 0.06],
  ].forEach(([x, y, r], q) => {
    const pts: Pt[] = [];
    for (let s = 0; s < 14; s++) {
      const a = (s / 14) * Math.PI * 2;
      const rr = r * (1 + 0.35 * Math.sin(a * 3 + q) + 0.2 * Math.sin(a * 5 + 2 * q));
      pts.push([x + Math.cos(a) * rr * 1.3, y + Math.sin(a) * rr * 0.8]);
    }
    scuffs.push(pts);
  });
  const scratches: Pt[][] = [
    [
      [-0.5, -0.1],
      [-0.2, -0.22],
    ],
    [
      [0.3, 0.3],
      [0.52, 0.42],
    ],
    [
      [0.05, -0.15],
      [0.18, 0.05],
    ],
  ];
  return { seams, stitches, panels, scuffs, scratches };
};

export const MODERN = buildModern();
export const LEATHER = buildLeather();

/** A list of polylines -> path string, rotated by `rot` (radians, clockwise on screen) and scaled by r. */
export const polyPath = (lines: Pt[][], r: number, rot: number, close = false) => {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  let d = "";
  for (const line of lines) {
    line.forEach(([x, y], i) => {
      d += `${i ? "L" : "M"}${(r * (x * c - y * s)).toFixed(2)} ${(r * (x * s + y * c)).toFixed(2)}`;
    });
    if (close) d += "Z";
  }
  return d;
};
