import { describe, expect, test } from "vitest";
import { scene4T } from "../../lib/clock";
import { VARIANT_LOOK } from "../../lib/eras";
import { solvePose } from "../../lib/rig";
import { FREEZE_SHOT, scene4Shot } from "../../lib/shots";
import { T_FREEZE } from "../../lib/touch";
import { HEIGHT, WIDTH } from "../../lib/timeline";
import { cameraFromShot, project } from "../../lib/world";
import { AthleteShadow, eyePoint } from "../Athlete";
import { draw } from "./elements.testutil";
import { buildFigure } from "./figure";

// The match cut rests on one pixel: the tip of the drawn near boot must be
// the engine's toe for both bodies through the touch and the cut. A foot
// frame built from the wrong size (pose.scale instead of pose.dims.foot, for
// a boy whose shoes run big) would move it by centimetres.
describe("drawn boot tip = engine toe", () => {
  for (const variant of ["veteran-39", "rosario-kid"] as const) {
    test(`${variant}, Scene 4 frames 285-305`, () => {
      for (let f = 285; f <= 305; f++) {
        const t = scene4T(f);
        const camera = cameraFromShot(scene4Shot(f));
        const pose = solvePose(t, VARIANT_LOOK[variant]);
        const boot = buildFigure(pose, camera).leg.parts.find((p) => p.id === "bootL");
        expect(boot).toBeDefined();
        const tip = boot!.segs[0][0];
        const toe = project(camera, pose.legs.L.toe.x, pose.legs.L.toe.y);
        expect(Math.hypot(tip.x - toe.x, tip.y - toe.y)).toBeLessThan(0.01);
        // The path as written starts there too (coordinates are rounded to 0.1 px).
        const m = boot!.d.match(/^M(-?[\d.]+) (-?[\d.]+)/);
        expect(m).not.toBeNull();
        expect(Math.hypot(Number(m![1]) - toe.x, Number(m![2]) - toe.y)).toBeLessThan(0.08);
      }
    });
  }
});

describe("eyePoint", () => {
  test("lies between the lids of the drawn eye", () => {
    const pose = solvePose(T_FREEZE, VARIANT_LOOK["veteran-39"]);
    const e = eyePoint(pose);
    const camera = cameraFromShot({ lookX: e.x, lookY: e.y, screenX: 540, screenY: 900, pxPerM: 6500, height: e.y });
    const g = buildFigure(pose, camera);
    const opening = g.head.geo.eye.opening.map(g.head.screen);
    const xs = opening.map((p) => p.x);
    const ys = opening.map((p) => p.y);
    expect(540).toBeGreaterThan(Math.min(...xs));
    expect(540).toBeLessThan(Math.max(...xs));
    expect(900).toBeGreaterThan(Math.min(...ys));
    expect(900).toBeLessThan(Math.max(...ys));
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    expect(Math.abs(cx - 540)).toBeLessThan(0.1 * (Math.max(...xs) - Math.min(...xs)));
  });
});

describe("AthleteShadow", () => {
  const pose = solvePose(T_FREEZE, VARIANT_LOOK["veteran-39"]);
  test("draws nothing when the ground is off screen (the eye close-up)", () => {
    const e = eyePoint(pose);
    const camera = cameraFromShot({ lookX: e.x, lookY: e.y, screenX: 540, screenY: 900, pxPerM: 6500, height: e.y });
    expect(draw(AthleteShadow, { pose, camera, world: "stadium-night", idPrefix: "s" })).toHaveLength(0);
  });
  test("keeps its blur region within the frame plus the blur's reach", () => {
    const camera = cameraFromShot(FREEZE_SHOT);
    const filter = draw(AthleteShadow, { pose, camera, world: "stadium-night", idPrefix: "s" }).find((e) => e.type === "filter");
    expect(filter).toBeDefined();
    const [x, y, w, h] = (["x", "y", "width", "height"] as const).map((k) => Number(filter!.props[k]));
    expect(x).toBeGreaterThanOrEqual(-60);
    expect(y).toBeGreaterThanOrEqual(-60);
    expect(x + w).toBeLessThanOrEqual(WIDTH + 60);
    expect(y + h).toBeLessThanOrEqual(HEIGHT + 60);
  });
});
