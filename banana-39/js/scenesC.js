"use strict";
/* scenesC.js — the fade, the fall, Wembley 1999, the money, a shoebox, the verdict, the last banana */

/* ---------- the tape stops; empty seats; a deflated banana in the rain ---------- */
const tapeBuf = makeCanvas(W, H), tbg = tapeBuf.getContext("2d");
const SEATS = (() => { let c = null; return () => {
  if (c) return c;
  c = makeCanvas(W + 200, H); const g = c.getContext("2d"); g.translate(100, 0);
  g.fillStyle = "#26303a"; g.fillRect(-100, 0, W + 200, H);
  for (let row = 0; row < 11; row++) {
    const k = row / 10, y = 260 + Math.pow(k, 1.6) * 1250, s = lerp(34, 150, Math.pow(k, 1.5)), step = s * 1.25;
    g.fillStyle = "#1a2129"; g.fillRect(-100, y + s * .55, W + 200, s * .5);
    for (let x = -100 + (row % 2) * step * .5; x < W + 100; x += step) {
      const gr = g.createLinearGradient(0, y - s * .4, 0, y + s * .5); gr.addColorStop(0, "#3c78b4"); gr.addColorStop(1, "#24507e");
      g.fillStyle = gr; roundRect(g, x - s * .5, y - s * .45, s, s * .62, s * .12); g.fill();
      g.fillStyle = "#1d466f"; roundRect(g, x - s * .52, y + s * .12, s * 1.04, s * .28, s * .08); g.fill();
      g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(x - s * .4, y - s * .4, s * .8, s * .06);
    }
  }
  return c;
}; })();
function shotFade(g, t, lt) {
  if (lt < .9) {
    tbg.setTransform(1, 0, 0, 1, 0, 0); STOKE.draw(tbg, t, 11 + lt);
    const k = easeIn(lt / .9);
    g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    g.drawImage(tapeBuf, 0, H / 2 - H * (1 - k) / 2 + k * 40, W, Math.max(2, H * (1 - k)));
    g.fillStyle = `rgba(255,255,255,${k * .6})`; g.fillRect(0, H / 2 - 2, W, 4);
    return;
  }
  const s = 1 + .04 * (lt - .9);
  g.save(); g.translate(540, 1300); g.scale(s, s); g.translate(-540, -1300);
  g.drawImage(SEATS(), -100, 0);
  drawBanana(g, 560, 1585, 520, .08, { deflate: .8, sheen: .35 });
  g.fillStyle = "rgba(255,255,255,0.5)"; const r = rng(4); for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(380 + r() * 360, 1560 + r() * 60, 2 + r() * 3, 0, TAU); g.fill(); }
  g.restore();
  drawRain(g, lt, 1, "rgba(200,210,225,");
}

/* ---------- down to the third tier ---------- */
function shotLadder(g, t, lt) {
  const bgG = g.createLinearGradient(0, 0, 0, H); bgG.addColorStop(0, "#0d1622"); bgG.addColorStop(1, "#05080c"); g.fillStyle = bgG; g.fillRect(0, 0, W, H);
  const tiers = [["第一级别 · 英超", "PREMIER LEAGUE"], ["第二级别 · 甲级", "DIVISION ONE"], ["第三级别 · 乙级", "DIVISION TWO"]];
  tiers.forEach(([zh, en], i) => {
    const y = 560 + i * 230;
    g.fillStyle = i === 2 ? "rgba(160,40,40,0.35)" : "rgba(255,255,255,0.06)"; roundRect(g, 150, y, 780, 150, 14); g.fill();
    g.strokeStyle = "rgba(255,255,255,0.25)"; g.lineWidth = 2; roundRect(g, 150, y, 780, 150, 14); g.stroke();
    g.fillStyle = "rgba(240,240,240,0.92)"; g.font = "500 40px NotoSerifSC"; g.fillText(zh, 200, y + 70);
    g.fillStyle = "rgba(240,240,240,0.55)"; g.font = "600 26px Oswald"; g.letterSpacing = "4px"; g.fillText(en, 200, y + 112); g.letterSpacing = "0px";
  });
  const d1 = easeOutBounce(prog(lt, .4, 1.2)), d2 = easeOutBounce(prog(lt, 1.6, 2.5));
  const y = 635 + d1 * 230 + d2 * 230;
  g.fillStyle = "#79b8e4"; g.beginPath(); g.arc(800, y, 46, 0, TAU); g.fill();
  g.fillStyle = "#0d1622"; g.font = "600 24px Oswald"; g.textAlign = "center"; g.fillText("CITY", 800, y + 9); g.textAlign = "left";
  g.fillStyle = "rgba(240,240,240,0.8)"; g.font = "600 30px Oswald";
  if (d1 > .05) g.fillText("1996", 870, 800); if (d2 > .05) g.fillText("1998", 870, 1030);
}
function easeOutBounce(k) { const n = 7.5625, d = 2.75; if (k < 1 / d) return n * k * k; if (k < 2 / d) return n * (k -= 1.5 / d) * k + .75; if (k < 2.5 / d) return n * (k -= 2.25 / d) * k + .9375; return n * (k -= 2.625 / d) * k + .984375; }

