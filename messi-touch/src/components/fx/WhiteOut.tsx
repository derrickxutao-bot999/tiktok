// Burn to white, the way film overexposes. The picture behind is pushed up
// in exposure with its contrast held, so the highlights clip first and the
// darks keep their depth (a flash, not a fog). Only in the last stretch does
// white light flood in: it opens from the centre and reaches the corners
// last through a faint warm halation fringe. At amount 1 the frame is white.

import React from "react";
import { AbsoluteFill } from "remotion";
import { clamp, smoothstep } from "../../lib/math";

export type WhiteOutProps = {
  /** 0..1 */
  amount: number;
};

/** Warm film halation at the edge of the flood. */
const HALATION = [255, 236, 214] as const;

export const WhiteOut: React.FC<WhiteOutProps> = ({ amount }) => {
  const a = clamp(amount);
  if (a <= 0) return null;
  if (a >= 1) return <AbsoluteFill style={{ backgroundColor: "#FFFFFF" }} />;
  // Exposure in stops: contrast above 1 holds the blacks while the highlights blow out.
  const exposure = Math.pow(2, 3.6 * Math.pow(a, 1.15));
  const contrast = 1 + 1.2 * a * (1 - smoothstep(0.6, 1, a));
  // Colour drains as the exposure climbs, as it does on film: pale, never a louder version of itself.
  const saturation = 1 - 0.9 * smoothstep(0.3, 0.9, a);
  const filter = `brightness(${exposure.toFixed(3)}) contrast(${contrast.toFixed(3)}) saturate(${saturation.toFixed(3)})`;
  // The flood: centre leads, the edges lag behind a warm fringe that fades as the frame saturates.
  const flood = smoothstep(0.55, 1, a);
  const centre = clamp(1.4 * flood);
  const mid = flood * flood;
  const edge = flood * flood * flood;
  const w = Math.sin(Math.PI * flood);
  const warm = HALATION.map((c) => Math.round(c + (255 - c) * (1 - w))).join(",");
  return (
    <>
      <AbsoluteFill style={{ backdropFilter: filter, WebkitBackdropFilter: filter }} />
      {flood > 0 ? (
        <AbsoluteFill
          style={{
            mixBlendMode: "plus-lighter",
            background: `radial-gradient(ellipse 80% 58% at 50% 54%, rgba(255,255,255,${centre.toFixed(3)}) 0%, rgba(255,255,255,${mid.toFixed(3)}) 45%, rgba(${warm},${((mid + edge) / 2).toFixed(3)}) 72%, rgba(${warm},${edge.toFixed(3)}) 100%)`,
          }}
        />
      ) : null}
    </>
  );
};
