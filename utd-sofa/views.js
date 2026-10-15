// Camera set-ups for segment 1 v2. Every view draws a full 1080x1920 frame in
// its own world coordinates; the shot applies a camera transform first, and
// everything (including toon figures) is vector, so push-ins stay sharp.

const LIGHT = {
  tv26: { col: "rgba(175,200,255,0.62)", amb: "#3b465f", rim: "rgba(205,222,255,0.55)" },
  tv99: { col: "rgba(185,230,205,0.6)", amb: "#463f45", rim: "rgba(205,240,220,0.5)" },
  lap08: { col: "rgba(190,205,255,0.62)", amb: "#3a4250", rim: "rgba(210,220,255,0.55)" },
  door: { col: "rgba(255,214,160,0.6)", amb: "#3b465f", rim: "rgba(255,222,180,0.7)" },
  dark: { amb: "#2b3346" },
};
const L_ = (base, x, y, r, k = 1) => ({ ...base, x, y, r, amount: k });

// light from a rainy window thrown onto a wall (and whoever is in front of it):
// a skewed pane of cool light with drops and trickles crawling down it
function rainLight(c, x, y, w, h, t, a = 0.18, skew = 0.35, seed = 3) {
  const [S, s] = cv("rainlight"); s.setTransform(c.getTransform());
  s.save(); s.beginPath(); s.moveTo(x, y); s.lineTo(x + w, y + h * skew); s.lineTo(x + w, y + h * (1 + skew)); s.lineTo(x, y + h); s.closePath(); s.clip();
  s.fillStyle = `rgba(160,185,230,${a})`; s.fillRect(x - 10, y - 10, w + 20, h * (1 + skew) + 20);
  // mullions
  s.fillStyle = "rgba(0,0,0,0.5)"; s.fillRect(x + w * 0.48, y - 10, w * 0.05, h * 2);
  s.beginPath(); s.moveTo(x, y + h * 0.42); s.lineTo(x + w, y + h * (0.42 + skew)); s.lineTo(x + w, y + h * (0.46 + skew)); s.lineTo(x, y + h * 0.46); s.fill();
  // drops and runners as soft shadows
  const r = rng(seed); s.fillStyle = "rgba(0,0,0,0.35)"; s.strokeStyle = "rgba(0,0,0,0.28)";
  for (let i = 0; i < 70; i++) { const px = x + r() * w, py = y + r() * h * (1 + skew), d = 2 + r() * 5; s.beginPath(); s.arc(px, py, d, 0, 7); s.fill(); }
  for (let i = 0; i < 9; i++) { const px = x + r() * w, per = 2.5 + r() * 3, off = r() * per, u = ((t + off) % per) / per, py = y + u * h * (1 + skew) * 1.1, d = 4 + r() * 3;
    s.lineWidth = d * 0.6; s.beginPath(); s.moveTo(px, Math.max(y, py - h * 0.4)); s.lineTo(px + Math.sin(u * 9) * 3, py); s.stroke(); s.beginPath(); s.arc(px + Math.sin(u * 9) * 3, py, d, 0, 7); s.fill(); }
  s.restore();
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.filter = "blur(6px)"; c.globalCompositeOperation = "screen"; c.drawImage(S, 0, 0); c.restore();
}

// ---------------------------------------------------------------- 2026 flat
// behind the sofa, toward the TV (the opening angle)
function behind26(c, t, st = {}) {
  const R = room2026(c, { t, ...st });
  const who = st.who === undefined ? "man" : st.who;
  if (who) {
    const P = POSE.seated(who, "back", { head: { tilt: 0 } });
    if (st.bow) P.j.neck[1] -= 0.012 * st.bow;
    if (st.remote) armTo(P, "B", [0.16, 0.52 + 0.06 * st.remote], [0.14 + 0.04 * st.remote, 0.5 + 0.2 * st.remote]);
    const H0 = who === "kid" ? 640 : 920, X0 = who === "kid" ? 420 : 600, Y0 = who === "kid" ? 1890 : 1916;
    toon(c, X0 + (st.dx || 0), Y0 + (st.dy || 0), H0, P, who, R.light ? L_(LIGHT.tv26, R.light.x, R.light.y, 1600) : LIGHT.dark);
  }
  sofaBack(c, 1590, R.light ? {} : { rim: "rgba(150,175,215,0.06)" });
  return R;
}

