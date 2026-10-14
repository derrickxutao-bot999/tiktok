// 足球与城市 · 曼联 — "the red shirt on the sofa".
// One camera behind the sofa, looking at the screen. The room around it
// changes with the years: 1999 family flat, 2008 dorm, 2026 alone.
// Everything is muted night blue; United red is the only colour.

const W = 1080, H = 1920;
const RED = "#c8102e";
const rng = seed => { let s = seed >>> 0 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };

// scratch canvases
const _cv = {};
function cv(name) {
  if (!_cv[name]) { const c = document.createElement("canvas"); c.width = W; c.height = H; _cv[name] = c; }
  const c = _cv[name], x = c.getContext("2d");
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = "source-over"; x.filter = "none"; x.globalAlpha = 1;
  x.clearRect(0, 0, W, H); return [c, x];
}

// light pool cast by a screen onto the room
function glow(g, x, y, r, col, a = 1) {
  g.save(); g.globalCompositeOperation = "screen"; g.globalAlpha = a;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, col); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore();
}

// figures drawn by fn get a rim of screen light around their outline
function rimLit(g, fn, L) {
  if (!L) { fn(g); return; }
  const [A, a] = cv("rimA"); fn(a);
  const [E, e] = cv("rimE"); e.drawImage(A, 0, 0); e.globalCompositeOperation = "destination-in";
  const k = L.w || 6; for (const [dx, dy] of [[0, k], [k * .55, k * .5], [-k * .55, k * .5]]) e.drawImage(A, dx, dy);
  const [R, r] = cv("rimR"); r.drawImage(A, 0, 0);
  r.globalCompositeOperation = "destination-out"; r.drawImage(E, 0, 0);
  r.globalCompositeOperation = "source-in";
  const gr = r.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r);
  gr.addColorStop(0, L.col); gr.addColorStop(0.55, L.col2 || L.col); gr.addColorStop(1, "rgba(0,0,0,0)");
  r.fillStyle = gr; r.fillRect(0, 0, W, H);
  g.drawImage(A, 0, 0);
  g.save(); g.globalCompositeOperation = "screen"; g.filter = "blur(3px)"; g.drawImage(R, 0, 0); g.filter = "blur(0.8px)"; g.globalAlpha = 0.7; g.drawImage(R, 0, 0); g.restore();
}

