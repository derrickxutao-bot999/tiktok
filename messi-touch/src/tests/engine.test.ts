import { describe, expect, test } from "vitest";
import { ballAt, BALL } from "../lib/ball";
import { ERA_SWITCH_FRAMES, eraIndexAt, eraScaleAtT, scene1T, scene4T } from "../lib/clock";
import { ERAS, VARIANT_LOOK } from "../lib/eras";
import { scene1FrameToT, stepAt, TOUCH_LAND_T } from "../lib/gait";
import { BODY, onAbsoluteTouchPath, solvePose } from "../lib/rig";
import { FREEZE_SHOT, scene1Shot, scene4Shot } from "../lib/shots";
import { D0, Shot, cameraFromShot, project } from "../lib/world";
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

describe("continuity between the scenes", () => {
  test("Scene 1's frozen boy and Scene 4's frozen veteran put the same toe on the same ball", () => {
    const boy = solvePose(T_FREEZE, ERAS[ERAS.length - 1], { scaleAt: eraScaleAtT });
    const vet = solvePose(T_FREEZE, VARIANT_LOOK["veteran-39"]);
    expect(close(boy.legs.L.toe.x, vet.legs.L.toe.x, 1e-12)).toBe(true);
    expect(close(boy.legs.L.toe.y, vet.legs.L.toe.y, 1e-12)).toBe(true);
    expect(close(boy.legs.L.pitch, vet.legs.L.pitch, 1e-12)).toBe(true);
  });

  test("a dissolve of up to 16 frames around the cut stays on the shared toe path", () => {
    for (let f = S4.matchCut - 8; f <= S4.matchCut + 8; f++) expect(onAbsoluteTouchPath(scene4T(f))).toBe(true);
  });
});

describe("feet plant instead of skidding", () => {
  // Speed of the ball of the foot (the stance pivot) over the frame in which it touches down.
  const pivot = (p: ReturnType<typeof solvePose>, s: "L" | "R") => {
    const leg = p.legs[s];
    const c = Math.cos(leg.pitch);
    const n = Math.sin(leg.pitch);
    return { x: leg.ankle.x + (BODY.footBall.x * c - BODY.footBall.y * n) * p.dims.foot, y: leg.ankle.y + (BODY.footBall.x * n + BODY.footBall.y * c) * p.dims.foot };
  };
  const touchdownSpeeds = (frames: number[], poseAt: (f: number) => ReturnType<typeof solvePose>) => {
    const out: number[] = [];
    for (const f of frames) {
      const a = poseAt(f - 1);
      const b = poseAt(f);
      for (const s of ["L", "R"] as const) {
        if (!a.legs[s].planted && b.legs[s].planted) {
          const pa = pivot(a, s);
          const pb = pivot(b, s);
          out.push(Math.hypot(pb.x - pa.x, pb.y - pa.y) / Math.max(1e-6, b.t - a.t));
        }
      }
    }
    return out;
  };
  test("Scene 1: every touchdown arrives under 1.6 m/s over its last frame (it was 3.6-5.6)", () => {
    const frames = Array.from({ length: S1.freeze - 1 }, (_, i) => i + 1);
    const speeds = touchdownSpeeds(frames, (f) => solvePose(scene1T(f), ERAS[eraIndexAt(f)], { scaleAt: eraScaleAtT }));
    expect(speeds.length).toBeGreaterThan(30);
    expect(Math.max(...speeds)).toBeLessThan(1.6);
  });
  test("Scene 4: the boy's touchdowns too", () => {
    const frames = Array.from({ length: SCENES.touch.duration - S4.matchCut - 1 }, (_, i) => S4.matchCut + 1 + i);
    const speeds = touchdownSpeeds(frames, (f) => solvePose(scene4T(f), VARIANT_LOOK["rosario-kid"]));
    expect(speeds.length).toBeGreaterThan(10);
    expect(Math.max(...speeds)).toBeLessThan(1.6);
  });
});

describe("the camera never jerks except on purpose", () => {
  // Screen acceleration of probe points held still in the world for three frames.
  const accel = (shotAt: (f: number) => Shot, f: number) => {
    const c0 = cameraFromShot(shotAt(f - 1));
    const c1 = cameraFromShot(shotAt(f));
    const c2 = cameraFromShot(shotAt(f + 1));
    let worst = 0;
    for (const [x, y, z] of [
      [c1.x, 0, D0],
      [c1.x, 1.7, D0],
      [c1.x + 1, 0, 30],
    ]) {
      const p0 = project(c0, x, y, z);
      const p1 = project(c1, x, y, z);
      const p2 = project(c2, x, y, z);
      worst = Math.max(worst, Math.hypot(p2.x - 2 * p1.x + p0.x, p2.y - 2 * p1.y + p0.y));
    }
    return worst;
  };
  // A jerk is an acceleration spike against its neighbourhood (smooth pushes may accelerate hard).
  const jerks = (shotAt: (f: number) => Shot, n: number, allowed: number[]) => {
    const a = Array.from({ length: n }, (_, f) => (f === 0 || f === n - 1 ? 0 : accel(shotAt, f)));
    const bad: number[] = [];
    for (let f = 1; f < n - 1; f++) {
      if (allowed.some((x) => Math.abs(f - x) <= 1)) continue;
      const near = a.slice(Math.max(1, f - 6), Math.min(n - 1, f + 7)).sort((p, q) => p - q);
      const median = near[Math.floor(near.length / 2)];
      if (a[f] > Math.max(1, 4 * median)) bad.push(f);
    }
    return bad;
  };
  test("Scene 1 (the freeze itself is the one deliberate stop)", () => {
    expect(jerks(scene1Shot, SCENES.pursuit.duration, [S1.freeze])).toEqual([]);
  });
  test("Scene 4 (the eyeline cut is the one deliberate cut)", () => {
    expect(jerks(scene4Shot, SCENES.touch.duration, [S4.toFoot])).toEqual([]);
  });
});
