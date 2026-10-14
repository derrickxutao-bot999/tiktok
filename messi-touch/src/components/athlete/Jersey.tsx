// The jersey: the hero colour of the film. A luminous patch in the kit's
// pattern, aligned to the torso, lit from inside, falling off towards the
// shadow side, with a thin bright edge, a lit collar rib, the number on the
// back panel and the stars on the chest.

import React from "react";
import { ShirtPattern } from "../../lib/eras";
import { FONTS } from "../../lib/palette";
import { Vec2 } from "../../lib/math";
import { FigureGeo } from "./figure";
import { mix } from "./color";
import { Paint } from "./paint";

type Stop = { o: number; c: string; a?: number };

export const MULTIPLY: React.CSSProperties = { mixBlendMode: "multiply" };
const SCREEN: React.CSSProperties = { mixBlendMode: "screen" };

/** Stripes wrap round a cylinder: evenly spaced in angle, so they narrow towards the front and back edges. */
const patternStops = (pat: ShirtPattern): Stop[] => {
  if (pat.kind === "solid") return [{ o: 0, c: pat.color }, { o: 1, c: pat.color }];
  if (pat.kind === "halves")
    return [{ o: 0, c: pat.colors[1] }, { o: 0.5, c: pat.colors[1] }, { o: 0.5, c: pat.colors[0] }, { o: 1, c: pat.colors[0] }];
  const n = pat.count;
  const span = 1.25;
  const edge = (i: number) => (1 + Math.sin(-span + (2 * span * i) / n) / Math.sin(span)) / 2;
  const out: Stop[] = [];
  for (let i = 0; i < n; i++) {
    const c = pat.colors[i % 2];
    out.push({ o: edge(i), c }, { o: edge(i + 1), c });
  }
  return out;
};

export const stopsOf = (stops: Stop[]) =>
  stops.map((s, i) => <stop key={i} offset={s.o} stopColor={s.c} stopOpacity={s.a ?? 1} />);

const STAR = Array.from({ length: 10 }, (_, i) => {
  const a = -Math.PI / 2 + (i * Math.PI) / 5;
  const r = i % 2 ? 0.42 : 1;
  return [Math.cos(a) * r, Math.sin(a) * r] as const;
});
const starPath = (c: Vec2, r: number) => STAR.map(([x, y], i) => `${i ? "L" : "M"}${(c.x + x * r).toFixed(2)} ${(c.y + y * r).toFixed(2)}`).join("") + "Z";

type JerseyProps = { g: FigureGeo; paint: Paint; id: (s: string) => string; rim: Vec2 };

/** Gradients for the shirt; render inside <defs>. */
export const JerseyDefs: React.FC<JerseyProps> = ({ g, paint, id, rim }) => {
  const T = g.torso;
  const a = T.at(-0.13, 0.3);
  const b = T.at(0.13, 0.3);
  const c = T.at(0, 0.25);
  const R = 0.24 * T.s * g.k;
  const glowC = T.at(0.03, 0.3);
  const deep = paint.heroDeep;
  const lin = { gradientUnits: "userSpaceOnUse" as const, x1: c.x - rim.x * R, y1: c.y - rim.y * R, x2: c.x + rim.x * R, y2: c.y + rim.y * R };
  return (
    <>
      <linearGradient id={id("jp")} gradientUnits="userSpaceOnUse" x1={a.x} y1={a.y} x2={b.x} y2={b.y}>
        {stopsOf(patternStops(paint.pattern))}
      </linearGradient>
      <linearGradient id={id("js")} {...lin}>
        {stopsOf([{ o: 0, c: deep }, { o: 0.5, c: mix(deep, "#FFFFFF", 0.6) }, { o: 0.9, c: "#FFFFFF" }])}
      </linearGradient>
      <linearGradient id={id("je")} {...lin}>
        {stopsOf([{ o: 0.3, c: paint.heroEdge, a: 0 }, { o: 0.65, c: paint.heroEdge, a: 0.35 }, { o: 1, c: paint.heroEdge, a: 1 }])}
      </linearGradient>
      <radialGradient id={id("jg")} gradientUnits="userSpaceOnUse" cx={glowC.x} cy={glowC.y} r={0.2 * T.s * g.k}>
        {stopsOf([{ o: 0, c: paint.heroEdge, a: 0.5 }, { o: 0.6, c: paint.heroEdge, a: 0.12 }, { o: 1, c: paint.heroEdge, a: 0 }])}
      </radialGradient>
      <clipPath id={id("cs")}>
        <use href={`#${id("shirt")}`} />
      </clipPath>
      <filter id={id("jv")} filterUnits="userSpaceOnUse" x={g.box.x} y={g.box.y} width={g.box.w} height={g.box.h}>
        <feGaussianBlur stdDeviation={0.02 * T.s * g.k} />
      </filter>
    </>
  );
};