// ---------------------------------------------------------------- people
// back view, head and shoulders; (x, yS) = base of the neck, s = head radius
const HAIR = "#0d0e12";
function bustBack(G, x, yS, s, o = {}) {
  // each figure is drawn on its own layer so its shading never touches a neighbour
  const [L, g] = cv("bust"); bustBackLayer(g, x, yS, s, o); G.drawImage(L, 0, 0);
}
function bustBackLayer(g, x, yS, s, o) {
  const sh = o.sh || 1.75, hy = yS - (1.5 - 0.45 * (o.bow || 0)) * s, skin = o.skin || "#3d2b29";
  const shirt = o.shirt || "#5c0c14";
  if (o.remote) { // right arm raised toward the screen, remote in hand (behind the torso)
    const r = o.remote, hx = x + (1.75 + 0.5 * r) * s, hyy = yS + (2.2 - 2.0 * r) * s;
    g.strokeStyle = skin; g.lineCap = "round"; g.lineWidth = 0.55 * s;
    g.beginPath(); g.moveTo(x + 1.5 * s, yS + 1.2 * s); g.quadraticCurveTo(x + 2.1 * s, yS + 1.4 * s, hx, hyy); g.stroke(); g.lineCap = "butt";
    g.fillStyle = skin; g.beginPath(); g.ellipse(hx, hyy, 0.32 * s, 0.3 * s, 0, 0, 7); g.fill();
    // remote pointed up and in toward the screen
    g.save(); g.translate(hx, hyy); g.rotate(-0.85 * r);
    g.fillStyle = "#0b0c10"; rr(g, -0.13 * s, -0.95 * s, 0.26 * s, 0.85 * s, 0.07 * s); g.fill();
    if (o.led) { g.fillStyle = "#ff3b30"; g.beginPath(); g.arc(0, -0.9 * s, 0.06 * s, 0, 7); g.fill(); }
    g.restore();
  }
  // torso
  const torso = (wTop, col) => {
    g.fillStyle = col; g.beginPath();
    g.moveTo(x - 0.42 * s, yS - 0.14 * s);
    g.quadraticCurveTo(x - wTop * 0.82 * s, yS - 0.08 * s, x - wTop * s, yS + 0.55 * s);
    g.quadraticCurveTo(x - (wTop + 0.12) * s, yS + 1.4 * s, x - (wTop + 0.1) * s, yS + 4 * s);
    g.lineTo(x + (wTop + 0.1) * s, yS + 4 * s);
    g.quadraticCurveTo(x + (wTop + 0.12) * s, yS + 1.4 * s, x + wTop * s, yS + 0.55 * s);
    g.quadraticCurveTo(x + wTop * 0.82 * s, yS - 0.08 * s, x + 0.42 * s, yS - 0.14 * s);
    g.closePath(); g.fill();
  };
  if (o.vest) { // bare shoulders, white vest
    torso(sh, skin);
    g.fillStyle = o.vest; g.beginPath();
    g.moveTo(x - 0.5 * s, yS - 0.05 * s); g.lineTo(x - 0.78 * s, yS - 0.02 * s);
    g.quadraticCurveTo(x - 0.95 * s, yS + 0.9 * s, x - (sh - 0.25) * s, yS + 1.25 * s);
    g.lineTo(x - (sh - 0.1) * s, yS + 4 * s); g.lineTo(x + (sh - 0.1) * s, yS + 4 * s);
    g.lineTo(x + (sh - 0.25) * s, yS + 1.25 * s);
    g.quadraticCurveTo(x + 0.95 * s, yS + 0.9 * s, x + 0.78 * s, yS - 0.02 * s); g.lineTo(x + 0.5 * s, yS - 0.05 * s);
    g.quadraticCurveTo(x, yS + 0.25 * s, x - 0.5 * s, yS - 0.05 * s); g.fill();
  } else torso(sh, shirt);
  // shirt shading: a touch of bounce light on the shoulders
  if (!o.vest) {
    g.save(); g.globalCompositeOperation = "source-atop";
    const sg = g.createLinearGradient(0, yS - 0.2 * s, 0, yS + 3 * s);
    sg.addColorStop(0, o.shirtHi || "rgba(255,120,120,0.10)"); sg.addColorStop(1, "rgba(0,0,0,0.25)");
    g.fillStyle = sg; g.fillRect(x - 3 * s, yS - 0.3 * s, 6 * s, 4.4 * s); g.restore();
    if (o.collar) { g.strokeStyle = o.collar; g.lineWidth = 0.12 * s; g.beginPath();
      g.moveTo(x - 0.46 * s, yS - 0.1 * s); g.quadraticCurveTo(x, yS + 0.08 * s, x + 0.46 * s, yS - 0.1 * s); g.stroke(); }
  }
  if (o.number) {
    g.fillStyle = o.numberCol || "rgba(255,226,226,0.2)"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `700 ${1.55 * s}px Oswald, sans-serif`; g.fillText(o.number, x, yS + 1.75 * s);
    if (o.name) { g.font = `700 ${0.36 * s}px Oswald, sans-serif`; g.fillText(o.name, x, yS + 0.72 * s); }
  }
  // neck, head, ears
  g.fillStyle = skin; rr(g, x - 0.36 * s, hy + 0.4 * s, 0.72 * s, 1.15 * s, 0.2 * s); g.fill();
  g.beginPath(); g.ellipse(x, hy, 0.9 * s, 1.0 * s, 0, 0, 7); g.fill();
  for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(x + sd * 0.88 * s, hy + 0.12 * s, 0.17 * s, 0.27 * s, sd * 0.15, 0, 7); g.fill(); }
  // hair
  const style = o.hair || "short", hc = o.hairCol || HAIR;
  g.fillStyle = hc;
  const cap = (rx, ry, nape, dy = 0) => {
    g.save(); g.beginPath(); g.rect(x - 2 * s, hy - 2 * s, 4 * s, 2 * s + nape * s); g.clip();
    g.beginPath(); g.ellipse(x, hy + dy * s, rx * s, ry * s, 0, 0, 7); g.fill(); g.restore();
    // soft nape edge
    g.beginPath(); g.ellipse(x, hy + nape * s, rx * 0.86 * s, 0.14 * s, 0, 0, Math.PI); g.fill();
  };
  if (style === "short") cap(0.94, 1.04, 0.52);
  if (style === "kid") {
    cap(0.95, 1.05, 0.5);
    // cowlick at the crown
    g.beginPath(); g.moveTo(x - 0.08 * s, hy - 0.98 * s); g.quadraticCurveTo(x + 0.05 * s, hy - 1.35 * s, x + 0.3 * s, hy - 1.28 * s);
    g.quadraticCurveTo(x + 0.12 * s, hy - 1.1 * s, x + 0.2 * s, hy - 0.96 * s); g.fill();
    g.beginPath(); g.moveTo(x - 0.25 * s, hy - 0.95 * s); g.quadraticCurveTo(x - 0.32 * s, hy - 1.25 * s, x - 0.12 * s, hy - 1.24 * s);
    g.quadraticCurveTo(x - 0.16 * s, hy - 1.08 * s, x - 0.02 * s, hy - 0.97 * s); g.fill();
  }
  if (style === "buzz") { g.globalAlpha = 0.92; cap(0.92, 1.02, 0.4); g.globalAlpha = 1; }
  if (style === "shaggy") {
    cap(1.0, 1.1, 0.62, 0.02);
    const r = rng(o.seed || 9);
    for (let i = 0; i < 9; i++) { const a = Math.PI * (0.05 + 0.9 * i / 8), px = x + Math.cos(a) * 0.92 * s, py = hy + 0.45 * s + Math.sin(a) * 0.18 * s;
      g.beginPath(); g.moveTo(px - 0.13 * s, py - 0.1 * s); g.lineTo(px + (r() - 0.5) * 0.1 * s, py + (0.18 + r() * 0.12) * s); g.lineTo(px + 0.13 * s, py - 0.1 * s); g.fill(); }
  }
  g.save(); g.globalCompositeOperation = "source-atop";
  const hs = g.createRadialGradient(x, hy - 1.0 * s, 0, x, hy - 1.0 * s, 1.1 * s);
  hs.addColorStop(0, o.hairHi || "rgba(150,165,195,0.22)"); hs.addColorStop(1, "rgba(150,165,195,0)");
  g.fillStyle = hs; g.fillRect(x - 1.2 * s, hy - 1.3 * s, 2.4 * s, 1.4 * s); g.restore();
  // accessories
  if (o.hood) { g.fillStyle = o.shirt; g.beginPath(); g.ellipse(x, yS + 0.15 * s, 1.0 * s, 0.42 * s, 0, 0, 7); g.fill();
    g.strokeStyle = "rgba(0,0,0,0.35)"; g.lineWidth = 0.05 * s; g.beginPath(); g.ellipse(x, yS + 0.12 * s, 0.7 * s, 0.22 * s, 0, 0, Math.PI); g.stroke(); }
  if (o.headphones) { g.strokeStyle = "#16181e"; g.lineWidth = 0.16 * s; g.beginPath(); g.ellipse(x, yS + 0.05 * s, 0.85 * s, 0.35 * s, 0, 0.1, Math.PI - 0.1); g.stroke();
    g.fillStyle = "#16181e"; for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(x + sd * 0.86 * s, yS - 0.05 * s, 0.24 * s, 0.3 * s, 0, 0, 7); g.fill(); } }
}

