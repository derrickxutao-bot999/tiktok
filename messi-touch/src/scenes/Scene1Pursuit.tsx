// Scene 1 - Pursuit and reverse flow (0-12 s).
//
// One tracking shot. The 39-year-old sprints after a ball drifting over the
// touchline. Every footfall rings out across the grass; on the footfalls at
// frames 250, 320 ... 600 he steps back one era (the user's
// Math.floor(interpolate(frame, [180, 600], [0, eras.length - 1]))), with a
// time-slip glitch and a spring in his size, and leaves a contour echo of
// himself behind. When his toe is 1 cm from the ball the picture freezes, the
// last centimetre is measured, and the frozen frame is shuffled through all
// his eras, locks into one figure built from seven eras, and burns to white.

import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { EtchedAthlete } from "../components/Athlete";
import { DetailInset } from "../components/DetailInset";
import {
  BallPath,
  EraCaption,
  FootfallPulses,
  FrameShuffle,
  GapMeasure,
  Glitch,
  Grain,
  PULSE_LIFE,
  Vignette,
  shuffleWhiteness,
} from "../components/fx";
import { TheTouch } from "../components/TheTouch";
import { ballAt } from "../lib/ball";
import { ERA_SWITCH_FRAMES, eraIndexAt, eraScaleAtT, scene1T } from "../lib/clock";
import { ERAS, Look } from "../lib/eras";
import { pelvisXCanonical, scene1FrameToT, stepAt } from "../lib/gait";
import { clamp } from "../lib/math";
import { PALETTE } from "../lib/palette";
import { footfallsBetween, solvePose } from "../lib/rig";
import { FREEZE_SHOT, scene1Shot } from "../lib/shots";
import { S1 } from "../lib/timeline";
import { T_FREEZE, contactPointAt } from "../lib/touch";
import { Camera, D0, cameraFromShot, project } from "../lib/world";
import { FROZEN_ACCENT, FrozenEra, SHUFFLE_BANDS, SHUFFLE_LABEL_COLORS, SHUFFLE_LABELS, SHUFFLE_PLATE, frozenFilter } from "./Frozen";

const NIGHT = PALETTE["stadium-night"];

/** Footfalls on which the era changes, in order; the era of any step follows from them. */
const ERA_STEPS = ERA_SWITCH_FRAMES.map((f) => Math.round(stepAt(scene1FrameToT(f))));
const eraOfStep = (n: number) => ERA_STEPS.filter((s) => n >= s).length;

/** The first era's caption comes in once the run is established. */
const FIRST_CAPTION = 24;
const eraStartFrame = (i: number) => (i === 0 ? FIRST_CAPTION : ERA_SWITCH_FRAMES[i - 1]);
/** The caption's box, kept clear of the stadium's hairlines. */
const CAPTION_SAFE = { x0: 0, y0: 220, x1: 780, y1: 610 };

const stepStrength = (n: number) => (ERA_STEPS.includes(n) ? 1 : 0);

/** Glitch from recent footfalls: a flick on every step, a jolt on era changes. */
const glitchAt = (t: number, look: Look, frame: number) => {
  if (frame >= S1.freeze) return 0;
  let g = 0;
  for (const ff of footfallsBetween(t - 0.3, t, look, { scaleAt: eraScaleAtT })) {
    const strong = ERA_STEPS.includes(ff.n);
    g = Math.max(g, (strong ? 0.9 : 0.1) * Math.exp(-(t - ff.t) / (strong ? 0.07 : 0.035)));
  }
  return g;
};

/** How long an echo lingers, world seconds, and how fast it falls behind on screen (fraction of the run). */
const ECHO_LIFE = 0.85;
const ECHO_LAG = 0.22;

/**
 * Marey's plates: at every footfall the runner leaves a contour of himself in
 * the era he wore at that step. Like a long exposure, the contours fall behind
 * him slower than the pitch does, so the last few eras trail him in a row.
 */
const Echoes: React.FC<{ camera: Camera; t: number; look: Look; opacity: number }> = ({ camera, t, look, opacity }) => (
  <g opacity={opacity}>
    {footfallsBetween(t - ECHO_LIFE, t - 1 / 60, look, { scaleAt: eraScaleAtT }).map((ff) => {
      const era = ERAS[eraOfStep(ff.n)];
      const fade = 1 - (t - ff.t) / ECHO_LIFE;
      const drift = (1 - ECHO_LAG) * (pelvisXCanonical(t) - pelvisXCanonical(ff.t));
      return (
        <EtchedAthlete
          key={ff.n}
          pose={solvePose(ff.t, era, { scaleAt: eraScaleAtT })}
          camera={{ ...camera, x: camera.x - drift }}
          idPrefix={`echo${ff.n}`}
          progress={1}
          color={era.accent}
          width={1.4}
          opacity={0.6 * fade * fade}
        />
      );
    })}
  </g>
);

