// A time slip: for an instant a few horizontal slits of the picture are
// displaced sideways, as if those rows had been exposed a moment earlier;
// inside those slits only, the colour channels part by a few pixels, and a
// single hairline scan flash crosses the frame. The rest of the picture is
// left exactly as it was.
//
// The picture is rendered once. One SVG filter does the work: flood
// primitives build a displacement map of the slits (all synchronous, no
// image loads), the slits are displaced and lifted a touch, their red and
// blue channels are offset and summed back additively, and the result is
// clipped to the slits again and laid back over the picture.

import React from "react";
import { AbsoluteFill } from "remotion";
import { clamp, hash2 } from "../../lib/math";
import { HEIGHT, WIDTH } from "../../lib/timeline";

export type GlitchProps = {
  /** 0..1. Below 0.01 the children render untouched. */
  amount: number;
  seed: number;
  children: React.ReactNode;
  /** Prefix for the filter id when several glitches share a seed on screen. */
  idPrefix?: string;
  /** Colour of the scan flash and seams. */
  flash?: string;
};

/** Largest slit displacement the map can encode, px (scale = 2 * MAX_SHIFT). */
const MAX_SHIFT = 127;

type Band = { y: number; h: number; dx: number };

const bandsFor = (amount: number, seed: number): Band[] => {
  const count = 1 + Math.round(amount * 4);
  const out: Band[] = [];
  for (let i = 0; i < count; i++) {
    const r = (k: number) => hash2(seed * 7 + 3, i * 11 + k);
    // Most slits cross the action band of the frame; the odd one lands anywhere.
    const y = r(1) < 0.7 ? 680 + r(2) * 860 : r(2) * HEIGHT;
    const h = 3 + Math.pow(r(3), 2.2) * 120 * (0.35 + amount);
    const mag = 4 + (10 + 70 * r(4)) * amount;
    const dx = Math.round((r(5) < 0.5 ? -1 : 1) * Math.min(MAX_SHIFT - 1, mag));
    out.push({ y: Math.round(y), h: Math.max(2, Math.round(h)), dx });
  }
  return out;
};

const CHANNEL = {
  r: "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0",
  g: "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0",
  b: "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0",
} as const;

export const Glitch: React.FC<GlitchProps> = ({ amount, seed, children, idPrefix, flash = "#EAF4FF" }) => {
  if (amount < 0.01) return <>{children}</>;
  const a = clamp(amount);
  const fid = `${idPrefix ?? "glitch"}-${seed}-${Math.round(a * 1000)}`;
  const bands = bandsFor(a, seed);
  const fringe = Math.max(1, Math.round(5 * a));
  const scanY = Math.round(hash2(seed, 97) * HEIGHT);
  const lift = 1 + 0.18 * a;

  return (
    <AbsoluteFill>
      <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
        <filter
          id={fid}
          x={0}
          y={0}
          width={WIDTH}
          height={HEIGHT}
          filterUnits="userSpaceOnUse"
          primitiveUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          {bands.map((b, i) => (
            <feFlood
              key={i}
              x={0}
              y={b.y}
              width={WIDTH}
              height={b.h}
              floodColor={`rgb(${Math.round(255 * (0.5 + b.dx / (2 * MAX_SHIFT)))},128,0)`}
              result={`b${i}`}
            />
          ))}
          <feMerge result="map">
            {bands.map((_, i) => (
              <feMergeNode key={i} in={`b${i}`} />
            ))}
          </feMerge>
          <feDisplacementMap in="SourceGraphic" in2="map" scale={2 * MAX_SHIFT} xChannelSelector="R" yChannelSelector="G" result="moved" />
          <feComposite in="moved" in2="map" operator="in" result="slit" />
          <feComponentTransfer in="slit" result="lit">
            <feFuncR type="linear" slope={lift} />
            <feFuncG type="linear" slope={lift} />
            <feFuncB type="linear" slope={lift} />
          </feComponentTransfer>
          {/* The fringe lives only in the slipped slits: red and blue part, recombined additively. */}
          <feColorMatrix in="lit" type="matrix" values={CHANNEL.r} result="cr" />
          <feOffset in="cr" dx={fringe} result="cr2" />
          <feColorMatrix in="lit" type="matrix" values={CHANNEL.g} result="cg" />
          <feColorMatrix in="lit" type="matrix" values={CHANNEL.b} result="cb" />
          <feOffset in="cb" dx={-fringe} result="cb2" />
          <feComposite in="cr2" in2="cg" operator="arithmetic" k2={1} k3={1} result="crg" />
          <feComposite in="crg" in2="cb2" operator="arithmetic" k2={1} k3={1} result="split" />
          <feComposite in="split" in2="map" operator="in" result="fringed" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="fringed" />
          </feMerge>
        </filter>
      </svg>
      <AbsoluteFill style={{ filter: `url(#${fid})` }}>{children}</AbsoluteFill>
      {/* Hairline seams where the slits were cut, and one scan flash. */}
      {bands.map((b, i) => (
        <React.Fragment key={i}>
          <div style={{ position: "absolute", left: 0, width: WIDTH, top: b.y, height: 1, background: flash, opacity: 0.22 * a }} />
          <div style={{ position: "absolute", left: 0, width: WIDTH, top: b.y + b.h - 1, height: 1, background: flash, opacity: 0.12 * a }} />
        </React.Fragment>
      ))}
      <div
        style={{
          position: "absolute",
          left: 0,
          width: WIDTH,
          top: scanY,
          height: 1.5,
          background: flash,
          opacity: 0.75 * a,
          boxShadow: `0 0 10px 1px ${flash}`,
        }}
      />
    </AbsoluteFill>
  );
};