// an arm laid across someone's back (dad's arm round the kid): from shoulder (x0,y0) to hand (x1,y1)
function armAcross(g, x0, y0, x1, y1, s, skin) {
  g.strokeStyle = skin; g.lineCap = "round"; g.lineWidth = 0.62 * s;
  g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2, Math.max(y0, y1) + 0.5 * s, x1, y1); g.stroke();
  g.fillStyle = skin; g.beginPath(); g.ellipse(x1 - 0.1 * s, y1 + 0.05 * s, 0.42 * s, 0.32 * s, -0.4, 0, 7); g.fill(); g.lineCap = "butt";
}

// ---------------------------------------------------------------- props
function rainWindow(g, x, y, w, h, o = {}) {
  const r = rng(o.seed || 21);
  g.save(); rr(g, x, y, w, h, 6); g.clip();
  const sky = g.createLinearGradient(0, y, 0, y + h); sky.addColorStop(0, o.sky0 || "#0a0e18"); sky.addColorStop(1, o.sky1 || "#18202f");
  g.fillStyle = sky; g.fillRect(x, y, w, h);
  // distant windows / city lights, out of focus
  g.filter = "blur(5px)";
  for (let i = 0; i < (o.lights || 26); i++) {
    const lx = x + r() * w, ly = y + h * (0.35 + r() * 0.65), lr = 4 + r() * 10, warm = r() < 0.6;
    g.fillStyle = warm ? `rgba(255,190,120,${0.25 + r() * 0.35})` : `rgba(150,180,255,${0.2 + r() * 0.3})`;
    g.beginPath(); g.arc(lx, ly, lr, 0, 7); g.fill();
  }
  g.filter = "none";
  // streaks and drops on the glass
  g.strokeStyle = "rgba(190,205,230,0.22)"; g.lineWidth = 1.4;
  for (let i = 0; i < w * h / 900; i++) { const sx = x + r() * w, sy = y + r() * h, l = 10 + r() * 34;
    g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx - 1, sy + l); g.stroke(); }
  for (let i = 0; i < w * h / 700; i++) { const dx = x + r() * w, dy = y + r() * h, d = 1.5 + r() * 3.5;
    g.fillStyle = "rgba(200,215,240,0.25)"; g.beginPath(); g.arc(dx, dy, d, 0, 7); g.fill();
    g.fillStyle = "rgba(255,255,255,0.35)"; g.beginPath(); g.arc(dx - d * 0.3, dy - d * 0.3, d * 0.35, 0, 7); g.fill(); }
  g.restore();
  // frame and mullions
  g.strokeStyle = o.frame || "#2a3243"; g.lineWidth = 14; rr(g, x, y, w, h, 6); g.stroke();
  g.lineWidth = 9; g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.moveTo(x, y + h * 0.42); g.lineTo(x + w, y + h * 0.42); g.stroke();
}

