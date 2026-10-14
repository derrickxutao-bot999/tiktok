// Film grain from four pre-generated tiles (tools/make-grain.mjs), one tile
// and one offset per frame. Remotion's <Img> holds the frame until the tile
// has decoded, so no frame is captured without its grain.

import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { clamp, hash } from "../../lib/math";
import { HEIGHT, WIDTH } from "../../lib/timeline";

export type GrainProps = {
  frame: number;
  /** Grain strength; 0.07 is fine film grain. */
  opacity?: number;
};

const TILE = 512;
const TILES = 4;
const COLS = Math.ceil((WIDTH + TILE) / TILE);
const ROWS = Math.ceil((HEIGHT + TILE) / TILE);
/** Overlay blending only shows in the mid-tones, so the strength is scaled up to read. */
const GAIN = 2.5;

export const Grain: React.FC<GrainProps> = ({ frame, opacity = 0.07 }) => {
  const o = clamp(opacity * GAIN);
  if (o <= 0) return null;
  const f = Math.round(frame);
  const src = staticFile(`grain/grain-${Math.floor(hash(f * 3 + 1) * TILES)}.png`);
  const ox = Math.floor(hash(f * 3 + 2) * TILE);
  const oy = Math.floor(hash(f * 3 + 3) * TILE);
  const tiles: React.ReactNode[] = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      tiles.push(
        <Img
          key={`${r}-${c}`}
          src={src}
          style={{ position: "absolute", left: c * TILE - ox, top: r * TILE - oy, width: TILE, height: TILE, imageRendering: "pixelated" }}
        />,
      );
  return <AbsoluteFill style={{ mixBlendMode: "overlay", opacity: o, pointerEvents: "none", overflow: "hidden" }}>{tiles}</AbsoluteFill>;
};
