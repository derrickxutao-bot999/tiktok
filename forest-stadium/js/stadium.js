"use strict";
/* stadium.js — Stadion An der Alten Försterei at night, seen across the pitch.
   One environment, three moods: candles (reveal, carols), floodlights + scarves (finale). */
const STAD = (() => {
  const ROWS = 20, TOP = 1010, BOT = 1290, PIV = 1150;
  const rowY = i => lerp(TOP, BOT, Math.pow(i / (ROWS - 1), 1.2));
  const candles = [], scarves = [], pitchFlames = [];
  let L = null; // lazily built static layers

  (() => {
    const r = rng(404);
    for (let i = 0; i < ROWS; i++) {
      const y = rowY(i), k = i / (ROWS - 1), sp = lerp(10, 14.5, k);
      for (let x = -150 + r() * sp; x < W + 150; x += sp * (.55 + r() * .95)) {
        if (r() < .1) { x += sp * 1.5; continue; }
        const dx = (x - 540) / 640, dy = (i - 10) / 10;
        candles.push({ x, y: y - 2 - r() * 7, k, ph: r() * 100, d: Math.hypot(dx, dy * .7) + r() * .3, s: lerp(.75, 1.15, k) * (.8 + r() * .4), hv: r() < .55 ? 1 : 0, warm: .8 + r() * .2 });
      }
      for (let x = -150 + r() * 20; x < W + 150; x += lerp(17, 25, k) * (.85 + r() * .3)) scarves.push({ x, y, k, ph: r() * TAU, red: r() < .62, up: r() < .8 });
    }
    candles.sort((a, b) => a.d - b.d);
  })();

  function build() {
    L = {};
    // sky
    const sky = makeCanvas(W + 400, 1300), s = sky.getContext("2d");
    const gr = s.createLinearGradient(0, 0, 0, 1300);
    gr.addColorStop(0, "#03070c"); gr.addColorStop(.45, "#0a1824"); gr.addColorStop(.78, "#14293a"); gr.addColorStop(1, "#1d3446");
    s.fillStyle = gr; s.fillRect(0, 0, sky.width, 1300);
    const r = rng(9);
    for (let i = 0; i < 9; i++) { s.save(); s.translate(r() * sky.width, 220 + r() * 520); s.scale(3.5 + r() * 3, 1); s.globalAlpha = .07 + r() * .06; s.drawImage(SPR.soft, -90, -90, 180, 180); s.restore(); }
    s.globalAlpha = .28; s.drawImage(SPR.glowCool, 1000 - 420, 330 - 420, 840, 840); s.globalAlpha = .5; s.drawImage(SPR.glowWhite, 1000 - 120, 330 - 120, 240, 240);
    s.globalAlpha = 1; s.fillStyle = "#eef0e6"; s.beginPath(); s.arc(1000, 330, 32, 0, TAU); s.fill();
    s.fillStyle = "rgba(180,190,190,0.25)"; for (const [dx, dy, rr] of [[-9, -6, 9], [8, 6, 6], [5, -12, 4]]) { s.beginPath(); s.arc(1000 + dx, 330 + dy, rr, 0, TAU); s.fill(); }
    L.sky = sky;
    L.forestFar = forestLayer(31, W + 500, 1040, 70, 170, "#10212c", 18, 1.2);
    L.forestNear = forestLayer(32, W + 500, 1052, 110, 260, "#08131a", 24, .6);
    // stand: roof, terrace, front wall, masts (unlit)
    const st = makeCanvas(W + 400, 1400), g = st.getContext("2d"); g.translate(200, 0);
    g.fillStyle = "#0b1116"; g.fillRect(-200, 928, W + 400, 58);
    g.fillStyle = "rgba(170,195,215,0.28)"; g.fillRect(-200, 928, W + 400, 2);
    g.font = "700 21px Cormorant"; g.letterSpacing = "9px"; g.textAlign = "center"; g.fillStyle = "rgba(215,225,232,0.42)"; g.fillText("AN DER ALTEN FÖRSTEREI", 540, 965);
    const ug = g.createLinearGradient(0, 986, 0, 1010); ug.addColorStop(0, "#05080b"); ug.addColorStop(1, "#0d1419"); g.fillStyle = ug; g.fillRect(-200, 986, W + 400, 26);
    g.fillStyle = "#06090c"; for (let x = -180; x < W + 200; x += 160) g.fillRect(x, 986, 6, 26);
    g.fillStyle = "#0e151a"; g.fillRect(-200, 1010, W + 400, 284);
    for (let i = 0; i < ROWS; i++) { const y = rowY(i); g.fillStyle = "rgba(120,140,155,0.10)"; g.fillRect(-200, y + 2, W + 400, 1); g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(-200, y + 3, W + 400, 2); }
    for (const i of [5, 10, 15]) { const y = rowY(i) - 8; g.fillStyle = "rgba(150,165,178,0.22)"; g.fillRect(-200, y, W + 400, 2); for (let x = -190; x < W + 200; x += 95) g.fillRect(x, y, 2, 9); }
    g.fillStyle = "#080c10"; g.fillRect(-200, 1292, W + 400, 22); g.fillStyle = "rgba(170,190,205,0.18)"; g.fillRect(-200, 1292, W + 400, 1.5);
    for (const mx of [40, 1040]) {
      g.strokeStyle = "#0a0f13"; g.lineWidth = 3;
      g.beginPath(); g.moveTo(mx - 18, 1320); g.lineTo(mx - 7, 560); g.moveTo(mx + 18, 1320); g.lineTo(mx + 7, 560); g.stroke();
      g.lineWidth = 1.5; for (let y = 1320; y > 570; y -= 26) { const w1 = lerp(18, 7, (1320 - y) / 760), w2 = lerp(18, 7, (1320 - y + 26) / 760); g.beginPath(); g.moveTo(mx - w1, y); g.lineTo(mx + w2, y - 26); g.moveTo(mx + w1, y); g.lineTo(mx - w2, y - 26); g.stroke(); }
      g.save(); g.translate(mx, 528); g.rotate(mx < 540 ? .12 : -.12); g.fillStyle = "#0a0f13"; g.fillRect(-66, -34, 132, 64);
      g.fillStyle = "#1b242b"; for (let a = 0; a < 4; a++) for (let b = 0; b < 3; b++) { g.beginPath(); g.arc(-45 + a * 30, -18 + b * 18, 7, 0, TAU); g.fill(); }
      g.restore();
    }
    L.stand = st;
    // pitch: moonlit snow
    const pc = makeCanvas(W + 600, 900), p = pc.getContext("2d");
    const pg = p.createLinearGradient(0, 0, 0, 900); pg.addColorStop(0, "#1a252c"); pg.addColorStop(1, "#2a3741");
    p.fillStyle = pg; p.fillRect(0, 0, pc.width, 900);
    const rp = rng(12); for (let i = 0; i < 2600; i++) { p.fillStyle = `rgba(210,225,240,${rp() * .08})`; p.fillRect(rp() * pc.width, rp() * 900, 2, 1); }
    L.pitch = pc;
    // supporters standing on the pitch with candles (far rows sharp, near rows defocused)
    const rowsY = [1362, 1392, 1428, 1472, 1530, 1608, 1712, 1850, 2030], rowsS = [9, 11, 13.5, 16.5, 21, 27, 36, 50, 70];
    L.crowdFar = makeCanvas((W + 600) / 2, 1100); L.crowdNear = makeCanvas((W + 600) / 2, 1100);
    const rc = rng(77);
    rowsY.forEach((y, j) => {
      const near = j >= 6, cg = (near ? L.crowdNear : L.crowdFar).getContext("2d"), s2 = rowsS[j];
      cg.setTransform(.5, 0, 0, .5, 0, 0); cg.filter = `blur(${near ? (j - 5) * 2.4 : .4 + j * .25}px)`;
      for (let x = -280 + rc() * s2; x < W + 300; x += s2 * (1.7 + rc() * 1.9)) {
        const sz = s2 * (.85 + rc() * .3), yy = y + (rc() - .5) * s2 * .9, side = rc() < .5 ? -1 : 1;
        bust(cg, x + 300, yy, sz, "#030507", rc() < .4 ? 2 : 0);
        cg.globalCompositeOperation = "lighter"; cg.globalAlpha = .3; cg.drawImage(SPR.glowWarm, x + 300 - sz * .45 + side * sz * .1, yy - sz * .05, sz * .9, sz * .9); cg.globalAlpha = 1; cg.globalCompositeOperation = "source-over";
        pitchFlames.push({ x: x + side * sz * .3, y: yy + sz * .82, s: sz, near, ph: rc() * 100, r: rc() });
      }
    });
    // out-of-focus pine branches framing the top corners
    const br = makeCanvas(W, 760), b = br.getContext("2d"); b.filter = "blur(7px)"; b.strokeStyle = "#020304"; b.lineCap = "round";
    const rb = rng(5);
    for (const [x0, y0, dir] of [[-40, 60, 1], [1120, 180, -1]]) for (let k = 0; k < 3; k++) {
      const len = 420 + rb() * 200, ang = (dir > 0 ? .25 : Math.PI - .25) + (rb() - .5) * .5;
      const yy = y0 + k * 120; b.lineWidth = 10; b.beginPath(); b.moveTo(x0, yy); b.lineTo(x0 + Math.cos(ang) * len, yy + Math.sin(ang) * len); b.stroke();
      b.lineWidth = 4; for (let d = 20; d < len; d += 9) { const px = x0 + Math.cos(ang) * d, py = yy + Math.sin(ang) * d, nl = 60 * (1 - d / len) + 14; for (const sd of [-1, 1]) { b.beginPath(); b.moveTo(px, py); b.lineTo(px + Math.cos(ang + sd * 1.1) * nl, py + Math.sin(ang + sd * 1.1) * nl); b.stroke(); } }
    }
    L.branches = br;
  }

  function layer(g, cam, par, fn) {
    g.save();
    const sc = 1 + (cam.s - 1) * par;
    g.translate(540 + cam.x * par, PIV + cam.y * par); g.scale(sc, sc); g.translate(-540, -PIV);
    fn(); g.restore();
  }
  // o: {cam, count (lit candles), crowd, flood 0..1, ignite [t per mast], scarves 0..1, snow, branches}
  function draw(g, t, o) {
    if (!L) build();
    const cam = o.cam, F = o.flood || 0;
    layer(g, cam, .08, () => g.drawImage(L.sky, -200, -100));
    layer(g, cam, .22, () => g.drawImage(L.forestFar, -250, 0));
    layer(g, cam, .32, () => g.drawImage(L.forestNear, -250, 0));
    layer(g, cam, .75, () => {
      // the pitch is drawn first and reaches up under the stand, so parallax can never open a gap
      g.fillStyle = "#1a252c"; g.fillRect(-300, 1240, W + 600, 80);
      g.drawImage(L.pitch, -300, 1312);
      if (F > 0) {
        let y = 1312;
        for (let i = 0; y < 2150; i++) { const h = 26 * Math.pow(1.32, i); g.fillStyle = i % 2 ? `rgba(58,104,66,${.85 * F})` : `rgba(48,90,57,${.85 * F})`; g.fillRect(-300, y, W + 600, h + 1); y += h; }
        g.strokeStyle = `rgba(235,240,235,${.7 * F})`; g.lineWidth = 3;
        g.beginPath(); g.moveTo(-300, 1334); g.lineTo(W + 300, 1334); g.moveTo(540, 1334); g.lineTo(540, 2150); g.stroke();
        g.beginPath(); g.ellipse(540, 1560, 300, 82, 0, 0, TAU); g.stroke();
        g.globalAlpha = .35 * F; g.drawImage(L.pitch, -300, 1312); g.globalAlpha = 1;
      }
    });
    layer(g, cam, .55, () => {
      // floodlit sky glow behind the roof
      if (F > 0) { g.globalCompositeOperation = "lighter"; g.globalAlpha = .45 * F; g.drawImage(SPR.glowCool, -400, 500, W + 800, 900); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; }
      g.drawImage(L.stand, -200, 0);
      if (F > 0) { g.fillStyle = `rgba(150,170,185,${.32 * F})`; g.fillRect(-200, 1010, W + 400, 282); }
      if (o.scarves) drawScarves(g, t, o.scarves, F);
      if (o.banner) {
        const y0 = 1254 + Math.sin(t * 2) * 1.5;
        g.globalAlpha = o.banner; g.fillStyle = "#b3132b"; g.fillRect(-200, y0, W + 400, 40);
        g.fillStyle = "rgba(255,255,255,0.85)"; g.fillRect(-200, y0 + 3, W + 400, 2); g.fillRect(-200, y0 + 35, W + 400, 2);
        g.fillStyle = "#f4f0e8"; g.font = "700 26px Playfair"; g.letterSpacing = "12px"; g.textAlign = "center";
        for (let x = -60; x < W + 200; x += 400) g.fillText("EISERN UNION", x + 120, y0 + 29);
        g.globalAlpha = 1; g.letterSpacing = "0px";
      }
      drawCandles(g, t, o.count || 0, F);
      if (F > 0) drawMasts(g, t, o.ignite);
    });
    if (o.crowd) {
      const lit = o.crowdLit ?? 1;
      layer(g, cam, .85, () => { g.drawImage(L.crowdFar, -300, 0, W + 600, 2200); flames(g, t, false, lit); });
      layer(g, cam, 1.1, () => { g.drawImage(L.crowdNear, -300, 0, W + 600, 2200); flames(g, t, true, lit); });
    }
    drawSnow(g, t, o.snow ?? .8, 14, 0);
    if (o.branches) layer(g, cam, 1.5, () => g.drawImage(L.branches, 0, -40));
  }

  function drawCandles(g, t, count, F) {
    const n = Math.min(candles.length, Math.ceil(count));
    if (n <= 0) return;
    const dim = 1 - F * .7, frac = n / candles.length, spread = Math.sqrt(frac);
    g.globalAlpha = .75 * dim * Math.min(1, frac * 4); g.drawImage(SPR.glowWarm, 540 - (W + 700) * spread / 2 - 60, 1020 - 260 * Math.max(spread, .35), (W + 700) * spread + 120, 520 * Math.max(spread, .35) + 120);
    g.globalAlpha = dim; g.fillStyle = "#07090b";
    for (let i = 0; i < n; i++) { const c = candles[i], hs = 2.6 * c.s, hy = c.y - 8.5 * c.s; g.beginPath(); g.arc(c.x, hy, hs, 0, TAU); g.fill(); g.beginPath(); g.ellipse(c.x, hy + hs * 2.6, hs * 2.3, hs * 1.7, 0, Math.PI, TAU); g.fill(); if (c.hv) { g.beginPath(); g.arc(c.x, hy - hs * 1.25, hs * .45, 0, TAU); g.fill(); } }
    g.globalAlpha = 1;
    g.globalCompositeOperation = "lighter";
    for (let i = 0; i < n; i++) {
      const c = candles[i], a = clamp((count - i) / 25) * dim, f = .7 + .3 * noise1(t * 6.5 + c.ph);
      const gs = 16 * c.s;
      g.globalAlpha = a * f * .6; g.drawImage(SPR.glowWarm, c.x - gs / 2, c.y - gs / 2, gs, gs);
      g.globalAlpha = a * f * .3; g.drawImage(SPR.glowWarm, c.x - 4 * c.s, c.y - 13 * c.s, 8 * c.s, 9 * c.s);
      g.globalAlpha = a * f; g.fillStyle = "#ffe0ae"; g.fillRect(c.x - .9 * c.s, c.y - 1.4 * c.s, 1.8 * c.s, 2.4 * c.s);
    }
    g.globalAlpha = .4 * frac * dim; g.drawImage(SPR.glowWarm, -350, 880, W + 700, 560);
    g.globalAlpha = .3 * frac * dim; g.drawImage(SPR.glowWarm, -200, 930, W + 400, 140);
    g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
  }
  function flames(g, t, near, lit) {
    g.globalCompositeOperation = "lighter";
    for (const p of pitchFlames) {
      if (p.near !== near || p.r > lit) continue;
      const f = .72 + .28 * noise1(t * 7 + p.ph), sz = near ? p.s * 1.5 : p.s * 1.25;
      g.globalAlpha = f * (near ? .7 : .8); g.drawImage(SPR.glowWarm, p.x - sz / 2, p.y - sz / 2, sz, sz);
      if (!near) { g.globalAlpha = f; g.fillStyle = "#fff0cf"; g.fillRect(p.x - p.s * .06, p.y - p.s * .14, p.s * .12, p.s * .2); }
    }
    g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
  }
  function drawScarves(g, t, amt, F) {
    for (const s of scarves) {
      const sz = lerp(.8, 1.25, s.k), wob = Math.sin(t * 3.2 + s.ph + s.x * .02) * 3 * sz;
      g.fillStyle = "#07090b"; g.beginPath(); g.arc(s.x, s.y - 6 * sz, 4.2 * sz, 0, TAU); g.fill();
      if (!s.up) continue;
      const y = s.y - 16 * sz - wob * amt, w = 22 * sz, h = 6 * sz;
      g.globalAlpha = amt; g.fillStyle = s.red ? `rgb(${170 + 45 * F | 0},22,38)` : `rgb(${150 + 90 * F | 0},${150 + 90 * F | 0},${150 + 90 * F | 0})`;
      g.fillRect(s.x - w / 2, y, w, h);
      g.fillStyle = s.red ? "rgba(255,255,255,0.75)" : "rgba(190,20,36,0.9)"; g.fillRect(s.x - w * .12, y, w * .24, h);
      g.globalAlpha = 1;
    }
  }
  function drawMasts(g, t, ignite) {
    [40, 1040].forEach((mx, m) => {
      const k = clamp((t - ignite[m]) / .12), flick = t - ignite[m] < .35 ? (Math.sin((t - ignite[m]) * 90) > 0 ? 1 : .35) : 1;
      if (k <= 0) return;
      const a = k * flick, toward = mx < 540 ? 1 : -1;
      beam(g, mx, 540, mx + toward * 420, 1500, 50, 420, "rgba(200,220,255,", .12 * a);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) blit(g, SPR.glowWhite, mx - 45 + i * 30, 510 + j * 18 + (i - 1.5) * 3.6 * toward, 46, a);
      blit(g, SPR.glowCool, mx, 528, 520, .65 * a); blit(g, SPR.glowWhite, mx, 528, 180, .8 * a);
      streak(g, mx, 528, 560, .55 * a);
    });
  }
  return { draw, candles, get total() { return candles.length; } };
})();

