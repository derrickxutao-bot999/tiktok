// Ink silhouette of No.10 (v2): continuous anatomical contours instead of
// capsules. Poses are joints in figure-height units (feet at 0, up = +y).
// drawFig(g, x, y, H, pose, opts) — x,y = ground point, H = figure height px.
//   opts: face (1|-1), ink, young (no beard), name, number, numberInk,
//         rim {color, dx, dy}, armband ("A"|"B"), sep (separation line colour)

const INK = "#111111";
const smooth = t => t * t * (3 - 2 * t);

// width profile: keys [s, left, right] in px, eased between keys
function prof(keys) {
  return s => {
    if (s <= keys[0][0]) return [keys[0][1], keys[0][2]];
    for (let i = 1; i < keys.length; i++) if (s <= keys[i][0]) {
      const a = keys[i - 1], b = keys[i], u = smooth((s - a[0]) / (b[0] - a[0]));
      return [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
    }
    const k = keys[keys.length - 1]; return [k[1], k[2]];
  };
}

function spline(pts, seg = 16) {
  const out = [], n = pts.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    for (let k = 0; k < seg; k++) {
      const t = k / seg, t2 = t * t, t3 = t2 * t, c = d =>
        0.5 * (2 * p1[d] + (p2[d] - p0[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (3 * p1[d] - p0[d] - 3 * p2[d] + p3[d]) * t3);
      out.push([c(0), c(1)]);
    }
  }
  out.push(pts[n - 1].slice());
  return out;
}

// sampler along a joint chain: s in [0,1] -> point, unit tangent, left normal
function chain(pts) {
  const sp = spline(pts), L = [0];
  for (let i = 1; i < sp.length; i++) L.push(L[i - 1] + Math.hypot(sp[i][0] - sp[i - 1][0], sp[i][1] - sp[i - 1][1]));
  const tot = L[L.length - 1] || 1;
  return s => {
    const d = Math.max(0, Math.min(1, s)) * tot; let i = 1;
    while (i < sp.length - 1 && L[i] < d) i++;
    const a = sp[i - 1], b = sp[i], u = (d - L[i - 1]) / ((L[i] - L[i - 1]) || 1);
    const tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1;
    return { p: [a[0] + tx * u, a[1] + ty * u], t: [tx / tl, ty / tl], n: [-ty / tl, tx / tl] };
  };
}

// tapered limb outline along a chain; pf(s) -> [left, right] in px
function ribbon(P, pts, pf, o = {}) {
  const { s0 = 0, s1 = 1, capA = true, capB = true, N = 48 } = o, at = chain(pts), Lf = [], Rt = [];
  let first, last;
  for (let k = 0; k <= N; k++) {
    const s = s0 + (s1 - s0) * k / N, c = at(s), [wl, wr] = pf(s);
    Lf.push([c.p[0] + c.n[0] * wl, c.p[1] + c.n[1] * wl]); Rt.push([c.p[0] - c.n[0] * wr, c.p[1] - c.n[1] * wr]);
    if (k === 0) first = c; last = c;
  }
  P.moveTo(Lf[0][0], Lf[0][1]); for (const q of Lf) P.lineTo(q[0], q[1]);
  const cap = (a, b, c, fwd) => {
    const cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2, r = Math.hypot(a[0] - b[0], a[1] - b[1]) / 2;
    const th = Math.atan2(c.n[1], c.n[0]);
    if (fwd) P.arc(cx, cy, r, th, th - Math.PI, true); else P.arc(cx, cy, r, th + Math.PI, th, true);
  };
  const e = Lf[N], r = Rt[N];
  if (capB) cap(e, r, last, true); else P.lineTo(r[0], r[1]);
  for (let k = N; k >= 0; k--) P.lineTo(Rt[k][0], Rt[k][1]);
  if (capA) cap(Lf[0], Rt[0], first, false);
  P.closePath();
}

function closedCurve(P, pts) { // Catmull-Rom closed curve into a Path2D
  const n = pts.length; P.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    P.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  P.closePath();
}
const mirrorHalf = (top, half, bottom) => [top, ...half, bottom, ...half.slice().reverse().map(([x, y]) => [-x, y])];

// ---------- local shapes (H units, y down) ----------
// heads: origin = head centre; side head faces +x
const HEAD = {
  front: mirrorHalf([0, -0.075], [[0.022, -0.072], [0.039, -0.064], [0.048, -0.046], [0.051, -0.024], [0.049, -0.006], [0.054, -0.002],
    [0.055, 0.012], [0.05, 0.022], [0.047, 0.027], [0.045, 0.043], [0.035, 0.059], [0.019, 0.069]], [0, 0.073]),
  frontYoung: mirrorHalf([0, -0.075], [[0.022, -0.072], [0.039, -0.064], [0.048, -0.046], [0.051, -0.024], [0.049, -0.006], [0.054, -0.002],
    [0.055, 0.012], [0.05, 0.022], [0.044, 0.028], [0.039, 0.046], [0.026, 0.06], [0.012, 0.067]], [0, 0.069]),
  back: mirrorHalf([0, -0.074], [[0.024, -0.071], [0.041, -0.06], [0.05, -0.04], [0.052, -0.018], [0.049, -0.004], [0.054, 0.002],
    [0.053, 0.016], [0.046, 0.022], [0.042, 0.04], [0.032, 0.054], [0.016, 0.062]], [0, 0.064]),
  side: [[-0.05, 0.03], [-0.058, 0.004], [-0.056, -0.03], [-0.04, -0.058], [-0.012, -0.073], [0.018, -0.072], [0.042, -0.058],
    [0.054, -0.036], [0.058, -0.016], [0.055, -0.004], [0.062, 0.008], [0.068, 0.02], [0.059, 0.026], [0.062, 0.034],
    [0.062, 0.046], [0.055, 0.06], [0.038, 0.066], [0.016, 0.062], [-0.004, 0.056], [-0.024, 0.05], [-0.04, 0.046]],
  sideYoung: [[-0.05, 0.03], [-0.058, 0.004], [-0.056, -0.03], [-0.04, -0.058], [-0.012, -0.073], [0.018, -0.072], [0.042, -0.058],
    [0.054, -0.036], [0.058, -0.016], [0.055, -0.004], [0.062, 0.008], [0.068, 0.02], [0.059, 0.026], [0.061, 0.034],
    [0.058, 0.048], [0.048, 0.058], [0.028, 0.06], [0.008, 0.054], [-0.012, 0.05], [-0.036, 0.046]],
};
// hair tufts: [angle deg, radius] around the skull top
const TUFTS = {
  front: [], back: [], side: [],
};
// hands: origin = wrist, +y along the forearm, thumb on +x
const HAND = {
  open: [[-0.016, 0], [-0.02, 0.026], [-0.021, 0.056], [-0.016, 0.084], [-0.006, 0.096], [0.006, 0.094], [0.014, 0.08],
    [0.019, 0.056], [0.02, 0.03], [0.016, 0]],
  fist: [[-0.016, 0], [-0.022, 0.018], [-0.024, 0.042], [-0.017, 0.058], [-0.002, 0.063], [0.014, 0.06], [0.024, 0.046],
    [0.027, 0.028], [0.022, 0.012], [0.016, 0]],
  hold: [[-0.016, 0], [-0.022, 0.024], [-0.026, 0.052], [-0.024, 0.08], [-0.012, 0.094], [0.004, 0.09], [0.012, 0.074],
    [0.017, 0.05], [0.018, 0.026], [0.016, 0]],
};

// limb profiles [s, left, right]; resolved per limb below
const LEG_FRONT = [[0, 0.06, 0.054], [0.2, 0.055, 0.049], [0.4, 0.044, 0.038], [0.49, 0.036, 0.032], [0.57, 0.038, 0.035],
  [0.67, 0.042, 0.038], [0.84, 0.029, 0.026], [0.95, 0.022, 0.02], [1, 0.022, 0.02]];           // [lateral, medial]
const LEG_SIDE = [[0, 0.058, 0.07], [0.2, 0.058, 0.05], [0.4, 0.046, 0.037], [0.49, 0.038, 0.031], [0.58, 0.034, 0.043],
  [0.68, 0.032, 0.046], [0.85, 0.024, 0.026], [0.95, 0.021, 0.022], [1, 0.021, 0.022]];         // [front, back]
const ARM = [[0, 0.03, 0.03], [0.15, 0.033, 0.032], [0.35, 0.031, 0.029], [0.52, 0.025, 0.024], [0.6, 0.028, 0.026],
  [0.8, 0.022, 0.02], [1, 0.017, 0.016]];

let _off = null, _rim = null;
function offscreen(w, h) {
  if (!_off || _off.width !== w || _off.height !== h) {
    _off = document.createElement("canvas"); _off.width = w; _off.height = h;
    _rim = document.createElement("canvas"); _rim.width = w; _rim.height = h;
  }
  return [_off, _rim];
}

function drawFig(G, X, Y, H, P, o = {}) {
  const f = o.face || 1, ink = o.ink || INK, side = P.view === "side", back = P.view === "back";
  const [off, rimC] = offscreen(G.canvas.width, G.canvas.height), g = off.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, off.width, off.height);
  const T = p => [X + p[0] * H * f, Y - p[1] * H];
  const J = {}; for (const k in P.j) J[k] = T(P.j[k]);
  const hipC = [(J.hipA[0] + J.hipB[0]) / 2, (J.hipA[1] + J.hipB[1]) / 2];
  const sc = keys => prof(keys.map(([s, a, b]) => [s, a * H, b * H]));
  const sw = keys => keys.map(([s, a, b]) => [s, b, a]);
  const isLeft = p => p[0] < hipC[0];
  const local = (P2, pts, ox, oy, ang, sx, sy) => {
    const c = Math.cos(ang), s = Math.sin(ang);
    closedCurve(P2, pts.map(([x, y]) => { x *= sx * H; y *= sy * H; return [ox + x * c - y * s, oy + x * s + y * c]; }));
  };
  const parts = [];   // [Path2D, fill, separate?, kind]
  const add = (paths, col, sep) => parts.push([[].concat(paths), col || ink, sep]);
  const shp = fn => { const p = new Path2D(); fn(p); return p; };

  // ---- legs + boots ----
  function leg(s, col) {
    const hp = J["hip" + s], kn = J["kn" + s], an = J["an" + s], Pp = new Path2D(), Pb = new Path2D();
    let keys = side ? LEG_SIDE : LEG_FRONT;
    if (side) { if (f > 0) keys = sw(keys); }       // downward chain: left normal = screen-left
    else if (!isLeft(kn)) keys = sw(keys);
    ribbon(Pp, [hp, kn, an], sc(keys));
    const ft = (P.foot && P.foot[s]) || 0;
    if (side) local(Pb, [[-0.032, -0.015], [-0.036, 0.02], [-0.03, 0.045], [0.02, 0.048], [0.09, 0.046], [0.112, 0.04],
      [0.11, 0.028], [0.07, 0.012], [0.03, -0.004], [0.01, -0.016]], an[0], an[1], ft * f, f, 1);
    else { const lift = (P.lift && P.lift[s]) || 0;
      local(Pb, [[-0.021, -0.012], [-0.029, 0.018], [-0.031, 0.04 - lift], [-0.012, 0.048 - lift], [0.012, 0.048 - lift],
        [0.031, 0.04 - lift], [0.029, 0.018], [0.021, -0.012]], an[0], an[1], 0, 1, 1); }
    add([Pp, Pb], col);
  }
  // ---- shorts ----
  function shorts(col) {
    const Pp = new Path2D();
    if (side) {
      const L = ["B", "A"].map(s => shp(p => ribbon(p, [J["hip" + s], J["kn" + s], J["an" + s]],
        sc(f > 0 ? [[0, 0.07, 0.066], [0.35, 0.058, 0.055]] : [[0, 0.066, 0.07], [0.35, 0.055, 0.058]]), { s1: 0.35, capB: false })));
      L.push(shp(p => p.ellipse(hipC[0], hipC[1] - 0.025 * H, 0.068 * H, 0.05 * H, 0, 0, 7)));
      add(L, col); return;
    } else {
      const hem = s => { const c = chain([J["hip" + s], J["kn" + s], J["an" + s]])(0.34), l = isLeft(J["kn" + s]) ? 1 : -1;
        return [[c.p[0] + c.n[0] * 0.067 * H * l, c.p[1] + c.n[1] * 0.067 * H * l], [c.p[0] - c.n[0] * 0.05 * H * l, c.p[1] - c.n[1] * 0.05 * H * l]]; };
      const [oA, iA] = hem("A"), [oB, iB] = hem("B");
      const [L, R] = isLeft(J.hipA) ? [[oA, iA], [oB, iB]] : [[oB, iB], [oA, iA]];
      const wl = [hipC[0] - 0.097 * H, hipC[1] - 0.05 * H], wr = [hipC[0] + 0.097 * H, hipC[1] - 0.05 * H];
      const cr = [hipC[0], hipC[1] + 0.075 * H];
      Pp.moveTo(wl[0], wl[1]); Pp.quadraticCurveTo(wl[0] - 0.012 * H, (wl[1] + L[0][1]) / 2, L[0][0], L[0][1]);
      Pp.lineTo(L[1][0], L[1][1]); Pp.quadraticCurveTo(cr[0] - 0.012 * H, cr[1] + 0.01 * H, cr[0], cr[1]);
      Pp.quadraticCurveTo(cr[0] + 0.012 * H, cr[1] + 0.01 * H, R[1][0], R[1][1]); Pp.lineTo(R[0][0], R[0][1]);
      Pp.quadraticCurveTo(wr[0] + 0.012 * H, (wr[1] + R[0][1]) / 2, wr[0], wr[1]); Pp.closePath();
    }
    add(Pp, col);
  }
  // ---- torso (shirt) ----
  const N = J.neck, ux = N[0] - hipC[0], uy = N[1] - hipC[1], uL = Math.hypot(ux, uy);
  const vx = -uy / uL * (side ? f : 1), vy = ux / uL * (side ? f : 1);
  const at = (t, w) => [hipC[0] + ux * t + vx * w * H, hipC[1] + uy * t + vy * w * H];
  function torso(col) {
    const Pp = new Path2D();
    if (side) closedCurve(Pp, [at(-0.08, 0.073), at(0.25, 0.066), at(0.5, 0.07), at(0.7, 0.079), at(0.88, 0.068), at(1.0, 0.04),
      at(1.02, -0.04), at(0.86, -0.074), at(0.6, -0.066), at(0.35, -0.056), at(0.1, -0.066), at(-0.08, -0.075)]);
    else {
      const shT = s => { const p = J["sh" + s]; return [p[0] + ux / uL * 0.03 * H, p[1] + uy / uL * 0.03 * H]; };
      const [sL, sR] = isLeft(J.shA) ? [shT("A"), shT("B")] : [shT("B"), shT("A")];
      closedCurve(Pp, [at(-0.08, -0.104), at(0.15, -0.1), at(0.4, -0.095), at(0.62, -0.1), at(0.8, -0.108), sL,
        at(1.0, -0.05), at(1.02, 0), at(1.0, 0.05), sR, at(0.8, 0.108), at(0.62, 0.1), at(0.4, 0.095), at(0.15, 0.1), at(-0.08, 0.104)]);
    }
    add(Pp, col);
  }
  // ---- neck + head ----
  const tilt = (P.tilt || 0) * f, HD = 0.092, hb = side ? [0.01 * f, -1] : [0, -1];
  const hC = [N[0] + (hb[0] * Math.cos(tilt) - hb[1] * Math.sin(tilt)) * HD * H,
              N[1] + (hb[0] * Math.sin(tilt) + hb[1] * Math.cos(tilt)) * HD * H + (side ? 0 : (P.bow || 0) * H)];
  function neckHead(col) {
    const Pp = new Path2D(), Ph = new Path2D(), L = [Pp, Ph], c = Math.cos(tilt), s = Math.sin(tilt);
    const hp = (x, y) => [hC[0] + (x * c - y * s) * H, hC[1] + (x * s + y * c) * H];
    if (side) { const a = hp(-0.034 * f, 0.03), b = hp(0.012 * f, 0.05);
      Pp.moveTo(...at(0.98, 0.036)); Pp.lineTo(b[0], b[1]); Pp.lineTo(a[0], a[1]); Pp.lineTo(...at(0.98, -0.042)); Pp.closePath(); }
    else { const a = hp(-0.03, 0.035), b = hp(0.03, 0.035);
      Pp.moveTo(...at(0.98, -0.048)); Pp.quadraticCurveTo(...at(1.04, -0.034), a[0], a[1]); Pp.lineTo(b[0], b[1]);
      Pp.quadraticCurveTo(...at(1.04, 0.034), ...at(0.98, 0.048)); Pp.closePath(); }
    const key = side ? (o.young ? "sideYoung" : "side") : back ? "back" : (o.young ? "frontYoung" : "front");
    local(Ph, HEAD[key], hC[0], hC[1], tilt, side ? f : 1, 1);
    for (const [deg, r] of TUFTS[side ? "side" : back ? "back" : "front"]) {
      const a = deg * Math.PI / 180, sx = side ? f : 1;
      const p = hp(0.047 * Math.cos(a) * sx, 0.069 * Math.sin(a) - 0.004);
      L.push(shp(q => q.arc(p[0], p[1], r * H, 0, Math.PI * 2)));
    }
    add(L, col);
  }
  // ---- arms (sleeve, arm, hand) ----
  function arm(s, col, sep) {
    const sh = J["sh" + s], el = J["el" + s], wr = J["wr" + s], pts = [sh, el, wr], Pa = new Path2D(), Ph = new Path2D(), Pf = new Path2D();
    ribbon(Pa, pts, sc(ARM));
    const h = (P.hand && P.hand[s]) || "open";
    const dir = P.handDir && P.handDir[s] ? [P.handDir[s][0] * f, -P.handDir[s][1]] : [wr[0] - el[0], wr[1] - el[1]];
    const ang = Math.atan2(dir[1], dir[0]) - Math.PI / 2;
    const th = (P.thumb && P.thumb[s]) || (isLeft(sh) ? 1 : -1) * (back ? -1 : 1);
    const hs = h === "open" ? 0.88 : 1;
    local(Ph, HAND[h === "point" ? "fist" : h], wr[0], wr[1], ang, th * hs, hs);
    if (h === "open" || h === "hold") {
      const c = Math.cos(ang), sn = Math.sin(ang), q = (x, y) => [wr[0] + (x * th * H * c - y * H * sn), wr[1] + (x * th * H * sn + y * H * c)];
      ribbon(Pf, [q(0.012 * hs, 0.018 * hs), q(0.024 * hs, 0.04 * hs), q(0.026 * hs, 0.062 * hs)], () => [0.0072 * H, 0.0072 * H]);
    }
    if (h === "point") {
      const c = Math.cos(ang), sn = Math.sin(ang), q = (x, y) => [wr[0] + (x * th * H * c - y * H * sn), wr[1] + (x * th * H * sn + y * H * c)];
      ribbon(Pf, [q(0.009, 0.05), q(0.009, 0.103)], () => [0.0072 * H, 0.0072 * H]);
    }
    const Ps = new Path2D();
    ribbon(Ps, pts, sc([[0, 0.03, 0.03], [0.12, 0.036, 0.036], [0.27, 0.04, 0.04]]), { s1: 0.27, capB: false });
    add([Pa, Ph, Pf, Ps], col, sep);
    if (o.armband === s) { const Pb = new Path2D(); ribbon(Pb, pts, () => [0.046 * H, 0.046 * H], { s0: 0.17, s1: 0.25, capA: false, capB: false }); add(Pb, o.armbandInk || "#3a3a3a"); }
  }
  function ball(col) {
    if (!P.ball) return; const b = T(P.ball), r = (P.ballR || 0.064) * H, Pp = new Path2D();
    Pp.arc(b[0], b[1], r, 0, Math.PI * 2); add([Pp], col);
    const Pl = new Path2D(), cx = b[0] - r * 0.12, cy = b[1] - r * 0.1; // faint panel seams
    const pent = k => [cx + r * 0.32 * Math.cos(-Math.PI / 2 + k * 2 * Math.PI / 5), cy + r * 0.32 * Math.sin(-Math.PI / 2 + k * 2 * Math.PI / 5)];
    Pl.moveTo(...pent(0)); for (let k = 1; k <= 5; k++) Pl.lineTo(...pent(k % 5));
    for (let k = 0; k < 5; k++) { const p = pent(k), d = [p[0] - cx, p[1] - cy], l = Math.hypot(...d);
      Pl.moveTo(p[0], p[1]); Pl.lineTo(cx + d[0] / l * r * 0.8, cy + d[1] / l * r * 0.8); }
    parts.push([[Pl], null, false, "seam"]);
  }

  const far = o.far || ink;
  if (side) { arm("B", far); leg("B", far); shorts(ink); torso(ink); leg("A", ink); neckHead(ink); ball(ink); arm("A", ink); }
  else {
    leg("A", ink); leg("B", ink); shorts(ink); torso(ink); neckHead(ink);
    const sep = !!P.armsFront, order = P.armOrder || ["A", "B"];
    if (P.ballBehindHand) { ball(ink); arm(order[0], ink, sep); arm(order[1], ink, sep); }
    else { arm(order[0], ink, sep); arm(order[1], ink, sep); ball(ink); }
  }

  // fill; parts crossing the body get a thin separation line
  for (const [paths, col, sep, kind] of parts) {
    if (kind === "seam") { g.strokeStyle = o.seamInk || "rgba(255,255,255,0.13)"; g.lineWidth = Math.max(1, H * 0.0028); paths.forEach(p => g.stroke(p)); continue; }
    if (sep) { g.strokeStyle = o.sep || "rgba(255,255,255,0.16)"; g.lineWidth = Math.max(1.2, H * 0.0035); paths.forEach(p => g.stroke(p)); }
    g.fillStyle = col; paths.forEach(p => g.fill(p));
  }
  if (back && o.number !== false) { // shirt number and name, following the spine
    const c = at(0.6, 0), ang = Math.atan2(ux, -uy);
    g.save(); g.translate(c[0], c[1]); g.rotate(ang);
    g.fillStyle = o.numberInk || "#353535"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `700 ${0.13 * H}px Oswald, Impact, sans-serif`; g.fillText("10", 0, 0);
    if (o.name) { g.font = `700 ${0.034 * H}px Oswald, Impact, sans-serif`; g.fillText(o.name, 0, -0.092 * H); }
    g.restore();
  }
  if (o.rim) { // rim light: inner band on the side facing the light
    const r = rimC.getContext("2d"); r.setTransform(1, 0, 0, 1, 0, 0); r.clearRect(0, 0, rimC.width, rimC.height);
    r.globalCompositeOperation = "source-over"; r.drawImage(off, 0, 0);
    r.globalCompositeOperation = "source-in"; r.fillStyle = o.rim.color; r.fillRect(0, 0, rimC.width, rimC.height);
    r.globalCompositeOperation = "destination-out"; r.drawImage(off, o.rim.dx, o.rim.dy);
    r.globalCompositeOperation = "source-over";
    g.globalCompositeOperation = "source-atop"; g.filter = `blur(${o.rim.blur || 0.8}px)`; g.drawImage(rimC, 0, 0);
    g.filter = "none"; g.globalCompositeOperation = "source-over";
  }
  G.save(); G.setTransform(1, 0, 0, 1, 0, 0); G.globalAlpha = o.alpha == null ? 1 : o.alpha;
  G.filter = `blur(${o.soft == null ? 0.6 : o.soft}px)`; G.drawImage(off, 0, 0); G.restore();
}

// ---------------- poses ----------------
const STAND = { neck: [0, 0.835], shA: [-0.097, 0.808], shB: [0.097, 0.808], hipA: [-0.052, 0.505], hipB: [0.052, 0.505] };
const POSES = {
  // back view, elbows out, both index fingers up, mid-step (signature celebration)
  skyBack: { view: "back", bow: 0.008, hand: { A: "point", B: "point" }, handDir: { A: [0.05, 1], B: [-0.03, 1] }, lift: { A: 0.012 },
    j: { ...STAND, elA: [-0.212, 0.775], elB: [0.226, 0.78], wrA: [-0.198, 0.912], wrB: [0.214, 0.917],
      knA: [-0.06, 0.28], knB: [0.07, 0.276], anA: [-0.04, 0.095], anB: [0.068, 0.05] } },
  // walking away, head bowed
  backWalk: { view: "back", bow: 0.02, lift: { B: 0.014 }, j: { ...STAND, elA: [-0.13, 0.628], elB: [0.128, 0.63],
      wrA: [-0.126, 0.47], wrB: [0.14, 0.476], knA: [-0.058, 0.28], knB: [0.065, 0.29], anA: [-0.062, 0.05], anB: [0.07, 0.085] } },
  // three eras, front view
  relaxed: { view: "front", j: { ...STAND, elA: [-0.142, 0.63], elB: [0.144, 0.63], wrA: [-0.163, 0.47], wrB: [0.166, 0.472],
      knA: [-0.07, 0.285], knB: [0.072, 0.285], anA: [-0.085, 0.05], anB: [0.088, 0.05] } },
  shush: { view: "front", armsFront: true, hand: { A: "point", B: "hold" }, handDir: { A: [0, 1] }, armOrder: ["B", "A"],
    ball: [0.165, 0.5], ballBehindHand: true,
    j: { ...STAND, elA: [-0.07, 0.655], wrA: [-0.008, 0.808], elB: [0.165, 0.64], wrB: [0.198, 0.52],
      knA: [-0.082, 0.285], knB: [0.085, 0.285], anA: [-0.105, 0.05], anB: [0.108, 0.05] } },
  crossed: { view: "front", armsFront: true, hand: { A: "fist", B: "fist" }, armOrder: ["A", "B"],
    j: { ...STAND, elA: [-0.158, 0.668], wrA: [0.07, 0.712], elB: [0.162, 0.672], wrB: [-0.07, 0.7],
      knA: [-0.074, 0.285], knB: [0.076, 0.285], anA: [-0.088, 0.05], anB: [0.09, 0.05] } },
  // hands on hips, head bowed
  hips: { view: "front", bow: 0.028, hand: { A: "fist", B: "fist" }, j: { ...STAND, elA: [-0.2, 0.655], elB: [0.2, 0.655],
      wrA: [-0.1, 0.545], wrB: [0.1, 0.545], knA: [-0.072, 0.285], knB: [0.072, 0.285], anA: [-0.08, 0.05], anB: [0.08, 0.05] } },
  // side: both index fingers to the sky, face up
  sky: { view: "side", tilt: -0.5, hand: { A: "point", B: "point" }, j: {
    neck: [-0.012, 0.84], shA: [-0.004, 0.808], shB: [-0.03, 0.812], elA: [0.06, 0.955], elB: [0.035, 0.965],
    wrA: [0.078, 1.1], wrB: [0.052, 1.11], hipA: [0.0, 0.505], hipB: [-0.02, 0.505],
    knA: [0.012, 0.28], knB: [-0.03, 0.28], anA: [-0.005, 0.05], anB: [-0.055, 0.05] } },
  // side: walking past, head down
  sideWalk: { view: "side", tilt: 0.42, foot: { A: -0.05, B: 0.55 }, j: {
    neck: [0.03, 0.83], shA: [0.03, 0.8], shB: [0.01, 0.805], elA: [0.0, 0.63], elB: [0.07, 0.635],
    wrA: [0.035, 0.47], wrB: [0.1, 0.485], hipA: [0.0, 0.505], hipB: [-0.015, 0.505],
    knA: [0.075, 0.29], knB: [-0.04, 0.28], anA: [0.09, 0.05], anB: [-0.13, 0.09] } },
  // side: low left-foot dribble
  dribble: { view: "side", tilt: 0.55, ball: [0.27, 0.064], foot: { A: 0.1, B: 0.7 }, j: {
    neck: [0.1, 0.79], shA: [0.098, 0.762], shB: [0.075, 0.77], elA: [0.0, 0.64], elB: [0.17, 0.68],
    wrA: [-0.09, 0.57], wrB: [0.24, 0.58], hipA: [0.0, 0.47], hipB: [-0.02, 0.475],
    knA: [0.13, 0.28], knB: [-0.04, 0.25], anA: [0.14, 0.06], anB: [-0.17, 0.12] } },
};
