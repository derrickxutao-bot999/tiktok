// Rain-night atmosphere for the ink silhouettes: floodlight glow, fog,
// layered rain, wet pitch with reflections, grain, vignette.

function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

function atmosBack(g, W, H, o = {}) {
  const gy = o.ground || H * 0.76, lx = o.lightX || W * 0.5, ly = o.lightY || -H * 0.05;
  const sky = g.createLinearGradient(0, 0, 0, gy);
  sky.addColorStop(0, o.top || "#7d817f"); sky.addColorStop(1, o.horizon || "#a9ada9");
  g.fillStyle = sky; g.fillRect(0, 0, W, gy);
  // floodlight bloom
  const gl = g.createRadialGradient(lx, ly, 0, lx, ly, H * 0.75);
  gl.addColorStop(0, "rgba(255,255,248,0.75)"); gl.addColorStop(0.35, "rgba(235,238,232,0.25)"); gl.addColorStop(1, "rgba(235,238,232,0)");
  g.fillStyle = gl; g.fillRect(0, 0, W, H);
  // far stadium in the fog: stand with a roof line, two floodlight towers
  if (o.stadium !== false) {
    g.fillStyle = "rgba(62,66,65,0.32)"; g.beginPath(); g.moveTo(0, gy - H * 0.058);
    g.quadraticCurveTo(W / 2, gy - H * 0.05, W, gy - H * 0.058); g.lineTo(W, gy); g.lineTo(0, gy); g.fill();
    g.fillStyle = "rgba(62,66,65,0.22)"; g.fillRect(0, gy - H * 0.066, W, H * 0.006);
    for (const tx of o.towers || [W * 0.08, W * 0.92]) {
      const top = gy - H * 0.36;
      g.fillStyle = "rgba(62,66,65,0.3)"; g.fillRect(tx - 3, top, 6, H * 0.31);
      g.fillRect(tx - 34, top - 22, 68, 26);
      const lg = g.createRadialGradient(tx, top - 9, 0, tx, top - 9, H * 0.1);
      lg.addColorStop(0, "rgba(255,255,250,0.85)"); lg.addColorStop(0.15, "rgba(255,255,250,0.3)"); lg.addColorStop(1, "rgba(255,255,250,0)");
      g.fillStyle = lg; g.fillRect(tx - H * 0.1, top - 9 - H * 0.1, H * 0.2, H * 0.2);
    }
  }
  // pitch
  const pt = g.createLinearGradient(0, gy, 0, H);
  pt.addColorStop(0, o.pitchTop || "#8f9490"); pt.addColorStop(1, o.pitchBottom || "#3c403e");
  g.fillStyle = pt; g.fillRect(0, gy, W, H - gy);
  // horizon fog
  const fg = g.createLinearGradient(0, gy - H * 0.12, 0, gy + H * 0.06);
  fg.addColorStop(0, "rgba(200,204,200,0)"); fg.addColorStop(0.6, "rgba(200,204,200,0.55)"); fg.addColorStop(1, "rgba(200,204,200,0)");
  g.fillStyle = fg; g.fillRect(0, gy - H * 0.12, W, H * 0.18);
}

// reflection of a figure on the wet ground (draws the figure into a temp canvas)
let _refl = null;
function reflect(g, gy, drawFn, alpha = 0.28, blur = 3) {
  const W = g.canvas.width, H = g.canvas.height;
  if (!_refl || _refl.width !== W || _refl.height !== H) { _refl = document.createElement("canvas"); _refl.width = W; _refl.height = H; }
  const r = _refl.getContext("2d"); r.setTransform(1, 0, 0, 1, 0, 0); r.clearRect(0, 0, W, H); drawFn(r);
  r.globalCompositeOperation = "destination-in";        // fade with distance from the feet
  const m = r.createLinearGradient(0, gy, 0, gy - H * 0.25);
  m.addColorStop(0, "rgba(0,0,0,1)"); m.addColorStop(1, "rgba(0,0,0,0)"); r.fillStyle = m; r.fillRect(0, 0, W, H);
  r.globalCompositeOperation = "source-over";
  g.save(); g.globalAlpha = alpha; g.filter = `blur(${blur}px)`; g.translate(0, 2 * gy); g.scale(1, -1); g.drawImage(_refl, 0, 0); g.restore();
}

function contactShadow(g, x, gy, w) {
  g.save(); g.filter = "blur(10px)"; g.fillStyle = "rgba(10,12,12,0.45)";
  g.beginPath(); g.ellipse(x, gy + 4, w, w * 0.12, 0, 0, Math.PI * 2); g.fill(); g.restore();
}

// rain: depth layers; streaks brighten near the light
function rain(g, W, H, t = 0, o = {}) {
  const lx = o.lightX || W * 0.5, ly = o.lightY || 0, slant = o.slant == null ? 0.12 : o.slant;
  const layers = o.layers || [
    { n: 900, len: [18, 34], w: 1, a: 0.16, speed: 1.6 },
    { n: 380, len: [40, 70], w: 1.6, a: 0.22, speed: 2.4 },
    { n: 60, len: [110, 180], w: 3, a: 0.2, speed: 3.6, blur: 2 },
  ];
  layers.forEach((L, li) => {
    const r = rng((o.seed || 11) + li * 97);
    g.save(); if (L.blur) g.filter = `blur(${L.blur}px)`; g.lineWidth = L.w; g.lineCap = "round";
    for (let i = 0; i < L.n; i++) {
      const x0 = r() * (W + 200) - 100, y0 = r() * H, l = L.len[0] + r() * (L.len[1] - L.len[0]);
      const y = ((y0 + t * L.speed * H * 0.9) % (H + l)) - l, x = x0 - (y - y0) * slant;
      const near = Math.max(0, 1 - Math.hypot(x - lx, y - ly) / (H * 0.8));
      const dark = o.dark || 0.5;
      const c = near > 0.25 ? `rgba(250,250,245,${L.a * (0.6 + near)})` : `rgba(30,32,32,${L.a * dark})`;
      g.strokeStyle = c; g.beginPath(); g.moveTo(x, y); g.lineTo(x - l * slant, y + l); g.stroke();
    }
    g.restore();
  });
}

function splashes(g, cx, gy, spread, t = 0, seed = 5) {
  const r = rng(seed); g.save(); g.strokeStyle = "rgba(225,228,224,0.35)"; g.lineWidth = 1.5;
  for (let i = 0; i < 70; i++) {
    const x = cx + (r() - 0.5) * spread, y = gy + r() * 260 * (0.2 + r()), ph = (r() + t * 1.7) % 1, s = 4 + ph * 22 * (0.4 + (y - gy) / 300);
    g.globalAlpha = (1 - ph) * 0.8; g.beginPath(); g.ellipse(x, y, s, s * 0.22, 0, 0, Math.PI * 2); g.stroke();
  }
  g.restore();
}

function finishGrade(g, W, H, o = {}) {
  const v = g.createRadialGradient(W / 2, H * 0.46, H * 0.25, W / 2, H * 0.5, H * 0.8);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, `rgba(0,0,0,${o.vignette == null ? 0.55 : o.vignette})`);
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  const r = rng(o.seed || 77), img = g.getImageData(0, 0, W, H), d = img.data, amt = o.grain == null ? 14 : o.grain;
  for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, 0, 0);
}
