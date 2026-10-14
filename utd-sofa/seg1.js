// Segment 1 — "he switches it off; a child switches it on".
// One camera behind the sofa. 2026 rain -> 1999 (clear night, Dad) ->
// 2008 (windy night, dorm) -> 2026 rain again, the same interview, switched off.

const g = document.getElementById("c").getContext("2d");
const DURATION = 47;
const ease = u => u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u);
const seg = (t, a, b) => ease((t - a) / (b - a));
const lerp = (a, b, u) => a + (b - a) * u;
const bump = (t, a, d) => { const u = (t - a) / d; return u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u); };

// ---------------------------------------------------------------- the real clip
const N_CLIP = 239, Z0 = 1080 / 500, TVC = [530, 860.5];
const SUBS = [ // clip time (s from 2:29.3 of the interview)
  [0.15, 3.3, "一直在换、换、换主教练……", "You start changing, changing, changing manager and…"],
  [3.45, 6.3, "但其他方面呢？", "But what about other areas?"],
  [7.85, 9.3, "我不能再多说了。", "I can't say more."],
];
const cache = new Map();
function clipFrame(ct) {
  const i = Math.max(0, Math.min(N_CLIP - 1, Math.floor(ct * 25)));
  if (!cache.has(i)) cache.set(i, new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null);
    im.src = `footage/clip/${String(i + 1).padStart(4, "0")}.jpg`; }));
  for (const k of cache.keys()) if (Math.abs(k - i) > 4) cache.delete(k);
  return cache.get(i);
}
function subtitle(zh, en, a, y) {
  g.save(); g.globalAlpha = a; g.textAlign = "center"; g.textBaseline = "middle"; g.shadowColor = "rgba(0,0,0,0.85)"; g.shadowBlur = 18;
  g.fillStyle = "#fff"; g.font = "600 58px NotoSerifSC, serif"; g.fillText(zh, 540, y);
  g.fillStyle = "rgba(225,225,230,0.85)"; g.font = "italic 36px Cormorant, serif"; g.fillText(en, 540, y + 72); g.restore();
}
function subtitlesAt(ct, y) {
  for (const [a, b, zh, en] of SUBS) if (ct > a - 0.2 && ct < b + 0.2) subtitle(zh, en, Math.min(seg(ct, a - 0.15, a + 0.1), 1 - seg(ct, b - 0.05, b + 0.2)), y);
}

// ---------------------------------------------------------------- walk cycles (silhouette.js poses)
function walkPose(phase, view) {
  const j = { ...STAND }, sw = Math.sin(phase), bob = 0.008 * Math.abs(Math.cos(phase));
  const liftA = Math.max(0, sw) * 0.06, liftB = Math.max(0, -sw) * 0.06;
  Object.assign(j, {
    knA: [-0.064, 0.285 + liftA * 0.6], knB: [0.066, 0.285 + liftB * 0.6],
    anA: [-0.07, 0.05 + liftA], anB: [0.072, 0.05 + liftB],
    elA: [-0.13, 0.63 + 0.015 * sw], elB: [0.132, 0.63 - 0.015 * sw],
    wrA: [-0.13 + 0.01 * sw, 0.47 + 0.035 * sw], wrB: [0.142 - 0.01 * sw, 0.47 - 0.035 * sw],
  });
  for (const k in j) j[k] = [j[k][0], j[k][1] + bob];
  return { view, bow: view === "back" ? 0.02 : 0, j, lift: { A: liftA * 0.3, B: liftB * 0.3 } };
}

