// Film grain from four pre-generated tiles (tools/make-grain.mjs): one tile
// and one offset per frame, laid as a single repeating background with
// overlay blending. The four tiles are fetched and decoded once per page
// under a delayRender, so no frame is captured before its grain is in
// memory. A tile that fails to load stops a render with a clear message (the
// Studio warns and goes on without grain); nothing ever hangs.

import React from "react";
import { AbsoluteFill, cancelRender, continueRender, delayRender, getRemotionEnvironment, staticFile } from "remotion";
import { clamp, hash } from "../../lib/math";

export type GrainProps = {
  frame: number;
  /** Grain strength; 0.07 is fine film grain. */
  opacity?: number;
};

const TILE = 512;
const TILES = 4;
/** Overlay blending only shows in the mid-tones, so the strength is scaled up to read. */
const GAIN = 2.5;
/** A tile that has not decoded after this long is given up on, ms. */
const GIVE_UP = 10000;

const tileSrc = (i: number) => staticFile(`grain/grain-${i}.png`);

/** The decoded tiles, held for the life of the page so the browser keeps them in memory. */
const held: HTMLImageElement[] = [];
let preload: "idle" | "loading" | "done" = "idle";

const decodeTile = (i: number): Promise<void> => {
  const img = new Image();
  img.src = tileSrc(i);
  held.push(img);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${GIVE_UP} ms`)), GIVE_UP);
  });
  return Promise.race([img.decode(), timeout]).finally(() => clearTimeout(timer)).catch((err: unknown) => {
    const msg = `[grain] public/grain/grain-${i}.png not loaded (${String(err)}). Run: node tools/make-grain.mjs`;
    if (!getRemotionEnvironment().isRendering) return console.warn(msg);
    try {
      cancelRender(new Error(msg));
    } catch {
      // cancelRender throws to stop the caller; the render itself is already cancelled.
    }
  });
};

/** Starts loading every tile once per page; the first caller's delayRender holds the frame until they have decoded. */
const ensureTiles = () => {
  if (preload !== "idle" || typeof window === "undefined" || typeof Image === "undefined") return;
  preload = "loading";
  const handle = delayRender("Loading film grain tiles", { timeoutInMilliseconds: GIVE_UP * 2 });
  Promise.all(Array.from({ length: TILES }, (_, i) => decodeTile(i))).finally(() => {
    preload = "done";
    continueRender(handle);
  });
};

export const Grain: React.FC<GrainProps> = ({ frame, opacity = 0.07 }) => {
  ensureTiles();
  const o = clamp(opacity * GAIN);
  if (o <= 0) return null;
  const f = Math.round(frame);
  const tile = Math.floor(hash(f * 3 + 1) * TILES);
  const ox = Math.floor(hash(f * 3 + 2) * TILE);
  const oy = Math.floor(hash(f * 3 + 3) * TILE);
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `url("${tileSrc(tile)}")`,
        backgroundRepeat: "repeat",
        backgroundSize: `${TILE}px ${TILE}px`,
        backgroundPosition: `${-ox}px ${-oy}px`,
        imageRendering: "pixelated",
        mixBlendMode: "overlay",
        opacity: o,
        pointerEvents: "none",
      }}
    />
  );
};
