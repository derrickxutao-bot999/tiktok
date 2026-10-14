// Geometry for the figure: local frames (torso, head, foot) mapped to the
// screen, smooth outlines through key points, and tapered limb contours.
// The runner is a flat figure at depth D0, so world -> screen is affine and
// a Bezier built in any local frame stays exact after mapping.
//
// Every outline is kept as cubic segments, so it can be written as a path,
// sampled, measured, or redrawn from any of its key points (EtchedAthlete).

import { DEG, Vec2, add, dist, mul, norm, rot, sub, v } from "../../lib/math";
import { Camera, project } from "../../lib/world";

/** A key point of an outline; `sharp` points get no tangent (a corner). */
export type Pt = Vec2 & { sharp?: boolean };

const sharp = (p: Vec2): Pt => ({ x: p.x, y: p.y, sharp: true });

export type ToScreen = (p: Vec2) => Pt;

export const toScreen =
  (cam: Camera): ToScreen =>
  (p) => {
    const s = project(cam, p.x, p.y);
    return { x: s.x, y: s.y, sharp: (p as Pt).sharp };
  };

/** A local frame: origin, rotation (rad, y up) and metres per unit. */
export type Frame = { o: Vec2; a: number; s: number };
export const inFrame = (f: Frame, x: number, y: number, isSharp = false): Pt => {
  const p = add(f.o, mul(rot(v(x, y), f.a), f.s));
  return isSharp ? sharp(p) : p;
};

const n1 = (x: number) => String(Math.round(x * 10) / 10);
export const xy = (p: Vec2) => `${n1(p.x)} ${n1(p.y)}`;

// ---------------------------------------------------------------- segments

/** One cubic Bezier: start, two controls, end. */
export type Seg = readonly [Vec2, Vec2, Vec2, Vec2];

/** Chord-length Catmull-Rom through points, as cubic segments. Sharp points become corners. */
export const smoothSegs = (pts: readonly Pt[], closed: boolean): Seg[] => {
  const n = pts.length;
  if (n < 2) return [];
  const at = (i: number) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  const tangent = (i: number): Vec2 => {
    const p = at(i);
    if (p.sharp) return v(0, 0);
    if (!closed && (i === 0 || i === n - 1)) {
      const q = at(i === 0 ? 1 : n - 2);
      const d = norm(sub(q, p));
      return i === 0 ? d : mul(d, -1);
    }
    const a = at(i - 1);
    const b = at(i + 1);
    const s = dist(p, a) + dist(b, p) || 1;
    return v((b.x - a.x) / s, (b.y - a.y) / s);
  };
  const out: Seg[] = [];
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p = at(i);
    const q = at(i + 1);
    const l = dist(p, q) / 3;
    out.push([p, add(p, mul(tangent(i), l)), sub(q, mul(tangent(i + 1), l)), q]);
  }
  return out;
};

export const segsPath = (segs: readonly Seg[], closed: boolean): string => {
  if (!segs.length) return "";
  const d = `M${xy(segs[0][0])}` + segs.map(([, a, b, q]) => `C${xy(a)} ${xy(b)} ${xy(q)}`).join("");
  return closed ? `${d}Z` : d;
};

export const smoothPath = (pts: readonly Pt[], closed: boolean): string => segsPath(smoothSegs(pts, closed), closed);

export const polyPath = (pts: readonly Vec2[], closed: boolean) =>
  pts.map((p, i) => `${i ? "L" : "M"}${xy(p)}`).join("") + (closed ? "Z" : "");

export const bezier = ([p, a, b, q]: Seg, t: number): Vec2 => {
  const u = 1 - t;
  const w0 = u * u * u;
  const w1 = 3 * u * u * t;
  const w2 = 3 * u * t * t;
  const w3 = t * t * t;
  return v(w0 * p.x + w1 * a.x + w2 * b.x + w3 * q.x, w0 * p.y + w1 * a.y + w2 * b.y + w3 * q.y);
};

