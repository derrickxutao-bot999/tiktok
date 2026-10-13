"use strict";
/* scenesD.js — the ending: an old fan and his grandchild in the away end at Anfield, the same fan through
   39 years (every cut of the montage is matched on his raised hand), and finally the whole away end */

/* ---------- the stand across the pitch, one per era ---------- */
function buildStand(o) {
  const c = makeCanvas(W, H), g = c.getContext("2d"), r = rng(o.seed), ry = o.roofY;
  const sky = g.createLinearGradient(0, 0, 0, ry + 40); o.sky.forEach((col, i) => sky.addColorStop(i / (o.sky.length - 1), col));
  g.fillStyle = sky; g.fillRect(0, 0, W, ry + 60);
  if (o.towers) for (const tx of [395, 690]) {   // Wembley's twin towers above the far roof
    g.fillStyle = "#f3f1ea"; g.fillRect(tx - 34, 168, 68, ry - 160); g.beginPath(); g.arc(tx, 170, 34, Math.PI, TAU); g.fill();
    g.fillStyle = "#d6d3ca"; g.fillRect(tx - 34, 170, 11, ry - 160); g.fillStyle = "#c8c4b8"; for (let y = 200; y < ry; y += 30) g.fillRect(tx - 26, y, 52, 5);
    g.fillStyle = "#3a3a3a"; g.fillRect(tx - 1.5, 92, 3, 46); g.fillStyle = "#79b8e4"; g.fillRect(tx + 1.5, 94, 30, 18);
  }
  if (o.pylons) for (const px of [72, 1008]) {   // old lattice floodlight pylons at the far corners
    g.strokeStyle = o.lit ? "#1c2026" : "#4a4e52"; g.lineWidth = 3;
    g.beginPath(); g.moveTo(px - 22, ry + 10); g.lineTo(px - 7, 112); g.moveTo(px + 22, ry + 10); g.lineTo(px + 7, 112); g.stroke();
    g.lineWidth = 1.6; for (let y = ry; y > 120; y -= 24) { g.beginPath(); g.moveTo(px - 22 + (ry - y) * .06, y); g.lineTo(px + 22 - (ry - y + 24) * .06, y - 24); g.stroke(); }
    g.fillStyle = o.lit ? "#20252c" : "#3c4146"; g.fillRect(px - 62, 52, 124, 62);
    for (let a = 0; a < 5; a++) for (let b = 0; b < 2; b++) { g.fillStyle = o.lit ? "#fbfbf4" : "#9aa0a3"; g.fillRect(px - 54 + a * 23, 60 + b * 27, 16, 19); }
  }
  // roof and the shade beneath it
  g.fillStyle = o.roof[0]; g.beginPath(); g.moveTo(-10, ry - 4); g.lineTo(W + 10, ry - 20); g.lineTo(W + 10, ry + 26); g.lineTo(-10, ry + 42); g.closePath(); g.fill();
  const under = g.createLinearGradient(0, ry + 26, 0, ry + 150); under.addColorStop(0, o.roof[1]); under.addColorStop(1, o.stand); g.fillStyle = under; g.fillRect(0, ry + 26, W, 130);
  g.fillStyle = o.stand; g.fillRect(0, ry + 150, W, 770 - ry);
  if (o.ring) for (let x = 6; x < W; x += 22) { g.fillStyle = "#f4f7ff"; g.fillRect(x, ry + 30 - x * .015, 9, 4); }
  // the crowd: rows of small faces, larger towards the front
  const n = 12, rows = Array.from({ length: n }, (_, i) => ({ y: ry + 96 + i * (650 - ry) / n, s: 4.4 + i * .58 }));
  const cr = crowdLayer(o.seed + 1, rows, { jackets: o.jackets, scarves: .35, scarfCols: o.scarfCols, hats: o.hats || 0, hatCols: o.hatCols });
  g.drawImage(cr.c, -200, 0);
  if (o.lit) { const lg = g.createLinearGradient(0, ry + 40, 0, 780); lg.addColorStop(0, "rgba(0,0,0,0.55)"); lg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = lg; g.fillRect(0, ry + 40, W, 740 - ry); }
  if (o.flags) for (let i = 0; i < 9; i++) { const fx = 40 + r() * 1000, fy = ry + 120 + r() * 300; g.fillStyle = o.flags[i % o.flags.length]; g.fillRect(fx, fy, 46 + r() * 30, 28 + r() * 10); }
  if (o.fence) {   // the perimeter fence of the 1980s
    g.strokeStyle = "rgba(30,34,38,0.45)"; g.lineWidth = 1.2;
    for (let d = -400; d < W + 400; d += 16) { g.beginPath(); g.moveTo(d, 640); g.lineTo(d + 150, 790); g.moveTo(d, 640); g.lineTo(d - 150, 790); g.stroke(); }
    g.fillStyle = "#2a2e33"; for (let x = 10; x < W; x += 120) g.fillRect(x, 628, 5, 165); g.fillRect(0, 632, W, 4);
  }
  // advertising boards along the touchline
  g.fillStyle = "#101318"; g.fillRect(0, 778, W, 34);
  const AD = o.boards === "led" ? ["#2a6fd6", "#e8e8e8", "#13a38b", "#f2c230", "#7a5cc8", "#d93a2a"] : ["#e9e6dc", "#c22a2a", "#1d3f8f", "#f0c419", "#e9e6dc", "#2f7a3a"];
  for (let x = 0, i = 0; x < W; x += 132, i++) {
    g.fillStyle = AD[i % AD.length]; g.globalAlpha = o.boards === "led" ? .85 : .9; g.fillRect(x + 3, 781, 126, 28);
    g.fillStyle = o.boards === "led" ? "rgba(255,255,255,0.75)" : "rgba(20,20,20,0.55)"; g.fillRect(x + 22, 790, 70 + r() * 20, 9);
  }
  g.globalAlpha = 1;
  // the pitch
  let y = 812; for (let i = 0; y < H; i++) { const h = 20 * Math.pow(1.24, i); g.fillStyle = i % 2 ? o.pitch[0] : o.pitch[1]; g.fillRect(0, y, W, h + 1); y += h; }
  g.fillStyle = "rgba(240,240,235,0.55)"; g.fillRect(0, 836, W, 3);
  return c;
}
const STAND_P = {
  m87: { seed: 870, sky: ["#8c9498", "#b6bab5"], roofY: 330, roof: ["#3d4146", "#26292d"], stand: "#3a3d40", jackets: JACKETS, scarfCols: ["#79b8e4", "#f2f2f2"], hats: .3, pylons: 1, fence: 1, boards: "old", pitch: ["#55703f", "#4d6a3a"] },
  m98: { seed: 980, sky: ["#04070c", "#101823"], roofY: 330, roof: ["#101318", "#07090c"], stand: "#15181c", jackets: ["#1d232b", "#2b3440", "#3e5a74", "#1f2630", "#79b8e4"], scarfCols: ["#79b8e4", "#f2f2f2"], hats: .45, hatCols: ["#2b3440", "#1d232b", "#79b8e4"], pylons: 1, lit: 1, fence: 1, boards: "old", pitch: ["#2f4a2a", "#2a4326"] },
  m99: { seed: 990, sky: ["#6c9acb", "#d2dfe6"], roofY: 350, roof: ["#e8e6df", "#8e8f8b"], stand: "#666b6e", jackets: ["#79b8e4", "#5c9fd0", "#f2f2f2", "#79b8e4", "#2b3a55", "#f2f2f2"], scarfCols: ["#79b8e4", "#f2f2f2"], towers: 1, boards: "old", flags: ["#79b8e4", "#f2f2f2"], pitch: ["#5f9a45", "#56913f"] },
  m23: { seed: 230, sky: ["#02040b", "#0b1830"], roofY: 300, roof: ["#0b0f17", "#05070b"], stand: "#0e1420", jackets: ["#79b8e4", "#5c9fd0", "#79b8e4", "#f2f2f2", "#1c2a44"], scarfCols: ["#79b8e4", "#f2f2f2"], ring: 1, boards: "led", flags: ["#79b8e4", "#f2f2f2", "#f5d33a"], pitch: ["#3f8a3c", "#3a8237"] },
  kop: { seed: 260, sky: ["#03060c", "#0c1522"], roofY: 300, roof: ["#0d1117", "#06080b"], stand: "#140f12", jackets: ["#c8102e", "#1b1f26", "#c8102e", "#2a2f38", "#f2f2f2", "#8a0f22"], scarfCols: ["#c8102e", "#f2f2f2"], ring: 1, boards: "led", flags: ["#c8102e", "#f2f2f2", "#c8102e"], pitch: ["#2e6b38", "#2a6334"] },
};
const STANDS = {};
const stand = era => STANDS[era] || (STANDS[era] = buildStand(STAND_P[era]));
// moving light in each era: floodlights, rain, confetti, fireworks, flashbulbs
function standFX(g, era, t) {
  const r = rng(Math.round(t * 30) * 13 + era.length);
  if (era === "m98") for (const px of [72, 1008]) { blit(g, SPR.glowWhite, px, 84, 260, .9); blit(g, SPR.glowCool, px, 84, 900, .45); beam(g, px, 100, 540, 900, 20, 260, "rgba(200,215,255,", .05); }
  if (era === "m23" || era === "kop") {
    const ry = STAND_P[era].roofY;
    for (let x = 17; x < W; x += 66) blit(g, SPR.glowCool, x, ry + 32 - x * .015, 110, .28);
    for (let i = 0; i < 4; i++) beam(g, 140 + i * 270, ry + 34, 200 + i * 230, 880, 14, 140, "rgba(205,220,255,", .035);
  }
  if (era === "m99" || era === "m23" || era === "kop") for (let i = 0; i < 7; i++) if (r() < .55) blit(g, SPR.glowWhite, r() * W, 420 + r() * 330, 14 + r() * 16, .9);   // flashbulbs and phones
  if (era === "m23") {
    for (const [ft, fx, fy, col] of [[123.57, 300, 170, "255,214,120"], [124.0, 780, 120, "255,236,190"], [124.35, 520, 210, "255,200,90"]]) {   // fireworks over the roof
      const k = (t - ft) / 1.1; if (k < 0 || k > 1) continue;
      g.globalCompositeOperation = "lighter";
      for (let i = 0; i < 36; i++) { const a = i / 36 * TAU, d = easeOut(k) * 190, x = fx + Math.cos(a) * d, y = fy + Math.sin(a) * d + k * k * 60; g.fillStyle = `rgba(${col},${(1 - k) * .9})`; g.fillRect(x - 2, y - 2, 4, 4); }
      g.globalCompositeOperation = "source-over"; blit(g, SPR.glowWarm, fx, fy, 380, .5 * (1 - k));
    }
  }
}
// gold ticker tape for 2023; near flakes are drawn later, in front of the fans
function confetti(g, t, near) {
  const r = rng(near ? 4 : 3), n = near ? 26 : 140;
  for (let i = 0; i < n; i++) {
    const z = near ? 1.6 + r() * 1.2 : .4 + r() * .9, sp = 90 + z * 120, x = (r() * W + Math.sin(t * 1.3 + i) * 40 * z) % W, y = ((r() * H + (t - 113) * sp) % H + H) % H;
    const w = 5 * z, h = 9 * z * Math.abs(Math.sin(t * 6 * (.6 + r()) + i));
    g.fillStyle = r() < .7 ? `rgba(246,206,96,${near ? .9 : .8})` : `rgba(255,244,214,${near ? .85 : .7})`; g.fillRect(x - w / 2, y - h / 2, w, h + 1);
  }
}

