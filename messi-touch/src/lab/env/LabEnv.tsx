// Lab for the two worlds and the ball. Frames 0-8 are the stadium at night,
// 10-18 the same shots at dusk in Rosario; frame 9 is a sheet of both balls at
// large size, rolled and squashed.
//
//   0/1  scene1Shot(100) / scene1Shot(110): the ground lines swing, the far bokeh barely moves
//   2    scene1Shot(400)
//   3    FREEZE_SHOT at T_FREEZE
//   4    EYES_SHOT: the bokeh carries the frame
//   5/6  CLOSEUP_SHOT at scene4T(299) / scene4T(300): the ball on the same pixels in both worlds
//   7    scene4Shot(600)
//   8    scene4Shot(899): the pull-back
//
// Frames 20-25 cover the moves between those shots: 20/21 the night camera
// gliding from the eyes down to the boot (scene4Shot(190), (228)); 22-25 the
// dusk close-up opening out (scene4Shot(330), (420), (470), (520)), where the
// distance comes back into focus.
//
// Frames 26 on are the new camera work, with the athlete in place and the
// Backdrop's clear circle (head) and safe box (era caption) outlined in
// magenta (see SHOTS below). Frames 40-47 sweep the night lens across the
// ruler's half-metre and decimetre fades; 48-55 are eight consecutive frames
// of the dusk close-up opening out (motes must drift, never vanish); 56/57
// the old opening framing without and with the caption's safe box.

import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Athlete, AthleteShadow, eyePoint } from "../../components/Athlete";
import { Ball, BallShadow } from "../../components/Ball";
import { Backdrop, Foreground, Ground, ScreenBox, ScreenCircle } from "../../components/Environment";
import { BallState, ballAt } from "../../lib/ball";
import { eraIndexAt, eraScaleAtT, scene1T, scene4T } from "../../lib/clock";
import { ERAS, Look, WorldStyle } from "../../lib/eras";
import { RUN, pelvisXCanonical } from "../../lib/gait";
import { PALETTE } from "../../lib/palette";
import { ScaleAt, solvePose } from "../../lib/rig";
import { CLOSEUP_SHOT, EYES_SHOT, FREEZE_SHOT, scene1Shot, scene4Shot } from "../../lib/shots";
import { HEIGHT, WIDTH } from "../../lib/timeline";
import { T_FREEZE } from "../../lib/touch";
import { Camera, D0, Shot, cameraFromShot, project } from "../../lib/world";
import "../../lib/fonts";

const CASES: { shot: Shot; t: number; accent: string }[] = [
  { shot: scene1Shot(100), t: scene1T(100), accent: ERAS[0].accent },
  { shot: scene1Shot(110), t: scene1T(110), accent: ERAS[0].accent },
  { shot: scene1Shot(400), t: scene1T(400), accent: ERAS[3].accent },
  { shot: FREEZE_SHOT, t: T_FREEZE, accent: ERAS[6].accent },
  { shot: EYES_SHOT, t: T_FREEZE, accent: ERAS[0].accent },
  { shot: CLOSEUP_SHOT, t: scene4T(299), accent: ERAS[0].accent },
  { shot: CLOSEUP_SHOT, t: scene4T(300), accent: ERAS[0].accent },
  { shot: scene4Shot(600), t: scene4T(600), accent: ERAS[0].accent },
  { shot: scene4Shot(899), t: scene4T(899), accent: ERAS[0].accent },
];

const MOVES: { shot: Shot; t: number; world: WorldStyle }[] = [190, 228, 330, 420, 470, 520].map((f, i) => ({
  shot: scene4Shot(f),
  t: scene4T(f),
  world: i < 2 ? "stadium-night" : "rosario-dusk",
}));

const World: React.FC<{ shot: Shot; t: number; world: WorldStyle; accent: string }> = ({ shot, t, world, accent }) => {
  const camera = cameraFromShot(shot);
  const ball = ballAt(t);
  const id = "lab";
  return (
    <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ display: "block" }}>
      <Backdrop camera={camera} world={world} t={t} idPrefix={id} accent={accent} />
      <Ground camera={camera} world={world} t={t} idPrefix={id} accent={accent} />
      <BallShadow ball={ball} camera={camera} world={world} idPrefix={id} />
      <Ball ball={ball} camera={camera} world={world} idPrefix={id} />
      <Foreground camera={camera} world={world} t={t} idPrefix={id} />
    </svg>
  );
};

