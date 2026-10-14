// Stadium night: the farewell. A deep sky with four floodlight stars and
// their anamorphic streaks; a glow of floodlit haze over the bowl; the stand
// as a dark mass under a hairline roof edge, seen only through its crowd
// lights; one luminous band where the advertising boards would be. The pitch
// is velvet mowing bands whose seams swing about the vanishing point as the
// camera tracks, bordered by a glowing touchline and its ruler.

import React from "react";
import { clamp, hash } from "../../lib/math";
import { FONTS, PALETTE } from "../../lib/palette";
import { HEIGHT, WIDTH } from "../../lib/timeline";
import { Camera, D0, LINE_WIDTH, LINE_Z, project } from "../../lib/world";
import { defocus, groundRow, hash3, lod, mix, n2, nearGroundZ, onScreen, pxPerM, rowAtElevation, xRangeAt } from "./common";

const N = PALETTE["stadium-night"];
const L = N.light;

/** The advertising boards: a single luminous band standing on the grass. */
export const BOARD = { z: 11, y0: 0.06, y1: 0.15 } as const;
/** The stand: a raked surface beyond the boards, seen only through its crowd lights. */
const STAND = { zFront: 13, zBack: 104, y0: 0.3, rake: 0.16 } as const;
/** The roof edge: an oval bowl in plan around the pitch centre, at constant height. */
const ROOF = { xc: -28, zc: -26, a: 120, b: 134, y: 17.5 } as const;
/** Four floodlight stars on masts beyond the roof: position, brightness and streak length (x frame width). */
const FLOODS = [
  { x: -110, y: 49, z: 260, b: 0.62, streak: 0.62 },
  { x: -60, y: 90, z: 360, b: 1, streak: 1 },
  { x: -18, y: 64, z: 300, b: 0.8, streak: 0.74 },
  { x: 22, y: 105, z: 390, b: 0.92, streak: 0.88 },
] as const;
/** Mowing bands, phased so the contact point sits mid-band. */
const BAND = 5.5;
const BAND_PHASE = BAND / 2;
/** Accent pulses along the board band. They run against the sprint: the band shows time going backwards. */
const PULSE = { spacing: 4.6, v: -2.4, len: 1.5 } as const;

const standY = (z: number) => STAND.y0 + (z - STAND.zFront) * STAND.rake;

type NightProps = { cam: Camera; t: number; id: string; accent: string };

// ---------------------------------------------------------------- roof

/** Depth and screen row of the roof edge seen at screen column sx (the far side of the bowl). */
const roofAt = (cam: Camera, sx: number) => {
  // The ground-plan ray x = cam.x + u z meets the ellipse ((x-xc)/a)^2 + ((z-zc)/b)^2 = 1.
  const u = (sx - cam.cx) / cam.f;
  const dx = cam.x - ROOF.xc;
  const a2 = ROOF.a * ROOF.a;
  const b2 = ROOF.b * ROOF.b;
  const A = (u * u) / a2 + 1 / b2;
  const B = 2 * ((dx * u) / a2 - ROOF.zc / b2);
  const C = (dx * dx) / a2 + (ROOF.zc * ROOF.zc) / b2 - 1;
  const z = (-B + Math.sqrt(Math.max(0, B * B - 4 * A * C))) / (2 * A);
  return { z, y: cam.cy - ((ROOF.y - cam.h) * cam.f) / z };
};

/**
 * The roof edge as a hairline across the frame, a fainter parallel line for
 * its underside, and bezel ticks hanging from it at equal angles around the
 * bowl, like the marks on a dial.
 */
const roofLines = (cam: Camera) => {
  const cols = 28;
  let edge = "";
  let under = "";
  let silhouette = "";
  for (let i = 0; i <= cols; i++) {
    const sx = -40 + ((WIDTH + 80) * i) / cols;
    const r = roofAt(cam, sx);
    const yu = cam.cy - ((ROOF.y - 2.4 - cam.h) * cam.f) / (r.z - 1.5);
    edge += `${i ? "L" : "M"}${n2(sx)} ${n2(r.y)}`;
    under += `${i ? "L" : "M"}${n2(sx)} ${n2(yu)}`;
    silhouette += `${i ? "L" : "M"}${n2(sx)} ${n2(r.y)}`;
  }
  silhouette += `L${WIDTH + 40} ${HEIGHT + 10}L-40 ${HEIGHT + 10}Z`;
  const ticks: string[] = [];
  const majors: string[] = [];
  for (let s = 0; s <= 180; s++) {
    const th = (s / 180) * Math.PI;
    const x = ROOF.xc + Math.cos(th) * ROOF.a;
    const z = ROOF.zc + Math.sin(th) * ROOF.b;
    if (z < 8) continue;
    const p = project(cam, x, ROOF.y, z);
    if (p.x < -20 || p.x > WIDTH + 20 || p.y < -20 || p.y > HEIGHT) continue;
    const major = s % 10 === 0;
    const q = project(cam, x, ROOF.y - (major ? 2.2 : 0.9), z);
    (major ? majors : ticks).push(`M${n2(p.x)} ${n2(p.y)}L${n2(q.x)} ${n2(q.y)}`);
  }
  return { edge, under, silhouette, ticks: ticks.join(""), majors: majors.join("") };
};