// the reverse: from the TV, looking at him on the sofa
function reverse26(c, t, st = {}) {
  c.fillStyle = "#161c29"; c.fillRect(-W, -H, 3 * W, 3 * H);
  const tvOn = st.tv !== "off", flick = tvOn ? 0.85 + 0.15 * Math.sin(t * 7.3) * Math.sin(t * 3.1) : 0;
  if (tvOn) glow(c, 560, 1250, 1100, "rgba(150,180,235,0.32)", flick);
  // framed photo on the wall: a small boy on his dad's shoulders
  c.fillStyle = "#2a2a30"; c.fillRect(720, 470, 220, 170); c.fillStyle = "#3c3f4c"; c.fillRect(734, 484, 192, 142);
  c.fillStyle = "#6b6f80"; c.beginPath(); c.arc(830, 560, 20, 0, 7); c.fill(); c.fillRect(812, 578, 36, 48);
  c.fillStyle = "#b8343f"; c.beginPath(); c.arc(830, 522, 13, 0, 7); c.fill(); c.fillRect(818, 532, 24, 22);
  c.fillStyle = "rgba(255,255,255,0.06)"; c.beginPath(); c.moveTo(734, 484); c.lineTo(800, 484); c.lineTo(734, 560); c.fill();
  // rain light from the window on the left
  rainLight(c, -120, 160, 560, 760, t, tvOn ? 0.12 : 0.2, 0.32, 5);
  // sofa: back, arms, cushions
  c.fillStyle = "#262d3b"; rr(c, -260, 1120, W + 520, 520, 70); c.fill();
  c.fillStyle = "#2b3343"; rr(c, 60, 1170, 470, 330, 40); c.fill(); rr(c, 550, 1170, 470, 330, 40); c.fill();
  c.fillStyle = "#212837"; rr(c, -60, 1260, 130, 520, 50); c.fill(); rr(c, W - 70, 1260, 130, 520, 50); c.fill();
  c.fillStyle = "#2e3647"; rr(c, 40, 1500, W - 80, 150, 30); c.fill();
  c.fillStyle = "#1b212d"; c.fillRect(-W, 1650, 3 * W, 2 * H);
  // a red-and-white scarf over the arm
  c.fillStyle = "#8a1622"; c.save(); c.translate(W - 40, 1300); c.rotate(0.15); c.fillRect(-70, 0, 70, 380);
  c.fillStyle = "#cfcfd4"; for (let i = 0; i < 5; i++) c.fillRect(-70, 40 + i * 70, 70, 22); c.restore();
  const who = st.who === undefined ? "man" : st.who;
  const light = tvOn ? L_(LIGHT.tv26, 540, 1700, 1900, flick) : { amb: "#2b3346", col: "rgba(150,170,220,0.25)", x: 0, y: 500, r: 1600 };
  if (who === "man" || who === "both") {
    const P = POSE.seated("man", "front", { expr: st.expr || { eyes: "tired", brows: "sad", mouth: "flat" } });
    if (st.remote) armTo(P, "B", [0.15, 0.5], [0.07, 0.56 + 0.04 * st.remote]);
    P.remote = st.remote ? "B" : null; P.hands = { B: "fist" };
    toon(c, who === "both" ? 650 : 540, 1852, 1250, P, "man", light);
  }
  if (who === "kid" || who === "both") toon(c, who === "both" ? 250 : 540, 1800, 820, POSE.seated("kid", "front", { expr: st.kidExpr || { eyes: "open", mouth: "flat" } }), "kid",
    { ...light, alpha: st.kidAlpha == null ? 1 : st.kidAlpha });
  rainLight(c, -120, 160, 560, 900, t, tvOn ? 0.06 : 0.1, 0.32, 5);   // the same light falls across him
}

