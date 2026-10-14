// The figure as luminous line art: its outer contour, the near limbs where
// they cross the body, the hems and sock bands, and the point of the eye.
// Cheap enough for six Marey echoes at once.
//
// Draw-on (stroke-dashoffset family, pathLength = 1): the line grows along
// the body from the touching toe, at constant speed. The near boot starts at
// its tip; every other part starts once the line drawing its parent reaches
// the joint they share (boot -> sock -> shin -> knee -> thigh -> shorts ->
// shirt -> neck -> head -> hair; shirt -> sleeve -> arm -> hand; the far leg
// down from the hips). Each part is redrawn to start at its outline point
// nearest that joint and grows both ways from there, so every visible stroke
// grows out of a line that is already drawn: one line, being etched.

import React from "react";
import { Vec2, clamp, dist, smoothstep } from "../../lib/math";
import { Pose } from "../../lib/rig";
import { Camera } from "../../lib/world";
import { Line, Part, buildFigure } from "./figure";
import { segLengths, segsPath } from "./geom";

export type EtchedAthleteProps = {
  pose: Pose;
  camera: Camera;
  idPrefix: string;
  /** 0..1 draw-on. */
  progress: number;
  color: string;
  /** Visible line width, px (default 1.5). */
  width?: number;
  opacity?: number;
  /** Adds one soft bloom under the lines (default off). */
  glow?: boolean;
};

/** When a part's line starts (px of line already drawn) and where along its outline. */
type Grow = { d: string; start: number; half: number };

/** Lays the growth out over the tree: each part starts where its parent's line reaches their joint. */
const growthPlan = (parts: readonly Part[], root: Vec2): Map<string, Grow> => {
  const byId = new Map(parts.map((p) => [p.id, p]));
  const memo = new Map<string, { start: number; i0: number; cum: number[] }>();
  const nearest = (p: Part, q: Vec2) => {
    let j = 0;
    p.segs.forEach((s, i) => {
      if (dist(s[0], q) < dist(p.segs[j][0], q)) j = i;
    });
    return j;
  };
  const visit = (p: Part, seen: Set<string>): { start: number; i0: number; cum: number[] } => {
    const hit = memo.get(p.id);
    if (hit) return hit;
    const lens = segLengths(p.segs);
    const cum = lens.reduce<number[]>((acc, l) => [...acc, acc[acc.length - 1] + l], [0]);
    const parent = p.parent ? byId.get(p.parent) : undefined;
    let out: { start: number; i0: number; cum: number[] };
    if (!parent || !p.joint || seen.has(parent.id)) {
      const i0 = nearest(p, root);
      out = { start: dist(p.segs[i0][0], root), i0, cum };
    } else {
      seen.add(p.id);
      const pp = visit(parent, seen);
      const j = nearest(parent, p.joint);
      const total = pp.cum[pp.cum.length - 1];
      const along = (pp.cum[j] - pp.cum[pp.i0] + total) % total;
      out = { start: pp.start + Math.min(along, total - along), i0: nearest(p, p.joint), cum };
    }
    memo.set(p.id, out);
    return out;
  };
  const plan = new Map<string, Grow>();
  parts.forEach((p) => {
    const { start, i0, cum } = visit(p, new Set());
    const segs = [...p.segs.slice(i0), ...p.segs.slice(0, i0)];
    plan.set(p.id, { d: segsPath(segs, true), start, half: cum[cum.length - 1] / 2 });
  });
  return plan;
};

