// Scene 4 - The fateful touch and eternity (45-60 s).
//
// 45-50 s  Hard cut back to Scene 1's frozen frame: its plate of seven eras
//          settles on the 39-year-old. Time stays frozen while the camera
//          pushes in to his eye, holds, and cuts on his eyeline to his left
//          boot and the ball; then time creeps back, the last centimetre
//          closes, and his toe taps the ball (frame 2985).
// 50-55 s  Same close-up. 15 frames after contact (frame 3000) the variant
//          switches: same camera, same toe, same ball, same instant - and it
//          is the boy's broken shoe on the red dirt of Rosario.
// 55-60 s  One long pull-back. The boy chases the ball into the sunset; the
//          legend's touch is etched in the sky with the sun for a ball.

import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { EtchedAthlete } from "../components/Athlete";
import { SUN } from "../components/env/RosarioDusk";
import { ContactPulse, FrameShuffle, GapMeasure, Grain, Subtitle, Vignette, shuffleWhiteness } from "../components/fx";
import { TheTouch } from "../components/TheTouch";
import { BALL, TOUCH_DIR, ballAt } from "../lib/ball";
import { scene4Speed, scene4T } from "../lib/clock";
import { ERAS, Variant, VARIANT_LOOK } from "../lib/eras";
import { clamp, lerp, smoothstep } from "../lib/math";
import { FONTS, PALETTE } from "../lib/palette";
import { solvePose } from "../lib/rig";
import { scene4Shot } from "../lib/shots";
import { HEIGHT, MATCH_CUT_DISSOLVE, S4, WIDTH } from "../lib/timeline";
import { contactPointAt, gapAt } from "../lib/touch";
import { Camera, D0, Shot, cameraFromShot, project } from "../lib/world";
import { FROZEN_ACCENT, FrozenEra, SHUFFLE_BANDS, SHUFFLE_PLATE, frozenFilter } from "./Frozen";

export const SUBTITLE = "His story is told. The boy is still playing.";

const NIGHT = PALETTE["stadium-night"];
const DUSK = PALETTE["rosario-dusk"];

/** The legend's touch, etched in the sky: the 39-year-old at the instant of contact. */
const LEGEND_POSE = solvePose(0, VARIANT_LOOK["veteran-39"]);
const LEGEND_PX_PER_M = 430;

/** The legend is framed so his toe rests on the sun's lower-left rim, where it met the ball. */
const legendCamera = (dusk: Camera): Camera => {
  const sx = dusk.cx + SUN.az * dusk.f;
  const sy = dusk.cy - SUN.el * dusk.f;
  const r = SUN.r * dusk.f;
  const toe = LEGEND_POSE.legs.L.toe;
  const shot: Shot = {
    lookX: toe.x,
    lookY: toe.y,
    screenX: sx - r * Math.cos(TOUCH_DIR),
    screenY: sy + r * Math.sin(TOUCH_DIR),
    pxPerM: LEGEND_PX_PER_M,
    height: toe.y,
  };
  return cameraFromShot(shot);
};

/** 0 = the 39-year-old's world, 1 = the boy's (a hard step, or a ramp when dissolving). */
const kidMix = (frame: number) =>
  MATCH_CUT_DISSOLVE > 0
    ? clamp((frame - (S4.matchCut - MATCH_CUT_DISSOLVE / 2)) / MATCH_CUT_DISSOLVE)
    : frame >= S4.matchCut
      ? 1
      : 0;

const mixHex = (a: string, b: string, u: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `rgb(${x.map((c, i) => Math.round(lerp(c, y[i], u))).join(",")})`;
};

