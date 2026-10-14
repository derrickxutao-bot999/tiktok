// The figure as screen-space outlines, grouped by depth:
//   far   far arm and far leg (behind everything)
//   body  shorts, neck, shirt, head, hair, beard
//   leg   near leg (in front of the ball at contact)
//   arm   near arm
// Athlete paints them, EtchedAthlete strokes them, AthleteShadow casts them.
//
// Each limb part carries its own cross-section (so it can be shaded across
// its width like a lit cylinder), and every part names the part it grows out
// of and the joint they share: EtchedAthlete draws the figure along that tree,
// from the touching toe up through the body.

import { TOUCH_DIR } from "../../lib/ball";
import { Look } from "../../lib/eras";
import { Vec2, add, clamp, lerp, lerpV, mul, norm, smoothstep, sub } from "../../lib/math";
import { Pose } from "../../lib/rig";
import { HEIGHT, WIDTH } from "../../lib/timeline";
import { Camera, project } from "../../lib/world";
import { TOE_CONE, bootGeometry } from "./boots";
import {
  Frame,
  LimbOpts,
  Pt,
  Seg,
  Station,
  ToScreen,
  cmdPath,
  cmdSegs,
  inFrame,
  insideLimb,
  limb,
  limbEdge,
  polyPath,
  segsPath,
  smoothPath,
  smoothSegs,
  toScreen,
  twoBone,
} from "./geom";
import { HeadGeo, headGeometry } from "./head";

export type Fill =
  | "body"
  | "far"
  | "shirt"
  | "sleeve"
  | "sleeveFar"
  | "shorts"
  | "shortsFar"
  | "socks"
  | "socksFar"
  | "boot"
  | "bootFar"
  | "sole"
  | "soleFar"
  | "mouth"
  | "hair"
  | "beard";

export type Part = {
  id: string;
  d: string;
  /** The closed outline as cubic segments, screen px. */
  segs: Seg[];
  fill: Fill;
  /** Draw a faint contour just before the fill: the seam where it overlaps its group. */
  seam?: boolean;
  /** A cross-section at mid-bone (anterior, posterior edge points, screen px): the limb is shaded across it. */
  xs?: [Vec2, Vec2];
  /** The part this one grows out of in line art, and the joint they share (screen px). */
  parent?: string;
  joint?: Vec2;
  /** Too fine for line art (studs, the shoe's open mouth). */
  detail?: boolean;
};

export type LineKind = "sockBand" | "bootSeam" | "lace" | "stitch" | "scuff" | "hem" | "sheen" | "rib";
/** A hairline; `owner` is the part it belongs to (it is drawn on with it). */
export type Line = { d: string; kind: LineKind; owner: string };

export type Side = { parts: Part[]; lines: Line[] };

type FootPts = { toe: Vec2; heel: Vec2; heightM: number };

export type FigureGeo = {
  /** px per metre. */
  k: number;
  far: Side;
  body: Side;
  leg: Side;
  arm: Side;
  shirt: string;
  /** Torso frame in screen space (jersey gradients, number, stars). */
  torso: { at: (f: number, u: number) => Vec2; lean: number; s: number };
  /** The rib round the neck opening (a closed band) and its lit inner edge. */
  collar: { band: string; edge: string };
  /** How much of the shirt number is clear of the near arm, eased (0 = hide it). */
  numberVis: number;
  head: { geo: HeadGeo; screen: ToScreen; radiusPx: number; pitch: number; at: (x: number, y: number) => Vec2 };
  /** Bounding box of everything with room for the glow, screen px. */
  box: { x: number; y: number; w: number; h: number };
  /** Screen y of the ground (y = 0) under the figure. */
  groundY: number;
  feet: { L: FootPts; R: FootPts };
  /**
   * While the touch is on (and the contact normal lies in the toe's cone, so
   * no fill reaches past the toe): the clip for the near leg's strokes, seams
   * and halos. `toe` is the projected engine toe, `n` the contact direction on
   * screen (y down); `d` (even-odd) keeps everything except a strip beyond the
   * toe, n.(p - toe) > 0, so the drawn boot ends exactly at the toe.
   */
  toeClip: { toe: Vec2; n: Vec2; d: string } | null;
};

