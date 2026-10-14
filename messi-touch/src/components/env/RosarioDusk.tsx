// Rosario dusk: the beginning. One smooth sky from violet to amber, a big
// low sun cut by horizontal slits, flat layers of barrio in atmospheric
// perspective (houses, a water tank, eucalyptus, drooping power lines), a
// crumbling brick wall backlit by the sun, and red dirt raked by low light:
// ruts converging on the vanishing point, pebbles with long shadows, foot
// scuffs and a hand-chalked line. At long lenses the distance melts out of
// focus exactly as the stadium does on the other side of the match cut.

import React from "react";
import { clamp } from "../../lib/math";
import { PALETTE } from "../../lib/palette";
import { scene4Shot } from "../../lib/shots";
import { HEIGHT, WIDTH } from "../../lib/timeline";
import { Camera, D0, LINE_WIDTH, LINE_Z, cameraFromShot, project } from "../../lib/world";
import { defocus, ellipsePath, fbm, groundRow, hash3, lod, mix, n2, nearGroundZ, onScreen, pxPerM, rowAtElevation, vnoise, xRangeAt } from "./common";

const D = PALETTE["rosario-dusk"];
const L = D.light;

/** The crumbling brick wall behind the far touchline: courses of bricks in running bond. */
export const WALL = { z: 12, courses: 7, course: 0.075, brick: 0.24, mortar: 0.011 } as const;
/** The sun, at infinity: tangents of azimuth and elevation, and angular radius. */
export const SUN = { az: 0.1, el: 0.066, r: 0.072 } as const;
/** Street furniture: poles along a street with wires drooping between them. */
const POLE = { z: 38, spacing: 33, phase: 9, h: 8.6 } as const;

type DuskProps = { cam: Camera; t: number; id: string };

/** Atmospheric perspective: silhouettes lighten towards the horizon colour with depth. */
const airColor = (z: number) => mix(D.trees, mix(D.skyHorizon, D.skyMid, 0.35), 1 - Math.exp(-z / 210));

/** Depth of field for the long lenses: 0 in the wide shots (crisp poster silhouettes), 1 from the close-up's scale. */
const lensSoft = (cam: Camera) => lod(pxPerM(cam), 550, 1100);

// ---------------------------------------------------------------- keeping the sun clear

/** World x swept by the dusk camera (Scene 4 from the match cut to the end). */
const DUSK_CAM_X = (() => {
  let lo = Infinity;
  let hi = -Infinity;
  for (let f = 300; f <= 900; f += 2) {
    const x = cameraFromShot(scene4Shot(f)).x;
    lo = Math.min(lo, x);
    hi = Math.max(hi, x);
  }
  return [lo, hi] as const;
})();

/** Would anything spanning [x0, x1] at depth z pass in front of the sun from any of those cameras? */
const crossesSun = (x0: number, x1: number, z: number) =>
  x1 >= DUSK_CAM_X[0] + (SUN.az - 1.4 * SUN.r) * z && x0 <= DUSK_CAM_X[1] + (SUN.az + 1.4 * SUN.r) * z;

// ---------------------------------------------------------------- barrio skyline

/** Compact number for dense foliage paths (a tenth of a pixel is plenty). */
const n1 = (v: number) => (Math.round(v * 10) / 10).toString();

const poly = (pts: { x: number; y: number }[]) => pts.map((p, i) => `${i ? "L" : "M"}${n2(p.x)} ${n2(p.y)}`).join("") + "Z";

/** Low houses along a street at depth z, as one silhouette path, plus a few lit windows and roof masts. */
const housesPath = (cam: Camera, z: number, seed: number) => {
  const [xa, xb] = xRangeAt(cam, z, 30);
  const cell = 9;
  const parts: string[] = [];
  const windows: string[] = [];
  const masts: string[] = [];
  const P = (x: number, y: number) => project(cam, x, y, z);
  for (let i = Math.floor(xa / cell) - 1; i <= Math.ceil(xb / cell); i++) {
    const s = (a: number) => hash3(i, seed, a);
    if (s(1) < 0.12) continue;
    const x0 = i * cell + s(2) * 2.5;
    const w = 5 + s(3) * 6;
    const hgt = 2.6 + s(4) * 2.6;
    const pts: [number, number][] = [
      [x0, 0],
      [x0, hgt],
    ];
    if (s(5) < 0.35) {
      // Shed roof of corrugated sheet.
      pts.push([x0 + w, hgt + 0.7]);
    } else {
      // Flat roof with a parapet and sometimes a small tank.
      pts.push([x0 + w * 0.2, hgt], [x0 + w * 0.2, hgt + 0.25], [x0 + w * 0.8, hgt + 0.25], [x0 + w * 0.8, hgt]);
      if (s(6) < 0.4) {
        const tx = x0 + w * (0.3 + 0.3 * s(7));
        pts.splice(pts.length - 2, 0, [tx, hgt + 0.25], [tx, hgt + 1.35], [tx + 1.2, hgt + 1.35], [tx + 1.2, hgt + 0.25]);
      }
      pts.push([x0 + w, hgt]);
    }
    pts.push([x0 + w, 0]);
    parts.push(poly(pts.map(([x, y]) => P(x, y))));
    if (s(9) < 0.3) {
      const a = P(x0 + w * (0.2 + 0.5 * s(10)), 1.7);
      const b = P(x0 + w * (0.2 + 0.5 * s(10)) + 0.8, 1.05);
      windows.push(`M${n2(a.x)} ${n2(a.y)}H${n2(b.x)}V${n2(b.y)}H${n2(a.x)}Z`);
    }
    // A television mast: a hairline with two crossbars.
    if (s(8) < 0.28) {
      const mx = x0 + w * (0.55 + 0.3 * s(11));
      const top = hgt + 2.4 + 1.6 * s(12);
      const a = P(mx, hgt);
      const b = P(mx, top);
      masts.push(`M${n2(a.x)} ${n2(a.y)}L${n2(b.x)} ${n2(b.y)}`);
      [0.92, 0.78].forEach((u, q) => {
        const c0 = P(mx - 0.55 + q * 0.15, hgt + (top - hgt) * u);
        const c1 = P(mx + 0.55 - q * 0.15, hgt + (top - hgt) * u);
        masts.push(`M${n2(c0.x)} ${n2(c0.y)}L${n2(c1.x)} ${n2(c1.y)}`);
      });
    }
  }
  return { solid: parts.join(""), windows: windows.join(""), masts: masts.join("") };
};

