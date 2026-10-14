// The frozen frame as a deck of time on a light table, after Marey's plates.
//
// 'out' (the end of Scene 1): hairline cuts are drawn across the intact
// frame. Band by band the deck turns over to the same instant in other eras,
// each look held long enough to read (three frames at least), the rhythm
// quickening a little. Every turn is a slip: the new strip lands a few
// pixels off and registers. Then the deck locks, top to bottom, into the
// PLATE (band i shows layer plate[i]): one figure built from every era, from
// the oldest head to the youngest feet. It holds, still and fully legible,
// for about a quarter of the transition. Then the cuts open: each seam widens
// into a band of light that eats the strips from both sides, its halation
// bleeding over what is left, until the frame is pure white.
//
// 'in' (the start of Scene 4) opens on the plate itself, holds, shuffles
// with the rhythm slowing, locks band by band onto the subject, and the cuts
// heal: the frame is the subject, intact, by the end.
//
// Swaps are scheduled on whole frames of the transition (`duration`), so a
// look is never shorter than MIN_HOLD frames whatever the progress curve.
// Light is only ever added (plus-lighter), so the burn is an overexposure,
// never a grey wipe. Each layer renders once at most per frame: bands that
// show the same layer at the same offset share one render, clipped to the
// union of their rectangles; an intact frame is a single unclipped render.

import React from "react";
import { AbsoluteFill } from "remotion";
import { clamp, easeInOutSine, easeOutCubic, hash2, smoothstep } from "../../lib/math";
import { FONTS, PALETTE } from "../../lib/palette";
import { HEIGHT, WIDTH } from "../../lib/timeline";
import { mixHex, rgba } from "./util";

export type FrameShuffleProps = {
  /** Full-frame renders of the same instant. */
  layers: React.ReactNode[];
  /** 0..1 */
  progress: number;
  direction: "out" | "in";
  /** Number of equal horizontal bands when `bands` is not given. */
  strips?: number;
  /** Band edges in screen px, ascending, first 0 and last 1920 (overrides `strips`). */
  bands?: number[];
  /** For each band, the layer it shows in the composed plate. Defaults to the layers spread top to bottom. */
  plate?: number[];
  /** The layer that is intact at the calm end ('out' start, 'in' end). Default 0. */
  subject?: number;
  /** Length of the transition in frames; swaps land on whole frames. Default 34 for 'out', 26 for 'in'. */
  duration?: number;
  /** Per band, a small mono annotation set in the right margin while the plate holds (null for none). */
  labels?: (string | null | undefined)[];
  seed: number;
  /** The light behind the deck, seams and burn. */
  light?: string;
  /** Colour of the light table's glow; the table is a faint wash of it until the burn turns it to `light`. */
  tint?: string;
  /** The darkness the faint table is mixed from (the world's night). */
  dark?: string;
};

// Each direction runs on its own clock, as fractions of the transition.
const OUT = {
  /** The hairline cuts are drawn across the intact frame. */
  cut: [0, 0.07] as const,
  /** First turns (each band staggered by up to STAGGER - 1 frames). */
  shuffle: 0.06,
  /** Locked into the plate; bands lock top to bottom over the STAGGER frames up to here. */
  lock: 0.41,
  /** Seams start to open somewhere in this window... */
  burn: [0.7, 0.78] as const,
  /** ...have eaten every band here... */
  eaten: 0.95,
  /** ...and the frame is pure white from here (the last frame of a 34-frame 'out' is 33/34 = 0.97). */
  white: 0.96,
};
const IN = {
  /** The plate holds until here; then the bands start to turn (staggered). */
  shuffle: 0.19,
  /** Every band is back on the subject; they lock top to bottom over the STAGGER frames up to here. */
  lock: 0.81,
  /** The cuts withdraw. */
  heal: [0.8, 0.92] as const,
};
const DEFAULT_DURATION = { out: 34, in: 26 } as const;
/** No look is held for fewer frames than this. */
const MIN_HOLD = 3;
const STAGGER = 3;
/** Holds per turn, frames: 'out' quickens a little, 'in' slows a little. */
const holdOut = (k: number) => (k < 2 ? 4 : 3);
const holdIn = (k: number) => (k < 3 ? 3 : 4);
/** A turn's slip, as a fraction of the width, and the frames it takes to register. */
const SLIP = [0.018, 0.045] as const;
const SETTLE = 2.2;
const HAIR = 1.25;

