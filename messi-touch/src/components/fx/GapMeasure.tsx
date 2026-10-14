// The last centimetre, dimensioned like an engineering drawing: extension
// lines rise from the toe tip and from the ball's surface, an aligned
// dimension line crosses them with arrowheads pointing in from outside (the
// gap is far too small to hold them), and a leader carries the figure up and
// away from the gap to where it can be read. Everything draws on in order:
// extension lines, dimension line, leader, then the figure types itself in.
//
// The callout scales with the zoom, so it stands in clear air beside the shin
// and off the ball's limb both on the frozen frame and in the close-up. Every
// hairline sits on a thin dark casing, so it reads over the white ball, the
// boot and the touchline alike.

import React from "react";
import { DEG, Vec2, add, clamp, len, lerp, mul, norm, smoothstep, sub, v } from "../../lib/math";
import { FONTS } from "../../lib/palette";
import { mixHex } from "./util";

export type GapMeasureProps = {
  /** Toe tip, screen px. */
  a: { x: number; y: number };
  /** Ball surface, screen px. */
  b: { x: number; y: number };
  label?: string;
  /** 0..1 draw-on. */
  progress: number;
  color: string;
  /** Scale at the gap, px per metre: sizes the callout to the shot. */
  pxPerM?: number;
  /** Distance of the dimension line from the measured points, px (overrides the scaled default). */
  offset?: number;
  /** Size of the figure, px (overrides 22, or 28 in close-ups); the arrowheads, leader and casing follow it. */
  fontSize?: number;
  /** Width of the dimension and extension hairlines, px (default 1; the dimension line is 1.25x this). */
  lineWidth?: number;
  idPrefix?: string;
};

const GAP0 = 5;
const OVERSHOOT = 8;
const TAIL = 18;
const HEAD_L = 10;
const HEAD_W = 2.6;
/** Close-ups (more than this many px per metre) get the larger callout. */
const CLOSE = 1000;
/** The leader leans this far off the normal towards the ball, into the open air above it and clear of the shin. */
const LEAN = -8 * DEG;
const CASE = "rgba(3,4,9,0.7)";
const CASE_W = 3;

const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const f = (n: number) => n.toFixed(2);

type Stroke = { from: Vec2; to: Vec2; k: number; w: number };

const arrowHead = (tip: Vec2, dir: Vec2, n: Vec2, sc: number) => {
  const base = sub(tip, mul(dir, HEAD_L * sc));
  const l = add(base, mul(n, HEAD_W * sc));
  const r = sub(base, mul(n, HEAD_W * sc));
  return `M${f(tip.x)} ${f(tip.y)}L${f(l.x)} ${f(l.y)}L${f(r.x)} ${f(r.y)}Z`;
};