/** The barrio's elevated water tank: a drum with a cone roof on four splayed legs. */
const waterTank = (cam: Camera, x: number, z: number) => {
  const P = (dx: number, y: number) => project(cam, x + dx, y, z);
  const legs = [-1, 1]
    .map((s) => {
      const a = P(s * 3.6, 0);
      const b = P(s * 2.2, 16);
      const w = Math.max(0.7, 0.35 * a.k);
      return `M${n2(a.x - w)} ${n2(a.y)}L${n2(b.x - w * 0.6)} ${n2(b.y)}L${n2(b.x + w * 0.6)} ${n2(b.y)}L${n2(a.x + w)} ${n2(a.y)}Z`;
    })
    .join("");
  const body = poly([P(-3.2, 15.6), P(3.2, 15.6), P(3.2, 21), P(0, 23.4), P(-3.2, 21)]);
  // Cross bracing between the legs, hairlines.
  const brace: string[] = [];
  [4, 8, 12].forEach((y, q) => {
    const wl = 3.6 - (1.4 * y) / 16;
    const wl2 = 3.6 - (1.4 * (y + 4)) / 16;
    const a = P(-wl, y);
    const b = P(wl2, y + 4);
    const c = P(wl, y);
    const d = P(-wl2, y + 4);
    brace.push(`M${n2(a.x)} ${n2(a.y)}L${n2(b.x)} ${n2(b.y)}M${n2(c.x)} ${n2(c.y)}L${n2(d.x)} ${n2(d.y)}`);
    if (q === 0) {
      const e = P(-wl, y);
      const f = P(wl, y);
      brace.push(`M${n2(e.x)} ${n2(e.y)}L${n2(f.x)} ${n2(f.y)}`);
    }
  });
  return { solid: legs + body, brace: brace.join("") };
};

/** Horizontal reach of a eucalyptus crown, m (for culling and for the sun corridor). */
const CROWN = 9;

/**
 * A eucalyptus: a tall pale trunk forking into steep, bowed limbs, finer
 * branches as hairlines, and foliage that hangs: strands of thin crescent
 * leaves dropping from every twig, with sky showing through.
 */
const eucalyptus = (cam: Camera, x: number, z: number, seed: number) => {
  const s = (a: number) => hash3(seed, 7, a);
  const H = 15 + 9 * s(1);
  const P = (dx: number, y: number) => project(cam, x + dx, y, z);
  const k = cam.f / z;
  const limbs: string[] = [];
  const twigs: string[] = [];
  const leaves: string[] = [];
  const strandLines: string[] = [];
  let salt = 0;
  const rnd = () => hash3(seed, 11, salt++);

  /** One leaf strand from (sx, sy) to (ex, ey), bowed to its left; as a crescent, or a hairline when tiny. */
  const leaf = (sx: number, sy: number, ex: number, ey: number, bow: number) => {
    const len = Math.hypot(ex - sx, ey - sy);
    // Always traverse with the bow on the left of travel, so every crescent winds the same way.
    const [ax, ay, bx, by] = bow >= 0 ? [sx, sy, ex, ey] : [ex, ey, sx, sy];
    const b = Math.abs(bow) * len;
    const nx = -(by - ay) / len;
    const ny = (bx - ax) / len;
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    const A = P(ax, ay);
    const B = P(bx, by);
    const outer = P(mx + nx * b, my + ny * b);
    // Below this size a crescent would be thinner than its hairline stand-in.
    if (len * k < 14) {
      strandLines.push(`M${n1(A.x)} ${n1(A.y)}Q${n1(outer.x)} ${n1(outer.y)} ${n1(B.x)} ${n1(B.y)}`);
      return;
    }
    const inner = P(mx + nx * b * 0.35, my + ny * b * 0.35);
    leaves.push(`M${n1(A.x)} ${n1(A.y)}Q${n1(outer.x)} ${n1(outer.y)} ${n1(B.x)} ${n1(B.y)}Q${n1(inner.x)} ${n1(inner.y)} ${n1(A.x)} ${n1(A.y)}Z`);
  };

  /**
   * Foliage hanging from a twig tip: a fan of strands, mostly straight down.
   * Each clump draws from its own hash stream, so the tree's shape never
   * depends on how much of it the lens resolves.
   */
  const strands = (x1: number, y1: number, R: number, clump: number) => {
    const q = (i: number, c: number) => hash3(seed * 131 + clump, i, c);
    const n = R * k < 6 ? 5 : 12 + Math.floor(q(0, 0) * 8);
    for (let i = 1; i <= n; i++) {
      const a = -Math.PI / 2 + (q(i, 1) - 0.5) * 1.9;
      const len = R * (0.5 + 0.7 * q(i, 2));
      const sx = x1 + (q(i, 3) - 0.5) * R * 0.6;
      const sy = y1 + (q(i, 4) - 0.2) * R * 0.35;
      leaf(sx, sy, sx + Math.cos(a) * len, sy + Math.sin(a) * len, (q(i, 5) < 0.5 ? -1 : 1) * (0.12 + 0.18 * q(i, 6)));
    }
  };

  const branch = (x0: number, y0: number, ang: number, len: number, w: number, depth: number) => {
    const bow = (rnd() - 0.5) * 0.25 * len;
    const x1 = x0 + Math.cos(ang) * len;
    const y1 = y0 + Math.sin(ang) * len;
    const mx = (x0 + x1) / 2 - Math.sin(ang) * bow;
    const my = (y0 + y1) / 2 + Math.cos(ang) * bow;
    const w1 = w * 0.62;
    if (w * k > 0.7) {
      // A tapered limb, up the left flank and down the right.
      const nx = -Math.sin(ang);
      const ny = Math.cos(ang);
      limbs.push(
        poly([
          P(x0 + nx * w, y0 + ny * w),
          P(mx + nx * (w + w1) * 0.5, my + ny * (w + w1) * 0.5),
          P(x1 + nx * w1, y1 + ny * w1),
          P(x1 - nx * w1, y1 - ny * w1),
          P(mx - nx * (w + w1) * 0.5, my - ny * (w + w1) * 0.5),
          P(x0 - nx * w, y0 - ny * w),
        ]),
      );
    } else {
      const a0 = P(x0, y0);
      const am = P(mx, my);
      const a1 = P(x1, y1);
      twigs.push(`M${n2(a0.x)} ${n2(a0.y)}Q${n2(am.x)} ${n2(am.y)} ${n2(a1.x)} ${n2(a1.y)}`);
    }
    if (depth <= 2) strands(x1, y1, H * (0.05 + 0.03 * rnd()) * (depth === 0 ? 1 : depth === 1 ? 0.8 : 0.6), salt);
    if (depth === 0) return;
    const kids = depth >= 3 ? 2 + Math.floor(rnd() * 2) : 2;
    for (let i = 0; i < kids; i++) {
      const spread = (i / (kids - 1) - 0.5) * (0.75 + 0.4 * rnd());
      branch(x1, y1, ang + spread + (rnd() - 0.5) * 0.3, len * (0.6 + 0.18 * rnd()), w1, depth - 1);
    }
  };
  branch(0, 0, Math.PI / 2 + (s(2) - 0.5) * 0.14, H * (0.36 + 0.1 * s(3)), 0.32, 4);
  return { limbs: limbs.join(""), twigs: twigs.join(""), leaves: leaves.join(""), strands: strandLines.join("") };
};

