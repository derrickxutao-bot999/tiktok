"use strict";
/* character.js — our own drawn Messi (no photos, no traced footage).
   Recognisable by: small frame, dark swept hair, full beard, Argentina sky-blue/white stripes,
   black shorts, white socks, captain's armband, the 10. Coordinates: feet at (0,0), height ~1000 units. */
const MC = { skin: "#d8a07a", skinShade: "#b97f5c", hair: "#1c1612", beard: "#2a1f18", sky: "#79b3e0", skyShade: "#5d97c6", white: "#f3f4f5", whiteShade: "#cfd6de", shorts: "#15171b", sock: "#eef0f2", boot: "#111", band: "#f2f2f2" };

function mPoly(g, pts, col) { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); }
// a limb as a tapered capsule from (x1,y1) to (x2,y2)
function mLimb(g, x1, y1, x2, y2, w1, w2, col) {
  const a = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(a), ny = Math.cos(a);
  g.fillStyle = col; g.beginPath();
  g.moveTo(x1 + nx * w1, y1 + ny * w1); g.lineTo(x2 + nx * w2, y2 + ny * w2); g.arc(x2, y2, w2, a + Math.PI / 2, a - Math.PI / 2, true);
  g.lineTo(x1 - nx * w1, y1 - ny * w1); g.arc(x1, y1, w1, a - Math.PI / 2, a + Math.PI / 2, true); g.closePath(); g.fill();
}
const P = (x, y, ang, len) => [x + Math.sin(ang) * len, y - Math.cos(ang) * len];   // ang 0 = straight up

// striped shirt fill clipped to a path
function stripes(g, path, x0, x1, y0, y1, offset = 0) {
  g.save(); path(); g.clip();
  g.fillStyle = MC.white; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  for (let x = x0 - 200 + offset; x < x1; x += 96) { g.fillStyle = MC.sky; g.fillRect(x, y0, 48, y1 - y0); }
  const sh = g.createLinearGradient(x0, 0, x1, 0); sh.addColorStop(0, "rgba(40,60,90,0.22)"); sh.addColorStop(.45, "rgba(40,60,90,0)"); sh.addColorStop(1, "rgba(40,60,90,0.28)");
  g.fillStyle = sh; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  g.restore();
}

