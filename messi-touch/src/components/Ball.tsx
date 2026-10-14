// The ball. It is drawn exactly on project(camera, ball) with radius
// BALL.r * k, so the match cut lands it on the same pixels in both worlds;
// every decoration stays inside that disc. The surface pattern turns with
// ball.roll; the light (shading, highlight, rim, occlusion) stays put.
//
//   stadium-night  a white ball, hairline propeller seams, a crisp cool rim.
//   rosario-dusk   an old leather ball, stitched panels and scuffs, a warm rim.

import React from "react";
import { BallState, BALL } from "../lib/ball";
import { WorldStyle } from "../lib/eras";
import { PALETTE, lightOf } from "../lib/palette";
import { HEIGHT, WIDTH } from "../lib/timeline";
import { Camera, project } from "../lib/world";
import { LEATHER, MODERN, polyPath } from "./env/ballPatterns";
import { mix } from "./env/common";

export type BallProps = { ball: BallState; camera: Camera; world: WorldStyle; idPrefix: string };

const N = PALETTE["stadium-night"];
const D = PALETTE["rosario-dusk"];

/** Material tones, all derived from the palette: a white ball under floodlights, old leather at sunset. */
const NIGHT_BALL = {
  lit: N.floodlight,
  mid: mix(N.line, N.ruler, 0.12),
  low: mix(N.ruler, N.light.body, 0.3),
  dark: mix(N.light.body, N.light.bodyLit, 0.4),
  seam: mix(N.ruler, N.light.body, 0.5),
  shade: N.light.body,
  back: N.light.glow,
  spec: N.floodlight,
  /** Where the body gradient reaches mid, low and dark: matte white holds its light further round. */
  stops: [0.48, 0.8, 0.98],
  shadeO: 0.42,
} as const;
const DUSK_BALL = {
  lit: mix(D.haze, D.dirtFar, 0.3),
  mid: mix(D.dirtFar, D.haze, 0.2),
  low: mix(D.light.bodyLit, D.dirtFar, 0.3),
  dark: D.light.body,
  seam: D.light.bodyFar,
  thread: mix(D.line, D.haze, 0.3),
  pent: mix(D.dirtA, D.light.body, 0.4),
  hex: D.dirtFar,
  scuff: mix(D.haze, D.dirtFar, 0.4),
  shade: D.light.bodyFar,
  back: D.light.glow,
  spec: D.sun,
  stops: [0.38, 0.7, 0.93],
  shadeO: 0.7,
} as const;

/**
 * Squash along the contact normal (world y-up angle -> SVG angle), bulge
 * across it. The pivot is the contact point on the toe side of the ball, so
 * the flattened face stays against the toe while the far side gives.
 */
const squashTransform = (b: BallState, r: number) => {
  if (b.squash <= 1e-4) return "";
  const deg = (-b.squashAngle * 180) / Math.PI;
  const cx = -Math.cos(b.squashAngle) * r;
  const cy = Math.sin(b.squashAngle) * r;
  return ` translate(${cx} ${cy}) rotate(${deg}) scale(${1 - b.squash} ${1 + b.squash * 0.5}) rotate(${-deg}) translate(${-cx} ${-cy})`;
};