/* ---------- the fan, his raised hand and what it holds ---------- */
const MAN = { x: 470, y: 2430, h: 1500 };
const manAngles = (rArm = [.08, -.12]) => [-2.95, -.08, rArm[0], rArm[1], -.05, 0, .05, 0, 0];
const MAN_HAND = (() => { const c = makeCanvas(2, 2); return figure(c.getContext("2d"), MAN.x, MAN.y, MAN.h, { angles: manAngles() })[0]; })();
const headOf = (x, y, h) => [x + .8 * h / 100, y - 92.5 * h / 100, h / 100];   // head centre and unit, for a figure with no lean
function headwear(g, x, y, h, kind, col) {
  const [hx, hy, u] = headOf(x, y, h); g.fillStyle = col;
  if (kind === "flat") { g.beginPath(); g.ellipse(hx, hy - 3.2 * u, 7.4 * u, 4.6 * u, 0, Math.PI, TAU); g.fill(); g.fillRect(hx - 7.4 * u, hy - 3.6 * u, 14.8 * u, 2 * u); }
  else if (kind === "cap") { g.beginPath(); g.ellipse(hx, hy - 2.4 * u, 6.8 * u, 6.2 * u, 0, Math.PI, TAU); g.fill(); g.fillRect(hx - 6.8 * u, hy - 2.8 * u, 13.6 * u, 1.6 * u); }
  else if (kind === "hood") { g.beginPath(); g.ellipse(hx, hy + .6 * u, 8.2 * u, 8.9 * u, 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(hx - 8 * u, hy + 3 * u); g.lineTo(hx - 10 * u, hy + 12 * u); g.lineTo(hx + 10 * u, hy + 12 * u); g.lineTo(hx + 8 * u, hy + 3 * u); g.fill(); }
  else if (kind === "bobble") { g.beginPath(); g.ellipse(hx - .3 * u, hy - 2.2 * u, 6.9 * u, 6.6 * u, 0, Math.PI, TAU); g.fill(); g.fillRect(hx - 6.9 * u, hy - 2.8 * u, 13.8 * u, 2.6 * u); g.beginPath(); g.arc(hx - .6 * u, hy - 9.4 * u, 2.5 * u, 0, TAU); g.fill(); }
}
function heldBanana(g, hand, L, phi, t) {
  const a = phi + Math.sin(t * 2.1) * .07;
  drawBanana(g, hand[0] + Math.cos(a) * L * .42, hand[1] + Math.sin(a) * L * .42, L, a);
}
// a bar scarf hanging from a raised hand, flapping; angle 0 = straight down
function drawScarf(g, x, y, L, w, t, o = {}) {
  const N = 14, pts = [[x, y, o.lean ?? .5]];
  for (let i = 1; i <= N; i++) {
    const s = i / N, a = (o.lean ?? .5) + Math.sin(t * (o.speed ?? 5) - s * 4.2) * (o.flap ?? .35) * s, p = pts[i - 1];
    pts.push([p[0] + Math.sin(a) * L / N, p[1] + Math.cos(a) * L / N, a]);
  }
  for (let i = 0; i < N; i++) {
    const [x0, y0, a0] = pts[i], [x1, y1, a1] = pts[i + 1], nx0 = Math.cos(a0) * w / 2, ny0 = -Math.sin(a0) * w / 2, nx1 = Math.cos(a1) * w / 2, ny1 = -Math.sin(a1) * w / 2;
    g.fillStyle = Math.floor(i / 2) % 2 ? (o.c2 || "#f2f2f2") : (o.c1 || "#79b8e4");
    g.beginPath(); g.moveTo(x0 + nx0, y0 + ny0); g.lineTo(x1 + nx1 + Math.sin(a1) * 2, y1 + ny1 + Math.cos(a1) * 2); g.lineTo(x1 - nx1 + Math.sin(a1) * 2, y1 - ny1 + Math.cos(a1) * 2); g.lineTo(x0 - nx0, y0 - ny0); g.closePath(); g.fill();
  }
  const [ex, ey, ea] = pts[N]; g.strokeStyle = o.c2 || "#f2f2f2"; g.lineWidth = 2;
  for (let k = -3; k <= 3; k++) { const ox = ex + Math.cos(ea) * w * k / 7, oy = ey - Math.sin(ea) * w * k / 7; g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + Math.sin(ea) * 16, oy + Math.cos(ea) * 16); g.stroke(); }
}