/* the head, front view. tilt: + looks up, - looks down. eyes: "closed" | "open" */
function mHead(g, x, y, s, o = {}) {
  const tilt = o.tilt || 0;
  g.save(); g.translate(x, y); g.scale(s, s);
  // neck
  g.fillStyle = MC.skinShade; g.fillRect(-26, 30, 52, 60);
  // ears
  g.fillStyle = MC.skinShade; g.beginPath(); g.ellipse(-62, 6 + tilt * 6, 13, 22, 0, 0, Math.PI * 2); g.ellipse(62, 6 + tilt * 6, 13, 22, 0, 0, Math.PI * 2); g.fill();
  // face
  g.fillStyle = MC.skin; g.beginPath(); g.ellipse(0, 0, 60, 76, 0, 0, Math.PI * 2); g.fill();
  // beard: a full, short beard along the jaw and chin, with the moustache
  const by = 8 + tilt * 10;
  g.fillStyle = MC.beard; g.beginPath();
  g.moveTo(-60, by - 18); g.quadraticCurveTo(-58, 60, 0, 82); g.quadraticCurveTo(58, 60, 60, by - 18);
  g.lineTo(46, by - 10); g.quadraticCurveTo(40, 44, 0, 50); g.quadraticCurveTo(-40, 44, -46, by - 10); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(-26, by + 22); g.quadraticCurveTo(0, by + 12, 26, by + 22); g.quadraticCurveTo(0, by + 32, -26, by + 22); g.fill();   // moustache
  g.beginPath(); g.ellipse(0, by + 48, 14, 9, 0, 0, Math.PI * 2); g.fill();                                                            // chin tuft
  // mouth
  g.strokeStyle = "#5a2e24"; g.lineWidth = 3; g.beginPath(); g.moveTo(-12, by + 33); g.quadraticCurveTo(0, by + 36, 12, by + 33); g.stroke();
  // nose
  g.fillStyle = MC.skinShade; g.beginPath(); g.moveTo(-2, -8 + tilt * 6); g.quadraticCurveTo(-12, 14 + tilt * 6, -8, 18 + tilt * 6); g.lineTo(10, 18 + tilt * 6); g.quadraticCurveTo(4, 8, 2, -8 + tilt * 6); g.fill();
  // eyes and brows
  const ey = -14 + tilt * 8;
  g.strokeStyle = "#1a120e"; g.lineWidth = 4; g.lineCap = "round";
  for (const sx of [-1, 1]) {
    if (o.eyes === "open") { g.fillStyle = "#1a120e"; g.beginPath(); g.ellipse(sx * 24, ey, 6, 5, 0, 0, Math.PI * 2); g.fill(); }
    else { g.beginPath(); g.arc(sx * 24, ey - 2, 9, .2 * Math.PI, .8 * Math.PI); g.stroke(); }
    g.lineWidth = 6; g.beginPath(); g.moveTo(sx * 10, ey - 18 - (o.frown ? 3 : 0)); g.quadraticCurveTo(sx * 24, ey - 26, sx * 40, ey - 20 + (o.frown ? -4 : 0)); g.stroke(); g.lineWidth = 4;
  }
  // hair: short, dark, swept to one side
  g.fillStyle = MC.hair; g.beginPath();
  g.moveTo(-62, -6); g.quadraticCurveTo(-70, -70, -20, -88); g.quadraticCurveTo(30, -100, 58, -66); g.quadraticCurveTo(70, -40, 62, -8);
  g.quadraticCurveTo(56, -40, 30, -52); g.quadraticCurveTo(-6, -40, -30, -58); g.quadraticCurveTo(-48, -40, -62, -6); g.fill();
  g.beginPath(); g.moveTo(-30, -58); g.quadraticCurveTo(10, -70, 52, -56); g.quadraticCurveTo(16, -84, -30, -58); g.fill();
  g.restore();
}

/* full figure, front view. o.arms: "sky" (both index fingers up) | "down" | "hips"; o.head: tilt; o.walk phase */
function messiFront(g, x, y, h, o = {}) {
  const s = h / 1000, ph = o.phase || 0, step = Math.sin(ph) * (o.walk ? 1 : 0);
  g.save(); g.translate(x, y); g.scale(s, s);
  // legs: black shorts, skin, white socks, boots
  for (const side of [-1, 1]) {
    const k = side * step, kx = side * 52 + k * 20;
    mLimb(g, side * 48, -470, kx, -250 + Math.abs(k) * 10, 46, 40, MC.skin);
    mLimb(g, kx, -250, side * 58 - k * 10, -40, 40, 30, MC.sock);
    g.fillStyle = MC.boot; g.beginPath(); g.ellipse(side * 66 - k * 10, -18, 52, 22, 0, 0, Math.PI * 2); g.fill();
  }
  mPoly(g, [[-120, -560], [120, -560], [130, -400], [10, -380], [0, -420], [-10, -380], [-130, -400]], MC.shorts);
  g.fillStyle = "#e8e8e8"; g.font = "700 42px Oswald"; g.textAlign = "center"; g.fillText("10", -70, -420);
  // shirt torso
  const torso = () => { g.beginPath(); g.moveTo(-130, -880); g.quadraticCurveTo(0, -900, 130, -880); g.lineTo(122, -560); g.lineTo(-122, -560); g.closePath(); };
  stripes(g, torso, -140, 140, -910, -550, 24);
  g.fillStyle = MC.sky; g.beginPath(); g.moveTo(-34, -890); g.lineTo(0, -846); g.lineTo(34, -890); g.closePath(); g.fill();   // collar
  g.fillStyle = "#e9e9e9"; g.font = "700 50px Oswald"; g.fillText("10", 70, -700);
  // arms
  const arm = (side) => {
    const sx = side * 128, sy = -862;
    let a1, a2;
    if (o.arms === "sky") { a1 = side * .42; a2 = side * .08; }
    else if (o.arms === "hips") { a1 = side * 2.5; a2 = -side * 1.6; }
    else { a1 = side * (2.95 - step * side * .2); a2 = side * -.05; }
    const [ex, ey] = P(sx, sy, a1, 200), [hx, hy] = P(ex, ey, a1 + a2, 180);
    mLimb(g, sx, sy, ex, ey, 34, 28, MC.skin);
    // short stripy sleeve over the upper arm
    const [vx, vy] = P(sx, sy, a1, 90);
    mLimb(g, sx, sy, vx, vy, 44, 36, side < 0 ? MC.white : MC.sky);
    if (side > 0) { const [bx, by] = P(sx, sy, a1, 104); mLimb(g, ...P(sx, sy, a1, 82), bx, by, 33, 32, MC.band); }   // captain's armband
    mLimb(g, ex, ey, hx, hy, 28, 22, MC.skin);
    // hand; in "sky" both index fingers point straight up
    g.fillStyle = MC.skin; g.beginPath(); g.arc(hx, hy, 26, 0, Math.PI * 2); g.fill();
    if (o.arms === "sky") mLimb(g, hx, hy - 10, hx + side * 4, hy - 86, 10, 9, MC.skin);
  };
  arm(-1); arm(1);
  mHead(g, 0, -990, 1, { tilt: o.tilt ?? 0, eyes: o.eyes, frown: o.frown });
  g.restore();
}

