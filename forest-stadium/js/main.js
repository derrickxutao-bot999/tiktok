"use strict";
/* main.js — shot list, per-shot colour looks, bilingual subtitles, frame assembly */
const DURATION = 59;
const scene = makeCanvas(W, H), sg = scene.getContext("2d");
const bufB = makeCanvas(W, H), bg = bufB.getContext("2d");
const overlay = makeCanvas(W, H), og = overlay.getContext("2d");

/* ---------- colour looks ---------- */
const LOOKS = {
  candle: look({ exposure: .05, temp: .25, sat: 1.05, contrast: 1.12, pivot: .4, split: .9, shT: [-.02, .03, .06], hiT: [.07, .03, -.04], bloom: .22, hal: .2, thresh: .6, vig: .55, grain: .055, lift: [.01, .015, .02] }),
  night: look({ exposure: .12, temp: .05, sat: 1, contrast: 1.1, pivot: .38, split: 1, shT: [-.03, .02, .07], hiT: [.08, .04, -.03], bloom: .2, hal: .15, thresh: .62, vig: .5, grain: .055, lift: [.012, .02, .03] }),
  cold: look({ exposure: .05, temp: -.6, sat: .2, redKeep: 1, contrast: 1.28, pivot: .42, split: .8, shT: [-.02, .01, .05], hiT: [-.01, .01, .03], bloom: .14, hal: .05, thresh: .7, vig: .62, grain: .065, lift: [.02, .025, .03], gam: [.98, 1, 1.03] }),
  golden: look({ exposure: .1, temp: .55, tint: -.1, sat: 1.12, contrast: 1.06, pivot: .45, split: .9, shT: [-.03, .02, .03], hiT: [.07, .03, -.05], bloom: .26, hal: .3, thresh: .62, vig: .45, grain: .06, lift: [.035, .025, .015] }),
  moon: look({ exposure: .08, temp: -.3, sat: .85, contrast: 1.12, pivot: .38, split: 1, shT: [-.03, .01, .07], hiT: [.03, .03, .02], bloom: .2, hal: .1, thresh: .62, vig: .55, grain: .06, lift: [.01, .02, .035] }),
  flood: look({ exposure: .15, temp: -.08, sat: 1.12, contrast: 1.18, pivot: .42, split: .6, shT: [-.02, .02, .05], hiT: [.03, .03, .02], bloom: .26, hal: .12, thresh: .66, vig: .45, grain: .05 }),
};
const withL = (base, o) => Object.assign({}, base, o);

/* ---------- shots (overlaps are dissolves) ---------- */
const SHOTS = [
  { a: 0.0, b: 5.3, fn: "shotCandle", look: "candle" },
  { a: 4.5, b: 10.1, fn: "shotReveal", look: t => mixLook(LOOKS.night, LOOKS.cold, smooth(prog(t, 8.3, 10.1))) },
  { a: 9.6, b: 11.9, fn: "chapterBlood", look: "cold" },
  { a: 11.5, b: 15.9, fn: "shotQueue", look: "cold" },
  { a: 15.5, b: 20.3, fn: "shotDrops", look: t => withL(LOOKS.cold, { exposure: .05 + 1.4 * easeIn(prog(t, 19.2, 20.2)), flash: .75 * easeIn(prog(t, 19.6, 20.2)) }) },
  { a: 20.0, b: 22.1, fn: "chapterSweat", look: t => withL(LOOKS.golden, { flash: .75 * (1 - easeOut(prog(t, 20.2, 21.0))) }) },
  { a: 21.7, b: 35.3, fn: "shotTerrace", look: "golden" },
  { a: 34.9, b: 37.0, fn: "chapterSong", look: "moon" },
  { a: 36.6, b: 41.7, fn: "shotNight2003", look: "moon" },
  { a: 41.0, b: 47.25, fn: "shotCarols", look: t => mixLook(LOOKS.moon, LOOKS.night, smooth(prog(t, 41, 43.5))) },
  { a: 47.2, b: 52.3, fn: "shotFlood", look: t => withL(LOOKS.flood, { flash: .55 * (1 - easeOut(prog(t, 47.2, 47.9))) }) },
  { a: 51.6, b: 59.0, fn: "shotExterior", look: "night" },
];
const lookOf = (s, t) => typeof s.look === "function" ? s.look(t) : LOOKS[s.look];
function drawShot(s, g, t) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; g.filter = "none";
  const fn = window[s.fn];
  if (typeof fn === "function") fn(g, t, t - s.a); else { g.fillStyle = "#000"; g.fillRect(0, 0, W, H); }
}