function door(g, x, y, w, h, open, o = {}) {
  g.fillStyle = o.frame || "#283041"; g.fillRect(x - 14, y - 14, w + 28, h + 14);
  if (open > 0) {
    const lg = g.createLinearGradient(0, y, 0, y + h); lg.addColorStop(0, "#f6e2b8"); lg.addColorStop(1, "#d9b47a");
    g.fillStyle = lg; g.fillRect(x, y, w, h);
    // the leaf swung into the room (hinge on the right)
    const lw = w * (1 - open);
    g.fillStyle = o.leaf || "#30394c"; g.beginPath(); g.moveTo(x + w, y); g.lineTo(x + w - lw, y - 10 * open); g.lineTo(x + w - lw, y + h + 6 * open); g.lineTo(x + w, y + h); g.fill();
  } else {
    g.fillStyle = o.leaf || "#30394c"; g.fillRect(x, y, w, h);
    g.strokeStyle = "rgba(255,255,255,0.05)"; g.lineWidth = 3; g.strokeRect(x + 22, y + 26, w - 44, h * 0.38); g.strokeRect(x + 22, y + h * 0.5, w - 44, h * 0.42);
    g.fillStyle = "#6c7486"; g.beginPath(); g.arc(x + 22, y + h * 0.52, 7, 0, 7); g.fill();
    // a line of corridor light under the door
    g.fillStyle = "rgba(246,214,160,0.55)"; g.fillRect(x + 4, y + h - 3, w - 8, 3);
  }
}
// corridor light spilling across the floor toward the camera
function doorSpill(g, x, y, w, h, open, floorY) {
  if (open <= 0) return;
  g.save(); g.globalCompositeOperation = "screen";
  const sg = g.createLinearGradient(0, y + h, 0, H);
  sg.addColorStop(0, `rgba(246,214,160,${0.42 * open})`); sg.addColorStop(1, "rgba(246,214,160,0)");
  g.fillStyle = sg; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x + w, y + h); g.lineTo(x + w + 520, H); g.lineTo(x - 260, H); g.fill();
  glow(g, x + w / 2, y + h * 0.5, h * 0.9, "rgba(246,214,160,0.35)", open);
  g.restore();
}