type Turn = { f: number; layer: number; k: number; lock: boolean };

/** Every look band b shows through the transition, on whole frames. */
const scheduleFor = (b: number, n: number, dir: "out" | "in", D: number, nLayers: number, subject: number, target: number, seed: number): Turn[] => {
  const first = dir === "out" ? subject : target;
  const last = dir === "out" ? target : subject;
  const turns: Turn[] = [{ f: -Infinity, layer: first, k: 0, lock: false }];
  const cascade = n > 1 ? Math.round(((STAGGER - 1) * b) / (n - 1)) : 0;
  const lockF = Math.round((dir === "out" ? OUT.lock : IN.lock) * D) - (STAGGER - 1) + cascade;
  const hold = dir === "out" ? holdOut : holdIn;
  let f = Math.round((dir === "out" ? OUT.shuffle : IN.shuffle) * D) + Math.floor(hash2(seed, b * 5 + 1) * STAGGER);
  let cur = first;
  let k = 0;
  while (nLayers > 1 && f + MIN_HOLD <= lockF) {
    const final = f + hold(k) + MIN_HOLD > lockF;
    // Any layer but the one showing, and the last look before the lock is never the lock's own layer.
    const options = Array.from({ length: nLayers }, (_, i) => i).filter((i) => i !== cur && !(final && i === last && nLayers > 2));
    const pick = options[Math.floor(hash2(seed + (k + 1) * 31, b * 3 + 7) * options.length)];
    k++;
    turns.push({ f, layer: pick, k, lock: false });
    cur = pick;
    f += hold(k - 1);
  }
  if (cur !== last) turns.push({ f: lockF, layer: last, k: k + 1, lock: true });
  return turns;
};

type BandState = { layer: number; dx: number; flash: number; lock: number; turned: number; locked: number };

/** What band b shows at frame position fp (continuous). */
const bandAt = (turns: Turn[], b: number, h: number, fp: number, seed: number): BandState => {
  let i = 0;
  while (i + 1 < turns.length && turns[i + 1].f <= fp + 1e-6) i++;
  const t = turns[i];
  const lockTurn = turns[turns.length - 1].lock ? turns[turns.length - 1].f : Infinity;
  const firstTurn = turns.length > 1 ? turns[1].f : Infinity;
  if (!Number.isFinite(t.f)) return { layer: t.layer, dx: 0, flash: 0, lock: 0, turned: fp - firstTurn, locked: fp - lockTurn };
  const df = fp - t.f;
  // The slip: neighbours land opposite ways, alternating turn by turn.
  const side = (b + t.k) % 2 === 0 ? -1 : 1;
  // Tall bands (sky, ground) are heavier and slip less.
  const mag = WIDTH * (SLIP[0] + (SLIP[1] - SLIP[0]) * hash2(seed + t.k * 17, b + 40)) * (t.lock ? 1.2 : 1) * Math.min(1, Math.sqrt(150 / Math.max(1, h)));
  return {
    layer: t.layer,
    dx: side * mag * (1 - easeOutCubic(clamp(df / SETTLE))),
    flash: Math.pow(clamp(1 - df / (t.lock ? 4 : 3)), 2) * (t.lock ? 1 : 0.6),
    lock: t.lock ? 1 : 0,
    turned: fp - firstTurn,
    locked: fp - lockTurn,
  };
};

