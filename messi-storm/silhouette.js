// Ink silhouette of No.10 — one dark tone, posture carries the likeness.
// Poses are joint positions in figure-height units (feet at 0, up = +y).
// drawFig(g, x, y, H, pose, {face:1|-1, ink, far}) — x,y = ground point.

const INK = "#141414", INK_FAR = "#2b2b2b";

function catmull(g, pts, closed = true) {
  const n = pts.length; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    g.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
                    p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  if (closed) g.closePath();
}

// filled hull of two circles (tapered limb)
function capsule(g, a, b, ra, rb) {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1e-6;
  const ang = Math.atan2(dy, dx), k = Math.acos(Math.max(-1, Math.min(1, (ra - rb) / d)));
  g.beginPath();
  g.arc(a[0], a[1], ra, ang + k, ang - k + Math.PI * 2);
  g.arc(b[0], b[1], rb, ang - k, ang + k);
  g.closePath(); g.fill();
}
const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// head outlines, local units (H), facing right, y down, origin = head centre
const HEAD_SIDE = [[-0.048, 0.036], [-0.06, 0.004], [-0.056, -0.036], [-0.034, -0.063], [0.004, -0.071],
  [0.04, -0.058], [0.056, -0.032], [0.06, -0.012], [0.055, -0.002], [0.07, 0.017], [0.057, 0.025],
  [0.061, 0.035], [0.061, 0.051], [0.046, 0.068], [0.016, 0.064], [-0.008, 0.052], [-0.03, 0.05]];
const HEAD_FRONT = [[0, -0.071], [0.03, -0.066], [0.046, -0.046], [0.05, -0.016], [0.05, 0.0], [0.054, 0.006], [0.053, 0.02],
  [0.046, 0.027], [0.043, 0.047], [0.026, 0.065], [0, 0.071], [-0.026, 0.065], [-0.043, 0.047],
  [-0.046, 0.027], [-0.053, 0.02], [-0.054, 0.006], [-0.05, 0.0], [-0.05, -0.016], [-0.046, -0.046], [-0.03, -0.066]];

function drawFig(g, X, Y, H, P, o = {}) {
  const f = o.face || 1, ink = o.ink || INK, far = o.far || INK_FAR;
  const T = p => [X + p[0] * H * f, Y - p[1] * H];
  const R = r => r * H;
  const side = P.view === "side";
  const J = {}; for (const k in P.j) J[k] = T(P.j[k]);
  const hipC = lerp2(J.hipA, J.hipB, 0.5);

  function arm(s, col) {
    g.fillStyle = col;
    const sh = J["sh" + s], el = J["el" + s], wr = J["wr" + s];
    capsule(g, lerp2(sh, el, 0.08), lerp2(sh, el, 0.48), R(0.04), R(0.037)); // sleeve
    capsule(g, sh, el, R(0.033), R(0.027));
    capsule(g, el, wr, R(0.028), R(0.019));
    g.beginPath(); g.arc(wr[0], wr[1], R(0.021), 0, 7); g.fill();
    const fg = P.finger && P.finger[s];
    if (fg) { const tip = T([P.j["wr" + s][0] + fg[0], P.j["wr" + s][1] + fg[1]]); capsule(g, wr, tip, R(0.009), R(0.006)); }
    if (P.fist && P.fist[s]) { g.beginPath(); g.arc(wr[0], wr[1], R(0.025), 0, 7); g.fill(); }
  }
  function leg(s, col) {
    g.fillStyle = col;
    const hp = J["hip" + s], kn = J["kn" + s], an = J["an" + s];
    capsule(g, hp, kn, R(0.06), R(0.04));
    capsule(g, kn, an, R(0.041), R(0.022));
    // calf
    const c = lerp2(kn, an, 0.3), back = side ? -f : 0;
    g.beginPath(); g.ellipse(c[0] + back * R(0.012), c[1], R(0.04), R(0.07), Math.atan2(an[1] - kn[1], an[0] - kn[0]) - Math.PI / 2, 0, 7); g.fill();
    // boot
    const ft = P.foot && P.foot[s] != null ? P.foot[s] : 0; // toe angle, + = toe down
    g.save(); g.translate(an[0], an[1]);
    if (side) { g.scale(f, 1); g.rotate(ft); catmull(g, [[-R(0.03), -R(0.012)], [-R(0.026), R(0.03)], [R(0.03), R(0.034)], [R(0.085), R(0.03)], [R(0.08), R(0.01)], [R(0.03), -R(0.006)]]); }
    else { catmull(g, [[-R(0.026), -R(0.01)], [-R(0.03), R(0.03)], [0, R(0.04)], [R(0.03), R(0.03)], [R(0.026), -R(0.01)]]); }
    g.fill(); g.restore();
    // shorts leg
    g.fillStyle = col;
    capsule(g, lerp2(hp, hipC, 0.15), lerp2(hp, kn, 0.42), R(0.072), R(0.064));
  }
  function torso(col) {
    g.fillStyle = col;
    const N = J.neck, u = [N[0] - hipC[0], N[1] - hipC[1]], L = Math.hypot(u[0], u[1]);
    const ux = u[0] / L, uy = u[1] / L, vx = -uy * f, vy = ux * f; // v points to the figure's front (side) / right
    const at = (t, w) => [hipC[0] + u[0] * t + vx * R(w), hipC[1] + u[1] * t + vy * R(w)];
    let pts;
    if (side) pts = [at(-0.12, 0.075), at(0.25, 0.07), at(0.6, 0.08), at(0.85, 0.07), at(1.0, 0.03),
      at(1.0, -0.035), at(0.9, -0.07), at(0.65, -0.07), at(0.3, -0.06), at(-0.12, -0.075)];
    else pts = [at(-0.12, 0.11), at(0.3, 0.1), at(0.72, 0.108), at(0.9, 0.118), at(0.985, 0.08), at(1.0, 0.035),
      at(1.0, -0.035), at(0.985, -0.08), at(0.9, -0.118), at(0.72, -0.108), at(0.3, -0.1), at(-0.12, -0.11)];
    catmull(g, pts); g.fill();
    // neck
    const hc = headC();
    capsule(g, N, lerp2(N, hc, 0.6), R(0.026), R(0.023));
  }
  function headC() {
    const a = (P.tilt || 0) * f, d = 0.088;
    const N = J.neck, base = side ? [0.008 * f, -1] : [0, -1];
    const bx = base[0] * Math.cos(a) - base[1] * Math.sin(a), by = base[0] * Math.sin(a) + base[1] * Math.cos(a);
    return [N[0] + bx * R(d), N[1] + by * R(d) + (P.view === "back" || P.view === "front" ? R(P.bow || 0) : 0)];
  }
  function head(col) {
    g.fillStyle = col; const c = headC();
    g.save(); g.translate(c[0], c[1]); g.rotate((P.tilt || 0) * f); g.scale(f * H * 1.1, H * 1.1);
    catmull(g, side ? HEAD_SIDE : HEAD_FRONT); g.fill(); g.restore();
  }

  if (side) { arm("B", far); leg("B", far); torso(ink); leg("A", ink); head(ink); arm("A", ink); }
  else { leg("A", ink); leg("B", ink); torso(ink); arm("A", ink); arm("B", ink); head(ink); }

  if (P.view === "back" && o.number !== false) { // faint 10 on the shirt
    const c = lerp2(hipC, J.neck, 0.62);
    g.fillStyle = o.numberInk || "#3a3a3a"; g.font = `700 ${R(0.13)}px Oswald, Impact, sans-serif`;
    g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("10", c[0], c[1]);
  }
  if (P.ball) { const b = T(P.ball); g.fillStyle = o.ballInk || ink; g.beginPath(); g.arc(b[0], b[1], R(0.034), 0, 7); g.fill(); }
}

