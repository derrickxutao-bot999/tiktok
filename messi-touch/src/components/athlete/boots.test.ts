import { describe, expect, test } from "vitest";
import { TOUCH_DIR } from "../../lib/ball";
import { scene4T } from "../../lib/clock";
import { VARIANT_LOOK } from "../../lib/eras";
import { DEG, Vec2, fromAngle } from "../../lib/math";
import { solvePose } from "../../lib/rig";
import { scene4Shot } from "../../lib/shots";
import { TOUCH } from "../../lib/touch";
import { cameraFromShot, project } from "../../lib/world";
import { Athlete } from "../Athlete";
import { T, TOE_CONE, bootGeometry } from "./boots";
import { buildFigure } from "./figure";
import { draw } from "./elements.testutil";
import { Seg, bezier, cmdSegs, smoothSegs } from "./geom";

const sample = (segs: readonly Seg[]): Vec2[] => segs.flatMap((s) => Array.from({ length: 41 }, (_, i) => bezier(s, i / 40)));

const outlines = (kind: "modern" | "classic" | "worn", open: number): Vec2[] => {
  const g = bootGeometry(kind, open);
  const id = (q: Vec2) => q;
  return [...sample(cmdSegs(g.upper, id)), ...(g.studs ? sample(cmdSegs(g.studs, id)) : []), ...(g.sole ? sample(smoothSegs(g.sole, true)) : [])];
};

describe("boot toe contract", () => {
  const contactNormal = TOUCH_DIR - TOUCH.pitchContact;
  test("the contact normal lies inside the toe's cone", () => {
    expect(contactNormal).toBeGreaterThan(0);
    expect(contactNormal).toBeLessThanOrEqual(TOE_CONE);
  });

  for (const kind of ["modern", "classic", "worn"] as const) {
    for (const open of [0.2, 1]) {
      test(`${kind} (sole open ${open}): the tip is the support point from 0 to 40 degrees`, () => {
        const pts = outlines(kind, open);
        for (let deg = 0; deg <= TOE_CONE / DEG + 1e-9; deg += 5) {
          const n = fromAngle(deg * DEG);
          const reach = Math.max(...pts.map((q) => n.x * (q.x - T.x) + n.y * (q.y - T.y)));
          // 0.1 mm tolerance; the tip itself is on the outline, so the max is 0.
          expect(reach).toBeLessThanOrEqual(1e-4);
          expect(reach).toBeGreaterThanOrEqual(-1e-9);
        }
        expect(Math.max(...pts.map((q) => q.x))).toBeCloseTo(T.x, 9);
      });
    }
  }
});

// The near boot's strokes (its contour is 2 x cw wide, centred on the
// outline), seams and halos would reach 1-3 px past the toe towards the ball.
// While the touch is on they are clipped to the half-plane behind the toe
// along the contact direction, so the drawn boot ends exactly at the toe.
describe("toe clip at the touch", () => {
  const nWorld = fromAngle(TOUCH_DIR);
  const sample = (segs: readonly Seg[]) => segs.flatMap((s) => Array.from({ length: 17 }, (_, i) => bezier(s, i / 16)));
  const strip = (d: string) => {
    // The second subpath is the strip beyond the toe: M a L b L c L e Z, with a-b through the toe.
    const sub = d.slice(d.indexOf("M", 1));
    const nums = (sub.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
    return { a: { x: nums[0], y: nums[1] }, b: { x: nums[2], y: nums[3] }, c: { x: nums[4], y: nums[5] } };
  };

  for (const variant of ["veteran-39", "rosario-kid"] as const) {
    test(`${variant}: the clip is on through the touch and sits on the projected toe`, () => {
      let on = 0;
      for (let f = 270; f <= 310; f++) {
        const t = scene4T(f);
        const camera = cameraFromShot(scene4Shot(f));
        const pose = solvePose(t, VARIANT_LOOK[variant]);
        const g = buildFigure(pose, camera);
        const cone = TOUCH_DIR - pose.legs.L.pitch;
        const expectOn = pose.touch > 0 && cone >= 0 && cone <= TOE_CONE;
        expect(g.toeClip !== null).toBe(expectOn);
        if (!g.toeClip) continue;
        on++;
        const toe = project(camera, pose.legs.L.toe.x, pose.legs.L.toe.y);
        const { toe: tc, n, d } = g.toeClip;
        expect(Math.hypot(tc.x - toe.x, tc.y - toe.y)).toBeLessThan(0.01);
        // The contact direction, on screen (y down).
        expect(n.x).toBeCloseTo(nWorld.x, 12);
        expect(n.y).toBeCloseTo(-nWorld.y, 12);
        // The strip's near edge passes through the toe, square to n, and the strip lies beyond it.
        const { a, b, c } = strip(d);
        expect(Math.hypot((a.x + b.x) / 2 - toe.x, (a.y + b.y) / 2 - toe.y)).toBeLessThan(0.002);
        expect(Math.abs((b.x - a.x) * n.x + (b.y - a.y) * n.y)).toBeLessThan(0.01);
        expect((c.x - toe.x) * n.x + (c.y - toe.y) * n.y).toBeGreaterThan(0);
        // Only strokes are cut: no fill of the near leg reaches into the strip.
        const m = { x: -n.y, y: n.x };
        const halfW = Math.hypot(b.x - a.x, b.y - a.y) / 2;
        for (const p of g.leg.parts.filter((q) => q.segs.length)) {
          for (const q of sample(p.segs)) {
            const along = (q.x - toe.x) * n.x + (q.y - toe.y) * n.y;
            const across = Math.abs((q.x - toe.x) * m.x + (q.y - toe.y) * m.y);
            if (across < halfW) expect(along).toBeLessThanOrEqual(0.01);
          }
        }
      }
      // Contact (285) and the frames around it are all covered.
      expect(on).toBeGreaterThan(20);
    });
  }

  test("the rendered athlete applies the clip to the near leg and its glow", () => {
    const f = 285;
    const camera = cameraFromShot(scene4Shot(f));
    const pose = solvePose(scene4T(f), VARIANT_LOOK["veteran-39"]);
    const els = draw(Athlete, { pose, camera, world: "stadium-night", idPrefix: "tc" });
    expect(els.filter((e) => e.type === "clipPath" && e.props.id === "tc-ath-tc")).toHaveLength(1);
    // The near leg (with its seams and halos) and its glow stroke.
    expect(els.filter((e) => e.props.clipPath === "url(#tc-ath-tc)")).toHaveLength(2);
  });

  test("no clip away from the touch", () => {
    const camera = cameraFromShot(scene4Shot(100));
    expect(buildFigure(solvePose(-0.6, VARIANT_LOOK["veteran-39"]), camera).toeClip).toBeNull();
  });
});
