"use strict";
/* main.js — 一根香蕉的39年: shot list, era looks, bilingual subtitles, frame assembly */
const DURATION = 116;
const scene = makeCanvas(W, H), sg = scene.getContext("2d");
const bufB = makeCanvas(W, H), bg = bufB.getContext("2d");
const overlay = makeCanvas(W, H), og = overlay.getContext("2d");

/* ---------- era looks ---------- */
const VHS = { vhs: 1, tear: .22, exposure: .05, temp: .22, sat: .84, contrast: .92, pivot: .45, lift: [.06, .055, .05], split: .5, shT: [0, .02, .04], hiT: [.05, .02, -.02], bloom: .16, thresh: .7, vig: .5, grain: .035, ca: 1.2 };
const LOOKS = {
  modern: look({ exposure: .1, temp: -.15, sat: 1.06, contrast: 1.15, pivot: .4, split: .9, shT: [-.03, .01, .06], hiT: [.04, .02, -.02], bloom: .24, hal: .1, thresh: .62, vig: .5, grain: .04 }),
  rewind: look({ vhs: 1, tear: 1, sat: 1.2, contrast: 1.1, grain: .05, vig: .55, bloom: .2 }),
  vhs: look(VHS),
  vhsSun: look(Object.assign({}, VHS, { exposure: .12, temp: .32, sat: .96 })),
  vhsParty: look(Object.assign({}, VHS, { sat: 1.12, temp: .15 })),
  vhsClub: look(Object.assign({}, VHS, { tear: .4, sat: 1.3, contrast: 1.2, bloom: .45, thresh: .5, temp: 0 })),
  dv: look({ interl: .4, temp: -.3, sat: .72, contrast: 1.0, lift: [.03, .035, .045], bloom: .12, vig: .5, grain: .04 }),
  broadcast: look({ interl: .8, sat: 1.1, contrast: 1.08, temp: .05, bloom: .15, vig: .35, grain: .03, ca: .8 }),
  hd: look({ exposure: .08, temp: -.1, sat: 1.15, contrast: 1.15, split: 1, shT: [-.03, .01, .07], hiT: [.07, .04, -.03], bloom: .28, hal: .2, thresh: .6, vig: .45, grain: .035 }),
  hdGold: look({ temp: .35, sat: 1.1, contrast: 1.2, bloom: .35, hal: .25, thresh: .55, vig: .6, grain: .035 }),
  memory: look({ temp: .45, sat: .9, contrast: .95, lift: [.04, .03, .02], bloom: .3, hal: .3, thresh: .5, vig: .65, grain: .05 }),
  verdict: look({ temp: -.35, sat: .25, contrast: 1.3, pivot: .4, bloom: .12, vig: .7, grain: .045 }),
  dusk: look({ exposure: .05, temp: -.05, sat: 1.05, contrast: 1.12, split: 1, shT: [-.03, .01, .07], hiT: [.08, .04, -.02], bloom: .3, hal: .2, thresh: .55, vig: .6, grain: .04 }),
};

/* ---------- shots (overlaps are dissolves) ---------- */
const SHOTS = [
  { a: 0.0, b: 10.6, fn: "shotAnfield", look: "modern" },
  { a: 10.4, b: 12.3, fn: "shotRewind", look: "rewind" },
  { a: 12.2, b: 19.6, fn: "shotCity87", look: "vhs" },
  { a: 19.5, b: 31.1, fn: "shotMaine", look: "vhs" },
  { a: 31.0, b: 35.1, fn: "shotCount", look: "vhsSun" },
  { a: 35.0, b: 38.7, fn: "shotZoo", look: "vhsParty" },
  { a: 38.6, b: 42.3, fn: "shotClub", look: "vhsClub" },
  { a: 42.2, b: 56.6, fn: "shotStoke", look: "vhsParty" },
  { a: 56.5, b: 60.5, fn: "shotFade", look: t => withL(mixLook(LOOKS.vhsParty, LOOKS.dv, smooth(prog(t, 57.3, 57.7))), { tear: t < 57.4 ? 1 : 0 }) },
  { a: 60.4, b: 64.6, fn: "shotLadder", look: "dv" },
  { a: 64.5, b: 74.6, fn: "shotWembley", look: "broadcast" },
  { a: 74.5, b: 79.1, fn: "shotSkyline", look: "hd" },
  { a: 79.0, b: 84.6, fn: "shotTrophies", look: "hdGold" },
  { a: 84.5, b: 87.7, fn: "shotShoebox", look: "memory" },
  { a: 87.5, b: 96.1, fn: "shotVerdict", look: "verdict" },
  { a: 96.0, b: 104.7, fn: "shotAnfield2", look: "modern" },
  { a: 104.5, b: 116.0, fn: "shotRise", look: "dusk" },
];
function shotStokeWrap(g, t, lt) { shotStoke(g, t, lt - 3.3); }
SHOTS.find(s => s.fn === "shotStoke").fn = "shotStokeWrap";
const withL = (base, o) => Object.assign({}, base, o);
const lookOf = (s, t) => typeof s.look === "function" ? s.look(t) : LOOKS[s.look];
function drawShot(s, g, t) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; g.filter = "none";
  g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
  const fn = window[s.fn];
  if (typeof fn === "function") fn(g, t, t - s.a);
}

