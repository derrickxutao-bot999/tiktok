// Cartoon people for the United episode: the same man at three ages, his dad,
// two roommates. Built on the limb outlines from silhouette.js
// (prof, chain, ribbon, closedCurve), but in colour, with faces, and lit as a
// whole by the light in the scene (a TV, a door, a window).
//
// toon(g, x, y, H, pose, look, light)
//   x, y   ground point under the figure (for seated poses: the floor under the hips)
//   H      standing height in px (a seated figure keeps the same scale)
//   pose   from POSE.* builders: { view: "front"|"back"|"side", face: 1|-1, j: joints (H units, y up),
//          head: { tilt, turn }, expr: { eyes, brows, mouth }, hands: {A,B}, remote: "A"|"B" }
//   look   from LOOK.*
//   light  { x, y, col, amb, amount, rim }  (screen coordinates of the light source)

// ---------------------------------------------------------------- looks
const LOOK = {
  man: { body: "adult", skin: "#e2b08e", hair: { style: "man", col: "#1b1716" }, beard: 0.55,
    shirt: { col: "#c8102e", trim: "#f2f2f2", number: "7" }, legs: { kind: "trousers", col: "#2f3440" }, shoes: "#3b3f4a" },
  kid: { body: "kid", skin: "#f0c09c", hair: { style: "kid", col: "#1b1716" }, blush: 0.35,
    shirt: { col: "#c8102e", trim: "#f2f2f2", number: "7", baggy: true }, legs: { kind: "shorts", col: "#24262e" }, shoes: "#d9dce4" },
  teen: { body: "adult", skin: "#e8b694", hair: { style: "teen", col: "#1b1716" },
    shirt: { col: "#c8102e", trim: "#f2f2f2", number: "7" }, legs: { kind: "trousers", col: "#3a4a66" }, shoes: "#e8e8ea" },
  dad: { body: "dad", skin: "#d8a27e", hair: { style: "dad", col: "#211c1a" }, beard: 0.2,
    shirt: { col: "#eeeae2", vest: true }, legs: { kind: "trousers", col: "#4a4a50" }, shoes: "#6a5a4a" },
  mateA: { body: "adult", skin: "#e6b896", hair: { style: "buzz", col: "#1b1716" }, glasses: true,
    shirt: { col: "#5b6170" }, legs: { kind: "trousers", col: "#2a2e38" }, shoes: "#2a2a30" },
  mateB: { body: "adult", skin: "#dca684", hair: { style: "man", col: "#2a2220" },
    shirt: { col: "#2c3a5c" }, legs: { kind: "shorts", col: "#3a3f4a" }, shoes: "#d0d0d4" },
};

// body proportions (H units, feet at 0)
const BODY = {
  adult: { headH: 0.2, neck: 0.775, shY: 0.752, shX: 0.104, hipY: 0.455, hipX: 0.056, knY: 0.255, anY: 0.042, elY: 0.592, wrY: 0.44, limb: 1 },
  dad: { headH: 0.195, neck: 0.775, shY: 0.75, shX: 0.118, hipY: 0.455, hipX: 0.06, knY: 0.255, anY: 0.042, elY: 0.592, wrY: 0.44, limb: 1.12 },
  kid: { headH: 0.265, neck: 0.715, shY: 0.695, shX: 0.092, hipY: 0.4, hipX: 0.05, knY: 0.22, anY: 0.036, elY: 0.55, wrY: 0.415, limb: 0.92 },
};