/** Arc length of each segment (sampled). */
export const segLengths = (segs: readonly Seg[], steps = 8): number[] =>
  segs.map((s) => {
    let l = 0;
    let prev = s[0];
    for (let i = 1; i <= steps; i++) {
      const p = bezier(s, i / steps);
      l += dist(prev, p);
      prev = p;
    }
    return l;
  });

/** Explicit Bezier outlines authored in a local frame. */
export type Cmd = ["M", Vec2] | ["L", Vec2] | ["C", Vec2, Vec2, Vec2] | ["Z"];

/** Explicit commands as segments (lines become straight cubics), mapped by `map`. */
export const cmdSegs = (cmds: readonly Cmd[], map: (p: Vec2) => Vec2): Seg[] => {
  const out: Seg[] = [];
  let cur = v(0, 0);
  let first = v(0, 0);
  for (const c of cmds) {
    if (c[0] === "M") {
      cur = map(c[1]);
      first = cur;
    } else if (c[0] === "L") {
      const q = map(c[1]);
      out.push([cur, cur, q, q]);
      cur = q;
    } else if (c[0] === "C") {
      const q = map(c[3]);
      out.push([cur, map(c[1]), map(c[2]), q]);
      cur = q;
    } else if (dist(cur, first) > 1e-6) {
      out.push([cur, cur, first, first]);
      cur = first;
    }
  }
  return out;
};

export const cmdPath = (cmds: readonly Cmd[], map: (p: Vec2) => Vec2): string =>
  cmds
    .map((c) => {
      switch (c[0]) {
        case "M":
        case "L":
          return `${c[0]}${xy(map(c[1]))}`;
        case "C":
          return `C${xy(map(c[1]))} ${xy(map(c[2]))} ${xy(map(c[3]))}`;
        default:
          return "Z";
      }
    })
    .join("");

// ---------------------------------------------------------------- limbs

/** Half-widths along a bone: [u, anterior, posterior], canonical metres. */
export type Station = readonly [number, number, number];

export const widthAt = (st: readonly Station[], u: number): [number, number] => {
  if (u <= st[0][0]) return [st[0][1], st[0][2]];
  for (let i = 0; i < st.length - 1; i++) {
    const [ua, fa, ba] = st[i];
    const [ub, fb, bb] = st[i + 1];
    if (u <= ub) {
      const t = (u - ua) / (ub - ua);
      const e = t * t * (3 - 2 * t);
      return [fa + (fb - fa) * e, ba + (bb - ba) * e];
    }
  }
  const l = st[st.length - 1];
  return [l[1], l[2]];
};

export type LimbOpts = {
  /** Metres per canonical metre of width. */
  w: number;
  /** Extra half-width, metres (loose fabric). */
  grow?: number;
  u0?: number;
  u1?: number;
  cap0?: "round" | "flat";
  cap1?: "round" | "flat";
  /** Flat caps can be cut obliquely: the anterior corner moves by this many metres along the bone. */
  slant1?: number;
  /** Rounds the corners of a flat end cap by this many metres (a soft hem instead of a cut). */
  soft1?: number;
};

/**
 * Outline of a tapered limb from a to b (world). The anterior side is the
 * left normal of a->b, which for a leg or arm hanging forward of its root is
 * its front: thigh and biceps bulge there, the calf and hamstring behind.
 */
