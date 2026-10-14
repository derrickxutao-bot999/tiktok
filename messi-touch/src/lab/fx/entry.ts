import { registerRoot, Composition } from "remotion";
import React from "react";
import { Lab } from "./LabFx";

const Root: React.FC = () => React.createElement(Composition, { id: "LabFx", component: Lab, durationInFrames: 300, fps: 60, width: 1080, height: 1920 });
registerRoot(Root);
