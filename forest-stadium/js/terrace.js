"use strict";
/* terrace.js — the old standing terrace, seen from the pitch.
   Act II: golden hour, crumbling steps, 2,300 volunteers rebuild it (time-lapse), roof goes on.
   Act III: the same old steps under snow in 2003, 89 fans climb the gate and sing. */
const TER = (() => {
  const ROWS = 12, TOP = 780, BOT = 1290;
  const rowTop = i => TOP + (BOT - TOP) * Math.pow(i / ROWS, 1.18);
  const cache = {};
  function steps(mode, fresh) {
    const key = mode + fresh; if (cache[key]) return cache[key];
    const c = makeCanvas(W + 200, BOT + 40), g = c.getContext("2d"), r = rng(fresh ? 71 : 70);
    g.translate(100, 0);
    const P = mode === "gold"
      ? (fresh ? { r0: "#b59d7f", r1: "#86705a", tread: "#d9c6a8", edge: "#f6e4c4", dark: "rgba(70,40,20," } : { r0: "#80695a", r1: "#5d4b3d", tread: "#a08a72", edge: "#c2ab8f", dark: "rgba(40,24,14," })
      : { r0: "#29333e", r1: "#1a222b", tread: "#3c4957", edge: "#d6e2ec", dark: "rgba(4,7,11," };
    for (let i = 0; i < ROWS; i++) {
      const y0 = rowTop(i), y1 = rowTop(i + 1), h = y1 - y0, tr = h * .3;
      const gr = g.createLinearGradient(0, y0 + tr, 0, y1); gr.addColorStop(0, P.r0); gr.addColorStop(1, P.r1);
      g.fillStyle = gr; g.fillRect(-100, y0 + tr, W + 200, h - tr);
      g.fillStyle = P.tread; g.fillRect(-100, y0, W + 200, tr);
      g.fillStyle = P.edge; g.globalAlpha = mode === "night" ? .8 : .55; g.fillRect(-100, y0, W + 200, mode === "night" ? tr * .6 : 2.5); g.globalAlpha = 1;
      if (!fresh) {
        for (let k = 0; k < 12; k++) { g.fillStyle = P.dark + (.08 + r() * .2) + ")"; g.fillRect(r() * W, y0 + tr, 5 + r() * 34, h - tr); }
        g.strokeStyle = P.dark + ".8)"; g.lineWidth = 1.5;
        for (let k = 0; k < 6; k++) { let x = r() * W, y = y0 + tr + 2; g.beginPath(); g.moveTo(x, y); for (let s = 0; s < 6; s++) { x += (r() - .35) * 24; y += (h - tr) / 6; g.lineTo(x, y); } g.stroke(); }
        for (let k = 0; k < 4; k++) { const x = r() * W, w = 14 + r() * 40; g.fillStyle = P.dark + ".55)"; g.beginPath(); g.moveTo(x, y0 + tr); g.lineTo(x + w, y0 + tr); g.lineTo(x + w * .8, y0 + tr + 5 + r() * 6); g.lineTo(x + w * .1, y0 + tr + 3); g.closePath(); g.fill(); }
        if (mode === "gold") for (let k = 0; k < 12; k++) { const x = r() * W; g.strokeStyle = r() < .5 ? "#5f6b2a" : "#7f7c36"; g.lineWidth = 1.4; for (let b = 0; b < 4; b++) { g.beginPath(); g.moveTo(x + b * 1.8, y0 + tr * .8); g.lineTo(x + b * 1.8 + (r() - .5) * 8, y0 + tr * .8 - 3 - r() * h * .18); g.stroke(); } }
      } else { g.fillStyle = "rgba(0,0,0,0.13)"; for (let x = -100; x < W + 100; x += 150) g.fillRect(x, y0 + tr, 2, h - tr); }
      if (i % 3 === 2) {
        const by = y0 - h * .6;
        for (let x = -90; x < W + 100; x += 124) {
          if (!fresh && r() < .3) continue;
          g.fillStyle = fresh ? "#2c3034" : (mode === "gold" ? "#5b3620" : "#151b21");
          g.fillRect(x, by, 4, h * .6 + tr * .5); g.fillRect(x, by, 124 * (fresh ? 1 : .55 + r() * .4), 4);
        }
      }
    }
    return (cache[key] = c);
  }
  let S = null;
  function build() {
    S = {};
    S.treesGold = forestLayer(81, W + 400, 800, 120, 300, "#3a2216", 22, 1);
    S.treesNight = forestLayer(82, W + 400, 800, 120, 300, "#070e14", 22, 1);
  }

  // workers for the time-lapse: each one sits at the moving edge of the new concrete on its row
  const WORKERS = (() => { const r = rng(15), jobs = ["shovel", "hammer", "carry", "shovel", "hammer", "shovel"]; return Array.from({ length: 22 }, (_, i) => ({ row: 1 + (r() * 10 | 0), off: (r() - .5) * 220, job: jobs[i % jobs.length], ph: r() * TAU, dir: r() < .5 ? 1 : -1, scarf: r() < .45 })); })();
  const SINGERS = (() => { const r = rng(89), out = []; for (let i = 0; i < 89; i++) { const row = 3 + (r() * 6 | 0); out.push({ row, x: 540 + (r() - .5) * 360 * (1 + row * .08), ph: r() * TAU, bt: r() * 2.4, t0: 37.5 + r() * 1.3, hat: r() < .8 }); } return out.sort((a, b) => a.row - b.row); })();
  const rowProg = (i, p) => clamp((p - (ROWS - 1 - i) / ROWS * .68) / .32);

  function sky(g, mode, t) {
    const gr = g.createLinearGradient(0, 0, 0, 900);
    if (mode === "gold") { gr.addColorStop(0, "#5b3b4c"); gr.addColorStop(.45, "#c47a4c"); gr.addColorStop(1, "#f4c27e"); }
    else { gr.addColorStop(0, "#03070d"); gr.addColorStop(.6, "#0b1826"); gr.addColorStop(1, "#16293a"); }
    g.fillStyle = gr; g.fillRect(-60, -60, W + 120, 1000);
    const r = rng(mode === "gold" ? 3 : 4), drift = mode === "gold" ? t * (t > 26 && t < 31.6 ? 160 : 8) : t * 6;
    for (let i = 0; i < 7; i++) { const x = ((r() * 1700 + drift * (.6 + r() * .6)) % 1700) - 300, y = 120 + r() * 420; g.save(); g.translate(x, y); g.scale(4 + r() * 3, 1); g.globalAlpha = mode === "gold" ? .16 : .08; g.drawImage(SPR.soft, -80, -80, 160, 160); g.restore(); }
    g.globalAlpha = 1;
    if (mode === "gold") { blit(g, SPR.glowWarm, 250, 430, 1300, .7); blit(g, SPR.glowWhite, 250, 430, 300, .9); g.fillStyle = "#fff6dc"; g.beginPath(); g.arc(250, 430, 46, 0, TAU); g.fill(); }
    else { blit(g, SPR.glowCool, 830, 330, 700, .25); g.fillStyle = "#eef0e6"; g.beginPath(); g.arc(830, 330, 30, 0, TAU); g.fill(); }
  }

  function draw(g, t, o) {
    if (!S) build();
    const mode = o.mode, gold = mode === "gold", p = o.p ?? 0;
    g.save(); g.translate(540, 1100); g.scale(o.s, o.s); g.translate(-540 + (o.x || 0), -1100);
    sky(g, mode, t);
    g.drawImage(gold ? S.treesGold : S.treesNight, -200, 0);
    // roof: columns rise, then the slab slides across
    const colK = prog(p, .6, .76), slabK = easeInOut(prog(p, .74, .97));
    if (colK > 0) {
      g.fillStyle = "#24160e";
      for (let x = 30; x < W; x += 170) { const hh = 220 * easeOut(colK); g.fillRect(x, 780 - hh, 14, hh); }
      if (slabK > 0) {
        const wv = (W + 120) * slabK;
        const ug = g.createLinearGradient(0, 585, 0, 790); ug.addColorStop(0, "rgba(40,24,14,0.92)"); ug.addColorStop(1, "rgba(60,36,20,0.55)");
        g.fillStyle = ug; g.fillRect(-60, 585, wv, 200);
        g.fillStyle = "#1b100a"; g.fillRect(-60, 548, wv, 40); g.fillStyle = "rgba(255,220,160,0.5)"; g.fillRect(-60, 548, wv, 2);
      }
    }
    // steps: old everywhere, new concrete wiping in row by row
    g.drawImage(steps(mode, false), -100, 0);
    if (p > 0) {
      const fresh = steps(mode, true);
      for (let i = 0; i < ROWS; i++) {
        const k = rowProg(i, p); if (k <= 0) continue;
        const y0 = rowTop(i) - 30, y1 = rowTop(i + 1), xc = lerp(-60, W + 60, k);
        g.drawImage(fresh, 0, y0, xc + 100, y1 - y0, -100, y0, xc + 100, y1 - y0);
      }
    }
    if (slabK > 0) { const sh = g.createLinearGradient(0, 780, 0, 1080); sh.addColorStop(0, `rgba(30,16,8,${.55 * slabK})`); sh.addColorStop(1, "rgba(30,16,8,0)"); g.fillStyle = sh; g.fillRect(-100, 780, W + 200, 300); }
    // ground
    const gg = g.createLinearGradient(0, 1290, 0, H + 200);
    if (gold) { gg.addColorStop(0, "#77523a"); gg.addColorStop(1, "#24160e"); } else { gg.addColorStop(0, "#2a3540"); gg.addColorStop(1, "#0c1116"); }
    g.fillStyle = gg; g.fillRect(-100, 1290, W + 200, H);
    g.fillStyle = gold ? "rgba(30,16,8,0.6)" : "rgba(220,230,240,0.25)"; g.fillRect(-100, 1290, W + 200, 4);
    if (gold) drawGoldExtras(g, t, p, o);
    else drawNightExtras(g, t);
    // god rays + dust (gold), moonlight haze (night)
    if (gold) {
      for (let i = 0; i < 6; i++) { const a = .55 + i * .16 + Math.sin(t * .3 + i) * .03; beam(g, 250, 430, 250 + Math.cos(a) * 1900, 430 + Math.sin(a) * 1900, 10, 160 + i * 30, "rgba(255,214,150,", .07); }
      const r = rng(23); g.globalCompositeOperation = "lighter";
      for (let i = 0; i < 70; i++) { const x = (r() * W + t * (8 + r() * 14)) % W, y = 500 + r() * 1100 + Math.sin(t * .7 + i) * 20; g.globalAlpha = (.25 + r() * .4) * (.6 + .4 * Math.sin(t * 2 + i)); g.fillStyle = "#ffe6b0"; g.fillRect(x, y, 2.6, 2.6); }
      g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
    }
    // time-lapse day/night pulses
    if (o.lapse) { const f = (hash1(Math.floor(t * 12)) - .5) * .06; g.fillStyle = f > 0 ? `rgba(255,230,190,${f})` : `rgba(20,10,5,${-f})`; g.fillRect(-100, -100, W + 200, H + 200); }
    g.restore();
    if (!gold) drawSnow(g, t, .8, 12, 0);
  }

  function workerAt(g, w, t, p, i) {
    const k = rowProg(w.row, p); if (k <= 0 || k >= 1) return;
    const y = rowTop(w.row) + (rowTop(w.row + 1) - rowTop(w.row)) * .28, h = lerp(62, 128, w.row / ROWS);
    const jit = (hash1(Math.floor(t * 5) * 31 + i) - .5) * 16, x = lerp(-60, W + 60, k) + w.off * .4 + jit;
    const a = Math.min(1, k * 8, (1 - k) * 8);
    g.globalAlpha = a;
    figure(g, x + 1.5, y, h, { pose: w.job, phase: t * 9 + w.ph, dir: w.dir, col: "rgba(255,214,150,0.6)" });
    figure(g, x, y, h, { pose: w.job, phase: t * 9 + w.ph, dir: w.dir, col: "#140b06", scarf: w.scarf ? "#b3142a" : null });
    g.globalAlpha = 1;
  }
  function wheelbarrow(g, x, y, s, col, hand) {
    g.fillStyle = col; g.strokeStyle = col; g.lineWidth = 4 * s;
    g.beginPath(); g.moveTo(x - 10 * s, y - 52 * s); g.lineTo(x + 70 * s, y - 52 * s); g.lineTo(x + 52 * s, y - 24 * s); g.lineTo(x + 4 * s, y - 24 * s); g.closePath(); g.fill();
    g.beginPath(); g.arc(x + 60 * s, y - 12 * s, 12 * s, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(x + 4 * s, y - 34 * s); if (hand) g.lineTo(hand[0], hand[1]); else g.lineTo(x - 42 * s, y - 50 * s); g.moveTo(x + 10 * s, y - 24 * s); g.lineTo(x + 6 * s, y); g.stroke();
  }
  function drawGoldExtras(g, t, p, o) {
    const mat = 1 - prog(t, 31.2, 32);
    if (mat > 0) {
      g.globalAlpha = mat;
      g.fillStyle = "#8d6643"; g.beginPath(); g.ellipse(150, 1470, 170, 80, 0, Math.PI, TAU); g.fill();
      g.fillStyle = "rgba(40,20,10,0.35)"; g.beginPath(); g.ellipse(300, 1474, 210, 14, 0, 0, TAU); g.fill();
      g.fillStyle = "#4a2e1c"; for (let i = 0; i < 4; i++) g.fillRect(800, 1440 - i * 26, 210, 22);
      g.fillStyle = "#3a2416"; for (let i = 0; i < 3; i++) g.fillRect(830 + i * 8, 1336 - i * 26, 150, 22);
      wheelbarrow(g, 560, 1470, 1.2, "#1a0e07");
      g.globalAlpha = 1;
    }
    if (o.workers) {
      WORKERS.forEach((w, i) => workerAt(g, w, t, p, i));
      // volunteers walking in (before the lapse) and hauling material across the ground (during)
      const walkers = o.walk ?? 0;
      for (let i = 0; i < 4; i++) {
        const speed = o.lapse ? 520 : 120, x = ((t * speed + i * 330) % 1500) - 240, y = 1560 + i * 34, h = 290 + i * 18;
        if (walkers <= 0) break;
        g.globalAlpha = walkers;
        const pose = i % 2 ? "push" : "carry", ph = t * (o.lapse ? 16 : 6) + i;
        const hands = figure(g, x + 2, y, h, { pose, phase: ph, dir: 1, col: "rgba(255,214,150,0.55)" });
        figure(g, x, y, h, { pose, phase: ph, dir: 1, col: "#120a05", scarf: i === 0 ? "#b3142a" : null });
        if (pose === "push") wheelbarrow(g, hands[1][0] + h * .2, y, h / 270, "#120a05", hands[1]);
        g.globalAlpha = 1;
      }
    }
    if (o.proud) {
      const a = o.proud;
      // flag on the new roof
      const fx = 860, fy = 548;
      g.strokeStyle = "#1b100a"; g.lineWidth = 5; g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx, fy - 150); g.stroke();
      for (let s2 = 0; s2 < 3; s2++) { g.fillStyle = s2 === 1 ? "#f2eee4" : "#c3162e"; g.beginPath(); for (let u = 0; u <= 1.001; u += .1) { const x = fx + u * 120, y = fy - 148 + s2 * 22 + Math.sin(u * 5 - t * 5) * 7 * u; u ? g.lineTo(x, y) : g.moveTo(x, y); } for (let u = 1; u >= -.001; u -= .1) { const x = fx + u * 120, y = fy - 126 + s2 * 22 + Math.sin(u * 5 - t * 5) * 7 * u; g.lineTo(x, y); } g.fill(); }
      [[180, 1610, 330, "stand"], [330, 1640, 300, "point"], [520, 1600, 345, "cheer"], [700, 1650, 310, "stand"], [880, 1620, 325, "stand"]].forEach(([x, y, h, pose], i) => {
        g.globalAlpha = a;
        figure(g, x + 2.5, y, h, { pose, phase: t * 3 + i, dir: i % 2 ? -1 : 1, col: "rgba(255,210,140,0.7)" });
        figure(g, x, y, h, { pose, phase: t * 3 + i, dir: i % 2 ? -1 : 1, col: "#120a05", scarf: i % 2 ? null : "#b3142a" });
        g.globalAlpha = 1;
      });
    }
  }
  function drawNightExtras(g, t) {
    blit(g, SPR.glowWarm, 40, 840, 520, .32);
    for (const s of SINGERS) {
      const a = smooth(prog(t, s.t0, s.t0 + .6)); if (a <= 0) continue;
      const y = rowTop(s.row) + (rowTop(s.row + 1) - rowTop(s.row)) * .28, h = lerp(62, 128, s.row / ROWS), sw = Math.sin(t * 1.6 + s.ph) * 1.4;
      g.globalAlpha = a;
      figure(g, s.x + sw - 1.5, y, h, { pose: "stand", dir: s.x < 540 ? 1 : -1, hat: s.hat, col: "rgba(190,210,235,0.55)" });
      figure(g, s.x + sw, y, h, { pose: "stand", dir: s.x < 540 ? 1 : -1, hat: s.hat, col: "#06090d" });
      g.globalAlpha = 1;
      if (t > 38.6) for (let n = 0; n < 3; n++) breath(g, s.x + sw, y - h * .88, t, 38.6 + s.bt + n * 2.4, h / 160, "rgba(220,230,245,");
    }
    // the gate in the foreground, and the first fans climbing over it
    const gy = 1450;
    for (const [x0, t0] of [[190, 36.6], [330, 37.15], [450, 37.7]]) {
      const k = prog(t, t0, t0 + 1.3); if (k <= 0 || k >= 1) continue;
      const up = k < .6 ? easeOut(k / .6) : 1, over = k < .6 ? 0 : (k - .6) / .4;
      const y = lerp(1780, gy + 10, up) + over * over * 200, h = 300;
      g.globalAlpha = 1 - over;
      figure(g, x0, y, h, { pose: "climb", dir: 1, col: "#05070a", scarf: "#8f1022" });
      g.globalAlpha = 1;
    }
    g.fillStyle = "#020305";
    for (let x = -20; x < W + 40; x += 44) { g.fillRect(x, gy, 7, 330); g.beginPath(); g.moveTo(x - 6, gy + 2); g.lineTo(x + 3.5, gy - 26); g.lineTo(x + 13, gy + 2); g.fill(); }
    g.fillRect(-20, gy + 18, W + 60, 10); g.fillRect(-20, gy + 270, W + 60, 10);
    g.fillStyle = "rgba(200,215,235,0.18)"; g.fillRect(-20, gy + 18, W + 60, 2);
  }
  return { draw };
})();

function shotTerrace(g, t, lt) {
  const p = easeInOut(prog(t, 26.2, 31.4)), lapse = t > 26.2 && t < 31.4 ? (t - 26.2) / 1.3 : 0;
  TER.draw(g, t, { mode: "gold", p, s: lerp(1.02, 1.1, easeInOut(prog(t, 21.7, 35.3))), x: lerp(10, -10, prog(t, 21.7, 35.3)), workers: t > 24.6, walk: smooth(prog(t, 24.4, 25.2)) * (1 - smooth(prog(t, 31.1, 31.6))), lapse, proud: smooth(prog(t, 31.8, 32.6)) });
}
function shotNight2003(g, t) {
  TER.draw(g, t, { mode: "night", s: lerp(1.0, 1.06, easeInOut(prog(t, 36.6, 41.7))), x: 0 });
}
