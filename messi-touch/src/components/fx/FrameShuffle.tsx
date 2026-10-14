// The frozen frame as a deck of time on a light table. Hairline cuts are
// drawn across the picture; the strips turn over to the same instant in other
// eras, faster and faster, and every turn is a slip: the strip jolts sideways,
// so a sliver of the light behind the deck flashes past its end, and settles
// back. Then the cuts open: each seam widens into a band of light that eats
// into the strips from both sides, its halation bleeding over what is left of
// the picture, until nothing remains but light. 'in' plays the same deck
// backwards: out of the white the light closes to hairlines, the strips slow
// down and lock onto layer 0.
//
// Light is only ever added (plus-lighter), so the burn is an overexposure,
// never a grey wipe. Each strip is clipped with inset() and renders only the
// one layer it shows: one picture per strip while the deck is open, one in
// total while it is closed, none for a strip the light has eaten.

import React from "react";
import { AbsoluteFill } from "remotion";
import { clamp, easeInOutSine, easeOutCubic, hash2, smoothstep } from "../../lib/math";
import { PALETTE } from "../../lib/palette";
import { HEIGHT, WIDTH } from "../../lib/timeline";
import { mixHex, rgba } from "./util";

export type FrameShuffleProps = {
  /** Full-frame renders of the same instant; layer 0 is the subject. */
  layers: React.ReactNode[];
  /** 0..1 */
  progress: number;
  direction: "out" | "in";
  strips?: number;
  seed: number;
  /** The light behind the deck, seams and burn (the end state). */
  light?: string;
  /** Colour of the light table while it is still faint; it turns to `light` as it strengthens. */
  tint?: string;
};

// The deck, on the 'out' clock p (0 = intact, 1 = white).
/** The cuts are drawn across the frame here... */
const CUT: [number, number] = [0.02, 0.13];
/** ...the first strips turn over here, and each interval is this much shorter than the last. */
const FIRST_SWAP = 0.12;
const FIRST_GAP = 0.11;
const SHRINK = 0.8;
/** Shortest interval between swaps: about one frame of a half-second shuffle. */
const MIN_GAP = 0.03;
/** Furthest a strip slips on a turn, as a fraction of the width, and the share of the interval it takes to settle. */
const MAX_SLIP = 0.08;
const SETTLE = 0.6;
/** Seams start to open in this window and have eaten every strip by OPEN_END. */
const OPEN: [number, number] = [0.38, 0.6];
const OPEN_END = 0.94;

/** How white the deck is (0 intact, 1 white): for dimming what sits above it, such as the vignette. */
export const shuffleWhiteness = (progress: number, direction: "out" | "in"): number =>
  smoothstep(0.3, 0.85, clamp(direction === "out" ? progress : 1 - progress));

/** Swaps a strip with phase phi in [0, 1) has made by p, with the start of the current one and the next. */
const swapsBy = (p: number, phi: number) => {
  let next = FIRST_SWAP + phi * FIRST_GAP;
  let start = next;
  let gapLen = FIRST_GAP;
  let j = 0;
  while (next <= p && j < 64) {
    j++;
    start = next;
    gapLen = Math.max(MIN_GAP, gapLen * SHRINK);
    next += gapLen;
  }
  return { j, start, next };
};

type Strip = { top: number; bottom: number; layer: number; dx: number; flash: number };

const stripAt = (s: number, n: number, p: number, layers: number, seed: number): Strip => {
  const top = Math.round((s * HEIGHT) / n);
  const bottom = Math.round(((s + 1) * HEIGHT) / n);
  const { j, start, next } = swapsBy(p, hash2(seed, s * 5 + 1));
  // Layer: never the same twice in a row; 0 until the first swap.
  let layer = 0;
  for (let q = 1; q <= j && layers > 1; q++) {
    const pick = 1 + Math.floor(hash2(seed + q * 31, s) * (layers - 1));
    layer = pick === layer ? 1 + (pick % (layers - 1)) : pick;
  }
  if (j === 0) return { top, bottom, layer, dx: 0, flash: 0 };
  // The slip: neighbours jolt opposite ways, alternating turn by turn, harder as the deck speeds up.
  const u = clamp((p - start) / (next - start));
  const side = (s + j) % 2 === 0 ? -1 : 1;
  const mag = MAX_SLIP * WIDTH * (0.3 + 0.7 * hash2(seed + j * 17, s + 40)) * Math.min(1, 0.45 + j * 0.11);
  return { top, bottom, layer, dx: side * mag * (1 - easeOutCubic(clamp(u / SETTLE))), flash: Math.pow(1 - u, 3) };
};

/** Half-height of the band of light at seam s (0 and n are the frame's own edges). */
const openingAt = (s: number, n: number, p: number, seed: number) => {
  const h = HEIGHT / n;
  const edge = s === 0 || s === n;
  const p0 = edge ? OPEN[1] : OPEN[0] + (OPEN[1] - OPEN[0]) * hash2(seed + 3, s * 7 + 2);
  const u = clamp((p - p0) / (OPEN_END - p0));
  // Accelerating: a crack, then the light pours through. Edges eat a whole strip, inner seams half of two.
  return (edge ? h : h / 2 + 1) * u * u;
};