// ---------------------------------------------------------------- poses
const POSE = {
  // standing / walking; phase in radians drives the stride (null = still)
  stand(look, view = "front", o = {}) {
    const B = BODY[LOOK[look] ? LOOK[look].body : look], ph = o.phase, walk = ph != null;
    const sw = walk ? Math.sin(ph) : 0, bob = walk ? 0.008 * Math.abs(Math.cos(ph)) : 0;
    const j = {};
    if (view === "side") {
      const st = walk ? 0.11 : 0.02;
      Object.assign(j, {
        neck: [0.012, B.neck], shA: [0.012, B.shY], shB: [-0.008, B.shY + 0.004], hipA: [0, B.hipY], hipB: [-0.012, B.hipY],
        knA: [st * sw * 0.9 + 0.012, B.knY + Math.max(0, sw) * 0.03], anA: [st * sw, B.anY + Math.max(0, -sw) * 0.04],
        knB: [-st * sw * 0.9 + 0.012, B.knY + Math.max(0, -sw) * 0.03], anB: [-st * sw, B.anY + Math.max(0, sw) * 0.04],
        elA: [-0.06 * sw, B.elY], wrA: [-0.09 * sw + 0.02, B.wrY + 0.02 * Math.abs(sw)],
        elB: [0.06 * sw, B.elY], wrB: [0.09 * sw + 0.02, B.wrY + 0.02 * Math.abs(sw)],
      });
    } else {
      const lA = walk ? Math.max(0, sw) * 0.05 : 0, lB = walk ? Math.max(0, -sw) * 0.05 : 0, s = view === "back" ? -1 : 1;
      Object.assign(j, {
        neck: [0, B.neck], shA: [-B.shX, B.shY], shB: [B.shX, B.shY], hipA: [-B.hipX, B.hipY], hipB: [B.hipX, B.hipY],
        knA: [-B.hipX - 0.006, B.knY + lA * 0.6], knB: [B.hipX + 0.006, B.knY + lB * 0.6],
        anA: [-B.hipX - 0.01, B.anY + lA], anB: [B.hipX + 0.01, B.anY + lB],
        elA: [-B.shX - 0.022, B.elY + 0.012 * sw * s], elB: [B.shX + 0.022, B.elY - 0.012 * sw * s],
        wrA: [-B.shX - 0.024 + 0.008 * sw, B.wrY + 0.03 * sw * s], wrB: [B.shX + 0.024 - 0.008 * sw, B.wrY - 0.03 * sw * s],
      });
    }
    for (const k in j) j[k] = [j[k][0], j[k][1] + bob];
    return { view, j, body: B, ...o };
  },
  // sitting on a sofa; seat height ~ hip height of a chair
  seated(look, view = "front", o = {}) {
    const B = BODY[LOOK[look] ? LOOK[look].body : look], drop = B.hipY - (o.seat || B.hipY * 0.62);
    const up = y => y - drop, j = {};
    if (view === "side") {
      const th = (B.hipY - B.knY) * 1.05, kid = B === BODY.kid;
      Object.assign(j, {
        neck: [-0.03, up(B.neck)], shA: [-0.03, up(B.shY)], shB: [-0.05, up(B.shY) + 0.004], hipA: [0, up(B.hipY)], hipB: [-0.015, up(B.hipY)],
        knA: [th, up(B.hipY) + 0.01], knB: [th - 0.02, up(B.hipY) + 0.012],
        anA: [th + (kid ? 0.06 : 0.01), kid ? up(B.hipY) - 0.14 : B.anY], anB: [th - 0.015 + (kid ? 0.03 : 0), kid ? up(B.hipY) - 0.15 : B.anY],
        elA: [0.02, up(B.elY) + 0.02], wrA: [0.12, up(B.elY) + 0.02], elB: [0.0, up(B.elY) + 0.02], wrB: [0.1, up(B.elY) + 0.03],
      });
    } else {
      const kid = B === BODY.kid;
      Object.assign(j, {
        neck: [0, up(B.neck)], shA: [-B.shX, up(B.shY)], shB: [B.shX, up(B.shY)], hipA: [-B.hipX, up(B.hipY)], hipB: [B.hipX, up(B.hipY)],
        knA: [-B.hipX - 0.025, up(B.hipY) - 0.035], knB: [B.hipX + 0.025, up(B.hipY) - 0.035],
        anA: [-B.hipX - 0.016, kid ? up(B.hipY) - 0.2 : B.anY], anB: [B.hipX + 0.016, kid ? up(B.hipY) - 0.2 : B.anY],
        elA: [-B.shX - 0.03, up(B.elY) - 0.03], wrA: [-B.hipX - 0.01, up(B.hipY) - 0.02],
        elB: [B.shX + 0.03, up(B.elY) - 0.03], wrB: [B.hipX + 0.01, up(B.hipY) - 0.02],
      });
    }
    return { view, j, body: B, seated: true, ...o };
  },
};
// move one arm: raise the remote toward the screen / throw both arms up / hug
function armTo(P, s, el, wr) { P.j["el" + s] = el; P.j["wr" + s] = wr; return P; }
function armsUp(P, a) {
  const B = P.body, j = P.j, y0 = j.shA[1];
  for (const [s, sd] of [["A", -1], ["B", 1]]) {
    const sh = j["sh" + s];
    j["el" + s] = [sh[0] + sd * (0.06 - 0.02 * a), y0 - (B.shY - B.elY) * (1 - 2 * a) + 0.02 * a];
    j["wr" + s] = [sh[0] + sd * (0.05 - 0.03 * a), y0 - (B.shY - B.wrY) * (1 - 2.35 * a) + 0.02 * a];
  }
  P.hands = { A: a > 0.5 ? "fist" : "open", B: a > 0.5 ? "fist" : "open" };
  return P;
}

