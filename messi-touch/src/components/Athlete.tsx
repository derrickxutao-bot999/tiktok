// The figure of light (STYLE.md, "The figure of light").
//
// A dark volume that exists because light touches it. Every part is stroked
// in the contour colour first and filled on top, so only the outer edge of
// the silhouette survives as one continuous luminous line. Edges whose
// normals face the key light (palette rimDir) carry a bright line, the rest a
// dim one, and only the bright edges glow. A rim band of light runs just
// inside the lit edges.
//
// Each limb is shaded across its own width, deep on the side away from the
// light and lifted on the lit side, so arms and legs read as round forms. The
// near leg and arm repeat the contour trick in front of the body; where they
// cross it their lit edge stays on (softer), like an arm held up against
// stained glass, and the rest drops to a faint hairline.
//
// Draw order: far arm, far leg, torso/shorts/shirt/neck/head, midLayer (the
// ball at contact), near leg, near arm.
//
// Eras read at a 34 px head from graphic markers, not hairlines: the grey
// crop and the silver-rimmed beard of 2026 (a tint that hands over to silver
// grain as the head grows), Qatar's gold edge light and larger stars, the
// long swept-back locks of 2006 against the round fringed mop of 2004.
//
// While the touch is on, the near leg (strokes, seams, halos and its glow) is
// clipped to the half-plane behind the toe along the contact direction, so
// the drawn boot ends exactly at the engine's toe (FigureGeo.toeClip).

import React from "react";
import { WorldStyle } from "../lib/eras";
import { Vec2, lerp, smoothstep } from "../lib/math";
import { Pose } from "../lib/rig";
import { Camera } from "../lib/world";
import { mix } from "./athlete/color";
import { EyeDefs, Face } from "./athlete/Face";
import { Fill, Line, Part, Side, buildFigure, bySize } from "./athlete/figure";
import { JerseyDefs, JerseyOverlay, MULTIPLY, stopsOf } from "./athlete/Jersey";
import { paintOf } from "./athlete/paint";

export { AthleteShadow } from "./athlete/Shadow";
export { EtchedAthlete } from "./athlete/Etched";
export { eyePoint } from "./athlete/head";

export type AthleteProps = {
  pose: Pose;
  camera: Camera;
  world: WorldStyle;
  idPrefix: string;
  /** Rendered between the far-side limbs and the near-side limbs (the ball at contact). */
  midLayer?: React.ReactNode;
  /** Strength of the contour glow, 0..1 (default 1). */
  glow?: number;
};

/** Which shading template each fill uses across a limb: a body tone, or a shadow overlay on a kit colour. */
const TEMPLATE: Partial<Record<Fill, string>> = {
  body: "tb",
  far: "tf",
  sleeve: "tv",
  shorts: "tk",
  shortsFar: "tk",
  socks: "tk",
  socksFar: "tk",
  sleeveFar: "tk",
  boot: "to",
  bootFar: "tk",
};
const OVERLAY: ReadonlySet<Fill> = new Set(["shorts", "shortsFar", "socks", "socksFar", "sleeveFar", "bootFar"]);
/** Soles carry the figure-wide falloff instead. */
const SOLE_SHADED: ReadonlySet<Fill> = new Set(["sole", "soleFar"]);

const dot = (a: Vec2, b: Vec2) => a.x * b.x + a.y * b.y;

