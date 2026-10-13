"use strict";
/* core.js — math, colour, sprites, particles and silhouette figures shared by every shot */
const W = 1080, H = 1920, FPS = 30;

/* ---------- math ---------- */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const smooth = k => k * k * (3 - 2 * k);
const easeOut = k => 1 - Math.pow(1 - k, 3);
const easeIn = k => k * k * k;
const easeInOut = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const TAU = Math.PI * 2;
function rng(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const hash1 = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function noise1(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash1(i), hash1(i + 1), u) * 2 - 1; }
const fbm1 = x => noise1(x) * .6 + noise1(x * 2.13 + 5.1) * .28 + noise1(x * 4.37 + 11.7) * .12;

/* ---------- colour ---------- */
const hexRGB = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mixHex = (a, b, k, al = 1) => { const x = hexRGB(a), y = hexRGB(b); return rgba([lerp(x[0], y[0], k), lerp(x[1], y[1], k), lerp(x[2], y[2], k)], al); };

/* ---------- canvases & sprites ---------- */
function makeCanvas(w, h) { const c = document.createElement("canvas"); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; }
function radialSprite(size, stops) {
  const c = makeCanvas(size, size), g = c.getContext("2d"), r = size / 2;
  const gr = g.createRadialGradient(r, r, 0, r, r, r);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  g.fillStyle = gr; g.fillRect(0, 0, size, size); return c;
}
const SPR = {
  glowWarm: radialSprite(128, [[0, "rgba(255,244,214,1)"], [.12, "rgba(255,190,105,.9)"], [.4, "rgba(255,140,60,.25)"], [1, "rgba(255,120,40,0)"]]),
  glowCool: radialSprite(128, [[0, "rgba(235,245,255,1)"], [.15, "rgba(170,205,255,.7)"], [.45, "rgba(120,160,230,.18)"], [1, "rgba(100,140,220,0)"]]),
  glowWhite: radialSprite(128, [[0, "rgba(255,255,255,1)"], [.2, "rgba(255,255,255,.55)"], [.5, "rgba(255,255,255,.12)"], [1, "rgba(255,255,255,0)"]]),
  soft: radialSprite(128, [[0, "rgba(255,255,255,.9)"], [.5, "rgba(255,255,255,.35)"], [1, "rgba(255,255,255,0)"]]),
  // lens bokeh: flat disc with a slightly brighter rim and soft edge
  bokehWarm: radialSprite(128, [[0, "rgba(255,196,120,.42)"], [.72, "rgba(255,188,110,.5)"], [.86, "rgba(255,206,140,.75)"], [.93, "rgba(255,190,120,.35)"], [1, "rgba(255,180,100,0)"]]),
  bokehCool: radialSprite(128, [[0, "rgba(170,200,240,.35)"], [.72, "rgba(170,200,240,.42)"], [.86, "rgba(200,220,255,.6)"], [.93, "rgba(170,200,240,.3)"], [1, "rgba(160,190,230,0)"]]),
};
function blit(g, spr, x, y, size, alpha = 1, op = "lighter") {
  if (alpha <= 0.003) return;
  g.globalCompositeOperation = op; g.globalAlpha = alpha;
  g.drawImage(spr, x - size / 2, y - size / 2, size, size);
  g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
}
// anamorphic lens streak (horizontal)
function streak(g, x, y, len, alpha, col = "rgba(150,190,255,") {
  if (alpha <= 0) return;
  g.globalCompositeOperation = "lighter";
  const gr = g.createLinearGradient(x - len, 0, x + len, 0);
  gr.addColorStop(0, col + "0)"); gr.addColorStop(.5, col + alpha + ")"); gr.addColorStop(1, col + "0)");
  g.fillStyle = gr; g.fillRect(x - len, y - 2, len * 2, 4);
  g.globalAlpha = .5; g.fillRect(x - len * .5, y - 6, len, 12); g.globalAlpha = 1;
  g.globalCompositeOperation = "source-over";
}
// volumetric beam: a soft wedge from (x0,y0) widening towards (x1,y1)
function beam(g, x0, y0, x1, y1, w0, w1, col, alpha) {
  if (alpha <= 0) return;
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  gr.addColorStop(0, col + alpha + ")"); gr.addColorStop(1, col + "0)");
  const a = Math.atan2(y1 - y0, x1 - x0) + Math.PI / 2, cx = Math.cos(a), cy = Math.sin(a);
  g.globalCompositeOperation = "lighter"; g.fillStyle = gr;
  g.beginPath(); g.moveTo(x0 - cx * w0, y0 - cy * w0); g.lineTo(x0 + cx * w0, y0 + cy * w0);
  g.lineTo(x1 + cx * w1, y1 + cy * w1); g.lineTo(x1 - cx * w1, y1 - cy * w1); g.closePath(); g.fill();
  g.globalCompositeOperation = "source-over";
}

