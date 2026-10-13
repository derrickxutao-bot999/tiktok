"use strict";
/* scenesB.js — the craze: 1 → 50 bananas, the inflatable zoo, acid house, Boxing Day 1988 at Stoke */

const GROOVE = { t0: 31.0, B: 2.0714 / 4 };   // the acid-house groove in soundtrack.py: 115.9 bpm, bar lines from 31.0 s
const BRIGHT = ["#e8c53a", "#3f8fd6", "#d9483b", "#4aa35a", "#e07ab0", "#f08a2a", "#7a5cc8", "#79b8e4", "#f2f2f2", "#2b3a55"];

/* ---------- a sunny away terrace: one banana becomes fifty ---------- */
const CRAZE = (() => {
  let L = null;
  function build() {
    L = {};
    const c = makeCanvas(W + 400, H + 200), g = c.getContext("2d"); g.translate(200, 0);
    const sky = g.createLinearGradient(0, 0, 0, 600); sky.addColorStop(0, "#7fa6c4"); sky.addColorStop(1, "#cfdbe2"); g.fillStyle = sky; g.fillRect(-200, 0, W + 400, 620);
    blit(g, SPR.glowWarm, 900, 160, 700, .45);
    g.fillStyle = "#8a8b86"; g.fillRect(-200, 560, W + 400, 800);
    const cr = crowdLayer(51, Array.from({ length: 13 }, (_, i) => ({ y: 600 + i * 55, s: 13 + i * 2.4 })), { jackets: ["#e6e1d3", "#79b8e4", "#c9c3b0", "#3e5a74", "#f2f2f2", "#7a6a55"], scarves: .4, hats: .15 });
    g.drawImage(cr.c, -200, 0); L.heads = cr.heads.filter(h => h.x > -40 && h.x < W + 40 && h.y > 640);
    const r = rng(52); L.order = L.heads.map(h => ({ h, k: r() })).sort((a, b) => a.k - b.k).map(o => o.h);
    g.fillStyle = "#666b6a"; g.fillRect(-200, 1340, W + 400, 40);
    const p = g.createLinearGradient(0, 1380, 0, H + 200); p.addColorStop(0, "#6f9a4e"); p.addColorStop(1, "#4b7535"); g.fillStyle = p; g.fillRect(-200, 1380, W + 400, H);
    L.bg = c;
    const z = makeCanvas(W + 400, H + 200), zg = z.getContext("2d"); zg.translate(200, 0);
    zg.fillStyle = sky; zg.fillRect(-200, 0, W + 400, 620); zg.fillStyle = "#8a8b86"; zg.fillRect(-200, 560, W + 400, 800);
    const cz = crowdLayer(53, Array.from({ length: 12 }, (_, i) => ({ y: 640 + i * 60, s: 16 + i * 2.6 })), { jackets: BRIGHT, scarves: .3, hats: .3 });
    zg.drawImage(cz.c, -200, 0); zg.fillStyle = p; zg.fillRect(-200, 1380, W + 400, H);
    L.zoo = z; L.zooHeads = cz.heads.filter(h => h.x > -20 && h.x < W + 20 && h.y > 660);
  }
  function count(g, t, lt) {
    if (!L) build();
    const s = 1.03 + .025 * lt;
    g.save(); g.translate(540, 1100); g.scale(s, s); g.translate(-540, -1100);
    g.drawImage(L.bg, -200, 0);
    const n = Math.round(lerp(1, 50, easeIn(prog(lt, .3, 3.5))));
    for (let i = 0; i < n; i++) {
      const h = L.order[i], born = .3 + 3.2 * Math.cbrt(i / 49), k = clamp((lt - born) / .3), pop = k < 1 ? easeOut(k) * (1 + .25 * Math.sin(k * Math.PI)) : 1;
      if (pop <= 0) continue;
      arm(g, h.x, h.y, h.s, h.k < .5 ? 1 : -1, 1.8, "#2c3138");
      drawBanana(g, h.x + (h.k - .5) * h.s, h.y - h.s * 2.2 + Math.sin(t * 3 + h.ph) * 4, h.s * 5.2 * pop, Math.sin(t * 2 + h.ph) * .3);
    }
    g.restore();
    osd(g, t, ["1988", "BANANAS " + String(n).padStart(3, "0")]);
  }
  function zoo(g, t, lt) {
    if (!L) build();
    const s = 1.02 + .03 * lt;
    g.save(); g.translate(540, 1100); g.scale(s, s); g.translate(-540, -1100);
    g.drawImage(L.zoo, -200, 0);
    L.zooHeads.forEach((h, i) => {
      if (i % 3) return;
      const kind = INFL[i % INFL.length], bob = Math.sin(t * 2.6 + h.ph) * 8, sway = Math.sin(t * 1.3 + h.ph) * 26;
      arm(g, h.x, h.y, h.s, i % 2 ? 1 : -1, 1.9, "#2c3138");
      drawInflatable(g, kind, h.x + sway, h.y - h.s * 2.6 + bob, h.s * 6, Math.sin(t * 1.7 + h.ph) * .25);
    });
    g.restore();
    const [bx, by, bl, ba] = zooHero(t);
    g.fillStyle = "#15181d"; bust(g, 790, 1745, 150, "#15181d");
    g.lineCap = "round"; g.strokeStyle = "#15181d"; g.lineWidth = 46; g.beginPath(); g.moveTo(860, 1800); g.quadraticCurveTo(840, 1420, bx + 60, by + 110); g.stroke();
    drawBanana(g, bx, by, bl, ba);
    osd(g, t, ["1988-89"]);
  }
  return { count, zoo };
})();
// the hero banana of the zoo shot: [x, y, length, angle]
function zooHero(t) { return [585 + Math.sin(t * 1.6) * 14, 1040 + Math.sin(t * 2.2) * 10, 340, -.18 + Math.sin(t * 1.4) * .08]; }
// the middle of its spine (drawBanana arches the centre line up by .07 L): the zoom dives in there
function zooTarget(t) { const [x, y, L, a] = zooHero(t), d = -.07 * L; return [x - d * Math.sin(a), y + d * Math.cos(a)]; }
function shotCount(g, t, lt) { CRAZE.count(g, t, lt); }
function shotZoo(g, t, lt) { CRAZE.zoo(g, t, lt); }