export const Athlete: React.FC<AthleteProps> = ({ pose, camera, world, idPrefix, midLayer, glow = 1 }) => {
  const g = buildFigure(pose, camera);
  const paint = paintOf(pose.look, world);
  const L = paint.light;
  const look = pose.look;
  const id = (s: string) => `${idPrefix}-ath-${s}`;
  const ref = (s: string) => `#${id(s)}`;
  const url = (s: string) => `url(#${id(s)})`;

  // Line weights in screen px: hairlines, growing a little in close-ups.
  const cw = bySize(g.k, 1.2, 2.3);
  const hw = bySize(g.k, 0.75, 1.35);
  const rim = L.rimDir;
  const rimPx = bySize(g.k, 2.2, 9);
  const box = g.box;
  const boxAttrs = { x: box.x, y: box.y, width: box.w, height: box.h };

  // Light runs across the whole figure from its shadow corner to its lit corner.
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const R = 0.36 * Math.hypot(box.w, box.h);
  const across = { gradientUnits: "userSpaceOnUse" as const, x1: cx - rim.x * R, y1: cy - rim.y * R, x2: cx + rim.x * R, y2: cy + rim.y * R };

  // In the eye close-up the bright kit falls away from the eye, so the eye wins the frame.
  const headR = g.head.radiusPx;
  const focus = smoothstep(130, 220, headR);
  // The push-in to the eye tightens the falloff, so the kit at the frame's edge stays deep while the eye holds the light.
  const focusR = lerp(2.5, 1.3, smoothstep(250, 600, headR)) * headR;
  // Hair and beard: their small-size tone (grey reads as a tint) gives way to the close-up tone.
  const close = smoothstep(70, 220, headR);
  const hairTone = mix(paint.solid.hair, paint.hairClose, close);
  const hd = g.head.at(-0.1, 0.12);
  const eye = g.head.screen(g.head.geo.eye.light);
  const focusFill = focus > 0 ? url("jf") : null;

  const all = [...g.far.parts, ...g.body.parts, ...g.leg.parts, ...g.arm.parts];
  const shaded = all.filter((p) => p.xs && TEMPLATE[p.fill]);

  /** A part's own light: from its shadow edge to its lit edge, across its cross-section. */
  const crossGradient = (p: Part) => {
    const [a, b] = p.xs!;
    const lit = dot(a, rim) >= dot(b, rim) ? a : b;
    const dark = lit === a ? b : a;
    return (
      <linearGradient key={p.id} id={id(`x-${p.id}`)} href={ref(TEMPLATE[p.fill]!)} gradientUnits="userSpaceOnUse" x1={dark.x} y1={dark.y} x2={lit.x} y2={lit.y} />
    );
  };

  const fillOf = (p: Part) => {
    if (p.xs && TEMPLATE[p.fill] && !OVERLAY.has(p.fill)) return url(`x-${p.id}`);
    if (p.fill === "body") return url("bg");
    if (p.fill === "far") return url("fg");
    if (p.fill === "shirt") return url("jp");
    if (p.fill === "hair") return url("hl");
    // Grey shows as a tint while the head is small; up close it is carried by silver grain instead.
    if (p.fill === "beard") return mix(paint.solid.beard, paint.beardClose, close);
    return paint.solid[p.fill as Exclude<Fill, "body" | "far" | "shirt">];
  };

  const paintPart = (p: Part) => (
    <React.Fragment key={p.id}>
      {/* A soft occlusion line where the near sleeve lies on the bright shirt. */}
      {p.fill === "sleeve" ? <use href={ref(p.id)} fill="none" stroke={L.bodyFar} strokeOpacity={0.4} strokeWidth={3 * hw} /> : null}
      {p.fill === "hair" ? (
        // Hair is a graphic shape with its own contour (silver on the grey crop), wide enough to read at a 34 px head.
        <use href={ref(p.id)} fill="none" stroke={paint.hairLine} strokeOpacity={paint.hairLineOpacity} strokeWidth={Math.max(2.4, 2 * hw)} />
      ) : p.fill === "beard" && paint.beardRim ? (
        // The grey full beard: a silver rim round its whole edge.
        <use href={ref(p.id)} fill="none" stroke={paint.beardRim} strokeOpacity={0.7} strokeWidth={Math.max(2.4, 2.2 * hw)} />
      ) : p.seam ? (
        <use href={ref(p.id)} fill="none" stroke={L.contour} strokeOpacity={0.26} strokeWidth={2 * hw} />
      ) : null}
      <use href={ref(p.id)} fill={fillOf(p)} fillOpacity={p.fill === "beard" ? 0.9 : 1} />
      {OVERLAY.has(p.fill) && p.xs ? <use href={ref(p.id)} fill={url(`x-${p.id}`)} /> : null}
      {SOLE_SHADED.has(p.fill) ? <use href={ref(p.id)} fill={url("ks")} /> : null}
      {p.id === "shirt" ? (
        <JerseyOverlay
          g={g}
          paint={paint}
          id={id}
          number={look.kit.number}
          numberColor={look.kit.numberColor}
          collar={look.kit.collar}
          stars={look.kit.stars}
          edge={paint.edge}
          hairline={hw}
          focus={focusFill}
        />
      ) : null}
      {focusFill && (p.fill === "sleeve" || p.fill === "sleeveFar") ? <use href={ref(p.id)} fill={focusFill} style={MULTIPLY} /> : null}
    </React.Fragment>
  );

  // Worn leather shows its sheen and scuffs only up close; at figure scale they would outshine the shirt.
  const wornDetail = look.boot === "worn" ? smoothstep(550, 800, g.k) : 1;
  const paintLines = (lines: Line[], far: boolean) =>
    lines.map((l, i) => {
      const op = far ? 0.45 : 1;
      switch (l.kind) {
        case "sockBand":
          return <path key={i} d={l.d} stroke={paint.sockBand} strokeOpacity={0.85 * op} strokeWidth={Math.min(3, Math.max(1, 0.006 * g.torso.s * g.k))} fill="none" />;
        case "bootSeam":
          // Modern boots carry their accent as a glowing hairline: a core and two soft halos.
          return (
            <g key={i} fill="none" stroke={paint.seamLine} strokeLinecap="round">
              {look.boot === "modern" ? (
                <>
                  <path d={l.d} strokeOpacity={0.1 * op} strokeWidth={hw * 7} />
                  <path d={l.d} strokeOpacity={0.22 * op} strokeWidth={hw * 3} />
                </>
              ) : null}
              <path d={l.d} strokeOpacity={0.9 * op} strokeWidth={hw} />
            </g>
          );
        case "rib":
          return <path key={i} d={l.d} stroke={L.contour} strokeOpacity={0.07 * smoothstep(800, 1100, g.k)} strokeWidth={hw} fill="none" />;
        case "sheen":
          return <path key={i} d={l.d} stroke={L.contour} strokeOpacity={0.35 * wornDetail} strokeWidth={hw * 1.2} fill="none" strokeLinecap="round" />;
        case "lace":
          return <path key={i} d={l.d} stroke={paint.lace} strokeOpacity={0.7} strokeWidth={hw} fill="none" strokeLinecap="round" />;
        case "stitch":
          return <path key={i} d={l.d} stroke={paint.lace} strokeOpacity={0.6} strokeWidth={hw * 0.8} strokeDasharray={`${2.2 * hw} ${2 * hw}`} fill="none" />;
        case "scuff":
          return <path key={i} d={l.d} stroke={L.contour} strokeOpacity={0.3 * wornDetail} strokeWidth={hw * 0.8} fill="none" strokeLinecap="round" />;
        default:
          // Hems: the faintest seam.
          return <path key={i} d={l.d} stroke={L.contour} strokeOpacity={0.16 * op} strokeWidth={hw} fill="none" strokeLinecap="round" />;
      }
    });

  // Contours. Every edge carries a dim line; edges that face the key light
  // carry a bright one: the bright stroke is masked by the silhouette pushed
  // towards the light, which uncovers exactly the edges whose normals face it.
  const lit = 4.5 * cw;
  const toLight = `translate(${(rim.x * lit).toFixed(2)} ${(rim.y * lit).toFixed(2)})`;
  const stroke = (key: string, paintUrl: string, sw: number, opacity = 1, maskId?: string) => (
    <use href={ref(key)} fill="none" stroke={url(paintUrl)} strokeOpacity={opacity} strokeWidth={sw} strokeLinejoin="round" mask={maskId ? url(maskId) : undefined} />
  );

  // A side drawn in front of the body: the full contour where it is against
  // the background; over the body its lit edge stays on at 60 % and the rest
  // is a faint hairline.
  const front = (side: Side, key: string, behind: string, litMask: string, litOnly: string) => (
    <g>
      {stroke(key, "cd", 2 * cw, 1, behind)}
      {stroke(key, "cb", 2 * cw, 0.6, litOnly)}
      {stroke(key, "cb", 2 * cw, 1, litMask)}
      <use href={ref(key)} fill="none" stroke={L.contour} strokeOpacity={0.3} strokeWidth={2 * hw} strokeLinejoin="round" />
      {side.parts.map(paintPart)}
      {paintLines(side.lines, false)}
      <use href={ref(key)} fill={L.contour} fillOpacity={0.2} mask={url(`r${key}`)} />
    </g>
  );

  const rimMask = (key: string) => (
    <mask id={id(`r${key}`)} maskUnits="userSpaceOnUse" {...boxAttrs}>
      <use href={ref(key)} fill="#FFFFFF" />
      <use href={ref(key)} fill="#000000" transform={`translate(${(-rim.x * rimPx).toFixed(2)} ${(-rim.y * rimPx).toFixed(2)})`} />
    </mask>
  );
  /** Visible everywhere except over the given groups. */
  const knockout = (name: string, black: string[]) => (
    <mask id={id(name)} maskUnits="userSpaceOnUse" {...boxAttrs}>
      <rect {...boxAttrs} fill="#FFFFFF" />
      {black.map((k) => (
        <use key={k} href={ref(k)} fill="#000000" />
      ))}
    </mask>
  );
  /** The group's edges that face the light (its silhouette pushed towards the light), minus what lies behind it. */
  const litEdges = (name: string, white: string[], behind: string[]) => (
    <mask id={id(name)} maskUnits="userSpaceOnUse" {...boxAttrs}>
      {white.map((k) => (
        <use key={k} href={ref(k)} fill="#FFFFFF" transform={toLight} />
      ))}
      {behind.map((k) => (
        <use key={k} href={ref(k)} fill="#000000" />
      ))}
    </mask>
  );

  const sleeve = paint.solid.sleeve;
  const toeClip = g.toeClip ? url("tc") : undefined;
  return (
    <g>
      <defs>
        {all.map((p) => (
          <path key={p.id} id={id(p.id)} d={p.d} />
        ))}
        {(
          [
            ["gf", g.far],
            ["gm", g.body],
            ["gl", g.leg],
            ["ga", g.arm],
          ] as const
        ).map(([key, side]) => (
          <g key={key} id={id(key)}>
            {side.parts.map((p) => (
              <use key={p.id} href={ref(p.id)} />
            ))}
          </g>
        ))}
        <linearGradient id={id("cd")} {...across}>
          <stop offset={0} stopColor={L.contourDim} stopOpacity={0.75} />
          <stop offset={1} stopColor={mix(L.contourDim, L.contour, 0.35)} />
        </linearGradient>
        <linearGradient id={id("cb")} {...across}>
          <stop offset={0} stopColor={mix(L.contourDim, L.contour, 0.5)} />
          <stop offset={0.6} stopColor={L.contour} />
        </linearGradient>
        <linearGradient id={id("bg")} {...across}>
          <stop offset={0.15} stopColor={L.body} />
          <stop offset={1} stopColor={L.bodyLit} />
        </linearGradient>
        <linearGradient id={id("fg")} {...across}>
          <stop offset={0.2} stopColor={L.bodyFar} />
          <stop offset={1} stopColor={mix(L.bodyFar, L.body, 0.7)} />
        </linearGradient>
        <linearGradient id={id("ks")} {...across}>
          <stop offset={0} stopColor={L.bodyFar} stopOpacity={0.6} />
          <stop offset={0.6} stopColor={L.bodyFar} stopOpacity={0.2} />
          <stop offset={1} stopColor={L.bodyFar} stopOpacity={0} />
        </linearGradient>
        {/* Templates for the cross-limb shading (each limb points one at its own section). */}
        <linearGradient id={id("tb")}>
          {stopsOf([{ o: 0, c: L.bodyFar }, { o: 0.5, c: L.body }, { o: 0.85, c: L.bodyLit }, { o: 1, c: mix(L.bodyLit, L.contourDim, 0.3) }])}
        </linearGradient>
        <linearGradient id={id("tf")}>
          {stopsOf([{ o: 0, c: mix(L.bodyFar, "#000000", 0.25) }, { o: 0.6, c: L.bodyFar }, { o: 1, c: mix(L.bodyFar, L.body, 0.8) }])}
        </linearGradient>
        <linearGradient id={id("tk")}>
          {stopsOf([{ o: 0, c: L.bodyFar, a: 0.7 }, { o: 0.5, c: L.bodyFar, a: 0.15 }, { o: 0.85, c: L.bodyFar, a: 0 }, { o: 1, c: L.contour, a: 0.1 }])}
        </linearGradient>
        {/* The sleeve is lit like the shirt: deep in the hero's own tone on the shadow side, never brighter than the kit colour. */}
        <linearGradient id={id("tv")}>
          {stopsOf([{ o: 0, c: mix(sleeve, paint.heroDeep, 0.6) }, { o: 0.5, c: mix(sleeve, paint.hero, 0.22) }, { o: 1, c: mix(sleeve, paint.hero, 0.06) }])}
        </linearGradient>
        <linearGradient id={id("to")}>
          {stopsOf([{ o: 0, c: mix(paint.solid.boot, L.bodyFar, 0.6) }, { o: 0.55, c: paint.solid.boot }, { o: 1, c: mix(paint.solid.boot, L.contourDim, 0.22) }])}
        </linearGradient>
        {shaded.map(crossGradient)}
        {/* Multiplied over the kit: white (no change) near the eye, the jersey's own deep tone further out, so it dims without going grey. */}
        {focus > 0 ? (
          <radialGradient id={id("jf")} gradientUnits="userSpaceOnUse" cx={eye.x} cy={eye.y} r={focusR}>
            {stopsOf([{ o: 0.24, c: "#FFFFFF" }, { o: 1, c: mix("#FFFFFF", mix(mix(paint.hero, paint.heroDeep, 0.55), L.bodyFar, 0.55 * smoothstep(250, 600, headR)), focus) }])}
          </radialGradient>
        ) : null}
        {/* Hair is lit like a form: deeper on the shadow side, lifted towards the key light. */}
        <linearGradient
          id={id("hl")}
          gradientUnits="userSpaceOnUse"
          x1={hd.x - rim.x * headR}
          y1={hd.y - rim.y * headR}
          x2={hd.x + rim.x * headR}
          y2={hd.y + rim.y * headR}
        >
          {stopsOf([{ o: 0.1, c: mix(hairTone, L.bodyFar, 0.45) }, { o: 0.55, c: hairTone }, { o: 1, c: mix(hairTone, paint.hairLine, 0.18) }])}
        </linearGradient>
        <JerseyDefs g={g} paint={paint} id={id} rim={rim} />
        <EyeDefs paint={paint} id={id} hasBeard={look.beard !== "none"} />
        {knockout("mb", ["gf", "gm"])}
        {knockout("mbl", ["gf", "gm", "gl"])}
        {litEdges("lb", ["gf", "gm"], [])}
        {litEdges("ll", ["gl"], ["gf", "gm"])}
        {litEdges("la", ["ga"], ["gf", "gm", "gl"])}
        {litEdges("lol", ["gl"], [])}
        {litEdges("loa", ["ga"], [])}
        {rimMask("gm")}
        {rimMask("gl")}
        {rimMask("ga")}
        <clipPath id={id("cn")}>
          <path d={`M${box.x} ${box.y}h${box.w}v${box.h}h${-box.w}Z${g.shirt}`} clipRule="evenodd" />
        </clipPath>
        {/* While the touch is on, the near leg's strokes, seams and halos end exactly at the toe: nothing is drawn past it along the contact normal. */}
        {g.toeClip ? (
          <clipPath id={id("tc")}>
            <path d={g.toeClip.d} clipRule="evenodd" />
          </clipPath>
        ) : null}
        <filter id={id("glow")} filterUnits="userSpaceOnUse" {...boxAttrs} colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation={bySize(g.k, 3, 10)} />
        </filter>
      </defs>

      {glow > 0 ? (
        <g filter={url("glow")} opacity={glow}>
          <g mask={url("lb")}>
            {stroke("gf", "cb", 3 * cw, 0.4)}
            {stroke("gm", "cb", 3 * cw)}
          </g>
          <g clipPath={toeClip}>{stroke("gl", "cb", 3 * cw, 1, "ll")}</g>
          {stroke("ga", "cb", 3 * cw, 1, "la")}
          <use href={ref("shirt")} fill={paint.hero} fillOpacity={0.35 * (1 - 0.6 * focus)} />
          {/* Qatar's gold: the jersey's lit edge glows in the era's edge colour. */}
          {paint.edge ? <use href={ref("shirt")} fill="none" stroke={url("jge")} strokeWidth={4 * cw} strokeOpacity={0.9 * (1 - 0.6 * focus)} /> : null}
        </g>
      ) : null}

      {stroke("gf", "cd", 2 * cw, 0.6)}
      {stroke("gm", "cd", 2 * cw)}
      <g mask={url("lb")}>
        {stroke("gf", "cb", 2 * cw, 0.5)}
        {stroke("gm", "cb", 2 * cw)}
      </g>
      {g.far.parts.map(paintPart)}
      {paintLines(g.far.lines, true)}
      {g.body.parts.map(paintPart)}
      {paintLines(g.body.lines, false)}
      <use href={ref("gm")} fill={L.contour} fillOpacity={0.2} mask={url("rgm")} />
      <Face g={g} paint={paint} id={id} hairline={hw} />

      {midLayer}

      <g clipPath={url("cn")}>
        <g clipPath={toeClip}>{front(g.leg, "gl", "mb", "ll", "lol")}</g>
      </g>
      {front(g.arm, "ga", "mbl", "la", "loa")}
    </g>
  );
};
