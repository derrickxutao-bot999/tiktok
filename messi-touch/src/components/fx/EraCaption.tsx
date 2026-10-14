// The era caption, set like the face of a chronograph in the upper third:
//
//   ERA 03 / 07 · AGE 35          mono, small, wide tracking
//   2022                          condensed light, tall, a faint glow of the era
//   ────┼────┼──█─┼────┼────┼     a hairline scale of the seven eras
//   QATAR · 10                    condensed medium
//
// The first caption arrives: the line types in, the year's wheels drop into
// place, the scale draws on. Every later caption starts as the one before it
// and rolls back in time: each wheel of the year turns backwards to its new
// digit (units first, like a counter), the changed words roll over in place,
// and the marker steps one era along the scale. Springs throughout.

import React from "react";
import { spring } from "remotion";
import { ERAS, Look } from "../../lib/eras";
import { clamp, hash2, lerp } from "../../lib/math";
import { FONTS } from "../../lib/palette";
import { FPS } from "../../lib/timeline";
import { rgba } from "./util";

export type EraCaptionProps = {
  look: Look;
  /** Frames since this era appeared. */
  age: number;
  accent: string;
  /** 0-based era index; defaults to the look's position in ERAS. */
  index?: number;
  total?: number;
  /** The caption this one rolls on from; defaults to the previous era in ERAS (none for the first). */
  from?: Look | null;
  /**
   * 0..1 (default 1): a soft dark knockout behind the type block and a hairline dark casing on the
   * glyphs, so roof lines, streaks or a scan flash never cut through the figures. On the plain night
   * sky it is the sky's own darkness and does not show.
   */
  knockout?: number;
};

const LEFT = 84;
/** The night's darkest tone: the knockout and the casing are made of it. */
const SHADE = "#030409";
const MONO_TOP = 252;
const MONO_SIZE = 22;
const YEAR_TOP = 276;
const YEAR_SIZE = 190;
/** Tracking between the year's figures, px. */
const TRACK = 28;
const CELL_H = 200;
const RULE_Y = 494;
const RULE_LEN = 394;
const CLUB_TOP = 512;
const CLUB_SIZE = 40;
/** The knockout's box: centred on the type block (x 84-540, y 252-564), whose corners sit at two thirds of its radius. */
const KO = { x: -168, y: 78, w: 960, h: 660 } as const;

/** Advance and left side bearing (em) of Barlow Condensed Light's figures, read from the font file. */
const FIGURE: readonly (readonly [number, number])[] = [
  [0.442, 0.057],
  [0.249, 0.012],
  [0.392, 0.042],
  [0.401, 0.04],
  [0.397, 0.024],
  [0.401, 0.058],
  [0.402, 0.058],
  [0.355, 0.026],
  [0.418, 0.057],
  [0.395, 0.033],
];
const digitOf = (d: number) => ((d % 10) + 10) % 10;
/** A figure metric at a fractional wheel position, so the wheel's width eases between figures as it turns. */
const figureAt = (pos: number, m: 0 | 1) => {
  const d = Math.floor(pos);
  return lerp(FIGURE[digitOf(d)][m], FIGURE[digitOf(d + 1)][m], pos - d);
};

const WHEEL = { damping: 17, stiffness: 150, mass: 0.7 } as const;
const ROLL = { damping: 20, stiffness: 150, mass: 0.7 } as const;
const DRAW = { damping: 200 } as const;

const springAt = (frame: number, config: { damping: number; stiffness?: number; mass?: number }, durationInFrames?: number) =>
  frame <= 0 ? 0 : spring({ frame, fps: FPS, config, durationInFrames });

const clubLine = (look: Look) => ({ club: look.club, tail: look.kit.number ?? "ROSARIO" });
const pad2 = (n: number) => String(n).padStart(2, "0");

/** One counter wheel at position `pos`: figures roll downward (back in time); its width follows the figure in the window. */
const Wheel: React.FC<{ pos: number; speed: number; glow: string; fade: number; casing: string }> = ({ pos, speed, glow, fade, casing }) => {
  const adv = figureAt(pos, 0) * YEAR_SIZE;
  const base = Math.floor(pos);
  const digits: React.ReactNode[] = [];
  for (let d = base - 1; d <= base + 1; d++) {
    const y = (d - pos) * CELL_H;
    if (Math.abs(y) >= CELL_H) continue;
    digits.push(
      <div
        key={d}
        style={{
          position: "absolute",
          left: TRACK / 2 + (adv - FIGURE[digitOf(d)][0] * YEAR_SIZE) / 2,
          top: 0,
          height: CELL_H,
          lineHeight: `${CELL_H}px`,
          transform: `translateY(${y.toFixed(2)}px)`,
          opacity: fade * (1 - 0.35 * Math.min(1, speed)),
        }}
      >
        {digitOf(d)}
      </div>,
    );
  }
  return (
    <div
      style={{
        position: "relative",
        width: adv + TRACK,
        height: CELL_H,
        overflow: "hidden",
        WebkitMaskImage: "linear-gradient(180deg, transparent 2%, #000 15%, #000 91%, transparent 100%)",
        maskImage: "linear-gradient(180deg, transparent 2%, #000 15%, #000 91%, transparent 100%)",
        textShadow: `${casing}0 0 ${(18 + 26 * Math.min(1, speed)).toFixed(1)}px ${glow}, 0 0 3px ${glow}`,
      }}
    >
      {digits}
    </div>
  );
};