export const Ball: React.FC<BallProps> = ({ ball, camera, world, idPrefix }) => {
  const p = project(camera, ball.x, ball.y, ball.z);
  const r = BALL.r * p.k;
  if (r < 0.3 || p.x < -r || p.x > WIDTH + r || p.y < -r || p.y > HEIGHT + r) return null;
  const id = `${idPrefix}-ball`;
  const L = lightOf(world);
  const lx = L.rimDir.x;
  const ly = L.rimDir.y;
  const night = world === "stadium-night";
  const rot = ball.roll;
  const hair = Math.min(2.6, Math.max(0.5, r * 0.012));
  const rimW = Math.min(3, Math.max(0.8, r * 0.018));
  const C = night ? NIGHT_BALL : DUSK_BALL;

  return (
    <g transform={`translate(${p.x} ${p.y})${squashTransform(ball, r)}`}>
      <defs>
        <clipPath id={`${id}-clip`}>
          <circle r={r} />
        </clipPath>
        <radialGradient id={`${id}-body`} gradientUnits="userSpaceOnUse" cx={0} cy={0} r={r * 1.5} fx={lx * r * 0.42} fy={ly * r * 0.42}>
          <stop offset={0} stopColor={C.lit} />
          <stop offset={C.stops[0]} stopColor={C.mid} />
          <stop offset={C.stops[1]} stopColor={C.low} />
          <stop offset={C.stops[2]} stopColor={C.dark} />
          <stop offset={1} stopColor={C.dark} />
        </radialGradient>
        {/* The shadow side darkens the pattern too. */}
        <linearGradient id={`${id}-shade`} gradientUnits="userSpaceOnUse" x1={lx * r} y1={ly * r} x2={-lx * r} y2={-ly * r}>
          <stop offset={0.35} stopColor={C.shade} stopOpacity={0} />
          <stop offset={1} stopColor={C.shade} stopOpacity={C.shadeO} />
        </linearGradient>
        <linearGradient id={`${id}-ao`} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={0} y2={r}>
          <stop offset={0.3} stopColor={C.shade} stopOpacity={0} />
          <stop offset={1} stopColor={C.shade} stopOpacity={0.6} />
        </linearGradient>
        <linearGradient id={`${id}-rim`} gradientUnits="userSpaceOnUse" x1={-lx * r} y1={-ly * r} x2={lx * r} y2={ly * r}>
          <stop offset={0} stopColor={C.back} stopOpacity={0.55} />
          <stop offset={0.3} stopColor={C.back} stopOpacity={0.12} />
          <stop offset={0.6} stopColor={L.contour} stopOpacity={0.1} />
          <stop offset={0.9} stopColor={L.contour} stopOpacity={0.9} />
          <stop offset={1} stopColor={L.contour} stopOpacity={1} />
        </linearGradient>
        <radialGradient id={`${id}-spec`}>
          <stop offset={0} stopColor={C.spec} stopOpacity={0.95} />
          <stop offset={1} stopColor={C.spec} stopOpacity={0} />
        </radialGradient>
      </defs>

      <circle r={r} fill={`url(#${id}-body)`} />
      <g clipPath={`url(#${id}-clip)`}>
        {night ? (
          <path d={polyPath(MODERN.seams, r, rot)} fill="none" stroke={C.seam} strokeWidth={hair} strokeLinecap="round" strokeLinejoin="round" opacity={0.6} />
        ) : (
          <DuskSurface r={r} rot={rot} hair={hair} />
        )}
        <circle r={r} fill={`url(#${id}-shade)`} />
        <circle r={r} fill={`url(#${id}-ao)`} />
        {/* The floodlights (or the sun) caught on the surface: fixed to the light, not the leather. */}
        {night ? (
          <>
            <ellipse cx={lx * r * 0.5} cy={ly * r * 0.5} rx={r * 0.13} ry={r * 0.09} fill={`url(#${id}-spec)`} opacity={0.85} />
            <ellipse cx={-lx * r * 0.42} cy={ly * r * 0.6} rx={r * 0.06} ry={r * 0.045} fill={`url(#${id}-spec)`} opacity={0.5} />
          </>
        ) : (
          <ellipse cx={lx * r * 0.62} cy={ly * r * 0.62} rx={r * 0.09} ry={r * 0.16} fill={`url(#${id}-spec)`} opacity={0.35} />
        )}
      </g>
      <circle r={r - rimW / 2} fill="none" stroke={`url(#${id}-rim)`} strokeWidth={rimW} />
    </g>
  );
};