export const Shot4: React.FC<{ frame: number; variant: Variant; id: string; overlays: boolean }> = ({ frame, variant, id, overlays }) => {
  const t = scene4T(frame);
  const light = PALETTE[variant === "veteran-39" ? "stadium-night" : "rosario-dusk"].light;
  const fade = (a: number, b: number, from: number, to: number) =>
    interpolate(frame, [a, b], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // The 1 cm callout rhymes with Scene 1 on the frozen frame, then returns in the
  // close-up and counts the gap down to 0.0 on contact, where it gives way to the pulse.
  const onFreeze = fade(S4.unshuffle[1], S4.unshuffle[1] + 12, 0, 1) * fade(S4.unshuffle[1] + 30, S4.unshuffle[1] + 44, 1, 0);
  const inCloseup = frame >= S4.toFoot ? fade(S4.toFoot + 10, S4.toFoot + 30, 0, 1) * fade(S4.touch, S4.touch + 8, 1, 0) : 0;
  const measure = Math.max(onFreeze, inCloseup);
  const pulseAge = (frame - S4.touch) / 60;
  return (
    <TheTouch
      variant={variant}
      t={t}
      shot={scene4Shot(frame)}
      accent={variant === "veteran-39" ? FROZEN_ACCENT : undefined}
      idPrefix={id}
      overlay={({ camera, pose }) => {
        if (!overlays) return null;
        const b = ballAt(t);
        const cp = contactPointAt(Math.min(t, 0));
        const on = project(camera, cp.x, cp.y, b.z);
        const toe = project(camera, pose.legs.L.toe.x, pose.legs.L.toe.y);
        const gap = Math.max(0, gapAt(Math.min(t, 0)));
        return (
          <>
            {measure > 0 ? (
              <g opacity={measure}>
                <GapMeasure
                  a={toe}
                  b={on}
                  label={`${(gap * 100).toFixed(1)} cm`}
                  progress={clamp(measure * 1.4)}
                  color={light.glow}
                  pxPerM={camera.f / D0}
                  fontSize={30}
                  idPrefix={`${id}gm`}
                />
              </g>
            ) : null}
            {pulseAge >= 0 && pulseAge < 1.5 ? (
              <ContactPulse
                at={on}
                age={pulseAge}
                color={light.glow}
                size={BALL.r * project(camera, b.x, b.y, b.z).k}
                lightDir={light.rimDir}
                idPrefix={`${id}cp`}
              />
            ) : null}
          </>
        );
      }}
    />
  );
};

/**
 * A chronograph readout while time is held: the world clock counting to the
 * touch and the playback rate. Small and mono, top left, like a mark on a bezel.
 */
const TimeReadout: React.FC<{ frame: number; color: string }> = ({ frame, color }) => {
  const t = scene4T(frame);
  const speed = scene4Speed(frame);
  const opacity = interpolate(frame, [S4.unshuffle[1], S4.unshuffle[1] + 20, S4.matchCut + 50, S4.matchCut + 80], [0, 0.8, 0.8, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (opacity <= 0) return null;
  const sign = t < 0 ? "−" : "+";
  const rate = speed < 1e-3 ? "HELD" : speed > 0.98 ? "1:1" : `1:${Number((1 / speed).toPrecision(2))}`;
  return (
    <div
      style={{
        position: "absolute",
        left: 84,
        top: 196,
        opacity,
        fontFamily: FONTS.mono,
        fontSize: 26,
        letterSpacing: 3,
        color,
        textShadow: `0 0 12px ${color}`,
        whiteSpace: "pre",
      }}
    >
      {`T ${sign}${Math.abs(t).toFixed(4)} s    ${rate}`}
    </div>
  );
};

/** A hard cut straight into Scene 1's plate, which settles on the 39-year-old. */
const unshuffleProgress = (frame: number) => clamp(frame / S4.unshuffle[1]);

export const Scene4TheTouch: React.FC = () => {
  const frame = useCurrentFrame();
  const mix = kidMix(frame);

  let picture: React.ReactNode;
  if (frame < S4.unshuffle[1]) {
    picture = (
      <FrameShuffle
        direction="in"
        progress={unshuffleProgress(frame)}
        seed={7}
        bands={SHUFFLE_BANDS}
        plate={SHUFFLE_PLATE}
        subject={0}
        layers={ERAS.map((e, i) => <FrozenEra key={e.id} look={e} id={`s4sh${i}`} />)}
      />
    );
  } else if (mix > 0 && mix < 1) {
    // Dissolve: both variants on the same camera and clock; only bodies and worlds differ.
    picture = (
      <>
        <Shot4 frame={frame} variant="veteran-39" id="s4a" overlays />
        <AbsoluteFill style={{ opacity: mix }}>
          <Shot4 frame={frame} variant="rosario-kid" id="s4b" overlays />
        </AbsoluteFill>
      </>
    );
  } else {
    picture = <Shot4 frame={frame} variant={mix >= 1 ? "rosario-kid" : "veteran-39"} id="s4" overlays />;
  }

  // The legend is etched into the sky, then the closing line is written.
  const legend = interpolate(frame, [...S4.legend], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const legendOpacity = interpolate(frame, [S4.legend[0], S4.legend[0] + 50], [0, 0.72], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const whiteness = frame < S4.unshuffle[1] ? shuffleWhiteness(unshuffleProgress(frame), "in") : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: mixHex(NIGHT.skyTop, DUSK.skyTop, mix) }}>
      <AbsoluteFill style={{ filter: frozenFilter(1 - smoothstep(S4.resume, S4.resume + 46, frame)) }}>{picture}</AbsoluteFill>
      {legend > 0 ? (
        <AbsoluteFill style={{ mixBlendMode: "screen", opacity: legendOpacity }}>
          <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
            <EtchedAthlete
              pose={LEGEND_POSE}
              camera={legendCamera(cameraFromShot(scene4Shot(frame)))}
              idPrefix="legend"
              progress={legend}
              color={DUSK.sun}
              width={2}
              glow
            />
          </svg>
        </AbsoluteFill>
      ) : null}
      <TimeReadout frame={frame} color={mixHex(NIGHT.light.glow, DUSK.light.glow, mix)} />
      {frame >= S4.subtitle[0] ? <Subtitle text={SUBTITLE} frame={frame - S4.subtitle[0]} y={1400} /> : null}
      <Vignette strength={lerp(0.55, 0.4, mix) * (1 - whiteness)} />
      <Grain frame={frame} opacity={0.07 * (1 - whiteness)} />
    </AbsoluteFill>
  );
};