/* ---------- snow ---------- */
const FLAKES = (() => { const r = rng(2026); return Array.from({ length: 460 }, () => ({ x: r() * W, y: r() * H, z: Math.pow(r(), 1.7) * 1.9 + .15, ph: r() * TAU, fr: .3 + r() * .6 })); })();
// density 0..1, wind px/s, tint for the near bokeh flakes
function drawSnow(g, t, density = 1, wind = 18, warm = 0) {
  const n = Math.floor(FLAKES.length * density);
  for (let i = 0; i < n; i++) {
    const f = FLAKES[i], sp = 40 + f.z * 70;
    const y = ((f.y + t * sp) % (H + 120)) - 60;
    const x = ((f.x + Math.sin(t * f.fr + f.ph) * 26 * f.z + t * wind * f.z) % (W + 80) + W + 80) % (W + 80) - 40;
    if (f.z > 1.35) { blit(g, warm ? SPR.bokehWarm : SPR.soft, x, y, 18 + (f.z - 1.35) * 70, .22, "source-over"); }
    else { g.fillStyle = `rgba(240,245,255,${.35 + f.z * .4})`; g.beginPath(); g.arc(x, y, .8 + f.z * 2.1, 0, TAU); g.fill(); }
  }
}

/* ---------- silhouette figures ---------- */
// tapered limb: filled quad with round joints
function limb(g, x1, y1, x2, y2, w1, w2) {
  const a = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(a), ny = Math.cos(a);
  g.beginPath(); g.moveTo(x1 + nx * w1 / 2, y1 + ny * w1 / 2); g.lineTo(x2 + nx * w2 / 2, y2 + ny * w2 / 2);
  g.lineTo(x2 - nx * w2 / 2, y2 - ny * w2 / 2); g.lineTo(x1 - nx * w1 / 2, y1 - ny * w1 / 2); g.closePath(); g.fill();
  g.beginPath(); g.arc(x2, y2, w2 / 2, 0, TAU); g.fill();
}
// joint angles per pose: [upperArmL, foreArmL, upperArmR, foreArmR, thighL, shinL, thighR, shinR, lean]; 0 = hanging down, + = forward
function poseAngles(pose, ph) {
  const s = Math.sin(ph);
  switch (pose) {
    case "walk": return [-s * .38, .25, s * .38, .25, s * .36, .05 + Math.max(0, -s) * .5, -s * .36, .05 + Math.max(0, s) * .5, .04];
    case "push": return [.42, .12, .48, .1, s * .32, .05 + Math.max(0, -s) * .45, -s * .32, .05 + Math.max(0, s) * .45, .16];
    case "pocket": return [-.1, .6, -.05, .65, .03, 0, -.03, 0, 0];
    case "shovel": { const k = (s + 1) / 2; return [.75 + k * .35, .35, 1.05 + k * .25, .1, .28, -.1, -.18, .12, .18 + k * .5]; }
    case "hammer": { const k = Math.max(0, s); return [.9, .2, 2.2 - k * 1.6, .3, .32, 0, -.28, 0, .62]; }
    case "carry": return [.85, 1.05, .8, 1.1, s * .3, .05 + Math.max(0, -s) * .4, -s * .3, .05 + Math.max(0, s) * .4, .06];
    case "cheer": { const k = Math.sin(ph) * .12; return [-2.45 - k, -.1, 2.45 + k, .1, -.06, 0, .06, 0, -.03]; }
    case "climb": return [2.8, .2, 2.5, .5, .95, -1.2, .1, .3, .1];
    case "point": return [-.06, .1, 1.45, .05, -.05, 0, .05, 0, 0];
    case "candle": return [-.06, .1, -.25, -2.35, -.05, 0, .05, 0, 0];
    default: return [-.06, .1, .06, -.1, -.05, 0, .05, 0, 0];
  }
}
// x,y = feet; h = height to the top of the head. Returns hand positions so props can be attached.
function figure(g, x, y, h, o = {}) {
  const dir = o.dir ?? 1, col = o.col ?? "#0b0d10", pose = o.pose ?? "stand", u = h / 100;
  const [aL1, aL2, aR1, aR2, lL1, lL2, lR1, lR2, lean0] = poseAngles(pose, o.phase ?? 0);
  const lean = lean0 + (o.lean || 0), bulk = o.bulk ?? 1;
  const side = o.side ?? ["walk", "push", "shovel", "hammer", "carry", "climb", "pocket"].includes(pose);
  const wS = side ? 6.4 : 10, wH = side ? 7.6 : 10.8, armX = side ? 1.4 : 8.4, legX = side ? 1.2 : 3.4;
  const bob = pose === "walk" || pose === "carry" || pose === "push" ? Math.abs(Math.cos(o.phase ?? 0)) * 1.2 * u : 0;
  const hipY = y - 47 * u - bob, cL = Math.cos(lean * dir), sL = Math.sin(lean * dir);
  const rot = (px, py) => { const dx = px * dir, dy = py; return [x + dx * cL - dy * sL, hipY + dx * sL + dy * cL]; }; // body frame: py negative = up from hip
  const P = (ox, oy, ang, len) => [ox + Math.sin(ang) * len * dir, oy + Math.cos(ang) * len];
  g.fillStyle = col; g.strokeStyle = col;
  // legs (from under the coat)
  for (const [a1, a2, side] of [[lL1, lL2, -1], [lR1, lR2, 1]]) {
    const hp = [x + side * legX * u * dir, hipY + 4 * u], kn = P(hp[0], hp[1], a1, 22 * u), an = P(kn[0], kn[1], a1 + a2, 22 * u);
    an[1] = Math.min(an[1], y - 1.5 * u);
    limb(g, hp[0], hp[1], kn[0], kn[1], 9 * u, 7.5 * u); limb(g, kn[0], kn[1], an[0], an[1], 7.5 * u, 5.6 * u);
    g.beginPath(); g.ellipse(an[0] + 2.6 * u * dir, an[1] + 1.4 * u, 5.4 * u, 2.6 * u, 0, 0, TAU); g.fill();
  }
  // coat
  const T = [[-4, -38], [-wS * .92, -37.5], [-wS, -30], [-wS * .98, -15], [-wH, 6], [wH, 6], [wS * .98, -15], [wS, -30], [wS * .92, -37.5], [4, -38]].map(([px, py]) => rot(px * bulk * u, py * u));
  g.beginPath(); g.moveTo(T[0][0], T[0][1]); g.quadraticCurveTo(T[1][0], T[1][1], T[2][0], T[2][1]); g.lineTo(T[3][0], T[3][1]);
  g.quadraticCurveTo(...rot(-(wH + 1) * bulk * u, -4 * u), T[4][0], T[4][1]); g.lineTo(T[5][0], T[5][1]);
  g.quadraticCurveTo(...rot((wH + 1) * bulk * u, -4 * u), T[6][0], T[6][1]); g.lineTo(T[7][0], T[7][1]);
  g.quadraticCurveTo(T[8][0], T[8][1], T[9][0], T[9][1]); g.closePath(); g.fill();
  // arms
  const hands = [];
  for (const [a1, a2, side] of [[aL1, aL2, -1], [aR1, aR2, 1]]) {
    const sh = rot(side * armX * bulk * u, -34 * u), el = P(sh[0], sh[1], a1, 16 * u), hd = P(el[0], el[1], a1 + a2, 15 * u);
    limb(g, sh[0], sh[1], el[0], el[1], 7.6 * u, 6.4 * u); limb(g, el[0], el[1], hd[0], hd[1], 6.4 * u, 5.2 * u);
    hands.push(hd);
  }
  // neck, head, beanie with pompom
  const nk = rot(0, -38 * u), hd = rot(.8 * u, -45.5 * u);
  limb(g, nk[0], nk[1], hd[0], hd[1], 5.4 * u, 5 * u);
  g.beginPath(); g.ellipse(hd[0], hd[1], 6.1 * u, 7 * u, lean * dir * .5, 0, TAU); g.fill();
  if (o.hat !== false) {
    g.beginPath(); g.ellipse(hd[0] - .3 * u * dir, hd[1] - 2.2 * u, 6.9 * u, 6.6 * u, 0, Math.PI, TAU); g.fill();
    g.fillRect(hd[0] - 6.9 * u, hd[1] - 2.8 * u, 13.8 * u, 2.6 * u);
    g.beginPath(); g.arc(hd[0] - .6 * u * dir, hd[1] - 9.4 * u, 2.5 * u, 0, TAU); g.fill();
  }
  if (o.scarf) {
    g.fillStyle = o.scarf;
    g.beginPath(); g.ellipse(nk[0], nk[1] + .8 * u, 7.2 * u, 3 * u, 0, 0, TAU); g.fill();
    const t0 = rot(2.6 * u, -37 * u), t1 = rot((3.6 + Math.sin((o.phase ?? 0) * .7) * .8) * u, -21 * u);
    limb(g, t0[0], t0[1], t1[0], t1[1], 4.2 * u, 3.8 * u);
    g.fillStyle = col;
  }
  if (pose === "shovel") { const a = hands[0], b = hands[1], tip = [b[0] + 26 * u * dir, Math.min(y + 1 * u, b[1] + 30 * u)]; g.lineWidth = 2.4 * u; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(tip[0], tip[1]); g.stroke(); g.beginPath(); g.ellipse(tip[0], tip[1], 6.5 * u, 3 * u, .45 * dir, 0, TAU); g.fill(); }
  if (pose === "hammer") { const b = hands[1]; g.lineWidth = 2.2 * u; g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(b[0] + 8 * u * dir, b[1] - 6 * u); g.stroke(); g.fillRect(b[0] + 6 * u * dir - 3 * u, b[1] - 9.5 * u, 6.4 * u, 4.6 * u); }
  if (pose === "carry") { const a = hands[0], b = hands[1]; g.fillRect(Math.min(a[0], b[0]) - 9 * u, Math.min(a[1], b[1]) - 13 * u, 26 * u, 14 * u); }
  return hands;
}
// cheap head-and-shoulders bust for distant crowds
function bust(g, x, y, s, col, v = 0) {
  g.fillStyle = col;
  g.beginPath(); g.moveTo(x - s * 1.2, y + s * 1.6); g.quadraticCurveTo(x - s * 1.15, y + s * .62, x - s * .35, y + s * .5); g.lineTo(x + s * .35, y + s * .5); g.quadraticCurveTo(x + s * 1.15, y + s * .62, x + s * 1.2, y + s * 1.6); g.closePath(); g.fill();
  g.beginPath(); g.ellipse(x, y, s * .46, s * .54, 0, 0, TAU); g.fill();
  if (v === 1) { g.beginPath(); g.ellipse(x, y - s * .14, s * .52, s * .5, 0, Math.PI, TAU); g.fill(); g.beginPath(); g.arc(x, y - s * .7, s * .18, 0, TAU); g.fill(); }
  if (v === 2) { g.beginPath(); g.ellipse(x, y - s * .02, s * .62, s * .66, 0, 0, TAU); g.fill(); }
}
// a breath puff that rises and fades; t0 = when it was exhaled
function breath(g, x, y, t, t0, s = 1, col = "rgba(225,232,240,") {
  const k = (t - t0) / 1.6; if (k < 0 || k > 1) return;
  g.globalAlpha = Math.sin(k * Math.PI) * .32; g.globalCompositeOperation = "screen";
  g.drawImage(SPR.soft, x + k * 26 * s - 16 * s * (1 + k), y - k * 40 * s - 16 * s * (1 + k), 32 * s * (1 + k), 32 * s * (1 + k));
  g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
}