/* ---------- Wembley, 30 May 1999 ---------- */
const WEM = (() => {
  let L = null;
  function build() {
    L = {};
    const c = makeCanvas(W + 400, H + 200), g = c.getContext("2d"); g.translate(200, 0);
    const sky = g.createLinearGradient(0, 0, 0, 700); sky.addColorStop(0, "#9fb6c9"); sky.addColorStop(1, "#e3e4dc"); g.fillStyle = sky; g.fillRect(-200, 0, W + 400, 720);
    for (const tx of [380, 700]) {
      g.fillStyle = "#f1efe8"; g.fillRect(tx - 40, 300, 80, 330); g.beginPath(); g.arc(tx, 300, 40, Math.PI, TAU); g.fill();
      g.fillStyle = "#d8d5cc"; g.fillRect(tx - 40, 300, 14, 330); g.fillStyle = "#3a3a3a"; g.fillRect(tx - 2, 200, 4, 70);
      g.fillStyle = "#c8c4b8"; for (let y = 340; y < 620; y += 40) g.fillRect(tx - 30, y, 60, 6);
    }
    g.fillStyle = "#e6e3da"; g.fillRect(-200, 600, W + 400, 70); g.fillStyle = "#2a2c30"; g.fillRect(-200, 670, W + 400, 40);
    const cr = crowdLayer(71, Array.from({ length: 12 }, (_, i) => ({ y: 740 + i * 52, s: 14 + i * 2.4 })), { jackets: ["#79b8e4", "#5c9fd0", "#f2f2f2", "#79b8e4", "#2b3a55", "#1f2630"], scarves: .5, hats: .15 });
    g.drawImage(cr.c, -200, 0); L.heads = cr.heads.filter(h => h.y > 760);
    g.fillStyle = "#4d5a3f"; g.fillRect(-200, 1360, W + 400, H);
    const p = g.createLinearGradient(0, 1380, 0, H + 200); p.addColorStop(0, "#5f8a45"); p.addColorStop(1, "#3c6a2c"); g.fillStyle = p; g.fillRect(-200, 1380, W + 400, H);
    L.bg = c;
  }
  function bug(g, home, away, clock, extra) {
    g.save(); g.font = "600 40px Oswald"; g.textBaseline = "middle";
    g.fillStyle = "rgba(10,14,40,0.88)"; roundRect(g, 70, 190, 470, 70, 8); g.fill();
    g.fillStyle = "#f4f4f4"; g.fillText("GIL", 96, 226); g.fillText(`${home} - ${away}`, 186, 226); g.fillText("MCI", 300, 226);
    g.fillStyle = "#f5d33a"; g.fillText(clock, 400, 226);
    if (extra) { g.fillStyle = "rgba(200,30,40,0.92)"; roundRect(g, 70, 266, 230, 52, 8); g.fill(); g.fillStyle = "#fff"; g.font = "600 32px Oswald"; g.fillText(extra, 90, 293); }
    g.restore();
  }
  function draw(g, t, lt) {
    if (!L) build();
    const boom = smooth(prog(lt, 4.7, 5.1)), s = 1.02 + .03 * lt + boom * .04 * Math.exp(-(lt - 4.9) * 3) * (lt > 4.7 ? 1 : 0);
    g.save(); g.translate(540, 1150); g.scale(s, s); g.translate(-540, -1150);
    g.drawImage(L.bg, -200, 0);
    const joy = lt > 4.7 ? 1 : (lt > 1.8 && lt < 3 ? .35 : 0);
    for (const h of L.heads) if (h.k < joy * .8) arm(g, h.x, h.y - Math.abs(Math.sin(t * 7 + h.ph)) * 6, h.s, h.k < .4 ? 1 : -1, 2.0 + .4 * Math.sin(t * 9 + h.ph), "#22324a");
    if (lt > 6.8 && lt < 8.4) {
      const k = easeOut(prog(lt, 6.8, 7.4));
      g.save(); g.translate(lerp(380, 640, k), 1700 - Math.sin(k * Math.PI) * 120); g.rotate(-1.25 * k);
      figure(g, 0, 0, 380, { pose: "cheer", hat: false, col: "#111418" }); g.restore();
      g.fillStyle = "#f6f6f6"; g.beginPath(); g.arc(lerp(900, 760, k), lerp(1500, 1560, k), 22, 0, TAU); g.fill();
    }
    g.restore();
    if (lt > 4.8 && lt < 6.2) { g.fillStyle = `rgba(255,255,255,${.5 * Math.exp(-(lt - 4.8) * 4)})`; g.fillRect(0, 0, W, H); }
    const sec = lt < 1.8 ? lerp(88 * 60 + 41, 89 * 60 + 2, lt / 1.8) : lt < 4.4 ? lerp(89 * 60 + 2, 90 * 60, (lt - 1.8) / 2.6) : 90 * 60;
    const mm = Math.floor(sec / 60), ss = Math.floor(sec % 60), clock = `${mm}:${String(ss).padStart(2, "0")}`;
    if (lt < 6.4) bug(g, 2, lt > 1.9 ? (lt > 4.8 ? 2 : 1) : 0, clock, lt > 3.6 ? "+5" : null);
    else bug(g, 2, 2, "FT", lt > 7.0 ? "PENS 1-3" : "PENS");
  }
  return { draw };
})();
function shotWembley(g, t, lt) { WEM.draw(g, t, lt); }