export const limb = (a: Vec2, b: Vec2, st: readonly Station[], o: LimbOpts): Pt[] => {
  const L = dist(a, b);
  const d = norm(sub(b, a));
  const n = v(-d.y, d.x);
  const u0 = o.u0 ?? 0;
  const u1 = o.u1 ?? 1;
  const g = o.grow ?? 0;
  const w = (u: number) => {
    const [f, bk] = widthAt(st, u);
    return [f * o.w + g, bk * o.w + g] as const;
  };
  const axis = (u: number) => add(a, mul(d, u * L));
  const us = [u0, ...st.map((s) => s[0]).filter((u) => u > u0 + 0.03 && u < u1 - 0.03), u1];
  const flat0 = o.cap0 === "flat";
  const flat1 = o.cap1 === "flat";
  const slant = o.slant1 ?? 0;
  const soft = flat1 ? o.soft1 ?? 0 : 0;

  const front: Pt[] = us.map((u, i) => {
    const p = add(axis(u), mul(n, w(u)[0]));
    const edge = (i === 0 && flat0) || (i === us.length - 1 && flat1);
    const q = i === us.length - 1 ? add(p, mul(d, slant)) : p;
    return edge && !(i === us.length - 1 && soft) ? sharp(q) : q;
  });
  const back: Pt[] = us
    .map((u, i) => {
      const p = sub(axis(u), mul(n, w(u)[1]));
      const edge = (i === 0 && flat0) || (i === us.length - 1 && flat1);
      return edge && !(i === us.length - 1 && soft) ? sharp(p) : p;
    })
    .reverse();

  // A soft hem: each corner of the flat end becomes a short rounded turn.
  if (soft) {
    const fEnd = front[front.length - 1];
    const bEnd = back[0];
    const across = norm(sub(bEnd, fEnd));
    front.splice(front.length - 1, 1, add(fEnd, mul(d, -soft)), add(fEnd, mul(across, soft)));
    back.splice(0, 1, sub(bEnd, mul(across, soft)), add(bEnd, mul(d, -soft)));
  }

  // Round caps bulge along the bone by the mean half-width.
  const cap = (u: number, sign: 1 | -1): Pt[] => {
    const [f, bk] = w(u);
    const r = (f + bk) / 2;
    const c = axis(u);
    return [50, 90, 130].map((deg) => {
      const th = deg * DEG;
      const along = sign === 1 ? th : Math.PI - th;
      const side = Math.cos(along) >= 0 ? f : bk;
      return add(add(c, mul(n, side * Math.cos(along))), mul(d, sign * r * 0.95 * Math.sin(th)));
    });
  };
  return [...front, ...(flat1 ? [] : cap(u1, 1)), ...back, ...(flat0 ? [] : cap(u0, -1))];
};

const cross = (a: Vec2, b: Vec2) => a.x * b.y - a.y * b.x;

export type TwoBoneOpts = { w: number; u0?: number; u1?: number };

/**
 * One continuous outline for a two-bone limb (hip-thigh-knee-calf-ankle,
 * shoulder-upper arm-elbow-forearm-wrist): tapered sides, a round turn on the
 * convex side of the joint (kneecap, point of the elbow) and a crease on the
 * concave side, where the two sides meet in a short soft fillet. In a deep
 * bend the crease moves out along the bisector, exactly where the two
 * surfaces press together.
 */
