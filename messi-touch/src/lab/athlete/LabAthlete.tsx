// Lab for the figure of light. Frames:
//   0-6   each era frozen at T_FREEZE under FREEZE_SHOT, in its own world
//   10-17 run cycle of the veteran (Scene 1 frames 100..121), tracking the pelvis
//   18    Marey echoes of ERAS[3..5] at successive footfalls behind a solid ERAS[5]
//   20    EYES_SHOT on the veteran
//   21    CLOSEUP_SHOT, veteran at scene4T(299), crosshair on the engine's toe
//   22    CLOSEUP_SHOT, the boy at scene4T(300), crosshair on the engine's toe
//   23    EtchedAthlete of the veteran at contact, progress 0.6, glow
//   24    the boy mid-run at dusk with AthleteShadow
//   26    head study: every era's head at 1000 px/m (two columns)
//   27    the frozen centimetre at 4000 px/m for the modern, classic and worn boots
//   28-31 the legend drawn on: progress 0.15, 0.35, 0.6, 0.85

import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Athlete, AthleteShadow, EtchedAthlete } from "../../components/Athlete";
import { BALL, ballAt } from "../../lib/ball";
import { eraScaleAtT, scene4T } from "../../lib/clock";
import { ERAS, Look, VARIANT_LOOK, WorldStyle } from "../../lib/eras";
import "../../lib/fonts";
import { scene1FrameToT } from "../../lib/gait";
import { PALETTE } from "../../lib/palette";
import { Pose, footfallsBetween, solvePose } from "../../lib/rig";
import { CLOSEUP_SHOT, EYES_SHOT, FREEZE_SHOT } from "../../lib/shots";
import { T_FREEZE } from "../../lib/touch";
import { Camera, Shot, cameraFromShot, project } from "../../lib/world";

const NIGHT = PALETTE["stadium-night"];
const DUSK = PALETTE["rosario-dusk"];

const Stage: React.FC<{ world: WorldStyle; camera: Camera; children: React.ReactNode }> = ({ world, camera, children }) => {
  const gy = project(camera, 0, 0).y;
  const dusk = world === "rosario-dusk";
  return (
    <AbsoluteFill style={{ background: dusk ? `linear-gradient(${DUSK.skyTop}, ${DUSK.skyMid} 55%, ${DUSK.skyHorizon})` : NIGHT.skyTop }}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        <rect x={0} y={gy} width={1080} height={Math.max(0, 1920 - gy)} fill={dusk ? DUSK.dirtA : NIGHT.grassA} />
        <line x1={0} x2={1080} y1={gy} y2={gy} stroke={dusk ? DUSK.line : NIGHT.line} strokeOpacity={0.35} strokeWidth={1} />
        {children}
      </svg>
    </AbsoluteFill>
  );
};

/** Lab-only outline of the ball so the gap and the contact can be judged. */
const BallGuide: React.FC<{ camera: Camera; t: number }> = ({ camera, t }) => {
  const b = ballAt(t);
  const p = project(camera, b.x, b.y, b.z);
  return <circle cx={p.x} cy={p.y} r={BALL.r * p.k} fill="none" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={1} />;
};

const Crosshair: React.FC<{ camera: Camera; pose: Pose }> = ({ camera, pose }) => {
  const p = project(camera, pose.legs.L.toe.x, pose.legs.L.toe.y);
  return <path d={`M${p.x - 40} ${p.y}H${p.x + 40}M${p.x} ${p.y - 40}V${p.y + 40}`} stroke="#FF00FF" strokeWidth={1} />;
};

const frozen = (i: number) => {
  const look = ERAS[i];
  const world: WorldStyle = i === ERAS.length - 1 ? "rosario-dusk" : "stadium-night";
  const camera = cameraFromShot(FREEZE_SHOT);
  const pose = solvePose(T_FREEZE, look);
  return (
    <Stage world={world} camera={camera}>
      <AthleteShadow pose={pose} camera={camera} world={world} idPrefix="sh" />
      <Athlete pose={pose} camera={camera} world={world} idPrefix="a" midLayer={<BallGuide camera={camera} t={T_FREEZE} />} />
    </Stage>
  );
};