/* ---------- the people around him ---------- */
const AROUND = (() => { const r = rng(39), out = []; for (let i = 0; i < 9; i++) out.push({ x: 40 + i * 125 + (r() - .5) * 60, y: 1985 + r() * 90, h: 640 + r() * 170, dir: r() < .5 ? 1 : -1, ph: r() * TAU, k: r() }); return out.filter(f => f.x < 300 || f.x > 640); })();
const EDGE = [{ x: -40, y: 2620, h: 1500 }, { x: 1110, y: 2580, h: 1460 }];
const ERA = {
  m87: { near: "#1b1d20", col: "#26282c", hat: "bobble", prop: "banana", crowd: "still", glow: ["rgba(220,226,230,0.35)", 14] },
  m98: { near: "#05070a", col: "#0c1016", hat: "hood", prop: "scarf", crowd: "rain", glow: ["rgba(190,210,255,0.6)", 26] },
  m99: { near: "#18212b", col: "#1f3550", hat: "none", prop: "scarf", crowd: "joy", glow: ["rgba(255,240,215,0.5)", 18] },
  m23: { near: "#04060a", col: "#0b0e15", hat: "cap", prop: "scarf", crowd: "joy", glow: ["rgba(255,214,140,0.6)", 28] },
  kop: { near: "#05070c", col: "#0a0d14", hat: "flat", prop: "banana", crowd: "bananas", glow: ["rgba(200,215,255,0.55)", 26] },
};
function crowdFan(g, f, t, era, near) {
  const e = ERA[era], up = e.crowd === "joy" || (e.crowd === "bananas" && f.k < .7) || (e.crowd === "rain" && f.k < .25);
  const bounce = e.crowd === "joy" ? Math.abs(Math.sin(t * 5.4 + f.ph)) * 10 : 0, y = f.y - bounce, col = near ? e.col : mixHex(e.col, "#3a4250", .25);
  const hands = figure(g, f.x, y, f.h, up ? { pose: "cheer", phase: t * 5 + f.ph, dir: f.dir, col, hat: false } : { pose: "stand", dir: f.dir, col, hat: false });
  headwear(g, f.x, y, f.h, e.crowd === "rain" ? "hood" : f.k < .4 ? "bobble" : "none", col);
  if (!up) return;
  const hand = hands[f.k < .35 ? 0 : 1];
  if (e.crowd === "bananas") heldBanana(g, hand, f.h * .5, f.k < .35 ? -2.0 : -1.1, t + f.ph);
  else drawScarf(g, hand[0], hand[1], f.h * .32, f.h * .05, t + f.ph, { lean: f.k < .35 ? -.4 : .4, flap: .5, speed: 7 });
}

