// The closing line, set in Cormorant Garamond italic, centred on two lines
// (split after the full stop). Words arrive one at a time, rising a few
// pixels out of a soft blur; a warm glow keeps them legible over the sunset
// sky and the dark ground. When the last word has settled, a short hairline
// opens beneath them.

import React from "react";
import { clamp, easeOutCubic } from "../../lib/math";
import { FONTS, PALETTE } from "../../lib/palette";
import { WIDTH } from "../../lib/timeline";
import { rgba } from "./util";

export type SubtitleProps = {
  text: string;
  /** Frames since the subtitle started. */
  frame: number;
  /** Vertical centre of the two lines, px (default 1560). */
  y?: number;
};

const SIZE = 66;
const LEADING = 88;
/** Frames between words, the extra pause at the line break, and each word's ease. */
const WORD_GAP = 8;
const LINE_PAUSE = 18;
const EASE = 34;
const FIRST = 4;

const DUSK = PALETTE["rosario-dusk"];

export const Subtitle: React.FC<SubtitleProps> = ({ text, frame, y = 1560 }) => {
  if (frame < 0) return null;
  const lines = text
    .split(/(?<=\.)\s+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split(/\s+/));
  let n = 0;
  const timed = lines.map((words, li) =>
    words.map((w) => {
      const start = FIRST + n++ * WORD_GAP + li * LINE_PAUSE;
      return { w, e: easeOutCubic(clamp((frame - start) / EASE)) };
    }),
  );
  const lastStart = FIRST + (n - 1) * WORD_GAP + (lines.length - 1) * LINE_PAUSE;
  const rule = easeOutCubic(clamp((frame - lastStart - EASE * 0.8) / 40));
  const top = y - (lines.length * LEADING) / 2;
  const glow = DUSK.light.glow;

  return (
    <div style={{ position: "absolute", left: 0, width: WIDTH, top, pointerEvents: "none" }}>
      {timed.map((words, li) => (
        <div
          key={li}
          style={{
            height: LEADING,
            lineHeight: `${LEADING}px`,
            textAlign: "center",
            whiteSpace: "nowrap",
            fontFamily: FONTS.serif,
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: SIZE,
            letterSpacing: "0.01em",
            color: "#FFF6E8",
            textShadow: `0 0 18px ${rgba(glow, 0.55)}, 0 0 46px ${rgba(glow, 0.3)}, 0 2px 24px ${rgba(DUSK.skyTop, 0.65)}`,
          }}
        >
          {words.map(({ w, e }, wi) => (
            <React.Fragment key={wi}>
              {wi > 0 ? " " : null}
              <span
                style={{
                  display: "inline-block",
                  opacity: e,
                  transform: `translateY(${((1 - e) * 16).toFixed(2)}px)`,
                  filter: e < 0.999 ? `blur(${((1 - e) * 9).toFixed(2)}px)` : undefined,
                }}
              >
                {w}
              </span>
            </React.Fragment>
          ))}
        </div>
      ))}
      {rule > 0 ? (
        <div
          style={{
            position: "absolute",
            top: lines.length * LEADING + 18,
            left: WIDTH / 2 - 60 * rule,
            width: 120 * rule,
            height: 1,
            background: DUSK.sun,
            opacity: 0.7 * rule,
            boxShadow: `0 0 8px ${rgba(glow, 0.8)}`,
          }}
        />
      ) : null}
    </div>
  );
};
