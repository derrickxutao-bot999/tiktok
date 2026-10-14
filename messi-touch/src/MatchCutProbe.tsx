// Diagnostic: one Scene 4 frame rendered with a chosen variant, optionally
// with engine markers (the toe tip and the ball outline as the engine computes
// them). tools/matchcut.mjs renders frame 300 both ways and compares them.

import React from "react";
import { AbsoluteFill } from "remotion";
import { Shot4 } from "./scenes/Scene4TheTouch";
import { BALL, ballAt } from "./lib/ball";
import { scene4T } from "./lib/clock";
import { Variant, VARIANT_LOOK } from "./lib/eras";
import { solvePose } from "./lib/rig";
import { scene4Shot } from "./lib/shots";
import { HEIGHT, WIDTH } from "./lib/timeline";
import { cameraFromShot, project } from "./lib/world";

export type MatchCutProbeProps = { frame: number; variant: Variant; markers: boolean };

export const MatchCutProbe: React.FC<MatchCutProbeProps> = ({ frame, variant, markers }) => {
  const t = scene4T(frame);
  const camera = cameraFromShot(scene4Shot(frame));
  const toe = solvePose(t, VARIANT_LOOK[variant]).legs.L.toe;
  const b = ballAt(t);
  const tp = project(camera, toe.x, toe.y);
  const bp = project(camera, b.x, b.y, b.z);
  return (
    <AbsoluteFill>
      <Shot4 frame={frame} variant={variant} id="probe" overlays={false} />
      {markers ? (
        <svg width={WIDTH} height={HEIGHT} style={{ position: "absolute" }}>
          <path d={`M ${tp.x - 30} ${tp.y} H ${tp.x + 30} M ${tp.x} ${tp.y - 30} V ${tp.y + 30}`} stroke="#ff00ff" strokeWidth={1} />
          <circle cx={bp.x} cy={bp.y} r={BALL.r * bp.k} fill="none" stroke="#00ffff" strokeWidth={1} />
        </svg>
      ) : null}
    </AbsoluteFill>
  );
};
