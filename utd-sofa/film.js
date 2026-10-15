// Segment 1 v2 — "the same sofa". 23 shots, many angles, cinematic transitions.
// Each shot draws into a context with its own camera; transitions render the
// outgoing and incoming shots and blend them (dissolve, flash, whip, push-through).

const G = document.getElementById("c").getContext("2d");
const DURATION = 76;
const ease = u => u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u);
const seg = (t, a, b) => ease((t - a) / (b - a));
const lerp = (a, b, u) => a + (b - a) * u;
const bump = (t, a, d) => { const u = (t - a) / d; return u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u); };
const cam = (c, wx, wy, z, sx = 540, sy = 960) => c.setTransform(z, 0, 0, z, sx - wx * z, sy - wy * z);
function tint(c, era) {
  const T = { 26: ["#2a4a80", 0.28], 99: ["#d39a3a", 0.34], 98: ["#d39a3a", 0.34], "08": ["#2f6f7a", 0.24] }[era];
  if (!T) return;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = "soft-light"; c.globalAlpha = T[1]; c.fillStyle = T[0]; c.fillRect(0, 0, W, H); c.restore();
}

// ---------------------------------------------------------------- the real clip
const N_CLIP = 239, Z0 = 1080 / 500, TVC = [530, 860.5];
const cache = new Map();
function clipFrame(ct) {
  const i = Math.max(0, Math.min(N_CLIP - 1, Math.floor(ct * 25)));
  if (!cache.has(i)) cache.set(i, new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null);
    im.src = `footage/clip/${String(i + 1).padStart(4, "0")}.jpg`; }));
  for (const k of cache.keys()) if (Math.abs(k - i) > 4) cache.delete(k);
  return cache.get(i);
}
const SUBS = [
  [0.15, 3.3, "一直在换、换、换主教练……", "You start changing, changing, changing manager and…"],
  [3.45, 6.3, "但其他方面呢？", "But what about other areas?"],
  [7.85, 9.3, "我不能再多说了。", "I can't say more."],
];
const CLIP2 = 59.2;                       // second airing: clip time = t - CLIP2 (62.5 .. 68.6)
const clipTime = t => t < 9.4 ? t : (t >= 62.5 && t < 68.6 ? t - CLIP2 : null);
const match99 = (c, x, y, w, h, t) => screenContent(c, x, y, w, h, "match1999", { crt: true, t, goal: false });

// ---------------------------------------------------------------- shots
// each: [start, end, draw(c, tl, t) (async ok), out-transition {type, d}]
const S = [];
const shot = (a, b, draw, out = { type: "cut" }) => S.push({ a, b, draw, out });