// ---------------------------------------------------------------- crowd bokeh

type Disc = { x: number; y: number; r: number; o: number; tone: 0 | 1 | 2; squash: number; rot: number };

/** Lens vignetting: discs towards the frame edge become cat's eyes. */
const catsEye = (x: number, y: number) => {
  const dx = x - WIDTH / 2;
  const dy = y - HEIGHT / 2;
  const d = Math.hypot(dx, dy) / 1100;
  return { squash: 1 - 0.32 * d * d, rot: (Math.atan2(dy, dx) * 180) / Math.PI - 90 };
};

/**
 * Crowd lights in tiers: each tier halves the cell size of the last and fades
 * in only where its lights land far enough apart on screen. A wide shot sees
 * a few hundred metres of stand as sparse discs; the telephoto sees two
 * metres of it, with every light resolved. Brightness is skewed hard: many
 * faint discs, a few hot near-white ones, a scatter of small warm ones.
 */
const crowdDiscs = (cam: Camera, t: number): Disc[] => {
  const out: Disc[] = [];
  const c = STAND.rake * STAND.zFront - STAND.y0 + cam.h;
  const zOfElevation = (e: number) => (e >= STAND.rake ? Infinity : c / (STAND.rake - e));
  const eBottom = (cam.cy - HEIGHT) / cam.f;
  const eTop = cam.cy / cam.f;
  const zMin = Math.max(STAND.zFront, zOfElevation(eBottom - 0.03));
  const zMax = Math.min(STAND.zBack, zOfElevation(eTop + 0.03));
  if (zMin >= zMax) return out;
  const blur = Math.pow(pxPerM(cam) / 250, 0.7);
  for (let lv = 0; lv < 7; lv++) {
    const cell = 8 / Math.pow(2, lv);
    const cellZ = cell * 0.7;
    const j0 = Math.floor((zMin - STAND.zFront) / cellZ);
    const j1 = Math.ceil((zMax - STAND.zFront) / cellZ);
    for (let j = j0; j <= j1; j++) {
      const z = STAND.zFront + (j + 0.5) * cellZ;
      const k = cam.f / z;
      const rBase = 13 * blur * (1 - D0 / z);
      const spacing = Math.sqrt(cell * k * ((cellZ * cam.f * c) / (z * z)));
      const thr = Math.max(58, 4.4 * rBase);
      const fade = lod(spacing, thr * 0.7, thr * 1.3);
      if (fade <= 0) continue;
      const [xa, xb] = xRangeAt(cam, z, rBase * 2 + 40);
      for (let i = Math.floor(xa / cell); i <= Math.ceil(xb / cell); i++) {
        const s = (a: number) => hash3(i, j, lv * 11 + a);
        if (s(1) > 0.6) continue;
        const zz = z + (s(2) - 0.5) * cellZ;
        if (zz < STAND.zFront) continue;
        const x = (i + s(3)) * cell;
        const y = standY(zz) + s(4) * 1.4;
        const p = project(cam, x, y, zz);
        const kind = s(9);
        const hot = kind < 0.05;
        const warm = !hot && kind < 0.1;
        const size = s(5);
        // Warm lights are small and dense; hot ones a touch larger than most.
        const r = rBase * (warm ? 0.45 + 0.35 * size : (0.5 + 1.25 * size * size) * (hot ? 1.15 : 1)) * (1 + 0.15 * lv);
        if (!onScreen(p.x, p.y, r)) continue;
        // Lights at the very back sink behind the roof edge gradually, never popping.
        const underRoof = clamp((p.y - roofAt(cam, p.x).y) / Math.max(4, r));
        if (underRoof <= 0) continue;
        const twinkle = 0.8 + 0.2 * Math.sin(t * (0.8 + 2.6 * s(6)) + 6.283 * s(7));
        const upper = clamp((zz - STAND.zFront) / (STAND.zBack - STAND.zFront));
        const depthFade = (1 - 0.75 * Math.sqrt(upper)) * Math.pow(0.9, lv);
        const level = hot ? 1 : warm ? 0.75 + 0.2 * s(8) : 0.06 + 0.7 * Math.pow(s(8), 2.5);
        const o = Math.min(1, level * fade * twinkle * depthFade * underRoof);
        if (o < 0.015) continue;
        out.push({ x: p.x, y: p.y, r, o, tone: hot ? 2 : warm ? 1 : 0, ...catsEye(p.x, p.y) });
      }
    }
  }
  // Big soft discs first, so the small crisp ones sit on top.
  return out.sort((a, b) => b.r - a.r);
};