/** How far the light has opened at seam s on the 'out' clock (0 closed, 1 met the next seam). */
const openingAt = (s: number, p: number, seed: number) => {
  const p0 = OUT.burn[0] + (OUT.burn[1] - OUT.burn[0]) * hash2(seed + 3, s * 7 + 2);
  const u = clamp((p - p0) / (OUT.eaten - p0));
  // Accelerating: a crack, then the light pours through.
  return u * u;
};

/** Burn strength on the 'out' clock: drives the exposure, the halation and the light table's colour. */
const burnAt = (p: number) => smoothstep(OUT.burn[0], OUT.eaten, p);

/** How white the deck is (0 intact, 1 white): for dimming what sits above it, such as the vignette and grain. */
export const shuffleWhiteness = (progress: number, direction: "out" | "in"): number => {
  // 'in' opens on the plate, never on white.
  if (direction === "in") return 0;
  const p = clamp(progress);
  if (p >= OUT.white) return 1;
  // The mean share of the frame the light has eaten, for seams opening evenly through the burn window...
  let eaten = 0;
  for (let i = 0; i < 8; i++) {
    const p0 = OUT.burn[0] + ((OUT.burn[1] - OUT.burn[0]) * (i + 0.5)) / 8;
    eaten += Math.pow(clamp((p - p0) / (OUT.eaten - p0)), 2);
  }
  eaten /= 8;
  // ...plus the halation and exposure over what is left.
  return clamp(eaten + 0.35 * burnAt(p) * (1 - eaten));
};

const edgesFor = (bands: number[] | undefined, strips: number): number[] => {
  if (bands && bands.length >= 2) {
    const e = bands.map((y) => clamp(y, 0, HEIGHT));
    e[0] = 0;
    e[e.length - 1] = HEIGHT;
    for (let i = 1; i < e.length; i++) e[i] = Math.max(e[i], e[i - 1]);
    return e;
  }
  const n = Math.max(1, Math.round(strips));
  return Array.from({ length: n + 1 }, (_, s) => Math.round((s * HEIGHT) / n));
};

/** Rectangles [top, bottom] as one clip path, adjacent ones merged; null when they cover the frame. */
const clipFor = (rects: [number, number][]): string | null => {
  const sorted = [...rects].sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const r of sorted) {
    const m = merged[merged.length - 1];
    if (m && r[0] <= m[1] + 0.01) m[1] = Math.max(m[1], r[1]);
    else merged.push([r[0], r[1]]);
  }
  if (merged.length === 1 && merged[0][0] <= 0 && merged[0][1] >= HEIGHT) return null;
  return `path('${merged.map(([a, b]) => `M0 ${a.toFixed(1)}H${WIDTH}V${b.toFixed(1)}H0Z`).join("")}')`;
};