/* ---------- subtitles ---------- */
const CUES = [
  { t0: .6, t1: 4.15, zh: ["2026年10月11日，利物浦安菲尔德", "客场看台升起了数百根充气香蕉"], en: "Anfield, 11 October 2026. Hundreds of inflatable bananas rise in the away end." },
  { t0: 4.25, t1: 7.35, zh: ["这是曼城被裁定114项指控成立后", "踢的第一场比赛"], en: "City's first match since 114 charges against them were upheld." },
  { t0: 7.45, t1: 10.3, zh: ["为什么偏偏是香蕉？", "答案要回到39年前"], en: "Why bananas? The answer is 39 years old." },
  { t0: 12.6, t1: 15.85, zh: ["1987年的曼彻斯特，工厂接连关门", "曼城刚刚从顶级联赛降级"], en: "Manchester, 1987: the mills were closing, and City had just been relegated." },
  { t0: 15.95, t1: 19.4, zh: ["英格兰足球也在最灰暗的年代", "看台围着铁丝网，球队被禁欧战"], en: "English football at its darkest: caged terraces, English clubs banned from Europe." },
  { t0: 19.6, t1: 23.4, zh: ["8月15日，曼城主场对普利茅斯", "球迷弗兰克·牛顿扛来一根大香蕉"], en: "15 August, v Plymouth: fan Frank Newton carries in a giant inflatable banana." },
  { t0: 23.5, t1: 26.6, zh: ["这根充气香蕉有1.7米长", "没人知道为什么，大家都笑了"], en: "Five feet six of inflatable fruit. Nobody knew why. Everybody laughed." },
  { t0: 26.7, t1: 30.9, zh: ["到赛季末，球迷把前锋瓦拉迪", "唱成了“伊姆雷·香蕉”"], en: "By season's end, striker Imre Varadi had become 'Imre Banana' in the chants." },
  { t0: 31.1, t1: 34.9, zh: ["最后一个客场，已有约50根香蕉", "下个赛季，鲨鱼、鳄鱼、恐龙也来了"], en: "By the last away game there were about fifty. Next season: sharks, crocodiles, dinosaurs." },
  { t0: 35.0, t1: 38.55, zh: ["香蕉厂商加大了产量", "还有水果公司开始赞助曼城的比赛"], en: "A banana maker stepped up production. A fruit company sponsored City games." },
  { t0: 38.65, t1: 42.15, zh: ["同一时期，曼彻斯特的夜店", "响起了迷幻浩室音乐"], en: "Meanwhile, Manchester's clubs were playing acid house." },
  { t0: 42.3, t1: 45.45, zh: ["一座萧条的城市", "在找自己的快乐"], en: "A city in decline, finding its own joy." },
  { t0: 45.6, t1: 49.6, zh: ["1988年节礼日，客场斯托克城", "一万两千名曼城球迷奇装异服来了"], en: "Boxing Day 1988, away at Stoke: 12,000 City fans in fancy dress." },
  { t0: 49.7, t1: 53.0, zh: ["主队让出了整整两面看台", "球员们也抱着充气玩具出场"], en: "Stoke gave them two whole sides of the ground. The players ran out with inflatables too." },
  { t0: 53.1, t1: 56.4, zh: ["那天曼城输了", "比分没人记得，大家只记得香蕉"], en: "City lost. Nobody remembers the score. Everyone remembers the bananas." },
  { t0: 56.7, t1: 60.4, zh: ["后来，球场改成全座席", "充气玩具渐渐消失，曼城却一路下滑"], en: "Then came all-seater grounds. The inflatables faded; City kept falling." },
  { t0: 60.5, t1: 64.4, zh: ["1998年，曼城跌入第三级别联赛", "这是球队从未到过的最低谷"], en: "1998: down to the third tier, lower than City had ever been." },
  { t0: 64.6, t1: 68.9, zh: ["1999年附加赛决赛，第89分钟", "曼城还0比2落后"], en: "1999 play-off final at Wembley: 89 minutes gone, City 2-0 down." },
  { t0: 69.0, t1: 74.4, zh: ["补时阶段扳平比分", "点球大战，他们赢了"], en: "Level in stoppage time. Then they won on penalties." },
  { t0: 74.6, t1: 78.9, zh: ["2008年，阿布扎比财团收购曼城", "冠军开始一座接一座"], en: "2008: Abu Dhabi buys the club. The trophies start arriving." },
  { t0: 79.0, t1: 84.4, zh: ["2012年，44年来首个顶级联赛冠军", "2023年，三冠王"], en: "2012: first league title in 44 years. 2023: the treble." },
  { t0: 84.6, t1: 87.5, zh: ["香蕉，成了老球迷鞋盒里的回忆"], en: "The bananas went into old fans' shoeboxes." },
  { t0: 87.7, t1: 91.8, zh: ["2026年9月29日，独立委员会认定", "曼城在2009至2018年间违反财务规则"], en: "29 September 2026: an independent commission finds City broke financial rules from 2009 to 2018." },
  { t0: 91.9, t1: 95.95, zh: ["115项指控中，114项成立", "处罚未定，曼城否认违规并已上诉"], en: "114 of 115 charges upheld. Sanctions pending; City deny wrongdoing and have appealed." },
  { t0: 96.2, t1: 100.3, label: "球迷组织 1894", zh: ["于是，香蕉回来了。曼城3比0取胜", "“这群球迷，一直在坐过山车”"], en: "So the bananas came back, and City won 3-0. 1894: 'This fan base has always been on a rollercoaster.'" },
  { t0: 100.4, t1: 104.4, zh: ["主队看台的横幅写着：", "“一代球迷被欺骗了”"], en: "The home end's banner: 'A generation of supporters cheated.'" },
  { t0: 104.7, t1: 109.4, zh: ["39年前，它是穷日子里的一个玩笑", "今天，有人说是忠诚，有人说是挡箭牌"], en: "39 years ago it was a joke for hard times. Today some call it loyalty; others call it a shield." },
  { t0: 109.6, t1: 113.5, big: 1, zh: ["香蕉没变", "变的是什么？"], en: "The banana hasn't changed. So what has?" },
];
const CREAM = "246,241,232", GOLD = "236,200,96";
const isCJK = s => /[㐀-鿿]/.test(s);
function textBlock(g, a, blur, fn) {
  if (a <= 0.004) return;
  g.save(); g.textAlign = "center"; g.shadowColor = "rgba(0,0,0,0.65)"; g.shadowBlur = 18;
  if (blur > .3) g.filter = `blur(${blur.toFixed(1)}px)`;
  fn(); g.restore();
}
function line(g, str, x, y, font, sp, col, a) { g.font = font; g.letterSpacing = sp + "px"; g.fillStyle = `rgba(${col},${a})`; g.fillText(str, x + sp / 2, y); }
function drawCue(g, c, t) {
  const kin = smooth(prog(t, c.t0, c.t0 + .5)), a = kin * (1 - smooth(prog(t, c.t1 - .35, c.t1)));
  const big = !!c.big, y = big ? 430 : 1372, lh = big ? 96 : 76;
  textBlock(g, a, (1 - kin) * 9, () => {
    if (c.label) line(g, c.label, 540, y - 80, isCJK(c.label) ? "500 28px NotoSerifSC" : "700 26px Cormorant", 6, GOLD, a);
    c.zh.forEach((s, i) => line(g, s, 540, y + i * lh, big ? "600 76px NotoSerifSC" : "500 54px NotoSerifSC", big ? 8 : 3, CREAM, a));
    line(g, c.en, 540, y + c.zh.length * lh - (big ? 22 : 14), big ? "italic 500 36px Cormorant" : "italic 500 30px Cormorant", 1, CREAM, a * .72);
  });
}
function drawTitles(g, t) {
  // title over the rewind
  let k = smooth(prog(t, 10.5, 11.0)), a = k * (1 - smooth(prog(t, 12.0, 12.4)));
  textBlock(g, a, (1 - k) * 12, () => {
    line(g, "足球与城市 · 第三集", 540, 640, "500 30px NotoSerifSC", 10, CREAM, a * .8);
    line(g, "一根香蕉的39年", 540, 780, "600 100px NotoSerifSC", 12, "255,226,120", a);
    line(g, "1987 — 2026", 540, 870, "600 40px Oswald", 14, CREAM, a * .85);
  });
  // full-time score at Anfield
  a = smooth(prog(t, 97.0, 97.6)) * (1 - smooth(prog(t, 104.2, 104.6)));
  if (a > 0) {
    g.save(); g.globalAlpha = a; g.fillStyle = "rgba(12,16,24,0.85)"; g.fillRect(70, 186, 420, 64); g.fillStyle = "#f4f4f4"; g.font = "600 36px Oswald"; g.textBaseline = "middle";
    g.fillText("LIV  0 - 3  MCI", 92, 219); g.fillStyle = "#f5d33a"; g.fillText("FT", 420, 219); g.restore();
  }
  // end card
  k = smooth(prog(t, 113.4, 114.2)); a = k;
  textBlock(g, a, (1 - k) * 10, () => {
    line(g, "一根香蕉的39年", 540, 1390, "600 62px NotoSerifSC", 10, "255,226,120", a);
    line(g, "足球与城市 · 第三集", 540, 1460, "500 30px NotoSerifSC", 10, CREAM, a * .85);
    line(g, "你怎么看？评论区见", 540, 1520, "500 30px NotoSerifSC", 6, CREAM, a * .7);
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
  // a soft scrim behind the lower subtitles keeps them legible over busy crowds
  let sa = 0; for (const c of CUES) if (!c.big) sa = Math.max(sa, smooth(prog(t, c.t0 - .2, c.t0 + .3)) * (1 - smooth(prog(t, c.t1 - .1, c.t1 + .4))));
  if (sa > 0) { const gr = og.createLinearGradient(0, 1230, 0, 1600); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(.45, `rgba(0,0,0,${.42 * sa})`); gr.addColorStop(1, "rgba(0,0,0,0)"); og.fillStyle = gr; og.fillRect(0, 1230, W, 370); }
  for (const c of CUES) if (t > c.t0 - .05 && t < c.t1 + .05) drawCue(og, c, t);
  drawTitles(og, t);
  L.fade = Math.max(L.fade, 1 - smooth(prog(t, 0, .5)), smooth(prog(t, DURATION - .7, DURATION - .05)));
  Grade.render(scene, overlay, L, frame);
}

window.renderFrame = renderFrame;
window.DURATION = DURATION;
window.ready = document.fonts.ready.then(() => Promise.all([
  "500 54px NotoSerifSC", "600 54px NotoSerifSC", "700 30px Cormorant", "500 30px Cormorant", "italic 500 30px Cormorant", "700 30px Playfair", "60px VT323", "600 30px Oswald",
].map(f => document.fonts.load(f, "香蕉曼城ÖÉ0123◀★")))).then(() => Grade.init(document.getElementById("c")));
if (!location.search.includes("render")) {
  window.ready.then(() => {
    const seek = parseFloat(new URLSearchParams(location.search).get("t"));
    const start = performance.now() - (isNaN(seek) ? 0 : seek * 1000);
    const loop = now => { renderFrame(((now - start) / 1000) % DURATION); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  });
}