// ---------------------------------------------------------------- people
const ADULT = { x: 600, y: 1395, s: 92, o: { sh: 1.8, hair: "short", number: "7", collar: "rgba(255,255,255,0.12)" } };
const KID = { x: 380, y: 1480, s: 70, o: { sh: 1.4, hair: "kid", number: "7", collar: "rgba(255,255,255,0.14)" } };
const TEEN = { x: 560, y: 1460, s: 86, o: { sh: 1.75, hair: "shaggy", seed: 8, number: "7", collar: "rgba(255,255,255,0.12)" } };
const DAD = { x: 690, y: 1400, s: 94, o: { sh: 1.95, hair: "buzz", vest: "#55565f", skin: "#3a2a28" } };
const MATE_L = { x: 250, y: 1450, s: 80, o: { sh: 1.68, hair: "short", shirt: "#2c3036", shirtHi: "rgba(200,200,220,0.08)", hood: true } };
const MATE_R = { x: 860, y: 1330, s: 88, o: { sh: 1.75, hair: "buzz", shirt: "#1d2236", shirtHi: "rgba(160,170,255,0.08)", headphones: true } };
// one person, rim-lit by the screen (L), then faded as a whole
function lit(c, L, alpha, fn) {
  if (alpha <= 0) return;
  c.save(); c.globalAlpha = Math.min(1, alpha); rimLit(c, fn, L); c.restore();
}
const P = (c, L, who, extra = {}, alpha = 1, dy = 0) => lit(c, L, alpha, cc => bustBack(cc, who.x, who.y + dy, who.s, { ...who.o, ...extra }));
// morph one person into another (position, size; the look cross-fades)
function morph(c, L, A, B, u, extra = {}) {
  const x = lerp(A.x, B.x, u), y = lerp(A.y, B.y, u), s = lerp(A.s, B.s, u), k = ease(u * 1.4 - 0.2);
  lit(c, L, 1 - k, cc => bustBack(cc, x, y, s, { ...A.o, ...extra }));
  lit(c, L, k, cc => bustBack(cc, x, y, s, { ...B.o, ...extra }));
}

// ---------------------------------------------------------------- eras as whole frames
// each returns nothing; draws room + people + sofa into context c
function era2026(c, t, st) {
  const R = room2026(c, { t, ...st });
  if (st.who) st.who(c, R.light);
  sofaBack(c, 1590, st.tv === "off" ? { rim: "rgba(150,175,215,0.06)" } : {});
  return R;
}
function era1999(c, t, st) {
  const R = room1999(c, { t, ...st });
  st.who(c, R.light);
  sofaBack(c, 1560, { col: "#15141a" });
}
function era2008(c, t, st) {
  const R = room2008(c, { t, ...st });
  st.who(c, R.light);
  c.fillStyle = "#0f1116"; rr(c, -40, 1600, W + 80, 400, 30); c.fill();
}
// light wipe: frame B spreads out of the screen over frame A
function wipe(drawA, drawB, u, cx, cy) {
  const [A, a] = cv("frameA"); drawA(a);
  const [B, b] = cv("frameB"); drawB(b);
  g.drawImage(A, 0, 0);
  if (u > 0) {
    const [M, m] = cv("frameM"); m.drawImage(B, 0, 0); m.globalCompositeOperation = "destination-in";
    const r = u * 2300, gr = m.createRadialGradient(cx, cy, Math.max(0, r - 380), cx, cy, r + 1);
    gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    m.fillStyle = u >= 1 ? "#000" : gr; m.fillRect(0, 0, W, H); g.drawImage(M, 0, 0);
    const f = bump(u, 0, 0.7); if (f > 0) glow(g, cx, cy, 500 + 900 * u, "rgba(255,250,235,0.3)", f);
  }
}

