// The whole film: four scenes back to back (60 s at 60 fps).
import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { Scene1Pursuit } from "./scenes/Scene1Pursuit";
import { Scene2Rosario } from "./scenes/Scene2Rosario";
import { Scene3Journey } from "./scenes/Scene3Journey";
import { Scene4TheTouch } from "./scenes/Scene4TheTouch";
import { SCENES } from "./lib/timeline";

export const Film: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <Sequence name="1 Pursuit" from={SCENES.pursuit.from} durationInFrames={SCENES.pursuit.duration}>
      <Scene1Pursuit />
    </Sequence>
    <Sequence name="2 Rosario" from={SCENES.rosario.from} durationInFrames={SCENES.rosario.duration}>
      <Scene2Rosario />
    </Sequence>
    <Sequence name="3 Journey" from={SCENES.journey.from} durationInFrames={SCENES.journey.duration}>
      <Scene3Journey />
    </Sequence>
    <Sequence name="4 The Touch" from={SCENES.touch.from} durationInFrames={SCENES.touch.duration}>
      <Scene4TheTouch />
    </Sequence>
  </AbsoluteFill>
);