// ---------------------------------------------------------------- the wall

/** Where the wall has fallen in just behind the touch: the sun shows through it in the close-up. */
const BREACH = { x: 0.6, half: 0.62, depth: 4.6 } as const;

/** 0..1: how deep into the breach x lies. */
const breachAt = (x: number) => Math.max(0, 1 - Math.abs(x - BREACH.x) / BREACH.half);

/** Standing height of the wall at x, in courses: long intact runs, a ragged top, the odd breach. */
const wallHeight = (x: number) => {
  let h = WALL.courses + 0.3 - Math.max(0, 2.6 * fbm(x * 0.55, 78) + 0.15);
  const breach = vnoise(x / 5.5, 77);
  if (breach > 0.4) h -= (breach - 0.4) * 14;
  // Its edges are ragged: courses give way at uneven lengths, never in a clean staircase.
  const v = breachAt(x);
  h -= BREACH.depth * Math.pow(v, 0.8) + 1.6 * vnoise(x * 6.5, 79) * Math.min(1, v * 4);
  return clamp(h, 1.2, WALL.courses);
};

type Brick = { x0: number; x1: number };

/** Bricks of course c in running bond, with a little per-brick irregularity at the broken top. */
const bricksOf = (c: number, u0: number, u1: number) => {
  const off = (c % 2) * (WALL.brick / 2);
  const out: Brick[] = [];
  for (let i = u0; i <= u1; i++) {
    const x0 = i * WALL.brick + off;
    const x1 = x0 + WALL.brick;
    const xm = (x0 + x1) / 2;
    // Loose bricks: the wall's edge is most irregular where it has fallen in.
    if (c + 0.5 < wallHeight(xm) + (hash3(i, c, 81) - 0.5) * (0.4 + 1.2 * breachAt(xm))) out.push({ x0, x1 });
  }
  return out;
};

/** A fracture from (xa, ya) to (xb, yb): a few jagged steps, never a ruled line. */
const fracture = (xa: number, ya: number, xb: number, yb: number, seed: number): [number, number][] => {
  const pts: [number, number][] = [[xa, ya]];
  for (let q = 1; q < 4; q++) {
    const u = (q + (hash3(seed, q, 83) - 0.5) * 0.5) / 4;
    pts.push([xa + (xb - xa) * u, ya + (yb - ya) * u + (hash3(seed, q, 84) - 0.5) * WALL.course * 0.3]);
  }
  pts.push([xb, yb]);
  return pts;
};

/**
 * The wall as geometry: its silhouette (bricks unioned; exposed top bricks
 * chipped, and halved or broken along jagged diagonals where a run ends), the
 * mortar joints, and the edges the low sun catches.
 */
const wallGeometry = (cam: Camera) => {
  const [xa, xb] = xRangeAt(cam, WALL.z, 30);
  const u0 = Math.floor(xa / WALL.brick) - 1;
  const u1 = Math.ceil(xb / WALL.brick) + 1;
  const P = (x: number, y: number) => project(cam, x, y, WALL.z);
  const k = cam.f / WALL.z;
  const rows = Array.from({ length: WALL.courses }, (_, c) => bricksOf(c, u0, u1));
  const has = (c: number, x: number) => c >= 0 && c < WALL.courses && rows[c].some((b) => b.x0 <= x && x < b.x1);
  const line = (pts: [number, number][]) =>
    pts
      .map(([x, y], i) => {
        const p = P(x, y);
        return `${i ? "L" : "M"}${n2(p.x)} ${n2(p.y)}`;
      })
      .join("");
  const body: string[] = [];
  const rim: string[] = [];
  const shade: string[] = [];
  const joints: string[] = [];
  const cy = WALL.course;
  const half = WALL.brick / 2;
  const showJoints = WALL.brick * k > 12;
  rows.forEach((row, c) => {
    const y0 = c * cy;
    const y1 = y0 + cy;
    row.forEach((b, q) => {
      const seed = Math.round(b.x0 * 1000) * 13 + c;
      const s = (a: number) => hash3(seed, c, 90 + a);
      const mid = b.x0 + half;
      const leftOpen = !has(c + 1, b.x0 + 0.01);
      const rightOpen = !has(c + 1, b.x1 - 0.01);
      // Bricks break where a run ends; along an intact top they are only chipped.
      const prev = row[q - 1];
      const next = row[q + 1];
      const runEnd = !prev || prev.x1 < b.x0 - 1e-6 || !next || next.x0 > b.x1 + 1e-6;
      const broken = leftOpen && rightOpen && runEnd;
      // The top edge, left to right.
      let top: [number, number][];
      let x0 = b.x0;
      let x1 = b.x1;
      if (broken && s(1) < 0.45) {
        const drop = cy * (0.35 + 0.45 * s(2));
        top = s(3) < 0.5 ? fracture(b.x0, y1, b.x1, y1 - drop, seed) : fracture(b.x0, y1 - drop, b.x1, y1, seed);
      } else if (broken && s(1) < 0.8) {
        // Half a brick left, its broken end ragged.
        const m = b.x0 + WALL.brick * (0.42 + 0.2 * s(5));
        const j = cy * (0.15 + 0.35 * s(6));
        if (s(4) < 0.5) {
          x1 = m;
          top = [[b.x0, y1 - 0.004], [m - 0.025, y1], [m, y1 - j]];
        } else {
          x0 = m;
          top = [[m, y1 - j], [m + 0.025, y1], [b.x1, y1 - 0.004]];
        }
      } else {
        // Exposed corners wear round; at the end of a run they are knocked off.
        const cl = leftOpen && (runEnd || s(7) < 0.4) ? (runEnd ? 0.02 + 0.03 * s(10) : 0.004 + 0.014 * s(10)) : 0;
        const cr = rightOpen && (runEnd || s(8) < 0.4) ? (runEnd ? 0.02 + 0.03 * s(11) : 0.004 + 0.014 * s(11)) : 0;
        top = [[b.x0, y1 - cl * 0.7], [b.x0 + cl, y1], [b.x1 - cr, y1], [b.x1, y1 - cr * 0.7]];
      }
      body.push(line([[x0, y0], ...top, [x1, y0]]) + "Z");
      // Weathering: some bricks sit darker in the face.
      if (s(9) < 0.22) shade.push(line([[x0, y0], ...top, [x1, y0]]) + "Z");
      // The sun is low behind the wall: the exposed tops catch it.
      if (leftOpen || rightOpen) {
        const lit = top.filter(([x]) => (leftOpen || x >= mid - 1e-6) && (rightOpen || x <= mid + 1e-6));
        if (!leftOpen) lit.unshift([mid, y1]);
        if (!rightOpen) lit.push([mid, y1]);
        if (lit.length > 1) rim.push(line(lit));
      }
      // ...and so do the ends facing it, where the wall steps down to the right.
      if ((!next || next.x0 > b.x1 + 1e-6) && rightOpen && x1 === b.x1) rim.push(line([[b.x1, y0 + cy * 0.15], top[top.length - 1]]));
      if (showJoints && c > 0) joints.push(line([[x0, y0], [x1, y0]]));
      if (showJoints && q > 0 && row[q - 1].x1 >= b.x0 - 1e-6 && x0 === b.x0) joints.push(line([[b.x0, y0], [b.x0, y1 - (leftOpen ? 0.012 : 0)]]));
    });
  });
  return { body: body.join(""), shade: shade.join(""), rim: rim.join(""), joints: joints.join("") };
};