/** The separator dot carries the era's accent. */
const dotted = (text: string, dot?: string) =>
  dot && text.includes("·")
    ? text.split("·").map((part, i) => (
        <React.Fragment key={i}>
          {i > 0 ? <span style={{ color: dot }}>·</span> : null}
          {part}
        </React.Fragment>
      ))
    : text;

/** Text that rolls over in place: the old words sink out, the new ones drop in from above. */
const Roll: React.FC<{ from: string | null; to: string; frame: number; height: number; dot?: string; style?: React.CSSProperties }> = ({
  from,
  to,
  frame,
  height,
  dot,
  style,
}) => {
  const e = from === to ? 1 : springAt(frame, ROLL);
  const line = (text: string, y: number, opacity: number) => (
    <div style={{ position: "absolute", left: 0, top: 0, whiteSpace: "pre", lineHeight: `${height}px`, transform: `translateY(${y.toFixed(2)}px)`, opacity }}>
      {dotted(text, dot)}
    </div>
  );
  return (
    <span style={{ position: "relative", display: "inline-block", height, overflow: "hidden", verticalAlign: "top", ...style }}>
      <span style={{ visibility: "hidden", whiteSpace: "pre", lineHeight: `${height}px` }}>{to.length >= (from ?? "").length ? to : from}</span>
      {from !== null && e < 1 ? line(from, e * height, 1 - e) : null}
      {line(to, (e - 1) * height, clamp(e * 1.4))}
    </span>
  );
};