// screens -------------------------------------------------------------
function screenContent(g, x, y, w, h, kind, o) {
  g.save(); rr(g, x, y, w, h, o.r || 4); g.clip();
  if (o.image) { // a real video frame, letterboxed to fill
    const iw = o.image.videoWidth || o.image.width, ih = o.image.videoHeight || o.image.height, sc = Math.max(w / iw, h / ih);
    g.drawImage(o.image, x + (w - iw * sc) / 2, y + (h - ih * sc) / 2, iw * sc, ih * sc);
  } else if (kind === "interview") {
    g.fillStyle = "#cfd3da"; g.fillRect(x, y, w, h);
    g.fillStyle = "#b8bec8"; for (let i = 0; i < 8; i++) for (let j = 0; j < 5; j++) g.fillRect(x + i * w / 7 - 10, y + j * h / 4 - 8, w / 10, h / 9);
    // the player, head and shoulders
    const cx = x + w * 0.5, cy = y + h * 0.62, s = h * 0.17;
    g.fillStyle = "#1c1c22"; g.beginPath(); g.ellipse(cx, cy + 1.9 * s, 2.2 * s, 1.3 * s, 0, Math.PI, 0); g.fill();
    g.fillStyle = "#c79c84"; g.beginPath(); g.ellipse(cx, cy, 0.85 * s, 1.0 * s, 0, 0, 7); g.fill();
    g.fillStyle = "#2a2220"; g.beginPath(); g.ellipse(cx, cy - 0.55 * s, 0.9 * s, 0.55 * s, 0, Math.PI, 0); g.fill();
    g.fillStyle = "rgba(0,0,0,0.55)"; g.fillRect(x, y + h * 0.82, w, h * 0.18);
    g.fillStyle = "#fff"; g.font = `600 ${h * 0.075}px NotoSerifSC, serif`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(o.sub || "（马丁内斯 赛后采访）", x + w / 2, y + h * 0.91);
  } else if (kind === "match1999" || kind === "match2008") {
    const night = g.createLinearGradient(0, y, 0, y + h); night.addColorStop(0, "#0b1018"); night.addColorStop(0.3, "#1a2430"); night.addColorStop(0.32, "#245a2e"); night.addColorStop(1, "#3c8a46");
    g.fillStyle = night; g.fillRect(x, y, w, h);
    for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"; g.fillRect(x, y + h * (0.32 + i * 0.1), w, h * 0.1); }
    g.fillStyle = "rgba(255,255,255,0.6)"; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(x + w * (0.05 + i * 0.115), y + h * 0.08, 2.2, 0, 7); g.fill(); }
    // players: red shirts celebrating, a grey shirt down
    const p = (px, py, sc, col, arms) => { const s = h * 0.055 * sc; g.fillStyle = col;
      g.beginPath(); g.arc(px, py - 3.1 * s, 0.55 * s, 0, 7); g.fill(); rr(g, px - 0.7 * s, py - 2.5 * s, 1.4 * s, 1.6 * s, 0.3 * s); g.fill();
      g.fillStyle = "#f2f2f2"; g.fillRect(px - 0.65 * s, py - 1.0 * s, 1.3 * s, 0.6 * s);
      g.fillStyle = "#222"; g.fillRect(px - 0.55 * s, py - 0.4 * s, 0.35 * s, 0.9 * s); g.fillRect(px + 0.2 * s, py - 0.4 * s, 0.35 * s, 0.9 * s);
      if (arms) { g.strokeStyle = col; g.lineWidth = 0.35 * s; g.beginPath(); g.moveTo(px - 0.6 * s, py - 2.3 * s); g.lineTo(px - 1.3 * s, py - 3.6 * s); g.moveTo(px + 0.6 * s, py - 2.3 * s); g.lineTo(px + 1.3 * s, py - 3.6 * s); g.stroke(); } };
    if (kind === "match1999") {
      p(x + w * 0.42, y + h * 0.78, 1.3, RED, 1); p(x + w * 0.58, y + h * 0.76, 1.2, RED, 1); p(x + w * 0.5, y + h * 0.7, 1.1, RED, 1); p(x + w * 0.26, y + h * 0.66, 0.9, "#8d8f99", 0);
    } else {
      p(x + w * 0.5, y + h * 0.8, 1.25, RED, 1); p(x + w * 0.32, y + h * 0.7, 0.95, RED, 1); p(x + w * 0.7, y + h * 0.68, 0.9, "#2b4aa0", 0);
      g.strokeStyle = "rgba(220,230,255,0.25)"; g.lineWidth = 1; const r = rng(4);
      for (let i = 0; i < 60; i++) { const sx = x + r() * w, sy = y + r() * h; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx - 3, sy + 12); g.stroke(); }
    }
    // score bug
    g.fillStyle = "rgba(10,14,30,0.85)"; rr(g, x + w * 0.04, y + h * 0.05, w * 0.5, h * 0.12, 3); g.fill();
    g.fillStyle = "#fff"; g.font = `600 ${h * 0.07}px NotoSerifSC, serif`; g.textAlign = "left"; g.textBaseline = "middle";
    g.fillText(o.score, x + w * 0.07, y + h * 0.112);
  } else if (kind === "off") {
    const og = g.createLinearGradient(x, y, x + w, y + h); og.addColorStop(0, "#151a24"); og.addColorStop(1, "#0b0e14");
    g.fillStyle = og; g.fillRect(x, y, w, h);
    g.fillStyle = "rgba(255,255,255,0.04)"; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w * 0.45, y); g.lineTo(x, y + h * 0.7); g.fill();
  }
  if (o.crt && kind !== "off") { // scanlines and tube vignette
    g.fillStyle = "rgba(0,0,0,0.18)"; for (let yy = y; yy < y + h; yy += 3) g.fillRect(x, yy, w, 1);
    const v = g.createRadialGradient(x + w / 2, y + h / 2, h * 0.3, x + w / 2, y + h / 2, w * 0.75);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.55)"); g.fillStyle = v; g.fillRect(x, y, w, h);
  }
  g.restore();
}