// ---------------------------------------------------------------- dust in the air

type Mote = { x: number; y: number; r: number; o: number };

/** Sideways drift of a mote, m (amplitude of its sway). */
const MOTE_SWAY = 0.3;

/**
 * Dust motes adrift in the low sun, at a fixed density in the world: a wide
 * shot sees dozens of points of light, a long lens only a few, spread into
 * large faint discs (an answer to the stadium's bokeh). Which motes exist
 * depends only on their hash, never on time, so none pop; the glint only
 * modulates opacity.
 */
const motes = (cam: Camera, t: number, zMin: number, zMax: number, density: number, cell: number): Mote[] => {
  const out: Mote[] = [];
  const sun = { x: cam.cx + SUN.az * cam.f, y: rowAtElevation(cam, SUN.el) };
  for (let j = Math.floor(zMin / cell); j < Math.ceil(zMax / cell); j++) {
    const z0 = (j + 0.5) * cell;
    // Cull by where a mote of this row could possibly be drawn: its disc
    // (largest at the near edge of the row), its sway, and one cell of slack
    // for its depth jitter. A mote leaves the frame only by drifting out of it.
    const rMax = Math.max(0.9, defocus(cam, Math.max(0.05, z0 - cell / 2), 6), defocus(cam, z0 + cell / 2, 6));
    const [xa, xb] = xRangeAt(cam, z0, rMax * 1.6 + 4);
    const pad = MOTE_SWAY + cell;
    for (let i = Math.floor((xa - pad) / cell); i <= Math.ceil((xb + pad) / cell); i++) {
      const s = (a: number) => hash3(i, j, Math.round(170 + cell * 64) + a);
      // A density that changes with the lens thins motes out by fading them, never by cutting.
      const keep = clamp((density - s(1)) / (0.2 * density));
      if (keep <= 0) continue;
      const z = z0 + (s(2) - 0.5) * cell;
      if (z < zMin || z > zMax) continue;
      const x = (i + s(3)) * cell + MOTE_SWAY * Math.sin(t * (0.2 + 0.2 * s(4)) + 6.28 * s(5));
      // Dust hangs thickest just above the ground.
      const y = 0.04 + 2.6 * Math.pow(s(6), 2.2) + 0.08 * Math.sin(t * (0.3 + 0.3 * s(7)) + 6.28 * s(8));
      const p = project(cam, x, y, z);
      const r = Math.max(0.9, defocus(cam, z, 6));
      if (!onScreen(p.x, p.y, r * 1.6)) continue;
      const glint = 0.45 + 0.55 * Math.pow(Math.sin(t * (1.1 + 2 * s(9)) + 6.28 * s(10)) * 0.5 + 0.5, 2);
      // Backlit dust shines brightest near the sun; a blurred mote spreads the same light thinner.
      const ds = Math.hypot(p.x - sun.x, p.y - sun.y) / (0.35 * cam.f);
      const o = keep * glint * (0.5 + 0.5 * s(11)) * clamp(Math.pow(3 / r, 0.3), 0.45, 1) * (0.45 + 0.55 * Math.exp(-ds * ds));
      out.push({ x: p.x, y: p.y, r, o });
    }
  }
  return out;
};

const MoteDefs: React.FC<{ id: string }> = ({ id }) => (
  <>
    <radialGradient id={`${id}-mote`}>
      <stop offset={0} stopColor={D.sun} stopOpacity={1} />
      <stop offset={0.45} stopColor={L.contour} stopOpacity={0.55} />
      <stop offset={1} stopColor={L.glow} stopOpacity={0} />
    </radialGradient>
    <radialGradient id={`${id}-dbok`}>
      <stop offset={0} stopColor={L.contour} stopOpacity={0.62} />
      <stop offset={0.86} stopColor={L.contour} stopOpacity={0.8} />
      <stop offset={1} stopColor={L.glow} stopOpacity={0} />
    </radialGradient>
  </>
);

/** A sharp mote is a glint; out of focus (4-6 px) it cross-fades into a flat bokeh disc. */
const MoteLayer: React.FC<{ list: Mote[]; id: string }> = ({ list, id }) => (
  <g style={{ mixBlendMode: "screen" }}>
    {list.map((m, i) => {
      const w = lod(m.r, 4, 6);
      const glint = m.o * (1 - w);
      const disc = m.o * w;
      return (
        <React.Fragment key={i}>
          {glint > 0.004 ? <circle cx={n2(m.x)} cy={n2(m.y)} r={n2(m.r * 1.6)} fill={`url(#${id}-mote)`} opacity={n2(glint)} /> : null}
          {disc > 0.004 ? <circle cx={n2(m.x)} cy={n2(m.y)} r={n2(m.r)} fill={`url(#${id}-dbok)`} opacity={n2(disc)} /> : null}
        </React.Fragment>
      );
    })}
  </g>
);

/** Dust between the lens and the runner (z < D0): drawn over the athlete by DuskForeground. */
const nearMotes = (cam: Camera, t: number) => [
  ...motes(cam, t, 2.2, 7, 0.03 + 0.5 * lensSoft(cam), 0.25),
  // Same cells and hashes as the far row below, split at the runner's depth.
  ...motes(cam, t, 7, D0, 0.05, 0.5),
];

/** The dust in front of the runner, which hangs between him and the lens. Draw after the athlete and the ball. */
export const DuskForeground: React.FC<DuskProps> = ({ cam, t, id }) => {
  const list = nearMotes(cam, t);
  if (list.length === 0) return null;
  return (
    <g>
      <defs>
        <MoteDefs id={id} />
      </defs>
      <MoteLayer list={list} id={id} />
    </g>
  );
};

// ---------------------------------------------------------------- backdrop

