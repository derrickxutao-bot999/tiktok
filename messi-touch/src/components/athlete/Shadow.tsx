// Ground shadows of the figure on y = 0.
//
// The runner is flat at depth D0, so a shadow on the ground is an affine
// shear of his silhouette: a point h metres up lands h * (dx, dy) * k px from
// its foot along the screen direction of each light (palette light.shadows).
// The silhouette fades with height, and each foot adds a contact shadow that
// tightens and darkens as the foot comes down.

import React from "react";
import { WorldStyle } from "../../lib/eras";
import { clamp } from "../../lib/math";
import { lightOf } from "../../lib/palette";
import { Pose } from "../../lib/rig";
import { HEIGHT, WIDTH } from "../../lib/timeline";
import { Camera, D0 } from "../../lib/world";
import { buildFigure, bySize } from "./figure";

export type AthleteShadowProps = { pose: Pose; camera: Camera; world: WorldStyle; idPrefix: string };

export const AthleteShadow: React.FC<AthleteShadowProps> = ({ pose, camera, world, idPrefix }) => {
  const g = buildFigure(pose, camera);
  const L = lightOf(world);
  const id = (s: string) => `${idPrefix}-ash-${s}`;
  const gy = g.groundY;
  const H = 1.8 * pose.scale * g.k;
  const parts = [...g.far.parts, ...g.body.parts, ...g.leg.parts, ...g.arm.parts];
  const reach = Math.max(...L.shadows.map((s) => Math.abs(s.dx))) * H;
  const drop = Math.max(...L.shadows.map((s) => s.dy)) * H;
  const blur = bySize(g.k, 3, 12);
  // Where the shadows can fall: the figure's span widened by the longest
  // shadow, from just above the ground line to the end of the longest drop.
  // Nothing there on screen (the eye close-up, with the ground far below the
  // frame) and nothing is drawn. Otherwise the blur's region is clamped to
  // the frame plus the blur's reach, so it never allocates thousands of
  // pixels off screen.
  const feetX = [g.feet.L.toe.x, g.feet.L.heel.x, g.feet.R.toe.x, g.feet.R.heel.x];
  const spanX0 = Math.min(g.box.x, ...feetX) - reach - 0.1 * H;
  const spanX1 = Math.max(g.box.x + g.box.w, ...feetX) + reach + 0.1 * H;
  const spanY0 = gy - 3 * blur - 0.1 * H;
  const spanY1 = gy + drop + 3 * blur + 0.1 * H;
  if (spanY0 > HEIGHT || spanY1 < 0 || spanX0 > WIDTH || spanX1 < 0) return null;
  const edge = 3 * blur + 8;
  const rx0 = Math.max(spanX0, -edge);
  const ry0 = Math.max(spanY0, -edge);
  const region = { x: rx0, y: ry0, width: Math.max(1, Math.min(spanX1, WIDTH + edge) - rx0), height: Math.max(1, Math.min(spanY1, HEIGHT + edge) - ry0) };
  // Ground ellipses look as flat as the camera is low.
  const flat = clamp((camera.h / D0) * 1.6, 0.05, 0.3);

  return (
    <g>
      <defs>
        <g id={id("sil")}>
          {parts.map((p) => (
            <path key={p.id} d={p.d} />
          ))}
        </g>
        <linearGradient id={id("fade")} gradientUnits="userSpaceOnUse" x1={0} y1={gy} x2={0} y2={gy - H}>
          <stop offset={0} stopColor="#000000" stopOpacity={1} />
          <stop offset={0.45} stopColor="#000000" stopOpacity={0.55} />
          <stop offset={1} stopColor="#000000" stopOpacity={0.15} />
        </linearGradient>
        <radialGradient id={id("foot")}>
          <stop offset={0} stopColor="#000000" stopOpacity={1} />
          <stop offset={0.55} stopColor="#000000" stopOpacity={0.55} />
          <stop offset={1} stopColor="#000000" stopOpacity={0} />
        </radialGradient>
        <filter id={id("blur")} filterUnits="userSpaceOnUse" {...region}>
          <feGaussianBlur stdDeviation={blur} />
        </filter>
      </defs>
      <g filter={`url(#${id("blur")})`}>
        {L.shadows.map((s, i) => (
          <use
            key={i}
            href={`#${id("sil")}`}
            fill={`url(#${id("fade")})`}
            opacity={s.opacity}
            transform={`matrix(1 0 ${(-s.dx).toFixed(4)} ${(-s.dy).toFixed(4)} ${(s.dx * gy).toFixed(2)} ${(gy * (1 + s.dy)).toFixed(2)})`}
          />
        ))}
      </g>
      {(["R", "L"] as const).map((side) => {
        const f = g.feet[side];
        const lift = clamp(f.heightM / 0.35);
        const half = Math.abs(f.toe.x - f.heel.x) / 2 + 0.03 * g.k;
        const rx = half * (1 + 1.6 * lift);
        const strength = (1 - lift) * (1 - lift);
        if (strength < 0.02) return null;
        return (
          <ellipse
            key={side}
            cx={(f.toe.x + f.heel.x) / 2}
            cy={gy}
            rx={rx}
            ry={rx * flat}
            fill={`url(#${id("foot")})`}
            opacity={0.75 * strength}
          />
        );
      })}
    </g>
  );
};