/** The leather: tinted panels, stitched seams, worn patches; all turn with the ball. */
const DuskSurface: React.FC<{ r: number; rot: number; hair: number }> = ({ r, rot, hair }) => {
  const C = DUSK_BALL;
  const detail = r > 26;
  const pents = LEATHER.panels.filter((p) => p.pent).map((p) => p.pts);
  const lightHex = LEATHER.panels.filter((p) => !p.pent && p.tone > 0.55).map((p) => p.pts);
  return (
    <>
      <path d={polyPath(pents, r, rot, true)} fill={C.pent} opacity={0.4} />
      <path d={polyPath(lightHex, r, rot, true)} fill={C.hex} opacity={0.16} />
      <path d={polyPath(LEATHER.scuffs, r, rot, true)} fill={C.scuff} opacity={0.2} />
      <path d={polyPath(LEATHER.seams, r, rot)} fill="none" stroke={C.seam} strokeWidth={hair * 1.5} strokeLinejoin="round" opacity={0.85} />
      {detail ? (
        <>
          <path d={polyPath(LEATHER.stitches, r, rot)} fill="none" stroke={C.thread} strokeWidth={hair * 0.8} strokeLinecap="round" opacity={0.55} />
          <path d={polyPath(LEATHER.scratches, r, rot)} fill="none" stroke={C.scuff} strokeWidth={hair * 0.6} opacity={0.35} />
        </>
      ) : null}
    </>
  );
};

/**
 * Shadows on the ground under the ball: a contact shadow, plus the four faint
 * floodlight shadows at night or one long low-sun shadow at dusk. Each cast
 * shadow is an ellipse on the ground plane (y = 0, depth ball.z) mapped to the
 * screen by the local ground projection, so it flattens with the camera.
 */
export const BallShadow: React.FC<BallProps> = ({ ball, camera, world, idPrefix }) => {
  const p = project(camera, ball.x, 0, ball.z);
  const k = p.k;
  const rb = BALL.r * k;
  if (rb < 0.3 || p.x < -rb * 14 || p.x > WIDTH + rb * 14 || p.y < -rb || p.y > HEIGHT + rb * 2) return null;
  const flat = Math.max(0.008, camera.h / ball.z);
  const id = `${idPrefix}-bsh`;
  const L = lightOf(world);
  // Shadows are the world's darkest tone, not black: warm on the dirt, cool on the grass.
  const ink = L.bodyFar;
  // Ground vector (dx along the line, dz in depth) -> screen vector.
  const M = (gx: number, gz: number) => [gx * k, -gz * k * flat];
  const night = world === "stadium-night";
  const cast = L.shadows.map((s, i) => {
    // Palette directions are screen-space at a nominal flattening of 0.2.
    const gl = Math.hypot(s.dx, s.dy / 0.2);
    const ux = s.dx / gl;
    const uz = -s.dy / 0.2 / gl;
    const a = BALL.r * (night ? 2.1 : 6.5);
    const b = BALL.r * (night ? 0.8 : 0.95);
    const [m1x, m1y] = M(ux * a, uz * a);
    const [m2x, m2y] = M(-uz * b, ux * b);
    const [ox, oy] = M(ux * a * 0.85, uz * a * 0.85);
    return (
      <circle
        key={i}
        r={1}
        transform={`matrix(${m1x} ${m1y} ${m2x} ${m2y} ${p.x + ox} ${p.y + oy})`}
        fill={`url(#${id}-cast)`}
        opacity={s.opacity}
      />
    );
  });
  return (
    <g>
      <defs>
        <radialGradient id={`${id}-g`}>
          <stop offset={0} stopColor={ink} stopOpacity={0.9} />
          <stop offset={0.55} stopColor={ink} stopOpacity={0.45} />
          <stop offset={1} stopColor={ink} stopOpacity={0} />
        </radialGradient>
        {/* Darkest at the contact end, thinning out along the shadow. */}
        <radialGradient id={`${id}-cast`} fx={0.08} fy={0.5}>
          <stop offset={0} stopColor={ink} stopOpacity={0.95} />
          <stop offset={0.6} stopColor={ink} stopOpacity={0.4} />
          <stop offset={1} stopColor={ink} stopOpacity={0} />
        </radialGradient>
      </defs>
      {cast}
      <ellipse cx={p.x} cy={p.y} rx={rb * 1.05} ry={Math.max(0.8, rb * 1.05 * flat)} fill={`url(#${id}-g)`} opacity={0.75} />
      <ellipse cx={p.x} cy={p.y} rx={rb * 0.5} ry={Math.max(0.6, rb * 0.5 * flat)} fill={`url(#${id}-g)`} opacity={0.9} />
    </g>
  );
};