// 1 — the interview, revealed as his TV
shot(0, 6.0, async (c, tl, t) => {
  const img = await clipFrame(t), z = Z0 + (1.22 - Z0) * seg(tl, 2.2, 6.0), p = (z - 1) / (Z0 - 1);
  c.setTransform(z, 0, 0, z, TVC[0] + (540 - TVC[0]) * p - TVC[0] * z, TVC[1] + (800 - TVC[1]) * p - TVC[1] * z);
  behind26(c, t, { tv: "interview", image: img }); tint(c, 26);
}, { type: "dissolve", d: 0.35 });
// 2 — his face in the TV light
shot(6.0, 8.0, (c, tl, t) => { cam(c, 540, 975, 2.15 + 0.2 * tl / 2, 540, 880); reverse26(c, t, { tv: "on" }); tint(c, 26); });
// 3 — his hand on the remote
shot(8.0, 9.4, (c, tl, t) => { cam(c, 540, 960, 1.0 + 0.05 * tl); remoteInsert(c, t, { who: "man", press: seg(tl, 0.85, 1.3), led: tl > 1.3 }); tint(c, 26); });
// 4 — the screen dies; his reflection in the black glass
shot(9.4, 11.2, async (c, tl, t) => {
  const img = tl < 0.2 ? await clipFrame(9.3) : null;
  const [R, r] = cv("refl"); reverse26(r, t, { tv: "off" });
  cam(c, 540, 801, 1.5 + 0.08 * tl / 1.8);
  tvClose(c, t, { on: tl < 0.2 ? 1 - seg(tl, 0, 0.18) : null, image: img ? (cc, x, y, w, h) => screenContent(cc, x, y, w, h, "interview", { image: img }) : null,
    refl: R, reflA: 0.3 * seg(tl, 0.4, 1.6) }); tint(c, 26);
}, { type: "dissolve", d: 0.5 });
// 5 — profile in the dark; head goes down
shot(11.2, 14.6, (c, tl, t) => { cam(c, 470, 1300, 1.25 + 0.12 * tl / 3.4); profile26(c, t, { tv: "off", headTilt: 0.32 * seg(tl, 0.6, 2.6) }); tint(c, 26); });
// 6a — he gets up
shot(14.6, 15.8, (c, tl, t) => {
  const u = seg(tl, 0.1, 1.0), A = POSE.seated("man", "side", { face: -1, head: { tilt: 0.32 }, expr: { eyes: "tired", brows: "sad" } }),
    B = POSE.stand("man", "side", { face: -1, head: { tilt: 0.12 }, expr: { eyes: "tired", brows: "sad" } }), P = { ...B, j: {} };
  for (const k in B.j) P.j[k] = [lerp(A.j[k][0], B.j[k][0], u), lerp(A.j[k][1], B.j[k][1], u)];
  P.head = { tilt: lerp(0.32, 0.12, u) }; P.seated = u < 0.5;
  cam(c, 470, 1250 - 100 * u, 1.37 - 0.1 * u); profile26(c, t, { tv: "off", pose: P }); tint(c, 26);
});
// 6b — across the room to the door; he looks back once; gone
shot(15.8, 20.2, (c, tl, t) => {
  cam(c, 640, 960, 1.0);
  const door = tl < 3.6 ? 0.85 * seg(tl, 1.6, 2.1) : 0.85 * (1 - seg(tl, 3.6, 4.4));
  const R = room2026(c, { t, tv: "off", door });
  const back = L_({ amb: "#3a4256", col: "rgba(255,214,160,0.28)", rim: "rgba(255,225,180,0.85)" }, 925, 760, 700);
  if (tl < 3.4) {
    let x, y, h, P;
    if (tl < 2.1) { const u = ease(tl / 2.1); x = lerp(760, 925, u); y = lerp(1660, 1240, u); h = lerp(1000, 610, u); P = POSE.stand("man", "back", { phase: tl * 7.5 }); }
    else if (tl < 2.95) { x = 925; y = 1240; h = 610; P = POSE.stand("man", "side", { face: -1, head: { tilt: 0.1 }, expr: { eyes: "tired", brows: "sad" } }); }
    else { const u = ease((tl - 2.95) / 0.45); x = 925; y = lerp(1240, 1226, u); h = lerp(610, 540, u); P = POSE.stand("man", "back", { phase: tl * 7.5 }); }
    toon(c, x, y, h, P, "man", { ...back, alpha: 1 - seg(tl, 3.1, 3.4) });
  }
  sofaBack(c, 1590, { rim: "rgba(150,175,215,0.06)" }); tint(c, 26);
}, { type: "dissolve", d: 0.6 });
// 7 — the empty room
shot(20.2, 22.6, (c, tl, t) => { cam(c, 530, 900, 1.0 + 0.1 * tl / 2.4); behind26(c, t, { tv: "off", who: null, door: 0 }); tint(c, 26); }, { type: "dissolve", d: 0.4 });
// 8 — floor level: shadows under the door, the door opens, a child
shot(22.6, 25.2, (c, tl, t) => {
  cam(c, 540, 960, 1.0 + 0.04 * tl);
  const open = 0.9 * seg(tl, 1.2, 1.8), feet = tl > 0.3 && tl < 1.1 ? [0.2 + 0.4 * (tl - 0.3), 0.32 + 0.4 * (tl - 0.3)] : null;
  const kid = tl > 1.5 ? { x: 540, y: lerp(775, 980, seg(tl, 1.9, 2.6)), H: lerp(560, 900, seg(tl, 1.9, 2.6)), phase: tl > 1.9 ? tl * 9 : null } : null;
  floorDoor(c, t, { open, feet, kid }); tint(c, 26);
});
// 9 — the child in the doorway, then walking in
shot(25.2, 28.0, (c, tl, t) => {
  cam(c, 925, 930, 2.0);
  room2026(c, { t, tv: "off", door: 0.85 });
  const u = seg(tl, 1.3, 2.8), P = POSE.stand("kid", "front", { phase: tl > 1.3 ? tl * 9 : null, expr: { eyes: tl < 1.3 ? "wide" : "open", brows: "raised", mouth: "flat" } });
  toon(c, lerp(925, 860, u), lerp(1238, 1300, u), lerp(380, 470, u), P, "kid", L_({ amb: "#3d4558", col: "rgba(255,214,160,0.3)", rim: "rgba(255,225,180,0.9)" }, 925, 760, 600));
  tint(c, 26);
});
// 10 — he hops onto the sofa, legs dangling, picks up the remote
shot(28.0, 31.0, (c, tl, t) => {
  cam(c, 520, 1450, 1.35);
  profile26(c, t, { tv: "off", who: "kid", dy: -70 * bump(tl, 0, 0.45), remoteHold: tl > 1.5, expr: { eyes: "open", brows: "raised" } }); tint(c, 26);
});
// 11 — a small thumb on the same button (match cut with 3)
shot(31.0, 32.6, (c, tl, t) => { cam(c, 540, 960, 1.0 + 0.05 * tl); remoteInsert(c, t, { who: "kid", tv: "off", press: seg(tl, 0.75, 1.2), led: tl > 1.2 }); tint(c, 26); });
// 12 — the screen comes on with an old broadcast; the camera flies into it
shot(32.6, 34.6, (c, tl, t) => {
  const z = 1.3 + 1.95 * ease((tl - 0.95) / 1.05);
  cam(c, 540, 801, z);
  tvClose(c, t, { on: seg(tl, 0, 0.85), image: (cc, x, y, w, h) => match99(cc, x, y, w, h, t), wall: tl < 1.4 });
  tint(c, tl > 1.4 ? 99 : 26);
});
// 13 — 1999, from behind: out of the CRT, back to the room
shot(34.6, 39.6, (c, tl, t) => {
  const z = 2.95 + (1.0 - 2.95) * seg(tl, 0, 2.6), p = (z - 1) / 1.95;
  c.setTransform(z, 0, 0, z, 510 + (540 - 510) * (1 - p) - 510 * z, 890 + (960 - 890) * (1 - p) - 890 * z);
  behind99(c, t, {}); tint(c, 99);
}, { type: "dissolve", d: 0.5 });
// 14 — the clock and the calendar (focus pull)
shot(39.6, 42.2, (c, tl, t) => { cam(c, 540, 960, 1.04 - 0.04 * tl / 2.6); clockCal99(c, t, { focus: seg(tl, 0.9, 1.7) }); tint(c, 99); }, { type: "dissolve", d: 0.4 });
// 15 — their faces; the winner; Dad on his feet, the boy jumping
shot(42.2, 48.6, (c, tl, t) => {
  const goal = seg(tl, 2.8, 3.15), jump = bump(tl, 2.85, 0.5) + 0.6 * bump(tl, 3.4, 0.45) + 0.4 * bump(tl, 3.9, 0.4);
  const shake = tl > 2.8 && tl < 3.4 ? Math.sin(tl * 90) * 6 * (3.4 - tl) : 0;
  cam(c, 540 + shake, 1250, 1.12 + 0.12 * tl / 6.4);
  reverse99(c, t, { goal, jump, flash: Math.max(0, 1 - (tl - 2.8) / 0.5) * (tl > 2.8 ? 1 : 0), kidExpr: { eyes: "wide", brows: "raised", mouth: tl > 2.2 ? "open" : "flat" } });
  tint(c, 99);
});
// 16 — up to the moon in the window, across the night, down into a dorm window
shot(48.6, 51.2, async (c, tl, t) => {
  const A = cc => { cam(cc, lerp(540, 220, seg(tl, 0, 0.8)), lerp(1250, 580, seg(tl, 0, 0.8)), lerp(1.24, 2.9, seg(tl, 0, 0.85)));
    reverse99(cc, t, { goal: 1, jump: 0 }); tint(cc, 99); };
  const Bk = cc => { cc.setTransform(1, 0, 0, 1, 0, 0); const u = ease((tl - 0.75) / 1.0), x = 2700 * u;
    const v = Math.abs(2700 * (ease((tl - 0.73) / 1.0) - ease((tl - 0.77) / 1.0))) / 0.04 / 60;
    cc.filter = `blur(${Math.min(30, v * 0.6)}px)`; skyPan(cc, t, x); cc.filter = "none"; tint(cc, tl < 1.25 ? 99 : "08"); };
  const Cc = cc => { cam(cc, lerp(810, 540, seg(tl, 1.75, 2.6)), lerp(460, 960, seg(tl, 1.75, 2.6)), lerp(2.9, 1.0, seg(tl, 1.75, 2.6))); faces08(cc, t, {}); tint(cc, "08"); };
  if (tl < 0.75) A(c);
  else if (tl < 0.95) { const [X1, x1] = cv("s16a"); A(x1); const [X2, x2] = cv("s16b"); Bk(x2); c.drawImage(X1, 0, 0); c.globalAlpha = seg(tl, 0.75, 0.95); c.drawImage(X2, 0, 0); c.globalAlpha = 1; }
  else if (tl < 1.65) Bk(c);
  else if (tl < 1.85) { const [X1, x1] = cv("s16a"); Bk(x1); const [X2, x2] = cv("s16b"); Cc(x2); c.drawImage(X1, 0, 0); c.globalAlpha = seg(tl, 1.65, 1.85); c.drawImage(X2, 0, 0); c.globalAlpha = 1; }
  else Cc(c);
});
// 17 — 2008: three faces in laptop light; the save; they jump
shot(51.2, 56.5, (c, tl, t) => {
  const goal = seg(tl, 2.8, 3.15), jump = bump(tl, 2.85, 0.5) + 0.6 * bump(tl, 3.45, 0.45);
  const shake = tl > 2.8 && tl < 3.4 ? Math.sin(tl * 80) * 5 * (3.4 - tl) : 0;
  cam(c, 540 + shake, 1200, 1.1 + 0.1 * tl / 5.3);
  faces08(c, t, { goal, jump, flash: tl > 2.8 ? Math.max(0, 1 - (tl - 2.8) / 0.5) : 0, teenExpr: { eyes: "wide", brows: "raised", mouth: tl > 2.3 ? "open" : "flat" } });
  tint(c, "08");
});
// 18 — the moment holds; the others fade away; closer on him
shot(56.5, 59.5, (c, tl, t) => {
  const z = lerp(1.2, 2.3, seg(tl, 0.3, 3.0));
  cam(c, 540, lerp(1200, 933, seg(tl, 0.3, 3.0)), z, 540, lerp(960, 880, seg(tl, 0.3, 3.0)));
  faces08(c, t, { standing: true, goal: 1 - seg(tl, 0.5, 1.6), fade: [1 - seg(tl, 0.4, 1.4), 1 - seg(tl, 1.0, 2.0)], teenExpr: { eyes: "open", brows: "neutral", mouth: "flat" } });
  tint(c, "08");
});
// 19 — the student's face becomes the man's face
shot(59.5, 62.0, (c, tl, t) => {
  const [X1, x1] = cv("s19a"); cam(x1, 540, 933, 2.3, 540, 880); faces08(x1, t, { standing: true, goal: 0, fade: [0, 0], teenExpr: { eyes: "open", mouth: "flat" } }); tint(x1, "08");
  const [X2, x2] = cv("s19b"); cam(x2, 540, 975, 2.3, 540, 880); reverse26(x2, t, { tv: "on" }); tint(x2, 26);
  c.drawImage(X1, 0, 0); c.globalAlpha = seg(tl, 0.5, 1.9); c.drawImage(X2, 0, 0); c.globalAlpha = 1;
});
// 20 — the man's face again; the same interview
shot(62.0, 66.4, (c, tl, t) => { cam(c, 540, 975, 2.3 + 0.15 * tl / 4.4, 540, 880); reverse26(c, t, { tv: "on" }); tint(c, 26); });
// 21 — from behind: the same picture on the TV
shot(66.4, 67.8, async (c, tl, t) => { const ct = clipTime(t); cam(c, 560, 960, 1.06);
  behind26(c, t, { tv: "interview", image: ct != null ? await clipFrame(ct) : null, remote: seg(tl, 0.6, 1.3) }); tint(c, 26); });
