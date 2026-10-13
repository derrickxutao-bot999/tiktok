"use strict";
/* scenesA.js — Anfield 2026, the rewind, Manchester 1987, the fenced terraces, Maine Road */

function withCam(g, cam, par, piv, fn) {
  g.save(); const sc = 1 + (cam.s - 1) * par;
  g.translate(540 + cam.x * par, piv + cam.y * par); g.scale(sc, sc); g.translate(-540, -piv);
  fn(); g.restore();
}
function arm(g, x, y, s, side, up, col) {
  g.strokeStyle = col; g.lineCap = "round"; g.lineWidth = s * .32;
  g.beginPath(); g.moveTo(x + side * s * .75, y + s * .9); g.quadraticCurveTo(x + side * s * 1.0, y - s * .1, x + side * s * .55, y - s * up); g.stroke();
}

/* ---------- Anfield, 11 October 2026: the away end ---------- */
const ANF = (() => {
  let L = null;
  const bananas = (() => { const r = rng(2026), out = []; for (let i = 0; i < 150; i++) { const k = r(); out.push({ x: -40 + r() * 690, y: 905 + k * 330, s: (30 + k * 44) * (.85 + r() * .3), ph: r() * TAU, on: Math.pow(r(), .7) * 3.4, tilt: (r() - .5) * 1.0, k }); } return out.sort((a, b) => a.y - b.y); })();
  function build() {
    L = {};
    const c = makeLayer(W + 400, H + 200), g = c.getContext("2d"); g.translate(200, 0);
    const sky = g.createLinearGradient(0, 0, 0, 520); sky.addColorStop(0, "#08111b"); sky.addColorStop(.6, "#16273a"); sky.addColorStop(1, "#33445a");
    g.fillStyle = sky; g.fillRect(-200, 0, W + 400, 540);
    g.fillStyle = "#0a0e13"; g.beginPath(); g.moveTo(-200, 300); g.lineTo(W + 200, 270); g.lineTo(W + 200, 420); g.lineTo(-200, 452); g.fill();
    const und = g.createLinearGradient(0, 420, 0, 480); und.addColorStop(0, "#05080b"); und.addColorStop(1, "#141b23"); g.fillStyle = und; g.fillRect(-200, 430, W + 400, 50);
    const up = crowdLayer(21, Array.from({ length: 9 }, (_, i) => ({ y: 500 + i * 37, s: 9.5 + i * .55 })), { jackets: ["#1b1f26", "#2a2f38", "#3a2a2e", "#24262c"], scarves: .45, scarfCols: ["#c8102e", "#c8102e", "#f2f2f2"] });
    g.drawImage(up.c, -200, 0);
    g.fillStyle = "#0b0f14"; g.fillRect(-200, 838, W + 400, 44);
    for (let x = -200; x < W + 200; x += 6) { g.fillStyle = (x / 6 | 0) % 2 ? "rgba(200,16,46,0.85)" : "rgba(160,10,30,0.85)"; g.fillRect(x, 846, 6, 10); }
    const rowsL = Array.from({ length: 10 }, (_, i) => ({ y: 900 + i * 35, s: 13 + i * 1.6 }));
    const away = crowdLayer(22, rowsL, { jackets: ["#79b8e4", "#5c9fd0", "#2b3a55", "#79b8e4", "#1f2630", "#f2f2f2"], scarves: .5 });
    const home = crowdLayer(23, rowsL, { jackets: ["#1b1f26", "#2a2f38", "#3a2a2e", "#c8102e"], scarves: .4, scarfCols: ["#c8102e", "#f2f2f2"] });
    g.save(); g.beginPath(); g.rect(-200, 880, 840, 420); g.clip(); g.drawImage(away.c, -200, 0); g.restore();
    g.save(); g.beginPath(); g.rect(700, 880, 700, 420); g.clip(); g.drawImage(home.c, -200, 0); g.restore();
    g.fillStyle = "#0d1116"; g.fillRect(640, 880, 60, 380);
    for (let i = 0; i < 4; i++) bust(g, 670, 960 + i * 80, 12 + i * 2.5, "#d7e02a");
    const ad = g.createLinearGradient(0, 1250, 0, 1300); ad.addColorStop(0, "#151a22"); ad.addColorStop(1, "#0b0e12"); g.fillStyle = ad; g.fillRect(-200, 1250, W + 400, 52);
    const ADC = ["#2a6fd6", "#e8e8e8", "#d93a2a", "#13a38b", "#f2c230"];
    for (let x = -190, i = 0; x < W + 200; x += 150, i++) { g.fillStyle = ADC[i % ADC.length]; g.globalAlpha = .55; g.fillRect(x, 1260, 120, 30); g.globalAlpha = 1; }
    for (let y = 1302, i = 0; y < H + 200; i++) { const h = 30 * Math.pow(1.25, i); g.fillStyle = i % 2 ? "#2d6b39" : "#275f33"; g.fillRect(-200, y, W + 400, h + 1); y += h; }
    L.bg = c;
    // shallow depth of field: a softened copy of the upper tier, and two out-of-focus foreground bananas
    L.top = makeLayer(W + 400, 890); const tg = L.top.getContext("2d"); tg.filter = `blur(${3 * LAYER_SS}px)`; tg.drawImage(c, 0, 0);
    L.fg = makeLayer(700, 420); const fg = L.fg.getContext("2d"); fg.filter = `blur(${14 * LAYER_SS}px)`; drawBanana(fg, 350, 210, 560, -.25);
  }
  function draw(g, t, o) {
    if (!L) build();
    const cam = o.cam;
    withCam(g, cam, 1, 1100, () => {
      g.drawImage(L.bg, -200, 0);
      if (o.dof) { g.globalAlpha = o.dof; g.drawImage(L.top, -200, 0); g.globalAlpha = 1; }
      g.globalCompositeOperation = "lighter";
      for (let x = -170; x < W + 200; x += 46) { const y = 446 - (x + 200) * .022; g.globalAlpha = .9; g.drawImage(SPR.glowWhite, x - 9, y - 9, 18, 18); g.globalAlpha = .18; g.drawImage(SPR.glowCool, x - 60, y - 40, 120, 90); }
      g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
      for (let i = 0; i < 5; i++) beam(g, 60 + i * 240, 440, 120 + i * 210, 1300, 20, 210, "rgba(200,215,255,", .035);
      if (o.banner) {
        g.globalAlpha = o.banner; g.fillStyle = "#f4f2ec"; g.fillRect(470, 600, 560, 54);
        g.fillStyle = "#121212"; g.font = "600 28px Oswald"; g.textAlign = "center"; g.letterSpacing = "2px";
        g.fillText("A GENERATION OF SUPPORTERS CHEATED", 750, 637); g.letterSpacing = "0px"; g.textAlign = "left"; g.globalAlpha = 1;
      }
      for (const b of bananas) {
        const k = o.rise === undefined ? 1 : easeOut(clamp((o.rise - b.on) / .7)); if (k <= 0) continue;
        const bob = Math.sin(t * 3.1 + b.ph) * 5, ang = b.tilt + Math.sin(t * 2.3 + b.ph) * .24, by = b.y - b.s * .55 + (1 - k) * 90 + bob;
        g.globalAlpha = k; arm(g, b.x, b.y, b.s * .2, b.ph > Math.PI ? 1 : -1, 2.2, "#22324a");
        drawBanana(g, b.x, by, b.s, ang); g.globalAlpha = 1;
      }
    });
    if (o.fg) { const k = o.fg; g.globalAlpha = k; g.drawImage(L.fg, -260 + cam.x * .5 + Math.sin(t * .8) * 14, 1460 + Math.sin(t * 1.1) * 10, 700, 420); g.drawImage(L.fg, 700 + cam.x * .5, 1560 + Math.sin(t * .9 + 1) * 12, 560, 336); g.globalAlpha = 1; }
  }
  return { draw };
})();

