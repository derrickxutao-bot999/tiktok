// The world is measured in metres. x runs along the touchline (the direction
// of the run), y is up, z is depth away from the camera. The camera stands on
// the pitch side, so beyond the line (larger z) is out of play.
//
// The runner, the ball at contact and the touchline all sit at depth D0. The
// runner is a flat figure at that depth; everything else gets real
// perspective, which is what makes the mowing stripes swing and slide.

import { WIDTH } from "./timeline";
import { lerp, clamp } from "./math";

export const D0 = 8;
export const LINE_Z = D0;
export const LINE_WIDTH = 0.12;

/** A pinhole camera with lens shift. */
export type Camera = {
  /** World x of the camera. */
  x: number;
  /** Camera height above the ground, m. Low = more dramatic ground perspective. */
  h: number;
  /** Focal length, px. */
  f: number;
  /** Principal point (vanishing point of the run direction), screen px. */
  cx: number;
  cy: number;
};

/** A framing, which is easier to animate than raw camera parameters. */
export type Shot = {
  /** World point (at depth D0) to frame... */
  lookX: number;
  lookY: number;
  /** ...placed at this screen position. */
  screenX: number;
  screenY: number;
  /** Scale at depth D0, px per metre. */
  pxPerM: number;
  /** Camera height, m. */
  height: number;
};

export const cameraFromShot = (s: Shot): Camera => ({
  x: s.lookX - (s.screenX - WIDTH / 2) / s.pxPerM,
  h: s.height,
  f: s.pxPerM * D0,
  cx: WIDTH / 2,
  cy: s.screenY + (s.lookY - s.height) * s.pxPerM,
});

export type ScreenPoint = { x: number; y: number; /** px per metre at that depth */ k: number };

export const project = (cam: Camera, x: number, y: number, z: number = D0): ScreenPoint => {
  const k = cam.f / z;
  return { x: cam.cx + (x - cam.x) * k, y: cam.cy - (y - cam.h) * k, k };
};

/** Depth of the ground seen at screen row sy (only below the horizon). */
export const groundDepthAt = (cam: Camera, sy: number) => (sy <= cam.cy + 1e-6 ? Infinity : (cam.h * cam.f) / (sy - cam.cy));

/** World x on the ground at depth z seen at screen column sx. */
export const groundXAt = (cam: Camera, sx: number, z: number) => cam.x + ((sx - cam.cx) * z) / cam.f;

/** Interpolates two shots; scale is interpolated in log space so zooms feel even. */
export const mixShots = (a: Shot, b: Shot, t: number): Shot => {
  const u = clamp(t);
  return {
    lookX: lerp(a.lookX, b.lookX, u),
    lookY: lerp(a.lookY, b.lookY, u),
    screenX: lerp(a.screenX, b.screenX, u),
    screenY: lerp(a.screenY, b.screenY, u),
    pxPerM: Math.exp(lerp(Math.log(a.pxPerM), Math.log(b.pxPerM), u)),
    height: lerp(a.height, b.height, u),
  };
};
