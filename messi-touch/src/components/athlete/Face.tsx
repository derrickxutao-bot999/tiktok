// Hairlines of the face, the grain of hair and beard, and the eye.
//
// The eye is a single point of light on the cornea with a tiny glow. As the
// camera comes close it opens up: a faint almond of white between the lids,
// the iris edge-on in the era's accent colour, the cornea as one bright arc,
// the four floodlights caught along it, and the touchline he is chasing
// reflected as a sliver across its lower edge.
//
// In the extreme close-up ("stories in his eyes", ~6500 px/m) it becomes the
// jewel of the film: lids and lashes as hairlines, the lid's wet rim, the
// pupil, the clear dome of the cornea, and along its bright arc seven lights in
// the seven era accents, top to bottom from 2026 to 1994: his whole career
// reflected in his eye. `story` (0..1) lights them one by one, each with a
// small flare; the floodlights step back into the iris, smaller and dimmer, so
// the story wins. Everything is sized in head units (metres x k), so it scales
// with the zoom and never drops below a hairline.
//
// Hair and beard up close: the coarse grain that reads at figure scale gives
// way to dense short strokes along the growth, and a short cut's hairline
// breaks into strands and fades into the skin (Athlete feathers the fill).

import React from "react";
import { ERAS } from "../../lib/eras";
import { clamp, dist, lerp, lerpV, smoothstep } from "../../lib/math";
import { Pt, polyPath, smoothPath } from "./geom";
import { FigureGeo } from "./figure";
import { mix } from "./color";
import { Paint } from "./paint";

type Props = {
  g: FigureGeo;
  paint: Paint;
  id: (s: string) => string;
  hairline: number;
  /** How much of the story in his eye is told, 0..1 (default 1: all seven era lights). */
  story?: number;
  /** The hairline's feather mask (close-up), applied to the hair's grain. */
  hairMask?: string;
};

/** Light adds to what is under it. */
const ADD: React.CSSProperties = { mixBlendMode: "plus-lighter" };

const url = (id: (s: string) => string, s: string) => `url(#${id(s)})`;

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
      {/* The iris up close: dark at the pupil, the accent, a lit band, a deep limbal ring. */}
      <radialGradient id={id("eim")}>
        <stop offset={0.3} stopColor={mix(paint.iris, L.bodyFar, 0.55)} stopOpacity={0.95} />
        <stop offset={0.55} stopColor={paint.iris} stopOpacity={0.85} />
        <stop offset={0.82} stopColor={mix(paint.iris, "#FFFFFF", 0.18)} stopOpacity={0.85} />
        <stop offset={1} stopColor={mix(paint.iris, L.bodyFar, 0.65)} stopOpacity={0.95} />
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