export const DuskBackdrop: React.FC<DuskProps> = ({ cam, t, id }) => {
  const horizon = cam.cy;
  const yTop = rowAtElevation(cam, 0.62);
  const yMid = rowAtElevation(cam, 0.2);
  const midStop = clamp((yMid - yTop) / (horizon - yTop));
  const soft = lensSoft(cam);
  const farBlur = Math.min(25, 0.55 * defocus(cam, 150)) * soft;
  const wallBlur = 0.6 * defocus(cam, WALL.z) * soft;

  const sx = cam.cx + SUN.az * cam.f;
  const sy = rowAtElevation(cam, SUN.el);
  const sr = SUN.r * cam.f;
  // Slits across the lower part of the disc, thickening towards the bottom.
  const slits = Array.from({ length: 6 }, (_, i) => {
    const u = i / 5;
    return { y: sy + sr * (0.16 + 0.72 * Math.pow(u, 0.9)), h: sr * (0.028 + 0.085 * u) };
  });

  const wallBase = groundRow(cam, WALL.z);
  const wall = wallBase > -50 ? wallGeometry(cam) : null;
  const wallTop = project(cam, 0, WALL.courses * WALL.course, WALL.z).y;

  // Silhouette layers, far to near.
  const houseRows = [
    { z: 320, seed: 3 },
    { z: 230, seed: 2 },
    { z: 160, seed: 1 },
  ];
  const [ta, tb] = xRangeAt(cam, 170, 200);
  const tanks: number[] = [];
  for (let m = Math.floor((ta - 26) / 140); m <= Math.ceil((tb - 26) / 140); m++) tanks.push(26 + m * 140);
  const trees: { x: number; z: number; seed: number }[] = [];
  [
    { z: 210, cell: 26, seed: 13 },
    { z: 120, cell: 24, seed: 11 },
    { z: 80, cell: 30, seed: 12 },
    { z: 34, cell: 46, seed: 14 },
  ].forEach((row) => {
    const [a, b] = xRangeAt(cam, row.z, 400);
    for (let i = Math.floor(a / row.cell); i <= Math.ceil(b / row.cell); i++) {
      if (hash3(i, row.seed, 1) < 0.3) continue;
      const x = (i + hash3(i, row.seed, 2)) * row.cell;
      const z = row.z + (hash3(i, row.seed, 3) - 0.5) * 16;
      if (crossesSun(x - CROWN, x + CROWN, z)) continue;
      const p = project(cam, x, 0, z);
      const reach = CROWN * p.k;
      if (p.x < -reach || p.x > WIDTH + reach) continue;
      trees.push({ x, z, seed: i * 97 + row.seed });
    }
  });

  // Poles, kept out of the sun; the wires droop between the poles that remain, deeper over longer spans.
  const [pa, pb] = xRangeAt(cam, POLE.z, 60);
  const poleXs: number[] = [];
  for (let m = Math.floor((pa - POLE.phase) / POLE.spacing) - 3; m <= Math.ceil((pb - POLE.phase) / POLE.spacing) + 3; m++) {
    const x = POLE.phase + m * POLE.spacing;
    if (!crossesSun(x - 1, x + 1, POLE.z)) poleXs.push(x);
  }
  const poles: string[] = [];
  const wires: string[] = [];
  poleXs.forEach((x0, i) => {
    const a = project(cam, x0, 0, POLE.z);
    const b = project(cam, x0, POLE.h, POLE.z);
    const w = Math.max(0.6, 0.12 * a.k);
    if (a.x > -40 && a.x < WIDTH + 40) {
      poles.push(`M${n2(a.x - w)} ${n2(a.y)}L${n2(b.x - w * 0.7)} ${n2(b.y)}L${n2(b.x + w * 0.7)} ${n2(b.y)}L${n2(a.x + w)} ${n2(a.y)}Z`);
      const arm0 = project(cam, x0, 8.1, POLE.z - 0.9);
      const arm1 = project(cam, x0, 8.1, POLE.z + 0.9);
      const aw = Math.max(0.6, 0.06 * a.k);
      poles.push(`M${n2(arm0.x)} ${n2(arm0.y - aw)}L${n2(arm1.x)} ${n2(arm1.y - aw)}L${n2(arm1.x)} ${n2(arm1.y + aw)}L${n2(arm0.x)} ${n2(arm0.y + aw)}Z`);
    }
    const x1 = poleXs[i + 1];
    if (x1 === undefined) return;
    const span = x1 - x0;
    const p0 = project(cam, x0, 0, POLE.z);
    const p1 = project(cam, x1, 0, POLE.z);
    if (p1.x < -20 || p0.x > WIDTH + 20) return;
    [
      { y: 8.15, dz: -0.8, sag: 0.9 },
      { y: 8.15, dz: 0, sag: 0.95 },
      { y: 8.15, dz: 0.8, sag: 1.0 },
      { y: 6.6, dz: 0.1, sag: 1.3 },
    ].forEach((wd) => {
      const z = POLE.z + wd.dz;
      const sag = wd.sag * Math.pow(span / POLE.spacing, 1.2);
      const q0 = project(cam, x0, wd.y, z);
      const q1 = project(cam, x1, wd.y, z);
      // A parabola through both ends, sagging by `sag` at mid-span: quadratic control at twice the sag.
      const c = project(cam, (x0 + x1) / 2, wd.y - 2 * sag, z);
      wires.push(`M${n2(q0.x)} ${n2(q0.y)}Q${n2(c.x)} ${n2(c.y)} ${n2(q1.x)} ${n2(q1.y)}`);
    });
  });

  const farMotes = motes(cam, t, WALL.z + 0.5, 45, 0.012, 0.5);
  const kWall = cam.f / WALL.z;
  // Out of focus, the rim keeps its light by spreading wider.
  const rimW = Math.max(clamp(0.004 * kWall, 0.9, 2.4), wallBlur * 1.1);
  const hairW = (z: number) => clamp((0.07 * cam.f) / z, 0.7, 1.4);

  return (
    <g>
      <defs>
        <linearGradient id={`${id}-sky`} gradientUnits="userSpaceOnUse" x1={0} y1={yTop} x2={0} y2={horizon}>
          <stop offset={0} stopColor={D.skyTop} />
          <stop offset={midStop * 0.55} stopColor={mix(D.skyTop, D.skyMid, 0.45)} />
          <stop offset={midStop} stopColor={D.skyMid} />
          <stop offset={midStop + (1 - midStop) * 0.55} stopColor={mix(D.skyMid, D.skyHorizon, 0.6)} />
          <stop offset={1} stopColor={D.skyHorizon} />
        </linearGradient>
        <radialGradient id={`${id}-halo`}>
          <stop offset={0} stopColor={D.haze} stopOpacity={0.75} />
          <stop offset={0.3} stopColor={D.haze} stopOpacity={0.32} />
          <stop offset={1} stopColor={D.skyHorizon} stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${id}-hband`}>
          <stop offset={0} stopColor={D.haze} stopOpacity={0.55} />
          <stop offset={1} stopColor={D.haze} stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`${id}-disc`} x1={0} y1={0} x2={0} y2={1}>
          <stop offset={0} stopColor={D.sun} />
          <stop offset={0.55} stopColor={mix(D.sun, D.haze, 0.55)} />
          <stop offset={1} stopColor={mix(D.haze, D.skyHorizon, 0.55)} />
        </linearGradient>
        <mask id={`${id}-slits`} maskUnits="userSpaceOnUse" x={sx - sr - 2} y={sy - sr - 2} width={2 * sr + 4} height={2 * sr + 4}>
          <rect x={sx - sr - 2} y={sy - sr - 2} width={2 * sr + 4} height={2 * sr + 4} fill="#fff" />
          {slits.map((s, i) => (
            <rect key={i} x={sx - sr - 2} y={s.y - s.h / 2} width={2 * sr + 4} height={s.h} fill="#000" />
          ))}
        </mask>
        <linearGradient id={`${id}-land`} gradientUnits="userSpaceOnUse" x1={0} y1={horizon} x2={0} y2={Math.max(horizon + 1, wallBase)}>
          <stop offset={0} stopColor={mix(D.dirtFar, D.haze, 0.45)} />
          <stop offset={1} stopColor={D.dirtFar} />
        </linearGradient>
        {/* The wall face: lit by the sky from above and by the sun's side towards the right, falling into shade at its foot. */}
        <radialGradient id={`${id}-wall`} gradientUnits="userSpaceOnUse" cx={Math.min(sx, WIDTH * 1.2)} cy={wallTop} r={Math.max(WIDTH * 1.3, (wallBase - wallTop) * 2)}>
          <stop offset={0} stopColor={mix(D.wall, L.bodyLit, 0.75)} />
          <stop offset={0.45} stopColor={mix(D.wall, L.bodyLit, 0.3)} />
          <stop offset={1} stopColor={mix(D.wall, L.bodyFar, 0.5)} />
        </radialGradient>
        <linearGradient id={`${id}-wallfoot`} gradientUnits="userSpaceOnUse" x1={0} y1={wallTop} x2={0} y2={wallBase}>
          <stop offset={0.35} stopColor={L.bodyFar} stopOpacity={0} />
          <stop offset={1} stopColor={L.bodyFar} stopOpacity={0.55} />
        </linearGradient>
        <radialGradient id={`${id}-rimglow`} gradientUnits="userSpaceOnUse" cx={sx} cy={sy} r={Math.max(sr * 2.5, WIDTH * 0.6)}>
          <stop offset={0} stopColor={D.sun} stopOpacity={0.5} />
          <stop offset={0.5} stopColor={L.glow} stopOpacity={0.22} />
          <stop offset={1} stopColor={L.glow} stopOpacity={0.1} />
        </radialGradient>
        <MoteDefs id={id} />
        {farBlur > 1 ? (
          <filter id={`${id}-far`} filterUnits="userSpaceOnUse" x={-100} y={-100} width={WIDTH + 200} height={HEIGHT + 200}>
            <feGaussianBlur stdDeviation={n2(farBlur)} />
          </filter>
        ) : null}
        {wallBlur > 1 ? (
          <filter id={`${id}-wb`} filterUnits="userSpaceOnUse" x={-100} y={wallTop - 200} width={WIDTH + 200} height={wallBase - wallTop + 400}>
            <feGaussianBlur stdDeviation={n2(wallBlur)} />
          </filter>
        ) : null}
      </defs>

      <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill={`url(#${id}-sky)`} />
      <ellipse cx={sx} cy={horizon} rx={Math.max(WIDTH, sr * 9)} ry={Math.max(60, sr * 1.3)} fill={`url(#${id}-hband)`} />
      <circle cx={sx} cy={sy} r={sr * 4.2} fill={`url(#${id}-halo)`} />
      <rect x={0} y={horizon} width={WIDTH} height={Math.max(0, Math.min(HEIGHT, wallBase) - horizon)} fill={`url(#${id}-land)`} />

      <g filter={farBlur > 1 ? `url(#${id}-far)` : undefined}>
        <circle cx={sx} cy={sy} r={sr} fill={`url(#${id}-disc)`} mask={`url(#${id}-slits)`} />
        {houseRows.map((r) => {
          const h = housesPath(cam, r.z, r.seed);
          return (
            <g key={r.z}>
              <path d={h.solid} fill={airColor(r.z)} />
              <path d={h.masts} stroke={airColor(r.z)} strokeWidth={hairW(r.z)} fill="none" />
              <path d={h.windows} fill={D.sun} opacity={0.75} />
            </g>
          );
        })}
        {tanks.map((x) => {
          const g = waterTank(cam, x, 170);
          return (
            <g key={x}>
              <path d={g.solid} fill={airColor(170)} />
              <path d={g.brace} stroke={airColor(170)} strokeWidth={Math.max(0.6, (0.15 * cam.f) / 170)} fill="none" />
            </g>
          );
        })}
        {trees.map((tr) => {
          const g = eucalyptus(cam, tr.x, tr.z, tr.seed);
          const c = airColor(tr.z);
          return (
            <g key={tr.seed}>
              <path d={g.twigs} stroke={c} strokeWidth={hairW(tr.z)} strokeLinecap="round" fill="none" />
              <path d={g.strands} stroke={c} strokeWidth={0.7} strokeLinecap="round" fill="none" />
              <path d={g.limbs} fill={c} />
              <path d={g.leaves} fill={c} />
            </g>
          );
        })}
        <path d={poles.join("")} fill={airColor(POLE.z)} />
        <path d={wires.join("")} stroke={airColor(POLE.z)} strokeWidth={1} fill="none" />
      </g>

      <MoteLayer list={farMotes} id={id} />

      {wall ? (
        <g filter={wallBlur > 1 ? `url(#${id}-wb)` : undefined}>
          <path d={wall.body} fill={`url(#${id}-wall)`} />
          <path d={wall.shade} fill={L.bodyFar} opacity={0.18} />
          <path d={wall.body} fill={`url(#${id}-wallfoot)`} />
          {wall.joints ? <path d={wall.joints} stroke={L.bodyFar} strokeWidth={clamp(WALL.mortar * kWall, 0.6, 9)} opacity={n2(0.4 * lod(WALL.brick * kWall, 12, 20))} fill="none" /> : null}
          {/* The sun wraps over the broken top: a glow that runs hotter towards the sun, and a hairline. */}
          <path d={wall.rim} stroke={`url(#${id}-rimglow)`} strokeWidth={rimW * 3.2} strokeLinejoin="round" fill="none" />
          <path d={wall.rim} stroke={L.contour} strokeWidth={rimW} strokeLinejoin="round" opacity={0.9} fill="none" />
        </g>
      ) : null}

    </g>
  );
};

// ---------------------------------------------------------------- ground

/**
 * The ground from the frame bottom to the foot of the wall (z = WALL.z); the
 * Backdrop paints the land beyond. Ruts, scuffs, pebbles and the chalk line,
 * and over them the dust hanging between the runner and the wall. The dust
 * nearer than the runner (thickest close to the lens, where the long lens
 * melts it into warm discs) is DuskForeground, drawn over the athlete.
 */
export const DuskGround: React.FC<DuskProps> = ({ cam, t, id }) => {
  const zBack = WALL.z;
  const zNear = nearGroundZ(cam);
  if (!(zNear < zBack)) return null;
  const k = pxPerM(cam);
  const top = groundRow(cam, zBack);
  const yLine = groundRow(cam, LINE_Z);
  const P = (x: number, z: number) => project(cam, x, 0, z);

  // Ruts: worn tracks running away from the camera, wavering and broken.
  const [xa, xb] = xRangeAt(cam, zBack, 20);
  const ruts: string[] = [];
  const ridges: string[] = [];
  const RUT = 0.45;
  const nz = 30;
  for (let i = Math.floor(xa / RUT); i <= Math.ceil(xb / RUT); i++) {
    if (hash3(i, 1, 41) < 0.5) continue;
    const xr = (i + hash3(i, 2, 41)) * RUT;
    let pen = false;
    let d = "";
    let rd = "";
    for (let q = 0; q <= nz; q++) {
      // Uniform steps in 1/z are uniform on screen.
      const z = 1 / (1 / zNear + (q / nz) * (1 / zBack - 1 / zNear));
      const on = vnoise(z * 0.5 + i * 3.1, 43) > -0.55;
      const x = xr + 0.018 * fbm(z * 0.5, 44 + i);
      const p = P(x, z);
      if (on) {
        d += `${pen ? "L" : "M"}${n2(p.x)} ${n2(p.y)}`;
        rd += `${pen ? "L" : "M"}${n2(p.x + Math.max(0.9, 0.007 * p.k))} ${n2(p.y)}`;
        pen = true;
      } else pen = false;
    }
    ruts.push(d);
    ridges.push(rd);
  }

  // Pebbles in size tiers; each tier is drawn only out to the depth where it still reads.
  const pebBody: string[] = [];
  const pebUnder: string[] = [];
  const pebRim: string[] = [];
  const pebShadow: string[] = [];
  const zA = Math.max(zNear, 0.5);
  [0.6, 0.3, 0.15, 0.075].forEach((cell, lv) => {
    const size = 0.026 / Math.pow(1.8, lv);
    const zMax = Math.min(zBack, (size * cam.f) / 1.6);
    if (zMax <= zA) return;
    for (let j = Math.floor(zA / cell); j <= Math.ceil(zMax / cell); j++) {
      const zc = (j + 0.5) * cell;
      if (zc > zMax + cell) continue;
      const [a, b] = xRangeAt(cam, zc, 30);
      for (let i = Math.floor(a / cell); i <= Math.ceil(b / cell); i++) {
        const s = (c: number) => hash3(i, j, lv * 19 + c);
        if (s(1) > 0.06) continue;
        const z = zc + (s(2) - 0.5) * cell;
        if (z < zA || z > zBack) continue;
        // Far from the focus plane the lens would melt them: thin them out
        // instead, shrinking each one away so none pops as the lens moves.
        const keep = clamp((s(5) - lod(defocus(cam, z, 2.5), 2, 5)) / 0.25);
        if (keep <= 0) continue;
        const x = (i + s(3)) * cell;
        const p = P(x, z);
        const rx = size * (0.6 + 0.8 * s(4)) * p.k * keep;
        if (rx < 0.9 || !onScreen(p.x, p.y, rx * 4)) continue;
        const ry = rx * clamp((0.9 * cam.h) / z + 0.42, 0.42, 0.95);
        const cy = p.y - ry * 0.6;
        // The long shadow falls to the left, away from the low sun.
        pebShadow.push(ellipsePath(p.x - rx * 2.4, p.y - ry * 0.02, rx * 3.2, ry * 0.36));
        if (rx < 4) {
          pebBody.push(ellipsePath(p.x, cy, rx, ry));
          if (rx > 1.4) pebRim.push(`M${n2(p.x + rx * 0.2)} ${n2(cy - ry * 0.95)}Q${n2(p.x + rx * 1.05)} ${n2(cy - ry * 0.7)} ${n2(p.x + rx * 0.95)} ${n2(cy + ry * 0.2)}`);
          continue;
        }
        // Close up, a stone is a lumpy polygon: lit along its right shoulder, a darker crescent underneath.
        const nv = 10;
        const pts: [number, number][] = [];
        for (let v = 0; v < nv; v++) {
          const a2 = (v / nv) * Math.PI * 2;
          const rr = 0.8 + 0.3 * s(20 + v);
          pts.push([p.x + Math.cos(a2) * rx * rr, cy + Math.sin(a2) * ry * rr]);
        }
        const path = (list: [number, number][], close = false) => list.map(([px, py], v) => `${v ? "L" : "M"}${n2(px)} ${n2(py)}`).join("") + (close ? "Z" : "");
        pebBody.push(path(pts, true));
        pebUnder.push(path([pts[0], pts[1], pts[2], pts[3], pts[4], pts[5], [p.x - rx * 0.6, cy + ry * 0.25], [p.x + rx * 0.5, cy + ry * 0.3]], true));
        pebRim.push(path([pts[7], pts[8], pts[9], pts[0], pts[1]]));
      }
    }
  });

  // Foot scuffs: dragged studs and heels, mostly along the line where the game runs.
  const scuffs: string[] = [];
  const SC = 0.7;
  const [sa, sb] = xRangeAt(cam, zBack, 40);
  for (let i = Math.floor(sa / SC); i <= Math.ceil(sb / SC); i++) {
    for (let r = 0; r < 3; r++) {
      const s = (c: number) => hash3(i, r, 61 + c);
      if (s(1) > 0.45) continue;
      const z = LINE_Z + (s(2) - 0.55) * (r === 0 ? 1.2 : 6);
      if (z < zA || z > zBack) continue;
      const x = (i + s(3)) * SC;
      const len = 0.14 + 0.3 * s(4);
      const p0 = P(x - len / 2, z);
      const p1 = P(x + len / 2, z + (s(5) - 0.5) * 0.08);
      const w = 0.04 * p0.k * ((cam.h + 0.15) / z);
      if (Math.max(p0.x, p1.x) < -20 || Math.min(p0.x, p1.x) > WIDTH + 20) continue;
      scuffs.push(`M${n2(p0.x)} ${n2(p0.y)}Q${n2((p0.x + p1.x) / 2)} ${n2((p0.y + p1.y) / 2 - w * 1.4)} ${n2(p1.x)} ${n2(p1.y)}Q${n2((p0.x + p1.x) / 2)} ${n2((p0.y + p1.y) / 2 + w * 0.4)} ${n2(p0.x)} ${n2(p0.y)}Z`);
    }
  }

  // The chalked touchline: wavering edges, patchy chalk, small gaps.
  const [la, lb] = xRangeAt(cam, LINE_Z, 10);
  const step = Math.max(0.004, 2.5 / (cam.f / LINE_Z));
  const chalk: string[] = [];
  const chalkStrong: string[] = [];
  type Q = { x: number; zn: number; zf: number };
  const flush = (into: string[], pts: Q[]) => {
    if (pts.length < 2) return;
    const fwd = pts.map((q) => P(q.x, q.zf));
    const back = pts
      .slice()
      .reverse()
      .map((q) => P(q.x, q.zn));
    into.push(poly([...fwd, ...back]));
  };
  let seg: Q[] = [];
  let strong: Q[] = [];
  for (let q = Math.floor(la / step); q <= Math.ceil(lb / step) + 1; q++) {
    const x = q * step;
    const zn = LINE_Z - LINE_WIDTH / 2 + 0.014 * fbm(x * 9, 52);
    const zf = LINE_Z + LINE_WIDTH / 2 + 0.014 * fbm(x * 9, 53);
    if (vnoise(x * 1.7, 51) > 0.7) {
      flush(chalk, seg);
      flush(chalkStrong, strong);
      seg = [];
      strong = [];
      continue;
    }
    seg.push({ x, zn, zf });
    if (fbm(x * 2.3, 54) > -0.15) strong.push({ x, zn: zn + 0.012, zf: zf - 0.016 });
    else {
      flush(chalkStrong, strong);
      strong = [];
    }
  }
  flush(chalk, seg);
  flush(chalkStrong, strong);
  // Chalk dust for the close shots: thick at the line's edges, thinning away from it, with a few smears along x.
  const dust: string[] = [];
  const smears: string[] = [];
  if (k > 400) {
    const cell = 0.03;
    for (let i = Math.floor(la / cell); i <= Math.ceil(lb / cell); i++) {
      for (let r = 0; r < 3; r++) {
        const s = (c: number) => hash3(i, r, 71 + c);
        if (s(0) > 0.55) continue;
        const side = s(4) < 0.5 ? -1 : 1;
        const off = LINE_WIDTH / 2 + 0.004 + 0.2 * Math.pow(s(1), 2.6);
        const z = LINE_Z + side * off;
        const p = P((i + s(2)) * cell, z);
        const rr = (0.0008 + 0.0035 * Math.pow(s(3), 2)) * p.k;
        if (rr < 0.45) continue;
        if (r === 0 && s(5) < 0.25) {
          const e = P((i + s(2)) * cell + 0.03 + 0.06 * s(6), z + (s(7) - 0.5) * 0.01);
          smears.push(`M${n2(p.x)} ${n2(p.y)}L${n2(e.x)} ${n2(e.y)}`);
        } else dust.push(ellipsePath(p.x, p.y, rr, rr * 0.55));
      }
    }
  }
  const sunX = cam.cx + SUN.az * cam.f;
  const lineH = Math.max(1, groundRow(cam, LINE_Z - LINE_WIDTH / 2) - groundRow(cam, LINE_Z + LINE_WIDTH / 2));
  const gStop = (y: number) => clamp((y - top) / Math.max(1, HEIGHT - top));
  const rutTone = mix(D.dirtSeam, D.wall, 0.45);
  const pebTone = mix(D.dirtB, D.dirtFar, 0.25);
  // Only the dust beyond the runner; the nearer dust is DuskForeground's.
  const dustMotes = motes(cam, t, D0, WALL.z, 0.05, 0.5);

  return (
    <g>
      <defs>
        <linearGradient id={`${id}-dirt`} gradientUnits="userSpaceOnUse" x1={0} y1={top} x2={0} y2={HEIGHT}>
          <stop offset={0} stopColor={D.dirtFar} />
          <stop offset={gStop(yLine) * 0.7} stopColor={mix(D.dirtFar, D.dirtB, 0.7)} />
          <stop offset={gStop(yLine)} stopColor={D.dirtB} />
          <stop offset={1} stopColor={mix(D.dirtA, L.bodyFar, 0.3)} />
        </linearGradient>
        <radialGradient id={`${id}-glare`}>
          <stop offset={0} stopColor={D.haze} stopOpacity={0.3} />
          <stop offset={1} stopColor={D.haze} stopOpacity={0} />
        </radialGradient>
        {/* Ruts read most in the mid-ground; they melt into the haze far off and out of focus close to the lens. */}
        <linearGradient id={`${id}-rut`} gradientUnits="userSpaceOnUse" x1={0} y1={top} x2={0} y2={HEIGHT}>
          <stop offset={0} stopColor={rutTone} stopOpacity={0.35} />
          <stop offset={Math.min(0.9, gStop(yLine) + 0.12)} stopColor={rutTone} stopOpacity={1} />
          <stop offset={1} stopColor={rutTone} stopOpacity={0.35 * (1 - lensSoft(cam))} />
        </linearGradient>
        <MoteDefs id={id} />
        <linearGradient id={`${id}-chalkglow`} x1={0} y1={0} x2={0} y2={1}>
          <stop offset={0} stopColor={D.line} stopOpacity={0} />
          <stop offset={0.5} stopColor={D.line} stopOpacity={0.35} />
          <stop offset={1} stopColor={D.line} stopOpacity={0} />
        </linearGradient>
      </defs>
      <rect x={0} y={top} width={WIDTH} height={HEIGHT - top} fill={`url(#${id}-dirt)`} />
      <ellipse cx={sunX} cy={top} rx={WIDTH * 0.9} ry={Math.max(40, (yLine - top) * 2.2)} fill={`url(#${id}-glare)`} />
      <path d={scuffs.join("")} fill={D.dirtFar} opacity={0.32} />
      <path d={ruts.join("")} stroke={`url(#${id}-rut)`} strokeWidth={1.4} fill="none" />
      <path d={ridges.join("")} stroke={L.contour} strokeWidth={0.8} fill="none" opacity={0.2} />
      <path d={pebShadow.join("")} fill={L.bodyFar} opacity={0.32} />
      <path d={pebBody.join("")} fill={pebTone} />
      <path d={pebUnder.join("")} fill={mix(D.dirtSeam, L.bodyFar, 0.3)} opacity={0.75} />
      <path d={pebRim.join("")} stroke={L.contour} strokeWidth={clamp(0.0012 * k, 0.8, 2)} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.45} />

      <rect x={0} y={yLine - lineH * 4} width={WIDTH} height={lineH * 8} fill={`url(#${id}-chalkglow)`} opacity={0.5} />
      <path d={chalk.join("")} fill={D.line} opacity={0.42} />
      <path d={chalkStrong.join("")} fill={D.line} opacity={0.82} />
      {dust.length ? <path d={dust.join("")} fill={D.line} opacity={n2(0.45 * lod(k, 400, 560))} /> : null}
      {smears.length ? <path d={smears.join("")} stroke={D.line} strokeWidth={clamp(0.002 * k, 0.6, 2.5)} strokeLinecap="round" opacity={n2(0.25 * lod(k, 400, 560))} fill="none" /> : null}
      <MoteLayer list={dustMotes} id={id} />
    </g>
  );
};