export const FrameShuffle: React.FC<FrameShuffleProps> = ({
  layers,
  progress,
  direction,
  strips = 9,
  seed,
  light = "#F6FAFF",
  tint = PALETTE["stadium-night"].light.glow,
}) => {
  const p = clamp(direction === "out" ? progress : 1 - progress);
  if (p >= 0.999) return <AbsoluteFill style={{ backgroundColor: "#FFFFFF" }} />;

  const n = Math.max(1, Math.round(strips));
  const deck = Array.from({ length: n }, (_, s) => stripAt(s, n, p, layers.length, seed));
  const open = Array.from({ length: n + 1 }, (_, s) => openingAt(s, n, p, seed));
  const cut = easeInOutSine(clamp((p - CUT[0]) / (CUT[1] - CUT[0])));
  const intact = cut <= 0 && deck.every((st) => st.layer === 0 && Math.abs(st.dx) < 0.5);
  if (intact) return <AbsoluteFill>{layers[0]}</AbsoluteFill>;

  // The light table: the cool light of the world, turning white as it strengthens.
  const back = mixHex(tint, light, smoothstep(0.2, 0.5, p));
  const heat = smoothstep(0.1, 0.7, p);
  // Highlights in what is left of the picture flare as the light takes over.
  const burn = smoothstep(0.5, 1, p);
  const exposure = burn > 0.001 ? `brightness(${(1 + 0.6 * burn).toFixed(3)}) contrast(${(1 + 0.35 * burn).toFixed(3)})` : undefined;
  // Halation: how far each band's glow bleeds over the strips, px; at the end it covers what is left of them.
  const bleed = 10 + 0.6 * (HEIGHT / n) * smoothstep(0.3, 0.9, p);

  return (
    <AbsoluteFill style={{ backgroundColor: back }}>
      <AbsoluteFill style={{ filter: exposure }}>
        {deck.map((st, s) => {
          const top = st.top + open[s];
          const bottom = st.bottom - open[s + 1];
          if (bottom - top < 0.5) return null;
          return (
            <AbsoluteFill key={s} style={{ clipPath: `inset(${top.toFixed(1)}px 0 ${(HEIGHT - bottom).toFixed(1)}px 0)` }}>
              <AbsoluteFill style={{ transform: `translateX(${st.dx.toFixed(1)}px)` }}>{layers[st.layer]}</AbsoluteFill>
            </AbsoluteFill>
          );
        })}
      </AbsoluteFill>

      {/* Everything below only adds light. */}
      <AbsoluteFill style={{ mixBlendMode: "plus-lighter", pointerEvents: "none" }}>
        {open.map((e, s) => {
          const edge = s === 0 || s === n;
          if (edge && e <= 0.5) return null;
          const y = (s * HEIGHT) / n;
          // Hairline cuts are drawn across, alternately from either side; then they open into bands.
          const w = edge ? WIDTH : WIDTH * clamp(cut * 1.15 - ((s - 1) % 3) * 0.05);
          if (w <= 0) return null;
          const left = s % 2 === 1 ? 0 : WIDTH - w;
          const core = 2 * e + 1.5;
          const glow = 0.15 + 0.65 * heat;
          return (
            <React.Fragment key={`seam${s}`}>
              <div style={{ position: "absolute", top: y - core / 2, height: core, left, width: w, background: light, opacity: e > 1 ? 1 : 0.55 + 0.45 * heat }} />
              {/* The bleed: a steep falloff with a long faint tail, above and below the band. */}
              {[-1, 1].map((dir) => (
                <div
                  key={dir}
                  style={{
                    position: "absolute",
                    top: dir < 0 ? y - core / 2 - bleed : y + core / 2,
                    height: bleed,
                    left,
                    width: w,
                    // White at the band, the world's tint in the falloff: the edge of a burn is coloured light, never grey.
                    background: `linear-gradient(${dir < 0 ? 0 : 180}deg, ${rgba(light, glow)}, ${rgba(tint, glow * 0.55)} 14%, ${rgba(tint, glow * 0.2)} 48%, ${rgba(tint, 0)})`,
                  }}
                />
              ))}
            </React.Fragment>
          );
        })}
        {deck.map((st, s) => {
          const top = st.top + open[s];
          const bottom = st.bottom - open[s + 1];
          if (bottom - top < 0.5) return null;
          const out: React.ReactNode[] = [];
          // The picture's own end, caught in the light where the strip has slipped aside.
          if (Math.abs(st.dx) > 1) {
            const right = st.dx < 0;
            const x = right ? WIDTH + st.dx : st.dx;
            out.push(
              <div
                key={`end${s}`}
                style={{
                  position: "absolute",
                  top,
                  height: bottom - top,
                  left: right ? x - 36 : x,
                  width: 36,
                  background: `linear-gradient(${right ? 270 : 90}deg, ${rgba(light, 0.7)}, ${rgba(light, 0.2)} 20%, ${rgba(light, 0)})`,
                }}
              />,
            );
          }
          // A strip that has just turned over catches the light along its edges.
          if (st.flash > 0.02) {
            out.push(
              <div key={`fl${s}a`} style={{ position: "absolute", left: 0, width: WIDTH, top, height: 1.5, background: light, opacity: 0.7 * st.flash }} />,
              <div key={`fl${s}b`} style={{ position: "absolute", left: 0, width: WIDTH, top: bottom - 1.5, height: 1.5, background: light, opacity: 0.4 * st.flash }} />,
            );
          }
          return out;
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
