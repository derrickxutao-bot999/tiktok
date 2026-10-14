// Scene 2 - Rosario, the starting point (12-25 s). Planned; see README.
import React from "react";
import { PALETTE } from "../lib/palette";
import { Placeholder } from "./Placeholder";

export const Scene2Rosario: React.FC = () => (
  <Placeholder
    number="2"
    title="ROSARIO"
    from={PALETTE["rosario-dusk"].skyMid}
    to={PALETTE["rosario-dusk"].dirtA}
    enterFrom="#FFFFFF"
    lines={[
      "White light fades to the red dirt of a street pitch.",
      "A small 10-year-old runs with the ball through a forest of giant shadows.",
      "The camera pulls back: a glowing outline of the Camp Nou far away.",
    ]}
  />
);
