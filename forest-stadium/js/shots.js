"use strict";
/* shots.js — candle macro, the reveal, chapter cards, carols, floodlights, the forest exterior */

/* ---------- 1. a single candle, then a rack focus onto the stands ---------- */
const BOKEH = (() => { const r = rng(88), out = []; for (let i = 0; i < 190; i++) { const row = r() * 11 | 0; out.push({ x: r() * 1240 - 80, y: 660 + row * 52 + (r() - .5) * 24, size: 60 + r() * 70, on: .8 + r() * 2.6, ph: r() * 50 }); } return out; })();
const candleBuf = makeCanvas(W, H), cbg = candleBuf.getContext("2d");
function drawFlame(g, x, y, h, w, k, t) {
  if (k <= 0) return;
  const sway = fbm1(t * 2.3) * 6 + noise1(t * 9.7) * 2.2, hh = h * (.9 + .1 * noise1(t * 11.3)) * k;
  blit(g, SPR.glowWarm, x + sway * .5, y - hh * .45, hh * 5.5, .6 * k);
  g.globalCompositeOperation = "lighter"; g.globalAlpha = k;
  g.beginPath(); g.moveTo(x, y + 6);
  g.bezierCurveTo(x - w, y - hh * .15, x - w * .55 + sway * .4, y - hh * .65, x + sway, y - hh);
  g.bezierCurveTo(x + w * .55 + sway * .4, y - hh * .65, x + w, y - hh * .15, x, y + 6);
  const fg = g.createRadialGradient(x, y - hh * .22, 2, x + sway * .3, y - hh * .4, hh * .78);
  fg.addColorStop(0, "rgba(255,255,248,1)"); fg.addColorStop(.32, "rgba(255,236,170,.95)"); fg.addColorStop(.68, "rgba(255,160,62,.72)"); fg.addColorStop(1, "rgba(220,90,30,0)");
  g.fillStyle = fg; g.fill();
  g.fillStyle = "rgba(90,130,255,0.35)"; g.beginPath(); g.ellipse(x, y - 3, w * .5, 8, 0, 0, TAU); g.fill();
  g.fillStyle = "rgba(255,255,255,0.85)"; g.beginPath(); g.ellipse(x + sway * .15, y - hh * .27, w * .2, hh * .2, 0, 0, TAU); g.fill();
  g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
}
function drawCandle(g, x, base, k, t) {
  const top = base + 30;
  const dark = g.createLinearGradient(x - 62, 0, x + 62, 0);
  dark.addColorStop(0, "#07080a"); dark.addColorStop(.5, "#1b1814"); dark.addColorStop(1, "#07080a");
  g.fillStyle = dark; g.fillRect(x - 62, top, 124, H - top + 40);
  if (k > 0) {
    const lit = g.createLinearGradient(x - 62, 0, x + 62, 0);
    lit.addColorStop(0, "#2a2018"); lit.addColorStop(.22, "#8f7a60"); lit.addColorStop(.5, "#d7c3a3"); lit.addColorStop(.78, "#9c8670"); lit.addColorStop(1, "#2a2018");
    g.globalAlpha = k; g.fillStyle = lit; g.fillRect(x - 62, top, 124, H - top + 40);
    const fall = g.createLinearGradient(0, top, 0, top + 820); fall.addColorStop(0, "rgba(0,0,0,0)"); fall.addColorStop(1, "rgba(0,0,0,0.92)");
    g.fillStyle = fall; g.fillRect(x - 63, top, 126, H - top + 40);
    blit(g, SPR.glowWarm, x, top + 30, 260, .55 * k);
    g.globalAlpha = 1;
  }
  g.fillStyle = mixHex("#16130f", "#ead8b8", k); g.beginPath(); g.ellipse(x, top, 62, 13, 0, 0, TAU); g.fill();
  g.fillStyle = mixHex("#0e0c0a", "#c9a77a", k); g.beginPath(); g.ellipse(x, top + 1, 44, 8, 0, 0, TAU); g.fill();
  g.fillStyle = mixHex("#1a1611", "#dcc7a5", k); g.beginPath(); g.moveTo(x + 34, top + 6); g.quadraticCurveTo(x + 44, top + 40, x + 40, top + 76); g.arc(x + 36, top + 76, 5, 0, Math.PI); g.quadraticCurveTo(x + 30, top + 40, x + 26, top + 8); g.fill();
  g.strokeStyle = "#0b0907"; g.lineWidth = 4; g.lineCap = "round"; g.beginPath(); g.moveTo(x, top); g.quadraticCurveTo(x + 2, top - 14, x - 2, base + 2); g.stroke();
  blit(g, SPR.glowWarm, x - 1, base + 4, 26, .9 * k);
}
function shotCandle(g, t) {
  const bgG = g.createLinearGradient(0, 0, 0, H); bgG.addColorStop(0, "#04070b"); bgG.addColorStop(.55, "#0b1219"); bgG.addColorStop(1, "#05080b");
  g.fillStyle = bgG; g.fillRect(0, 0, W, H);
  const ign = easeOut(prog(t, .35, 1.2)), focus = smooth(prog(t, 3.4, 4.9));
  const sc = 1 + .06 * easeInOut(prog(t, 0, 5.3)), ox = fbm1(t * .4) * 7, oy = fbm1(t * .37 + 3) * 5;
  g.save(); g.translate(540 + ox, 1000 + oy); g.scale(sc, sc); g.translate(-540, -1000);
  blit(g, SPR.glowWarm, 540, 930, 1500 * ign, .22 * ign);
  // the stands behind, out of focus until the rack focus
  g.globalCompositeOperation = "lighter";
  for (const b of BOKEH) {
    if (t < b.on) continue;
    const a = clamp((t - b.on) / .6) * (.78 + .22 * noise1(t * 5 + b.ph)), size = lerp(b.size, 9, focus);
    g.globalAlpha = a * lerp(.55, 1, focus);
    g.drawImage(focus > .6 ? SPR.glowWarm : SPR.bokehWarm, b.x - size / 2, b.y - size / 2, size, size);
    if (focus > .5) { g.globalAlpha = a * (focus - .5) * 2; g.fillStyle = "#ffe2b0"; g.fillRect(b.x - 1.2, b.y - 1.6, 2.4, 3.2); }
  }
  g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
  // the candle on its own buffer so it can be defocused
  cbg.setTransform(1, 0, 0, 1, 0, 0); cbg.clearRect(0, 0, W, H);
  drawCandle(cbg, 540, 1000, ign, t);
  drawFlame(cbg, 540, 1000, 128, 30, ign, t);
  // ignition sparks
  const r = rng(3);
  for (let i = 0; i < 16; i++) { const st = .32 + r() * .2, k = prog(t, st, st + .5); if (k <= 0 || k >= 1) continue; const ang = -Math.PI / 2 + (r() - .5) * 2.2, d = 30 + r() * 120; blit(cbg, SPR.glowWarm, 540 + Math.cos(ang) * d * easeOut(k), 990 + Math.sin(ang) * d * easeOut(k) + 60 * k * k, 18, 1 - k); }
  g.filter = focus > .02 ? `blur(${(focus * 18).toFixed(1)}px)` : "none";
  g.drawImage(candleBuf, 0, 0); g.filter = "none";
  g.restore();
  drawSnow(g, t, .5, 8, 1);
}