export const Scene1Pursuit: React.FC = () => {
  const frame = useCurrentFrame();
  const t = scene1T(frame);
  const eraIndex = eraIndexAt(frame);
  const look = ERAS[eraIndex];
  const shot = scene1Shot(frame);
  const frozen = frame >= S1.freeze;
  const shuffling = frame >= S1.shuffle[0];
  const fade = (a: number, b: number, from = 1, to = 0) =>
    interpolate(frame, [a, b], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // On the frozen frame the traces of the run (echoes, rings, the ball's fate)
  // fade away and leave only the measured centimetre.
  const traces = fade(S1.freeze, S1.freeze + 28);
  const pathOpacity = interpolate(frame, [40, 110, 450, S1.freeze, S1.freeze + 4], [0, 0.45, 0.85, 0.85, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const measure = fade(S1.measure[0], S1.measure[1], 0, 1);
  // The DETAIL lens opens quickly and stays until the deck has started turning;
  // the main callout hands its "1 cm" over to the lens as the lens label writes.
  const lens = fade(S1.measure[0] + 2, S1.measure[1] + 2, 0, 1);
  const lensOut = fade(S1.shuffle[0] - 2, S1.shuffle[0] + 4);
  const mainCallout = fade(S1.measure[1] + 2, S1.measure[1] + 10) * lensOut;

  const main = (
    <TheTouch
      variant="veteran-39"
      t={t}
      shot={shot}
      look={look}
      scaleAt={eraScaleAtT}
      world="stadium-night"
      accent={frozen ? FROZEN_ACCENT : look.accent}
      safe={shuffling ? undefined : CAPTION_SAFE}
      idPrefix="s1"
      groundOverlay={({ camera }) => (
        <>
          <g opacity={traces}>
            <FootfallPulses
              camera={camera}
              t={t}
              footfalls={footfallsBetween(t - PULSE_LIFE, t, look, { scaleAt: eraScaleAtT })}
              color={look.accent}
              strength={stepStrength}
              idPrefix="s1fp"
            />
          </g>
          {pathOpacity > 0 ? <BallPath camera={camera} t={t} color={NIGHT.light.glow} opacity={pathOpacity} idPrefix="s1bp" /> : null}
          {traces > 0 ? <Echoes camera={camera} t={t} look={look} opacity={traces} /> : null}
        </>
      )}
      overlay={({ camera, pose }) => {
        if (!frozen || measure <= 0 || mainCallout <= 0) return null;
        const toe = project(camera, pose.legs.L.toe.x, pose.legs.L.toe.y);
        const cp = contactPointAt(T_FREEZE);
        const on = project(camera, cp.x, cp.y, ballAt(T_FREEZE).z);
        return (
          <g opacity={mainCallout}>
            <GapMeasure a={toe} b={on} label="1 cm" progress={measure} color={NIGHT.light.glow} pxPerM={camera.f / D0} fontSize={30} idPrefix="s1gm" />
          </g>
        );
      }}
    />
  );

  const shuffleProgress = clamp((frame - S1.shuffle[0]) / (S1.shuffle[1] - S1.shuffle[0]));
  const picture = shuffling ? (
    <FrameShuffle
      direction="out"
      progress={shuffleProgress}
      seed={7}
      bands={SHUFFLE_BANDS}
      plate={SHUFFLE_PLATE}
      labels={SHUFFLE_LABELS}
      labelColors={SHUFFLE_LABEL_COLORS}
      subject={ERAS.length - 1}
      layers={ERAS.map((e, i) => (i === ERAS.length - 1 ? main : <FrozenEra key={e.id} look={e} id={`s1sh${i}`} />))}
    />
  ) : (
    <Glitch amount={glitchAt(t, look, frame)} seed={Math.floor(t * 60)}>
      {main}
    </Glitch>
  );

  const captionAge = frame - eraStartFrame(eraIndex);
  const captionOpacity = fade(S1.freeze, S1.freeze + 10);
  const fadeIn = fade(0, 10, 0.45, 0);
  // A camera-flash beat on the freeze itself: the picture over-exposes for a
  // moment (darks stay dark) and light blooms from the 1 cm gap.
  const flash = frozen ? fade(S1.freeze, S1.freeze + 10, 1, 0) : 0;
  const gapAt = project(cameraFromShot(FREEZE_SHOT), contactPointAt(T_FREEZE).x, contactPointAt(T_FREEZE).y);
  const whiteness = shuffling ? shuffleWhiteness(shuffleProgress, "out") : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: NIGHT.skyTop }}>
      <AbsoluteFill style={{ filter: [frozenFilter(frozen ? 1 : 0), flash > 0 ? `brightness(${(1 + 0.9 * flash).toFixed(3)})` : ""].join(" ").trim() || undefined }}>
        {picture}
      </AbsoluteFill>
      {frozen && lensOut > 0 ? (
        <DetailInset
          t={T_FREEZE}
          shot={FREEZE_SHOT}
          look={look}
          scaleAt={eraScaleAtT}
          world="stadium-night"
          accent={FROZEN_ACCENT}
          progress={lens}
          opacity={lensOut}
          color={NIGHT.light.glow}
          idPrefix="s1detail"
        />
      ) : null}
      {captionAge >= 0 && captionOpacity > 0 ? (
        <AbsoluteFill style={{ opacity: captionOpacity }}>
          <EraCaption look={look} age={captionAge} accent={look.accent} />
        </AbsoluteFill>
      ) : null}
      <Vignette strength={0.55 * (1 - whiteness)} />
      <Grain frame={frame} opacity={0.07 * (1 - whiteness)} />
      {flash > 0 ? (
        <AbsoluteFill
          style={{
            mixBlendMode: "screen",
            opacity: flash,
            background: `radial-gradient(circle at ${gapAt.x}px ${gapAt.y}px, rgba(235,246,255,0.95) 0px, rgba(150,205,255,0.35) 90px, rgba(0,0,0,0) 420px)`,
          }}
        />
      ) : null}
      {fadeIn > 0 ? <AbsoluteFill style={{ backgroundColor: "#000", opacity: fadeIn }} /> : null}
    </AbsoluteFill>
  );
};
