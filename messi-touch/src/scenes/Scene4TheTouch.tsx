// Scene 4 - The fateful touch and eternity (45-60 s).
//
// 45-50 s  Cut back to Scene 1's frozen frame; the strips settle on the
//          39-year-old. Time stays frozen while the camera drifts up to his
//          eyes and down to his left boot; then time creeps back, the last
//          centimetre closes, and his toe taps the ball (frame 2985).
// 50-55 s  Same close-up. 15 frames after contact (frame 3000) the variant
//          switches: same camera, same toe, same ball, same instant - and it
//          is the boy's broken shoe on the red dirt of Rosario.
// 55-60 s  The camera opens out and pulls back. The boy chases the ball
//          into the sunset; the legend is etched in the sky.

import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { EtchedAthlete } from "../components/Athlete";
import { ContactPulse, FrameShuffle, GapMeasure, Grain, Subtitle, Vignette, shuffleWhiteness } from "../components/fx";
import { TheTouch } from "../components/TheTouch";
import { BALL, ballAt } from "../lib/ball";
import { scene4Speed, scene4T } from "../lib/clock";
import { ERAS, Variant, VARIANT_LOOK } from "../lib/eras";
import { clamp, smoothstep } from "../lib/math";
import { FONTS, PALETTE } from "../lib/palette";
import { solvePose } from "../lib/rig";
import { FREEZE_SHOT, scene4Shot } from "../lib/shots";
import { HEIGHT, MATCH_CUT_DISSOLVE, S4, WIDTH } from "../lib/timeline";
import { T_FREEZE, contactPointAt, gapAt } from "../lib/touch";
import { D0, cameraFromShot, project, Shot } from "../lib/world";

export const SUBTITLE = "His story is told. The boy is still playing.";

/** The legend's touch, etched in the sky: the 39-year-old at the instant of contact, drawn huge and faint. */
const LEGEND_POSE = solvePose(0, VARIANT_LOOK["veteran-39"]);
const LEGEND_SHOT: Shot = {
  lookX: LEGEND_POSE.pelvis.x + 0.3,
  lookY: LEGEND_POSE.pelvis.y,
  screenX: 540,
  screenY: 520,
  pxPerM: 640,
  height: LEGEND_POSE.pelvis.y,
};

export const Shot4: React.FC<{ frame: number; variant: Variant; id: string; overlays: boolean }> = ({ frame, variant, id, overlays }) => {
  const t = scene4T(frame);
  const light = PALETTE[variant === "veteran-39" ? "stadium-night" : "rosario-dusk"].light;
  const glow = light.glow;
  // The dimension line returns when the camera reaches the boot and counts the gap down.
  const measure = overlays ? smoothstep(S4.toFoot[1] - 40, S4.toFoot[1] - 10, frame) * (1 - smoothstep(S4.touch - 22, S4.touch - 6, frame)) : 0;
  const pulseAge = (frame - S4.touch) / 60;
  return (
    <TheTouch
      variant={variant}
      t={t}
      shot={scene4Shot(frame)}
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
                  color={glow}
                  pxPerM={camera.f / D0}
                  idPrefix={`${id}gm`}
                />
              </g>
            ) : null}
            {pulseAge >= 0 && pulseAge < 1.5 ? (
              <ContactPulse
                at={on}
                age={pulseAge}
                color={glow}
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
 * touch, and the playback speed. Small, mono, at the foot of the frame.
 */
const TimeReadout: React.FC<{ frame: number; color: string }> = ({ frame, color }) => {
  const t = scene4T(frame);
  const speed = scene4Speed(frame);
  const opacity = interpolate(frame, [S4.unshuffle[1], S4.unshuffle[1] + 20, S4.matchCut + 40, S4.matchCut + 70], [0, 0.8, 0.8, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (opacity <= 0) return null;
  const sign = t < 0 ? "\u2212" : "+";
  const rate = speed < 1e-6 ? "HELD" : speed > 0.98 ? "1:1" : `1:${Math.round(1 / speed)}`;
  return (
    <div
      style={{
        position: "absolute",
        left: 84,
        bottom: 132,
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

/** A hard cut straight into the shuffled frozen frame (not from white), settling on the 39-year-old. */
const unshuffleProgress = (frame: number) => 0.24 + 0.76 * clamp(frame / S4.unshuffle[1]);

export const Scene4TheTouch: React.FC = () => {
  const frame = useCurrentFrame();
  const night = PALETTE["stadium-night"];
  const dusk = PALETTE["rosario-dusk"];

  let picture: React.ReactNode;
  if (frame < S4.unshuffle[1]) {
    // The same frozen frame as the end of Scene 1, un-shuffling onto the 39-year-old.
    const layers = [ERAS[0], ...ERAS.slice(1)].map((look, i) => (
      <TheTouch
        key={look.id}
        variant="veteran-39"
        t={T_FREEZE}
        shot={FREEZE_SHOT}
        look={look}
        scaleAt={() => look.scale}
        world="stadium-night"
        idPrefix={`s4sh${i}`}
      />
    ));
    picture = <FrameShuffle direction="in" progress={unshuffleProgress(frame)} seed={7} layers={layers} />;
  } else if (MATCH_CUT_DISSOLVE > 0 && Math.abs(frame - S4.matchCut) < MATCH_CUT_DISSOLVE / 2) {
    // Optional dissolve: both variants on the same camera and clock, so only the bodies and worlds differ.
    const u = (frame - (S4.matchCut - MATCH_CUT_DISSOLVE / 2)) / MATCH_CUT_DISSOLVE;
    picture = (
      <>
        <Shot4 frame={frame} variant="veteran-39" id="s4a" overlays />
        <AbsoluteFill style={{ opacity: clamp(u) }}>
          <Shot4 frame={frame} variant="rosario-kid" id="s4b" overlays={false} />
        </AbsoluteFill>
      </>
    );
  } else {
    picture = <Shot4 frame={frame} variant={frame < S4.matchCut ? "veteran-39" : "rosario-kid"} id="s4" overlays />;
  }

  // The legend in the sky, drawn on as the camera pulls back.
  const etch = interpolate(frame, [S4.pullBack[0] + 20, S4.pullBack[0] + 190], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const etchOpacity = interpolate(frame, [S4.pullBack[0] + 20, S4.pullBack[0] + 90], [0, 0.55], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const kid = frame >= S4.matchCut;
  return (
    <AbsoluteFill style={{ backgroundColor: kid ? dusk.skyTop : night.skyTop }}>
      {picture}
      {etch > 0 ? (
        <AbsoluteFill style={{ mixBlendMode: "screen", opacity: etchOpacity }}>
          <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
            <EtchedAthlete pose={LEGEND_POSE} camera={cameraFromShot(LEGEND_SHOT)} idPrefix="legend" progress={etch} color={dusk.sun} width={2.2} />
          </svg>
        </AbsoluteFill>
      ) : null}
      <TimeReadout frame={frame} color={kid ? dusk.light.glow : night.light.glow} />
      {frame >= S4.subtitle[0] ? <Subtitle text={SUBTITLE} frame={frame - S4.subtitle[0]} y={1560} /> : null}
      <Vignette strength={(kid ? 0.4 : 0.55) * (1 - (frame < S4.unshuffle[1] ? shuffleWhiteness(unshuffleProgress(frame), "in") : 0))} />
      <Grain frame={frame} opacity={0.07} />
    </AbsoluteFill>
  );
};
