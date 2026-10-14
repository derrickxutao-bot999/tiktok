// "DETAIL A · 10:1" - an engineering-drawing magnifier for the frozen frame.
//
// The same instant, rendered again by <TheTouch/> through the same viewpoint
// at ten times the focal length, clipped to a circle in the empty upper half
// of the frame and tied to the real gap by a leader. At 540 px/m the last
// centimetre is ~5 px; in the detail it is ~54 px and can carry its label.

import React from "react";
import { AbsoluteFill } from "remotion";
import { GapMeasure } from "./fx";
import { TheTouch } from "./TheTouch";
import { ballAt } from "../lib/ball";
import { Look, WorldStyle } from "../lib/eras";
import { clamp, smoothstep } from "../lib/math";
import { FONTS } from "../lib/palette";
import { ScaleAt, solvePose } from "../lib/rig";
import { HEIGHT, WIDTH } from "../lib/timeline";
import { contactPointAt } from "../lib/touch";
import { D0, Shot, cameraFromShot, project } from "../lib/world";

export type DetailInsetProps = {
  /** World time of the frozen instant. */
  t: number;
  /** The main frame's shot; the detail magnifies it. */
  shot: Shot;
  look: Look;
  scaleAt: ScaleAt;
  world: WorldStyle;
  accent?: string;
  /** 0..1: the ring draws, the lens opens, the leader and labels follow. */
  progress: number;
  /** Overall fade (for leaving). */
  opacity: number;
  color: string;
  center?: { x: number; y: number };
  radius?: number;
  magnification?: number;
  idPrefix: string;
};

export const DetailInset: React.FC<DetailInsetProps> = ({
  t,
  shot,
  look,
  scaleAt,
  world,
  accent,
  progress,
  opacity,
  color,
  center = { x: 560, y: 640 },
  radius = 300,
  magnification = 10,
  idPrefix,
}) => {
  if (opacity <= 0 || progress <= 0) return null;
  const pose = solvePose(t, look, { scaleAt });
  const toe = pose.legs.L.toe;
  const cp = contactPointAt(Math.min(t, 0));
  const b = ballAt(t);
  // Magnify about the middle of the gap, from the same camera height.
  const mid = { x: (toe.x + cp.x) / 2, y: (toe.y + cp.y) / 2 };
  const detail: Shot = {
    lookX: mid.x,
    lookY: mid.y,
    screenX: center.x,
    screenY: center.y,
    pxPerM: shot.pxPerM * magnification,
    height: shot.height,
  };
  const main = cameraFromShot(shot);
  const gapOnScreen = project(main, mid.x, mid.y, b.z);

  const ring = smoothstep(0, 0.45, progress);
  const lens = smoothstep(0.15, 0.6, progress);
  const leader = smoothstep(0.4, 0.75, progress);
  const label = smoothstep(0.6, 1, progress);

  // Leader from a small circle round the real gap to the lens rim.
  const dx = center.x - gapOnScreen.x;
  const dy = center.y - gapOnScreen.y;
  const d = Math.hypot(dx, dy) || 1;
  const smallR = 26;
  const a0 = { x: gapOnScreen.x + (dx / d) * smallR, y: gapOnScreen.y + (dy / d) * smallR };
  const a1 = { x: center.x - (dx / d) * radius, y: center.y - (dy / d) * radius };

  return (
    <AbsoluteFill style={{ opacity }}>
      <AbsoluteFill style={{ clipPath: `circle(${(radius * lens).toFixed(2)}px at ${center.x}px ${center.y}px)` }}>
        <TheTouch
          variant="veteran-39"
          t={t}
          shot={detail}
          look={look}
          scaleAt={scaleAt}
          world={world}
          accent={accent}
          idPrefix={`${idPrefix}-lens`}
          overlay={({ camera, pose: p }) => {
            const a = project(camera, p.legs.L.toe.x, p.legs.L.toe.y);
            const on = project(camera, cp.x, cp.y, b.z);
            return (
              <GapMeasure
                a={a}
                b={on}
                label="1 cm"
                progress={label}
                color={color}
                pxPerM={camera.f / D0}
                fontSize={40}
                idPrefix={`${idPrefix}-gm`}
              />
            );
          }}
        />
      </AbsoluteFill>
      <svg width={WIDTH} height={HEIGHT} style={{ position: "absolute", inset: 0 }}>
        <g fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round">
          <circle cx={center.x} cy={center.y} r={radius} pathLength={1} strokeDasharray={`${ring} 1`} transform={`rotate(-90 ${center.x} ${center.y})`} />
          <circle cx={gapOnScreen.x} cy={gapOnScreen.y} r={smallR} pathLength={1} strokeDasharray={`${ring} 1`} opacity={0.9} />
          {leader > 0 ? (
            <line
              x1={a0.x}
              y1={a0.y}
              x2={a0.x + (a1.x - a0.x) * leader}
              y2={a0.y + (a1.y - a0.y) * leader}
              strokeDasharray="2 5"
              opacity={0.8}
            />
          ) : null}
        </g>
        <g
          opacity={clamp(label * 1.4)}
          fill={color}
          style={{ fontFamily: FONTS.mono, letterSpacing: 4 }}
          textAnchor="middle"
        >
          <text x={center.x} y={center.y - radius - 26} fontSize={24}>
            DETAIL A · {magnification}:1
          </text>
          <text x={gapOnScreen.x + (dx > 0 ? -smallR - 14 : smallR + 14)} y={gapOnScreen.y - smallR - 8} fontSize={22}>
            A
          </text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};