// Half-widths [u, anterior, posterior] along each bone, canonical metres.
const THIGH: Station[] = [[0, 0.074, 0.08], [0.25, 0.084, 0.074], [0.55, 0.07, 0.06], [0.85, 0.052, 0.047], [1, 0.048, 0.046]];
const SHIN: Station[] = [[0, 0.046, 0.05], [0.22, 0.04, 0.058], [0.42, 0.036, 0.05], [0.72, 0.028, 0.031], [1, 0.026, 0.03]];
const UPPER_ARM: Station[] = [[0, 0.052, 0.054], [0.2, 0.048, 0.05], [0.5, 0.04, 0.04], [0.85, 0.033, 0.034], [1, 0.032, 0.032]];
const FOREARM: Station[] = [[0, 0.033, 0.034], [0.25, 0.037, 0.035], [0.6, 0.029, 0.027], [1, 0.021, 0.02]];
const HAND: Station[] = [[0, 0.022, 0.021], [0.45, 0.03, 0.03], [1, 0.022, 0.024]];

// Torso, authored as (forward, up) from the hip joint, canonical metres.
type TK = readonly [number, number, 0 | 1];
const SHIRT: readonly TK[] = [
  [0.06, 0.475, 0], [0.1, 0.43, 0], [0.124, 0.35, 0], [0.118, 0.26, 0], [0.108, 0.16, 0], [0.112, 0.06, 0], [0.118, -0.035, 1],
  [0.0, -0.06, 0], [-0.128, -0.045, 1], [-0.118, 0.07, 0], [-0.104, 0.19, 0], [-0.112, 0.29, 0], [-0.118, 0.38, 0], [-0.1, 0.47, 0], [-0.055, 0.52, 0], [0.005, 0.51, 0],
];
const HEM = [6, 7, 8];
/** The neck opening, back to front. */
const NECKLINE = [13, 14, 15, 0];
const SHORTS: readonly TK[] = [
  [-0.1, 0.1, 0], [0.095, 0.1, 0], [0.112, -0.02, 0], [0.085, -0.11, 0], [0.0, -0.15, 0], [-0.094, -0.134, 0], [-0.12, -0.035, 0],
];

