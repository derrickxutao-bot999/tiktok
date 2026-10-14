// Scene 1 - Pursuit and reverse flow (0-12 s).
//
// One tracking shot. The 39-year-old sprints after a ball that is drifting
// over the touchline. Every footfall sends a ripple across the grass; on the
// footfalls at frames 250, 320 ... 600 he steps back one era (the user's
// Math.floor(interpolate(frame, [180, 600], [0, eras.length - 1]))), with a
// glitch and a spring in his size. When his toe is 1 cm from the ball the
// picture freezes, the last centimetre is measured, and the frozen frame is
// shuffled through all his eras into white.

import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { EtchedAthlete } from "../components/Athlete";
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
  WhiteOut,
  shuffleWhiteness,
} from "../components/fx";
import { TheTouch } from "../components/TheTouch";
import { ballAt } from "../lib/ball";
import { ERA_SWITCH_FRAMES, eraIndexAt, eraScaleAtT, scene1T } from "../lib/clock";
import { ERAS, Look } from "../lib/eras";
import { scene1FrameToT, stepAt, tToScene1Frame } from "../lib/gait";
import { clamp } from "../lib/math";
import { PALETTE } from "../lib/palette";
import { footfallsBetween, solvePose } from "../lib/rig";
import { FREEZE_SHOT, scene1Shot } from "../lib/shots";
import { S1 } from "../lib/timeline";
import { T_FREEZE, contactPointAt } from "../lib/touch";
import { Camera, D0, project } from "../lib/world";

/** Steps on which the era changes (each is a footfall). */
const ERA_STEPS = new Set(ERA_SWITCH_FRAMES.map((f) => Math.round(stepAt(scene1FrameToT(f)))));
/** The first era's caption comes in once the run is established. */
const FIRST_CAPTION = 24;
const eraStartFrame = (i: number) => (i === 0 ? FIRST_CAPTION : ERA_SWITCH_FRAMES[i - 1]);

const stepStrength = (n: number) => (ERA_STEPS.has(n) ? 1 : 0);

/** Glitch from recent footfalls: a flick on every step, a jolt on era changes. */
const glitchAt = (t: number, look: Look, frame: number) => {
  if (frame >= S1.freeze) return frame < S1.freeze + 5 ? 0.55 * (1 - (frame - S1.freeze) / 5) : 0;
  let g = 0;
  for (const ff of footfallsBetween(t - 0.3, t, look, { scaleAt: eraScaleAtT })) {
    const age = t - ff.t;
    const peak = ERA_STEPS.has(ff.n) ? 0.9 : 0.1;
    const decay = ERA_STEPS.has(ff.n) ? 0.07 : 0.035;
    g = Math.max(g, peak * Math.exp(-age / decay));
  }
  return g;
};

/** How long a chronophotographic echo stays on the pitch, world seconds. */
const ECHO_LIFE = 0.8;

/**
 * Marey's plates: at every footfall the runner leaves a contour of himself,
 * in the era he wore at that instant, held where it happened on the pitch.
 */
const Echoes: React.FC<{ camera: Camera; t: number; look: Look }> = ({ camera, t, look }) => (
  <g>
    {footfallsBetween(t - ECHO_LIFE, t - 1 / 60, look, { scaleAt: eraScaleAtT }).map((ff) => {
      const era = ERAS[eraIndexAt(tToScene1Frame(ff.t))];
      const fade = 1 - (t - ff.t) / ECHO_LIFE;
      return (
        <EtchedAthlete
          key={ff.n}
          pose={solvePose(ff.t, era, { scaleAt: eraScaleAtT })}
          camera={camera}
          idPrefix={`echo${ff.n}`}
          progress={1}
          color={era.accent}
          width={1.4}
          opacity={0.55 * fade * fade}
        />
      );
    })}
  </g>
);

/** The frozen moment as a given era would have lived it (for the shuffle). */
const FrozenEra: React.FC<{ look: Look; id: string }> = ({ look, id }) => (
  <TheTouch
    variant="veteran-39"
    t={T_FREEZE}
    shot={FREEZE_SHOT}
    look={look}
    scaleAt={() => look.scale}
    world="stadium-night"
    idPrefix={id}
  />
);