/* ---------- subtitles (Chinese + English, ungraded overlay) ---------- */
const CUES = [
  { t0: .7, t1: 4.45, big: 1, zh: ["有一座球场", "是球迷用血和汗守住的"], en: "A stadium its fans kept alive with blood and sweat." },
  { t0: 5.5, t1: 7.65, zh: ["柏林联合的主场", "老林务官球场"], en: "Stadion An der Alten Försterei, home of Union Berlin" },
  { t0: 7.75, t1: 9.75, zh: ["二十多年前", "这家俱乐部差点撑不下去"], en: "Twenty years ago, the club almost went under." },
  { t0: 11.7, t1: 13.7, zh: ["2004年，联合财政告急", "眼看就要拿不到参赛执照"], en: "2004: Union ran out of money and faced losing its licence." },
  { t0: 13.75, t1: 15.75, zh: ["球迷们挽起袖子", "走进了献血站"], en: "So the fans rolled up their sleeves and gave blood." },
  { t0: 15.95, t1: 17.95, zh: ["献血换来的补贴", "他们全部捐给了球队"], en: "Every cent they were paid for it went to the club." },
  { t0: 18.0, t1: 19.85, label: "BLUTEN FÜR UNION", zh: ["这场行动，名叫", "“为联合流血”"], en: "They called it Bleed for Union." },
  { t0: 21.95, t1: 23.95, zh: ["2008年，老看台破败不堪", "翻修要花几百万欧元"], en: "2008: the terraces were crumbling. Repairs would cost millions." },
  { t0: 24.0, t1: 26.0, zh: ["俱乐部拿不出这笔钱", "球迷就自己动手"], en: "The club couldn't pay, so the fans did the work." },
  { t0: 26.3, t1: 28.85, zh: ["2300多名球迷自愿报名", "扛起铁锹，搬砖运土"], en: "More than 2,300 volunteers picked up shovels." },
  { t0: 28.9, t1: 31.55, zh: ["没拿一分钱报酬", "干了整整14万个小时"], en: "Unpaid, they worked 140,000 hours." },
  { t0: 31.8, t1: 34.8, zh: ["2009年夏天，看台焕然一新", "每一级台阶，都出自球迷之手"], en: "Summer 2009: new terraces, every step built by fans." },
  { t0: 36.75, t1: 38.85, zh: ["其实早在2003年冬天", "89个球迷翻过大门，溜进球场"], en: "Back in winter 2003, 89 fans climbed the gates..." },
  { t0: 38.9, t1: 40.95, zh: ["站在空荡荡的看台上", "唱起了圣诞歌"], en: "...stood on the empty terraces and sang carols." },
  { t0: 41.3, t1: 43.75, zh: ["后来，每年12月23日", "来的人越来越多"], en: "Every 23 December since, more have come." },
  { t0: 43.8, t1: 46.95, zh: ["如今，两万八千人", "点起蜡烛，一起唱《平安夜》"], en: "Now 28,500 people light candles and sing Silent Night." },
  { t0: 47.4, t1: 49.5, zh: ["2019年，联合第一次升入德甲"], en: "2019: Union reach the Bundesliga for the first time." },
  { t0: 49.55, t1: 51.6, zh: ["2023年，他们站上了欧冠赛场"], en: "2023: they play in the Champions League." },
  { t0: 52.0, t1: 55.85, zh: ["有的球场，是用钱买来的", "这一座，是球迷亲手建起来的"], en: "Some stadiums are bought. This one was built by its fans." },
];
const CREAM = "246,241,232", GOLD = "222,190,120", INK = "52,26,14", INK2 = "98,52,26";
function textBlock(g, a, blur, fn, shadow = true) {
  if (a <= 0.004) return;
  g.save(); g.textAlign = "center"; if (shadow) { g.shadowColor = "rgba(0,0,0,0.6)"; g.shadowBlur = 18; }
  if (blur > .3) g.filter = `blur(${blur.toFixed(1)}px)`;
  fn(); g.restore();
}
function line(g, str, x, y, font, sp, col, a) { g.font = font; g.letterSpacing = sp + "px"; g.fillStyle = `rgba(${col},${a})`; g.fillText(str, x + sp / 2, y); }
function drawCue(g, c, t) {
  const kin = smooth(prog(t, c.t0, c.t0 + .6)), a = kin * (1 - smooth(prog(t, c.t1 - .4, c.t1)));
  const big = !!c.big, y = big ? 430 : 1372, lh = big ? 94 : 76;
  textBlock(g, a, (1 - kin) * 9, () => {
    if (c.label) line(g, c.label, 540, y - 82, "700 26px Cormorant", 8, GOLD, a);
    c.zh.forEach((s, i) => line(g, s, 540, y + i * lh, big ? "600 68px NotoSerifSC" : "500 54px NotoSerifSC", big ? 6 : 4, CREAM, a));
    line(g, c.en, 540, y + c.zh.length * lh - (big ? 22 : 14), big ? "italic 500 36px Cormorant" : "italic 500 31px Cormorant", 1, CREAM, a * .72);
  });
}
function drawTitles(g, t) {
  // episode title over the reveal
  let k = smooth(prog(t, 5.0, 5.8)), a = k * (1 - smooth(prog(t, 7.3, 7.9)));
  textBlock(g, a, (1 - k) * 10, () => {
    line(g, "足球与城市 · 第二集", 540, 418, "500 26px NotoSerifSC", 10, CREAM, a * .75);
    line(g, "森林里的球场", 540, 530, "600 92px NotoSerifSC", 20, CREAM, a);
    g.fillStyle = `rgba(${GOLD},${a})`; g.fillRect(540 - 90 * k, 566, 180 * k, 2);
    line(g, "STADION AN DER ALTEN FÖRSTEREI · BERLIN", 540, 610, "700 23px Cormorant", 6, CREAM, a * .8);
  });
  // counters: volunteers + hours (time-lapse), voices (carols)
  k = smooth(prog(t, 26.0, 26.6)); a = k * (1 - smooth(prog(t, 31.4, 31.9)));
  textBlock(g, a, (1 - k) * 8, () => {
    const v = Math.round(2300 * easeOut(prog(t, 26.3, 28.6))), h = Math.round(140000 * easeInOut(prog(t, 28.2, 31.2)) / 100) * 100;
    line(g, v.toLocaleString("en-US") + (v >= 2300 ? "+" : ""), 300, 420, "700 78px Playfair", 2, INK, a * .92);
    line(g, h.toLocaleString("en-US"), 780, 420, "700 78px Playfair", 2, INK, a * .92);
    line(g, "名志愿者 · VOLUNTEERS", 300, 470, "500 22px NotoSerifSC", 4, INK2, a);
    line(g, "小时 · HOURS", 780, 470, "500 22px NotoSerifSC", 4, INK2, a);
  }, false);
  k = smooth(prog(t, 41.4, 42.0)); a = k * (1 - smooth(prog(t, 46.6, 47.1)));
  textBlock(g, a, (1 - k) * 8, () => {
    const n = Math.round(lerp(89, 28500, clamp((carolCount(t) - 89) / (STAD.total - 89))));
    line(g, n.toLocaleString("en-US"), 540, 420, "700 84px Playfair", 3, CREAM, a);
    line(g, "人同唱 · VOICES", 540, 472, "500 22px NotoSerifSC", 6, GOLD, a);
  });
  // end card
  k = smooth(prog(t, 56.0, 56.9)); a = k;
  textBlock(g, a, (1 - k) * 10, () => {
    line(g, "血 · 汗 · 歌", 540, 830, "600 66px NotoSerifSC", 26, CREAM, a);
    g.fillStyle = `rgba(${GOLD},${a})`; g.fillRect(540 - 70 * k, 868, 140 * k, 2);
    line(g, "足球与城市 · 第二集", 540, 922, "500 30px NotoSerifSC", 10, CREAM, a * .9);
    line(g, "1. FC UNION BERLIN · EISERN UNION", 540, 968, "700 24px Cormorant", 6, CREAM, a * .75);
  });
}

