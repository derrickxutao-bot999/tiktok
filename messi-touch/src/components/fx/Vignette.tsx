// A lens vignette: an ellipse fitted to the tall frame, centred a little
// below the middle where the action is, falling off smoothly to the corners.

import React from "react";
import { AbsoluteFill } from "remotion";
import { clamp } from "../../lib/math";
import { rgba } from "./util";

export type VignetteProps = {
  /** 0..1 darkness at the corners. */
  strength?: number;
  color?: string;
  /** Centre of the clear area, fractions of the frame. */
  center?: { x: number; y: number };
};

export const Vignette: React.FC<VignetteProps> = ({ strength = 0.55, color = "#000000", center = { x: 0.5, y: 0.56 } }) => {
  const s = clamp(strength);
  if (s <= 0) return null;
  // A smooth (roughly quadratic) ramp written out as stops avoids a visible ring.
  const stops = [0, 0.3, 0.5, 0.65, 0.78, 0.9, 1].map((r) => {
    const u = clamp((r - 0.3) / 0.7);
    return `${rgba(color, s * u * u * (0.6 + 0.4 * u))} ${(r * 100).toFixed(0)}%`;
  });
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        background: `radial-gradient(ellipse 78% 64% at ${(center.x * 100).toFixed(1)}% ${(center.y * 100).toFixed(1)}%, ${stops.join(", ")})`,
      }}
    />
  );
};