/* the stadium glowing in the snowy forest, seen from above the trees */
const EXTERIOR = (() => {
  let L = null;
  function build() {
    L = { layers: [] };
    const specs = [[41, 980, 60, 130, "#142636", 14, 1.5], [42, 1090, 80, 170, "#0f1e2b", 18, 1], [43, 1340, 50, 120, "#0a1620", 22, .6], [44, 1560, 150, 300, "#060e15", 30, 0], [45, 1850, 240, 480, "#020507", 46, 3]];
    for (const [seed, base, h0, h1, col, gap, bl] of specs) L.layers.push({ c: forestLayer(seed, W + 600, base, h0, h1, col, gap, bl), base, col });
  }
  function draw(g, t, o) {
    if (!L) build();
    const cam = o.cam, layerAt = (par, fn) => { g.save(); const sc = 1 + (cam.s - 1) * par; g.translate(540 + cam.x * par, 1200 + cam.y * par); g.scale(sc, sc); g.translate(-540, -1200); fn(); g.restore(); };
    layerAt(.05, () => { const gr = g.createLinearGradient(0, -200, 0, 1300); gr.addColorStop(0, "#02060a"); gr.addColorStop(.6, "#0b1a26"); gr.addColorStop(1, "#1a3142"); g.fillStyle = gr; g.fillRect(-300, -200, W + 600, 1600); blit(g, SPR.glowCool, 820, 300, 700, .22); blit(g, SPR.glowWhite, 820, 300, 70, .9, "source-over"); });
    layerAt(.15, () => g.drawImage(L.layers[0].c, -300, 0));
    layerAt(.25, () => {
      g.drawImage(L.layers[1].c, -300, 0);
      // the stadium from above the trees: roof ring, lit stands, floodlit pitch, four masts
      const quad = (fy, ny, fx0, fx1, nx0, nx1, r) => { g.beginPath(); g.moveTo(fx0 + r, fy); g.lineTo(fx1 - r, fy); g.quadraticCurveTo(fx1, fy, fx1 + (nx1 - fx1) * .12, fy + (ny - fy) * .12); g.lineTo(nx1 - (nx1 - fx1) * .08, ny - (ny - fy) * .08); g.quadraticCurveTo(nx1, ny, nx1 - r, ny); g.lineTo(nx0 + r, ny); g.quadraticCurveTo(nx0, ny, nx0 + (fx0 - nx0) * .08, ny - (ny - fy) * .08); g.lineTo(fx0 - (fx0 - nx0) * .12, fy + (ny - fy) * .12); g.quadraticCurveTo(fx0, fy, fx0 + r, fy); g.closePath(); };
      blit(g, SPR.glowWarm, 540, 1090, 1350, .55); blit(g, SPR.glowWhite, 540, 1130, 640, .32);
      quad(1068, 1262, 318, 762, 196, 884, 34); g.fillStyle = "#07090c"; g.fill();
      quad(1084, 1240, 340, 740, 226, 854, 26); const sg2 = g.createLinearGradient(0, 1084, 0, 1240); sg2.addColorStop(0, "#f0c27a"); sg2.addColorStop(1, "#9c6532"); g.fillStyle = sg2; g.fill();
      quad(1104, 1214, 372, 708, 268, 812, 8); const pg2 = g.createLinearGradient(0, 1104, 0, 1214); pg2.addColorStop(0, "#9fd48f"); pg2.addColorStop(1, "#5b9a55"); g.fillStyle = pg2; g.fill();
      g.strokeStyle = "rgba(255,255,255,0.75)"; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(540, 1104); g.lineTo(540, 1214); g.stroke(); g.beginPath(); g.ellipse(540, 1159, 46, 15, 0, 0, TAU); g.stroke();
      g.strokeStyle = "rgba(255,226,170,0.6)"; g.lineWidth = 2; quad(1068, 1262, 318, 762, 196, 884, 34); g.stroke();
      for (const [mx, my, h] of [[300, 1060, 120], [780, 1060, 120], [178, 1250, 150], [902, 1250, 150]]) {
        g.strokeStyle = "#07090b"; g.lineWidth = 3; g.beginPath(); g.moveTo(mx, my); g.lineTo(mx, my - h); g.stroke();
        blit(g, SPR.glowWhite, mx, my - h, 70, .95); blit(g, SPR.glowCool, mx, my - h, 300, .38); streak(g, mx, my - h, 230, .32);
        beam(g, mx, my - h, 540, 1159, 6, 130, "rgba(230,235,255,", .08);
      }
    });
    for (let i = 2; i < 5; i++) layerAt(.35 + i * .2, () => { const Lr = L.layers[i]; g.drawImage(Lr.c, -300, 0); g.fillStyle = Lr.col; g.fillRect(-300, Lr.base + 30, W + 600, 1400); });
    drawSnow(g, t, o.snow ?? .9, 10, 0);
  }
  return { draw };
})();
