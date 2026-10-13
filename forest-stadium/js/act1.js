"use strict";
/* act1.js — 2004, Bluten für Union: the queue outside the blood bank, then the drops */

/* ---------- the queue: a cold street, red scarves, breath in the air ---------- */
const QUEUE = (() => {
  let L = null;
  const people = (() => { const r = rng(64); return Array.from({ length: 11 }, (_, i) => ({ x: 70 + i * 66 + (r() - .5) * 14, h: 272 + r() * 44, hat: r() < .75, scarf: r() < .8, ph: r() * 3, sway: r() * TAU, pose: r() < .65 ? "pocket" : "stand", bulk: .95 + r() * .2 })); })();
  function build() {
    L = {};
    const far = makeCanvas(W + 700, 1250), f = far.getContext("2d"), r = rng(61);
    for (let x = -40; x < far.width;) {
      const w = 230 + r() * 170, h = 360 + r() * 330, base = 1150;
      f.fillStyle = "#28333c"; f.fillRect(x, base - h, w, h);
      for (let yy = base - h + 24; yy < base - 30; yy += 30) for (let xx = x + 16; xx < x + w - 24; xx += 28) { f.fillStyle = r() < .16 ? `rgba(225,210,165,${.35 + r() * .35})` : "rgba(12,16,20,0.55)"; f.fillRect(xx, yy, 14, 16); }
      x += w + 26 + r() * 90;
    }
    const fg = f.createLinearGradient(0, 600, 0, 1150); fg.addColorStop(0, "rgba(42,52,60,0)"); fg.addColorStop(1, "rgba(42,52,60,0.75)"); f.fillStyle = fg; f.fillRect(0, 600, far.width, 560);
    L.far = far;
    // the building the queue leans against, with the lit doorway at x 880..990
    const wall = makeCanvas(W + 700, 1400), w = wall.getContext("2d"); w.translate(300, 0);
    w.fillStyle = "#1e262d"; w.fillRect(-300, 760, W + 700, 600);
    w.fillStyle = "rgba(0,0,0,0.28)"; for (let y = 870; y < 1350; y += 112) w.fillRect(-300, y, W + 700, 3); for (let x = -260; x < W + 400; x += 236) w.fillRect(x, 760, 3, 600);
    for (let x = -240; x < W + 380; x += 236) { if (x > 820 && x < 1000) continue; w.fillStyle = "#11171c"; w.fillRect(x + 50, 800, 120, 150); w.fillStyle = "rgba(160,170,180,0.07)"; w.fillRect(x + 50, 800, 120, 4); }
    w.fillStyle = "#0b0f12"; w.fillRect(872, 1040, 126, 312);
    const dg = w.createLinearGradient(0, 1050, 0, 1350); dg.addColorStop(0, "#f6ead0"); dg.addColorStop(1, "#cdb894"); w.fillStyle = dg; w.fillRect(882, 1050, 106, 300);
    w.fillStyle = "rgba(60,48,30,0.55)"; w.fillRect(930, 1050, 3, 300);
    w.fillStyle = "#e9e4d8"; w.fillRect(826, 978, 222, 44); w.fillStyle = "#2a2f33"; w.font = "700 24px Cormorant"; w.letterSpacing = "4px"; w.textAlign = "center"; w.fillText("BLUTSPENDE", 937, 1008);
    L.wall = wall;
  }
  function draw(g, t, lt) {
    if (!L) build();
    const dolly = easeInOut(prog(lt, 0, 4.6)) * 150, push = 1 + .035 * easeInOut(prog(lt, 0, 4.6));
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, "#151c22"); sky.addColorStop(.5, "#26313a"); sky.addColorStop(1, "#0a0d10");
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    g.save(); g.translate(540, 1200); g.scale(push, push); g.translate(-540, -1200);
    g.drawImage(L.far, -300 - dolly * .35, 0);
    g.save(); g.translate(-dolly, 0);
    g.drawImage(L.wall, -300, 0);
    // wet pavement + reflections
    const pv = g.createLinearGradient(0, 1350, 0, H); pv.addColorStop(0, "#151b20"); pv.addColorStop(1, "#07090b");
    g.fillStyle = pv; g.fillRect(-200, 1350, W + 600, H - 1300);
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = .55; g.drawImage(SPR.glowWarm, 935 - 150, 1330, 300, 560);
    g.globalAlpha = .35; g.drawImage(SPR.glowWarm, 360 - 60, 1360, 120, 520);
    g.globalAlpha = .5; g.beginPath(); g.moveTo(882, 1352); g.lineTo(988, 1352); g.lineTo(1120, 1560); g.lineTo(760, 1560); g.closePath();
    const sp = g.createLinearGradient(0, 1352, 0, 1560); sp.addColorStop(0, "rgba(255,230,180,0.5)"); sp.addColorStop(1, "rgba(255,230,180,0)"); g.fillStyle = sp; g.fill();
    g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
    // street lamp
    g.strokeStyle = "#07090b"; g.lineWidth = 9; g.beginPath(); g.moveTo(330, 1362); g.lineTo(330, 790); g.quadraticCurveTo(332, 750, 372, 752); g.stroke();
    g.fillStyle = "#07090b"; g.fillRect(360, 744, 40, 14);
    beam(g, 380, 760, 400, 1360, 14, 230, "rgba(255,226,170,", .16);
    blit(g, SPR.glowWarm, 380, 762, 170, .9); blit(g, SPR.glowWhite, 380, 760, 40, 1);
    blit(g, SPR.glowWarm, 935, 1200, 520, .35);
    // the queue, facing the doorway
    for (const p of people) {
      const sway = Math.sin(t * .9 + p.sway) * 1.5;
      const rim = { pose: p.pose, dir: 1, hat: p.hat, side: true, bulk: p.bulk, phase: t, col: "rgba(255,226,180,0.55)" };
      figure(g, p.x + sway + 2.5, 1352, p.h, rim);
      figure(g, p.x + sway, 1352, p.h, { pose: p.pose, dir: 1, hat: p.hat, side: true, bulk: p.bulk, phase: t, col: "#07090b", scarf: p.scarf ? "#b0142a" : null });
      const hx = p.x + sway + p.h * .08, hy = 1352 - p.h * .9;
      for (let n = 0; n < 4; n++) breath(g, hx, hy, t, 11.5 + p.ph + n * 2.1, p.h / 300);
    }
    g.restore(); g.restore();
    drawSnow(g, t, .45, 40, 0);
  }
  return { draw };
})();
function shotQueue(g, t, lt) { QUEUE.draw(g, t, lt); }