function flatTV(g, x, y, w, h, kind, o = {}) {
  g.fillStyle = "#07090d"; rr(g, x - 10, y - 10, w + 20, h + 20, 8); g.fill();
  screenContent(g, x, y, w, h, kind, o);
  g.fillStyle = "#0b0d12"; g.fillRect(x + w / 2 - 50, y + h + 10, 100, 14);
}
function crtTV(g, x, y, w, h, kind, o = {}) {
  // cabinet body
  g.fillStyle = "#26252a"; rr(g, x - 34, y - 30, w + 68, h + 78, 22); g.fill();
  g.fillStyle = "#1c1b20"; rr(g, x - 34, y + h + 18, w + 68, 30, 10); g.fill();
  for (let i = 0; i < 4; i++) { g.fillStyle = "#3a3940"; g.beginPath(); g.arc(x + w - 30 - i * 26, y + h + 33, 6, 0, 7); g.fill(); }
  // rabbit-ear antenna
  g.strokeStyle = "#3d3c44"; g.lineWidth = 4; g.beginPath();
  g.moveTo(x + w / 2, y - 30); g.lineTo(x + w / 2 - 90, y - 190); g.moveTo(x + w / 2, y - 30); g.lineTo(x + w / 2 + 120, y - 170); g.stroke();
  g.fillStyle = "#3d3c44"; g.beginPath(); g.ellipse(x + w / 2, y - 30, 30, 12, 0, Math.PI, 0); g.fill();
  // lace doily draped over the top
  g.fillStyle = "rgba(200,196,188,0.35)"; g.beginPath(); g.moveTo(x - 10, y - 32);
  for (let i = 0; i <= 12; i++) { const px = x - 10 + (w + 20) * i / 12; g.quadraticCurveTo(px - (w + 20) / 24, y - 6, px, y - 32 + (i % 2 ? 6 : 0)); }
  g.lineTo(x + w + 10, y - 34); g.lineTo(x - 10, y - 34); g.fill();
  screenContent(g, x, y, w, h, kind, { ...o, crt: true, r: 26 });
  // glass highlight
  g.save(); rr(g, x, y, w, h, 26); g.clip(); g.fillStyle = "rgba(255,255,255,0.06)";
  g.beginPath(); g.ellipse(x + w * 0.3, y + h * 0.2, w * 0.45, h * 0.25, -0.3, 0, 7); g.fill(); g.restore();
}

// ---------------------------------------------------------------- rooms
// common: floor line, back wall, glow, rim settings per era
function floorAndWall(g, wallTop, wallCol, floorY, floorCol) {
  g.fillStyle = wallCol; g.fillRect(0, 0, W, floorY);
  const fg = g.createLinearGradient(0, floorY, 0, H); fg.addColorStop(0, floorCol); fg.addColorStop(1, "#07090d");
  g.fillStyle = fg; g.fillRect(0, floorY, W, H - floorY);
  g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(0, floorY - 6, W, 6);
}

function sofaBack(g, top, o = {}) {
  g.fillStyle = o.col || "#11151d"; rr(g, -40, top, W + 80, H - top + 40, 60); g.fill();
  g.strokeStyle = o.rim || "rgba(150,175,215,0.22)"; g.lineWidth = 3; g.beginPath(); g.moveTo(40, top + 2); g.lineTo(W - 40, top + 2); g.stroke();
  if (o.lace) { // crocheted antimacassar over the sofa back (1990s)
    for (const cx of o.lace) {
      g.fillStyle = "rgba(196,190,176,0.16)"; g.beginPath(); g.moveTo(cx - 110, top - 2); g.lineTo(cx + 110, top - 2); g.lineTo(cx + 110, top + 60);
      for (let i = 0; i < 11; i++) g.quadraticCurveTo(cx + 110 - 20 * i - 10, top + 82, cx + 110 - 20 * (i + 1), top + 60); g.fill();
      g.fillStyle = "rgba(0,0,0,0.25)"; for (let i = 0; i < 10; i++) for (let j = 0; j < 3; j++) { g.beginPath(); g.arc(cx - 95 + i * 21, top + 12 + j * 18, 3.2, 0, 7); g.fill(); } }
  }
}