export const buildFigure = (pose: Pose, camera: Camera): FigureGeo => {
  const S = toScreen(camera);
  const k = project(camera, pose.pelvis.x, pose.pelvis.y).k;
  const look: Look = pose.look;
  const s = pose.scale;
  const w = s * look.limb;
  /** Children are slimmer front to back. */
  const depth = s * (0.4 + 0.6 * look.limb);
  const all: Vec2[] = [];
  const shape = (pts: Pt[]) => {
    const sp = pts.map(S);
    all.push(...sp);
    const segs = smoothSegs(sp, true);
    return { d: segsPath(segs, true), segs };
  };
  const line = (pts: Vec2[], kind: LineKind, owner: string, smooth = false): Line => {
    const sp = pts.map(S);
    return { d: smooth ? smoothPath(sp, false) : polyPath(sp, false), kind, owner };
  };
  const section = (a: Vec2, b: Vec2, st: readonly Station[], o: LimbOpts, u: number) => limbEdge(a, b, st, o, u).map(S) as [Vec2, Vec2];
  const at = (a: Vec2, b: Vec2, u: number) => S(lerpV(a, b, u));
  /** A section across a bent two-bone limb: perpendicular to root-to-tip, through the bend, widened by how far the joint stands off. */
  const across = (a: Vec2, j: Vec2, b: Vec2, half: number): [Vec2, Vec2] => {
    const d = norm(sub(b, a));
    const n = { x: -d.y, y: d.x };
    const c = mul(add(add(a, b), mul(j, 2)), 0.25);
    const off = Math.abs((j.x - a.x) * n.x + (j.y - a.y) * n.y);
    const h = half + 0.5 * off;
    return [S(add(c, mul(n, h))), S(sub(c, mul(n, h)))];
  };

  const torsoFrame: Frame = { o: pose.pelvis, a: -pose.lean, s: 1 };
  const tw = (f: number, u: number, isSharp = false) => inFrame(torsoFrame, f * depth, u * s, isSharp);
  // A light flutter of the shirt tail, driven by the stride.
  const flutter = 0.012 * (1 - pose.touch) * Math.sin(2 * Math.PI * (pose.step + 0.3));
  const shirtPts = SHIRT.map(([f, u, sh], i) => tw(f - (i === 8 ? flutter : 0), u, sh === 1));

  // ---------------------------------------------------------------- legs
  const legSide = (side: "L" | "R"): Side => {
    const lg = pose.legs[side];
    const near = side === "L";
    const tone: Fill = near ? "body" : "far";
    const parts: Part[] = [];
    const lines: Line[] = [];
    const sockOpts: LimbOpts = { w, grow: 0.003 * s, u0: 0.17, u1: 1.06, cap0: "flat" };
    // The top is cut flat and kept short: it hides under the shirt even when the leg swings far back.
    const shortsOpts: LimbOpts = { w, grow: 0.015 * s, u0: -0.07, u1: 0.4, cap0: "flat", cap1: "flat", slant1: 0.015 * s, soft1: 0.005 * s };
    const id = (n: string) => `${n}${side}`;

    // Hip, thigh, knee, calf and ankle as one continuous contour.
    parts.push({
      id: id("leg"),
      ...shape(twoBone(lg.hip, lg.knee, lg.ankle, THIGH, SHIN, { w, u0: -0.05, u1: 1.04 })),
      fill: tone,
      xs: across(lg.hip, lg.knee, lg.ankle, 0.075 * w),
      // Line art grows up the near leg from the ankle and down the far leg from the hip, both edges at once.
      parent: near ? id("sock") : id("shorts"),
      joint: near ? S(lg.ankle) : S(lg.hip),
    });
    parts.push({
      id: id("sock"),
      ...shape(limb(lg.knee, lg.ankle, SHIN, sockOpts)),
      fill: near ? "socks" : "socksFar",
      seam: true,
      xs: section(lg.knee, lg.ankle, SHIN, sockOpts, 0.6),
      parent: near ? id("boot") : id("leg"),
      joint: near ? S(lg.ankle) : at(lg.knee, lg.ankle, 0.17),
    });
    lines.push(line(limbEdge(lg.knee, lg.ankle, SHIN, sockOpts, 0.215), "sockBand", id("sock")));
    // Knit ribs down the sock, for the close-ups.
    if (near && k > 800) {
      const edges = [0.3, 0.55, 0.8, 0.98].map((u) => limbEdge(lg.knee, lg.ankle, SHIN, sockOpts, u));
      [0.3, 0.55, 0.8].forEach((t) => lines.push(line(edges.map(([f, b]) => lerpV(f, b, t)), "rib", id("sock"), true)));
    }

    // Boot in the foot frame. The worn sole hangs open in the air and shuts under the foot's weight.
    const foot: Frame = { o: lg.ankle, a: lg.pitch, s: pose.dims.foot };
    const local = (q: Vec2) => inFrame(foot, q.x, q.y);
    const F = (q: Vec2) => S(local(q));
    const ballY = local({ x: 0.13, y: -0.08 }).y;
    const bg = bootGeometry(look.boot, clamp(ballY / 0.03, 0.2, 1));
    const boot = id("boot");
    if (bg.mouth) parts.push({ id: id("mouth"), d: polyPath(bg.mouth.map(F), true), segs: [], fill: "mouth", detail: true });
    if (bg.sole) parts.push({ id: id("sole"), ...shape(bg.sole.map(local)), fill: near ? "sole" : "soleFar", seam: true, parent: boot, joint: F({ x: 0.13, y: -0.08 }) });
    if (bg.studs) parts.push({ id: id("studs"), d: cmdPath(bg.studs, F), segs: [], fill: "bootFar", detail: true });
    const upperSegs = cmdSegs(bg.upper, F);
    upperSegs.forEach((sg) => all.push(sg[0]));
    parts.push({
      id: boot,
      d: segsPath(upperSegs, true),
      segs: upperSegs,
      fill: near ? "boot" : "bootFar",
      seam: true,
      // Lit from above: shaded from the sole up to the instep.
      xs: [F({ x: 0.04, y: 0.03 }), F({ x: 0.07, y: -0.085 })],
      ...(near ? {} : { parent: id("sock"), joint: S(lg.ankle) }),
    });
    lines.push(line(bg.seam.map(local), "bootSeam", boot, true));
    if (near) {
      lines.push(line(bg.sheen.map(local), "sheen", boot, true));
      bg.creases.forEach((l) => lines.push(line(l.map(local), "scuff", boot, true)));
      bg.laces.forEach((l) => lines.push(line(l.map(local), "lace", boot)));
      if (bg.patch) lines.push({ d: polyPath(bg.patch.map(F), true), kind: "stitch", owner: boot });
      bg.scuffs.forEach((l) => lines.push(line(l.map(local), "scuff", boot)));
    }

    // Shorts leg over the top of the thigh; the hem rises a little towards the side split.
    const shorts = id("shorts");
    const [hf, hb] = limbEdge(lg.hip, lg.knee, THIGH, shortsOpts, shortsOpts.u1 ?? 1);
    parts.push({
      id: shorts,
      ...shape(limb(lg.hip, lg.knee, THIGH, shortsOpts)),
      fill: near ? "shorts" : "shortsFar",
      seam: true,
      xs: section(lg.hip, lg.knee, THIGH, shortsOpts, 0.2),
      parent: near ? id("leg") : "shortsBody",
      joint: near ? S(hf) : S(lg.hip),
    });
    lines.push(line([hf, hb], "hem", shorts));
    const mid = lerpV(hf, hb, 0.5);
    lines.push(line([mid, add(mid, mul(norm(sub(lg.hip, lg.knee)), 0.01 * s))], "hem", shorts));
    return { parts, lines };
  };

  // ---------------------------------------------------------------- arms
  // The rig's shoulder sits high under the neck; the drawn arm hangs from a
  // little lower so the deltoid and sleeve cap stay below the collar.
  const shoulderDrop = { x: -Math.sin(pose.lean) * 0.035 * s, y: -Math.cos(pose.lean) * 0.035 * s };
  const armOf = (side: "L" | "R") => ({ ...pose.arms[side], shoulder: add(pose.arms[side].shoulder, shoulderDrop) });
  const sleeveOpts: LimbOpts = { w, grow: 0.007 * s, u0: -0.06, u1: 0.38, cap1: "flat", slant1: -0.01 * s, soft1: 0.006 * s };
  const armSide = (side: "L" | "R"): Side => {
    const a = armOf(side);
    const near = side === "L";
    const tone: Fill = near ? "body" : "far";
    const id = (n: string) => `${n}${side}`;
    const handOpts: LimbOpts = { w, u0: -0.1, u1: 1.15 };
    return {
      parts: [
        // Deltoid, upper arm, elbow, forearm and wrist as one continuous contour.
        {
          id: id("arm"),
          ...shape(twoBone(a.shoulder, a.elbow, a.wrist, UPPER_ARM, FOREARM, { w })),
          fill: tone,
          xs: across(a.shoulder, a.elbow, a.wrist, 0.045 * w),
          parent: id("sleeve"),
          joint: S(a.shoulder),
        },
        {
          id: id("hand"),
          ...shape(limb(a.wrist, a.hand, HAND, handOpts)),
          fill: tone,
          xs: section(a.wrist, a.hand, HAND, handOpts, 0.45),
          parent: id("arm"),
          joint: S(a.wrist),
        },
        {
          id: id("sleeve"),
          ...shape(limb(a.shoulder, a.elbow, UPPER_ARM, sleeveOpts)),
          fill: near ? "sleeve" : "sleeveFar",
          seam: true,
          xs: section(a.shoulder, a.elbow, UPPER_ARM, sleeveOpts, 0.2),
          parent: "shirt",
          joint: S(a.shoulder),
        },
      ],
      lines: [line(limbEdge(a.shoulder, a.elbow, UPPER_ARM, sleeveOpts, sleeveOpts.u1 ?? 1), "hem", id("sleeve"))],
    };
  };

  // ---------------------------------------------------------------- body
  const headFrame: Frame = { o: pose.head.center, a: pose.head.pitch, s: pose.head.radius };
  const geo = headGeometry(look, headFrame, pose.step);
  // Neck: from the collar up to the nape behind and the throat under the jaw.
  const H = (x: number, y: number) => inFrame(headFrame, x, y);
  const neck = [tw(-0.085, 0.42), tw(-0.072, 0.5), H(-0.6, -0.46), H(-0.2, -0.1), H(0.32, -0.86), tw(0.064, 0.465), tw(0.07, 0.42)];
  const shirt = shape(shirtPts);
  const body: Side = {
    parts: [
      { id: "shortsBody", ...shape(SHORTS.map(([f, u, sh]) => tw(f, u, sh === 1))), fill: "shorts", parent: "shortsL", joint: S(pose.pelvis) },
      { id: "neck", ...shape(neck), fill: "body", parent: "shirt", joint: S(tw(0, 0.5)) },
      // The shirt starts at the middle of its hem, so its front and back edges rise together.
      { id: "shirt", ...shirt, fill: "shirt", seam: true, parent: "shortsBody", joint: S(tw(0, -0.06)) },
      { id: "head", ...shape(geo.outline), fill: "body", parent: "neck", joint: S(H(-0.3, -0.5)) },
      { id: "hair", ...shape(geo.hair), fill: "hair", seam: true, parent: "head", joint: S(H(0.2, 0.75)) },
      ...(geo.beard ? [{ id: "beard", ...shape(geo.beard), fill: "beard" as const, seam: true, parent: "head", joint: S(H(0.4, -0.95)) }] : []),
    ],
    lines: [line(HEM.map((i) => shirtPts[i]), "hem", "shirt", true)],
  };

  const farArm = armSide("R");
  const farLeg = legSide("R");
  const far: Side = { parts: [...farArm.parts, ...farLeg.parts], lines: farLeg.lines };
  const leg = legSide("L");
  const arm = armSide("L");

  // The collar: a rib hugging the neck opening, cut from the shirt's own top edge.
  const neckTop = NECKLINE.map((i) => SHIRT[i]);
  const rib = 0.013;
  const neckIn = neckTop.map(([f, u], i) => {
    const a = neckTop[Math.max(0, i - 1)];
    const b = neckTop[Math.min(neckTop.length - 1, i + 1)];
    const t = norm({ x: b[0] - a[0], y: b[1] - a[1] });
    return [f + t.y * rib, u - t.x * rib] as const;
  });
  const outerC = neckTop.map(([f, u], i) => S(tw(f, u, i === 0 || i === neckTop.length - 1)));
  const innerC = neckIn.map(([f, u]) => S(tw(f, u)));
  const collar = {
    band: smoothPath([...outerC, ...[...innerC].reverse().map((q, i, arr) => ({ ...q, sharp: i === 0 || i === arr.length - 1 }))], true),
    edge: smoothPath(innerC, false),
  };

  // The number shows only while the near arm leaves most of it clear; a sliver beside the arm would read as a stray mark.
  const aL = armOf("L");
  const covered = (p: Vec2) =>
    insideLimb(p, aL.shoulder, aL.elbow, UPPER_ARM, { ...sleeveOpts, u1: 1.05 }) ||
    insideLimb(p, aL.elbow, aL.wrist, FOREARM, { w, u0: -0.1, u1: 1 }) ||
    insideLimb(p, aL.wrist, aL.hand, HAND, { w, u0: -0.1, u1: 1.15 });
  let clear = 0;
  for (const df of [-0.04, 0, 0.04]) for (const du of [-0.045, 0, 0.045]) if (!covered(tw(-0.062 + df, 0.29 + du))) clear += 1;
  const numberVis = smoothstep(0.55, 0.8, clear / 9);

  // Bounding box, padded for the glow and clamped to the frame (plus the
  // glow's reach) so close-ups do not allocate masks and filters for limbs far
  // off screen.
  const pad = 0.12 * k + 24;
  const edge = Math.min(pad, 48);
  const x0 = Math.max(-edge, Math.min(...all.map((p) => p.x)) - pad);
  const y0 = Math.max(-edge, Math.min(...all.map((p) => p.y)) - pad);
  const x1 = Math.min(WIDTH + edge, Math.max(...all.map((p) => p.x)) + pad);
  const y1 = Math.min(HEIGHT + edge, Math.max(...all.map((p) => p.y)) + pad);
  const box = { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) };

  const footPts = (side: "L" | "R"): FootPts => {
    const lg = pose.legs[side];
    const sole = inFrame({ o: lg.ankle, a: lg.pitch, s: pose.dims.foot }, 0.13, -0.08);
    return { toe: S(lg.toe), heel: S(lg.heel), heightM: Math.max(0, Math.min(lg.toe.y, lg.heel.y, sole.y)) };
  };

  // The toe clip: a strip beyond the toe along the contact normal, wide and
  // deep enough to take every stroke, halo and bloom off the boot's tip but
  // far from the rest of the leg.
  const lgL = pose.legs.L;
  const coneAngle = TOUCH_DIR - lgL.pitch;
  let toeClip: FigureGeo["toeClip"] = null;
  if (pose.touch > 0 && coneAngle >= 0 && coneAngle <= TOE_CONE) {
    const toe = S(lgL.toe);
    const n = { x: Math.cos(TOUCH_DIR), y: -Math.sin(TOUCH_DIR) };
    const m = { x: -n.y, y: n.x };
    const W = 0.08 * k + 24;
    const D = 0.06 * k + 40;
    const at = (a: number, b: number) => `${(toe.x + m.x * a + n.x * b).toFixed(3)} ${(toe.y + m.y * a + n.y * b).toFixed(3)}`;
    const ox = Math.min(box.x, toe.x - W - D);
    const oy = Math.min(box.y, toe.y - W - D);
    const ow = Math.max(box.x + box.w, toe.x + W + D) - ox;
    const oh = Math.max(box.y + box.h, toe.y + W + D) - oy;
    toeClip = {
      toe: { x: toe.x, y: toe.y },
      n,
      d: `M${ox.toFixed(1)} ${oy.toFixed(1)}h${ow.toFixed(1)}v${oh.toFixed(1)}h${(-ow).toFixed(1)}Z` + `M${at(-W, 0)}L${at(W, 0)}L${at(W, D)}L${at(-W, D)}Z`,
    };
  }

  return {
    k,
    far,
    body,
    leg,
    arm,
    shirt: shirt.d,
    torso: { at: (f, u) => S(tw(f, u)), lean: pose.lean, s },
    collar,
    numberVis,
    head: { geo, screen: S, radiusPx: pose.head.radius * k, pitch: pose.head.pitch, at: (x, y) => S(H(x, y)) },
    box,
    groundY: project(camera, pose.pelvis.x, 0).y,
    feet: { L: footPts("L"), R: footPts("R") },
    toeClip,
  };
};

/** Blend by the figure's scale: a line weight that grows a little in close-ups. */
export const bySize = (k: number, atSmall: number, atLarge: number) => lerp(atSmall, atLarge, clamp((k - 250) / 1500));
