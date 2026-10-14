// Scene 3 - The great journey, the weight of glory (25-45 s). Planned; see README.
import React from "react";
import { PALETTE } from "../lib/palette";
import { Placeholder } from "./Placeholder";

export const Scene3Journey: React.FC = () => (
  <Placeholder
    number="3"
    title="THE WEIGHT OF GLORY"
    from={PALETTE["stadium-night"].skyTop}
    to={PALETTE["stadium-night"].skyHorizon}
    lines={[
      "91 goals in 2012, pulsing. Eight Ballon d'Or stars in the night sky.",
      "Six European Golden Shoes. The cold, rainy night of 2014.",
      "Lusail 2022: gold ribbons drifting; the Champions League silhouette.",
    ]}
  />
);
