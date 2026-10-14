// Footfalls ring out on the grass: concentric hairline circles of light
// around the ball of the foot, drawn as true ground circles (projected point
// by point, so the far side compresses towards the horizon). Every ring is a
// pure function of the world clock: when time freezes, the ripples freeze.
//
// An ordinary step flashes and sends out three rings. A strong step (an era
// change) sends five, wider and brighter, with a chronograph bezel of ticks
// riding on the outer ring and a thin pillar of light rising from the foot.

import React from "react";
import { Vec2, clamp, easeOutCubic, lerp } from "../../lib/math";
import { Footfall } from "../../lib/rig";
import { HEIGHT, WIDTH } from "../../lib/timeline";
import { Camera, D0, project } from "../../lib/world";
import { mixHex, polyPath } from "./util";

export type FootfallPulsesProps = {
  camera: Camera;
  /** World clock, s. */
  t: number;
  footfalls: Footfall[];
  color: string;
  /** Extra 0..1 per step number (1 = era change). */
  strength?: (n: number) => number;
  idPrefix: string;
};

/** Ring expansion time, world s, and the delay between successive rings. */
const EXPAND = 0.44;
const STAGGER = 0.055;
const FLASH = 0.13;
const SEGMENTS = 64;
/** A strong step rings out a little longer, with its five rings packed closer together. */
const expandOf = (s: number) => EXPAND * (1 + 0.08 * s);
const staggerOf = (s: number) => STAGGER * (1 - 0.45 * s);
const ringsOf = (s: number) => 3 + Math.round(2 * s);

/** World seconds a footfall stays visible: pass footfallsBetween(t - PULSE_LIFE, t). */
export const PULSE_LIFE = Math.max(expandOf(0) + staggerOf(0) * (ringsOf(0) - 1), expandOf(1) + staggerOf(1) * (ringsOf(1) - 1));

/** A circle of radius r on the ground around (x, 0, D0), projected. */
const groundCircle = (cam: Camera, x: number, r: number, n = SEGMENTS): Vec2[] => {
  const pts: Vec2[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push(project(cam, x + r * Math.cos(a), 0, D0 + r * Math.sin(a)));
  }
  return pts;
};

type Box = { x0: number; y0: number; x1: number; y1: number };
const boxOf = (pts: readonly Vec2[], pad: number): Box => {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of pts) {
    x0 = Math.min(x0, p.x);
    y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x);
    y1 = Math.max(y1, p.y);
  }
  return { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad };
};
const visible = (b: Box) => b.x1 > 0 && b.x0 < WIDTH && b.y1 > 0 && b.y0 < HEIGHT;