// profile: the TV at the left edge, him on the sofa facing it
function profile26(c, t, st = {}) {
  const tvOn = st.tv !== "off";
  c.fillStyle = "#1a2030"; c.fillRect(-W, -H, 3 * W, H + 1450); c.fillStyle = "#121722"; c.fillRect(-W, 1450, 3 * W, 2 * H);
  rainWindow(c, 620, 360, 300, 600, { seed: 9, t });
  rainLight(c, 560, 1000, 380, 420, t, 0.12, -0.1, 11);
  if (tvOn) glow(c, 0, 880, 1300, "rgba(170,195,240,0.38)", 0.9 + 0.1 * Math.sin(t * 6.1));
  c.fillStyle = "#07090d"; c.fillRect(0, 700, 46, 320); c.fillStyle = tvOn ? "rgba(190,210,255,0.8)" : "#0f1218"; c.fillRect(40, 708, 6, 304);
  // sofa in profile (facing left)
  c.fillStyle = "#232a38"; rr(c, 560, 1000, 130, 520, 40); c.fill();       // back rest
  c.fillStyle = "#2a3243"; rr(c, 250, 1350, 440, 150, 30); c.fill();       // seat
  c.fillStyle = "#1e2531"; rr(c, 230, 1240, 110, 280, 30); c.fill();       // arm
  c.fillStyle = "#151a24"; c.fillRect(260, 1500, 420, 60);
  const who = st.who === undefined ? "man" : st.who;
  const light = tvOn ? L_(LIGHT.tv26, 20, 860, 1500, 1) : { amb: "#2b3346", col: "rgba(150,170,220,0.22)", x: 760, y: 600, r: 1200 };
  if (who) {
    const kid = who === "kid", P = st.pose || POSE.seated(who, "side", { face: -1, head: { tilt: st.headTilt || 0 }, expr: st.expr || (kid ? { eyes: "open" } : { eyes: "tired", brows: "sad" }) });
    if (kid) { const sw = Math.sin(t * 4) * 0.03; P.j.anA[0] += sw; P.j.anB[0] -= sw; }
    if (st.remoteHold) { P.j.wrA = [0.15, P.j.elA[1] + 0.08]; P.j.wrB = [0.14, P.j.elB[1] + 0.09]; P.remote = "A"; P.hands = { A: "fist", B: "fist" }; }
    toon(c, (kid ? 520 : 470) + (st.dx || 0), (kid ? 1745 : 1710) + (st.dy || 0), kid ? 760 : 1100, P, who, light);
  }
}

// floor level at the door
function floorDoor(c, t, st = {}) {
  const open = st.open || 0, vx = 540, vy = 760;
  c.fillStyle = "#151a26"; c.fillRect(-W, -H, 3 * W, H + vy);
  // the door
  const dx = 300, dw = 480, dy = 40, dh = vy - dy;
  c.fillStyle = "#222a3a"; c.fillRect(dx - 40, dy - 40, dw + 80, dh + 40);
  if (open > 0) {
    const lg = c.createLinearGradient(0, dy, 0, vy); lg.addColorStop(0, "#f5ddb0"); lg.addColorStop(1, "#d7ae72");
    c.fillStyle = lg; c.fillRect(dx, dy, dw, dh);
    c.fillStyle = "#2c3547"; const lw = dw * (1 - open); c.beginPath(); c.moveTo(dx + dw, dy); c.lineTo(dx + dw - lw, dy - 30 * open); c.lineTo(dx + dw - lw, vy + 40 * open); c.lineTo(dx + dw, vy); c.fill();
  } else { c.fillStyle = "#2c3547"; c.fillRect(dx, dy, dw, dh); c.fillStyle = "#6c7486"; c.beginPath(); c.arc(dx + 50, dy + dh * 0.55, 12, 0, 7); c.fill(); }
  // floor boards in perspective
  c.fillStyle = "#11151e"; c.fillRect(-W, vy, 3 * W, 2 * H);
  c.strokeStyle = "rgba(255,255,255,0.05)"; c.lineWidth = 3;
  for (let i = -12; i <= 12; i++) { c.beginPath(); c.moveTo(vx + i * 40, vy); c.lineTo(vx + i * 400, H); c.stroke(); }
  // light under / through the door
  c.save(); c.globalCompositeOperation = "screen";
  if (open <= 0) { const lg = c.createLinearGradient(0, vy, 0, vy + 220); lg.addColorStop(0, "rgba(246,214,160,0.55)"); lg.addColorStop(1, "rgba(246,214,160,0)");
    c.fillStyle = lg; c.beginPath(); c.moveTo(dx, vy); c.lineTo(dx + dw, vy); c.lineTo(dx + dw + 120, vy + 220); c.lineTo(dx - 120, vy + 220); c.fill(); c.fillStyle = "rgba(255,230,180,0.9)"; c.fillRect(dx, vy - 4, dw, 4); }
  else { const lg = c.createLinearGradient(0, vy, 0, H); lg.addColorStop(0, `rgba(246,214,160,${0.6 * open})`); lg.addColorStop(1, "rgba(246,214,160,0)");
    c.fillStyle = lg; c.beginPath(); c.moveTo(dx, vy); c.lineTo(dx + dw, vy); c.lineTo(dx + dw + 900, H); c.lineTo(dx - 900, H); c.fill(); }
  c.restore();
  // shadows of small feet passing behind the door, before it opens
  if (st.feet && open <= 0) { c.fillStyle = "rgba(0,0,0,0.75)"; for (const k of st.feet) c.fillRect(dx + k * dw, vy - 4, 40, 4); }
  if (st.kid) { const k = st.kid; toon(c, k.x, k.y, k.H, POSE.stand("kid", "front", { phase: k.phase, expr: { eyes: "open", brows: "raised" } }), "kid", L_(LIGHT.door, 540, 300, 1600, 0.8)); }
}