/* ---------- the money era: a new skyline, trophies ---------- */
const SKY08 = (() => {
  let L = null;
  function build() {
    L = {};
    const c = makeCanvas(W + 300, H), g = c.getContext("2d"), r = rng(8); g.translate(150, 0);
    const sky = g.createLinearGradient(0, 0, 0, 1300); sky.addColorStop(0, "#050b1a"); sky.addColorStop(.6, "#13305a"); sky.addColorStop(1, "#2f6c9c"); g.fillStyle = sky; g.fillRect(-150, 0, W + 300, H);
    const tw = (x, w, h, col) => { g.fillStyle = col; g.fillRect(x, 1320 - h, w, h + 600); for (let y = 1320 - h + 14; y < 1320; y += 22) for (let xx = x + 6; xx < x + w - 8; xx += 14) if (r() < .45) { g.fillStyle = r() < .2 ? "#9fd3ff" : "#f2c46a"; g.globalAlpha = .55 + r() * .4; g.fillRect(xx, y, 7, 10); g.globalAlpha = 1; } };
    for (let x = -150; x < W + 150; x += 70 + r() * 60) tw(x, 60 + r() * 70, 160 + r() * 240, "#0b1424");
    g.fillStyle = "#0d1a2c"; g.beginPath(); g.moveTo(600, 1320); g.lineTo(600, 420); g.lineTo(690, 420); g.lineTo(690, 700); g.lineTo(720, 700); g.lineTo(720, 1320); g.fill();
    for (let y = 440; y < 1300; y += 18) { g.fillStyle = `rgba(160,210,255,${.25 + r() * .35})`; g.fillRect(606, y, 78, 3); }
    for (const [x, h] of [[200, 520], [920, 560]]) { g.strokeStyle = "#0a1220"; g.lineWidth = 6; g.beginPath(); g.moveTo(x, 1320); g.lineTo(x, 1320 - h); g.lineTo(x + 240, 1320 - h); g.stroke(); g.lineWidth = 2; for (let y = 1320; y > 1320 - h; y -= 30) { g.beginPath(); g.moveTo(x - 10, y); g.lineTo(x + 10, y - 30); g.stroke(); } }
    g.fillStyle = "#050a12"; g.fillRect(-150, 1320, W + 300, H);
    L.bg = c;
  }
  function draw(g, t, lt) {
    if (!L) build();
    const s = 1.02 + .02 * lt;
    g.save(); g.translate(540, 1200); g.scale(s, s); g.translate(-540, -1200);
    g.drawImage(L.bg, -150, 0);
    for (const x of [200, 920]) blit(g, SPR.glowWarm, x, 1320 - (x < 500 ? 520 : 560), 40, Math.floor(t * 1.5) % 2 ? .9 : .3);
    blit(g, SPR.glowCool, 540, 1350, 1400, .5);
    const r = rng(12); g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 90; i++) { const x = r() * W, y = H - ((r() * H + t * (40 + r() * 80)) % H), z = r(); g.globalAlpha = .3 + z * .5; g.drawImage(SPR.glowWarm, x - 6 - z * 6, y - 6 - z * 6, 12 + z * 12, 12 + z * 12); }
    g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
    g.restore();
  }
  return { draw };
})();
function shotSkyline(g, t, lt) { SKY08.draw(g, t, lt); }
function trophy(g, x, y, s, kind) {
  g.save(); g.translate(x, y);
  const gr = g.createLinearGradient(-s, 0, s, 0); gr.addColorStop(0, "#5b4310"); gr.addColorStop(.35, "#f6dc8a"); gr.addColorStop(.6, "#c89a2c"); gr.addColorStop(1, "#4a360c");
  g.fillStyle = gr;
  if (kind === 0) { g.beginPath(); g.moveTo(-s * .55, -s * 1.6); g.quadraticCurveTo(-s * .6, -s * .6, -s * .1, -s * .35); g.lineTo(-s * .1, 0); g.lineTo(-s * .4, s * .1); g.lineTo(s * .4, s * .1); g.lineTo(s * .1, 0); g.lineTo(s * .1, -s * .35); g.quadraticCurveTo(s * .6, -s * .6, s * .55, -s * 1.6); g.closePath(); g.fill();
    g.lineWidth = s * .08; g.strokeStyle = gr; g.beginPath(); g.arc(-s * .62, -s * 1.15, s * .25, Math.PI * .4, Math.PI * 1.6); g.stroke(); g.beginPath(); g.arc(s * .62, -s * 1.15, s * .25, -Math.PI * .6, Math.PI * .6); g.stroke(); }
  else if (kind === 1) { g.beginPath(); g.ellipse(0, -s * 1.3, s * .45, s * .55, 0, 0, TAU); g.fill(); g.fillRect(-s * .08, -s * .8, s * .16, s * .7); g.fillRect(-s * .45, -s * .1, s * .9, s * .2); g.lineWidth = s * .1; g.strokeStyle = gr; g.beginPath(); g.ellipse(-s * .55, -s * 1.3, s * .25, s * .45, 0, 0, TAU); g.stroke(); g.beginPath(); g.ellipse(s * .55, -s * 1.3, s * .25, s * .45, 0, 0, TAU); g.stroke(); }
  else { g.beginPath(); g.moveTo(-s * .4, -s * 1.7); g.lineTo(s * .4, -s * 1.7); g.lineTo(s * .2, -s * .5); g.lineTo(s * .12, 0); g.lineTo(s * .35, s * .1); g.lineTo(-s * .35, s * .1); g.lineTo(-s * .12, 0); g.lineTo(-s * .2, -s * .5); g.closePath(); g.fill(); }
  g.restore();
}
function shotTrophies(g, t, lt) {
  g.fillStyle = "#06080d"; g.fillRect(0, 0, W, H);
  blit(g, SPR.glowWarm, 540, 1020, 1300, .35); beam(g, 540, -100, 540, 1300, 80, 520, "rgba(255,230,180,", .09);
  [[300, 0, .3], [540, 1, .9], [780, 2, 1.5]].forEach(([x, kind, at]) => { const a = smooth(prog(lt, at, at + .7)); if (a <= 0) return; g.globalAlpha = a; trophy(g, x, 1250, 130, kind); blit(g, SPR.glowWarm, x, 1080, 340, .35 * a); g.globalAlpha = 1; });
  const a1 = smooth(prog(lt, .2, .8)) * (1 - smooth(prog(lt, 2.4, 2.8))), a2 = smooth(prog(lt, 2.8, 3.4));
  g.save(); g.textAlign = "center"; g.fillStyle = `rgba(255,236,190,${a1})`; g.font = "600 170px Oswald"; g.fillText("93:20", 540, 620);
  g.font = "600 40px Oswald"; g.letterSpacing = "12px"; g.fillStyle = `rgba(255,236,190,${a1 * .7})`; g.fillText("2012", 546, 690); g.letterSpacing = "0px";
  g.fillStyle = `rgba(255,236,190,${a2})`; g.font = "700 150px Playfair"; g.fillText("2023", 540, 600);
  g.font = "600 70px NotoSerifSC"; g.fillText("★ ★ ★", 540, 720); g.restore();
}
function shotShoebox(g, t, lt) {
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#1b120b"); bg.addColorStop(1, "#0c0806"); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  beam(g, 980, 120, 420, 1500, 60, 380, "rgba(255,210,150,", .16);
  const s = 1 + .03 * lt; g.save(); g.translate(540, 1150); g.scale(s, s); g.translate(-540, -1150);
  g.fillStyle = "#6e4f31"; g.beginPath(); g.moveTo(230, 1000); g.lineTo(850, 1000); g.lineTo(880, 1330); g.lineTo(200, 1330); g.fill();
  g.fillStyle = "#8a6743"; g.beginPath(); g.moveTo(200, 1330); g.lineTo(880, 1330); g.lineTo(880, 1420); g.lineTo(200, 1420); g.fill();
  g.fillStyle = "#1c1b1f"; g.save(); g.translate(430, 1120); g.rotate(-.12); g.fillRect(-150, -55, 300, 110); g.fillStyle = "#efe9da"; g.fillRect(-120, -40, 200, 46);
  g.fillStyle = "#2b2b2b"; g.font = "italic 500 34px Cormorant"; g.fillText("City '88", -105, -6); g.restore();
  g.save(); g.translate(690, 1160); g.rotate(.18); g.fillStyle = "#e9dcc0"; g.fillRect(-90, -45, 180, 90); g.fillStyle = "#3a2f22"; g.font = "600 20px Oswald"; g.fillText("BOXING DAY", -70, -8); g.fillText("1988", -70, 22); g.restore();
  drawBanana(g, 560, 1260, 420, -.06, { deflate: .85, sheen: .5 });
  g.restore();
  const r = rng(3); g.globalCompositeOperation = "lighter";
  for (let i = 0; i < 70; i++) { const x = 400 + r() * 600 + Math.sin(t * .3 + i) * 20, y = 200 + ((r() * 1300 + t * 12) % 1300); g.globalAlpha = .2 + r() * .4; g.fillStyle = "#ffe2b0"; g.fillRect(x, y, 2.5, 2.5); }
  g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
}

