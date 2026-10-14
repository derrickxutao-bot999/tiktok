import { registerRoot, Composition } from "remotion";
import React from "react";
import { Lab } from "./LabEnv";

const Root: React.FC = () => React.createElement(Composition, { id: "LabEnv", component: Lab, durationInFrames: 26, fps: 60, width: 1080, height: 1920 });
registerRoot(Root);