function room2026(g, st) {
  const floorY = 1240;
  floorAndWall(g, 0, "#1b2232", floorY, "#141925");
  rainWindow(g, 40, 430, 200, 520, { seed: 7 });
  door(g, 830, 560, 190, floorY - 560, st.door || 0, {});
  // low cabinet + TV
  g.fillStyle = "#222a39"; g.fillRect(250, 1060, 560, 120); g.fillStyle = "#1a2030"; g.fillRect(250, 1170, 560, 14);
  const tv = { x: 280, y: 720, w: 500, h: 281 };
  if (st.tv !== "off") glow(g, tv.x + tv.w / 2, tv.y + tv.h / 2, 900, "rgba(170,195,235,0.30)");
  flatTV(g, tv.x, tv.y, tv.w, tv.h, st.tv === "off" ? "off" : (st.tv || "interview"), st);
  // side table: a can and a phone face down
  g.fillStyle = "#1d2433"; g.fillRect(40, 1330, 190, 24); g.fillRect(60, 1354, 14, 140); g.fillRect(196, 1354, 14, 140);
  g.fillStyle = "#5a2026"; rr(g, 90, 1266, 34, 66, 6); g.fill(); g.fillStyle = "rgba(255,255,255,0.15)"; g.fillRect(96, 1272, 6, 52);
  doorSpill(g, 830, 560, 190, floorY - 560, st.door || 0, floorY);
  return { tv, light: st.tv === "off" ? null : { x: tv.x + tv.w / 2, y: tv.y + tv.h / 2, r: 1300, col: "rgba(200,220,255,0.5)", col2: "rgba(170,195,235,0.28)" } };
}

function room1999(g, st) {
  const floorY = 1230;
  floorAndWall(g, 0, "#24232c", floorY, "#1a1a20");
  // faint wallpaper
  g.fillStyle = "rgba(255,255,255,0.025)"; for (let i = 0; i < 14; i++) for (let j = 0; j < 16; j++) { g.beginPath(); g.arc(30 + i * 80 + (j % 2) * 40, 40 + j * 80, 9, 0, 7); g.fill(); }
  // tear-off calendar and wall clock
  g.fillStyle = "#3a3438"; g.fillRect(96, 470, 170, 230); g.fillStyle = "#cfc6b8"; g.fillRect(110, 520, 142, 168);
  g.fillStyle = "#8a1d24"; g.fillRect(110, 486, 142, 30);
  g.fillStyle = "#e9dfcf"; g.textAlign = "center"; g.textBaseline = "middle"; g.font = "600 21px NotoSerifSC, serif"; g.fillText("1999年5月", 181, 502);
  g.fillStyle = "#2a2626"; g.font = "700 92px Oswald, sans-serif"; g.fillText("27", 181, 596); g.font = "600 24px NotoSerifSC, serif"; g.fillText("星期四", 181, 664);
  clockFace(g, 900, 520, 78, 2, 45, "#2e2d35", "#bdb6a8");
  // cabinet with the CRT
  g.fillStyle = "#33281f"; g.fillRect(230, 1040, 600, 150); g.fillStyle = "#2a2019"; g.fillRect(230, 1180, 600, 16);
  g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(520, 1060, 4, 110);
  // thermos flask
  g.fillStyle = "#5e1f25"; rr(g, 745, 900, 56, 140, 14); g.fill(); g.fillStyle = "#3d3a40"; g.fillRect(752, 880, 42, 26);
  const tv = { x: 330, y: 760, w: 360, h: 260 };
  if (st.tv !== "off") glow(g, tv.x + tv.w / 2, tv.y + tv.h / 2, 820, "rgba(160,200,190,0.30)");
  crtTV(g, tv.x, tv.y, tv.w, tv.h, st.tv || "match1999", { score: "曼联 2 : 1 拜仁", ...st });
  return { tv, light: { x: tv.x + tv.w / 2, y: tv.y + tv.h / 2, r: 1250, col: "rgba(200,235,220,0.9)", col2: "rgba(150,195,180,0.45)" } };
}

