// <TheTouch/>: the one shot this film is built on.
//
// Everything in the picture is a pure function of three things:
//   t       world clock, seconds from the moment of contact
//   shot    the camera framing
//   variant who is running (the 39-year-old, or the boy in Rosario)
// The ball and the toe path depend only on t; the camera only on shot.
// So two renders that share t and shot but differ in variant place the ball
// and the touching toe on exactly the same pixels. Swap the variant on any
// frame and you have a match cut.

import React from "react";
import { AbsoluteFill } from "remotion";
import { ballAt } from "../lib/ball";
import { Look, Variant, VARIANT_LOOK, VARIANT_WORLD, WorldStyle } from "../lib/eras";
import { ScaleAt, solvePose, Pose } from "../lib/rig";
import { HEIGHT, WIDTH } from "../lib/timeline";
import { Camera, D0, Shot, cameraFromShot, project } from "../lib/world";
import { Athlete, AthleteShadow } from "./Athlete";
import { Ball, BallShadow } from "./Ball";
import { Backdrop, Foreground, Ground } from "./Environment";

export type TheTouchProps = {
  /** Who runs: decides the look and the world unless overridden. */
  variant: Variant;
  /** World clock, seconds from contact (negative before it). */
  t: number;
  /** Camera framing. */
  shot: Shot;
  /** Override the look (Scene 1 runs through the eras). */
  look?: Look;
  /** Override the body scale over time (Scene 1's spring from 1 to 0.65). */
  scaleAt?: ScaleAt;
  /** Override the world. */
  world?: WorldStyle;
  /** Override the board accent (the frozen frames share one, whoever is frozen in them). */
  accent?: string;
  /** Screen box the backdrop keeps clear of hairlines and streaks (behind a caption). */
  safe?: { x0: number; y0: number; x1: number; y1: number };
  /** Unique per instance when several are on screen at once (dissolves, shuffles). */
  idPrefix?: string;
  /** Extra SVG drawn on top, in the same coordinate space; receives the camera and pose. */
  overlay?: (ctx: { camera: Camera; pose: Pose }) => React.ReactNode;
  /** Extra SVG drawn on the ground, under the figure. */
  groundOverlay?: (ctx: { camera: Camera; pose: Pose }) => React.ReactNode;
};

export const TheTouch: React.FC<TheTouchProps> = ({
  variant,
  t,
  shot,
  look,
  scaleAt,
  world,
  accent,
  safe,
  idPrefix = "tt",
  overlay,
  groundOverlay,
}) => {
  const lk = look ?? VARIANT_LOOK[variant];
  const wd = world ?? VARIANT_WORLD[variant];
  const camera = cameraFromShot(shot);
  const pose = solvePose(t, lk, { scaleAt });
  const ball = ballAt(t);
  // The ball comes in from the camera side; once it is level with the runner
  // it sits between his far and near legs.
  const ballInFront = ball.z < D0 - 0.05;
  const ballEl = <Ball ball={ball} camera={camera} world={wd} idPrefix={idPrefix} />;
  const env = { camera, world: wd, t, idPrefix, accent: accent ?? lk.accent };
  // The crowd's bokeh dims behind his head so the profile always reads.
  const head = project(camera, pose.head.center.x, pose.head.center.y);
  const clear = { x: head.x, y: head.y, r: pose.head.radius * head.k * 3 };
  return (
    <AbsoluteFill>
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ display: "block" }}>
        <Backdrop {...env} clear={clear} safe={safe} />
        <Ground {...env} />
        {groundOverlay?.({ camera, pose })}
        <AthleteShadow pose={pose} camera={camera} world={wd} idPrefix={idPrefix} />
        <BallShadow ball={ball} camera={camera} world={wd} idPrefix={idPrefix} />
        <Athlete pose={pose} camera={camera} world={wd} idPrefix={idPrefix} midLayer={ballInFront ? null : ballEl} />
        {ballInFront ? ballEl : null}
        <Foreground {...env} />
        {overlay?.({ camera, pose })}
      </svg>
    </AbsoluteFill>
  );
};
