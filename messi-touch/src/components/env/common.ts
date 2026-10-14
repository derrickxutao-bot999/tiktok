// Shared helpers for the two worlds: view ranges, lens blur, deterministic
// noise and colour mixing. Everything is a pure function of its arguments.

import { hash, hash2, clamp } from "../../lib/math";
import { HEIGHT, WIDTH } from "../../lib/timeline";
import { Camera, D0, groundDepthAt, groundXAt } from "../../lib/world";

/** Scale at the focus depth, px per metre. */
export const pxPerM = (cam: Camera) => cam.f / D0;

/** World x range seen at depth z, widened by `margin` px on both sides. */
export const xRangeAt = (cam: Camera, z: number, margin = 0): [number, number] => [
  groundXAt(cam, -margin, z),
  groundXAt(cam, WIDTH + margin, z),
];

/** Depth of the ground at the bottom edge of the frame (Infinity when the horizon is below it). */
export const nearGroundZ = (cam: Camera) => groundDepthAt(cam, HEIGHT);

/** Screen row of the ground at depth z. */
export const groundRow = (cam: Camera, z: number) => cam.cy + (cam.h * cam.f) / z;

/** Screen row of a direction at infinity with elevation tangent `e`. */
export const rowAtElevation = (cam: Camera, e: number) => cam.cy - e * cam.f;

/**
 * Lens blur radius (px) of a point at depth z, focus at D0. Stylised: a real
 * lens at fixed aperture would grow linearly with focal length; 0.7 keeps
 * the wide shots crisp and gives the telephoto its big soft discs.
 */
export const defocus = (cam: Camera, z: number, base = 9) => base * Math.pow(pxPerM(cam) / 250, 0.7) * Math.abs(1 - D0 / z);

/** Fade-in for detail by projected size: 0 below `lo` px, 1 above `hi` px. */
export const lod = (px: number, lo: number, hi: number) => clamp((px - lo) / (hi - lo));

/** Smooth 1D value noise in [-1, 1]. */
export const vnoise = (x: number, seed: number) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  const a = hash2(i, seed) * 2 - 1;
  const b = hash2(i + 1, seed) * 2 - 1;
  return a + (b - a) * u;
};

/** Fractal value noise, roughly in [-1, 1]. */
export const fbm = (x: number, seed: number, octaves = 3) => {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  for (let o = 0; o < octaves; o++) {
    sum += amp * vnoise(x * freq, seed + o * 101);
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / (1 - Math.pow(0.5, octaves));
};

/** Uniform hash of three integers -> [0, 1). */
export const hash3 = (a: number, b: number, c: number) => hash(Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663) ^ Math.imul(c | 0, 83492791));

const parse = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Mix two #RRGGBB colours. */
export const mix = (a: string, b: string, t: number) => {
  const ca = parse(a);
  const cb = parse(b);
  const u = clamp(t);
  const c = ca.map((v, i) => Math.round(v + (cb[i] - v) * u));
  return `#${((1 << 24) | (c[0] << 16) | (c[1] << 8) | c[2]).toString(16).slice(1)}`;
};

/** Compact number for path strings. */
export const n2 = (v: number) => (Math.round(v * 100) / 100).toString();

/** Is a screen point (with radius r) inside the frame? */
export const onScreen = (x: number, y: number, r = 0) => x > -r && x < WIDTH + r && y > -r && y < HEIGHT + r;

/** An ellipse as a closed sub-path, for merging many small shapes into one <path>. */
export const ellipsePath = (cx: number, cy: number, rx: number, ry: number) =>
  `M${n2(cx - rx)} ${n2(cy)}a${n2(rx)} ${n2(ry)} 0 1 0 ${n2(2 * rx)} 0a${n2(rx)} ${n2(ry)} 0 1 0 ${n2(-2 * rx)} 0Z`;