// ---------------------------------------------------------------- new camera work, with the athlete

/** The era caption's box (Scene 1), as the scene owner passes it. */
const CAPTION_BOX: ScreenBox = { x0: 0, y0: 230, x1: 760, y1: 600 };

type Staged = {
  shot: Shot;
  t: number;
  world: WorldStyle;
  look: Look;
  scaleAt?: ScaleAt;
  /** Clear the bokeh around the head (3 head radii). */
  clear?: boolean;
  safe?: ScreenBox;
};

/** Scene 1's new framing: about 300 px/m, camera 1.0-1.2 m high, the runner a little left of centre. */
const s1 = (frame: number, pxPerM = 300, height = 1.05, lead = 0.7, lookY = 0.85, screenY = 1150): Staged => {
  const t = scene1T(frame);
  return {
    shot: { lookX: pelvisXCanonical(t) + lead, lookY, screenX: 540, screenY, pxPerM, height },
    t,
    world: "stadium-night",
    look: ERAS[eraIndexAt(frame)],
    scaleAt: eraScaleAtT,
    clear: true,
    safe: CAPTION_BOX,
  };
};

const vet = solvePose(T_FREEZE, ERAS[0]);
const eye = eyePoint(vet);
/** Scene 4's push onto the eye at night. */
const eyeShot = (pxPerM: number): Staged => ({
  shot: { lookX: eye.x, lookY: eye.y, screenX: 540, screenY: 900, pxPerM, height: eye.y },
  t: T_FREEZE,
  world: "stadium-night",
  look: ERAS[0],
  clear: true,
});

const KID = ERAS[ERAS.length - 1];
/** The end of the dusk pull-back: 210 px/m, the boy low in the frame, feet near y = 1250. */
const duskEnd = (frame: number): Staged => {
  const t = scene4T(frame);
  return {
    shot: { lookX: pelvisXCanonical(t) + (1 - KID.scale) * RUN.reach + 0.3, lookY: 0, screenX: 540, screenY: 1250, pxPerM: 210, height: 1.1 },
    t,
    world: "rosario-dusk",
    look: KID,
  };
};

const STAGED: Record<number, Staged> = {
  // Scene 1 at 300 px/m: two frames 6 apart show the seams swinging; 324/328 follow the era change on 320 (a strong footfall).
  26: s1(300),
  27: s1(306),
  28: s1(324),
  29: s1(328),
  // The opening (250 px/m, 1.5 m) and the late run (330 px/m, 0.9 m).
  30: s1(60, 250, 1.5),
  31: s1(560, 330, 0.9),
  // The eye: 2300 (today's EYES_SHOT), 4000, and the 6500 px/m close-up.
  32: eyeShot(2300),
  33: eyeShot(4000),
  34: eyeShot(6500),
  // The dusk pull-back's end, and the squashed ball under the boy's toe at the match cut (frames 300-303).
  35: duskEnd(899),
  36: { shot: CLOSEUP_SHOT, t: scene4T(301), world: "rosario-dusk", look: KID },
  37: { shot: CLOSEUP_SHOT, t: scene4T(303), world: "rosario-dusk", look: KID },
  38: { shot: CLOSEUP_SHOT, t: scene4T(292), world: "stadium-night", look: ERAS[0] },
  39: duskEnd(760),
};
// The ruler's fades: the lens sweeps 400 -> 540 px/m over the freeze.
for (let i = 0; i < 8; i++) STAGED[40 + i] = { shot: { ...FREEZE_SHOT, pxPerM: 400 + 20 * i }, t: T_FREEZE, world: "stadium-night", look: ERAS[0] };
// Eight consecutive frames of the dusk close-up opening out, where the motes are big and sway fastest on screen.
for (let i = 0; i < 8; i++) STAGED[48 + i] = { shot: scene4Shot(340 + i), t: scene4T(340 + i), world: "rosario-dusk", look: KID };
// The old opening framing (250 px/m, 1.5 m), where the floodlights fall inside the caption box: without and with the safe box.
STAGED[56] = { ...s1(60, 250, 1.5, 1.25, 0.95, 1160), safe: undefined };
STAGED[57] = s1(60, 250, 1.5, 1.25, 0.95, 1160);