export const EtchedAthlete: React.FC<EtchedAthleteProps> = ({ pose, camera, idPrefix, progress, color, width = 1.5, opacity = 1, glow = false }) => {
  if (progress <= 0 || opacity <= 0) return null;
  const g = buildFigure(pose, camera);
  const id = (s: string) => `${idPrefix}-etch-${s}`;
  const url = (s: string) => `url(#${id(s)})`;
  // Studs and the dark mouth of the worn shoe would only read as noise in line art.
  const keep = (p: Part) => !p.detail;
  const back = [...g.far.parts, ...g.body.parts].filter(keep);
  const leg = g.leg.parts.filter(keep);
  const arm = g.arm.parts.filter(keep);
  const all = [...back, ...leg, ...arm];
  const done = progress >= 1;
  const plan = done ? null : growthPlan(all, g.feet.L.toe);
  const front = plan ? progress * Math.max(...[...plan.values()].map((s) => s.start + s.half)) : 0;
  /** How much of a part's outline is drawn, 0..1. */
  const drawn = (pid: string) => {
    const s = plan?.get(pid);
    return s ? clamp((front - s.start) / s.half) : 1;
  };
  const started = (p: Part) => drawn(p.id) > 0;
  const shirt = g.body.parts.find((p) => p.id === "shirt")!;
  const box = g.box;
  const boxAttrs = { x: box.x, y: box.y, width: box.w, height: box.h };

  const outline = (p: Part, sw: number) => {
    const f = drawn(p.id);
    if (f <= 0) return null;
    return <use key={p.id} href={`#${id(p.id)}`} strokeWidth={sw} strokeDasharray={f < 1 ? `${f / 2} ${1 - f} ${f / 2} 0` : undefined} />;
  };
  // Hems and sock bands come in with the part they belong to.
  const keepLine = (l: Line) => l.kind === "hem" || l.kind === "sockBand";
  const hairlines = (lines: Line[], sw: number) =>
    lines.filter(keepLine).map((l, i) => {
      // A hem crosses its part: it comes in once the part's edges have reached it.
      const f = smoothstep(0.6, 1, drawn(l.owner));
      return f > 0 ? <path key={i} d={l.d} pathLength={1} strokeWidth={sw * 0.4} strokeOpacity={0.5} strokeDasharray={f < 1 ? `${f} 1` : undefined} /> : null;
    });

  const art = (sw: number) => (
    <>
      <g mask={url("ma")}>{back.map((p) => outline(p, sw))}</g>
      <g mask={url("ml")}>
        {leg.map((p) => outline(p, sw))}
        {hairlines(g.far.lines, sw)}
      </g>
      <g mask={url("mr")}>
        {arm.map((p) => outline(p, sw))}
        {hairlines([...g.body.lines, ...g.leg.lines], sw)}
      </g>
      {hairlines(g.arm.lines, sw)}
    </>
  );

  const knockout = (name: string, parts: Part[], extra?: string) => (
    <mask id={id(name)} maskUnits="userSpaceOnUse" {...boxAttrs}>
      <rect {...boxAttrs} fill="#FFFFFF" stroke="none" />
      {parts.map((p) => (
        <use key={p.id} href={`#${id(p.id)}`} fill="#000000" stroke="none" />
      ))}
      {extra ? <path d={extra} fill="#000000" stroke="none" /> : null}
    </mask>
  );

  const eye = g.head.screen(g.head.geo.eye.light);
  const eyeOn = clamp((drawn("head") - 0.6) / 0.4);

  return (
    <g opacity={opacity} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
      <defs>
        {all.map((p) => (
          <path key={p.id} id={id(p.id)} d={plan?.get(p.id)?.d ?? p.d} pathLength={1} />
        ))}
        {/* Outer contour of everything; the near leg, which sits behind the shirt and the near arm; the near arm.
            Only parts whose line has started hide what lies inside them, so nothing is hidden by a part that is not there yet. */}
        {knockout("ma", all.filter(started))}
        {knockout("ml", [...leg, ...arm].filter(started), started(shirt) ? g.shirt : undefined)}
        {knockout("mr", arm.filter(started))}
        {glow ? (
          <filter id={id("glow")} filterUnits="userSpaceOnUse" {...boxAttrs}>
            <feGaussianBlur stdDeviation={Math.max(2, width * 2.5)} />
          </filter>
        ) : null}
      </defs>
      {glow ? (
        <g filter={url("glow")} opacity={0.8}>
          {art(width * 5)}
        </g>
      ) : null}
      {art(width * 2)}
      {eyeOn > 0 ? <circle cx={eye.x} cy={eye.y} r={Math.max(1, width * 0.9)} fill={color} stroke="none" opacity={eyeOn} /> : null}
    </g>
  );
};