export const Face: React.FC<Props> = ({ g, paint, id, hairline, story = 1, hairMask }) => {
  const { geo, screen: S, radiusPx: R, pitch } = g.head;
  const L = paint.light;
  const contour = L.contour;
  const path = (pts: readonly Pt[], closed = false) => smoothPath(pts.map(S), closed);
  /** Many short strokes as one path. */
  const strokes = (list: readonly (readonly Pt[])[]) => list.map((l) => polyPath(l.map(S), false)).join("");
  /** Many short curves as one path. */
  const curves = (list: readonly (readonly Pt[])[]) => list.map((l) => smoothPath(l.map(S), false)).join("");
  const line = (pts: readonly Pt[], op: number, w = hairline, color = contour) => (
    <path d={path(pts)} fill="none" stroke={color} strokeOpacity={op} strokeWidth={w} strokeLinecap="round" />
  );
  const e = geo.eye;
  const ic = S(e.iris.c);
  const deg = (-pitch * 180) / Math.PI;
  const rotAt = (c: Pt) => `rotate(${deg.toFixed(2)} ${c.x.toFixed(1)} ${c.y.toFixed(1)})`;
  // Detail fades in with size, so a zoom never pops a line on.
  const at = (px: number) => smoothstep(px * 0.75, px * 1.25, R);
  const features = at(26);
  const fine = at(40);
  const eyeDetail = at(70);
  const glint = at(90);
  const hero = smoothstep(120, 200, R);
  const grain = at(70);
  /** The extreme close-up: lashes, pupil, the dome, the seven eras, close-up hair. */
  const macro = smoothstep(300, 520, R);
  // The bloom shrinks back in the macro shot so it never washes over the era lights.
  const halo = lerp(lerp(Math.max(2.4, 0.13 * R), 0.2 * R, hero), 0.02 * R, macro);
  // Four floodlights in the cornea, the first the brightest (the point of light). Up close they step back
  // into the upper iris, smaller, and leave the cornea's arc to the era lights.
  const catches = e.catches.map((c, i) => lerpV(S(c), S(e.catchesClose[i]), macro));
  const light = catches[0];
  const catchR = [lerp(0.009, 0.0036, macro), lerp(0.0062, 0.0022, macro), lerp(0.005, 0.0019, macro), lerp(0.0038, 0.0016, macro)].map((f) => Math.max(0.5, f * R));
  // The era lights: each comes on over its seventh of the story, flaring as it appears.
  const eraR = 0.005 * R;
  const eras =
    macro > 0
      ? e.jewels.flatMap((p, i) => {
          const u = clamp(story * e.jewels.length - i);
          if (u <= 0) return [];
          return [{ i, c: S(p), on: smoothstep(0, 0.55, u), flare: u < 1 ? Math.pow(Math.sin(Math.PI * u), 2) : 0, accent: ERAS[i].accent }];
        })
      : [];
  // Close-up hair and beard: silver and grey grain.
  const grey = mix(paint.silver, L.body, 0.42);
  // Hairline weights that grow a little with the close-up but stay hairlines.
  const lid = hairline * lerp(lerp(1.3, 1.6, hero), 1.5, macro);
  const lashW = Math.max(0.6, Math.min(1.1, 0.0013 * R));

  return (
    <g>
      {features > 0 ? geo.lines.map((l, i) => <React.Fragment key={i}>{line(l.pts, 0.5 * l.weight * features)}</React.Fragment>) : null}
      {macro > 0 ? <path d={strokes(geo.brow)} fill="none" stroke={contour} strokeOpacity={0.3 * macro} strokeWidth={hairline * 0.7} strokeLinecap="round" /> : null}

      {/* Engraved grain inside the hair, brighter where the light falls; silver at the temple. */}
      {fine > 0 ? (
        <g clipPath={`url(#${id("hc")})`} mask={hairMask} fill="none" strokeLinecap="round">
          {geo.strands.map((s, i) => (
            <path key={i} d={path(s.pts)} stroke={`url(#${id("cb")})`} strokeOpacity={0.55 * s.weight * fine} strokeWidth={hairline * 0.75} />
          ))}
          {geo.grain.length ? <path d={strokes(geo.grain)} stroke={`url(#${id("cb")})`} strokeOpacity={0.3 * grain * (1 - macro)} strokeWidth={hairline * 0.6} /> : null}
          {geo.silver.length ? <path d={strokes(geo.silver)} stroke={paint.silver} strokeOpacity={0.7 * fine * (1 - macro)} strokeWidth={hairline * 0.8} /> : null}
          {macro > 0 && geo.hairFine.length ? <path d={strokes(geo.hairFine)} stroke={grey} strokeOpacity={0.32 * macro} strokeWidth={hairline * 0.6} /> : null}
          {macro > 0 && geo.hairFineSilver.length ? <path d={strokes(geo.hairFineSilver)} stroke={paint.silver} strokeOpacity={0.42 * macro} strokeWidth={hairline * 0.6} /> : null}
        </g>
      ) : null}
      {/* The broken hairline: short strands across the front hairline and temple, and out of the silhouette at the front. */}
      {macro > 0 && geo.fringe.length + geo.fringeSilver.length > 0 ? (
        <g fill="none" strokeLinecap="round" strokeWidth={hairline * 0.6}>
          <path d={strokes(geo.fringe)} stroke={grey} strokeOpacity={0.42 * macro} />
          <path d={strokes(geo.fringeSilver)} stroke={paint.silver} strokeOpacity={0.5 * macro} />
        </g>
      ) : null}

      {/* The beard: its own edge across the cheek, and grain along the jaw (finer and denser in the close-up). */}
      {geo.beardEdge && features > 0 ? line(geo.beardEdge, 0.45 * features, hairline, paint.beardRim ?? contour) : null}
      {geo.beard && grain > 0 ? (
        <g clipPath={`url(#${id("bc")})`} fill="none" strokeLinecap="round">
          <path d={strokes(geo.beardGrain)} stroke={contour} strokeOpacity={0.3 * grain * (1 - macro)} strokeWidth={hairline * 0.7} />
          {geo.beardSilver.length ? <path d={strokes(geo.beardSilver)} stroke={paint.silver} strokeOpacity={0.6 * grain * (1 - macro)} strokeWidth={hairline * 0.8} /> : null}
          {macro > 0 ? <path d={curves(geo.beardFine)} stroke={grey} strokeOpacity={0.36 * macro} strokeWidth={hairline * 0.6} /> : null}
          {macro > 0 && geo.beardFineSilver.length ? (
            <path d={curves(geo.beardFineSilver)} stroke={paint.silver} strokeOpacity={0.45 * macro} strokeWidth={hairline * 0.6} />
          ) : null}
        </g>
      ) : null}

      {/* The open eye: sclera, then the iris (clipped to the lids), its pupil, the clear dome and the cornea's arc. */}
      {eyeDetail > 0 ? (
        <g opacity={eyeDetail}>
          <defs>
            <clipPath id={id("eo")}>
              <path d={path(e.opening, true)} />
            </clipPath>
            <radialGradient id={id("esc")} gradientUnits="userSpaceOnUse" cx={ic.x} cy={ic.y} r={dist(S(e.opening[0]), ic)}>
              <stop offset={0} stopColor={mix(L.bodyLit, L.contourDim, 0.55)} stopOpacity={0.7} />
              <stop offset={1} stopColor={mix(L.body, L.bodyLit, 0.5)} stopOpacity={0.6} />
            </radialGradient>
          </defs>
          {line(e.crease, 0.24)}
          <path d={path(e.opening, true)} fill={url(id, "esc")} />
          <g clipPath={url(id, "eo")}>
            {/* The lid's shadow across the top of the eye. */}
            {macro > 0 ? <path d={path(e.upper)} fill="none" stroke={L.bodyFar} strokeOpacity={0.5 * macro} strokeWidth={0.035 * R} /> : null}
            <ellipse
              cx={ic.x}
              cy={ic.y}
              rx={dist(S(e.iris.side), ic)}
              ry={dist(S(e.iris.top), ic)}
              transform={rotAt(ic)}
              fill={url(id, "ei")}
              stroke={contour}
              strokeOpacity={0.3 * (1 - macro)}
              strokeWidth={hairline * 0.7}
            />
            {macro > 0 ? (
              <g opacity={macro}>
                <ellipse cx={ic.x} cy={ic.y} rx={dist(S(e.iris.side), ic)} ry={dist(S(e.iris.top), ic)} transform={rotAt(ic)} fill={url(id, "eim")} />
                <path d={strokes(e.fibres)} fill="none" stroke={mix(paint.iris, "#FFFFFF", 0.45)} strokeOpacity={0.32} strokeWidth={hairline * 0.55} strokeLinecap="round" />
                <ellipse
                  cx={ic.x}
                  cy={ic.y}
                  rx={dist(S(e.pupil.side), ic)}
                  ry={dist(S(e.pupil.top), ic)}
                  transform={rotAt(ic)}
                  fill={mix(L.bodyFar, "#000000", 0.45)}
                  stroke={mix(paint.iris, L.bodyFar, 0.3)}
                  strokeOpacity={0.6}
                  strokeWidth={hairline * 0.6}
                />
                <ellipse
                  cx={ic.x}
                  cy={ic.y}
                  rx={dist(S(e.iris.side), ic)}
                  ry={dist(S(e.iris.top), ic)}
                  transform={rotAt(ic)}
                  fill="none"
                  stroke={mix(paint.iris, L.bodyFar, 0.6)}
                  strokeWidth={hairline * 1.1}
                />
              </g>
            ) : null}
            {macro > 0 ? <path d={path(e.dome, true)} fill={paint.eye} fillOpacity={0.07 * macro} /> : null}
          </g>
          {line(e.cornea, lerp(0.85, 0.7, macro), hairline * lerp(lerp(0.9, 1.3, hero), 1.1, macro), paint.eye)}
        </g>
      ) : null}

      {/* Lids: the line of the upper lid, its margin and lashes; the lower lid, its wet rim and a few short lashes. */}
      {fine > 0 ? (
        <>
          {line(e.upper, 0.9 * fine, lid)}
          {line(e.lower, lerp(0.4, 0.55, macro) * fine)}
        </>
      ) : null}
      {macro > 0 ? (
        <g opacity={macro} fill="none" strokeLinecap="round">
          {line(e.margin, 0.35, hairline * 0.8)}
          {line(e.waterline, 0.45, hairline * 0.7, paint.eye)}
          <path d={curves(e.lashes)} stroke={contour} strokeOpacity={0.48} strokeWidth={lashW} />
          <path d={curves(e.lowerLashes)} stroke={contour} strokeOpacity={0.35} strokeWidth={lashW * 0.8} />
        </g>
      ) : null}
      {hero > 0 ? line(e.reflection, 0.55 * hero * (1 - 0.45 * macro), hairline * 0.6, paint.eye) : null}

      {/* The light in his eyes: a wide soft bloom, then the point itself. */}
      {hero > 0 ? <circle cx={light.x} cy={light.y} r={0.55 * R} fill={url(id, "eg")} opacity={0.16 * hero * (1 - 0.5 * macro)} /> : null}
      <circle cx={light.x} cy={light.y} r={halo} fill={url(id, "eg")} opacity={lerp(lerp(1, 0.4, hero), 0.42, macro)} />
      {/* A short anamorphic glint, kept well inside the face (and short and dim in the macro shot, below the era lights). */}
      {glint > 0 ? (
        <g transform={`translate(${light.x.toFixed(1)} ${light.y.toFixed(1)})`} opacity={glint * lerp(1, 0.5, hero) * (1 - 0.55 * macro)}>
          <ellipse rx={lerp(clamp(0.07 * R, 2, 0.12 * R), 0.035 * R, macro)} ry={Math.max(0.4, 0.0035 * R * (1 - 0.4 * macro))} fill={url(id, "es")} />
          {macro > 0 ? <ellipse rx={Math.max(0.4, 0.0018 * R)} ry={0.018 * R} fill={url(id, "es")} transform={rotAt({ x: 0, y: 0 })} opacity={0.6 * macro} /> : null}
        </g>
      ) : null}
      {hero > 0
        ? catches.slice(1).map((c, i) => (
            <g key={i} opacity={hero * (1 - 0.25 * macro)}>
              <circle cx={c.x} cy={c.y} r={0.03 * R * (1 - 0.75 * macro)} fill={url(id, "eg")} opacity={0.4} />
              <circle cx={c.x} cy={c.y} r={catchR[i + 1]} fill={paint.eye} />
            </g>
          ))
        : null}
      {/* His career in his eye: seven lights along the cornea's arc in the era accents, a soft additive bloom round a crisp core. */}
      {eras.length ? (
        <>
          <defs>
            {eras.map(({ i, accent }) => (
              <radialGradient key={i} id={id(`ej${i}`)}>
                <stop offset={0} stopColor={accent} stopOpacity={0.85} />
                <stop offset={0.2} stopColor={accent} stopOpacity={0.45} />
                <stop offset={0.5} stopColor={accent} stopOpacity={0.14} />
                <stop offset={1} stopColor={accent} stopOpacity={0} />
              </radialGradient>
            ))}
          </defs>
          <g style={ADD}>
            {eras.map(({ i, c, on, flare }) => (
              <g key={i} opacity={macro * on}>
                <circle cx={c.x} cy={c.y} r={eraR * (6.5 + 4 * flare)} fill={url(id, `ej${i}`)} opacity={Math.min(1, 0.8 + 0.4 * flare)} />
                {flare > 0 ? (
                  <g transform={`translate(${c.x.toFixed(1)} ${c.y.toFixed(1)})`} opacity={flare}>
                    <ellipse rx={eraR * (2 + 8 * flare)} ry={Math.max(0.5, 0.2 * eraR)} fill={url(id, "es")} />
                    <ellipse rx={Math.max(0.5, 0.2 * eraR)} ry={eraR * (1.5 + 4 * flare)} fill={url(id, "es")} transform={rotAt({ x: 0, y: 0 })} />
                  </g>
                ) : null}
              </g>
            ))}
          </g>
          {eras.map(({ i, c, on, flare, accent }) => (
            <g key={i} opacity={macro * on}>
              <circle cx={c.x} cy={c.y} r={eraR} fill={accent} />
              <circle cx={c.x} cy={c.y} r={eraR * (0.5 + 0.2 * flare)} fill={mix(accent, "#FFFFFF", 0.65 + 0.3 * flare)} />
            </g>
          ))}
        </>
      ) : null}
      <circle cx={light.x} cy={light.y} r={lerp(Math.max(0.75, 0.014 * R), catchR[0], hero)} fill={paint.eye} />
    </g>
  );
};
