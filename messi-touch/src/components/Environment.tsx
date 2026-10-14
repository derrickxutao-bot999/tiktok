// PLACEHOLDER environment; replaced by the real one.
import React from "react";
import { Camera, project, D0, LINE_WIDTH, LINE_Z } from "../lib/world";
import { WorldStyle } from "../lib/eras";
import { WIDTH, HEIGHT } from "../lib/timeline";

export type EnvironmentProps = { camera: Camera; world: WorldStyle; t: number; idPrefix: string };

export const Backdrop: React.FC<EnvironmentProps> = ({ camera, world }) => (
  <rect x={0} y={0} width={WIDTH} height={Math.max(0, Math.min(HEIGHT, camera.cy))} fill={world === "stadium-night" ? "#0b1020" : "#e9a24a"} />
);

export const Ground: React.FC<EnvironmentProps> = ({ camera, world }) => {
  const top = Math.max(0, camera.cy);
  const stripes: React.ReactNode[] = [];
  const zNear = Math.max(0.5, (camera.h * camera.f) / (HEIGHT - camera.cy + 1));
  const zFar = 200;
  const x0 = Math.floor((camera.x - 60) / 5) * 5;
  for (let x = x0; x < camera.x + 60; x += 5) {
    if ((x / 5) % 2 === 0) continue;
    const a = project(camera, x, 0, zNear), b = project(camera, x + 5, 0, zNear);
    const c = project(camera, x + 5, 0, zFar), d = project(camera, x, 0, zFar);
    stripes.push(<polygon key={x} points={`${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y} ${d.x},${d.y}`} fill={world === "stadium-night" ? "#16301f" : "#8a3b1c"} />);
  }
  const l1 = project(camera, 0, 0, LINE_Z - LINE_WIDTH / 2), l2 = project(camera, 0, 0, LINE_Z + LINE_WIDTH / 2);
  void D0;
  return (
    <g>
      <rect x={0} y={top} width={WIDTH} height={HEIGHT - top} fill={world === "stadium-night" ? "#11281a" : "#7a321a"} />
      {stripes}
      <rect x={0} y={l2.y} width={WIDTH} height={Math.max(1, l1.y - l2.y)} fill="#f2f2f2" />
    </g>
  );
};