const StagedWorld: React.FC<Staged> = ({ shot, t, world, look, scaleAt, clear, safe }) => {
  const camera = cameraFromShot(shot);
  const pose = solvePose(t, look, { scaleAt });
  const ball = ballAt(t);
  const id = "lab";
  const head = project(camera, pose.head.center.x, pose.head.center.y);
  const circle: ScreenCircle | undefined = clear ? { x: head.x, y: head.y, r: 3 * pose.head.radius * head.k } : undefined;
  const env = { camera, world, t, idPrefix: id, accent: look.accent, clear: circle, safe };
  const ballInFront = ball.z < D0 - 0.05;
  const ballEl = <Ball ball={ball} camera={camera} world={world} idPrefix={id} />;
  return (
    <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ display: "block" }}>
      <Backdrop {...env} />
      <Ground {...env} />
      <AthleteShadow pose={pose} camera={camera} world={world} idPrefix={id} />
      <BallShadow ball={ball} camera={camera} world={world} idPrefix={id} />
      <Athlete pose={pose} camera={camera} world={world} idPrefix={id} midLayer={ballInFront ? null : ballEl} />
      {ballInFront ? ballEl : null}
      <Foreground {...env} />
      {/* Lab only: what the scene owner passes. */}
      <g fill="none" stroke="#FF3CC8" strokeWidth={1.5} strokeDasharray="6 6" opacity={0.6}>
        {circle && circle.r < 2 * HEIGHT ? <circle cx={circle.x} cy={circle.y} r={circle.r} /> : null}
        {safe ? <rect x={safe.x0} y={safe.y0} width={safe.x1 - safe.x0} height={safe.y1 - safe.y0} /> : null}
      </g>
    </svg>
  );
};

/** Both balls big, at several rolls, one squashed at contact. */
const BallSheet: React.FC = () => {
  const cam: Camera = { x: 0, h: 0.11, f: 1250 * 8, cx: 540, cy: 960 };
  const at = (x: number, y: number, roll: number, squash = 0): BallState => ({
    x: x / 1250,
    y: 0.11 + (960 - y) / 1250,
    z: 8,
    roll,
    squash,
    squashAngle: (20 * Math.PI) / 180,
    vx: 0,
  });
  return (
    <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ display: "block" }}>
      <rect width={WIDTH} height={HEIGHT / 2} fill={PALETTE["stadium-night"].skyMid} />
      <rect y={HEIGHT / 2} width={WIDTH} height={HEIGHT / 2} fill={PALETTE["rosario-dusk"].skyMid} />
      {[0, 1].map((row) =>
        [-300, 0, 300].map((dx, i) => {
          const world: WorldStyle = row === 0 ? "stadium-night" : "rosario-dusk";
          const b = at(dx, row === 0 ? 480 : 1440, i * 1.1, i === 2 ? 0.08 : 0);
          return <Ball key={`${row}${i}`} ball={b} camera={cam} world={world} idPrefix={`s${row}${i}`} />;
        }),
      )}
    </svg>
  );
};

export const LAB_ENV_FRAMES = 58;

export const Lab: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame === 9) return <BallSheet />;
  const staged = STAGED[frame];
  if (staged) {
    return (
      <AbsoluteFill style={{ backgroundColor: "#000" }}>
        <StagedWorld {...staged} />
      </AbsoluteFill>
    );
  }
  if (frame >= 20) {
    const m = MOVES[Math.min(frame - 20, MOVES.length - 1)];
    return (
      <AbsoluteFill style={{ backgroundColor: "#000" }}>
        <World shot={m.shot} t={m.t} world={m.world} accent={ERAS[0].accent} />
      </AbsoluteFill>
    );
  }
  const world: WorldStyle = frame < 9 ? "stadium-night" : "rosario-dusk";
  const c = CASES[frame % 10] ?? CASES[0];
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <World shot={c.shot} t={c.t} world={world} accent={c.accent} />
    </AbsoluteFill>
  );
};