/** Bezel ticks riding on a ring: every 10 degrees, longer every 30. */
const bezel = (cam: Camera, x: number, r: number): string => {
  let d = "";
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const len = i % 3 === 0 ? 0.1 : 0.045;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const p = project(cam, x + r * c, 0, D0 + r * s);
    const q = project(cam, x + (r + len * r) * c, 0, D0 + (r + len * r) * s);
    d += `M${p.x.toFixed(1)} ${p.y.toFixed(1)}L${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
  }
  return d;
};

type Ring = { key: string; d: string; width: number; opacity: number; box: Box };

export const FootfallPulses: React.FC<FootfallPulsesProps> = ({ camera, t, footfalls, color, strength, idPrefix }) => {
  const id = (s: string) => `${idPrefix}-ffp-${s}`;
  const core = mixHex(color, "#FFFFFF", 0.65);
  const rings: Ring[] = [];
  const ticks: { key: string; d: string; opacity: number }[] = [];
  const flashes: React.ReactNode[] = [];
  const pillars: React.ReactNode[] = [];

  for (const ff of footfalls) {
    const age = t - ff.t;
    if (age < 0) continue;
    const s = clamp(strength?.(ff.n) ?? 0);
    const count = ringsOf(s);
    const R = lerp(0.8, 1.85, s);
    const expand = expandOf(s);
    const stagger = staggerOf(s);
    if (age > expand + stagger * (count - 1)) continue;
    const foot = project(camera, ff.x, 0, D0);
    const k = foot.k;

    for (let i = 0; i < count; i++) {
      const u = (age - i * stagger) / expand;
      if (u <= 0 || u >= 1) continue;
      const r = R * (0.06 + 0.94 * easeOutCubic(u)) * (1 - 0.07 * i);
      const pts = groundCircle(camera, ff.x, r);
      const box = boxOf(pts, 4);
      if (!visible(box)) continue;
      const fade = Math.pow(1 - u, 1.6) * (i === 0 ? 1 : 0.62 - 0.06 * i);
      rings.push({
        key: `${ff.n}-${i}`,
        d: polyPath(pts, true),
        width: lerp(2.2, 0.8, u) * (1 + 0.2 * s),
        opacity: fade * (0.8 + 0.2 * s),
        box,
      });
      if (i === 0 && s > 0) ticks.push({ key: `${ff.n}`, d: bezel(camera, ff.x, r), opacity: fade * s * 0.85 });
    }

    // The impact: a hot point on the turf and a short anamorphic streak.
    if (age < FLASH * (1 + s)) {
      const f = Math.pow(1 - age / (FLASH * (1 + s)), 2);
      const spot = groundCircle(camera, ff.x, 0.07 + 0.05 * s, 24);
      const half = (0.55 + 0.9 * s) * k * (0.6 + 0.4 * f);
      flashes.push(
        <g key={`f${ff.n}`} opacity={f}>
          <rect x={foot.x - half} y={foot.y - 0.8} width={half * 2} height={1.6} fill={`url(#${id("streak")})`} />
          <path d={polyPath(spot, true)} fill={core} opacity={0.9} />
        </g>,
      );
    }

    // A strong step raises a thin pillar of light that shimmers as it fades.
    if (s > 0 && age < 0.5) {
      const rise = easeOutCubic(age / 0.22);
      const h = (0.9 + 1.5 * rise) * k;
      const fade = Math.pow(1 - age / 0.5, 2) * s;
      const shimmer = 0.78 + 0.22 * Math.sin(age * 95 + ff.n);
      pillars.push(
        <g key={`p${ff.n}`} opacity={fade}>
          <rect x={foot.x - 7} y={foot.y - h * 0.8} width={14} height={h * 0.8} fill={`url(#${id("pillar")})`} opacity={0.22} />
          <rect x={foot.x - 0.8} y={foot.y - h} width={1.6} height={h} fill={`url(#${id("pillar")})`} opacity={shimmer} />
          <rect x={foot.x - 4.5} y={foot.y - h * 0.55} width={0.8} height={h * 0.55} fill={`url(#${id("pillar")})`} opacity={0.55 * (1 - shimmer + 0.6)} />
          <rect x={foot.x + 3.7} y={foot.y - h * 0.45} width={0.8} height={h * 0.45} fill={`url(#${id("pillar")})`} opacity={0.55 * shimmer} />
        </g>,
      );
    }
  }

  if (rings.length === 0 && flashes.length === 0 && pillars.length === 0) return null;

  // One blur, sized to the rings actually on screen.
  const all = rings.map((r) => r.box);
  const region = all.length
    ? {
        x: Math.max(-40, Math.min(...all.map((b) => b.x0)) - 30),
        y: Math.max(-40, Math.min(...all.map((b) => b.y0)) - 30),
        x1: Math.min(WIDTH + 40, Math.max(...all.map((b) => b.x1)) + 30),
        y1: Math.min(HEIGHT + 40, Math.max(...all.map((b) => b.y1)) + 30),
      }
    : null;

  return (
    <g>
      <defs>
        <linearGradient id={id("ring")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity={0.35} />
          <stop offset="0.55" stopColor={color} stopOpacity={0.85} />
          <stop offset="1" stopColor={core} stopOpacity={1} />
        </linearGradient>
        <linearGradient id={id("streak")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={color} stopOpacity={0} />
          <stop offset="0.5" stopColor={core} stopOpacity={1} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </linearGradient>
        <linearGradient id={id("pillar")} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={core} stopOpacity={1} />
          <stop offset="0.35" stopColor={color} stopOpacity={0.6} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </linearGradient>
        {region ? (
          <filter id={id("glow")} filterUnits="userSpaceOnUse" x={region.x} y={region.y} width={region.x1 - region.x} height={region.y1 - region.y}>
            <feGaussianBlur stdDeviation={3.2} />
          </filter>
        ) : null}
      </defs>
      {region ? (
        <g filter={`url(#${id("glow")})`} fill="none" stroke={color}>
          {rings.map((r) => (
            <path key={r.key} d={r.d} strokeWidth={r.width * 3} opacity={r.opacity * 0.55} />
          ))}
        </g>
      ) : null}
      {pillars}
      <g fill="none" stroke={`url(#${id("ring")})`}>
        {rings.map((r) => (
          <path key={r.key} d={r.d} strokeWidth={r.width} opacity={r.opacity} />
        ))}
      </g>
      <g fill="none" stroke={core} strokeWidth={1}>
        {ticks.map((tk) => (
          <path key={tk.key} d={tk.d} opacity={tk.opacity} />
        ))}
      </g>
      {flashes}
    </g>
  );
};
