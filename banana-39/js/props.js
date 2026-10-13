"use strict";
/* props.js — the inflatable banana and friends, crowds, rain, camcorder OSD */

/* ---------- the inflatable banana ---------- */
// x,y centre; L length; ang rotation; o: {curve, fat, sheen 0..1, deflate 0..1}
function drawBanana(g, x, y, L, ang = 0, o = {}) {
  const dfl = o.deflate || 0, curve = (o.curve ?? .2) * (1 - dfl * .4), W = L * (o.fat ?? .2) * (1 - dfl * .55);
  g.save(); g.translate(x, y); g.rotate(ang);
  if (L < 46) {
    g.lineCap = "round"; g.strokeStyle = "#f2cd34"; g.lineWidth = W * .8;
    g.beginPath(); g.moveTo(-L / 2, curve * L * .65); g.quadraticCurveTo(0, -curve * L * .7, L / 2, curve * L * .65); g.stroke();
    g.strokeStyle = "rgba(255,248,200,0.8)"; g.lineWidth = W * .22;
    g.beginPath(); g.moveTo(-L * .3, curve * L * .1 - W * .18); g.quadraticCurveTo(0, -curve * L * .7 - W * .2, L * .28, curve * L * .1 - W * .18); g.stroke();
    g.restore(); return;
  }
  const N = 26, top = [], bot = [], mid = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N * 2 - 1, cx = u * L / 2, cy = curve * L * (u * u - .35) + (dfl ? Math.sin(u * 7) * L * .02 * dfl : 0);
    const m = 4 * curve * u, k = 1 / Math.hypot(1, m), nx = -m * k, ny = k;
    const w = W * .5 * Math.pow(Math.max(0, 1 - u * u), .5) + L * .014;
    top.push([cx - nx * w, cy - ny * w]); bot.push([cx + nx * w, cy + ny * w]); mid.push([cx, cy, nx, ny, w]);
  }
  g.beginPath(); g.moveTo(top[0][0], top[0][1]);
  for (const p of top) g.lineTo(p[0], p[1]);
  for (let i = N; i >= 0; i--) g.lineTo(bot[i][0], bot[i][1]);
  g.closePath();
  const gr = g.createLinearGradient(0, -W * .9, 0, W * .55);
  gr.addColorStop(0, "#fff3a6"); gr.addColorStop(.35, "#f8d53b"); gr.addColorStop(.75, "#dda81a"); gr.addColorStop(1, "#a97a0c");
  g.fillStyle = gr; g.fill();
  // seam, sheen, tips
  g.strokeStyle = "rgba(150,105,10,0.35)"; g.lineWidth = Math.max(1, L * .006);
  g.beginPath(); mid.forEach(([cx, cy], i) => i ? g.lineTo(cx, cy) : g.moveTo(cx, cy)); g.stroke();
  g.strokeStyle = `rgba(255,255,245,${.6 * (o.sheen ?? 1)})`; g.lineWidth = W * .1; g.lineCap = "round";
  g.beginPath(); for (let i = 5; i <= N - 6; i++) { const [cx, cy, nx, ny, w] = mid[i]; const px = cx - nx * w * .55, py = cy - ny * w * .55; i === 5 ? g.moveTo(px, py) : g.lineTo(px, py); } g.stroke();
  const t0 = mid[0], t1 = mid[N];
  g.fillStyle = "#5d4318"; g.beginPath(); g.ellipse(t0[0] - L * .012, t0[1], L * .026, L * .02, -.6, 0, TAU); g.fill();
  g.fillRect(t0[0] - L * .06, t0[1] - L * .012, L * .04, L * .022);
  g.fillStyle = "#3a2a10"; g.beginPath(); g.arc(t1[0] + L * .006, t1[1], L * .016, 0, TAU); g.fill();
  g.restore();
}