export const GapMeasure: React.FC<GapMeasureProps> = ({
  a,
  b,
  label = "1 cm",
  progress,
  color,
  pxPerM,
  offset,
  fontSize,
  lineWidth = 1,
  idPrefix = "gap",
}) => {
  const p = clamp(progress);
  if (p <= 0) return null;
  const A = v(a.x, a.y);
  const B = v(b.x, b.y);
  const d = sub(B, A);
  const gapPx = len(d);
  // A gap magnified until it is wide (a detail lens) carries its callout close by, so the whole callout stays in the lens.
  const scaled = pxPerM ? clamp(0.16 * pxPerM, 60, 160) : 86;
  const off = offset ?? lerp(scaled, clamp(1.5 * gapPx, 60, 160), smoothstep(28, 48, gapPx));
  const close = (pxPerM ?? 0) > CLOSE;
  const font = fontSize ?? (close ? 28 : 22);
  const lw = Math.max(0.25, lineWidth);
  // Arrowheads grow with the figure and the line, so a large callout keeps its proportions.
  const sc = (close ? 1.35 : 1) * Math.max(1, font / (close ? 28 : 22)) ** 0.5 * lw ** 0.5;
  const charW = font * 0.6 + font * 0.08;
  // The leader rises far enough for the figure to stand clear of the dimension line.
  const leader = Math.max(50 + 0.6 * off, 1.3 * font + 30);
  // Below a pixel the direction is meaningless: fall back to the touch direction (20 deg, rising right).
  const u = len(d) > 1 ? norm(d) : v(Math.cos(20 * DEG), -Math.sin(20 * DEG));
  let n = v(u.y, -u.x);
  if (n.y > 0) n = mul(n, -1);
  const inside = len(d) > 2 * HEAD_L * sc + 14;

  const DA = add(A, mul(n, off));
  const DB = add(B, mul(n, off));
  const M = mul(add(DA, DB), 0.5);
  const lead = norm(sub(mul(n, Math.cos(LEAN)), mul(u, Math.sin(LEAN))));
  const Q = add(M, mul(lead, leader));

  // Quick lines, so the figure itself is readable for the last quarter of the draw-on.
  const kExt = seg(p, 0, 0.24);
  const kDim = seg(p, 0.16, 0.4);
  const kLead = seg(p, 0.34, 0.52);
  const kShoulder = seg(p, 0.46, 0.6);
  const chars = Math.ceil(seg(p, 0.52, 0.74) * label.length);
  const textW = label.length * charW;
  const shoulder = (textW + 0.6 * font) * kShoulder;
  const ink = mixHex(color, "#FFFFFF", 0.5);
  const glowId = `${idPrefix}-gm-glow`;

  const strokes: Stroke[] = [
    { from: add(A, mul(n, GAP0)), to: add(A, mul(n, off + OVERSHOOT)), k: kExt, w: lw },
    { from: add(B, mul(n, GAP0)), to: add(B, mul(n, off + OVERSHOOT)), k: kExt, w: lw },
    ...(inside
      ? [
          { from: M, to: DA, k: kDim, w: 1.25 * lw },
          { from: M, to: DB, k: kDim, w: 1.25 * lw },
        ]
      : [
          // Outside arrows: the toe side keeps a short tail; the ball side is the arrowhead alone, off the ball.
          { from: sub(DA, mul(u, (TAIL + HEAD_L) * sc)), to: DA, k: kDim, w: 1.25 * lw },
          { from: DA, to: DB, k: kDim >= 1 ? 1 : 0, w: lw },
        ]),
    { from: add(M, mul(lead, 4)), to: Q, k: kLead, w: lw },
    { from: v(Q.x - shoulder / 2, Q.y), to: v(Q.x + shoulder / 2, Q.y), k: shoulder > 0 ? 1 : 0, w: lw },
  ];
  const heads =
    kDim > 0.6
      ? [inside ? arrowHead(DA, mul(u, -1), n, sc) : arrowHead(DA, u, n, sc), inside ? arrowHead(DB, u, n, sc) : arrowHead(DB, mul(u, -1), n, sc)]
      : [];
  const headO = seg(kDim, 0.6, 1);

  const draw = (extra: number) => (
    <>
      {strokes.map((s, i) =>
        s.k > 0 ? (
          <line
            key={i}
            x1={f(s.from.x)}
            y1={f(s.from.y)}
            x2={f(s.from.x + (s.to.x - s.from.x) * s.k)}
            y2={f(s.from.y + (s.to.y - s.from.y) * s.k)}
            strokeWidth={s.w + extra}
          />
        ) : null,
      )}
      {heads.length ? (
        <g opacity={headO} strokeWidth={extra} strokeLinejoin="round">
          {heads.map((h, i) => (
            <path key={i} d={h} />
          ))}
        </g>
      ) : null}
    </>
  );

  const xs = [A.x, B.x, Q.x - textW, Q.x + textW];
  const ys = [A.y, B.y, Q.y - font - 20];
  const box = { x: Math.min(...xs) - 30, y: Math.min(...ys) - 20, x1: Math.max(...xs) + 30, y1: Math.max(...ys) + 30 };

  return (
    <g strokeLinecap="round">
      <defs>
        <filter id={glowId} filterUnits="userSpaceOnUse" x={box.x} y={box.y} width={box.x1 - box.x} height={box.y1 - box.y}>
          <feGaussianBlur stdDeviation={2.6 * Math.max(1, lw)} />
        </filter>
      </defs>
      <g stroke={CASE} fill={CASE}>
        {draw(CASE_W * Math.max(1, lw))}
      </g>
      <g filter={`url(#${glowId})`} stroke={color} fill={color} opacity={0.75} style={{ mixBlendMode: "screen" }}>
        {draw(lw)}
      </g>
      <g stroke={ink} fill={ink}>
        {draw(0)}
        {/* The two measured points. */}
        <circle cx={f(A.x)} cy={f(A.y)} r={1.5 * lw} stroke="none" opacity={seg(p, 0, 0.1)} />
        <circle cx={f(B.x)} cy={f(B.y)} r={1.5 * lw} stroke="none" opacity={seg(p, 0, 0.1)} />
      </g>
      {chars > 0 ? (
        <text
          x={f(Q.x - textW / 2)}
          y={f(Q.y - font * 0.42)}
          fontFamily={FONTS.mono}
          fontSize={font}
          letterSpacing={`${font * 0.08}px`}
          fill={ink}
          stroke="rgba(3,4,9,0.75)"
          strokeWidth={Math.max(5, 0.17 * font)}
          strokeLinejoin="round"
          paintOrder="stroke"
          style={{ whiteSpace: "pre" }}
        >
          {label.slice(0, chars)}
        </text>
      ) : null}
    </g>
  );
};
