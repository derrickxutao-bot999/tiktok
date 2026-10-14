import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { TheTouch } from "../components/TheTouch";
import { scene4T } from "../lib/clock";
import { scene4Shot } from "../lib/shots";
import { S4 } from "../lib/timeline";

export const Scene4TheTouch: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <TheTouch variant={frame < S4.matchCut ? "veteran-39" : "rosario-kid"} t={scene4T(frame)} shot={scene4Shot(frame)} />
    </AbsoluteFill>
  );
};