function room2008(g, st) {
  const floorY = 1300;
  floorAndWall(g, 0, "#262a30", floorY, "#191c21");
  // painted green dado, typical of a dorm
  g.fillStyle = "#1f3229"; g.fillRect(0, 900, W, floorY - 900); g.fillStyle = "#2a4236"; g.fillRect(0, 896, W, 8);
  // bunk bed on the left with a mosquito net
  g.fillStyle = "#30363f"; g.fillRect(30, 300, 16, 1000); g.fillRect(300, 300, 16, 1000);
  g.fillRect(30, 560, 286, 26); g.fillStyle = "#2b2f38"; g.fillRect(46, 520, 254, 40);
  g.fillStyle = "rgba(190,200,215,0.07)"; g.fillRect(46, 300, 254, 220);
  g.strokeStyle = "rgba(190,200,215,0.08)"; g.lineWidth = 1; for (let i = 0; i < 16; i++) { g.beginPath(); g.moveTo(50 + i * 16, 300); g.lineTo(50 + i * 16, 520); g.stroke(); }
  for (let i = 0; i < 6; i++) { g.fillStyle = "#30363f"; g.fillRect(270, 620 + i * 110, 46, 10); }
  // poster: a red No.7 shirt
  g.fillStyle = "#2c2a30"; g.fillRect(700, 440, 230, 300);
  g.fillStyle = "#6e1018"; g.beginPath(); g.moveTo(760, 500); g.lineTo(870, 500); g.lineTo(905, 560); g.lineTo(870, 580); g.lineTo(870, 700); g.lineTo(760, 700); g.lineTo(760, 580); g.lineTo(725, 560); g.closePath(); g.fill();
  g.fillStyle = "rgba(255,225,225,0.35)"; g.font = "700 90px Oswald, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("7", 815, 620);
  // desk, laptop, noodles, thermos, alarm clock
  g.fillStyle = "#2b2622"; g.fillRect(150, 1130, 800, 40); g.fillStyle = "#211d1a"; g.fillRect(170, 1170, 30, 160); g.fillRect(900, 1170, 30, 160);
  const tv = { x: 410, y: 930, w: 290, h: 180 };
  if (st.tv !== "off") glow(g, tv.x + tv.w / 2, tv.y + tv.h / 2, 760, "rgba(185,205,255,0.32)");
  g.fillStyle = "#1a1c22"; rr(g, tv.x - 14, tv.y - 14, tv.w + 28, tv.h + 26, 8); g.fill();
  screenContent(g, tv.x, tv.y, tv.w, tv.h, st.tv || "match2008", { score: "曼联 6 : 5 切尔西 · 点球", ...st });
  g.fillStyle = "#24262d"; g.beginPath(); g.moveTo(tv.x - 30, tv.y + tv.h + 12); g.lineTo(tv.x + tv.w + 30, tv.y + tv.h + 12); g.lineTo(tv.x + tv.w + 50, 1132); g.lineTo(tv.x - 50, 1132); g.fill();
  g.fillStyle = "#c9c2b4"; g.globalAlpha = 0.45; rr(g, 230, 1062, 74, 70, 8); g.fill(); rr(g, 800, 1068, 66, 64, 8); g.fill(); g.globalAlpha = 1;
  g.fillStyle = "#7a1f27"; rr(g, 880, 960, 52, 172, 14); g.fill(); g.fillStyle = "#3d3a40"; g.fillRect(886, 942, 40, 24);
  g.fillStyle = "#16181d"; rr(g, 740, 1080, 92, 50, 8); g.fill();
  g.fillStyle = "#ff5a4f"; g.font = "28px VT323, monospace"; g.textAlign = "center"; g.fillText("02:45", 786, 1106);
  return { tv, light: { x: tv.x + tv.w / 2, y: tv.y + tv.h / 2, r: 1200, col: "rgba(210,222,255,0.9)", col2: "rgba(175,190,240,0.45)" } };
}

function clockFace(g, x, y, r, hh, mm, face, hand) {
  g.fillStyle = face; g.beginPath(); g.arc(x, y, r + 10, 0, 7); g.fill();
  g.fillStyle = "#cfc8ba"; g.globalAlpha = 0.55; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.globalAlpha = 1;
  g.strokeStyle = "#2a2828"; g.lineWidth = 3;
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.beginPath(); g.moveTo(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8); g.lineTo(x + Math.cos(a) * r * 0.92, y + Math.sin(a) * r * 0.92); g.stroke(); }
  const ah = ((hh % 12) + mm / 60) / 12 * Math.PI * 2 - Math.PI / 2, am = mm / 60 * Math.PI * 2 - Math.PI / 2;
  g.lineCap = "round"; g.lineWidth = 7; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(ah) * r * 0.5, y + Math.sin(ah) * r * 0.5); g.stroke();
  g.lineWidth = 4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(am) * r * 0.76, y + Math.sin(am) * r * 0.76); g.stroke();
  g.lineCap = "butt";
}

function grade(g, o = {}) {
  const v = g.createRadialGradient(W / 2, H * 0.45, H * 0.2, W / 2, H * 0.5, H * 0.78);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, `rgba(0,0,0,${o.vignette == null ? 0.6 : o.vignette})`);
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  const r = rng(o.seed || 5), img = g.getImageData(0, 0, W, H), d = img.data, amt = o.grain == null ? 12 : o.grain;
  for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, 0, 0);
}
