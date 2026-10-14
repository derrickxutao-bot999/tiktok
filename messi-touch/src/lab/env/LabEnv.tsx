// Lab for the two worlds and the ball (no athlete). Frames 0-8 are the
// stadium at night, 10-18 the same shots at dusk in Rosario; frame 9 is a
// sheet of both balls at large size, rolled and squashed.
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

import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Ball, BallShadow } from "../../components/Ball";
import { Backdrop, Ground } from "../../components/Environment";
import { BallState, ballAt } from "../../lib/ball";
import { scene1T, scene4T } from "../../lib/clock";
import { ERAS, WorldStyle } from "../../lib/eras";
import { PALETTE } from "../../lib/palette";
import { CLOSEUP_SHOT, EYES_SHOT, FREEZE_SHOT, scene1Shot, scene4Shot } from "../../lib/shots";
import { HEIGHT, WIDTH } from "../../lib/timeline";
import { T_FREEZE } from "../../lib/touch";
import { Camera, Shot, cameraFromShot } from "../../lib/world";
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
      <Ground camera={camera} world={world} t={t} idPrefix={id} />
      <BallShadow ball={ball} camera={camera} world={world} idPrefix={id} />
      <Ball ball={ball} camera={camera} world={world} idPrefix={id} />
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

export const Lab: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame === 9) return <BallSheet />;
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