export const twoBone = (a: Vec2, j: Vec2, b: Vec2, st1: readonly Station[], st2: readonly Station[], o: TwoBoneOpts): Pt[] => {
  const L1 = dist(a, j) || 1e-9;
  const L2 = dist(j, b) || 1e-9;
  const d1 = norm(sub(j, a));
  const d2 = norm(sub(b, j));
  const n1 = v(-d1.y, d1.x);
  const n2 = v(-d2.y, d2.x);
  const u0 = o.u0 ?? 0;
  const u1 = o.u1 ?? 1;
  /** Edge point of bone 1 or 2 at u on the anterior (+1) or posterior (-1) side. */
  const edge1 = (u: number, s: 1 | -1) => add(add(a, mul(d1, u * L1)), mul(n1, s * widthAt(st1, u)[s === 1 ? 0 : 1] * o.w));
  const edge2 = (u: number, s: 1 | -1) => add(add(j, mul(d2, u * L2)), mul(n2, s * widthAt(st2, u)[s === 1 ? 0 : 1] * o.w));
  const us1 = st1.map((x) => x[0]).filter((u) => u > u0 + 0.03 && u < 0.97);
  const us2 = st2.map((x) => x[0]).filter((u) => u > 0.03 && u < u1 - 0.03);
  const turn = cross(d1, d2);
  /** The concave side of the joint: a left turn folds the anterior side in. */
  const concave: 1 | -1 = turn > 0 ? 1 : -1;
  const fillet = 0.012 * o.w;

  // One side of the limb from root to tip, through the joint.
  const sideOf = (s: 1 | -1): Pt[] => {
    let before = us1.map((u) => edge1(u, s));
    let after = us2.map((u) => edge2(u, s));
    let joint: Pt[];
    const p1 = edge1(1, s);
    const p2 = edge2(0, s);
    if (s !== concave || Math.abs(turn) < 0.05) {
      // Convex side (or nearly straight): a round turn about the joint.
      const m = norm(add(mul(n1, s), mul(n2, s)));
      joint = [p1, add(j, mul(m, (dist(p1, j) + dist(p2, j)) / 2)), p2];
    } else {
      // Concave side: the two edges meet at C; cut the stations beyond it and round the corner.
      const t = cross(sub(p2, p1), d2) / turn;
      const C = add(p1, mul(d1, t));
      const cut1 = (C.x - a.x) * d1.x + (C.y - a.y) * d1.y - fillet;
      const cut2 = (C.x - j.x) * d2.x + (C.y - j.y) * d2.y + fillet;
      before = us1.filter((u) => u * L1 < cut1).map((u) => edge1(u, s));
      after = us2.filter((u) => u * L2 > cut2).map((u) => edge2(u, s));
      joint = [sub(C, mul(d1, fillet)), add(C, mul(d2, fillet))];
    }
    return [edge1(u0, s), ...before, ...joint, ...after, edge2(u1, s)];
  };

  // Round caps at the root and the tip bulge along the bone by the mean half-width.
  const cap = (c: Vec2, d: Vec2, n: Vec2, wf: number, wb: number, sign: 1 | -1): Pt[] => {
    const r = (wf + wb) / 2;
    return [50, 90, 130].map((deg) => {
      const th = deg * DEG;
      const along = sign === 1 ? th : Math.PI - th;
      const side = Math.cos(along) >= 0 ? wf : wb;
      return add(add(c, mul(n, side * Math.cos(along))), mul(d, sign * r * 0.95 * Math.sin(th)));
    });
  };
  const [f0, b0] = widthAt(st1, u0);
  const [f1, b1] = widthAt(st2, u1);
  return [
    ...sideOf(1),
    ...cap(add(j, mul(d2, u1 * L2)), d2, n2, f1 * o.w, b1 * o.w, 1),
    ...sideOf(-1).reverse(),
    ...cap(add(a, mul(d1, u0 * L1)), d1, n1, f0 * o.w, b0 * o.w, -1),
  ];
};

/** The two edge points of a limb outline at u (anterior, posterior): the line of a hem, or a cross-section. */
export const limbEdge = (a: Vec2, b: Vec2, st: readonly Station[], o: LimbOpts, u: number): [Vec2, Vec2] => {
  const d = norm(sub(b, a));
  const n = v(-d.y, d.x);
  const c = add(a, mul(d, u * dist(a, b)));
  const [f, bk] = widthAt(st, u);
  const g = o.grow ?? 0;
  const slant = u === (o.u1 ?? 1) ? o.slant1 ?? 0 : 0;
  return [add(add(c, mul(n, f * o.w + g)), mul(d, slant)), sub(c, mul(n, bk * o.w + g))];
};

/** Is world point p inside the limb from a to b (between u0 and u1)? */
export const insideLimb = (p: Vec2, a: Vec2, b: Vec2, st: readonly Station[], o: LimbOpts): boolean => {
  const L = dist(a, b) || 1e-9;
  const d = norm(sub(b, a));
  const q = sub(p, a);
  const u = (q.x * d.x + q.y * d.y) / L;
  if (u < (o.u0 ?? 0) || u > (o.u1 ?? 1)) return false;
  const side = -q.x * d.y + q.y * d.x;
  const [f, bk] = widthAt(st, u);
  const g = o.grow ?? 0;
  return side >= 0 ? side <= f * o.w + g : -side <= bk * o.w + g;
};
