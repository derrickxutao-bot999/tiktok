// Small helpers shared by the effects: colour mixing and path strings.

import { Vec2, clamp } from "../../lib/math";

const parse = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  const f = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)];
};

/** Linear mix of two hex colours, returned as hex. */
export const mixHex = (a: string, b: string, t: number): string => {
  const ca = parse(a);
  const cb = parse(b);
  const u = clamp(t);
  return `#${ca.map((x, i) => Math.round(x + (cb[i] - x) * u).toString(16).padStart(2, "0")).join("")}`;
};

/** Hex colour with alpha, as an rgba() string. */
export const rgba = (hex: string, a: number): string => {
  const [r, g, b] = parse(hex);
  return `rgba(${r},${g},${b},${clamp(a).toFixed(3)})`;
};

const f1 = (n: number) => n.toFixed(1);

/** Polyline path string; closed when asked. */
export const polyPath = (pts: readonly Vec2[], closed = false): string =>
  pts.length === 0
    ? ""
    : `M${pts.map((p) => `${f1(p.x)} ${f1(p.y)}`).join("L")}${closed ? "Z" : ""}`;