/* ---------- frame ---------- */
function renderFrame(t) {
  const frame = Math.round(t * FPS), act = SHOTS.filter(s => t >= s.a && t < s.b);
  if (!act.length) act.push(SHOTS[SHOTS.length - 1]);
  let L;
  drawShot(act[0], sg, t);
  if (act.length > 1) {
    const B = act[act.length - 1], k = smooth(prog(t, B.a, act[0].b));
    drawShot(B, bg, t);
    sg.setTransform(1, 0, 0, 1, 0, 0); sg.filter = "none"; sg.globalCompositeOperation = "source-over";
    sg.globalAlpha = k; sg.drawImage(bufB, 0, 0); sg.globalAlpha = 1;
    L = mixLook(lookOf(act[0], t), lookOf(B, t), k);
  } else L = Object.assign({}, lookOf(act[0], t));
  og.setTransform(1, 0, 0, 1, 0, 0); og.clearRect(0, 0, W, H);
  for (const c of CUES) if (t > c.t0 - .05 && t < c.t1 + .05) drawCue(og, c, t);
  drawTitles(og, t);
  L.fade = Math.max(L.fade, 1 - smooth(prog(t, 0, .7)), smooth(prog(t, DURATION - .8, DURATION - .05)));
  Grade.render(scene, overlay, L, frame);
}

window.renderFrame = renderFrame;
window.DURATION = DURATION;
window.ready = document.fonts.ready.then(() => Promise.all([
  "500 54px NotoSerifSC", "600 54px NotoSerifSC", "100px MaShanZheng", "700 30px Cormorant", "500 30px Cormorant", "italic 500 30px Cormorant", "700 30px Playfair",
].map(f => document.fonts.load(f, "血汗歌球场ÖÉ0123")))).then(() => Grade.init(document.getElementById("c")));
if (!location.search.includes("render")) {
  window.ready.then(() => {
    const seek = parseFloat(new URLSearchParams(location.search).get("t"));
    const start = performance.now() - (isNaN(seek) ? 0 : seek * 1000);
    const loop = now => { renderFrame(((now - start) / 1000) % DURATION); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  });
}