// ---------------------------------------------------------------- timeline
const T = {
  off1: 9.4, rise: 12.6, gone: 13.9, doorA: 14.3, doorB: 15.9, doorShut: 16.7,
  kidDoor: 19.3, kidWalk: 20.4, kidSit: 21.9, kidRemote: 22.45, tvOn: 23.0,
  goal99: 26.0, to08: 29.0, goal08: 32.0, alone: 35.0, to26: 36.2, clip2: 37.0, off2: 43.1, end: 47,
};
window.renderFrame = async t => {
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
  let subY = 1650, ct = null;

  if (t < T.kidDoor) { // ---------------- 2026: interview, TV off, he leaves, empty room
    const on = t < T.off1, img = on ? await clipFrame(t) : null;
    const z = Z0 + (1 - Z0) * seg(t, 4.0, 7.6), p = (z - 1) / (Z0 - 1);
    const sx = TVC[0] + (540 - TVC[0]) * p, sy = TVC[1] + (800 - TVC[1]) * p;
    g.setTransform(z, 0, 0, z, sx - TVC[0] * z, sy - TVC[1] * z);
    const door = t < T.doorB ? 0.85 * seg(t, T.doorA, T.doorA + 0.5) : 0.85 * (1 - seg(t, T.doorB, T.doorShut));
    const R = room2026(g, { t, tv: on ? "interview" : "off", image: img, door });
    if (t > T.doorA && t < T.doorB + 0.2) { // his silhouette walking away through the door
      const u = (t - T.doorA) / (T.doorB - T.doorA), fh = lerp(600, 470, u), fa = 1 - seg(t, T.doorB - 0.35, T.doorB + 0.15);
      drawFig(g, 925, lerp(1238, 1222, u), fh, walkPose(t * 7.5, "back"), { ink: "#0a0b0f", headScale: 1.12, number: false, soft: 0.8, alpha: fa });
    }
    if (t < T.gone) { // on the sofa; then he stands and walks off to the right
      const rise = seg(t, T.rise, T.rise + 0.7), away = seg(t, T.rise + 0.6, T.gone);
      const remote = t < 10.6 ? seg(t, 8.5, 9.15) * (1 - seg(t, 10.0, 10.6)) : 0;
      rimLit(g, c => bustBack(c, ADULT.x + 420 * away, ADULT.y - 150 * rise, ADULT.s, { ...ADULT.o, remote, led: t > 9.3 && t < 9.45,
        bow: seg(t, 10.2, 11.8) * (1 - rise) }), R.light);
    }
    sofaBack(g, 1590, on ? {} : { rim: "rgba(150,175,215,0.06)" });
    g.setTransform(1, 0, 0, 1, 0, 0);
    subY = 1650 + (1215 - 1650) * p; if (on) ct = t;
    if (!on) { const a = 1 - seg(t, T.off1, T.off1 + 0.35); if (a > 0) { g.fillStyle = `rgba(200,215,240,${0.12 * a})`; g.fillRect(0, 0, W, H); } }
    const ca = 1 - seg(t, 3.6, 4.4);
    if (ca > 0) { g.globalAlpha = ca * 0.75; g.fillStyle = "#fff"; g.font = "600 26px NotoSerifSC, serif"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText("画面：Prime Video", 40, 70); g.globalAlpha = 1; }

  } else if (t < T.tvOn) { // ---------------- the door opens on a child; he climbs onto the sofa
    const door = 0.85 * seg(t, T.kidDoor, T.kidDoor + 0.5);
    const R = room2026(g, { t, tv: "off", door });
    const walk = (t - T.kidWalk) / (T.kidSit - T.kidWalk);
    if (walk < 1.05) {
      const u = ease(Math.max(0, walk)), fh = lerp(380, 820, u * u), fx = lerp(925, 470, u), fy = lerp(1238, 1990, u * u);
      const pose = walk > 0 ? walkPose(t * 9, "front") : POSES.relaxed;
      const fa = seg(t, T.kidDoor + 0.15, T.kidDoor + 0.45) * (1 - seg(t, T.kidSit - 0.1, T.kidSit + 0.15));
      lit(g, { x: 925, y: 900, r: 1100, col: "rgba(246,214,160,0.55)", col2: "rgba(246,214,160,0.25)", w: 4 }, fa,
        c => drawFig(c, fx, fy, fh, pose, { ink: "#0a0b0f", headScale: 1.5, young: true, soft: 0.8 }));
    }
    if (t > T.kidSit - 0.1) { // climbs up: the head appears over the sofa back
      const up = seg(t, T.kidSit - 0.1, T.kidSit + 0.45), remote = seg(t, T.kidRemote, T.kidRemote + 0.4);
      rimLit(g, c => bustBack(c, KID.x, KID.y + 260 * (1 - up), KID.s, { ...KID.o, remote, led: t > T.tvOn - 0.12 }),
        { x: 925, y: 900, r: 1300, col: "rgba(246,214,160,0.35)", col2: "rgba(246,214,160,0.15)" });
    }
    sofaBack(g, 1590, { rim: "rgba(246,214,160,0.10)" });

  } else if (t < T.to08) { // ---------------- 1999: the light of the TV carries us back
    const st99 = c => {
      const goal = t > T.goal99, age = t - T.goal99, jump = bump(t, T.goal99 + 0.05, 0.55) * 70 + bump(t, T.goal99 + 0.6, 0.45) * 40;
      const up = goal ? seg(t, T.goal99, T.goal99 + 0.25) * (1 - seg(t, T.to08 - 1.2, T.to08 - 0.4) * 0.5) : 0;
      era1999(c, t, { goal, goalAge: age, who: (cc, L) => {
        P(cc, L, DAD, { armsUp: up * 0.9 }, 1, -jump * 0.3);
        P(cc, L, KID, { armsUp: up }, 1, -jump);
        if (up < 0.3) lit(cc, L, 1, c3 => armAcross(c3, 535, 1460, 300, 1515, 94, "#3a2a28"));
      } });
    };
    const kid26 = c => era2026(c, t, { tv: "off", door: 0.85, who: (cc, L) => P(cc, L, KID, { remote: 1 - seg(t, T.tvOn, T.tvOn + 0.6) }) });
    const u = seg(t, T.tvOn, T.tvOn + 0.9);
    if (u < 1) wipe(kid26, st99, u, 510, 890); else st99(g);

  } else if (t < T.to26) { // ---------------- 2008: the dorm, then the others leave
    const st08 = c => {
      const goal = t > T.goal08, age = t - T.goal08, jump = bump(t, T.goal08 + 0.05, 0.55) * 60 + bump(t, T.goal08 + 0.6, 0.45) * 30;
      const up = goal ? seg(t, T.goal08, T.goal08 + 0.25) * (1 - seg(t, T.alone - 1.0, T.alone)) : 0;
      const growth = seg(t, T.to08, T.to08 + 0.9);
      era2008(c, t, { goal, goalAge: age, who: (cc, L) => {
        P(cc, L, MATE_R, { armsUp: up }, growth * (1 - seg(t, T.alone + 0.6, T.alone + 1.2)), -jump * 0.8);
        P(cc, L, MATE_L, { armsUp: up }, growth * (1 - seg(t, T.alone, T.alone + 0.6)), -jump * 0.9);
        if (growth < 1) morph(cc, L, KID, TEEN, growth); else P(cc, L, TEEN, { armsUp: up }, 1, -jump);
      } });
    };
    const kid99 = c => era1999(c, t, { goal: true, goalAge: 5, who: (cc, L) => { P(cc, L, DAD, { armsUp: 0.45 }, 1 - seg(t, T.to08, T.to08 + 0.5)); P(cc, L, KID, { armsUp: 0.5 }); } });
    const u = seg(t, T.to08, T.to08 + 0.8);
    if (u < 1) wipe(kid99, st08, u, 555, 1020); else st08(g);

  } else { // ---------------- 2026 again: the rain, the interview, switched off
    ct = t >= T.clip2 && t < T.off2 ? 3.3 + (t - T.clip2) : null;
    const img = ct != null ? await clipFrame(ct) : null;
    const on = t < T.off2;
    const grow = seg(t, T.to26, T.to26 + 1.0);
    const st26 = c => era2026(c, t, { tv: !on ? "off" : (ct != null ? "interview" : "off"), image: img, who: (cc, L) => {
      const remote = t < T.off2 + 1.2 ? seg(t, T.off2 - 0.9, T.off2 - 0.25) * (1 - seg(t, T.off2 + 0.6, T.off2 + 1.2)) : 0;
      if (grow < 1) morph(cc, L, TEEN, ADULT, grow);
      else P(cc, L, ADULT, { remote, led: t > T.off2 - 0.1 && t < T.off2 + 0.05, bow: seg(t, T.off2 + 0.8, T.off2 + 2.4) });
    } });
    const teen08 = c => era2008(c, t, { goal: true, goalAge: 5, who: (cc, L) => P(cc, L, TEEN) });
    const u = seg(t, T.to26, T.to26 + 0.9);
    if (u < 1) wipe(teen08, st26, u, 530, 860); else st26(g);
    if (!on) { const a = 1 - seg(t, T.off2, T.off2 + 0.35); if (a > 0) { g.fillStyle = `rgba(200,215,240,${0.12 * a})`; g.fillRect(0, 0, W, H); } }
  }

  grade(g, { seed: 5 + Math.floor(t * 30) % 7 });
  if (ct != null) subtitlesAt(ct, subY);
  if (t > T.end - 0.8) { g.fillStyle = `rgba(0,0,0,${seg(t, T.end - 0.8, T.end)})`; g.fillRect(0, 0, W, H); }
};
window.DURATION = DURATION;
window.ready = Promise.all([document.fonts.load("700 40px Oswald", "7"), document.fonts.load("600 40px NotoSerifSC", "一直在换主教练……但其他方面呢？我不能再多说了。画面曼联拜仁切尔西点球年月星期四"),
  document.fonts.load("italic 36px Cormorant", "You"), document.fonts.load("28px VT323", "0")]);
window.draw = () => window.renderFrame(+(new URLSearchParams(location.search).get("t") || 0));
