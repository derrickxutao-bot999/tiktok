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
//
// Interior detail (`detail`): the hairline where hair meets the face and the
// neck, the beard's edge on the cheek, the ear, brow and jaw, the jersey's
// stripe seams and a hairline number on the back. It is what makes the
// legend in the sky unmistakably the 39-year-old rather than a generic
// outline. It costs a clip and a few paths, so by default it is on only with
// `glow` and fades in with the figure's projected size; the small Marey
// echoes keep the cheap path.

import React from "react";
import { ShirtPattern } from "../../lib/eras";
import { FONTS } from "../../lib/palette";
import { Vec2, clamp, dist, lerp, smoothstep } from "../../lib/math";
import { Pose } from "../../lib/rig";
import { Camera } from "../../lib/world";
import { Line, Part, buildFigure } from "./figure";
import { bezier, polyPath, segLengths, segsPath, smoothPath } from "./geom";

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
  /**
   * Interior detail, 0..1: hairline, beard edge, ear, jersey stripes and the
   * number. Defaults to on with `glow` once the head is ~18-36 px in radius,
   * and off without glow (the cheap path for many small echoes).
   */
  detail?: number;
};

/** The jersey's own spot for the number (torso f, u); line art moves it to the nearest spot on the back the near arm leaves clear. */
const NUMBER_HOME = [-0.062, 0.29] as const;

const insidePolygon = (pl: readonly Vec2[], q: Vec2) => {
  let c = false;
  for (let i = 0, j = pl.length - 1; i < pl.length; j = i++) {
    const a = pl[i];
    const b = pl[j];
    if (a.y > q.y !== b.y > q.y && q.x < ((b.x - a.x) * (q.y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
};

/** Where the stripes of a kit meet, as fractions across the torso (same wrap as the jersey's pattern). */
const seamsOf = (pat: ShirtPattern): number[] => {
  if (pat.kind === "solid") return [];
  if (pat.kind === "halves") return [0.5];
  const span = 1.25;
  return Array.from({ length: pat.count - 1 }, (_, i) => (1 + Math.sin(-span + (2 * span * (i + 1)) / pat.count) / Math.sin(span)) / 2);
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

export const EtchedAthlete: React.FC<EtchedAthleteProps> = ({ pose, camera, idPrefix, progress, color, width = 1.5, opacity = 1, glow = false, detail }) => {
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

  // ---------------------------------------------------------------- interior detail
  const det = clamp(detail ?? (glow ? smoothstep(18, 36, g.head.radiusPx) : 0));
  const S = g.head.screen;
  const geo = g.head.geo;
  const has = (pid: string) => all.some((p) => p.id === pid);
  /** A detail comes in once its owner's outline is mostly drawn, growing along its own length. */
  const grown = (owner: string) => smoothstep(0.5, 1, drawn(owner)) * det;
  const etch = (key: string, d: string, owner: string, sw: number, op: number) => {
    const f = grown(owner);
    return f > 0 ? <path key={key} d={d} pathLength={1} strokeWidth={sw} strokeOpacity={op} strokeDasharray={f < 1 ? `${f} 1` : undefined} /> : null;
  };
  const T = g.torso;
  const seams = det > 0 ? seamsOf(pose.look.kit.shirt) : [];
  const number = pose.look.kit.number;
  // The number sits on the back panel where the jersey has it, or, if the
  // near arm crosses that spot (line art shows no fill to carry it), at the
  // first spot lower down the back that the arm leaves clear.
  const numberAt = (() => {
    if (det <= 0 || !number) return null;
    const polys = arm.map((p) => p.segs.flatMap((sg) => [0, 0.25, 0.5, 0.75].map((t) => bezier(sg, t))));
    const covered = (q: Vec2) => polys.some((pl) => insidePolygon(pl, q));
    const clear = (f: number, u: number) => [-0.032, 0, 0.032].every((df) => [-0.05, 0, 0.05].every((du) => !covered(T.at(f + df, u + du))));
    let best: { f: number; u: number; d: number } | null = null;
    for (let f = -0.07; f <= -0.019; f += 0.01)
      for (let u = 0.34; u >= 0.119; u -= 0.02) {
        const d = Math.hypot(f - NUMBER_HOME[0], u - NUMBER_HOME[1]);
        if ((!best || d < best.d) && clear(f, u)) best = { f, u, d };
      }
    return best ? T.at(best.f, best.u) : null;
  })();
  const np = numberAt ?? T.at(-0.062, 0.29);
  const fontPx = 0.15 * T.s * g.k;
  const lean = (T.lean * 180) / Math.PI;
  const faceLines = det > 0 ? geo.lines.filter((l) => l.weight >= 0.6) : [];
  const details = (sw: number) =>
    det > 0 ? (
      <g mask={url("mr")}>
        {/* The hairline: the hair's own edge wherever it lies over the face, the neck or the shirt. */}
        {has("hair") ? (
          <g clipPath={url("cb")}>{etch("hair", plan?.get("hair")?.d ?? all.find((p) => p.id === "hair")!.d, "hair", sw * 0.55, 0.75)}</g>
        ) : null}
        {geo.beardEdge ? etch("beard", smoothPath(geo.beardEdge.map(S), false), "head", sw * 0.5, 0.7) : null}
        {faceLines.map((l, i) => etch(`f${i}`, smoothPath(l.pts.map(S), false), "head", sw * 0.4, 0.55))}
        <g clipPath={url("cs")}>
          {seams.map((u, i) => {
            const f = lerp(-0.13, 0.13, u);
            return etch(`s${i}`, polyPath([T.at(f, -0.1), T.at(f, 0.56)], false), "shirt", sw * 0.32, 0.45);
          })}
          {number && numberAt && fontPx > 8 && grown("shirt") > 0 ? (
            <text
              x={0}
              y={0}
              transform={`translate(${np.x.toFixed(1)} ${np.y.toFixed(1)}) rotate(${lean.toFixed(2)}) scale(0.6 1)`}
              fontFamily={FONTS.condensed}
              fontWeight={700}
              fontSize={fontPx}
              textAnchor="middle"
              dominantBaseline="central"
              strokeWidth={(sw * 0.32) / 0.8}
              strokeOpacity={0.6 * grown("shirt")}
            >
              {number}
            </text>
          ) : null}
        </g>
      </g>
    ) : null;

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
      {details(sw)}
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
        {det > 0 ? (
          <>
            {/* What the hair lies over (its edge shows only there), and the shirt for the stripes and the number. */}
            <clipPath id={id("cb")}>
              {g.body.parts
                .filter((p) => p.id !== "hair" && p.id !== "beard")
                .map((p) => (
                  <path key={p.id} d={p.d} />
                ))}
            </clipPath>
            <clipPath id={id("cs")}>
              <path d={g.shirt} />
            </clipPath>
          </>
        ) : null}
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
