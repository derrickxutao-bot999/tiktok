// The two worlds of The Touch. Everything is placed in world metres and seen
// through the shot's camera, so parallax, the swing of the ground lines and
// the size of every detail come from the projection, never from screen-space
// scrolling.
//
//   Backdrop  everything behind the ground: sky, distance, boards or wall,
//             and the strip of ground beyond them up to the horizon.
//   Ground    the ground plane from the bottom of the frame to the foot of
//             the boards (night, z = 11) or the wall (dusk, z = 12), with the
//             touchline (and its ruler at night); at dusk also the dust
//             hanging in front of the wall.
//
// So Ground is not a complete layer on its own: drawn without its Backdrop it
// leaves a gap between the boards or wall and the horizon. Always draw
// Backdrop first, then Ground, with the same props.

import React from "react";
import { WorldStyle } from "../lib/eras";
import { PALETTE } from "../lib/palette";
import { Camera } from "../lib/world";
import { DuskBackdrop, DuskGround } from "./env/RosarioDusk";
import { NightBackdrop, NightGround } from "./env/StadiumNight";

export type EnvironmentProps = {
  camera: Camera;
  world: WorldStyle;
  /** World clock, seconds from contact: drives twinkle, pulses and drifting dust. */
  t: number;
  idPrefix: string;
  /** Colour of the pulses travelling along the board band (night); defaults to the world's glow. */
  accent?: string;
};

export const Backdrop: React.FC<EnvironmentProps> = ({ camera, world, t, idPrefix, accent }) =>
  world === "stadium-night" ? (
    <NightBackdrop cam={camera} t={t} id={`${idPrefix}-bd`} accent={accent ?? PALETTE[world].light.glow} />
  ) : (
    <DuskBackdrop cam={camera} t={t} id={`${idPrefix}-bd`} />
  );

export const Ground: React.FC<EnvironmentProps> = ({ camera, world, t, idPrefix }) =>
  world === "stadium-night" ? (
    <NightGround cam={camera} t={t} id={`${idPrefix}-gr`} />
  ) : (
    <DuskGround cam={camera} t={t} id={`${idPrefix}-gr`} />
  );