// 22 — his thumb on the button
shot(67.8, 68.6, (c, tl, t) => { cam(c, 540, 960, 1.04 + 0.04 * tl); remoteInsert(c, t, { who: "man", press: seg(tl, 0.3, 0.72), led: tl > 0.72 }); tint(c, 26); });
// 23 — black screen: his reflection, and beside him, faint, the boy
shot(68.6, 76.0, async (c, tl, t) => {
  const img = tl < 0.2 ? await clipFrame(9.3) : null;
  const [R, r] = cv("refl"); reverse26(r, t, { tv: "off", who: "both", kidAlpha: 0.75 * seg(tl, 2.6, 4.6), kidExpr: { eyes: "open", mouth: "flat" } });
  cam(c, 540, 801, 1.5 + 0.35 * seg(tl, 0.5, 7.0), 540, 960);
  tvClose(c, t, { on: tl < 0.2 ? 1 - seg(tl, 0, 0.18) : null, image: img ? (cc, x, y, w, h) => screenContent(cc, x, y, w, h, "interview", { image: img }) : null,
    refl: R, reflA: 0.36 * seg(tl, 0.4, 1.8) }); tint(c, 26);
});

// ---------------------------------------------------------------- render
function subtitle(zh, en, a, y) {
  G.save(); G.globalAlpha = a; G.textAlign = "center"; G.textBaseline = "middle"; G.shadowColor = "rgba(0,0,0,0.85)"; G.shadowBlur = 18;
  G.fillStyle = "#fff"; G.font = "600 58px NotoSerifSC, serif"; G.fillText(zh, 540, y);
  G.fillStyle = "rgba(225,225,230,0.85)"; G.font = "italic 36px Cormorant, serif"; G.fillText(en, 540, y + 72); G.restore();
}
async function drawShot(c, i, t) { const s = S[i]; c.save(); await s.draw(c, t - s.a, t); c.restore(); c.setTransform(1, 0, 0, 1, 0, 0); }
window.renderFrame = async t => {
  G.setTransform(1, 0, 0, 1, 0, 0); G.fillStyle = "#000"; G.fillRect(0, 0, W, H);
  let i = S.findIndex(s => t >= s.a && t < s.b); if (i < 0) i = S.length - 1;
  const s = S[i], nxt = S[i + 1], d = s.out.d || 0;
  if (nxt && s.out.type !== "cut" && t > s.b - d) {          // blend into the next shot
    const u = ease((t - (s.b - d)) / d);
    const [A, a] = cv("trA"); await drawShot(a, i, t);
    const [B, b] = cv("trB"); await drawShot(b, i + 1, t);
    G.drawImage(A, 0, 0); G.globalAlpha = u; G.drawImage(B, 0, 0); G.globalAlpha = 1;
  } else await drawShot(G, i, t);
  grade(G, { seed: 5 + Math.floor(t * 30) % 7 });
  const ct = clipTime(t);
  if (ct != null) {
    const z = t < 6 ? Z0 + (1.22 - Z0) * seg(t, 2.2, 6.0) : 1, p = (z - 1) / (Z0 - 1), y = t < 6 ? 1650 + (1215 - 1650) * p : 1650;
    for (const [a, b, zh, en] of SUBS) if (ct > a - 0.2 && ct < b + 0.2) subtitle(zh, en, Math.min(seg(ct, a - 0.15, a + 0.1), 1 - seg(ct, b - 0.05, b + 0.2)), y);
  }
  if (t < 4.4) { G.globalAlpha = (1 - seg(t, 3.6, 4.4)) * 0.75; G.fillStyle = "#fff"; G.font = "600 26px NotoSerifSC, serif"; G.textAlign = "left"; G.textBaseline = "middle"; G.fillText("画面：Prime Video", 40, 70); G.globalAlpha = 1; }
  if (t > DURATION - 1.2) { G.fillStyle = `rgba(0,0,0,${seg(t, DURATION - 1.2, DURATION)})`; G.fillRect(0, 0, W, H); }
};
window.DURATION = DURATION;
window.SHOTS = S;
window.ready = Promise.all([document.fonts.load("700 40px Oswald", "7"), document.fonts.load("600 40px NotoSerifSC", "一直在换主教练……但其他方面呢？我不能再多说了。画面曼联拜仁切尔西点球年月星期四"),
  document.fonts.load("italic 36px Cormorant", "You"), document.fonts.load("28px VT323", "0")]);
window.draw = () => window.renderFrame(+(new URLSearchParams(location.search).get("t") || 0));