/* ---------- Manchester, 1988: acid house ---------- */
const CLUB_BUILD = [0, 1, 2, 3].map(i => 44.466 + i * GROOVE.B / 4).concat([0, 1, 2, 3, 4, 5, 6, 7].map(i => 44.984 + i * GROOVE.B / 8));   // snare roll into the drop
function shotClub(g, t, lt) {
  g.fillStyle = "#06070b"; g.fillRect(0, 0, W, H);
  const bt = (t - GROOVE.t0) / GROOVE.B, beat = ((bt % 1) + 1) % 1;
  const brk = smooth(prog(t, 43.43, 43.6)) * (1 - smooth(prog(t, 45.3, 45.5)));   // the breakdown: no kick, house lights low
  const kick = Math.exp(-beat * 6) * (1 - brk), sway = Math.sin(bt * Math.PI / 2);
  blit(g, SPR.glowCool, 540, 520, 1400, .25 + .2 * kick);
  // a smiley projected on the back wall
  g.save(); g.translate(540, 560); g.scale(1 + kick * .04, 1 + kick * .04);
  g.globalAlpha = .85 * (1 - .55 * brk); g.fillStyle = "#f5d33a"; g.beginPath(); g.arc(0, 0, 210, 0, TAU); g.fill();
  g.fillStyle = "#16130a"; g.beginPath(); g.ellipse(-70, -55, 22, 42, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(70, -55, 22, 42, 0, 0, TAU); g.fill();
  g.lineWidth = 20; g.strokeStyle = "#16130a"; g.lineCap = "round"; g.beginPath(); g.arc(0, 10, 130, .2 * Math.PI, .8 * Math.PI); g.stroke();
  g.restore(); g.globalAlpha = 1;
  // lasers from the booth: they slow right down in the breakdown
  const lp = lt * 1.3 - brk * (t - 43.43) * .9;
  for (let i = 0; i < 7; i++) { const a = Math.PI / 2 + Math.sin(lp + i) * .9; beam(g, 540, 120, 540 + Math.cos(a) * 2200, 120 + Math.sin(a) * 2200, 2, 14, i % 2 ? "rgba(80,255,120," : "rgba(80,200,255,", .5 * (1 - .65 * brk)); }
  // dancers, arms up, on the beat, backlit by haze; in the breakdown they sway in half time
  blit(g, SPR.glowCool, 540, 1250, 1900, .35 + .25 * kick); blit(g, SPR.glowWarm, 300, 1350, 900, .2 + .15 * brk); blit(g, SPR.glowWarm, 820, 1300, 900, .2 + .15 * brk);
  const r = rng(88);
  for (let row = 0; row < 4; row++) for (let i = 0; i < 9 - row; i++) {
    const x = (i + .5) * W / (9 - row) + (r() - .5) * 60 + brk * sway * 18 * (row % 2 ? 1 : -1), h = 360 + row * 170;
    const y = 1180 + row * 230 + Math.abs(Math.sin((bt + r()) * Math.PI)) * -18 * (1 - brk);
    figure(g, x, y, h, { pose: r() < .7 ? "cheer" : "stand", phase: brk ? bt * 1.5 + i : lt * 6 + i, dir: r() < .5 ? 1 : -1, hat: false, col: "#030305" });
  }
  let strobe = beat < .08 && Math.floor(bt) % 2 === 0 ? .35 * (1 - brk) : 0;
  for (const h of CLUB_BUILD) if (t >= h && t < h + .045) strobe = Math.max(strobe, .2 + .3 * prog(h, 44.4, 45.5));
  if (strobe) { g.fillStyle = `rgba(255,255,255,${strobe})`; g.fillRect(0, 0, W, H); }
  osd(g, t, ["MANCHESTER 1988"]);
}

/* ---------- Boxing Day 1988, away at Stoke ---------- */
const STOKE = (() => {
  let L = null;
  const items = [];
  function build() {
    L = {};
    const c = makeCanvas(W + 600, H + 300), g = c.getContext("2d"); g.translate(300, 0);
    const sky = g.createLinearGradient(0, 0, 0, 640); sky.addColorStop(0, "#7c868d"); sky.addColorStop(1, "#b6bab5"); g.fillStyle = sky; g.fillRect(-300, 0, W + 600, 660);
    for (const px of [-160, 1240]) {
      g.strokeStyle = "#3a3d40"; g.lineWidth = 4; g.beginPath(); g.moveTo(px - 26, 640); g.lineTo(px - 8, 180); g.moveTo(px + 26, 640); g.lineTo(px + 8, 180); g.stroke();
      g.lineWidth = 2; for (let y = 640; y > 200; y -= 28) { g.beginPath(); g.moveTo(px - 26 + (640 - y) * .04, y); g.lineTo(px + 26 - (640 - y + 28) * .04, y - 28); g.stroke(); }
      g.fillStyle = "#2c2f33"; g.fillRect(px - 70, 130, 140, 70); g.fillStyle = "#e9ecef"; for (let a = 0; a < 5; a++) for (let b = 0; b < 2; b++) g.fillRect(px - 60 + a * 26, 140 + b * 30, 18, 20);
    }
    g.fillStyle = "#2a2d31"; g.fillRect(-300, 540, W + 600, 40); g.fillStyle = "#77786f"; g.fillRect(-300, 580, W + 600, 780);
    const cr = crowdLayer(61, Array.from({ length: 13 }, (_, i) => ({ y: 620 + i * 54, s: 14 + i * 2.3 })), { jackets: BRIGHT, scarves: .35, hats: .65, hatCols: ["#d0202a", "#d0202a", "#f2f2f2", "#79b8e4"] });
    g.drawImage(cr.c, -300, 0);
    const r = rng(62);
    cr.heads.forEach((h, i) => { if (r() < .22 && h.y > 650) items.push({ h, kind: INFL[(r() * INFL.length) | 0], ph: r() * TAU }); });
    g.fillStyle = "#5a5c58"; g.fillRect(-300, 1340, W + 600, 34);
    const p = g.createLinearGradient(0, 1374, 0, H + 300); p.addColorStop(0, "#5f7044"); p.addColorStop(1, "#3c4a2c"); g.fillStyle = p; g.fillRect(-300, 1374, W + 600, H);
    for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(70,55,35,0.25)"; g.beginPath(); g.ellipse(r() * W, 1420 + r() * 500, 60 + r() * 120, 10 + r() * 14, 0, 0, TAU); g.fill(); }
    g.fillStyle = "#1a1c1f"; g.fillRect(-300, 1330, 260, 60);
    L.bg = c;
  }
  function draw(g, t, lt) {
    if (!L) build();
    const k1 = easeInOut(prog(lt, 3.6, 5.0)), k2 = easeInOut(prog(lt, 7.3, 9.0));
    const s = lerp(lerp(1.0, 1.12, k1), 1.55, k2), cy = lerp(1050, 950, k2), cx = lerp(0, 0, k2);
    g.save(); g.translate(540 + cx, cy); g.scale(s, s); g.translate(-540, -cy);
    g.drawImage(L.bg, -300, 0);
    for (const it of items) {
      const { h } = it, bob = Math.sin(t * 2.4 + it.ph) * 7;
      arm(g, h.x, h.y, h.s, it.ph > Math.PI ? 1 : -1, 1.9 + .3 * Math.sin(t * 3 + it.ph), "#2a2e35");
      drawInflatable(g, it.kind, h.x + Math.sin(t * 1.2 + it.ph) * 18, h.y - h.s * 2.5 + bob, h.s * 5.5, Math.sin(t * 1.6 + it.ph) * .25);
    }
    // the team runs out, carrying inflatables
    const run = prog(lt, 3.9, 7.6);
    if (run > 0 && run < 1) for (let i = 0; i < 6; i++) {
      const x = lerp(-260, 1300, run) - i * 130, y = 1600 + (i % 2) * 50, hh = 380;
      figure(g, x + 3, y + 3, hh, { pose: "walk", phase: lt * 11 + i, dir: 1, hat: false, col: "rgba(10,20,30,0.45)" });
      figure(g, x, y, hh, { pose: "walk", phase: lt * 11 + i, dir: 1, hat: false, col: "#5aa6dc" });
      g.fillStyle = "#f4f4f2"; g.fillRect(x - hh * .1, y - hh * .5, hh * .2, hh * .12);
      if (i % 2 === 0) drawBanana(g, x + hh * .14, y - hh * .62, 150, -.4 + Math.sin(lt * 9 + i) * .1); else drawShark(g, x + hh * .14, y - hh * .62, 150, -.2);
    }
    g.restore();
    const dusk = smooth(prog(lt, 8.0, 11));
    if (dusk > 0) { g.fillStyle = `rgba(20,25,40,${.35 * dusk})`; g.fillRect(0, 0, W, H); blit(g, SPR.glowWhite, 120, 150, 420, .5 * dusk); blit(g, SPR.glowWhite, 960, 150, 420, .5 * dusk); }
    osd(g, t, ["DEC.26 1988", "STOKE"]);
  }
  return { draw };
})();
function shotStoke(g, t, lt) { STOKE.draw(g, t, lt); }