// ---------------------------------------------------------------- inserts
// the hand on the remote (man: one big hand; kid: two small hands)
function remoteInsert(c, t, st = {}) {
  const kid = st.who === "kid", press = st.press || 0;
  c.fillStyle = "#121621"; c.fillRect(-W, -H, 3 * W, 3 * H);
  const tvOn = st.tv !== "off";
  glow(c, 0, 0, 1800, tvOn ? "rgba(160,190,240,0.35)" : "rgba(246,214,160,0.18)");
  c.save(); c.filter = "blur(18px)"; c.fillStyle = "#273044"; rr(c, -100, 1200, W + 200, 900, 80); c.fill(); c.restore();   // sofa, out of focus
  const skin = kid ? "#f0c09c" : "#e2b08e", sk2 = shade(skin, 0.78), sc2 = kid ? 0.78 : 1;
  c.save(); c.translate(560, 1080); c.rotate(-0.42); c.scale(sc2, sc2);
  // remote
  c.fillStyle = "#16181e"; rr(c, -95, -560, 190, 980, 60); c.fill();
  c.fillStyle = "rgba(255,255,255,0.06)"; rr(c, -80, -545, 40, 940, 20); c.fill();
  c.fillStyle = st.led ? "#ff5a4f" : "#8e2a2c"; c.beginPath(); c.arc(0, -470, 28, 0, 7); c.fill();
  c.fillStyle = "#2a2e38"; for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) { rr(c, -62 + i * 46, -360 + j * 70, 36, 40, 10); c.fill(); }
  // fingers wrapped round the back of it
  c.fillStyle = sk2; for (let i = 0; i < 4; i++) { rr(c, 60, -60 + i * 105, 110, 92, 44); c.fill(); }
  c.fillStyle = skin; rr(c, 60, -120, 260, 560, 120); c.fill();          // palm, wrist
  if (kid) { c.fillStyle = skin; rr(c, -330, -40, 260, 300, 110); c.fill(); c.fillStyle = sk2; rr(c, -110, -10, 80, 120, 40); c.fill(); }
  // thumb travelling to the power button
  const tx = 40 - 40 * press, ty = -150 - 300 * press;
  c.fillStyle = skin; c.lineCap = "round"; c.strokeStyle = skin; c.lineWidth = 92; c.beginPath(); c.moveTo(150, 60); c.quadraticCurveTo(80, -60 - 140 * press, tx, ty); c.stroke();
  c.fillStyle = shade(skin, 1.08); c.beginPath(); c.ellipse(tx, ty, 40, 48, -0.3, 0, 7); c.fill();
  c.restore();
  // a sleeve at the edge of frame
  c.fillStyle = "#8f0d22"; c.beginPath(); c.moveTo(W, 1500); c.lineTo(760, 1900); c.lineTo(W, H); c.fill();
  if (kid) { c.beginPath(); c.moveTo(0, 1550); c.lineTo(240, H); c.lineTo(0, H); c.fill(); }
}