/* ---------- 2. the reveal: thousands of candles in a stadium in the forest ---------- */
function shotReveal(g, t) {
  const k = easeOut(prog(t, 4.5, 9.6));
  STAD.draw(g, t, { cam: { x: lerp(30, 0, k), y: lerp(-170, 60, k), s: lerp(1.42, 1.0, k) }, count: STAD.total, crowd: true, crowdLit: 1, snow: .85 });
}

/* ---------- chapter cards: a brush character per act ---------- */
const brushCache = {};
function brushChar(ch, col, size) {
  const key = ch + col + size;
  if (brushCache[key]) return brushCache[key];
  const c = makeCanvas(size * 1.4, size * 1.4), g = c.getContext("2d"), r = rng(ch.charCodeAt(0));
  g.textAlign = "center"; g.textBaseline = "middle"; g.font = `${size}px MaShanZheng`; g.fillStyle = col;
  g.fillText(ch, c.width / 2, c.height / 2 + size * .04);
  g.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 900; i++) { g.globalAlpha = .2 + r() * .6; g.beginPath(); g.arc(r() * c.width, r() * c.height, r() * 2.4, 0, TAU); g.fill(); }
  for (let i = 0; i < 40; i++) { g.globalAlpha = .35; g.lineWidth = 1 + r() * 1.5; g.beginPath(); const x = r() * c.width, y = r() * c.height; g.moveTo(x, y); g.lineTo(x + (r() - .3) * 120, y + (r() - .5) * 18); g.stroke(); }
  return (brushCache[key] = c);
}
function chapter(g, lt, ch, col, glow, labels, labCol) {
  const c = brushChar(ch, col, 380), p = easeInOut(prog(lt, .25, 1.05)), a = smooth(prog(lt, .15, .6)), s = 1.05 - .05 * easeOut(prog(lt, 0, 2.1));
  g.save(); g.translate(540, 860); g.scale(s, s);
  if (glow) { g.globalAlpha = a * .45; g.filter = "blur(14px)"; g.drawImage(c, -c.width / 2, -c.height / 2); g.filter = "none"; }
  g.beginPath(); const sweep = -c.width / 2 - 200 + (c.width + 400) * p; g.moveTo(-c.width, -c.height); g.lineTo(sweep + 160, -c.height); g.lineTo(sweep - 160, c.height); g.lineTo(-c.width, c.height); g.clip();
  g.globalAlpha = a; g.drawImage(c, -c.width / 2, -c.height / 2);
  g.restore();
  const la = smooth(prog(lt, .7, 1.3)) * (1 - smooth(prog(lt, 1.9, 2.1)));
  g.save(); g.textAlign = "center"; g.fillStyle = labCol; g.globalAlpha = la;
  g.font = "700 34px Cormorant"; g.letterSpacing = "14px"; g.fillText(labels[0], 547, 600);
  g.font = "700 46px Playfair"; g.letterSpacing = "8px"; g.fillText(labels[1], 544, 1180);
  g.font = "italic 500 30px Cormorant"; g.letterSpacing = "6px"; g.fillText(labels[2], 543, 1232);
  g.restore();
}
function fog(g, t, col, n = 14, seed = 6) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) { const x = ((r() * 1600 + t * (12 + r() * 20)) % 1600) - 260, y = 300 + r() * 1300, s = 380 + r() * 520; g.globalAlpha = .05 + r() * .06; g.save(); g.translate(x, y); g.scale(1.8, 1); g.drawImage(SPR.soft, -s / 2, -s / 2, s, s); g.restore(); }
  g.globalAlpha = 1;
}
function chapterBlood(g, t, lt) {
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#090d11"); gr.addColorStop(.5, "#161d23"); gr.addColorStop(1, "#080b0e");
  g.fillStyle = gr; g.fillRect(0, 0, W, H); fog(g, t, 0);
  chapter(g, lt, "血", "#a3121f", false, ["I", "2004", "Blut"], "#c9d2d8");
}
function chapterSweat(g, t, lt) {
  const gr = g.createRadialGradient(540, 840, 40, 540, 900, 1200);
  gr.addColorStop(0, "#fff1cf"); gr.addColorStop(.18, "#ffc576"); gr.addColorStop(.5, "#c4612a"); gr.addColorStop(1, "#3a140b");
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  blit(g, SPR.glowWhite, 540, 840, 520 + 30 * Math.sin(t * 2), .55);
  const r = rng(21); g.globalCompositeOperation = "lighter";
  for (let i = 0; i < 60; i++) { const x = r() * W, y = (r() * H - t * (20 + r() * 40)) % H, yy = y < 0 ? y + H : y; g.globalAlpha = .25 + r() * .3; g.fillStyle = "#ffe3a8"; g.fillRect(x, yy, 2.5, 2.5); }
  g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
  chapter(g, lt, "汗", "#1e0f08", false, ["II", "2008", "Schweiß"], "#3a1a0c");
}
function chapterSong(g, t, lt) {
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#04080f"); gr.addColorStop(.6, "#0d1b29"); gr.addColorStop(1, "#060b11");
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  blit(g, SPR.glowCool, 540, 860, 900, .18);
  drawSnow(g, t, .7, 10, 0);
  chapter(g, lt, "歌", "#e8edf2", true, ["III", "2003 —", "Lieder"], "#c9d6e2");
}

