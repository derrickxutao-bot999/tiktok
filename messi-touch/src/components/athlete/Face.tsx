// Hairlines of the face, the grain of hair and beard, and the eye.
//
// The eye is a single point of light on the cornea with a tiny glow. As the
// camera comes close it opens up: a faint almond of white between the lids,
// the iris edge-on in the era's accent colour, the cornea as one bright arc,
// the four floodlights caught along it as four points of light, and the
// touchline he is chasing reflected as a sliver across its lower edge.

import React from "react";
import { clamp, dist, lerp, smoothstep } from "../../lib/math";
import { Pt, polyPath, smoothPath } from "./geom";
import { FigureGeo } from "./figure";
import { mix } from "./color";
import { Paint } from "./paint";

type Props = { g: FigureGeo; paint: Paint; id: (s: string) => string; hairline: number };

export const EyeDefs: React.FC<{ paint: Paint; id: (s: string) => string; hasBeard: boolean }> = ({ paint, id, hasBeard }) => {
  const L = paint.light;
  return (
    <>
      <radialGradient id={id("eg")}>
        <stop offset={0} stopColor={paint.eye} stopOpacity={0.9} />
        <stop offset={0.18} stopColor={L.glow} stopOpacity={0.42} />
        <stop offset={0.55} stopColor={L.glow} stopOpacity={0.1} />
        <stop offset={1} stopColor={L.glow} stopOpacity={0} />
      </radialGradient>
      <radialGradient id={id("ei")}>
        <stop offset={0} stopColor={mix(paint.iris, "#FFFFFF", 0.25)} stopOpacity={0.95} />
        <stop offset={0.6} stopColor={paint.iris} stopOpacity={0.6} />
        <stop offset={1} stopColor={mix(paint.iris, L.body, 0.6)} stopOpacity={0.5} />
      </radialGradient>
      <linearGradient id={id("es")}>
        <stop offset={0} stopColor={paint.eye} stopOpacity={0} />
        <stop offset={0.5} stopColor={paint.eye} stopOpacity={0.75} />
        <stop offset={1} stopColor={paint.eye} stopOpacity={0} />
      </linearGradient>
      <clipPath id={id("hc")}>
        <use href={`#${id("hair")}`} />
      </clipPath>
      {hasBeard ? (
        <clipPath id={id("bc")}>
          <use href={`#${id("beard")}`} />
        </clipPath>
      ) : null}
    </>
  );
};

