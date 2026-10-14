import React from "react";
import { Composition } from "remotion";
import "./lib/fonts";
import { Film } from "./Film";
import { MatchCutProbe, MatchCutProbeProps } from "./MatchCutProbe";
import { Scene1Pursuit } from "./scenes/Scene1Pursuit";
import { Scene2Rosario } from "./scenes/Scene2Rosario";
import { Scene3Journey } from "./scenes/Scene3Journey";
import { Scene4TheTouch } from "./scenes/Scene4TheTouch";
import { FILM_FRAMES, FPS, HEIGHT, S4, SCENES, WIDTH } from "./lib/timeline";

const size = { fps: FPS, width: WIDTH, height: HEIGHT } as const;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Film" component={Film} durationInFrames={FILM_FRAMES} {...size} />
    <Composition id="Scene1" component={Scene1Pursuit} durationInFrames={SCENES.pursuit.duration} {...size} />
    <Composition id="Scene2" component={Scene2Rosario} durationInFrames={SCENES.rosario.duration} {...size} />
    <Composition id="Scene3" component={Scene3Journey} durationInFrames={SCENES.journey.duration} {...size} />
    <Composition id="Scene4" component={Scene4TheTouch} durationInFrames={SCENES.touch.duration} {...size} />
    <Composition
      id="MatchCutProbe"
      component={MatchCutProbe}
      durationInFrames={1}
      defaultProps={{ frame: S4.matchCut, variant: "veteran-39", markers: true } satisfies MatchCutProbeProps}
      {...size}
    />
  </>
);