/* ---------- forests ---------- */
// one pine silhouette (jagged layered tiers)
function pine(g, x, base, h, w, col, r) {
  g.fillStyle = col; g.beginPath(); g.moveTo(x, base - h);
  const tiers = 7 + (r() * 4 | 0);
  for (let i = 1; i <= tiers; i++) { const k = i / tiers, yy = base - h + h * k * .92, ww = w * (.15 + .85 * k) * (.85 + r() * .3); g.lineTo(x + ww, yy); g.lineTo(x + ww * .45, yy - h * .02); }
  g.lineTo(x + w * .08, base); g.lineTo(x - w * .08, base);
  for (let i = tiers; i >= 1; i--) { const k = i / tiers, yy = base - h + h * k * .92, ww = w * (.15 + .85 * k) * (.85 + r() * .3); g.lineTo(x - ww * .45, yy - h * .02); g.lineTo(x - ww, yy); }
  g.closePath(); g.fill();
}
// pre-rendered forest strip (static) with optional blur
function forestLayer(seed, width, base, hMin, hMax, col, gap = 26, blur = 0) {
  const c = makeCanvas(width, base + 40), g = c.getContext("2d"), r = rng(seed);
  if (blur) g.filter = `blur(${blur}px)`;
  for (let x = -40; x < width + 40; x += gap * (.6 + r() * .8)) { const h = lerp(hMin, hMax, r()); pine(g, x, base, h, h * (.2 + r() * .08), col, r); }
  g.fillStyle = col; g.fillRect(0, base - 2, width, 42);
  return c;
}
