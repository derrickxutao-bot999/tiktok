// PLACEHOLDER ball; replaced by the real one.
import React from "react";
import { BallState, BALL } from "../lib/ball";
import { Camera, project } from "../lib/world";
import { WorldStyle } from "../lib/eras";

export type BallProps = { ball: BallState; camera: Camera; world: WorldStyle; idPrefix: string };

export const Ball: React.FC<BallProps> = ({ ball, camera }) => {
  const p = project(camera, ball.x, ball.y, ball.z);
  const r = BALL.r * p.k;
  const deg = (ball.roll * 180) / Math.PI;
  return (
    <g transform={`translate(${p.x} ${p.y}) rotate(${deg})`}>
      <circle r={r} fill="#eee" />
      <path d={`M ${-r} 0 L ${r} 0 M 0 ${-r} L 0 ${r}`} stroke="#222" strokeWidth={r * 0.08} />
    </g>
  );
};

export const BallShadow: React.FC<BallProps> = ({ ball, camera }) => {
  const p = project(camera, ball.x, 0, ball.z);
  return <ellipse cx={p.x} cy={p.y} rx={BALL.r * p.k * 1.1} ry={BALL.r * p.k * 0.25} fill="rgba(0,0,0,0.5)" />;
};