// the TV screen, close: black glass with a reflection, or powering on
function tvClose(c, t, st = {}) {
  const x = 40, y = 520, w = 1000, h = 563;
  c.fillStyle = "#0d1018"; c.fillRect(-W, -H, 3 * W, 3 * H);
  if (st.wall !== false) { glow(c, 540, 800, 1200, "rgba(120,140,190,0.12)"); rainLight(c, -200, 0, 700, 1600, t, 0.07, 0.2, 21); }
  c.fillStyle = "#05070b"; rr(c, x - 24, y - 24, w + 48, h + 48, 12); c.fill();
  c.save(); rr(c, x, y, w, h, 4); c.clip();
  c.fillStyle = "#0a0d13"; c.fillRect(x, y, w, h);
  if (st.on != null) { // power on: a bright line opens into the picture
    const u = st.on, lineH = Math.max(3, h * ease(Math.max(0, (u - 0.25) / 0.55)));
    if (u > 0.05) {
      if (st.image) { c.save(); c.beginPath(); c.rect(x, y + h / 2 - lineH / 2, w, lineH); c.clip(); st.image(c, x, y, w, h); c.restore(); }
      c.fillStyle = `rgba(255,255,255,${Math.max(0, 1 - u * 1.6)})`; c.fillRect(x, y + h / 2 - lineH / 2, w, lineH);
      glow(c, x + w / 2, y + h / 2, 700, "rgba(220,235,255,0.5)", Math.max(0, 1 - u));
    }
  }
  if (st.refl) { // reflection of the room in the dead screen
    c.save(); c.globalAlpha = st.reflA || 0.28; c.filter = "blur(2px)"; c.translate(x + w, y); c.scale(-1, 1);
    const sh = W * h / w; c.drawImage(st.refl, 0, st.reflY || 760, W, sh, 0, 0, w, h); c.restore();
  }
  c.fillStyle = "rgba(255,255,255,0.04)"; c.beginPath(); c.moveTo(x, y); c.lineTo(x + w * 0.4, y); c.lineTo(x, y + h * 0.8); c.fill();
  c.restore();
}

// 1999: clock and calendar on the wall (rack focus between them)
function clockCal99(c, t, st = {}) {
  const focus = st.focus || 0;
  c.fillStyle = "#24232c"; c.fillRect(-W, -H, 3 * W, 3 * H);
  glow(c, 540, 1500, 1300, "rgba(160,200,190,0.25)", 0.9 + 0.1 * Math.sin(t * 5));
  c.fillStyle = "rgba(255,255,255,0.025)"; for (let i = 0; i < 14; i++) for (let j = 0; j < 24; j++) { c.beginPath(); c.arc(30 + i * 80 + (j % 2) * 40, 40 + j * 80, 9, 0, 7); c.fill(); }
  const [A, a] = cv("rackA"); a.setTransform(c.getTransform()); clockFace(a, 640, 640, 300, 2, 45 + Math.min(0.9, t / 60), "#2e2d35", "#bdb6a8");
  const [B, b] = cv("rackB"); b.setTransform(c.getTransform());
  const cx0 = 170, cy0 = 980, s2 = 2.0;
  b.save(); b.translate(cx0, cy0); b.scale(s2, s2);
  b.fillStyle = "#3a3438"; b.fillRect(0, 0, 160, 214); b.fillStyle = "#cfc6b8"; b.fillRect(12, 46, 136, 158);
  b.fillStyle = "#8a1d24"; b.fillRect(12, 14, 136, 30);
  b.fillStyle = "#e9dfcf"; b.textAlign = "center"; b.textBaseline = "middle"; b.font = "600 21px NotoSerifSC, serif"; b.fillText("1999年5月", 80, 30);
  b.fillStyle = "#2a2626"; b.font = "700 88px Oswald, sans-serif"; b.fillText("27", 80, 118); b.font = "600 24px NotoSerifSC, serif"; b.fillText("星期四", 80, 182);
  b.restore();
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  c.filter = `blur(${focus * 14}px)`; c.drawImage(A, 0, 0); c.filter = `blur(${(1 - focus) * 14}px)`; c.drawImage(B, 0, 0); c.restore();
}