/* ---------- the verdict ---------- */
const PAGES = (() => { const r = rng(115); return Array.from({ length: 13 }, (_, i) => { const z = .35 + r() * 1.1, near = z >= 1; return { x: near ? (r() < .5 ? r() * 170 : 910 + r() * 170) : r() * W, y0: r() * 2400, z, rot: (r() - .5) * .8, sp: .2 + r() * .4, seed: r() * 1000 | 0 }; }); })();
function page(g, p, y) {
  const w = 300 * p.z, h = 400 * p.z, r = rng(p.seed);
  g.save(); g.translate(p.x, y); g.rotate(p.rot + Math.sin(y * .003) * .1);
  g.fillStyle = "#e9eaec"; g.fillRect(-w / 2, -h / 2, w, h);
  for (let i = 0; i < 16; i++) { const ly = -h / 2 + h * .1 + i * h * .052, lw = w * (.55 + r() * .3); g.fillStyle = r() < .3 ? "#111" : "rgba(80,85,90,0.6)"; g.fillRect(-w * .4, ly, r() < .3 ? lw : lw * .9, h * (r() < .3 ? .03 : .012)); }
  g.restore();
}
function shotVerdict(g, t, lt) {
  g.fillStyle = "#0b0e12"; g.fillRect(0, 0, W, H);
  blit(g, SPR.glowCool, 540, 700, 1400, .18);
  for (const p of PAGES.filter(p => p.z < 1)) page(g, p, ((p.y0 + lt * 180 * p.sp) % 2400) - 300);
  const a = smooth(prog(lt, .8, 1.8));
  g.save(); g.textAlign = "center"; g.fillStyle = `rgba(240,242,245,${a})`; g.font = "700 300px Playfair"; g.fillText("114", 520, 860);
  g.font = "700 90px Playfair"; g.fillStyle = `rgba(240,242,245,${a * .5})`; g.fillText("/115", 860, 860); g.restore();
  g.filter = "blur(6px)"; g.globalAlpha = .85; for (const p of PAGES.filter(p => p.z >= 1)) page(g, p, ((p.y0 + lt * 260 * p.sp) % 2400) - 300); g.filter = "none"; g.globalAlpha = 1;
}

