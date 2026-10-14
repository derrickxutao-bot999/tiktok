import { describe, expect, test } from "vitest";
import { ballAt, BALL } from "../lib/ball";
import { ERA_SWITCH_FRAMES, eraIndexAt, eraScaleAtT, scene1T, scene4T } from "../lib/clock";
import { ERAS, VARIANT_LOOK } from "../lib/eras";
import { scene1FrameToT, stepAt, TOUCH_LAND_T } from "../lib/gait";
import { solvePose } from "../lib/rig";
import { FREEZE_SHOT, scene1Shot, scene4Shot } from "../lib/shots";
import { S1, S4, SCENES } from "../lib/timeline";
import { T_FREEZE, gapAt } from "../lib/touch";

const close = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) <= eps;

describe("the frozen frame", () => {
  test("the toe is exactly 1 cm from the ball", () => {
    expect(gapAt(T_FREEZE)).toBeCloseTo(0.01, 9);
  });
  test("Scene 1 ends and Scene 4 begins on the same camera", () => {
    for (const [k, val] of Object.entries(FREEZE_SHOT)) {
      expect(close(scene1Shot(S1.freeze)[k as keyof typeof FREEZE_SHOT], val, 1e-7)).toBe(true);
      expect(close(scene4Shot(0)[k as keyof typeof FREEZE_SHOT], val, 1e-7)).toBe(true);
    }
  });
  test("both scenes hold the same world time on it", () => {
    expect(scene1T(S1.freeze)).toBe(T_FREEZE);
    expect(scene1T(SCENES.pursuit.duration - 1)).toBe(T_FREEZE);
    expect(scene4T(0)).toBe(T_FREEZE);
  });
});

describe("era changes", () => {
  test("follow the user's formula and fall on footfalls", () => {
    expect(ERA_SWITCH_FRAMES).toEqual([250, 320, 390, 460, 530, 600]);
    ERA_SWITCH_FRAMES.forEach((f, i) => {
      expect(eraIndexAt(f - 1)).toBe(i);
      expect(eraIndexAt(f)).toBe(i + 1);
      const n = stepAt(scene1FrameToT(f));
      expect(Math.abs(n - Math.round(n))).toBeLessThan(1e-9);
    });
  });
  test("the step frequency rises (never drops by more than 0.5% frame to frame)", () => {
    let prev = 0;
    for (let f = 0; f < S1.freeze; f++) {
      const d = stepAt(scene1FrameToT(f + 1)) - stepAt(scene1FrameToT(f));
      expect(d).toBeGreaterThanOrEqual(prev * 0.995);
      prev = d;
    }
    const early = stepAt(scene1FrameToT(60)) - stepAt(scene1FrameToT(0));
    const late = stepAt(scene1FrameToT(660)) - stepAt(scene1FrameToT(600));
    expect(late / early).toBeGreaterThan(1.35);
  });
});

describe("the match cut", () => {
  test("Scene 4 timing: frozen, contact on S4.touch, cut 15 frames later", () => {
    expect(scene4T(S4.resume)).toBe(T_FREEZE);
    expect(scene4T(S4.touch)).toBeCloseTo(0, 12);
    expect(S4.matchCut - S4.touch).toBe(15);
    const tCut = scene4T(S4.matchCut);
    expect(tCut).toBeGreaterThan(0);
    expect(tCut).toBeLessThan(TOUCH_LAND_T);
    for (let f = 0; f < SCENES.touch.duration; f++) expect(scene4T(f + 1)).toBeGreaterThanOrEqual(scene4T(f));
  });

  test("every body puts the same toe, at the same angle, on the same ball", () => {
    const ts: number[] = [T_FREEZE];
    for (let f = S4.resume; f <= S4.matchCut + 20; f++) ts.push(scene4T(f));
    for (const t of ts) {
      const ref = solvePose(t, VARIANT_LOOK["veteran-39"]);
      expect(Math.abs(ref.legs.L.reachError)).toBeLessThan(1e-9);
      for (const look of ERAS) {
        const p = solvePose(t, look);
        expect(close(p.legs.L.toe.x, ref.legs.L.toe.x)).toBe(true);
        expect(close(p.legs.L.toe.y, ref.legs.L.toe.y)).toBe(true);
        expect(close(p.legs.L.pitch, ref.legs.L.pitch)).toBe(true);
        expect(Math.abs(p.legs.L.reachError)).toBeLessThan(1e-9);
      }
    }
  });

  test("the ball is continuous through contact", () => {
    for (const t0 of [0, BALL.contact]) {
      const a = ballAt(t0 - 1e-7);
      const b = ballAt(t0 + 1e-7);
      expect(Math.abs(a.x - b.x)).toBeLessThan(1e-5);
      expect(Math.abs(a.z - b.z)).toBeLessThan(1e-5);
    }
  });
});

describe("poses are finite and mostly in reach", () => {
  const finite = (p: ReturnType<typeof solvePose>) =>
    JSON.stringify(p, (_, v) => (typeof v === "number" && !Number.isFinite(v) ? "BAD" : v)).includes("BAD") === false;
  test("Scene 1 (eras, shrinking body)", () => {
    let worst = 0;
    for (let f = 0; f < SCENES.pursuit.duration; f++) {
      const p = solvePose(scene1T(f), ERAS[eraIndexAt(f)], { scaleAt: eraScaleAtT });
      expect(finite(p)).toBe(true);
      worst = Math.max(worst, Math.abs(p.legs.L.reachError), Math.abs(p.legs.R.reachError));
    }
    expect(worst).toBeLessThan(0.06);
  });
  test("Scene 4 (veteran, then the boy)", () => {
    let worst = 0;
    for (let f = 0; f < SCENES.touch.duration; f++) {
      const p = solvePose(scene4T(f), VARIANT_LOOK[f < S4.matchCut ? "veteran-39" : "rosario-kid"]);
      expect(finite(p)).toBe(true);
      worst = Math.max(worst, Math.abs(p.legs.L.reachError), Math.abs(p.legs.R.reachError));
    }
    expect(worst).toBeLessThan(0.06);
  });
});
