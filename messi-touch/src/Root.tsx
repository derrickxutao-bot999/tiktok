import React from "react";
import { Composition } from "remotion";
import { Scene1Pursuit } from "./scenes/Scene1Pursuit";
import { Scene4TheTouch } from "./scenes/Scene4TheTouch";
import { FPS, HEIGHT, SCENES, WIDTH } from "./lib/timeline";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Scene1" component={Scene1Pursuit} durationInFrames={SCENES.pursuit.duration} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition id="Scene4" component={Scene4TheTouch} durationInFrames={SCENES.touch.duration} fps={FPS} width={WIDTH} height={HEIGHT} />
  </>
);