const tracking = (pose: Pose, pxPerM: number, screenY = 1100, lead = 0): Camera =>
  cameraFromShot({ lookX: pose.pelvis.x + lead, lookY: 0.9 * pose.scale, screenX: 540, screenY, pxPerM, height: 1.0 } satisfies Shot);

const runCycle = (frame: number) => {
  const t = scene1FrameToT(100 + 3 * (frame - 10));
  const pose = solvePose(t, ERAS[0]);
  const camera = tracking(pose, 430);
  return (
    <Stage world="stadium-night" camera={camera}>
      <AthleteShadow pose={pose} camera={camera} world="stadium-night" idPrefix="sh" />
      <Athlete pose={pose} camera={camera} world="stadium-night" idPrefix="a" />
    </Stage>
  );
};

const echoes = () => {
  const look = ERAS[5];
  const t = scene1FrameToT(568);
  const pose = solvePose(t, look, { scaleAt: eraScaleAtT });
  const camera = tracking(pose, 215, 1180, -1.6);
  const steps = footfallsBetween(t - 1.2, t - 0.01, look, { scaleAt: eraScaleAtT }).slice(-3);
  const looks: Look[] = [ERAS[3], ERAS[4], ERAS[5]];
  return (
    <Stage world="stadium-night" camera={camera}>
      {steps.map((ff, i) => (
        <EtchedAthlete
          key={ff.n}
          pose={solvePose(ff.t, looks[i], { scaleAt: eraScaleAtT })}
          camera={camera}
          idPrefix={`e${i}`}
          progress={1}
          color={looks[i].accent}
          opacity={0.35 + 0.2 * i}
        />
      ))}
      <AthleteShadow pose={pose} camera={camera} world="stadium-night" idPrefix="sh" />
      <Athlete pose={pose} camera={camera} world="stadium-night" idPrefix="a" />
    </Stage>
  );
};

const closeup = (variant: "veteran-39" | "rosario-kid", frame: number) => {
  const t = scene4T(frame);
  const look = VARIANT_LOOK[variant];
  const world: WorldStyle = variant === "veteran-39" ? "stadium-night" : "rosario-dusk";
  const camera = cameraFromShot(CLOSEUP_SHOT);
  const pose = solvePose(t, look);
  return (
    <Stage world={world} camera={camera}>
      <Athlete pose={pose} camera={camera} world={world} idPrefix="a" midLayer={<BallGuide camera={camera} t={t} />} />
      <Crosshair camera={camera} pose={pose} />
    </Stage>
  );
};

/** A cell with its own camera, clipped to its rectangle. */
const Cell: React.FC<{ x: number; y: number; w: number; h: number; bg: string; children: React.ReactNode }> = ({ x, y, w, h, bg, children }) => (
  <svg x={x} y={y} width={w} height={h} viewBox={`${x} ${y} ${w} ${h}`} overflow="hidden">
    <rect x={x} y={y} width={w} height={h} fill={bg} />
    {children}
  </svg>
);

/** Every era's head at 1000 px/m, two columns. */
const headStudy = () => (
  <Stage world="stadium-night" camera={cameraFromShot({ ...FREEZE_SHOT, screenY: 4000 })}>
    {ERAS.map((look, i) => {
      const pose = solvePose(T_FREEZE, look);
      const camera = cameraFromShot({
        lookX: pose.head.center.x,
        lookY: pose.head.center.y,
        screenX: i % 2 ? 790 : 290,
        screenY: 250 + Math.floor(i / 2) * 460,
        pxPerM: 1000,
        height: 1,
      });
      const world: WorldStyle = i === ERAS.length - 1 ? "rosario-dusk" : "stadium-night";
      const x0 = i % 2 ? 540 : 0;
      const y0 = Math.floor(i / 2) * 460 + 10;
      return (
        <Cell key={look.id} x={x0} y={y0} w={540} h={450} bg={world === "rosario-dusk" ? DUSK.skyMid : NIGHT.skyTop}>
          <Athlete pose={pose} camera={camera} world={world} idPrefix={`h${i}`} />
        </Cell>
      );
    })}
  </Stage>
);