type OverlayProps = Omit<JerseyProps, "rim"> & {
  number: string | null;
  numberColor: string;
  collar: string;
  stars: number;
  hairline: number;
  /** Fill that dims the shirt away from the eye in the eye close-up (or null). */
  focus: string | null;
};

/** Everything painted on the shirt after its pattern fill. */
export const JerseyOverlay: React.FC<OverlayProps> = ({ g, paint, id, number, numberColor, collar, stars, hairline, focus }) => {
  const T = g.torso;
  const lean = (T.lean * 180) / Math.PI;
  const np = T.at(-0.062, 0.29);
  const fontPx = 0.15 * T.s * g.k;
  const starR = 0.0078 * T.s * g.k;
  const shirt = `#${id("shirt")}`;
  const clip = `url(#${id("cs")})`;
  const seamA = T.at(0, -0.08);
  const seamB = T.at(0, 0.55);
  // Blends sit directly on the shirt, outside any clipped (isolated) group.
  return (
    <g>
      {number && fontPx > 5 && g.numberVis > 0 ? (
        <g clipPath={clip}>
          <text
            x={0}
            y={0}
            transform={`translate(${np.x.toFixed(1)} ${np.y.toFixed(1)}) rotate(${lean.toFixed(2)}) scale(0.6 1)`}
            fontFamily={FONTS.condensed}
            fontWeight={700}
            fontSize={fontPx}
            textAnchor="middle"
            dominantBaseline="central"
            fill={numberColor}
            fillOpacity={0.92 * g.numberVis}
          >
            {number}
          </text>
        </g>
      ) : null}
      <use href={shirt} fill={`url(#${id("js")})`} style={MULTIPLY} />
      {/* Inner vignette: the panel deepens towards its edges, so it reads as lit from within. */}
      <use href={shirt} fill="none" stroke={paint.heroDeep} strokeOpacity={0.8} strokeWidth={0.05 * T.s * g.k} filter={`url(#${id("jv")})`} clipPath={clip} style={MULTIPLY} />
      <use href={shirt} fill={`url(#${id("jg")})`} style={SCREEN} />
      {paint.pattern.kind === "halves" ? (
        <path d={`M${seamA.x.toFixed(1)} ${seamA.y.toFixed(1)}L${seamB.x.toFixed(1)} ${seamB.y.toFixed(1)}`} stroke={paint.heroEdge} strokeOpacity={0.35} strokeWidth={hairline} clipPath={clip} />
      ) : null}
      <g clipPath={clip}>
        <use href={shirt} fill="none" stroke={`url(#${id("je")})`} strokeWidth={hairline * 2.2} />
      </g>
      {/* The collar rib, lit along its inner edge. */}
      <path d={g.collar.band} fill={mix(collar, paint.heroEdge, 0.22)} />
      <path d={g.collar.band} fill={`url(#${id("js")})`} style={MULTIPLY} />
      <path d={g.collar.edge} fill="none" stroke={paint.light.contour} strokeOpacity={0.5} strokeWidth={hairline} strokeLinecap="round" />
      {starR > 0.7
        ? // A short row across the chest, just behind its front edge.
          Array.from({ length: stars }, (_, i) => <path key={i} d={starPath(T.at(0.094 - i * 0.021, 0.4 + 0.004 * i), starR)} fill={paint.gold} />)
        : null}
      {focus ? <use href={shirt} fill={focus} style={MULTIPLY} /> : null}
    </g>
  );
};
