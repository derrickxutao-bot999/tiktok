// The ball's fate if nobody reaches it, plotted the way Marey or a physicist
// would: the trajectory of its centre, a row of light beads at fixed
// distances along its heading (so they stay put in the world while the ball
// eats them up), with a tick every quarter second of travel. It runs in the
// dark air one ball-radius above the grass, never on the glowing line.
//
// Where the whole ball is over the outer edge of the line, a hairline ghost
// of the ball waits, a dotted plumb line drops from its centre to a small
// cross on the ground, and a mono label says OUT. Past it the beads fade
// away. When that spot is beyond the frame, the label waits at the frame's
// edge and counts down the metres left. After the touch the fate is void and
// the path fades out.

import React from "react";
import { BALL } from "../../lib/ball";
import { clamp } from "../../lib/math";
import { FONTS } from "../../lib/palette";
import { HEIGHT, WIDTH } from "../../lib/timeline";
import { Camera, D0, LINE_WIDTH, LINE_Z, ScreenPoint, project } from "../../lib/world";
import { mixHex } from "./util";

export type BallPathProps = {
  camera: Camera;
  /** World clock, s. */
  t: number;
  color: string;
  opacity?: number;
  idPrefix?: string;
};

const COS_H = Math.cos(BALL.heading);
const SIN_H = Math.sin(BALL.heading);
/** Distance rolled along the heading at time tau if untouched (0 at contact). */
const sAt = (tau: number) => BALL.vIn * tau - (BALL.decelIn * tau * tau) / 2;
/** Where the whole ball is over the outer edge of the line, m along the heading. */
export const S_OUT = (LINE_Z + LINE_WIDTH / 2 + BALL.r - D0) / SIN_H;
/** The fate is plotted for this much travel after the contact instant, s. */
const TRAVEL = 1.5;
const S_END = sAt(TRAVEL);
/** Bead spacing, m; tick interval, s. */
const BEAD = 0.06;
const TICK = 0.25;
const FADE_AFTER_TOUCH = 0.2;
const EDGE = 44;
/** Opacity buckets: beads are batched into one path per bucket. */
const BUCKETS = 6;

const centreAt = (cam: Camera, s: number): ScreenPoint => project(cam, s * COS_H, BALL.r, D0 + s * SIN_H);
const groundAt = (cam: Camera, s: number): ScreenPoint => project(cam, s * COS_H, 0, D0 + s * SIN_H);
const onScreen = (p: { x: number; y: number }, m = 0) => p.x > -m && p.x < WIDTH + m && p.y > -m && p.y < HEIGHT + m;
const f1 = (n: number) => n.toFixed(1);