/** The frozen centimetre, magnified: each boot kind stops exactly 1 cm short of the ball. */
const gapStudy = () => {
  const kinds: [Look, WorldStyle][] = [
    [ERAS[0], "stadium-night"],
    [ERAS[3], "stadium-night"],
    [VARIANT_LOOK["rosario-kid"], "rosario-dusk"],
  ];
  return (
    <Stage world="stadium-night" camera={cameraFromShot({ ...FREEZE_SHOT, screenY: 4000 })}>
      {kinds.map(([look, world], i) => {
        const pose = solvePose(T_FREEZE, look);
        const toe = pose.legs.L.toe;
        const camera = cameraFromShot({ lookX: toe.x + 0.02, lookY: toe.y, screenX: 540, screenY: 320 + i * 640, pxPerM: 4000, height: toe.y });
        return (
          <Cell key={look.id} x={0} y={i * 640} w={1080} h={630} bg={world === "rosario-dusk" ? DUSK.skyMid : NIGHT.skyTop}>
            <Athlete pose={pose} camera={camera} world={world} idPrefix={`g${i}`} midLayer={<BallGuide camera={camera} t={T_FREEZE} />} />
            <Crosshair camera={camera} pose={pose} />
          </Cell>
        );
      })}
    </Stage>
  );
};

/** The legend as Scene 4 draws it, at a given draw-on progress. */
const legend = (progress: number) => {
  const pose = solvePose(0, ERAS[0]);
  const camera = cameraFromShot({ lookX: pose.pelvis.x + 0.1, lookY: 0.95, screenX: 540, screenY: 760, pxPerM: 650, height: 1 });
  return (
    <Stage world="rosario-dusk" camera={cameraFromShot({ ...FREEZE_SHOT, screenY: 1500 })}>
      <EtchedAthlete pose={pose} camera={camera} idPrefix="legend" progress={progress} color={DUSK.sun} width={2.2} glow />
    </Stage>
  );
};

export const Lab: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame <= 6) return frozen(frame);
  if (frame >= 10 && frame <= 17) return runCycle(frame);
  if (frame === 18) return echoes();
  if (frame === 20) {
    const camera = cameraFromShot(EYES_SHOT);
    const pose = solvePose(T_FREEZE, ERAS[0]);
    return (
      <Stage world="stadium-night" camera={camera}>
        <Athlete pose={pose} camera={camera} world="stadium-night" idPrefix="a" />
      </Stage>
    );
  }
  if (frame === 21) return closeup("veteran-39", 299);
  if (frame === 22) return closeup("rosario-kid", 300);
  if (frame === 23) {
    const camera = cameraFromShot(FREEZE_SHOT);
    const pose = solvePose(0, ERAS[0]);
    return (
      <Stage world="rosario-dusk" camera={camera}>
        <EtchedAthlete pose={pose} camera={camera} idPrefix="legend" progress={0.6} color={DUSK.sun} width={2.2} glow />
      </Stage>
    );
  }
  if (frame === 24) {
    const pose = solvePose(scene4T(600), VARIANT_LOOK["rosario-kid"]);
    const camera = tracking(pose, 560, 1150);
    return (
      <Stage world="rosario-dusk" camera={camera}>
        <AthleteShadow pose={pose} camera={camera} world="rosario-dusk" idPrefix="sh" />
        <Athlete pose={pose} camera={camera} world="rosario-dusk" idPrefix="a" />
      </Stage>
    );
  }
  if (frame === 26) return headStudy();
  if (frame === 27) return gapStudy();
  if (frame >= 28 && frame <= 31) return legend([0.15, 0.35, 0.6, 0.85][frame - 28]);
  return <AbsoluteFill style={{ background: NIGHT.skyTop }} />;
};