// ---------------------------------------------------------------- 1999 reverse: Dad and the boy, faces in the CRT light
function reverse99(c, t, st = {}) {
  c.fillStyle = "#211f27"; c.fillRect(-W, -H, 3 * W, 3 * H);
  const flick = 0.85 + 0.15 * Math.sin(t * 6.7) * Math.sin(t * 2.3) + (st.flash || 0);
  glow(c, 540, 1300, 1150, "rgba(160,215,190,0.3)", flick);
  c.fillStyle = "rgba(255,255,255,0.025)"; for (let i = 0; i < 14; i++) for (let j = 0; j < 24; j++) { c.beginPath(); c.arc(30 + i * 80 + (j % 2) * 40, 40 + j * 80, 9, 0, 7); c.fill(); }
  nightWindow(c, 70, 300, 300, 560, { kind: "clear", t, seed: 31, frame: "#2b2a33" });
  // old sofa with a crocheted cover over the back
  c.fillStyle = "#3a2f2a"; rr(c, -260, 1150, W + 520, 520, 60); c.fill();
  c.fillStyle = "rgba(220,214,200,0.22)"; for (const x0 of [150, 600]) { c.fillRect(x0, 1150, 330, 120);
    c.fillStyle = "rgba(0,0,0,0.25)"; for (let i = 0; i < 12; i++) for (let j = 0; j < 4; j++) { c.beginPath(); c.arc(x0 + 14 + i * 27, 1166 + j * 27, 5, 0, 7); c.fill(); } c.fillStyle = "rgba(220,214,200,0.22)"; }
  c.fillStyle = "#43362f"; rr(c, 30, 1510, W - 60, 150, 30); c.fill(); c.fillStyle = "#2a221e"; c.fillRect(-W, 1660, 3 * W, 2 * H);
  const light = L_(LIGHT.tv99, 540, 1650, 1700, flick);
  const goal = st.goal || 0, jump = st.jump || 0;
  // Dad: sitting, then on his feet with his arms up
  let PD = goal > 0 ? armsUp(POSE.stand("dad", "front", { expr: { eyes: "closed", mouth: "shout", brows: "raised" } }), goal)
                    : POSE.seated("dad", "front", { expr: st.dadExpr || { eyes: "open", brows: "neutral", mouth: "flat" } });
  if (goal <= 0 && st.dadArm) armTo(PD, "A", [-0.16, 0.5], [-0.24, 0.5]);
  toon(c, 690, goal > 0 ? 1960 : 1855, 1180, PD, "dad", light);
  // the boy: kneeling up on the sofa, then jumping
  let PK = goal > 0 ? armsUp(POSE.stand("kid", "front", { expr: { eyes: "closed", mouth: "shout", brows: "raised" } }), goal)
                    : POSE.seated("kid", "front", { expr: st.kidExpr || { eyes: "wide", brows: "raised", mouth: "flat" } });
  toon(c, 330, (goal > 0 ? 1800 : 1830) - jump * 120, 760, PK, "kid", light);
  if (st.flash) { c.fillStyle = `rgba(255,255,255,${st.flash * 0.25})`; c.fillRect(-W, -H, 3 * W, 3 * H); }
}

// ---------------------------------------------------------------- 2008 dorm: faces in laptop light
function faces08(c, t, st = {}) {
  c.fillStyle = "#1f2428"; c.fillRect(-W, -H, 3 * W, H + 1050); c.fillStyle = "#1c2c26"; c.fillRect(-W, 1050, 3 * W, 2 * H);
  c.fillStyle = "#2a4236"; c.fillRect(0, 1046, W, 8);
  nightWindow(c, 640, 180, 340, 560, { kind: "wind", t, seed: 41, frame: "#2e333b" });
  // bunk bed ladder, posters
  c.fillStyle = "#30363f"; c.fillRect(60, 0, 18, 1500); c.fillRect(240, 0, 18, 1500); for (let i = 0; i < 8; i++) c.fillRect(60, 120 + i * 140, 198, 12);
  const flick = 0.88 + 0.12 * Math.sin(t * 5.3) + (st.flash || 0);
  glow(c, 540, 1600, 1000, "rgba(170,190,255,0.32)", flick);
  const light = L_(LIGHT.lap08, 540, 1750, 1500, flick);
  const goal = st.goal || 0, jump = st.jump || 0, fade = st.fade || [1, 1];
  const pose = (look, ex) => st.standing ? armsUp(POSE.stand(look, "front", { expr: goal > 0.5 ? { eyes: "closed", mouth: "shout", brows: "raised" } : ex }), goal)
    : goal > 0 ? armsUp(POSE.stand(look, "front", { expr: { eyes: "closed", mouth: "shout", brows: "raised" } }), goal)
    : POSE.seated(look, "front", { expr: ex });
  const lt = a => ({ ...light, alpha: a });
  if (fade[1] > 0) toon(c, 850, (goal > 0 || st.standing ? 2050 : 1980) - jump * 60, 1150, pose("mateB", { eyes: "wide", mouth: "flat", brows: "raised" }), "mateB", lt(fade[1]));
  if (fade[0] > 0) toon(c, 220, (goal > 0 || st.standing ? 2050 : 1990) - jump * 70, 1120, pose("mateA", { eyes: "wide", mouth: "open", brows: "raised" }), "mateA", lt(fade[0]));
  toon(c, 540, (goal > 0 || st.standing ? 2000 : 1950) - jump * 80, 1200, pose("teen", st.teenExpr || { eyes: "wide", mouth: "flat", brows: "raised" }), "teen", light);
  // desk edge and the laptop lid in the foreground, out of focus
  c.save(); c.filter = "blur(10px)"; c.fillStyle = "#2b2622"; c.fillRect(-50, 1700, W + 100, 300); c.fillStyle = "#1a1c22"; rr(c, 250, 1640, 580, 320, 20); c.fill(); c.restore();
  if (st.flash) { c.fillStyle = `rgba(255,255,255,${st.flash * 0.22})`; c.fillRect(-W, -H, 3 * W, 3 * H); }
}