export const FrameShuffle: React.FC<FrameShuffleProps> = ({
  layers,
  progress,
  direction,
  strips = 9,
  bands,
  plate,
  subject = 0,
  duration,
  labels,
  seed,
  light = "#F6FAFF",
  tint = PALETTE["stadium-night"].light.glow,
  dark = PALETTE["stadium-night"].skyTop,
}) => {
  const out = direction === "out";
  const p = clamp(progress);
  if (out && p >= OUT.white) return <AbsoluteFill style={{ backgroundColor: "#FFFFFF" }} />;
  const L = Math.max(1, layers.length);
  const sub = clamp(Math.round(subject), 0, L - 1);
  const edges = edgesFor(bands, strips);
  const n = edges.length - 1;
  const target = (b: number) => {
    const v = plate?.[b];
    return v === undefined ? (n > 1 ? Math.round((b * (L - 1)) / (n - 1)) : sub) : clamp(Math.round(v), 0, L - 1);
  };
  const D = Math.max(4, duration ?? DEFAULT_DURATION[direction]);
  const fp = p * D;

  const deck = Array.from({ length: n }, (_, b) => bandAt(scheduleFor(b, n, direction, D, L, sub, target(b), seed), b, edges[b + 1] - edges[b], fp, seed));

  // The burn ('out' only): band b is eaten from its top edge by seam b and from its bottom edge by seam b + 1.
  const burn = out ? burnAt(p) : 0;
  const opening = Array.from({ length: n + 1 }, (_, s) => (out ? openingAt(s, p, seed) : 0));
  const eatTop = deck.map((_, b) => (out ? 0.5 * (edges[b + 1] - edges[b]) * opening[b] : 0));
  const eatBot = deck.map((_, b) => (out ? 0.5 * (edges[b + 1] - edges[b]) * opening[b + 1] : 0));

  // The hairline cuts: drawn across at the start of 'out', withdrawn at the end of 'in'.
  const cut = out ? easeInOutSine(clamp((p - OUT.cut[0]) / (OUT.cut[1] - OUT.cut[0]))) : 1 - easeInOutSine(clamp((p - IN.heal[0]) / (IN.heal[1] - IN.heal[0])));

  // One render per (layer, offset), clipped to the union of its bands.
  const groups = new Map<string, { layer: number; dx: number; rects: [number, number][] }>();
  deck.forEach((st, b) => {
    const top = edges[b] + eatTop[b];
    const bottom = edges[b + 1] - eatBot[b];
    if (bottom - top < 0.5) return;
    const dx = Math.round(st.dx * 2) / 2;
    const key = `${st.layer}:${dx}`;
    const g = groups.get(key) ?? { layer: st.layer, dx, rects: [] };
    g.rects.push([top, bottom]);
    groups.set(key, g);
  });

  // The light table: a faint wash of the world's light behind a slipped strip, white-hot in the burn.
  const faint = mixHex(dark, tint, 0.3);
  const lightTable = mixHex(burn < 0.5 ? mixHex(faint, light, smoothstep(0, 0.5, burn)) : light, "#FFFFFF", smoothstep(0.85, 1, burn));
  // Highlights in what is left of the picture flare as the light takes over.
  const exposure = burn > 0.001 ? `brightness(${(1 + 0.6 * burn).toFixed(3)}) contrast(${(1 + 0.35 * burn).toFixed(3)})` : undefined;
  // Halation: how far each seam's glow bleeds over the strips, px.
  const bleed = 7 + 120 * smoothstep(0, 0.8, burn);
  const glow = 0.1 + 0.75 * burn;

  // How much of the plate is on show (registration marks and labels): after the lock in 'out', before the turns in 'in'.
  const plateK = (st: BandState) =>
    out ? clamp((st.locked + 0.5) / 4) * (1 - smoothstep(OUT.burn[0] - 0.02, OUT.burn[0] + 0.04, p)) : 1 - clamp((st.turned + 1) / 3);
  const plateAll = deck.reduce((m, st) => Math.min(m, plateK(st)), 1);

  return (
    <AbsoluteFill style={{ backgroundColor: lightTable }}>
      <AbsoluteFill style={{ filter: exposure }}>
        {[...groups.values()].map((g) => {
          const clip = clipFor(g.rects);
          const inner = g.dx === 0 ? layers[g.layer] : <AbsoluteFill style={{ transform: `translateX(${g.dx}px)` }}>{layers[g.layer]}</AbsoluteFill>;
          return (
            <AbsoluteFill key={`${g.layer}:${g.dx}`} style={clip ? { clipPath: clip } : undefined}>
              {inner}
            </AbsoluteFill>
          );
        })}
      </AbsoluteFill>

      {/* Everything below only adds light. */}
      <AbsoluteFill style={{ mixBlendMode: "plus-lighter", pointerEvents: "none" }}>
        {edges.map((y, s) => {
          const edge = s === 0 || s === n;
          const up = s > 0 ? eatBot[s - 1] : 0;
          const down = s < n ? eatTop[s] : 0;
          if (edge && up + down <= 0.5) return null;
          // Cuts are drawn alternately from either side.
          const w = edge || up + down > 0.5 ? WIDTH : WIDTH * clamp(cut * 1.15 - ((s - 1) % 3) * 0.05);
          if (w <= 0.5) return null;
          const left = s % 2 === 1 ? 0 : WIDTH - w;
          const top = y - up - (edge ? 0 : HAIR / 2);
          const core = up + down + (edge ? 0 : HAIR);
          // A hairline of light during the shuffle and the plate; a band of it in the burn.
          const coreO = up + down > 1 ? 1 : 0.5 + 0.15 * plateAll + 0.35 * burn;
          return (
            <React.Fragment key={`seam${s}`}>
              <div style={{ position: "absolute", top, height: core, left, width: w, background: light, opacity: coreO }} />
              {/* The bleed: a steep falloff with a long faint tail, above and below the band. */}
              {[-1, 1].map((dir) => {
                if ((dir < 0 && s === 0) || (dir > 0 && s === n)) return null;
                return (
                  <div
                    key={dir}
                    style={{
                      position: "absolute",
                      top: dir < 0 ? top - bleed : top + core,
                      height: bleed,
                      left,
                      width: w,
                      // White at the band, the world's tint in the falloff: the edge of a burn is coloured light, never grey.
                      background: `linear-gradient(${dir < 0 ? 0 : 180}deg, ${rgba(light, glow)}, ${rgba(tint, glow * 0.55)} 14%, ${rgba(tint, glow * 0.2)} 48%, ${rgba(tint, 0)})`,
                    }}
                  />
                );
              })}
            </React.Fragment>
          );
        })}

        {deck.map((st, b) => {
          const top = edges[b] + eatTop[b];
          const bottom = edges[b + 1] - eatBot[b];
          if (bottom - top < 0.5) return null;
          const marks: React.ReactNode[] = [];
          // The picture's own end, caught in the light where the strip has slipped aside.
          if (Math.abs(st.dx) > 1) {
            const right = st.dx < 0;
            const x = right ? WIDTH + st.dx : st.dx;
            marks.push(
              <div
                key={`end${b}`}
                style={{
                  position: "absolute",
                  top,
                  height: bottom - top,
                  left: right ? x - 30 : x,
                  width: 30,
                  background: `linear-gradient(${right ? 270 : 90}deg, ${rgba(light, 0.75)}, ${rgba(light, 0.2)} 20%, ${rgba(light, 0)})`,
                }}
              />,
            );
          }
          // A strip that has just landed catches the light along its edges; a lock rings brighter.
          if (st.flash > 0.02) {
            marks.push(
              <div key={`fa${b}`} style={{ position: "absolute", left: 0, width: WIDTH, top, height: 1.5, background: light, opacity: 0.75 * st.flash }} />,
              <div key={`fb${b}`} style={{ position: "absolute", left: 0, width: WIDTH, top: bottom - 1.5, height: 1.5, background: light, opacity: 0.45 * st.flash }} />,
            );
          }
          // The plate's annotations: registration ticks in both margins, and the band's label.
          const k = plateK(st);
          if (k > 0.01 && b > 0) {
            marks.push(
              ...[36, WIDTH - 36].map((x) => (
                <div key={`tk${b}-${x}`} style={{ position: "absolute", left: x - 0.75, width: 1.5, top: edges[b] - 7, height: 14, background: light, opacity: 0.7 * k }} />
              )),
            );
          }
          const label = labels?.[b];
          if (label && k > 0.01) {
            marks.push(
              <div
                key={`lb${b}`}
                style={{
                  position: "absolute",
                  right: 56,
                  top: (edges[b] + edges[b + 1]) / 2 - 12,
                  height: 24,
                  lineHeight: "24px",
                  fontFamily: FONTS.mono,
                  fontSize: 17,
                  letterSpacing: "0.24em",
                  color: light,
                  opacity: 0.72 * k,
                  whiteSpace: "pre",
                  textShadow: `0 0 8px ${rgba(tint, 0.6)}`,
                }}
              >
                {label}
              </div>,
            );
          }
          return marks;
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