/* from behind: MESSI and 10 on the back, hair, a little beard edge at the jaw */
function messiBack(g, x, y, h, o = {}) {
  const s = h / 1000;
  g.save(); g.translate(x, y); g.scale(s, s);
  for (const side of [-1, 1]) {
    mLimb(g, side * 48, -470, side * 52, -250, 46, 40, MC.skinShade);
    mLimb(g, side * 52, -250, side * 58, -40, 40, 30, MC.sock);
    g.fillStyle = MC.boot; g.beginPath(); g.ellipse(side * 60, -18, 50, 22, 0, 0, Math.PI * 2); g.fill();
  }
  mPoly(g, [[-120, -560], [120, -560], [130, -400], [-130, -400]], MC.shorts);
  const torso = () => { g.beginPath(); g.moveTo(-130, -880); g.quadraticCurveTo(0, -900, 130, -880); g.lineTo(122, -560); g.lineTo(-122, -560); g.closePath(); };
  stripes(g, torso, -140, 140, -910, -550);
  g.fillStyle = "#14161a"; g.textAlign = "center"; g.font = "700 46px Oswald"; g.fillText("MESSI", 0, -790);
  g.font = "700 190px Oswald"; g.fillText("10", 0, -610);
  for (const side of [-1, 1]) {
    const sx = side * 128, sy = -862, a1 = side * (2.92 + (o.droop || 0) * .05), [ex, ey] = P(sx, sy, a1, 200), [hx, hy] = P(ex, ey, a1 - side * .05, 180);
    mLimb(g, sx, sy, ex, ey, 34, 28, MC.skinShade); mLimb(g, sx, sy, ...P(sx, sy, a1, 90), 44, 36, side < 0 ? MC.sky : MC.white);
    if (side < 0) mLimb(g, ...P(sx, sy, a1, 82), ...P(sx, sy, a1, 104), 33, 32, MC.band);
    mLimb(g, ex, ey, hx, hy, 28, 22, MC.skinShade);
  }
  g.fillStyle = MC.skinShade; g.fillRect(-26, -950, 52, 70);
  g.save(); g.translate(0, -990 + (o.bow ? 26 : 0));
  g.fillStyle = MC.beard; g.beginPath(); g.ellipse(0, 26, 62, 50, 0, 0, Math.PI); g.fill();      // the beard shows at the jaw line
  g.fillStyle = MC.hair; g.beginPath(); g.ellipse(0, -8, 64, 80, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = MC.skinShade; g.beginPath(); g.ellipse(-64, 8, 12, 20, 0, 0, Math.PI * 2); g.ellipse(64, 8, 12, 20, 0, 0, Math.PI * 2); g.fill();
  g.restore();
  g.restore();
}