/* ---------- the drops: a dark pool turning red, heartbeat by heartbeat ---------- */
const DROP_T = [15.75, 16.6, 17.25, 17.7, 18.05, 18.33, 18.56, 18.76, 18.93, 19.07, 19.19, 19.3, 19.4, 19.49, 19.57, 19.64, 19.71];
function dropShape(g, x, y, s, stretch) {
  g.save(); g.translate(x, y); g.scale(s, s * stretch);
  g.beginPath(); g.moveTo(0, -22); g.bezierCurveTo(6, -10, 13, -2, 13, 6); g.arc(0, 6, 13, 0, Math.PI); g.bezierCurveTo(-13, -2, -6, -10, 0, -22); g.closePath();
  const gr = g.createRadialGradient(-4, 2, 1, 0, 4, 16); gr.addColorStop(0, "#ff5a5a"); gr.addColorStop(.35, "#c3142a"); gr.addColorStop(1, "#5a0410");
  g.fillStyle = gr; g.fill();
  g.fillStyle = "rgba(255,255,255,0.85)"; g.beginPath(); g.ellipse(-5, 0, 2.6, 4.2, -.3, 0, TAU); g.fill();
  g.restore();
}
function shotDrops(g, t, lt) {
  const bgG = g.createLinearGradient(0, 0, 0, H); bgG.addColorStop(0, "#06090c"); bgG.addColorStop(.6, "#0f161c"); bgG.addColorStop(1, "#05070a");
  g.fillStyle = bgG; g.fillRect(0, 0, W, H);
  const r0 = rng(17); for (let i = 0; i < 14; i++) blit(g, SPR.glowCool, r0() * W, 200 + r0() * 900, 60 + r0() * 90, .06 + r0() * .06);
  const push = 1 + .05 * easeInOut(prog(lt, 0, 4.8));
  g.save(); g.translate(540, 1250); g.scale(push, push); g.translate(-540, -1250);
  const rise = easeIn(prog(t, 18.95, 20.2)), sy = lerp(1268, -260, rise);
  let red = 0; for (const d of DROP_T) red += clamp((t - d) / .9); red = clamp(red / 9);
  const pool = g.createLinearGradient(0, sy, 0, sy + 700);
  pool.addColorStop(0, mixHex("#101820", "#7d0a18", red)); pool.addColorStop(1, mixHex("#05080b", "#3a030b", red));
  g.fillStyle = pool; g.fillRect(-100, sy, W + 200, H - sy + 400);
  for (const d of DROP_T) {
    const k = t - d; if (k <= 0) continue;
    const rad = Math.min(1100, 40 + k * 300);
    g.save(); g.translate(540, sy + 6); g.scale(1, .2); g.globalAlpha = clamp(.55 - k * .08, .18, .55);
    const bl = g.createRadialGradient(0, 0, 0, 0, 0, rad); bl.addColorStop(0, "rgba(150,10,28,0.9)"); bl.addColorStop(1, "rgba(120,8,22,0)");
    g.fillStyle = bl; g.beginPath(); g.arc(0, 0, rad, 0, TAU); g.fill(); g.restore();
    for (let j = 0; j < 3; j++) { const rk = (k - j * .13) / 1.3; if (rk <= 0 || rk >= 1) continue; g.strokeStyle = `rgba(235,215,215,${(1 - rk) * .4})`; g.lineWidth = 2.2 * (1 - rk) + .6; g.beginPath(); g.ellipse(540, sy + 4, 20 + rk * 440, (20 + rk * 440) * .19, 0, 0, TAU); g.stroke(); }
  }
  g.globalAlpha = 1;
  g.globalCompositeOperation = "lighter"; g.globalAlpha = .18; g.drawImage(SPR.glowCool, -200, sy - 30, W + 400, 120); g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
  DROP_T.forEach((d, i) => {
    const fall = i === 0 ? 1.1 : .6, t0 = d - fall, x = 540 + (i > 3 ? (hash1(i) - .5) * 60 : 0);
    if (t > t0 && t < d) { const k = (t - t0) / fall; dropShape(g, x, lerp(-120, sy - 26, k * k), i === 0 ? 2.8 : 2.1, 1 + k * .9); }
    const sk = (t - d) / .6;
    if (sk > 0 && sk < 1) { const rr = rng(i * 7 + 1); for (let n = 0; n < 9; n++) { const a = -Math.PI / 2 + (rr() - .5) * 2.4, v = 220 + rr() * 300; const px = x + Math.cos(a) * v * sk, py = sy + Math.sin(a) * v * sk + 520 * sk * sk; if (py > sy + 4) continue; g.fillStyle = `rgba(190,20,40,${1 - sk})`; g.beginPath(); g.arc(px, py, 4 + rr() * 6, 0, TAU); g.fill(); } }
  });
  g.restore();
}