/* ---------- 9. carols today: from 89 voices to 28,500 candles ---------- */
function carolCount(t) { return t < 41.2 ? 89 : 89 + (STAD.total - 89) * Math.pow(prog(t, 41.2, 46.2), 2); }
function shotCarols(g, t) {
  const k = easeInOut(prog(t, 41.0, 46.9));
  STAD.draw(g, t, { cam: { x: lerp(-20, 0, k), y: lerp(-60, 50, k), s: lerp(1.75, 1.04, k) }, count: carolCount(t), crowd: true, crowdLit: smooth(prog(t, 43.2, 46.2)), snow: .9 });
}

/* ---------- 10. floodlights: survival becomes success ---------- */
function shotFlood(g, t) {
  const k = easeOut(prog(t, 47.2, 52.3));
  STAD.draw(g, t, { cam: { x: 0, y: lerp(70, 10, k), s: lerp(1.16, 1.02, k) }, count: STAD.total, flood: smooth(prog(t, 47.25, 47.8)), ignite: [47.25, 47.42], scarves: smooth(prog(t, 47.5, 48.4)), banner: smooth(prog(t, 47.7, 48.5)), crowd: false, snow: 1 });
}

/* ---------- 11. the stadium glowing in the snowy forest; end card ---------- */
function shotExterior(g, t) {
  const k = easeInOut(prog(t, 51.6, 59));
  EXTERIOR.draw(g, t, { cam: { x: lerp(24, -16, k), y: lerp(-30, 10, k), s: lerp(1.0, 1.12, k) }, snow: .9 });
}