// ---------------------------------------------------------------- face pieces (head units: head height = 1, origin head centre, y down)
const HEADS = {
  adult: mirrorHalf([0, -0.5], [[0.2, -0.47], [0.33, -0.38], [0.39, -0.22], [0.4, -0.05], [0.39, 0.12], [0.35, 0.27], [0.27, 0.39], [0.15, 0.47]], [0, 0.5]),
  kid: mirrorHalf([0, -0.5], [[0.23, -0.46], [0.37, -0.35], [0.42, -0.17], [0.42, 0.02], [0.41, 0.18], [0.35, 0.32], [0.25, 0.43], [0.12, 0.49]], [0, 0.5]),
  sideAdult: [[-0.38, 0.18], [-0.43, -0.02], [-0.38, -0.3], [-0.2, -0.47], [0.05, -0.5], [0.27, -0.4], [0.36, -0.2], [0.38, -0.04], [0.36, 0.02],
    [0.44, 0.16], [0.37, 0.2], [0.39, 0.28], [0.37, 0.33], [0.33, 0.45], [0.18, 0.5], [0.0, 0.42], [-0.15, 0.32]],
  sideKid: [[-0.42, 0.16], [-0.46, -0.04], [-0.39, -0.32], [-0.2, -0.48], [0.06, -0.5], [0.28, -0.4], [0.38, -0.2], [0.41, 0.0], [0.4, 0.06],
    [0.45, 0.16], [0.39, 0.21], [0.4, 0.29], [0.36, 0.38], [0.24, 0.48], [0.06, 0.46], [-0.12, 0.38], [-0.26, 0.3]],
};
// hair: front / back / side outlines per style
const HAIRS = {
  man: {
    front: [[-0.42, 0.02], [-0.46, -0.26], [-0.34, -0.53], [0.0, -0.63], [0.3, -0.58], [0.45, -0.34], [0.44, 0.0], [0.38, -0.08], [0.3, -0.27], [0.1, -0.31],
      [-0.05, -0.26], [-0.18, -0.29], [-0.33, -0.22], [-0.38, -0.06]],
    back: [[-0.42, 0.05], [-0.46, -0.26], [-0.34, -0.53], [0.0, -0.62], [0.34, -0.53], [0.46, -0.26], [0.42, 0.05], [0.36, 0.28], [0.15, 0.32], [0, 0.3], [-0.15, 0.32], [-0.36, 0.28]],
    side: [[-0.43, 0.2], [-0.48, -0.06], [-0.42, -0.36], [-0.2, -0.56], [0.1, -0.6], [0.34, -0.48], [0.4, -0.3], [0.3, -0.3], [0.12, -0.33], [0.0, -0.22], [-0.12, -0.05], [-0.2, 0.15]],
  },
  kid: {
    front: [[-0.45, 0.06], [-0.5, -0.24], [-0.38, -0.55], [-0.06, -0.66], [0.3, -0.6], [0.48, -0.36], [0.47, 0.04], [0.4, -0.06], [0.36, -0.2], [0.27, -0.13],
      [0.2, -0.22], [0.1, -0.13], [0.0, -0.22], [-0.1, -0.12], [-0.2, -0.21], [-0.3, -0.12], [-0.38, -0.2], [-0.41, -0.04]],
    back: [[-0.46, 0.08], [-0.5, -0.24], [-0.38, -0.55], [0.0, -0.66], [0.38, -0.55], [0.5, -0.24], [0.46, 0.08], [0.38, 0.3], [0.18, 0.36], [0, 0.32], [-0.18, 0.36], [-0.38, 0.3]],
    side: [[-0.47, 0.2], [-0.52, -0.08], [-0.44, -0.4], [-0.2, -0.6], [0.12, -0.62], [0.36, -0.48], [0.43, -0.25], [0.34, -0.2], [0.3, -0.28], [0.18, -0.2], [0.05, -0.26], [-0.1, -0.1], [-0.2, 0.12]],
  },
  teen: { // side-swept fringe over one eye (very 2008)
    front: [[-0.44, 0.12], [-0.48, -0.25], [-0.36, -0.55], [0.0, -0.66], [0.33, -0.6], [0.48, -0.34], [0.46, 0.08], [0.38, 0.0], [0.33, -0.18], [0.12, -0.2],
      [-0.12, -0.08], [-0.3, 0.02], [-0.38, -0.02]],
    back: [[-0.45, 0.1], [-0.49, -0.26], [-0.36, -0.55], [0.0, -0.65], [0.36, -0.55], [0.49, -0.26], [0.45, 0.1], [0.38, 0.36], [0.15, 0.4], [0, 0.36], [-0.15, 0.4], [-0.38, 0.36]],
    side: [[-0.45, 0.28], [-0.5, -0.06], [-0.43, -0.38], [-0.2, -0.59], [0.12, -0.62], [0.38, -0.48], [0.44, -0.18], [0.36, -0.06], [0.26, -0.2], [0.08, -0.26], [-0.1, -0.06], [-0.2, 0.2]],
  },
  dad: {
    front: [[-0.41, -0.04], [-0.43, -0.28], [-0.32, -0.5], [0.0, -0.57], [0.32, -0.5], [0.43, -0.28], [0.41, -0.04], [0.37, -0.18], [0.24, -0.35], [0.08, -0.33],
      [0.0, -0.37], [-0.08, -0.33], [-0.24, -0.35], [-0.37, -0.18]],
    back: [[-0.41, 0.0], [-0.44, -0.28], [-0.32, -0.5], [0.0, -0.57], [0.32, -0.5], [0.44, -0.28], [0.41, 0.0], [0.33, 0.2], [0, 0.22], [-0.33, 0.2]],
    side: [[-0.42, 0.1], [-0.46, -0.1], [-0.4, -0.36], [-0.18, -0.53], [0.1, -0.55], [0.3, -0.44], [0.24, -0.38], [0.08, -0.4], [-0.08, -0.2], [-0.18, 0.06]],
  },
  buzz: {
    front: [[-0.41, -0.02], [-0.42, -0.27], [-0.31, -0.48], [0.0, -0.54], [0.31, -0.48], [0.42, -0.27], [0.41, -0.02], [0.36, -0.2], [0.2, -0.32], [0, -0.34], [-0.2, -0.32], [-0.36, -0.2]],
    back: [[-0.41, 0.02], [-0.43, -0.27], [-0.31, -0.48], [0.0, -0.54], [0.31, -0.48], [0.43, -0.27], [0.41, 0.02], [0.32, 0.2], [0, 0.22], [-0.32, 0.2]],
    side: [[-0.42, 0.1], [-0.45, -0.1], [-0.39, -0.35], [-0.18, -0.51], [0.1, -0.53], [0.3, -0.42], [0.22, -0.36], [0.05, -0.36], [-0.1, -0.18], [-0.18, 0.06]],
  },
};