/* ---------- the last banana, rising ---------- */
function shotRise(g, t, lt) {
  const up = easeInOut(prog(lt, 0, 7.5)) * 1500;
  const sky = g.createLinearGradient(0, -1500 + up, 0, 1900 + up); sky.addColorStop(0, "#03060d"); sky.addColorStop(.55, "#0d2238"); sky.addColorStop(.85, "#2b4a63"); sky.addColorStop(1, "#5b6470");
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  const r = rng(77);
  for (let i = 0; i < 120; i++) { const x = r() * W, y = r() * 2400 - 1500 + up * .9; if (y < 0 || y > H) continue; g.fillStyle = `rgba(255,255,255,${.3 + r() * .5})`; g.fillRect(x, y, 2, 2); }
  for (let i = 0; i < 6; i++) { const y = 200 + i * 380 - 900 + up * (.5 + i * .08); g.save(); g.translate(((i * 337 + t * 10) % 1400) - 200, y); g.scale(5, 1); g.globalAlpha = .1; g.drawImage(SPR.soft, -90, -90, 180, 180); g.restore(); }
  g.globalAlpha = 1;
  // stadium roof lights falling away below
  const ry = 1500 + up * 1.2;
  if (ry < H + 200) { g.fillStyle = "#06090d"; g.fillRect(0, ry, W, H); for (let x = 10; x < W; x += 46) { blit(g, SPR.glowWhite, x, ry + 6, 20, .9); blit(g, SPR.glowCool, x, ry + 6, 120, .2); } }
  const by = lerp(1250, 700, easeInOut(prog(lt, 0, 7.5))), sz = lerp(260, 150, easeInOut(prog(lt, 0, 9)));
  blit(g, SPR.glowWarm, 540, by, sz * 2.2, .25);
  drawBanana(g, 540 + Math.sin(t * .6) * 30, by, sz, Math.sin(t * .4) * .5 + lt * .05);
}
