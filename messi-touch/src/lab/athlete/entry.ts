import { registerRoot, Composition } from "remotion";
import React from "react";
import { Lab } from "./LabAthlete";

const Root: React.FC = () =>
  React.createElement(Composition, { id: "LabAthlete", component: Lab, durationInFrames: 41, fps: 60, width: 1080, height: 1920 });

registerRoot(Root);