// --- poses (A = near / left-of-image in front view) ---
const POSES = {
  // walking away, head bowed — the lone figure
  backWalk: { view: "back", bow: 0.022, j: {
    neck: [0, 0.835], shA: [-0.098, 0.805], shB: [0.098, 0.805], elA: [-0.135, 0.645], elB: [0.133, 0.648],
    wrA: [-0.128, 0.48], wrB: [0.142, 0.488], hipA: [-0.06, 0.5], hipB: [0.06, 0.5],
    knA: [-0.055, 0.275], knB: [0.06, 0.29], anA: [-0.058, 0.045], anB: [0.066, 0.085] } },
  // both index fingers to the sky, face up
  sky: { view: "side", tilt: -0.5, j: {
    neck: [-0.012, 0.84], shA: [-0.004, 0.808], shB: [-0.03, 0.812], elA: [0.06, 0.955], elB: [0.035, 0.965],
    wrA: [0.078, 1.1], wrB: [0.052, 1.11], hipA: [0.0, 0.5], hipB: [-0.02, 0.5],
    knA: [0.012, 0.275], knB: [-0.03, 0.275], anA: [-0.005, 0.045], anB: [-0.055, 0.045] },
    finger: { A: [0.006, 0.06], B: [0.004, 0.06] }, fist: { A: 1, B: 1 } },
  // walking past, head down
  sideWalk: { view: "side", tilt: 0.42, j: {
    neck: [0.03, 0.83], shA: [0.03, 0.8], shB: [0.01, 0.805], elA: [0.0, 0.64], elB: [0.07, 0.645],
    wrA: [0.035, 0.48], wrB: [0.1, 0.495], hipA: [0.0, 0.5], hipB: [-0.015, 0.5],
    knA: [0.075, 0.29], knB: [-0.04, 0.28], anA: [0.09, 0.05], anB: [-0.13, 0.09] },
    foot: { A: -0.05, B: 0.55 } },
  // hands on hips, head bowed
  hips: { view: "front", bow: 0.03, j: {
    neck: [0, 0.835], shA: [-0.098, 0.805], shB: [0.098, 0.805], elA: [-0.2, 0.655], elB: [0.2, 0.655],
    wrA: [-0.105, 0.545], wrB: [0.105, 0.545], hipA: [-0.06, 0.5], hipB: [0.06, 0.5],
    knA: [-0.072, 0.275], knB: [0.072, 0.275], anA: [-0.08, 0.045], anB: [0.08, 0.045] } },
  // low left-foot dribble
  dribble: { view: "side", tilt: 0.55, ball: [0.25, 0.034], j: {
    neck: [0.1, 0.79], shA: [0.098, 0.762], shB: [0.075, 0.77], elA: [0.0, 0.64], elB: [0.17, 0.68],
    wrA: [-0.09, 0.57], wrB: [0.24, 0.58], hipA: [0.0, 0.47], hipB: [-0.02, 0.475],
    knA: [0.13, 0.28], knB: [-0.04, 0.25], anA: [0.14, 0.06], anB: [-0.17, 0.12] },
    foot: { A: 0.1, B: 0.7 } },
};