export const Scene1Pursuit: React.FC = () => {
  const frame = useCurrentFrame();
  const t = scene1T(frame);
  const eraIndex = eraIndexAt(frame);
  const look = ERAS[eraIndex];
  const shot = scene1Shot(frame);
  const night = PALETTE["stadium-night"];

  const frozen = frame >= S1.freeze;
  // The ball's fate (dotted, ending OUT) appears once the ball is in frame.
  const pathOpacity = interpolate(frame, [470, 540, S1.shuffle[0] - 4, S1.shuffle[0]], [0, 0.85, 0.85, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shuffling = frame >= S1.shuffle[0];

  const measure = interpolate(frame, [...S1.measure], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const measureFade = interpolate(frame, [S1.shuffle[0], S1.shuffle[0] + 6], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const main = (
    <TheTouch
      variant="veteran-39"
      t={t}
      shot={shot}
      look={look}
      scaleAt={eraScaleAtT}
      world="stadium-night"
      idPrefix="s1"
      groundOverlay={({ camera }) => (
        <>
          <FootfallPulses
            camera={camera}
            t={t}
            footfalls={footfallsBetween(t - PULSE_LIFE, t, look, { scaleAt: eraScaleAtT })}
            color={look.accent}
            strength={stepStrength}
            idPrefix="s1fp"
          />
          {pathOpacity > 0 ? <BallPath camera={camera} t={t} color={night.light.glow} opacity={pathOpacity} /> : null}
          <Echoes camera={camera} t={t} look={look} />
        </>
      )}
      overlay={({ camera, pose }) => {
        if (!frozen || measure <= 0) return null;
        const toe = project(camera, pose.legs.L.toe.x, pose.legs.L.toe.y);
        const b = ballAt(T_FREEZE);
        const cp = contactPointAt(T_FREEZE);
        const on = project(camera, cp.x, cp.y, b.z);
        return (
          <g opacity={measureFade}>
            <GapMeasure a={toe} b={on} label="1 cm" progress={measure} color={night.light.glow} pxPerM={camera.f / D0} />
          </g>
        );
      }}
    />
  );

  // Before the freeze, every footfall flicks the picture; era changes jolt it.
  const glitch = glitchAt(t, look, frame);
  const shuffleProgress = clamp((frame - S1.shuffle[0]) / (S1.shuffle[1] - S1.shuffle[0]));
  const picture = shuffling ? (
    <FrameShuffle
      direction="out"
      progress={shuffleProgress}
      seed={7}
      layers={[main, ...ERAS.slice(0, ERAS.length - 1).map((e, i) => <FrozenEra key={e.id} look={e} id={`s1sh${i}`} />)]}
    />
  ) : (
    <Glitch amount={glitch} seed={Math.floor(t * 60)}>
      {main}
    </Glitch>
  );

  const captionAge = frame - eraStartFrame(eraIndex);
  const captionOpacity = interpolate(frame, [S1.freeze, S1.freeze + 10], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeIn = interpolate(frame, [0, 24], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // A camera-flash beat on the freeze itself.
  const freezeFlash = frozen ? interpolate(frame, [S1.freeze, S1.freeze + 8], [0.35, 0], { extrapolateRight: "clamp" }) : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: night.skyTop }}>
      <AbsoluteFill style={{ filter: frozen && !shuffling ? "saturate(0.72) contrast(1.08)" : undefined }}>{picture}</AbsoluteFill>
      {captionAge >= 0 && captionOpacity > 0 ? (
        <AbsoluteFill style={{ opacity: captionOpacity }}>
          <EraCaption look={look} age={captionAge} accent={look.accent} />
        </AbsoluteFill>
      ) : null}
      <Vignette strength={0.55 * (1 - (shuffling ? shuffleWhiteness(shuffleProgress, "out") : 0))} />
      <Grain frame={frame} opacity={0.07} />
      {freezeFlash > 0 ? <WhiteOut amount={freezeFlash} /> : null}
      {fadeIn > 0 ? <AbsoluteFill style={{ backgroundColor: "#000", opacity: fadeIn }} /> : null}
      {frame >= S1.white ? <WhiteOut amount={1} /> : null}
    </AbsoluteFill>
  );
};