export const BallPath: React.FC<BallPathProps> = ({ camera, t, color, opacity = 1, idPrefix = "bp" }) => {
  const fade = t >= 0 ? 1 - t / FADE_AFTER_TOUCH : 1;
  const o = clamp(opacity * fade);
  if (o <= 0) return null;
  const sBall = sAt(Math.min(t, 0));
  const s0 = sBall + 1.25 * BALL.r;
  const ink = mixHex(color, "#FFFFFF", 0.55);
  const glowId = `${idPrefix}-bp-glow`;

  // Beads, culled to the frame. They emerge from the ball, hold, and fade away past OUT.
  const runs: string[] = Array.from({ length: BUCKETS }, () => "");
  let x0 = Infinity;
  let x1 = -Infinity;
  let yMid = 0;
  for (let i = Math.ceil(s0 / BEAD); i * BEAD <= S_END; i++) {
    const s = i * BEAD;
    const p = centreAt(camera, s);
    if (p.x > WIDTH + 10) break;
    if (!onScreen(p, 4)) continue;
    const a = clamp((s - s0) / 0.35) * (s < S_OUT ? 1 : 1 - (s - S_OUT) / (S_END - S_OUT));
    if (a <= 0.02) continue;
    runs[Math.min(BUCKETS - 1, Math.floor(a * BUCKETS))] += `M${f1(p.x)} ${f1(p.y)}h0.01`;
    x0 = Math.min(x0, p.x);
    x1 = Math.max(x1, p.x);
    yMid = p.y;
  }

  // Quarter-second ticks of travel across the path; the full seconds a little longer.
  let ticks = "";
  for (let k = Math.ceil(Math.min(t, 0) / TICK); k * TICK <= TRAVEL; k++) {
    const s = sAt(k * TICK);
    if (s < s0 + 0.1 || s > S_OUT + 0.01) continue;
    const p = centreAt(camera, s);
    if (!onScreen(p, 2)) continue;
    const h = k % 4 === 0 ? 7 : 4;
    ticks += `M${f1(p.x)} ${f1(p.y - h)}v${2 * h}`;
  }

  const c = centreAt(camera, S_OUT);
  const g = groundAt(camera, S_OUT);
  const rOut = BALL.r * c.k;
  const outVisible = onScreen(c, -EDGE) && S_OUT > s0;
  // When OUT is beyond the right edge, the path's exit point there carries the countdown.
  const sExit = (camera.x + ((WIDTH - EDGE - camera.cx) * D0) / camera.f) / COS_H;
  const exit = !outVisible && c.x > WIDTH ? centreAt(camera, sExit) : null;
  const left = S_OUT - sBall;

  const label = (x: number, y: number, text: string, anchor: "start" | "end") => (
    <text
      x={f1(x)}
      y={f1(y)}
      textAnchor={anchor}
      fontFamily={FONTS.mono}
      fontSize={18}
      letterSpacing="3.5"
      fill={ink}
      stroke="none"
      style={{ whiteSpace: "pre" }}
    >
      {text}
    </text>
  );

  const beads = runs.map((d, i) =>
    d ? <path key={i} d={d} opacity={(i + 1) / BUCKETS} /> : null,
  );

  return (
    <g opacity={o}>
      {x1 > x0 ? (
        <defs>
          <filter id={glowId} filterUnits="userSpaceOnUse" x={x0 - 20} y={yMid - 60} width={x1 - x0 + 40} height={120}>
            <feGaussianBlur stdDeviation={2.4} />
          </filter>
        </defs>
      ) : null}
      {x1 > x0 ? (
        <g filter={`url(#${glowId})`} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" opacity={0.55} style={{ mixBlendMode: "screen" }}>
          {beads}
        </g>
      ) : null}
      <g fill="none" stroke={ink} strokeWidth={1.9} strokeLinecap="round">
        {beads}
      </g>
      {ticks ? <path d={ticks} stroke={ink} strokeWidth={1} opacity={0.55} /> : null}
      {outVisible ? (
        <g stroke={ink} fill="none" strokeLinecap="round">
          {/* The ghost of the ball, fully out. */}
          <circle cx={f1(c.x)} cy={f1(c.y)} r={f1(rOut)} strokeWidth={1} strokeDasharray="2 4" opacity={0.7} />
          {/* Plumb line from its centre to the ground, and the cross where it would rest. */}
          <path d={`M${f1(c.x)} ${f1(c.y + 4)}V${f1(g.y - 7)}`} strokeWidth={1.2} strokeDasharray="0.01 5" opacity={0.85} />
          <path d={`M${f1(g.x - 6)} ${f1(g.y - 6)}l12 12M${f1(g.x + 6)} ${f1(g.y - 6)}l-12 12`} strokeWidth={1.4} />
          <circle cx={f1(c.x)} cy={f1(c.y)} r={2} fill={ink} stroke="none" />
          {/* Leader up and away from the ghost to the label. */}
          <path d={`M${f1(c.x + rOut * 0.74)} ${f1(c.y - rOut * 0.74)}l18 -18h50`} strokeWidth={1} opacity={0.7} />
          {label(c.x + rOut * 0.74 + 22, c.y - rOut * 0.74 - 26, "OUT", "start")}
        </g>
      ) : null}
      {exit && left > 0 ? (
        <g stroke={ink} fill={ink} strokeLinecap="round">
          <path d={`M${f1(exit.x - 5)} ${f1(exit.y - 5)}l6 5l-6 5`} fill="none" strokeWidth={1.3} />
          {/* The count waits on the empty grass below the line, clear of the ball rolling above it. */}
          {label(exit.x + 2, groundAt(camera, sExit).y + 40, `OUT ${left.toFixed(1)} m`, "end")}
        </g>
      ) : null}
    </g>
  );
};
