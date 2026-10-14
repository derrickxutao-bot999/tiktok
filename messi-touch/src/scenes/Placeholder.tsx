// Slate for scenes that are planned but not built yet: keeps the film's
// timing intact so Scenes 1 and 4 can be watched in place.

import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { FONTS } from "../lib/palette";

export const Placeholder: React.FC<{
  number: string;
  title: string;
  lines: string[];
  from: string;
  to: string;
  /** Fade in from this colour (Scene 2 begins on Scene 1's white). */
  enterFrom?: string;
}> = ({ number, title, lines, from, to, enterFrom }) => {
  const frame = useCurrentFrame();
  const enter = enterFrom ? interpolate(frame, [0, 45], [1, 0], { extrapolateRight: "clamp" }) : 0;
  const rise = interpolate(frame, [10, 60], [24, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const alpha = interpolate(frame, [10, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${from}, ${to})` }}>
      <AbsoluteFill style={{ padding: "0 96px", justifyContent: "center", opacity: alpha, transform: `translateY(${rise}px)` }}>
        <div style={{ fontFamily: FONTS.mono, fontSize: 26, letterSpacing: 6, color: "rgba(255,255,255,0.55)" }}>SCENE {number} · PLANNED</div>
        <div style={{ fontFamily: FONTS.condensed, fontWeight: 700, fontSize: 96, letterSpacing: 4, color: "#fff", margin: "18px 0 30px" }}>
          {title}
        </div>
        {lines.map((l) => (
          <div key={l} style={{ fontFamily: FONTS.condensed, fontWeight: 500, fontSize: 34, lineHeight: 1.45, color: "rgba(255,255,255,0.78)" }}>
            {l}
          </div>
        ))}
      </AbsoluteFill>
      {enter > 0 ? <AbsoluteFill style={{ backgroundColor: enterFrom, opacity: enter }} /> : null}
    </AbsoluteFill>
  );
};
