import { registerRoot, Composition } from "remotion";
import React from "react";
import { Lab, LAB_ENV_FRAMES } from "./LabEnv";

const Root: React.FC = () => React.createElement(Composition, { id: "LabEnv", component: Lab, durationInFrames: LAB_ENV_FRAMES, fps: 60, width: 1080, height: 1920 });
registerRoot(Root);
