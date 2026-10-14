import { describe, expect, test } from "vitest";
import { TOUCH_DIR } from "../../lib/ball";
import { DEG, Vec2, fromAngle } from "../../lib/math";
import { TOUCH } from "../../lib/touch";
import { T, TOE_CONE, bootGeometry } from "./boots";
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