// ---------------------------------------------------------------- from behind, 1999 and 2008
function behind99(c, t, st = {}) {
  const R = room1999(c, { t, ...st }), light = L_(LIGHT.tv99, R.light.x, R.light.y, 1500, 1 + (st.flash || 0));
  const goal = st.goal || 0, jump = st.jump || 0;
  toon(c, 690, 1960, 900, goal > 0 ? armsUp(POSE.stand("dad", "back"), goal) : POSE.seated("dad", "back"), "dad", light);
  toon(c, 380, 1890 - jump * 90, 600, goal > 0 ? armsUp(POSE.stand("kid", "back"), goal) : POSE.seated("kid", "back"), "kid", light);
  sofaBack(c, 1560, { col: "#15141a" });
}
function behind08(c, t, st = {}) {
  const R = room2008(c, { t, ...st }), light = L_(LIGHT.lap08, R.light.x, R.light.y, 1400, 1 + (st.flash || 0));
  toon(c, 860, 1880, 880, POSE.seated("mateB", "back"), "mateB", light);
  toon(c, 250, 1990, 860, POSE.seated("mateA", "back"), "mateA", light);
  toon(c, 560, 2000, 900, POSE.seated("teen", "back"), "teen", light);
  c.fillStyle = "#0f1116"; rr(c, -40, 1600, W + 80, 400, 30); c.fill();
}

// a night sky panorama, 1999 on the left, 2008 on the right (x in 0..3240)
function skyPan(c, t, x) {
  c.save(); c.translate(-x, 0);
  const g1 = c.createLinearGradient(0, 0, 0, H); g1.addColorStop(0, "#08112a"); g1.addColorStop(1, "#1d2c48");
  c.fillStyle = g1; c.fillRect(0, 0, 3240 + W, H);
  const r = rng(5);
  for (let i = 0; i < 900; i++) { const sx = r() * (3240 + W), sy = r() * H * 0.8, a = 0.25 + 0.5 * r();
    c.fillStyle = `rgba(235,240,255,${a})`; c.fillRect(sx, sy, 2 + (r() < 0.1 ? 1 : 0), 2); }
  for (const [mx, my] of [[540, 520], [3240 + 540 - 200, 600]]) { glow(c, mx, my, 700, "rgba(200,215,255,0.3)"); c.fillStyle = "#e8ecf4"; c.beginPath(); c.arc(mx, my, 90, 0, 7); c.fill(); }
  c.filter = "blur(10px)"; c.fillStyle = "rgba(38,50,76,0.85)";
  for (let i = 0; i < 9; i++) { const cx = 2000 + i * 260 + t * 30, cy = 380 + (i % 3) * 230; c.beginPath(); c.ellipse(cx, cy, 300, 60, 0, 0, 7); c.fill(); }
  c.filter = "none";
  c.fillStyle = "#070a12"; c.beginPath(); c.moveTo(0, H);
  for (let i = 0; i <= 40; i++) c.lineTo(i * (3240 + W) / 40, H - 300 - 120 * ((i * 7) % 5) / 5); c.lineTo(3240 + W, H); c.fill();
  c.restore();
}