/** Pitch-side lights between the boards and the stand: cameras, stewards, the bench. */
const pitchsideDiscs = (cam: Camera, t: number): Disc[] => {
  const out: Disc[] = [];
  const z0 = BOARD.z + 1.4;
  [3.2, 1.6, 0.8, 0.4, 0.2].forEach((cell, lv) => {
    const k = cam.f / z0;
    const fade = lod(cell * k, 70, 130) * (1 - lod(cell * k, 700, 1100));
    if (fade <= 0) return;
    const [xa, xb] = xRangeAt(cam, z0, 60);
    for (let i = Math.floor(xa / cell); i <= Math.ceil(xb / cell); i++) {
      const s = (c: number) => hash3(i, 9, lv * 7 + c);
      if (s(1) > 0.26) continue;
      const z = z0 + (s(2) - 0.5) * 1.6;
      const p = project(cam, (i + s(3)) * cell, 0.3 + 1.2 * s(4), z);
      const r = defocus(cam, z, 15) * (0.6 + 0.8 * s(5));
      if (!onScreen(p.x, p.y, r)) continue;
      const twinkle = 0.85 + 0.15 * Math.sin(t * (1 + 2 * s(6)) + 6.283 * s(7));
      const warm = s(9) < 0.3;
      out.push({ x: p.x, y: p.y, r: warm ? r * 0.6 : r, o: (warm ? 0.7 : 0.1 + 0.35 * s(8)) * fade * twinkle, tone: warm ? 1 : 0, ...catsEye(p.x, p.y) });
    }
  });
  return out;
};

/** Out-of-focus discs, adding light where they overlap. */
const Bokeh: React.FC<{ discs: Disc[]; id: string }> = ({ discs, id }) => (
  <g style={{ mixBlendMode: "screen" }}>
    {discs.map((d, i) => (
      <ellipse
        key={i}
        cx={n2(d.x)}
        cy={n2(d.y)}
        rx={n2(d.r)}
        ry={n2(d.r * d.squash)}
        transform={d.squash < 0.97 ? `rotate(${n2(d.rot)} ${n2(d.x)} ${n2(d.y)})` : undefined}
        fill={`url(#${id}-bk${d.tone})`}
        opacity={n2(d.o)}
      />
    ))}
  </g>
);

/** A bokeh disc: flat inside with a slightly brighter rim and a soft edge, as a real aperture draws it. */
const discGradient = (gid: string, color: string, edge: number) => (
  <radialGradient id={gid}>
    <stop offset={0} stopColor={color} stopOpacity={0.76} />
    <stop offset={0.8} stopColor={color} stopOpacity={0.8} />
    <stop offset={edge} stopColor={color} stopOpacity={0.88} />
    <stop offset={1} stopColor={color} stopOpacity={0} />
  </radialGradient>
);

// ---------------------------------------------------------------- backdrop