/* ---------- composition: stand, people (rim-lit), the man, weather in front ---------- */
const figBuf = makeCanvas(W, H), fbg = figBuf.getContext("2d"), rimBuf = makeCanvas(W, H), rbg = rimBuf.getContext("2d");
const E0 = 111.0;   // the ending starts: one continuous push-in from here through the montage
const fanCam = t => ({ s: 1 + .012 * (t - E0), sb: 1.02 + .005 * (t - E0), dx: Math.sin(t * .7) * 5, dy: Math.sin(t * .93 + 1) * 4 });
function aroundAnchor(g, s, dx, dy, fn) { g.save(); g.translate(MAN_HAND[0] + dx, MAN_HAND[1] + dy); g.scale(s, s); g.translate(-MAN_HAND[0], -MAN_HAND[1]); fn(); g.restore(); }
// people seen from behind against the light: a glow around them, a thin rim along their upper edges, shoulders a touch lifted
function rimLayer(g, cam, glow, fn) {
  fbg.setTransform(1, 0, 0, 1, 0, 0); fbg.globalCompositeOperation = "source-over"; fbg.clearRect(0, 0, W, H);
  aroundAnchor(fbg, cam.s, cam.dx, cam.dy, () => fn(fbg));
  rbg.setTransform(1, 0, 0, 1, 0, 0); rbg.globalCompositeOperation = "source-over"; rbg.clearRect(0, 0, W, H);
  rbg.drawImage(figBuf, 0, 0); rbg.globalCompositeOperation = "source-in"; rbg.fillStyle = glow[0]; rbg.fillRect(0, 0, W, H);
  rbg.globalCompositeOperation = "destination-out"; rbg.drawImage(figBuf, glow[2] || 0, 6); rbg.globalCompositeOperation = "source-over";
  fbg.globalCompositeOperation = "source-atop";
  const sh = fbg.createLinearGradient(0, 850, 0, H); sh.addColorStop(0, "rgba(150,160,180,0.10)"); sh.addColorStop(.5, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(0,0,0,0.35)");
  fbg.fillStyle = sh; fbg.fillRect(0, 0, W, H); fbg.drawImage(rimBuf, 0, 0); fbg.globalCompositeOperation = "source-over";
  g.save(); g.shadowColor = glow[0]; g.shadowBlur = glow[1]; g.shadowOffsetY = -glow[1] * .25; g.drawImage(figBuf, 0, 0); g.restore();
}
function fanView(g, t, era, kid) {
  const cam = fanCam(t), e = ERA[era];
  aroundAnchor(g, cam.sb, cam.dx * .4, cam.dy * .4, () => { g.drawImage(stand(era), 0, 0); standFX(g, era, t); if (era === "m23") confetti(g, t, false); });
  // the rows of our own stand below the crowd's shoulders: the pitch only shows above their heads
  const ns = g.createLinearGradient(0, 1250, 0, 1470); ns.addColorStop(0, e.near + "00"); ns.addColorStop(1, e.near); g.fillStyle = ns; g.fillRect(0, 1250, W, H - 1250);
  // the people around him, a step further back
  rimLayer(g, cam, e.glow, fg => {
    for (const f of AROUND) crowdFan(fg, f, t, era, false);
  });
  // him (and, in 2026, his grandchild), with the people at the edges of frame
  rimLayer(g, cam, e.glow, fg => {
    for (const f of EDGE) { figure(fg, f.x, f.y, f.h, { pose: "stand", col: e.col, hat: false }); headwear(fg, f.x, f.y, f.h, era === "m98" ? "hood" : "none", e.col); }
    const breathe = Math.sin(t * 1.9) * 3;
    if (kid) {
      const K = { x: 790, y: 2140 + breathe * .6, h: 1000 }, kc = "#17202c";
      const kh = figure(fg, K.x, K.y, K.h, { angles: [-.1, .1, 2.8, .15, -.05, 0, .05, 0, 0], col: kc, hat: false });
      headwear(fg, K.x, K.y, K.h, "bobble", "#5c9fd0");
      heldBanana(fg, kh[1], 300, -1.9 + Math.sin(t * 3.3) * .06, t + 1.3);
    }
    figure(fg, MAN.x, MAN.y + breathe, MAN.h, { angles: manAngles(kid ? [1.25, -.95] : undefined), col: e.col, hat: false });
    headwear(fg, MAN.x, MAN.y + breathe, MAN.h, e.hat, era === "m87" ? "#7a2f35" : e.col);
    const hand = [MAN_HAND[0], MAN_HAND[1] + breathe];
    if (e.prop === "banana") heldBanana(fg, hand, era === "kop" ? 470 : 500, -1.2, t);
    else drawScarf(fg, hand[0], hand[1], 520, 74, t, era === "m98" ? { lean: .25, flap: .18, speed: 3 } : { lean: .6, flap: .5, speed: 6.5 });
  });
  // weather and light in front of everyone
  if (era === "m87") drawRain(g, t, .7, "rgba(215,222,228,");
  if (era === "m98") drawRain(g, t, 1, "rgba(225,235,255,");
  if (era === "m23") aroundAnchor(g, cam.s, cam.dx, cam.dy, () => confetti(g, t, true));
}

/* ---------- the shots ---------- */
function shotFans(g, t, lt) { fanView(g, t, "kop", true); }
function shotM87(g, t, lt) { fanView(g, t, "m87", false); osd(g, t, ["1987"]); }
function shotM98(g, t, lt) {
  fanView(g, t, "m98", false);
  g.save(); g.font = "600 58px Oswald"; g.fillStyle = "rgba(250,250,250,0.92)"; g.shadowColor = "rgba(0,0,0,0.8)"; g.shadowOffsetX = 3; g.shadowOffsetY = 3; g.fillText("1998", 96, 250);
  g.font = "600 30px Oswald"; g.fillStyle = "rgba(230,60,50,0.95)"; g.fillText("● REC", 96, 300); g.restore();
}
function shotM99(g, t, lt) {
  fanView(g, t, "m99", false); WEM.bug(g, 2, 2, "FT", "PENS 1-3");
  g.save(); g.font = "600 32px Oswald"; g.letterSpacing = "6px"; g.fillStyle = "rgba(250,250,250,0.9)"; g.shadowColor = "rgba(0,0,0,0.7)"; g.shadowBlur = 8; g.fillText("WEMBLEY 1999", 76, 370); g.restore();
}
function shotM23(g, t, lt) {
  fanView(g, t, "m23", false);
  g.save(); g.fillStyle = "rgba(255,232,170,0.95)"; g.shadowColor = "rgba(0,0,0,0.6)"; g.shadowBlur = 14;
  g.font = "700 96px Playfair"; g.fillText("2023", 90, 290); g.font = "600 44px NotoSerifSC"; g.letterSpacing = "10px"; g.fillText("★★★", 96, 360); g.restore();
}
function shotShield(g, t, lt) {   // in close on the away end, continuing Anfield2's push: a wall of bananas
  const k = easeOut(prog(lt, 0, 4.1));
  ANF.draw(g, t, { cam: { x: lerp(400, 470, k), y: lerp(-80, -72, k), s: lerp(1.5, 1.66, k) }, banner: 1, dof: .45, fg: .45 });
}
function shotHome(g, t, lt) {
  const k = easeOut(prog(lt, 0, 7.4));
  ANF.draw(g, t, { cam: { x: lerp(150, 40, k), y: lerp(-60, 10, k), s: lerp(1.3, 1.08, k) }, dof: .5, fg: .55 });
  const d = smooth(prog(t, 127.2, 128.4));
  if (d > 0) { const gr = g.createLinearGradient(0, 1150, 0, H); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, `rgba(0,0,0,${.55 * d})`); g.fillStyle = gr; g.fillRect(0, 1150, W, H - 1150); }
}
