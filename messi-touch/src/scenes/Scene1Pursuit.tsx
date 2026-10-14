import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { TheTouch } from "../components/TheTouch";
import { eraIndexAt, eraScaleAtT, scene1T } from "../lib/clock";
import { ERAS } from "../lib/eras";
import { scene1Shot } from "../lib/shots";

export const Scene1Pursuit: React.FC = () => {
  const frame = useCurrentFrame();
  const t = scene1T(frame);
  const era = ERAS[eraIndexAt(frame)];
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <TheTouch variant="veteran-39" t={t} shot={scene1Shot(frame)} look={era} scaleAt={eraScaleAtT} world="stadium-night" />
    </AbsoluteFill>
  );
};