export const NightBackdrop: React.FC<NightProps> = ({ cam, t, id, accent }) => {
  const k = pxPerM(cam);
  const roof = roofLines(cam);
  const roofMid = roofAt(cam, WIDTH / 2).y;
  const hazeH = clamp(0.07 * cam.f, 90, 500);
  const discs = crowdDiscs(cam, t);
  // Floodlit air over the bowl: a desaturated glow, so it reads as light in the air, not as a blue band.
  const haze = mix(N.skyHorizon, N.ruler, 0.3);
  // At long lenses the crowd melts into large discs behind his face: pull them
  // towards floodlight white so the jersey stays the only colour on screen.
  const cool = mix(N.bokehCool, N.floodlight, 0.25 + 0.5 * lod(k, 500, 2000));

  // Floodlights, nearest first so the brightest overlap reads.
  const floods = FLOODS.map((f) => ({ ...project(cam, f.x, f.y, f.z), b: f.b, streak: f.streak })).filter(
    (p) => p.y > -160 && p.y < HEIGHT + 160 && p.x > -WIDTH && p.x < 2 * WIDTH,
  );

  // The foot of the stand (its front face) and the strip of ground before the boards.
  const faceTop = project(cam, 0, STAND.y0, STAND.zFront).y;
  const stripBottom = groundRow(cam, BOARD.z);
  const faceFade = 60;

  // The board band: an emissive strip. Its surface brightness is the same at
  // any size; defocus only widens its glow.
  const bTop = project(cam, 0, BOARD.y1, BOARD.z).y;
  const bBot = project(cam, 0, BOARD.y0, BOARD.z).y;
  const bH = Math.max(1, bBot - bTop);
  // The tracking shots keep it crisp; from the freeze on it softens with the rest of the background.
  const blur = defocus(cam, BOARD.z, 12) * lod(k, 300, 600);
  const boardVisible = bBot > -40 && bTop < HEIGHT + 40;
  const kB = cam.f / BOARD.z;
  const glowH = clamp(bH * 0.35 + blur * 3, 8, 70);
  const [ba, bb] = xRangeAt(cam, BOARD.z, 60);
  const pulses: { x0: number; x1: number; o: number }[] = [];
  for (let m = Math.floor((ba - PULSE.v * t) / PULSE.spacing) - 1; m <= Math.ceil((bb - PULSE.v * t) / PULSE.spacing) + 1; m++) {
    if (hash(m * 31 + 5) < 0.15) continue;
    const xc = m * PULSE.spacing + PULSE.v * t + (hash(m * 31 + 7) - 0.5) * 1.2;
    const len = PULSE.len * (0.5 + hash(m * 31 + 6));
    // Each pulse breathes slowly as it travels.
    const o = 0.6 + 0.4 * Math.sin(t * 0.9 + m * 2.1);
    const x0 = project(cam, xc - len / 2, 0, BOARD.z).x;
    const x1 = project(cam, xc + len / 2, 0, BOARD.z).x;
    if (x1 > -20 && x0 < WIDTH + 20) pulses.push({ x0, x1, o });
  }
  const boardTone = mix(N.board, N.line, 0.5);
  const edgeW = clamp(0.012 * kB, 1.3, 3);

  return (
    <g>
      <defs>
        <linearGradient id={`${id}-sky`} gradientUnits="userSpaceOnUse" x1={0} y1={rowAtElevation(cam, 0.6)} x2={0} y2={roofMid}>
          <stop offset={0} stopColor={N.skyTop} />
          <stop offset={0.7} stopColor={N.skyMid} />
          <stop offset={1} stopColor={mix(N.skyMid, N.skyHorizon, 0.7)} />
        </linearGradient>
        <linearGradient id={`${id}-haze`} x1={0} y1={0} x2={0} y2={1}>
          <stop offset={0} stopColor={N.haze} stopOpacity={0} />
          <stop offset={0.75} stopColor={haze} stopOpacity={0.1} />
          <stop offset={1} stopColor={haze} stopOpacity={0.22} />
        </linearGradient>
        <linearGradient id={`${id}-stand`} gradientUnits="userSpaceOnUse" x1={0} y1={roofMid} x2={0} y2={Math.max(roofMid + 1, faceTop)}>
          <stop offset={0} stopColor={mix(N.skyTop, N.skyHorizon, 0.35)} />
          <stop offset={0.25} stopColor={N.skyTop} />
          <stop offset={1} stopColor={mix(N.skyTop, N.skyMid, 0.6)} />
        </linearGradient>
        <linearGradient id={`${id}-face`} gradientUnits="userSpaceOnUse" x1={0} y1={faceTop - faceFade} x2={0} y2={stripBottom}>
          <stop offset={0} stopColor={N.skyTop} stopOpacity={0} />
          <stop offset={clamp(faceFade / Math.max(1, stripBottom - faceTop + faceFade))} stopColor={N.skyTop} />
          <stop offset={1} stopColor={mix(N.skyTop, N.grassFar, 0.8)} />
        </linearGradient>
        {discGradient(`${id}-bk0`, cool, 0.9)}
        {discGradient(`${id}-bk1`, N.bokehWarm, 0.86)}
        <radialGradient id={`${id}-bk2`}>
          <stop offset={0} stopColor={N.floodlight} stopOpacity={0.95} />
          <stop offset={0.86} stopColor={N.floodlight} stopOpacity={0.8} />
          <stop offset={1} stopColor={N.floodlight} stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${id}-fl`}>
          <stop offset={0} stopColor={N.floodlight} stopOpacity={1} />
          <stop offset={0.2} stopColor={N.floodlight} stopOpacity={0.4} />
          <stop offset={1} stopColor={L.glow} stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`${id}-streak`} x1={0} y1={0} x2={1} y2={0}>
          <stop offset={0} stopColor={L.glow} stopOpacity={0} />
          <stop offset={0.5} stopColor={N.floodlight} stopOpacity={1} />
          <stop offset={1} stopColor={L.glow} stopOpacity={0} />
        </linearGradient>
        <linearGradient id={`${id}-bglow`} x1={0} y1={0} x2={0} y2={1}>
          <stop offset={0} stopColor={boardTone} stopOpacity={0} />
          <stop offset={0.5} stopColor={boardTone} stopOpacity={0.16} />
          <stop offset={1} stopColor={boardTone} stopOpacity={0} />
        </linearGradient>
        <linearGradient id={`${id}-bface`} x1={0} y1={0} x2={0} y2={1}>
          <stop offset={0} stopColor={boardTone} stopOpacity={0.5} />
          <stop offset={clamp(6 / bH, 0.04, 0.3)} stopColor={boardTone} stopOpacity={0.24} />
          <stop offset={clamp(30 / bH, 0.3, 0.7)} stopColor={boardTone} stopOpacity={0.1} />
          <stop offset={1} stopColor={boardTone} stopOpacity={0.04} />
        </linearGradient>
        <linearGradient id={`${id}-pulse`} x1={0} y1={0} x2={1} y2={0}>
          <stop offset={0} stopColor={accent} stopOpacity={0} />
          <stop offset={0.5} stopColor={accent} stopOpacity={1} />
          <stop offset={1} stopColor={accent} stopOpacity={0} />
        </linearGradient>
        {blur > 1.2 ? (
          <filter id={`${id}-bblur`} filterUnits="userSpaceOnUse" x={-200} y={bTop - glowH - blur * 4} width={WIDTH + 400} height={bH + 2 * glowH + blur * 8}>
            <feGaussianBlur stdDeviation={n2(blur * 0.6)} />
          </filter>
        ) : null}
      </defs>

      <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill={`url(#${id}-sky)`} />
      <rect x={0} y={roofMid - hazeH} width={WIDTH} height={hazeH + 40} fill={`url(#${id}-haze)`} />

      {floods.map((f, i) => (
        <g key={i} opacity={f.b}>
          <circle cx={n2(f.x)} cy={n2(f.y)} r={150} fill={`url(#${id}-fl)`} opacity={0.08} />
          <rect x={n2(f.x - WIDTH * 0.5 * f.streak)} y={n2(f.y - 1.6)} width={n2(WIDTH * f.streak)} height={3.2} fill={`url(#${id}-streak)`} opacity={0.07} />
          <rect x={n2(f.x - 130 * f.streak)} y={n2(f.y - 0.55)} width={n2(260 * f.streak)} height={1.1} fill={`url(#${id}-streak)`} opacity={0.8} />
          <circle cx={n2(f.x)} cy={n2(f.y)} r={14} fill={`url(#${id}-fl)`} opacity={0.9} />
          <circle cx={n2(f.x)} cy={n2(f.y)} r={1.9} fill={N.floodlight} />
        </g>
      ))}

      {/* The stand: a dark mass under the roof edge. */}
      <path d={roof.silhouette} fill={`url(#${id}-stand)`} />
      <Bokeh discs={discs} id={id} />
      <path d={roof.edge} fill="none" stroke={N.ruler} strokeWidth={1.1} opacity={0.6} />
      <path d={roof.under} fill="none" stroke={N.ruler} strokeWidth={0.8} opacity={0.16} />
      <path d={roof.ticks} fill="none" stroke={N.ruler} strokeWidth={0.9} opacity={0.28} />
      <path d={roof.majors} fill="none" stroke={N.ruler} strokeWidth={1} opacity={0.5} />

      {stripBottom > faceTop - faceFade ? (
        <rect x={0} y={faceTop - faceFade} width={WIDTH} height={stripBottom - faceTop + faceFade + 1} fill={`url(#${id}-face)`} />
      ) : null}
      <Bokeh discs={pitchsideDiscs(cam, t)} id={id} />

      {boardVisible ? (
        <g filter={blur > 1.2 ? `url(#${id}-bblur)` : undefined}>
          <rect x={-10} y={n2(bTop - glowH)} width={WIDTH + 20} height={n2(glowH * 2)} fill={`url(#${id}-bglow)`} />
          <rect x={-10} y={n2(bTop)} width={WIDTH + 20} height={n2(bH)} fill={`url(#${id}-bface)`} />
          {pulses.map((p, i) => (
            <g key={i} opacity={n2(p.o)}>
              <rect x={n2(p.x0)} y={n2(bTop - glowH)} width={n2(Math.max(1, p.x1 - p.x0))} height={n2(glowH * 2)} fill={`url(#${id}-pulse)`} opacity={0.16} />
              <rect x={n2(p.x0)} y={n2(bTop)} width={n2(Math.max(1, p.x1 - p.x0))} height={n2(bH)} fill={`url(#${id}-pulse)`} opacity={0.55} />
              <rect x={n2(p.x0)} y={n2(bTop - edgeW * 0.5)} width={n2(Math.max(1, p.x1 - p.x0))} height={n2(edgeW * 1.6)} fill={`url(#${id}-pulse)`} />
            </g>
          ))}
          <rect x={-10} y={n2(bTop - edgeW / 2)} width={WIDTH + 20} height={n2(edgeW)} fill={N.line} opacity={0.88} />
          <rect x={-10} y={n2(bBot - 0.5)} width={WIDTH + 20} height={1} fill={boardTone} opacity={0.4} />
        </g>
      ) : null}
    </g>
  );
};

// ---------------------------------------------------------------- ground

/**
 * Turf blades just beyond the line, for the ground-level close-up: a few
 * dozen tapered hairlines standing against the lit strip and the board glow.
 * Each blade is one shape, stroked in the contour colour and then filled, so
 * only its outer edge glows.
 */
const blades = (cam: Camera) => {
  const out: string[] = [];
  const zA = LINE_Z + LINE_WIDTH / 2 + 0.012;
  const zB = LINE_Z + 0.5;
  const cell = 0.017;
  const [xa, xb] = xRangeAt(cam, D0, 20);
  for (let i = Math.floor(xa / cell); i <= Math.ceil(xb / cell); i++) {
    const s = (a: number) => hash3(i, 5, 300 + a);
    if (s(0) > 0.72) continue;
    const z = zA + (zB - zA) * Math.pow(s(1), 1.4);
    const x = (i + s(2)) * cell;
    const H = 0.022 + 0.058 * Math.pow(s(3), 2.2);
    // Blades bow over at the top, mostly away from the camera's left.
    const lean = (s(4) - 0.38) * 0.7 * H;
    const b = project(cam, x, 0, z);
    if (b.x < -30 || b.x > WIDTH + 30) continue;
    const tip = project(cam, x + lean, H * (1 - 0.18 * Math.abs(s(4) - 0.38)), z);
    const mid = project(cam, x + lean * 0.12, H * 0.6, z);
    const w = Math.max(0.5, 0.0011 * b.k);
    out.push(`M${n2(b.x - w)} ${n2(b.y)}Q${n2(mid.x - w * 0.8)} ${n2(mid.y)} ${n2(tip.x)} ${n2(tip.y)}Q${n2(mid.x + w * 0.8)} ${n2(mid.y)} ${n2(b.x + w)} ${n2(b.y)}Z`);
  }
  return out.join("");
};

/**
 * The ground from the frame bottom to the foot of the boards (z = BOARD.z);
 * the Backdrop paints the strip beyond. Velvet bands, seams that catch the
 * floodlight towards the line, the ruler, the touchline and its bloom.
 */
export const NightGround: React.FC<Omit<NightProps, "accent">> = ({ cam, id }) => {
  const zBack = BOARD.z;
  const zNear = nearGroundZ(cam);
  if (!(zNear < zBack)) return null;
  const k = pxPerM(cam);
  const top = groundRow(cam, zBack);
  const yLineFar = groundRow(cam, LINE_Z + LINE_WIDTH / 2);
  const yLineNear = groundRow(cam, LINE_Z - LINE_WIDTH / 2);
  const lineH = Math.max(0.9, yLineNear - yLineFar);
  const P = (x: number, z: number) => project(cam, x, 0, z);

  // Mowing bands, their seams, and the mower's nap inside every band.
  const [xa, xb] = xRangeAt(cam, zBack, 10);
  const bandPolys: string[] = [];
  const seams: string[] = [];
  const naps: string[] = [];
  const inView = (a: { x: number }, b: { x: number }) => Math.max(a.x, b.x) > -5 && Math.min(a.x, b.x) < WIDTH + 5;
  for (let n = Math.floor((xa - BAND_PHASE) / BAND) - 1; n <= Math.ceil((xb - BAND_PHASE) / BAND); n++) {
    const x0 = n * BAND + BAND_PHASE;
    const x1 = x0 + BAND;
    if (n % 2 !== 0) {
      const a = P(x0, zNear);
      const b = P(x1, zNear);
      const c = P(x1, zBack);
      const d = P(x0, zBack);
      bandPolys.push(`M${n2(a.x)} ${n2(a.y)}L${n2(b.x)} ${n2(b.y)}L${n2(c.x)} ${n2(c.y)}L${n2(d.x)} ${n2(d.y)}Z`);
    }
    const s0 = P(x0, zNear);
    const s1 = P(x0, zBack);
    if (inView(s0, s1)) seams.push(`M${n2(s0.x)} ${n2(s0.y)}L${n2(s1.x)} ${n2(s1.y)}`);
    for (let q = 1; q < 8; q++) {
      const xq = x0 + (q + (hash3(n, q, 21) - 0.5) * 0.5) * (BAND / 8);
      const u0 = P(xq, zNear);
      const u1 = P(xq, zBack);
      if (inView(u0, u1)) naps.push(`M${n2(u0.x)} ${n2(u0.y)}L${n2(u1.x)} ${n2(u1.y)}`);
    }
  }

  // The ruler on the outer side of the line: a tick every metre and a label
  // every five; half metres and decimetres join only when the frame is tight.
  const zr = LINE_Z + LINE_WIDTH / 2 + 0.05;
  const kR = cam.f / zr;
  const ticks: string[] = [];
  const minor: string[] = [];
  const labels: { x: number; y: number; text: string }[] = [];
  const [ra, rb] = xRangeAt(cam, zr, 40);
  const showHalf = lod(kR, 280, 340);
  const showDeci = lod(kR, 420, 500);
  for (let i = Math.floor(ra * 10); i <= Math.ceil(rb * 10); i++) {
    const is5 = i % 50 === 0;
    const is1 = i % 10 === 0;
    const isHalf = i % 5 === 0;
    if (!is1 && (isHalf ? showHalf : showDeci) <= 0) continue;
    const len = is5 ? 1.05 : is1 ? 0.5 : isHalf ? 0.24 : 0.12;
    const x = i / 10;
    const a = P(x, zr);
    const b = P(x, zr + len);
    (is1 ? ticks : minor).push(`M${n2(a.x)} ${n2(a.y)}L${n2(b.x)} ${n2(b.y)}`);
    if (is5) {
      const at = project(cam, x + 0.06, 0, zr + 1.0);
      labels.push({ x: at.x, y: at.y, text: `${i < 0 ? "−" : ""}${Math.abs(i / 10)}` });
    }
  }
  const rl = P(0, zr);
  const fontSize = clamp(0.06 * kR, 10, 20);

  const blade = k > 900 ? blades(cam) : "";
  const bloomH = Math.max(10, lineH * 7);
  // Seams catch the floodlight towards the line and fade towards the camera.
  const seamTone = mix(N.grassSeam, N.ruler, 0.22);
  const gStop = (y: number) => clamp((y - top) / Math.max(1, HEIGHT - top));

  return (
    <g>
      <defs>
        <linearGradient id={`${id}-gdepth`} gradientUnits="userSpaceOnUse" x1={0} y1={top} x2={0} y2={HEIGHT}>
          <stop offset={0} stopColor={N.haze} stopOpacity={0.08} />
          <stop offset={gStop(yLineFar)} stopColor={N.haze} stopOpacity={0.04} />
          <stop offset={1} stopColor={N.skyTop} stopOpacity={0.55} />
        </linearGradient>
        <linearGradient id={`${id}-sheen`} gradientUnits="userSpaceOnUse" x1={0} y1={top} x2={0} y2={HEIGHT}>
          <stop offset={0} stopColor={N.grassSeam} stopOpacity={0.5} />
          <stop offset={gStop(yLineFar) * 1.4} stopColor={N.grassSeam} stopOpacity={0.3} />
          <stop offset={1} stopColor={N.grassSeam} stopOpacity={0.12} />
        </linearGradient>
        <linearGradient id={`${id}-seam`} gradientUnits="userSpaceOnUse" x1={0} y1={top} x2={0} y2={HEIGHT}>
          <stop offset={0} stopColor={seamTone} stopOpacity={0.35} />
          <stop offset={gStop(yLineFar)} stopColor={mix(seamTone, N.ruler, 0.25)} stopOpacity={0.65} />
          <stop offset={1} stopColor={seamTone} stopOpacity={0.12} />
        </linearGradient>
        <linearGradient id={`${id}-spill`} x1={0} y1={0} x2={0} y2={1}>
          <stop offset={0} stopColor={N.board} stopOpacity={0.12} />
          <stop offset={1} stopColor={N.board} stopOpacity={0.02} />
        </linearGradient>
        <linearGradient id={`${id}-bloom`} x1={0} y1={0} x2={0} y2={1}>
          <stop offset={0} stopColor={L.glow} stopOpacity={0} />
          <stop offset={0.5} stopColor={N.line} stopOpacity={0.5} />
          <stop offset={1} stopColor={L.glow} stopOpacity={0} />
        </linearGradient>
        <linearGradient id={`${id}-brim`} gradientUnits="userSpaceOnUse" x1={0} y1={yLineFar} x2={0} y2={yLineFar - 0.07 * k}>
          <stop offset={0} stopColor={L.contourDim} stopOpacity={0.15} />
          <stop offset={0.6} stopColor={L.contourDim} stopOpacity={0.7} />
          <stop offset={1} stopColor={L.contour} stopOpacity={1} />
        </linearGradient>
      </defs>

      <rect x={0} y={top} width={WIDTH} height={HEIGHT - top} fill={N.grassA} />
      <path d={bandPolys.join("")} fill={N.grassB} />
      {/* Velvet: the stripes mown away from the camera hold more light, most of all at grazing angles. */}
      <path d={bandPolys.join("")} fill={`url(#${id}-sheen)`} />
      <path d={naps.join("")} stroke={`url(#${id}-seam)`} strokeWidth={0.9} opacity={0.42} fill="none" />
      <path d={seams.join("")} stroke={`url(#${id}-seam)`} strokeWidth={1.25} fill="none" />
      <rect x={0} y={top} width={WIDTH} height={HEIGHT - top} fill={`url(#${id}-gdepth)`} />
      <rect x={0} y={top} width={WIDTH} height={Math.max(0, yLineFar - top)} fill={`url(#${id}-spill)`} />

      {/* The touchline: crisp, with bloom. */}
      <rect x={0} y={yLineFar + lineH / 2 - bloomH * 3} width={WIDTH} height={bloomH * 6} fill={`url(#${id}-bloom)`} opacity={0.2} />
      <rect x={0} y={yLineFar + lineH / 2 - bloomH} width={WIDTH} height={bloomH * 2} fill={`url(#${id}-bloom)`} opacity={0.5} />
      <rect x={0} y={yLineFar} width={WIDTH} height={lineH} fill={N.line} />

      {/* Ruler */}
      <path d={`M-10 ${n2(rl.y)}H${WIDTH + 10}`} stroke={N.ruler} strokeWidth={0.8} opacity={0.3} />
      <path d={minor.join("")} stroke={N.ruler} strokeWidth={0.9} opacity={0.5 * Math.max(showDeci, showHalf)} fill="none" />
      <path d={ticks.join("")} stroke={N.ruler} strokeWidth={1.3} opacity={0.9} fill="none" />
      {labels.map((l) => (
        <text key={l.text} x={n2(l.x)} y={n2(l.y)} fontFamily={FONTS.mono} fontSize={n2(fontSize)} fill={N.ruler} opacity={0.85} letterSpacing={0.5}>
          {l.text}
        </text>
      ))}

      {blade ? (
        <g opacity={n2(lod(k, 900, 1400))}>
          <path d={blade} fill="none" stroke={`url(#${id}-brim)`} strokeWidth={clamp(0.0009 * k, 1, 1.8)} strokeLinejoin="round" />
          <path d={blade} fill={mix(N.grassA, L.bodyFar, 0.5)} />
        </g>
      ) : null}
    </g>
  );
};
