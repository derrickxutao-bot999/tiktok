// PLACEHOLDER stick figure; replaced by the real vector athlete.
import React from "react";
import { Pose } from "../lib/rig";
import { Camera, project } from "../lib/world";
import { WorldStyle } from "../lib/eras";

export type AthleteProps = {
  pose: Pose;
  camera: Camera;
  world: WorldStyle;
  idPrefix: string;
  /** Rendered between the far-side limbs and the near-side limbs (the ball at contact). */
  midLayer?: React.ReactNode;
};

export const Athlete: React.FC<AthleteProps> = ({ pose, camera, midLayer }) => {
  const P = (p: { x: number; y: number }) => project(camera, p.x, p.y);
  const seg = (pts: { x: number; y: number }[], col: string, w: number) => (
    <polyline points={pts.map((p) => `${P(p).x},${P(p).y}`).join(" ")} stroke={col} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  );
  const k = P(pose.pelvis).k;
  const L = pose.legs.L, R = pose.legs.R, aL = pose.arms.L, aR = pose.arms.R;
  const h = P(pose.head.center);
  return (
    <g>
      {seg([R.hip, R.knee, R.ankle, R.toe], "#557", 0.09 * k)}
      {seg([aR.shoulder, aR.elbow, aR.wrist, aR.hand], "#557", 0.07 * k)}
      {seg([pose.pelvis, pose.neck], pose.look.kit.shirt.kind === "solid" ? pose.look.kit.shirt.color : pose.look.kit.shirt.colors[0], 0.22 * k)}
      <circle cx={h.x} cy={h.y} r={pose.head.radius * k} fill="#ddd" />
      {midLayer}
      {seg([L.hip, L.knee, L.ankle, L.toe], "#ccd", 0.09 * k)}
      {seg([L.heel, L.ankle, L.toe], "#fff", 0.04 * k)}
      {seg([aL.shoulder, aL.elbow, aL.wrist, aL.hand], "#ccd", 0.07 * k)}
    </g>
  );
};
