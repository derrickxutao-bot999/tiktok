// The two worlds of The Touch. Everything is placed in world metres and seen
// through the shot's camera, so parallax, the swing of the ground lines and
// the size of every detail come from the projection, never from screen-space
// scrolling.
//
//   Backdrop    everything behind the ground: sky, distance, boards or wall,
//               and the strip of ground beyond them up to the horizon.
//   Ground      the ground plane from the bottom of the frame to the foot of
//               the boards (night, z = 11) or the wall (dusk, z = 12), with
//               the touchline (and its ruler at night); at dusk also the dust
//               hanging between the runner and the wall.
//   Foreground  whatever is nearer the lens than the runner (z < D0): at
//               dusk, the dust motes in front of him. Nothing at night.
//
// So Ground is not a complete layer on its own: drawn without its Backdrop it
// leaves a gap between the boards or wall and the horizon. Always draw
// Backdrop first, then Ground, then the athlete and the ball, then
// Foreground, all with the same props.

import React from "react";
import { WorldStyle } from "../lib/eras";
import { PALETTE } from "../lib/palette";
import { Camera } from "../lib/world";
import { ScreenBox, ScreenCircle } from "./env/common";
import { DuskBackdrop, DuskForeground, DuskGround } from "./env/RosarioDusk";
import { NightBackdrop, NightGround } from "./env/StadiumNight";

export type { ScreenBox, ScreenCircle } from "./env/common";

export type EnvironmentProps = {
  camera: Camera;
  world: WorldStyle;
  /** World clock, seconds from contact: drives twinkle, pulses and drifting dust. */
  t: number;
  idPrefix: string;
  /** Colour of the pulses travelling along the board band (night) and tint of the seam pulses; defaults to the world's glow. */
  accent?: string;
  /**
   * Backdrop, night: screen circle (px) around the runner's head. Crowd and
   * pitch-side bokeh inside it dim to ~30%, with a soft edge from 0.75 r to 1.2 r.
   */
  clear?: ScreenCircle;
  /**
   * Backdrop, night: screen box (px) kept clear for type. The roof hairline,
   * its bezel ticks and the floodlight stars and streaks fade out inside it,
   * with a ~44 px feather around its edge.
   */
  safe?: ScreenBox;
  /**
   * Ground, night: after each footfall of the run, light runs down the two
   * nearest mowing seams towards the lens. Derived from t through the gait,
   * so it assumes the Scene 1 runner; pass false where nobody is running.
   * Default true.
   */
  seamPulses?: boolean;
};

export const Backdrop: React.FC<EnvironmentProps> = ({ camera, world, t, idPrefix, accent, clear, safe }) =>
  world === "stadium-night" ? (
    <NightBackdrop cam={camera} t={t} id={`${idPrefix}-bd`} accent={accent ?? PALETTE[world].light.glow} clear={clear} safe={safe} />
  ) : (
    <DuskBackdrop cam={camera} t={t} id={`${idPrefix}-bd`} />
  );

export const Ground: React.FC<EnvironmentProps> = ({ camera, world, t, idPrefix, accent, seamPulses = true }) =>
  world === "stadium-night" ? (
    <NightGround cam={camera} t={t} id={`${idPrefix}-gr`} accent={accent ?? PALETTE[world].light.glow} seamPulses={seamPulses} />
  ) : (
    <DuskGround cam={camera} t={t} id={`${idPrefix}-gr`} />
  );

/** Draw after the athlete and the ball. */
export const Foreground: React.FC<EnvironmentProps> = ({ camera, world, t, idPrefix }) =>
  world === "stadium-night" ? null : <DuskForeground cam={camera} t={t} id={`${idPrefix}-fg`} />;