export const Face: React.FC<Props> = ({ g, paint, id, hairline }) => {
  const { geo, screen: S, radiusPx: R, pitch } = g.head;
  const L = paint.light;
  const contour = L.contour;
  const path = (pts: readonly Pt[], closed = false) => smoothPath(pts.map(S), closed);
  /** Many short strokes as one path. */
  const strokes = (list: readonly (readonly Pt[])[]) => list.map((l) => polyPath(l.map(S), false)).join("");
  const line = (pts: readonly Pt[], op: number, w = hairline, color = contour) => (
    <path d={path(pts)} fill="none" stroke={color} strokeOpacity={op} strokeWidth={w} strokeLinecap="round" />
  );
  const e = geo.eye;
  const light = S(e.light);
  const ic = S(e.iris.c);
  const deg = (-pitch * 180) / Math.PI;
  // Detail fades in with size, so a zoom never pops a line on.
  const at = (px: number) => smoothstep(px * 0.75, px * 1.25, R);
  const features = at(26);
  const fine = at(40);
  const eyeDetail = at(70);
  const glint = at(90);
  const hero = smoothstep(120, 200, R);
  const grain = at(70);
  const halo = lerp(Math.max(2.4, 0.13 * R), 0.2 * R, hero);
  // Four floodlights in the cornea, the first the brightest.
  const catches = e.catches.map(S);
  const catchR = [0.009, 0.0062, 0.005, 0.0038].map((f) => Math.max(0.5, f * R));

  return (
    <g>
      {features > 0 ? geo.lines.map((l, i) => <React.Fragment key={i}>{line(l.pts, 0.5 * l.weight * features)}</React.Fragment>) : null}

      {/* Engraved grain inside the hair, brighter where the light falls; silver at the temple. */}
      {fine > 0 ? (
        <g clipPath={`url(#${id("hc")})`} fill="none" strokeLinecap="round">
          {geo.strands.map((s, i) => (
            <path key={i} d={path(s.pts)} stroke={`url(#${id("cb")})`} strokeOpacity={0.55 * s.weight * fine} strokeWidth={hairline * 0.75} />
          ))}
          {geo.grain.length ? <path d={strokes(geo.grain)} stroke={`url(#${id("cb")})`} strokeOpacity={0.3 * grain} strokeWidth={hairline * 0.6} /> : null}
          {geo.silver.length ? <path d={strokes(geo.silver)} stroke={paint.silver} strokeOpacity={0.7 * fine} strokeWidth={hairline * 0.8} /> : null}
        </g>
      ) : null}

      {/* The beard: its own edge across the cheek, and grain along the jaw. */}
      {geo.beardEdge && features > 0 ? line(geo.beardEdge, 0.45 * features, hairline) : null}
      {geo.beard && grain > 0 ? (
        <g clipPath={`url(#${id("bc")})`} fill="none" strokeLinecap="round">
          <path d={strokes(geo.beardGrain)} stroke={contour} strokeOpacity={0.3 * grain} strokeWidth={hairline * 0.7} />
          {geo.beardSilver.length ? <path d={strokes(geo.beardSilver)} stroke={paint.silver} strokeOpacity={0.6 * grain} strokeWidth={hairline * 0.8} /> : null}
        </g>
      ) : null}

      {fine > 0 ? (
        <>
          {line(e.upper, 0.9 * fine, hairline * lerp(1.3, 1.6, hero))}
          {line(e.lower, 0.4 * fine)}
        </>
      ) : null}
      {eyeDetail > 0 ? (
        <g opacity={eyeDetail}>
          {line(e.crease, 0.24)}
          <path d={path(e.opening, true)} fill={mix(L.bodyLit, L.contourDim, 0.4)} fillOpacity={0.55} />
          <ellipse
            cx={ic.x}
            cy={ic.y}
            rx={dist(S(e.iris.side), ic)}
            ry={dist(S(e.iris.top), ic)}
            transform={`rotate(${deg.toFixed(2)} ${ic.x.toFixed(1)} ${ic.y.toFixed(1)})`}
            fill={`url(#${id("ei")})`}
            stroke={contour}
            strokeOpacity={0.3}
            strokeWidth={hairline * 0.7}
          />
          {line(e.cornea, 0.85, hairline * lerp(0.9, 1.3, hero), paint.eye)}
        </g>
      ) : null}
      {hero > 0 ? line(e.reflection, 0.55 * hero, hairline * 0.6, paint.eye) : null}

      {/* The light in his eyes: a wide soft bloom, then the point itself. */}
      {hero > 0 ? <circle cx={light.x} cy={light.y} r={0.55 * R} fill={`url(#${id("eg")})`} opacity={0.16 * hero} /> : null}
      <circle cx={light.x} cy={light.y} r={halo} fill={`url(#${id("eg")})`} opacity={lerp(1, 0.4, hero)} />
      {/* A short anamorphic glint, kept well inside the face. */}
      {glint > 0 ? (
        <g transform={`translate(${light.x.toFixed(1)} ${light.y.toFixed(1)})`} opacity={glint * lerp(1, 0.5, hero)}>
          <ellipse rx={clamp(0.07 * R, 2, 0.12 * R)} ry={Math.max(0.4, 0.0035 * R)} fill={`url(#${id("es")})`} />
        </g>
      ) : null}
      {hero > 0
        ? catches.slice(1).map((c, i) => (
            <g key={i} opacity={hero}>
              <circle cx={c.x} cy={c.y} r={0.03 * R} fill={`url(#${id("eg")})`} opacity={0.4} />
              <circle cx={c.x} cy={c.y} r={catchR[i + 1]} fill={paint.eye} />
            </g>
          ))
        : null}
      <circle cx={light.x} cy={light.y} r={lerp(Math.max(0.75, 0.014 * R), catchR[0], hero)} fill={paint.eye} />
    </g>
  );
};