/* ---------- the other inflatables of 1988-89 ---------- */
function gloss(g, x, y, rx, ry, a = .45) { g.fillStyle = `rgba(255,255,255,${a})`; g.beginPath(); g.ellipse(x, y, rx, ry, -.3, 0, TAU); g.fill(); }
function drawShark(g, x, y, L, ang = 0) {
  g.save(); g.translate(x, y); g.rotate(ang);
  g.fillStyle = "#7a8d9e"; g.beginPath(); g.moveTo(L * .5, 0); g.quadraticCurveTo(L * .3, -L * .17, -L * .2, -L * .1); g.lineTo(-L * .42, -L * .03);
  g.lineTo(-L * .55, -L * .16); g.lineTo(-L * .5, 0); g.lineTo(-L * .55, L * .13); g.lineTo(-L * .42, L * .03); g.quadraticCurveTo(-L * .1, L * .14, L * .5, 0); g.fill();
  g.fillStyle = "#e8eef2"; g.beginPath(); g.moveTo(L * .46, L * .02); g.quadraticCurveTo(L * .1, L * .13, -L * .3, L * .04); g.quadraticCurveTo(L * .1, L * .07, L * .46, L * .02); g.fill();
  g.fillStyle = "#6a7d8e"; g.beginPath(); g.moveTo(L * .02, -L * .13); g.lineTo(-L * .08, -L * .3); g.lineTo(-L * .14, -L * .11); g.fill();
  g.fillStyle = "#111"; g.beginPath(); g.arc(L * .33, -L * .04, L * .016, 0, TAU); g.fill();
  g.strokeStyle = "#fff"; g.lineWidth = L * .008; g.beginPath(); for (let i = 0; i < 6; i++) { const px = L * (.43 - i * .03); g.lineTo(px, L * .03); g.lineTo(px - L * .015, L * .05); } g.stroke();
  gloss(g, L * .15, -L * .09, L * .12, L * .025);
  g.restore();
}
function drawCroc(g, x, y, L, ang = 0) {
  g.save(); g.translate(x, y); g.rotate(ang);
  g.fillStyle = "#4f8f3c"; g.beginPath(); g.moveTo(-L * .5, 0); g.quadraticCurveTo(-L * .2, -L * .12, L * .25, -L * .07); g.lineTo(L * .52, -L * .1); g.lineTo(L * .52, -L * .05); g.lineTo(L * .28, -L * .02);
  g.lineTo(L * .5, L * .02); g.lineTo(L * .5, L * .06); g.lineTo(L * .25, L * .05); g.quadraticCurveTo(-L * .2, L * .1, -L * .5, 0); g.fill();
  g.fillStyle = "#3f7a30"; for (let i = 0; i < 8; i++) { g.beginPath(); g.arc(-L * .35 + i * L * .07, -L * .08 + Math.abs(i - 3) * L * .004, L * .022, Math.PI, TAU); g.fill(); }
  g.fillStyle = "#fff"; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(L * (.3 + i * .045), -L * .045); g.lineTo(L * (.32 + i * .045), -L * .02); g.lineTo(L * (.34 + i * .045), -L * .045); g.fill(); }
  g.beginPath(); g.arc(L * .2, -L * .1, L * .028, 0, TAU); g.fill(); g.fillStyle = "#111"; g.beginPath(); g.arc(L * .205, -L * .1, L * .013, 0, TAU); g.fill();
  g.fillStyle = "#4f8f3c"; for (const lx of [-.25, -.05, .12]) g.fillRect(L * lx, L * .05, L * .04, L * .07);
  gloss(g, -L * .05, -L * .06, L * .14, L * .022);
  g.restore();
}
function drawDino(g, x, y, L, ang = 0) {
  g.save(); g.translate(x, y); g.rotate(ang);
  g.fillStyle = "#8e5ccc"; g.beginPath(); g.ellipse(0, 0, L * .3, L * .17, 0, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(L * .2, -L * .08); g.quadraticCurveTo(L * .38, -L * .25, L * .36, -L * .48); g.lineTo(L * .44, -L * .5); g.quadraticCurveTo(L * .5, -L * .2, L * .28, L * .02); g.fill();
  g.beginPath(); g.ellipse(L * .42, -L * .52, L * .09, L * .055, .2, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(-L * .25, -L * .05); g.quadraticCurveTo(-L * .5, -L * .02, -L * .62, L * .12); g.quadraticCurveTo(-L * .45, L * .04, -L * .25, L * .08); g.fill();
  for (const lx of [-.18, -.06, .08, .18]) g.fillRect(L * lx, L * .1, L * .07, L * .16);
  g.fillStyle = "#c9a6ef"; g.beginPath(); g.ellipse(0, L * .07, L * .2, L * .07, 0, 0, TAU); g.fill();
  g.fillStyle = "#111"; g.beginPath(); g.arc(L * .46, -L * .54, L * .014, 0, TAU); g.fill();
  gloss(g, -L * .06, -L * .09, L * .14, L * .035);
  g.restore();
}
function drawFrank(g, x, y, s, ang = 0) {
  g.save(); g.translate(x, y); g.rotate(ang);
  g.fillStyle = "#7db86b"; roundRect(g, -s * .4, -s * .5, s * .8, s, s * .12); g.fill();
  g.fillStyle = "#1d1d1d"; g.fillRect(-s * .42, -s * .56, s * .84, s * .22);
  for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(-s * .42 + i * s * .168, -s * .34); g.lineTo(-s * .34 + i * s * .168, -s * .26); g.lineTo(-s * .26 + i * s * .168, -s * .34); g.fill(); }
  g.fillStyle = "#222"; g.fillRect(-s * .26, -s * .12, s * .16, s * .08); g.fillRect(s * .1, -s * .12, s * .16, s * .08); g.fillRect(-s * .18, s * .24, s * .36, s * .05);
  g.fillStyle = "#9aa0a6"; g.fillRect(-s * .52, s * .02, s * .12, s * .1); g.fillRect(s * .4, s * .02, s * .12, s * .1);
  g.strokeStyle = "#2a4a22"; g.lineWidth = s * .02; g.beginPath(); g.moveTo(-s * .1, -s * .3); g.lineTo(s * .2, -s * .22); for (let i = 0; i < 4; i++) { g.moveTo(-s * .05 + i * s * .07, -s * .32); g.lineTo(-s * .03 + i * s * .07, -s * .2); } g.stroke();
  gloss(g, -s * .2, -s * .3, s * .12, s * .05, .3);
  g.restore();
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const INFL = ["banana", "banana", "banana", "shark", "croc", "dino", "frank", "banana"];
function drawInflatable(g, kind, x, y, s, ang) {
  if (kind === "banana") drawBanana(g, x, y, s, ang); else if (kind === "shark") drawShark(g, x, y, s * 1.1, ang);
  else if (kind === "croc") drawCroc(g, x, y, s * 1.2, ang); else if (kind === "dino") drawDino(g, x, y, s * .9, ang); else drawFrank(g, x, y, s * .45, ang);
}

/* ---------- crowds ---------- */
const JACKETS = ["#2b3a55", "#3d3d42", "#5a4a3a", "#3e5a74", "#6b2f35", "#2f4a3a", "#55606e", "#7a6a55", "#1f2630"];
const SKIN = ["#e2b896", "#c99475", "#a8775a", "#d9a985", "#8a5c42"];
// rows: [{y, s}] -> pre-rendered canvas of people facing the camera, and the hand points above their heads
function crowdLayer(seed, rows, o = {}) {
  const c = makeLayer(W + 400, H + 200), g = c.getContext("2d"), r = rng(seed), heads = [];
  g.translate(200, 0);
  for (const row of rows) {
    for (let x = -180 + r() * row.s; x < W + 180; x += row.s * (1.5 + r() * .9)) {
      const s = row.s * (.85 + r() * .3), y = row.y + (r() - .5) * row.s * .4;
      const pal = o.jackets || JACKETS, jacket = o.blue && r() < o.blue ? (r() < .5 ? "#79b8e4" : "#5c9fd0") : pal[r() * pal.length | 0];
      g.fillStyle = jacket; g.beginPath(); g.moveTo(x - s * 1.15, y + s * 1.7); g.quadraticCurveTo(x - s * 1.1, y + s * .6, x - s * .3, y + s * .52); g.lineTo(x + s * .3, y + s * .52); g.quadraticCurveTo(x + s * 1.1, y + s * .6, x + s * 1.15, y + s * 1.7); g.fill();
      if (o.scarves && r() < o.scarves) { const sc = o.scarfCols || ["#79b8e4", "#f2f2f2"]; g.fillStyle = sc[r() * sc.length | 0]; g.fillRect(x - s * .35, y + s * .5, s * .7, s * .18); }
      g.fillStyle = SKIN[r() * SKIN.length | 0]; g.beginPath(); g.ellipse(x, y, s * .42, s * .5, 0, 0, TAU); g.fill();
      const hair = r(); g.fillStyle = hair < .3 ? "#2a211b" : hair < .55 ? "#5a3f2a" : hair < .7 ? "#8a8a8a" : "#1b1b1b";
      if (o.hats && r() < o.hats) { const hc = o.hatCols || ["#79b8e4", "#c8202e", "#f2f2f2"]; g.fillStyle = hc[r() * hc.length | 0]; g.beginPath(); g.ellipse(x, y - s * .18, s * .47, s * .42, 0, Math.PI, TAU); g.fill(); g.beginPath(); g.arc(x, y - s * .62, s * .14, 0, TAU); g.fill(); }
      else { g.beginPath(); g.ellipse(x, y - s * .22, s * .44, s * .3, 0, Math.PI * 1.02, Math.PI * 1.98); g.fill(); }
      heads.push({ x, y, s, ph: r() * TAU, k: r() });
    }
  }
  return { c, heads };
}

/* ---------- rain, OSD ---------- */
const DROPS = (() => { const r = rng(5); return Array.from({ length: 260 }, () => ({ x: r() * W, y: r() * H, z: .4 + r() * 1.2 })); })();
function drawRain(g, t, density = 1, col = "rgba(210,220,230,") {
  g.lineWidth = 1.4;
  for (let i = 0; i < DROPS.length * density; i++) {
    const d = DROPS[i], sp = 900 * d.z, y = ((d.y + t * sp) % (H + 200)) - 100, x = (d.x - t * 120 * d.z + W * 4) % W;
    g.strokeStyle = col + (.18 + d.z * .16) + ")"; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 8 * d.z, y + 34 * d.z); g.stroke();
  }
}
// camcorder on-screen display (drawn into the scene so it picks up the tape look)
function osd(g, t, lines, o = {}) {
  g.save(); g.font = "62px VT323"; g.textBaseline = "top"; g.shadowColor = "rgba(0,0,0,0.7)"; g.shadowOffsetX = 3; g.shadowOffsetY = 3;
  g.fillStyle = "rgba(245,245,240,0.92)";
  if (o.play !== false) { g.fillText(o.label || "PLAY", 96, 188); if (!o.label) { g.beginPath(); g.moveTo(232, 196); g.lineTo(262, 214); g.lineTo(232, 232); g.fill(); } }
  if (o.rec && Math.floor(t * 2) % 2 === 0) { g.fillStyle = "#e33"; g.beginPath(); g.arc(862, 216, 14, 0, TAU); g.fill(); g.fillStyle = "rgba(245,245,240,0.92)"; g.fillText("REC", 884, 188); }
  lines.forEach((s, i) => g.fillText(s, 96, 252 + i * 60));
  g.restore();
}
