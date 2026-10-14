// The instant of contact. A glint flares where toe meets ball: one long
// horizontal streak like the floodlights' anamorphic flares, a short vertical
// sparkle and a white-hot point, all tapering to nothing at their tips. A
// soft bloom swells and fades. A beat later a single hairline ring leaves the
// edge of the bloom and spreads out, bright on the side the key light comes
// from and dim on the other; the vertical sparkle never reaches it, so ring
// and glint read as light, never as a reticle. Everything is drawn
// additively (plus-lighter): over the white ball it can only add light.

import React from "react";
import { clamp, easeOutCubic } from "../../lib/math";
import { PALETTE } from "../../lib/palette";
import { mixHex } from "./util";

export type ContactPulseProps = {
  at: { x: number; y: number };
  /** Screen seconds since contact; negative = nothing yet. */
  age: number;
  color: string;
  /** Reference size, px (e.g. the ball's radius on screen). */
  size: number;
  /** Screen direction the key light comes from (y down): the ring is brightest on that side. */
  lightDir?: { x: number; y: number };
  idPrefix?: string;
};

const RING_DELAY = 0.05;
const RING_LIFE = 0.85;
const BLOOM_TAU = 0.16;
const GLINT_RISE = 0.03;
const GLINT_TAU = 0.2;
/** Longest horizontal half-streak, px: wide, but never the whole frame. */
const STREAK_MAX = 400;

/** A tapered arm along (dx, dy) from the centre: a thin spindle, widest at the middle. */
const spindle = (x: number, y: number, l: number, w: number, horizontal: boolean) =>
  horizontal
    ? `M${(x - l).toFixed(2)} ${y.toFixed(2)}Q${x.toFixed(2)} ${(y - w).toFixed(2)} ${(x + l).toFixed(2)} ${y.toFixed(2)}Q${x.toFixed(2)} ${(y + w).toFixed(2)} ${(x - l).toFixed(2)} ${y.toFixed(2)}Z`
    : `M${x.toFixed(2)} ${(y - l).toFixed(2)}Q${(x + w).toFixed(2)} ${y.toFixed(2)} ${x.toFixed(2)} ${(y + l).toFixed(2)}Q${(x - w).toFixed(2)} ${y.toFixed(2)} ${x.toFixed(2)} ${(y - l).toFixed(2)}Z`;

export const ContactPulse: React.FC<ContactPulseProps> = ({ at, age, color, size, lightDir = PALETTE["stadium-night"].light.rimDir, idPrefix = "cp" }) => {
  if (age < 0 || age > RING_DELAY + RING_LIFE) return null;
  const hot = mixHex(color, "#FFFFFF", 0.7);
  const id = (s: string) => `${idPrefix}-cp-${s}`;

  const bloom = Math.exp(-age / BLOOM_TAU);
  const bloomR = size * (0.75 + 0.35 * (1 - bloom));
  const glint = age < GLINT_RISE ? easeOutCubic(age / GLINT_RISE) : Math.exp(-(age - GLINT_RISE) / GLINT_TAU);
  const streak = Math.min(STREAK_MAX, size * (0.6 + 2.0 * glint));
  // The sparkle stays inside the bloom, well short of where the ring is born.
  const sparkle = size * 0.32 * glint;

  const u = clamp((age - RING_DELAY) / RING_LIFE);
  const ringR = bloomR * (1 + 1.9 * easeOutCubic(u));
  const ringO = age < RING_DELAY ? 0 : Math.pow(1 - u, 1.5) * clamp((age - RING_DELAY) / 0.03);

  return (
    <g style={{ mixBlendMode: "plus-lighter" }}>
      <defs>
        <radialGradient id={id("bloom")}>
          <stop offset="0" stopColor={hot} stopOpacity={0.85} />
          <stop offset="0.22" stopColor={color} stopOpacity={0.4} />
          <stop offset="0.6" stopColor={color} stopOpacity={0.1} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </radialGradient>
        <linearGradient id={id("h")} gradientUnits="userSpaceOnUse" x1={at.x - streak} y1={0} x2={at.x + streak} y2={0}>
          <stop offset="0" stopColor={color} stopOpacity={0} />
          <stop offset="0.3" stopColor={color} stopOpacity={0.25} />
          <stop offset="0.5" stopColor={hot} stopOpacity={1} />
          <stop offset="0.7" stopColor={color} stopOpacity={0.25} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </linearGradient>
        <linearGradient
          id={id("ring")}
          gradientUnits="userSpaceOnUse"
          x1={at.x - lightDir.x * ringR}
          y1={at.y - lightDir.y * ringR}
          x2={at.x + lightDir.x * ringR}
          y2={at.y + lightDir.y * ringR}
        >
          <stop offset="0" stopColor={color} stopOpacity={0.2} />
          <stop offset="0.6" stopColor={hot} stopOpacity={0.75} />
          <stop offset="1" stopColor={hot} stopOpacity={1} />
        </linearGradient>
        <linearGradient id={id("v")} gradientUnits="userSpaceOnUse" x1={0} y1={at.y - sparkle} x2={0} y2={at.y + sparkle}>
          <stop offset="0" stopColor={hot} stopOpacity={0} />
          <stop offset="0.5" stopColor={hot} stopOpacity={1} />
          <stop offset="1" stopColor={hot} stopOpacity={0} />
        </linearGradient>
      </defs>
      {bloom > 0.01 ? <circle cx={at.x} cy={at.y} r={bloomR} fill={`url(#${id("bloom")})`} opacity={bloom} /> : null}
      {ringO > 0.01 ? (
        <circle cx={at.x} cy={at.y} r={ringR} fill="none" stroke={`url(#${id("ring")})`} strokeWidth={1 + 0.8 * (1 - u)} opacity={0.9 * ringO} />
      ) : null}
      {glint > 0.01 ? (
        <g opacity={glint}>
          <path d={spindle(at.x, at.y, streak, Math.max(1.2, size * 0.022), true)} fill={`url(#${id("h")})`} />
          {sparkle > 2 ? <path d={spindle(at.x, at.y, sparkle, Math.max(0.9, size * 0.016), false)} fill={`url(#${id("v")})`} /> : null}
          <circle cx={at.x} cy={at.y} r={Math.max(1.6, size * 0.03)} fill="#FFFFFF" />
        </g>
      ) : null}
    </g>
  );
};