// ---------------------------------------------------------------- scratch canvases
const _tc = {};
function tcv(name, w, h) {
  if (!_tc[name] || _tc[name].width !== w || _tc[name].height !== h) { const c = document.createElement("canvas"); c.width = w; c.height = h; _tc[name] = c; }
  const c = _tc[name], x = c.getContext("2d");
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = "source-over"; x.globalAlpha = 1; x.filter = "none"; x.clearRect(0, 0, w, h);
  return [c, x];
}
const shade = (hex, k) => { // k<1 darker, k>1 lighter
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255, f = v => Math.max(0, Math.min(255, Math.round(k < 1 ? v * k : v + (255 - v) * (k - 1))));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
};

// ---------------------------------------------------------------- the figure
function toon(G, X, Y, H, P, look, light = {}) {
  const Wc = G.canvas.width, Hc = G.canvas.height;
  const M = G.getTransform(), ms = Math.hypot(M.a, M.b);   // draw through the caller's camera
  const [F, g] = tcv("toonF", Wc, Hc); g.setTransform(M);
  const L = typeof look === "string" ? LOOK[look] : look, B = P.body, f = P.face || 1;
  const view = P.view, side = view === "side", back = view === "back";
  const T = p => [X + p[0] * H * f, Y - p[1] * H];
  const J = {}; for (const k in P.j) J[k] = T(P.j[k]);
  const hipC = [(J.hipA[0] + J.hipB[0]) / 2, (J.hipA[1] + J.hipB[1]) / 2];
  const lim = (B.limb || 1) * H, sc = keys => prof(keys.map(([s, a, b]) => [s, a * lim, b * lim]));
  const isLeft = p => p[0] < hipC[0];
  const fill = (col, fn) => { const p = new Path2D(); fn(p); g.fillStyle = col; g.fill(p); return p; };
  const loc = (pts, ox, oy, ang, sx, sy, scale) => { const c = Math.cos(ang), s = Math.sin(ang);
    return pts.map(([x, y]) => { x *= sx * scale; y *= sy * scale; return [ox + x * c - y * s, oy + x * s + y * c]; }); };
  const near = side ? "A" : null, order = side ? ["B", "A"] : ["A", "B"];
  const dim = (col, s) => side && s === "B" ? shade(col, 0.78) : col;

  // ---- legs (trousers or bare legs below shorts) and shoes
  function leg(s) {
    const hp = J["hip" + s], kn = J["kn" + s], an = J["an" + s], pts = [hp, kn, an];
    const trousers = L.legs.kind === "trousers";
    const keys = trousers ? [[0, 0.062, 0.056], [0.45, 0.05, 0.046], [0.6, 0.048, 0.045], [1, 0.042, 0.04]]
                          : [[0, 0.055, 0.05], [0.42, 0.04, 0.036], [0.5, 0.034, 0.032], [0.62, 0.038, 0.035], [0.88, 0.026, 0.024], [1, 0.024, 0.022]];
    fill(dim(trousers ? L.legs.col : L.skin, s), p => ribbon(p, pts, sc(keys)));
    // shoe / slipper
    const sh = side ? [[-0.03, -0.012], [-0.034, 0.024], [0.03, 0.03], [0.1, 0.028], [0.11, 0.012], [0.06, -0.008], [0.0, -0.016]]
                    : [[-0.03, -0.01], [-0.036, 0.022], [0, 0.032], [0.036, 0.022], [0.03, -0.01]];
    const near = P.seated && !side && L.body !== "kid" ? 1.25 : 1;
    fill(dim(L.shoes, s), p => closedCurve(p, loc(sh, an[0], an[1] + (near - 1) * 0.04 * H, 0, side ? f : 1, 1, lim * near)));
  }
  // ---- shorts
  function shorts() {
    if (L.legs.kind !== "shorts") return;
    for (const s of order) fill(dim(L.legs.col, s), p => ribbon(p, [J["hip" + s], J["kn" + s], J["an" + s]], sc([[0, 0.07, 0.066], [0.4, 0.064, 0.06]]), { s1: 0.42, capB: false }));
    if (!side) fill(L.legs.col, p => p.ellipse(hipC[0], hipC[1] - 0.012 * H, (B.hipX + 0.05) * H, 0.05 * H, 0, 0, 7));
    else fill(L.legs.col, p => p.ellipse(hipC[0], hipC[1] - 0.01 * H, 0.06 * H, 0.04 * H, 0, 0, 7));
  }
  // ---- torso / shirt
  const N = J.neck, ux = N[0] - hipC[0], uy = N[1] - hipC[1], uL = Math.hypot(ux, uy);
  const vx = -uy / uL * (side ? f : 1), vy = ux / uL * (side ? f : 1);
  const at = (t, w) => [hipC[0] + ux * t + vx * w * H, hipC[1] + uy * t + vy * w * H];
  const baggy = L.shirt.baggy ? 1 : 0, sx = B.shX;
  function torso() {
    const hem = P.seated && !side ? 0.02 - 0.12 * baggy : -0.06 - 0.32 * baggy, wid = sx - 0.004 + 0.045 * baggy;
    let pts;
    if (side) pts = [at(hem, 0.075 + 0.03 * baggy), at(0.3, 0.07 + 0.02 * baggy), at(0.65, 0.078), at(0.9, 0.06), at(1.0, 0.03),
      at(1.0, -0.035), at(0.88, -0.07), at(0.55, -0.068), at(0.2, -0.066 - 0.02 * baggy), at(hem, -0.075 - 0.03 * baggy)];
    else pts = [at(hem, -wid), at(0.35, -(sx - 0.006 + 0.03 * baggy)), at(0.75, -(sx + 0.004)), at(0.97, -(sx + 0.018)), at(1.02, -0.06),
      at(1.02, 0), at(1.02, 0.06), at(0.97, sx + 0.018), at(0.75, sx + 0.004), at(0.35, sx - 0.006 + 0.03 * baggy), at(hem, wid)];
    if (L.shirt.vest) { // white vest: bare shoulders, narrow straps
      fill(L.skin, p => closedCurve(p, pts));
      const v = side ? pts : [at(hem, -wid), at(0.35, -(sx - 0.01)), at(0.72, -(sx - 0.02)), at(0.84, -(sx - 0.05)), at(1.0, -0.05),
        at(0.86, 0), at(1.0, 0.05), at(0.84, sx - 0.05), at(0.72, sx - 0.02), at(0.35, sx - 0.01), at(hem, wid)];
      fill(L.shirt.col, p => closedCurve(p, v));
      return;
    }
    fill(L.shirt.col, p => closedCurve(p, pts));
    if (L.shirt.trim && !side) { // collar
      g.strokeStyle = L.shirt.trim; g.lineWidth = 0.012 * H; g.beginPath();
      const a = at(1.0, -0.055), b = at(back ? 1.0 : 0.93, 0), c = at(1.0, 0.055);
      g.moveTo(...a); g.quadraticCurveTo(b[0], b[1], c[0], c[1]); g.stroke();
    }
    if (back && L.shirt.number) {
      const c = at(0.55 + 0.08 * baggy, 0), ang = Math.atan2(ux, -uy);
      g.save(); g.translate(c[0], c[1]); g.rotate(ang); g.fillStyle = "rgba(255,255,255,0.88)"; g.textAlign = "center"; g.textBaseline = "middle";
      g.font = `700 ${(0.16 + 0.03 * baggy) * H}px Oswald, sans-serif`; g.fillText(L.shirt.number, 0, 0); g.restore();
    }
  }
  // ---- seated, facing the camera: thighs come toward us over the shirt hem
  function lap() {
    const trousers = L.legs.kind === "trousers", col = trousers || L.legs.kind === "shorts" ? L.legs.col : L.skin;
    for (const s of ["A", "B"]) {
      const hp = J["hip" + s], kn = J["kn" + s], sd = isLeft(kn) ? -1 : 1;
      fill(col, p => p.ellipse((hp[0] + kn[0]) / 2 + sd * 0.006 * H, (hp[1] + kn[1]) / 2, 0.074 * lim, 0.058 * lim, 0, 0, 7));
      fill(shade(trousers ? col : (L.legs.kind === "shorts" ? L.skin : col), 1.08), p => p.ellipse(kn[0] + sd * 0.004 * H, kn[1] + 0.03 * lim, 0.052 * lim, 0.034 * lim, 0, 0, 7));
    }
    if (L.legs.kind === "shorts") for (const s of ["A", "B"]) { const kn = J["kn" + s]; fill(L.skin, p => p.ellipse(kn[0], kn[1] + 0.035 * lim, 0.045 * lim, 0.028 * lim, 0, 0, 7)); }
  }
  // ---- arms
  function arm(s) {
    const sh = J["sh" + s], el = J["el" + s], wr = J["wr" + s], pts = [sh, el, wr];
    const sleeveTo = L.shirt.vest ? 0 : (baggy ? 0.5 : 0.3);
    fill(dim(L.skin, s), p => ribbon(p, pts, sc([[0, 0.03, 0.03], [0.5, 0.028, 0.027], [0.62, 0.03, 0.028], [1, 0.022, 0.021]])));
    if (sleeveTo) fill(dim(L.shirt.col, s), p => ribbon(p, pts, sc([[0, 0.03, 0.03], [0.1, 0.042, 0.042], [sleeveTo, 0.044 + 0.008 * baggy, 0.044 + 0.008 * baggy]]), { s1: sleeveTo, capB: false }));
    // hand
    const h = (P.hands && P.hands[s]) || "open", dir = [wr[0] - el[0], wr[1] - el[1]], ang = Math.atan2(dir[1], dir[0]) - Math.PI / 2;
    const th = (isLeft(sh) ? 1 : -1) * (back ? -1 : 1) * (side ? -f : 1);
    const hand = h === "fist" ? [[-0.022, 0], [-0.03, 0.025], [-0.026, 0.05], [0, 0.058], [0.026, 0.05], [0.03, 0.025], [0.022, 0]]
                              : [[-0.022, 0], [-0.028, 0.03], [-0.024, 0.07], [-0.008, 0.082], [0.012, 0.078], [0.024, 0.06], [0.026, 0.03], [0.022, 0]];
    fill(dim(L.skin, s), p => closedCurve(p, loc(hand, wr[0], wr[1], ang, th, 1, lim)));
    fill(dim(L.skin, s), p => ribbon(p, loc([[0.02, 0.012], [0.036, 0.04]], wr[0], wr[1], ang, th, 1, lim), () => [0.009 * lim, 0.009 * lim]));
    if (P.remote === s) { // the remote, held along the hand, pointing on from the fist
      const r = loc([[-0.016, 0.02], [-0.016, 0.13], [0.016, 0.13], [0.016, 0.02]], wr[0], wr[1], ang + (P.remoteAng || 0), 1, 1, lim);
      fill("#15171c", p => { p.moveTo(...r[0]); r.slice(1).forEach(q => p.lineTo(...q)); p.closePath(); });
      if (P.led) { const q = loc([[0, 0.125]], wr[0], wr[1], ang + (P.remoteAng || 0), 1, 1, lim)[0]; fill("#ff3b30", p => p.arc(q[0], q[1], 0.006 * lim, 0, 7)); }
    }
  }
  // ---- head
  const hd = P.head || {}, tilt = (hd.tilt || 0) * f, headPx = B.headH * H;
  const hC = (() => { const d = (0.5 * B.headH + 0.014) * H, a = tilt; return [N[0] + Math.sin(a) * d + (side ? 0.012 * f * H : 0), N[1] - Math.cos(a) * d]; })();
  function head() {
    const kid = L.body === "kid", sxh = side ? f : 1;
    // neck
    fill(L.skin, p => { const w = 0.034 * H; p.moveTo(N[0] - w, N[1] + 0.01 * H); p.lineTo(hC[0] - w * 0.9, hC[1] + 0.3 * headPx); p.lineTo(hC[0] + w * 0.9, hC[1] + 0.3 * headPx); p.lineTo(N[0] + w, N[1] + 0.01 * H); p.closePath(); });
    const H2 = (pts, sxx = sxh) => loc(pts, hC[0], hC[1], tilt, sxx, 1, headPx);
    if (back) {
      fill(L.skin, p => closedCurve(p, H2(HEADS[kid ? "kid" : "adult"])));
      for (const sd of [-1, 1]) fill(L.skin, p => { const q = H2([[sd * 0.4, 0.06]])[0]; p.ellipse(q[0], q[1], 0.07 * headPx, 0.12 * headPx, 0, 0, 7); });
      fill(L.hair.col, p => closedCurve(p, H2(HAIRS[L.hair.style].back)));
      return;
    }
    if (side) {
      fill(L.skin, p => closedCurve(p, H2(HEADS[kid ? "sideKid" : "sideAdult"])));
      if (L.beard) { g.save(); g.globalAlpha = L.beard * 0.25; fill(L.hair.col, p => closedCurve(p, H2([[0.0, 0.2], [0.3, 0.3], [0.36, 0.34], [0.33, 0.45], [0.18, 0.5], [0.0, 0.42], [-0.14, 0.3]]))); g.restore(); }
      fill(shade(L.skin, 0.88), p => { const q = H2([[-0.06, 0.06]])[0]; p.ellipse(q[0], q[1], 0.07 * headPx, 0.11 * headPx, tilt, 0, 7); });   // ear
      face(true, H2);
      fill(L.hair.col, p => closedCurve(p, H2(HAIRS[L.hair.style].side)));
      return;
    }
    // front
    for (const sd of [-1, 1]) fill(shade(L.skin, 0.92), p => { const q = H2([[sd * (kid ? 0.42 : 0.39), 0.05]])[0]; p.ellipse(q[0], q[1], 0.075 * headPx, 0.12 * headPx, 0, 0, 7); });
    fill(L.skin, p => closedCurve(p, H2(HEADS[kid ? "kid" : "adult"])));
    if (L.beard) { g.save(); g.globalAlpha = L.beard * 0.22; g.filter = `blur(${0.02 * headPx}px)`; fill(L.hair.col, p => closedCurve(p, H2([[-0.36, 0.16], [-0.3, 0.34], [-0.15, 0.46], [0, 0.5], [0.15, 0.46], [0.3, 0.34], [0.36, 0.16],
      [0.26, 0.3], [0.12, 0.27], [0, 0.29], [-0.12, 0.27], [-0.26, 0.3]]))); g.restore(); }
    face(false, H2);
    fill(L.hair.col, p => closedCurve(p, H2(HAIRS[L.hair.style].front)));
    if (L.glasses) { g.strokeStyle = "#16181c"; g.lineWidth = 0.025 * headPx; for (const sd of [-1, 1]) { const q = H2([[sd * 0.17, 0.05]])[0]; g.beginPath(); g.ellipse(q[0], q[1], 0.12 * headPx, 0.085 * headPx, tilt, 0, 7); g.stroke(); } }
  }
  function face(prof, H2) {
    const kid = L.body === "kid", e = P.expr || {}, ey = kid ? 0.08 : 0.04, ex = kid ? 0.17 : 0.16, er = (kid ? 0.07 : 0.055) * headPx;
    const eyes = e.eyes || "open", mouth = e.mouth || "flat", brows = e.brows || "neutral";
    const ink = "#1b1a20";
    const eyeAt = prof ? [[0.27, ey]] : [[-ex, ey], [ex, ey]];
    eyeAt.forEach(([x, y]) => {
      const q = H2([[x, y]])[0];
      if (eyes === "closed" || eyes === "down") {
        g.strokeStyle = ink; g.lineWidth = 0.028 * headPx; g.lineCap = "round"; g.beginPath();
        if (eyes === "closed") g.arc(q[0], q[1] - er * 0.3, er * 0.9, 0.2 * Math.PI, 0.8 * Math.PI);
        else { g.moveTo(q[0] - er * 0.9, q[1] + er * 0.1); g.quadraticCurveTo(q[0], q[1] + er * 0.7, q[0] + er * 0.9, q[1] + er * 0.1); }
        g.stroke(); g.lineCap = "butt"; return;
      }
      const sy = eyes === "wide" ? 1.25 : eyes === "tired" ? 0.62 : 1;
      fill(ink, p => p.ellipse(q[0], q[1] + (eyes === "tired" ? er * 0.25 : 0), er * (prof ? 0.7 : 0.85), er * sy, tilt, 0, 7));
      fill("rgba(255,255,255,0.9)", p => p.arc(q[0] + er * 0.3 * (prof ? f : 1), q[1] - er * 0.35 * sy, er * 0.28, 0, 7));
      if (eyes === "tired") { g.strokeStyle = ink; g.lineWidth = 0.02 * headPx; g.beginPath(); g.moveTo(q[0] - er, q[1] - er * 0.2); g.lineTo(q[0] + er, q[1] - er * 0.2); g.stroke(); }
    });
    // brows
    g.strokeStyle = shade(L.hair.col, 1.0); g.lineWidth = (kid ? 0.028 : 0.03) * headPx; g.lineCap = "round";
    const bAt = prof ? [[0.27, -1]] : [[-ex, -1], [ex, 1]];
    bAt.forEach(([x, sd]) => {
      const lift = brows === "raised" ? -0.06 : 0, inner = brows === "sad" ? -0.04 : brows === "angry" ? 0.04 : 0, outer = brows === "sad" ? 0.015 : 0;
      const a = H2([[x - 0.08 * (prof ? 1 : 1), ey - 0.15 + lift + (sd < 0 ? outer : inner)]])[0], b = H2([[x + 0.08, ey - 0.15 + lift + (sd < 0 ? inner : outer)]])[0];
      g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke();
    });
    g.lineCap = "butt";
    // nose
    if (!prof) { g.strokeStyle = shade(L.skin, 0.72); g.lineWidth = 0.025 * headPx; g.lineCap = "round"; g.beginPath();
      const a = H2([[0.02, ey + 0.08]])[0], b = H2([[0.045, ey + 0.17]])[0], c = H2([[-0.01, ey + 0.19]])[0];
      g.moveTo(...a); g.quadraticCurveTo(b[0], b[1], c[0], c[1]); g.stroke(); g.lineCap = "butt"; }
    // mouth
    const my = ey + (kid ? 0.25 : 0.29), mx = prof ? 0.33 : 0, mw = kid ? 0.09 : 0.1;
    if (mouth === "open" || mouth === "shout") {
      const q = H2([[mx, my + 0.03]])[0], r = (mouth === "shout" ? 0.11 : 0.08) * headPx;
      fill("#5a1b20", p => { if (prof) p.ellipse(q[0] - r * 0.3 * f, q[1], r * 0.5, r * 0.8, tilt, 0, 7); else { p.ellipse(q[0], q[1], r * 1.1, r * 0.9, tilt, 0, Math.PI); p.closePath(); } });
      if (!prof) fill("#f4f2ee", p => { p.rect(q[0] - r * 0.8, q[1], r * 1.6, r * 0.22); });
    } else {
      g.strokeStyle = shade(L.skin, 0.55); g.lineWidth = 0.025 * headPx; g.lineCap = "round"; g.beginPath();
      const bend = mouth === "sad" ? -0.035 : mouth === "smile" ? 0.05 : 0;
      if (prof) { const a = H2([[0.3, my]])[0], b = H2([[0.37, my - bend * 0.5]])[0]; g.moveTo(...a); g.lineTo(...b); }
      else { const a = H2([[-mw, my]])[0], b = H2([[0, my + bend]])[0], c = H2([[mw, my]])[0]; g.moveTo(...a); g.quadraticCurveTo(b[0], b[1] + bend * headPx, c[0], c[1]); }
      g.stroke(); g.lineCap = "butt";
    }
    if (L.blush) { g.save(); g.globalAlpha = L.blush; for (const [x] of (prof ? [[0.22]] : [[-0.25], [0.25]])) fill("#e88a8a", p => { const q = H2([[x, ey + 0.15]])[0]; p.ellipse(q[0], q[1], 0.07 * headPx, 0.04 * headPx, 0, 0, 7); }); g.restore(); }
  }

  // ---- draw order
  const armsFront = !side && !back && P.armsFront;
  if (side) { arm("B"); leg("B"); shorts(); torso(); leg("A"); head(); arm("A"); }
  else if (back) { leg("A"); leg("B"); shorts(); arm("A"); arm("B"); torso(); head(); }
  else if (P.seated) { leg("A"); leg("B"); torso(); head(); lap(); arm("A"); arm("B"); }
  else { leg("A"); leg("B"); shorts(); if (!armsFront) { arm("A"); arm("B"); } torso(); head(); if (armsFront) { arm("A"); arm("B"); } }

  // ---- lighting (screen space): night ambience, light falling from the source, shadow edge, rim
  g.setTransform(1, 0, 0, 1, 0, 0);
  const wx = light.x != null ? light.x : X, wy = light.y != null ? light.y : Y - H, amb = light.amb || "#55607a";
  const lx = M.a * wx + M.c * wy + M.e, ly = M.b * wx + M.d * wy + M.f;
  const cX = M.a * X + M.c * (Y - H * 0.6) + M.e, cY = M.b * X + M.d * (Y - H * 0.6) + M.f;
  const [Lc, l] = tcv("toonL", Wc, Hc); l.drawImage(F, 0, 0);            // the figure's mask
  // light map: night ambience plus the source's pool, multiplied into the colours (keeps them saturated)
  const [Mc, m] = tcv("toonM", Wc, Hc);
  m.fillStyle = amb; m.fillRect(0, 0, Wc, Hc);
  if (light.col) {
    const lg = m.createRadialGradient(lx, ly, 0, lx, ly, (light.r || H * 1.6) * ms);
    lg.addColorStop(0, light.col); lg.addColorStop(0.55, light.col.replace(/[\d.]+\)$/, v => (parseFloat(v) * 0.55).toFixed(3) + ")")); lg.addColorStop(1, "rgba(0,0,0,0)");
    m.globalCompositeOperation = "lighter"; m.globalAlpha = light.amount == null ? 1 : Math.min(1.4, light.amount);
    m.fillStyle = lg; m.fillRect(0, 0, Wc, Hc); m.globalAlpha = 1; m.globalCompositeOperation = "source-over";
  }
  g.save(); g.globalCompositeOperation = "multiply"; g.drawImage(Mc, 0, 0); g.globalCompositeOperation = "destination-in"; g.drawImage(Lc, 0, 0); g.restore();
  // shadow edge away from the light, rim toward it
  const dx = lx - cX, dy = ly - cY, dl = Math.hypot(dx, dy) || 1, k = Math.max(3, H * 0.012 * ms);
  const ox = dx / dl * k, oy = dy / dl * k;
  const [Sc, s2] = tcv("toonS", Wc, Hc); s2.drawImage(Lc, 0, 0); s2.globalCompositeOperation = "destination-out"; s2.drawImage(Lc, ox * 2.2, oy * 2.2);
  s2.globalCompositeOperation = "source-in"; s2.fillStyle = "rgba(10,12,30,0.32)"; s2.fillRect(0, 0, Wc, Hc);
  g.save(); g.filter = `blur(${k * 0.9}px)`; g.globalCompositeOperation = "source-atop"; g.drawImage(Sc, 0, 0); g.restore();
  if (light.rim) {
    const [Rc, r2] = tcv("toonR", Wc, Hc); r2.drawImage(Lc, 0, 0); r2.globalCompositeOperation = "destination-out"; r2.drawImage(Lc, -ox, -oy);
    r2.globalCompositeOperation = "source-in"; r2.fillStyle = light.rim; r2.fillRect(0, 0, Wc, Hc);
    g.save(); g.globalCompositeOperation = "source-atop"; g.filter = `blur(${k * 0.35}px)`; g.drawImage(Rc, 0, 0); g.restore();
  }
  G.save(); G.setTransform(1, 0, 0, 1, 0, 0); if (light.alpha != null) G.globalAlpha = light.alpha; G.drawImage(F, 0, 0); G.restore();
}
