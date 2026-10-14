import { describe, expect, test } from "vitest";
import { draw } from "../components/athlete/elements.testutil";
import { Ball } from "../components/Ball";
import { BallPath } from "../components/fx/BallPath";
import { BALL, ballAt } from "../lib/ball";
import { scene1T, scene4T } from "../lib/clock";
import { scene1Shot, scene4Shot } from "../lib/shots";
import { S1, S4 } from "../lib/timeline";
import { cameraFromShot, project } from "../lib/world";

describe("the ball is the same ball in both worlds", () => {
  test("same place, same size, same squash; only its surface differs", () => {
    for (let f = S4.touch - 5; f <= S4.matchCut + 5; f++) {
      const t = scene4T(f);
      const camera = cameraFromShot(scene4Shot(f));
      const ball = ballAt(t);
      const shape = (world: "stadium-night" | "rosario-dusk") => {
        const els = draw(Ball, { ball, camera, world, idPrefix: "b" });
        const g = els.find((e) => e.type === "g" && typeof e.props.transform === "string" && String(e.props.transform).startsWith("translate"));
        const body = els.find((e) => e.type === "circle" && typeof e.props.fill === "string" && String(e.props.fill).includes("-body"));
        return { transform: g?.props.transform, r: body?.props.r };
      };
      const night = shape("stadium-night");
      const dusk = shape("rosario-dusk");
      expect(night.transform).toBeDefined();
      expect(night).toEqual(dusk);
      expect(night.r).toBeCloseTo(BALL.r * project(camera, ball.x, ball.y, ball.z).k, 9);
    }
  });

  test("while squashed it is cut flat by the ground, never pushed through it", () => {
    for (let f = S4.touch; f <= S4.matchCut + 5; f++) {
      const t = scene4T(f);
      const ball = ballAt(t);
      if (ball.squash <= 1e-4) continue;
      const camera = cameraFromShot(scene4Shot(f));
      const groundY = project(camera, ball.x, 0, ball.z).y;
      for (const world of ["stadium-night", "rosario-dusk"] as const) {
        const rect = draw(Ball, { ball, camera, world, idPrefix: "b" }).find((e) => e.type === "rect");
        expect(rect).toBeDefined();
        const bottom = Number(rect!.props.y) + Number(rect!.props.height);
        expect(bottom).toBeCloseTo(groundY + 0.5, 6);
      }
    }
  });
});

describe("the ball's fate", () => {
  test("its countdown stays on screen and left of the right-hand button column", () => {
    for (let f = 40; f < S1.freeze; f += 3) {
      const camera = cameraFromShot(scene1Shot(f));
      const texts = draw(BallPath, { camera, t: scene1T(f), color: "#8FD1FF", idPrefix: "bp" }).filter((e) => e.type === "text");
      for (const txt of texts) {
        const x = Number(txt.props.x);
        if (txt.props.textAnchor === "end") expect(x, `frame ${f}`).toBeLessThanOrEqual(900);
        else expect(x, `frame ${f}`).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