/* ---------- the rewind: the Anfield footage runs backwards (the bananas sink), then blank tape, then 1987 ---------- */
const REW = { dur: 1.35, pow: 1.7 };                                   // soundtrack.py rewinds the score with the same curve
const rewSrc = lt => 10.4 * (1 - Math.pow(clamp(lt / REW.dur), REW.pow));
function shotRewind(g, t, lt) {
  const src = rewSrc(lt), jolt = lt < .16 ? Math.sin(lt / .16 * Math.PI) * 26 : 0;
  g.save(); g.translate(0, jolt); shotAnfield(g, src, src); g.restore();
  g.fillStyle = `rgba(4,6,10,${.55 * smooth(prog(lt, 0, .3))})`; g.fillRect(0, 0, W, H);   // the footage sinks back so the title can sit on it
  const r = rng(Math.floor(t * 30)), speed = clamp(lt / REW.dur);
  // picture-search noise: bands of static racing up the frame, wider as the tape speeds up
  for (let i = 0; i < 3; i++) {
    const y = ((i * 640 - t * 2600 * (1 + i * .3)) % (H + 300) + H + 300) % (H + 300) - 150, h = 40 + 90 * speed;
    g.fillStyle = "rgba(200,200,210,0.14)"; g.fillRect(0, y, W, h);
    for (let k = 0; k < 170; k++) { g.fillStyle = r() < .5 ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)"; g.fillRect(r() * W, y + r() * h, 4 + r() * 16, 2 + r() * 3); }
  }
  // blank tape between the two recordings
  const blank = smooth(prog(lt, 1.15, 1.45));
  if (blank > 0) {
    g.globalAlpha = blank; g.fillStyle = "#0b0d12"; g.fillRect(0, 0, W, H);
    const cols = ["#f5d33a", "#79b8e4", "#c8102e", "#2d6b39", "#e8e8e8", "#13263a"];
    for (let i = 0; i < 22; i++) { const y = r() * H, h = 8 + r() * 80; g.globalAlpha = blank * (.2 + r() * .45); g.fillStyle = cols[r() * cols.length | 0]; g.fillRect(-50 + r() * 200, y, W * (.6 + r() * .6), h); }
    g.globalAlpha = blank; for (let i = 0; i < 1400; i++) { g.fillStyle = r() < .5 ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"; g.fillRect(r() * W, r() * H, 3 + r() * 10, 2); }
    g.globalAlpha = 1;
  }
  const year = Math.round(lerp(2026, 1987, easeIn(prog(lt, .1, 1.6))));
  g.save(); g.font = "200px VT323"; g.textAlign = "center"; g.fillStyle = "rgba(245,245,240,0.95)"; g.shadowColor = "rgba(0,0,0,0.6)"; g.shadowOffsetX = 6; g.shadowOffsetY = 6;
  g.fillText(String(year), 540, 1240); g.restore();
  osd(g, t, [], { label: "◀◀ REW" });
}

/* ---------- Manchester, 1987: terraced houses, a silent mill, rain ---------- */
const CITY87 = (() => {
  let L = null;
  function build() {
    L = {};
    const c = makeLayer(W + 400, H), g = c.getContext("2d"), r = rng(87); g.translate(200, 0);
    const sky = g.createLinearGradient(0, 0, 0, 900); sky.addColorStop(0, "#8d969b"); sky.addColorStop(1, "#b9bdb9"); g.fillStyle = sky; g.fillRect(-200, 0, W + 400, 1000);
    g.fillStyle = "#6e5a50"; g.fillRect(560, 430, 520, 420); g.fillRect(-200, 520, 420, 330);
    for (let y = 450; y < 840; y += 46) for (let x = 580; x < 1060; x += 40) { g.fillStyle = r() < .15 ? "#2a2a2a" : "#4a4f55"; g.fillRect(x, y, 24, 30); }
    for (let y = 540; y < 840; y += 46) for (let x = -180; x < 200; x += 40) { g.fillStyle = "#4a4f55"; g.fillRect(x, y, 24, 30); }
    g.fillStyle = "#5e4a40"; g.beginPath(); g.moveTo(860, 430); g.lineTo(872, 120); g.lineTo(908, 120); g.lineTo(920, 430); g.fill(); g.fillRect(866, 110, 48, 16);
    g.fillStyle = "#59473f"; g.fillRect(150, 300, 34, 230);
    // the terrace row across the street
    for (let x = -200; x < W + 200; x += 180) {
      g.fillStyle = r() < .5 ? "#7b3e2c" : "#86452f"; g.fillRect(x, 820, 180, 520);
      g.fillStyle = "#3b3f45"; g.beginPath(); g.moveTo(x - 4, 822); g.lineTo(x + 90, 760); g.lineTo(x + 184, 822); g.fill();
      g.fillStyle = "#6d3a2a"; g.fillRect(x + 128, 730, 26, 70); g.fillStyle = "#4a3a32"; g.fillRect(x + 126, 724, 30, 10);
      g.fillStyle = "#e9e4d8"; for (const [wx, wy] of [[24, 880], [104, 880], [24, 1080]]) { g.fillRect(x + wx, wy, 56, 78); g.fillStyle = "#3a4048"; g.fillRect(x + wx + 5, wy + 5, 46, 68); g.fillStyle = "#e9e4d8"; }
      g.fillStyle = ["#2b4f3a", "#5c1d1d", "#1d2f4f", "#3a3a3a"][r() * 4 | 0]; g.fillRect(x + 110, 1100, 48, 120);
      g.fillStyle = "#cfc8b8"; g.fillRect(x + 104, 1218, 60, 10);
    }
    g.fillStyle = "#5f5f60"; g.fillRect(-200, 1340, W + 400, 26);
    const rd = g.createLinearGradient(0, 1366, 0, H); rd.addColorStop(0, "#3b3e42"); rd.addColorStop(1, "#1e2023"); g.fillStyle = rd; g.fillRect(-200, 1366, W + 400, H);
    for (let i = 0; i < 9; i++) { g.fillStyle = "rgba(150,160,170,0.12)"; g.beginPath(); g.ellipse(r() * W, 1450 + r() * 400, 120 + r() * 160, 14 + r() * 10, 0, 0, TAU); g.fill(); }
    L.bg = c;
  }
  function draw(g, t, lt) {
    if (!L) build();
    const px = lerp(0, -120, easeInOut(prog(lt, 0, 3.8)));
    g.drawImage(L.bg, -200 + px, 0);
    for (let i = 0; i < 3; i++) {
      const x = ((lt * (60 + i * 25) + i * 420) % 1500) - 200 + px, y = 1500 + i * 60, h = 300 + i * 20;
      figure(g, x, y, h, { pose: "walk", phase: lt * 5 + i, dir: 1, col: "#1c2026" });
      g.fillStyle = "#1c2026"; g.beginPath(); g.arc(x + h * .02, y - h * .98, h * .2, Math.PI, TAU); g.fill(); g.fillRect(x + h * .015, y - h * .98, 3, h * .3);
    }
    drawRain(g, lt, .9);
  }
  return { draw };
})();
function shotCity87(g, t, lt) { CITY87.draw(g, t, lt); osd(g, t, ["MANCHESTER 1987"]); }
const FENCE = (() => { let L = null; return { draw(g, t, lt) {
  if (!L) { L = crowdLayer(31, Array.from({ length: 6 }, (_, i) => ({ y: 520 + i * 150, s: 34 + i * 9 })), { scarves: .4, hats: .3 }); }
  const s = 1.04 + .03 * lt;
  g.fillStyle = "#7d8489"; g.fillRect(0, 0, W, H);
  g.save(); g.translate(540, 960); g.scale(s, s); g.translate(-540, -960);
  g.drawImage(L.c, -200, -120);
  g.strokeStyle = "rgba(40,44,48,0.9)"; g.lineWidth = 3;
  for (let d = -H; d < W + H; d += 42) { g.beginPath(); g.moveTo(d, 260); g.lineTo(d + 1500, 1760); g.moveTo(d, 260); g.lineTo(d - 1500, 1760); g.stroke(); }
  g.fillStyle = "#2a2e33"; for (let x = 20; x < W; x += 210) g.fillRect(x, 230, 14, 1500);
  g.fillRect(0, 240, W, 16);
  for (let x = 10; x < W; x += 30) { g.beginPath(); g.moveTo(x, 242); g.lineTo(x + 8, 200); g.lineTo(x + 16, 242); g.fill(); }
  g.restore();
  for (const [x, hh] of [[180, 760], [540, 820], [880, 780]]) {
    figure(g, x, 1950, hh, { pose: "stand", dir: 1, hat: false, col: "#141a24" });
    g.fillStyle = "#141a24"; g.beginPath(); g.ellipse(x + hh * .008, 1950 - hh * .965, hh * .075, hh * .1, 0, Math.PI, TAU); g.fill(); g.fillRect(x - hh * .085, 1950 - hh * .965, hh * .17, hh * .02);
    g.beginPath(); g.arc(x + hh * .008, 1950 - hh * 1.06, hh * .012, 0, TAU); g.fill();
  }
  drawRain(g, lt + 3, .7);
} }; })();
function shotFence(g, t, lt) { FENCE.draw(g, t, lt); osd(g, t, ["1987"]); }

/* ---------- Maine Road, 15 August 1987: a man and a banana ---------- */
const MAINE = (() => {
  let L = null;
  function build() {
    L = {};
    const c = makeLayer(W + 400, H + 200), g = c.getContext("2d"); g.translate(200, 0);
    const sky = g.createLinearGradient(0, 0, 0, 620); sky.addColorStop(0, "#a7aeb2"); sky.addColorStop(1, "#d3d5cf"); g.fillStyle = sky; g.fillRect(-200, 0, W + 400, 640);
    g.fillStyle = "#3d4248"; g.fillRect(-200, 500, W + 400, 26); g.fillStyle = "#23272c"; g.fillRect(-200, 526, W + 400, 70);
    for (let x = -160; x < W + 200; x += 210) { g.fillStyle = "#1b1e22"; g.fillRect(x, 526, 10, 90); }
    g.fillStyle = "#7c7f7e"; g.fillRect(-200, 596, W + 400, 760);
    const crowd = crowdLayer(41, Array.from({ length: 13 }, (_, i) => ({ y: 640 + i * 52, s: 13 + i * 2.2 })), { scarves: .35, hats: .35 });
    g.drawImage(crowd.c, -200, 0); L.heads = crowd.heads;
    g.fillStyle = "#5d6062"; g.fillRect(-200, 1338, W + 400, 30);
    g.fillStyle = "#c9c9c2"; for (let x = -200; x < W + 200; x += 120) g.fillRect(x, 1310, 6, 40); g.fillRect(-200, 1310, W + 400, 6);
    const p = g.createLinearGradient(0, 1368, 0, H + 200); p.addColorStop(0, "#5d7a48"); p.addColorStop(1, "#3c5a2f"); g.fillStyle = p; g.fillRect(-200, 1368, W + 400, H);
    g.fillStyle = "rgba(255,255,255,0.7)"; g.fillRect(-200, 1420, W + 400, 5);
    L.bg = c;
  }
  function draw(g, t, lt) {
    if (!L) build();
    const k = easeInOut(prog(lt, 0, 11.5)), s = lerp(1.0, 1.08, k);
    g.save(); g.translate(540, 1200); g.scale(s, s); g.translate(-540, -1200);
    g.drawImage(L.bg, -200, 0);
    // laughter and, later, the chant: arms go up around him
    const chant = smooth(prog(lt, 6.96, 7.54)), beat = Math.abs(Math.cos(lt * Math.PI / .58));
    for (const h of L.heads) {
      const near = Math.abs(h.x - 540) < 260 && h.y > 900;
      if (h.k < chant * .45 || (near && lt > 4.64 && h.k < .25)) { arm(g, h.x, h.y - beat * h.s * .2 * chant, h.s, h.k < .2 ? 1 : -1, 1.6 + beat * .5, "#2c3138"); }
    }
    if (lt > 7.25) for (let i = 0; i < 9; i++) { const r = rng(i + 9), x = 120 + r() * 840, y = 700 + r() * 520, sz = 60 + (y - 700) * .12; drawBanana(g, x, y - beat * 10, sz * smooth(prog(lt, 7.25 + i * .29, 7.6 + i * .29)), Math.sin(lt * 3 + i) * .3); }
    // Frank Newton walks in along the front, then raises the banana
    const walkX = lerp(-140, 540, easeOut(prog(lt, 0, 3.9))), raise = smooth(prog(lt, 4.06, 4.64)), y0 = 1336, hh = 330;
    const pose = raise > .5 ? "cheer" : "walk", hands = figure(g, walkX, y0, hh, { pose, phase: lt * Math.PI / .58, dir: 1, col: "#1a1f2a", scarf: "#79b8e4" });
    const bx = raise > .5 ? walkX : walkX + hh * .12, byy = lerp(y0 - hh * .86, y0 - hh * 1.22 - beat * 12 * chant, raise);
    drawBanana(g, bx, byy, 280, lerp(-.35, Math.sin(lt * 2) * .12, raise));
    g.restore();
    drawRain(g, lt, .25, "rgba(230,232,235,");
    osd(g, t, [lt < 6.96 ? "AUG.15 1987" : "1988", "MAINE ROAD"]);
  }
  return { draw };
})();
function shotMaine(g, t, lt) { MAINE.draw(g, t, lt); }
function shotAnfield(g, t, lt) {
  const k = easeInOut(prog(lt, 0, 10.4));
  ANF.draw(g, t, { cam: { x: lerp(380, 220, k), y: lerp(-70, -20, k), s: lerp(1.62, 1.28, k) }, rise: lt, dof: 1, fg: smooth(prog(lt, 1.5, 3.0)) });
}
function shotAnfield2(g, t, lt) {
  // drift, then lean in on the away end just before the reverse angle
  const k = easeInOut(prog(lt, 0, 8.75)), push = easeIn(prog(lt, 7.5, 8.75));   // the push ends exactly where shotShield begins
  ANF.draw(g, t, { cam: { x: lerp(-10, 30, k) + 370 * push, y: lerp(30, -10, k) - 70 * push, s: lerp(1.0, 1.1, k) + .4 * push }, banner: smooth(prog(lt, 4.5, 5.3)), dof: .6 });
}