export const EraCaption: React.FC<EraCaptionProps> = ({ look, age, accent, index, total = ERAS.length, from, knockout = 1 }) => {
  const ko = clamp(knockout);
  // A hairline of the night under every glyph (listed first, so it sits between the glyph and its glow).
  const casing = ko > 0 ? `0 0 1.2px ${rgba(SHADE, 0.85 * ko)}, 0 0 2.5px ${rgba(SHADE, 0.45 * ko)}, ` : "";
  const idx = index ?? Math.max(0, ERAS.findIndex((e) => e.id === look.id));
  const prev = from === undefined ? (idx > 0 ? ERAS[idx - 1] : null) : from;
  const entering = prev === null;
  const glow = rgba(accent, 0.5);
  const ink = "#F3F7FB";

  // Wheels: entering, each drops in after a few spins; rolling on, changed
  // digits turn back units first and unchanged ones hold still.
  const to = look.year.split("").map(Number);
  const was = prev ? prev.year.split("").map(Number) : null;
  const changed = was ? to.map((d, i) => d !== was[i]) : to.map(() => true);
  const order = to.map((_, i) => changed.slice(i + 1).filter(Boolean).length);
  const wheels = to.map((d, i) => {
    if (!was) {
      const spin = 2 + Math.floor(hash2(idx * 13 + 5, i) * 3);
      return { from: d + spin, to: d, delay: 4 + i * 2 };
    }
    // Back in time: the wheel only ever turns downward.
    return { from: was[i] >= d ? was[i] : was[i] + 10, to: d, delay: changed[i] ? 2 + order[i] * 3 : 0 };
  });

  const turns = wheels.map((w) => {
    const frame = age - w.delay;
    const k = springAt(frame, WHEEL);
    const speed = Math.abs(w.to - w.from) * Math.abs(springAt(frame + 0.5, WHEEL) - springAt(frame - 0.5, WHEEL));
    return { pos: w.from + (w.to - w.from) * k, speed };
  });

  const enter = entering ? clamp(age / 8) : 1;
  const draw = entering ? springAt(age - 6, DRAW, 34) : 1;
  const prevIdx = prev ? Math.max(0, ERAS.findIndex((e) => e.id === prev.id)) : idx;
  const marker = prevIdx + (idx - prevIdx) * springAt(age - (entering ? 18 : 1), ROLL);
  const markerPop = entering ? springAt(age - 18, WHEEL) : 1;
  const step = RULE_LEN / Math.max(1, total - 1);
  const mx = marker * step;

  const now = clubLine(look);
  const before = prev ? clubLine(prev) : null;
  const clubDelay = entering ? 14 : 6;

  const cased = casing ? casing.slice(0, -2) : undefined;
  const mono: React.CSSProperties = { fontFamily: FONTS.mono, fontSize: MONO_SIZE, letterSpacing: "0.3em", color: rgba(ink, 0.66), textShadow: cased };
  const condensed: React.CSSProperties = {
    fontFamily: FONTS.condensed,
    fontWeight: 500,
    fontSize: CLUB_SIZE,
    letterSpacing: "0.2em",
    color: rgba(ink, 0.9),
    textShadow: cased,
  };

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: enter }}>
      {/* The knockout: a soft pool of the night's darkness behind the type block. */}
      {ko > 0 ? (
        <div
          style={{
            position: "absolute",
            left: KO.x,
            top: KO.y,
            width: KO.w,
            height: KO.h,
            background: `radial-gradient(closest-side, ${rgba(SHADE, 0.72 * ko)}, ${rgba(SHADE, 0.6 * ko)} 45%, ${rgba(SHADE, 0.28 * ko)} 72%, ${rgba(SHADE, 0)})`,
          }}
        />
      ) : null}
      {/* ERA 03 / 07 · AGE 35 */}
      <div style={{ position: "absolute", left: LEFT, top: MONO_TOP, whiteSpace: "pre", display: "flex", ...mono }}>
        <Roll from={entering ? null : "ERA "} to="ERA " frame={age} height={30} />
        <Roll from={entering ? null : pad2(prevIdx + 1)} to={pad2(idx + 1)} frame={age - (entering ? 2 : 0)} height={30} style={{ color: ink }} />
        <Roll from={entering ? null : ` / ${pad2(total)}  `} to={` / ${pad2(total)}  `} frame={age - 3} height={30} />
        <Roll from={entering ? null : "·"} to="·" frame={age - 4} height={30} style={{ color: accent }} />
        <Roll from={entering ? null : "  AGE "} to="  AGE " frame={age - 5} height={30} />
        <Roll from={prev ? pad2(prev.age) : null} to={pad2(look.age)} frame={age - (entering ? 6 : 3)} height={30} style={{ color: ink }} />
      </div>

      {/* The year, its first figure's ink exactly on the left edge whatever that figure is. */}
      <div
        style={{
          position: "absolute",
          left: LEFT - TRACK / 2 - figureAt(turns[0].pos, 1) * YEAR_SIZE,
          top: YEAR_TOP,
          display: "flex",
          fontFamily: FONTS.condensed,
          fontWeight: 300,
          fontSize: YEAR_SIZE,
          color: ink,
        }}
      >
        {turns.map((w, i) => (
          <Wheel key={i} pos={w.pos} speed={w.speed} glow={glow} fade={entering ? clamp((age - wheels[i].delay) / 6) : 1} casing={casing} />
        ))}
      </div>

      {/* The scale of eras */}
      <svg style={{ position: "absolute", left: LEFT - 4, top: RULE_Y - 16, overflow: "visible" }} width={RULE_LEN + 8} height={32}>
        <g transform="translate(4 16)">
          {ko > 0 ? <line x1={-2} y1={0} x2={RULE_LEN * draw + 2} y2={0} stroke={SHADE} strokeOpacity={0.7 * ko} strokeWidth={5} /> : null}
          <line x1={0} y1={0} x2={RULE_LEN * draw} y2={0} stroke={ink} strokeOpacity={0.28} strokeWidth={1} />
          <line x1={0} y1={0} x2={Math.min(RULE_LEN * draw, mx)} y2={0} stroke={ink} strokeOpacity={0.85} strokeWidth={1.4} />
          {Array.from({ length: total }, (_, i) => {
            const x = i * step;
            const on = clamp((RULE_LEN * draw - x) / 12 + 1);
            if (on <= 0) return null;
            const past = i <= marker + 0.01;
            return <line key={i} x1={x} y1={0} x2={x} y2={past ? 7 : 5} stroke={ink} strokeOpacity={(past ? 0.8 : 0.32) * on} strokeWidth={1} />;
          })}
          {markerPop > 0 ? (
            <g transform={`translate(${mx.toFixed(2)} 0) scale(1 ${markerPop.toFixed(3)})`}>
              <rect x={-5} y={-11} width={10} height={22} fill={accent} opacity={0.18} rx={5} />
              <rect x={-1} y={-9} width={2} height={18} fill={accent} />
            </g>
          ) : null}
        </g>
      </svg>

      {/* Club · number */}
      <div style={{ position: "absolute", left: LEFT, top: CLUB_TOP, whiteSpace: "pre", display: "flex", ...condensed }}>
        {before && before.club === now.club ? (
          <>
            <span style={{ lineHeight: "52px" }}>{now.club}</span>
            <span style={{ lineHeight: "52px", color: accent }}>{"  ·  "}</span>
            <Roll from={before.tail} to={now.tail} frame={age - clubDelay} height={52} />
          </>
        ) : (
          <Roll from={before ? `${before.club}  ·  ${before.tail}` : null} to={`${now.club}  ·  ${now.tail}`} frame={age - clubDelay} height={52} dot={accent} />
        )}
      </div>
    </div>
  );
};
