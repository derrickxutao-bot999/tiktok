// Small, dependency-free maths used by the engine. Everything here is pure:
// the same inputs always give the same output, so any frame renders identically
// no matter which worker draws it or in what order.

export type Vec2 = { x: number; y: number };

export const v = (x: number, y: number): Vec2 => ({ x, y });
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const mul = (a: Vec2, k: number): Vec2 => ({ x: a.x * k, y: a.y * k });
export const len = (a: Vec2): number => Math.hypot(a.x, a.y);
export const dist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);
export const norm = (a: Vec2): Vec2 => {
  const l = len(a) || 1;
  return { x: a.x / l, y: a.y / l };
};
/** Rotate counter-clockwise (y up) by `rad`. */
export const rot = (a: Vec2, rad: number): Vec2 => {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: a.x * c - a.y * s, y: a.x * s + a.y * c };
};
export const lerpV = (a: Vec2, b: Vec2, t: number): Vec2 => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});
export const fromAngle = (rad: number, r = 1): Vec2 => ({ x: Math.cos(rad) * r, y: Math.sin(rad) * r });

export const DEG = Math.PI / 180;
export const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, x: number) => (b === a ? 0 : (x - a) / (b - a));
/** Clamped remap of x from [a0,a1] to [b0,b1]. */
export const remap = (x: number, a0: number, a1: number, b0: number, b1: number) =>
  lerp(b0, b1, clamp(invLerp(a0, a1, x)));
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp(invLerp(a, b, x));
  return t * t * (3 - 2 * t);
};
export const smootherstep = (a: number, b: number, x: number) => {
  const t = clamp(invLerp(a, b, x));
  return t * t * t * (t * (t * 6 - 15) + 10);
};
export const easeInOutSine = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t));
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
export const easeInCubic = (t: number) => Math.pow(clamp(t), 3);

/** Deterministic hash -> [0,1). Never use Math.random() in render code. */
export const hash = (n: number): number => {
  let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
};
export const hash2 = (a: number, b: number) => hash(Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663));

/** Seeded PRNG (mulberry32) for building static layouts once. */
export const prng = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * Monotone cubic interpolation (Fritsch–Carlson). Knots must have strictly
 * increasing x. Outside the knots it extrapolates linearly with the end
 * slopes, which may be overridden. Returns value and derivative helpers.
 */
export const monotoneCubic = (
  xs: readonly number[],
  ys: readonly number[],
  endSlopes?: { start?: number; end?: number },
) => {
  const n = xs.length;
  const d: number[] = [];
  const m: number[] = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = endSlopes?.start ?? d[0];
  m[n - 1] = endSlopes?.end ?? d[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) m[i] = 0;
    else {
      const w1 = 2 * (xs[i + 1] - xs[i]) + (xs[i] - xs[i - 1]);
      const w2 = (xs[i + 1] - xs[i]) + 2 * (xs[i] - xs[i - 1]);
      m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
    }
  }
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const h = a * a + b * b;
    if (h > 9) {
      const tau = 3 / Math.sqrt(h);
      m[i] = tau * a * d[i];
      m[i + 1] = tau * b * d[i];
    }
  }
  const seg = (x: number) => {
    let i = 0;
    while (i < n - 2 && x > xs[i + 1]) i++;
    return i;
  };
  const value = (x: number): number => {
    if (x <= xs[0]) return ys[0] + m[0] * (x - xs[0]);
    if (x >= xs[n - 1]) return ys[n - 1] + m[n - 1] * (x - xs[n - 1]);
    const i = seg(x);
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * ys[i] +
      (t3 - 2 * t2 + t) * h * m[i] +
      (-2 * t3 + 3 * t2) * ys[i + 1] +
      (t3 - t2) * h * m[i + 1]
    );
  };
  const slope = (x: number): number => {
    if (x <= xs[0]) return m[0];
    if (x >= xs[n - 1]) return m[n - 1];
    const i = seg(x);
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t;
    return (
      ((6 * t2 - 6 * t) * ys[i] +
        (3 * t2 - 4 * t + 1) * h * m[i] +
        (-6 * t2 + 6 * t) * ys[i + 1] +
        (3 * t2 - 2 * t) * h * m[i + 1]) /
      h
    );
  };
  /** Inverse for a monotone increasing curve (bisection). */
  const inverse = (y: number, lo = xs[0] - 1e4, hi = xs[n - 1] + 1e4): number => {
    let a = lo;
    let b = hi;
    for (let k = 0; k < 80; k++) {
      const c = (a + b) / 2;
      if (value(c) < y) a = c;
      else b = c;
    }
    return (a + b) / 2;
  };
  return { value, slope, inverse };
};

/** Uniform Catmull-Rom through points, parameter u in [0,1] across all segments. */
export const catmullRom = (pts: readonly Vec2[], u: number): Vec2 => {
  const n = pts.length;
  if (n === 1) return pts[0];
  const f = clamp(u) * (n - 1);
  const i = Math.min(n - 2, Math.floor(f));
  const t = f - i;
  const p0 = pts[Math.max(0, i - 1)];
  const p1 = pts[i];
  const p2 = pts[i + 1];
  const p3 = pts[Math.min(n - 1, i + 2)];
  const c = (a: number, b: number, cc: number, d: number) =>
    0.5 * (2 * b + (cc - a) * t + (2 * a - 5 * b + 4 * cc - d) * t * t + (3 * b - a - 3 * cc + d) * t * t * t);
  return { x: c(p0.x, p1.x, p2.x, p3.x), y: c(p0.y, p1.y, p2.y, p3.y) };
};

/** Cubic Hermite between p0 (velocity v0) and p1 (velocity v1) over duration T, at local time s. */
export const hermite = (p0: Vec2, v0: Vec2, p1: Vec2, v1: Vec2, T: number, s: number): Vec2 => {
  const t = s / T;
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return {
    x: h00 * p0.x + h10 * T * v0.x + h01 * p1.x + h11 * T * v1.x,
    y: h00 * p0.y + h10 * T * v0.y + h01 * p1.y + h11 * T * v1.y,
  };
};
