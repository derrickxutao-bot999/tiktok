"use strict";
/* main.js — 一根香蕉的39年: shot list, cut-synced transitions, era looks, bilingual subtitles, frame assembly */
const DURATION = 120;
const scene = makeCanvas(W, H), sg = scene.getContext("2d");
const bufA = makeCanvas(W, H), ag = bufA.getContext("2d");
const bufB = makeCanvas(W, H), bg = bufB.getContext("2d");
const tmp = makeCanvas(W, H), xg = tmp.getContext("2d");
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
  // the ending: the same night at Anfield, but warmer and closer
  fans: look({ exposure: .06, temp: .06, sat: 1.0, contrast: 1.1, pivot: .42, split: 1, shT: [-.02, .01, .06], hiT: [.09, .05, -.02], bloom: .32, hal: .22, thresh: .55, vig: .6, grain: .04 }),
};
const withL = (base, o) => Object.assign({}, base, o);
function clubLook(t) {   // the breakdown dims the club, then the build brightens it towards the drop
  const brk = smooth(prog(t, 43.3, 43.7)) * (1 - smooth(prog(t, 44.6, 45.45)));
  return withL(LOOKS.vhsClub, { exposure: -.4 * brk, sat: 1.3 - .4 * brk, contrast: 1.2 - .1 * brk });
}

/* ---------- shots: every cut lands on a downbeat of the score (soundtrack.py) ---------- */
const SHOTS = [
  { a: 0.0, b: 10.4, fn: "shotAnfield", look: "modern" },
  { a: 10.4, b: 12.2, fn: "shotRewind", look: t => mixLook(LOOKS.modern, LOOKS.rewind, smooth(prog(t, 10.4, 10.62))) },
  { a: 12.2, b: 15.8, fn: "shotCity87", look: "vhs" },
  { a: 15.8, b: 19.4, fn: "shotFence", look: "vhs" },
  { a: 19.4, b: 31.0, fn: "shotMaine", look: "vhs" },
  { a: 31.0, b: 35.14, fn: "shotCount", look: "vhsSun" },
  { a: 35.14, b: 39.29, fn: "shotZoo", look: "vhsParty" },
  { a: 39.29, b: 45.5, fn: "shotClub", look: clubLook },
  { a: 45.5, b: 56.375, fn: "shotStoke", look: "vhsParty" },
  { a: 56.375, b: 60.8, fn: "shotFade", look: t => withL(mixLook(LOOKS.vhsParty, LOOKS.dv, smooth(prog(t, 57.0, 57.25))), { tear: t < 57.15 ? 1 : 0, fade: t < 57.1 ? 0 : 1 - smooth(prog(t, 57.25, 57.8)) }) },
  { a: 60.8, b: 64.4, fn: "shotLadder", look: "dv" },
  { a: 64.4, b: 74.4, fn: "shotWembley", look: "broadcast" },
  { a: 74.4, b: 78.4, fn: "shotSkyline", look: "hd" },
  { a: 78.4, b: 84.4, fn: "shotTrophies", look: "hdGold" },
  { a: 84.4, b: 87.4, fn: "shotShoebox", look: "memory" },
  { a: 87.4, b: 95.85, fn: "shotVerdict", look: t => withL(LOOKS.verdict, { fade: 1 - smooth(prog(t, 87.4, 88.0)) }) },
  { a: 95.85, b: 104.6, fn: "shotAnfield2", look: "modern" },
  { a: 104.6, b: 109.6, fn: "shotFans", look: "fans" },
  { a: 109.6, b: 110.85, fn: "shotM87", look: "vhs" },
  { a: 110.85, b: 112.1, fn: "shotM98", look: "dv" },
  { a: 112.1, b: 113.35, fn: "shotM99", look: "broadcast" },
  { a: 113.35, b: 114.6, fn: "shotM23", look: "hdGold" },
  { a: 114.6, b: 120.0, fn: "shotHome", look: t => withL(LOOKS.fans, { exposure: LOOKS.fans.exposure - .22 * smooth(prog(t, 117.4, 118.6)) }) },
];
const lookOf = (s, t) => typeof s.look === "function" ? s.look(t) : LOOKS[s.look];
const shotAt = t => SHOTS.find(s => t >= s.a && t < s.b) || SHOTS[SHOTS.length - 1];
function reset(g) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; g.filter = "none"; }
function drawShot(s, g, t) {
  reset(g); g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
  const fn = window[s.fn];
  if (typeof fn === "function") fn(g, t, t - s.a);
  reset(g);
}

/* ---------- transitions, each motivated by the picture and matched by the score ---------- */
const CUTS = [
  { t: 12.2, type: "vhsLock", pre: 0, post: .42 },                      // PLAY: the tape locks onto 1987
  { t: 15.8, type: "vhsCut", pre: .07, post: .17 },                     // camcorder pause / record
  { t: 19.4, type: "vhsCut", pre: .07, post: .17 },
  { t: 31.0, type: "whip", pre: .2, post: .2, dir: -1 },                // whip pans along the terraces on the groove's downbeats
  { t: 35.14, type: "whip", pre: .2, post: .2, dir: -1 },
  { t: 39.29, type: "zoom", pre: .5, post: .5, pb: [540, 405] },        // into a yellow banana, out of a yellow smiley
  { t: 45.5, type: "flash", pre: .05, post: .45, peak: .95 },          // the strobe drops into Stoke
  { t: 60.8, type: "push", pre: .32, post: .32 },                       // tilt down: City keep falling
  { t: 64.4, type: "wipe", pre: .28, post: .28 },                       // a 1999 TV graphics wipe
  { t: 74.4, type: "flash", pre: .12, post: .55, peak: 1 },             // camera flashes at Wembley
  { t: 78.4, type: "sweep", pre: .35, post: .35 },                      // a gold light sweep
  { t: 84.4, type: "dissolve", pre: .5, post: .5 },                     // gold trophies dissolve into a shoebox
  { t: 95.85, type: "flash", pre: .2, post: .5, peak: .8 },             // floodlights
  { t: 104.6, type: "flare", pre: .3, post: .35 },                      // reverse angle behind two fans
  { t: 109.6, type: "match", post: .2 }, { t: 110.85, type: "match", post: .2 },   // the same fan, 1987 → 2023
  { t: 112.1, type: "match", post: .2 }, { t: 113.35, type: "match", post: .2 },
  { t: 114.6, type: "flare", pre: .3, post: .35 },                      // back to the whole away end
];
const cutLook = (A, B, t, c, w = .05) => mixLook(lookOf(A, t), lookOf(B, t), smooth(prog(t, c.t - w, c.t + w)));
// average N copies of a moving pair of frames: cheap, correct motion blur
function smear(N, place) {
  reset(sg);
  for (let i = 0; i < N; i++) {
    reset(xg); xg.fillStyle = "#000"; xg.fillRect(0, 0, W, H);
    place(xg, N > 1 ? i / (N - 1) - .5 : 0);
    sg.globalAlpha = 1 / (i + 1); sg.drawImage(tmp, 0, 0);
  }
  reset(sg);
}
const TRANS = {
  flash(c, A, B, t) {
    const d = t - c.t, s = d < 0 ? A : B;
    if (d < 0) drawShot(A, sg, t);
    else { drawShot(B, bg, t); const p = 1 + .05 * Math.exp(-d * 9); reset(sg); sg.fillStyle = "#000"; sg.fillRect(0, 0, W, H); sg.setTransform(p, 0, 0, p, 540 * (1 - p), 960 * (1 - p)); sg.drawImage(bufB, 0, 0); reset(sg); }
    const L = Object.assign({}, lookOf(s, t));
    L.flash = Math.max(L.flash, c.peak * (d < 0 ? Math.pow(prog(d, -c.pre, 0), 2) : Math.exp(-d * 8)));
    return L;
  },
  match(c, A, B, t) {
    drawShot(B, sg, t);
    const d = t - c.t, L = Object.assign({}, lookOf(B, t));
    L.flash = Math.max(L.flash, .2 * Math.exp(-d * 16)); L.exposure += .12 * Math.exp(-d * 10);
    return L;
  },
  vhsCut(c, A, B, t) {
    const d = t - c.t, s = d < 0 ? A : B, amp = d < 0 ? prog(d, -c.pre, 0) : Math.exp(-d * 14);
    drawShot(s, bg, t);
    reset(sg); sg.fillStyle = "#000"; sg.fillRect(0, 0, W, H);
    const r = rng(Math.round(t * FPS) * 7 + 3), roll = d >= 0 ? Math.round(H * .05 * amp) : 0;
    for (let y = 0; y < H;) {   // torn horizontal slices and a brief vertical slip, like a camcorder pause
      const h = 6 + Math.floor(r() * 90), off = (r() - .5) * 2 * 170 * amp * (r() < .35 ? 1 : .15);
      sg.drawImage(bufB, 0, y, W, h, off, y + roll, W, h); y += h;
    }
    for (let i = 0; i < 6 * amp; i++) { const y = r() * H, h = 4 + r() * 26; sg.fillStyle = `rgba(${r() < .5 ? 255 : 140},${r() < .5 ? 255 : 210},255,${.28 * amp})`; sg.fillRect(0, y, W, h); }
    const L = Object.assign({}, lookOf(s, t)); L.tear = Math.max(L.tear, amp); L.vhs += .6 * amp; L.exposure += .1 * amp;
    return L;
  },
  vhsLock(c, A, B, t) {
    const k = prog(t, c.t, c.t + c.post), y = Math.round(H * .55 * Math.pow(1 - k, 2) * Math.cos(k * 5.5));
    drawShot(B, bg, t);
    reset(sg); sg.fillStyle = "#000"; sg.fillRect(0, 0, W, H);
    for (const o of [y - H - 46, y, y + H + 46]) sg.drawImage(bufB, 0, o);   // the picture rolls and locks
    sg.fillStyle = "#060606"; sg.fillRect(0, y - 46, W, 46); sg.fillRect(0, y + H, W, 46);
    const L = Object.assign({}, lookOf(B, t)); L.tear = Math.max(L.tear, 1 - k); L.vhs += .5 * (1 - k);
    return L;
  },
  whip(c, A, B, t) {
    const T = c.pre + c.post, k = prog(t, c.t - c.pre, c.t + c.post);
    const e = .5 - .5 * Math.cos(Math.PI * k), v = Math.PI / 2 * Math.sin(Math.PI * k) / T, x0 = c.dir * W * e, blur = v * W / FPS * 1.1;
    drawShot(A, ag, t); drawShot(B, bg, t);
    smear(10, (g, u) => { const x = x0 + c.dir * u * blur; g.drawImage(bufA, x, 0); g.drawImage(bufB, x - c.dir * W, 0); });
    return cutLook(A, B, t, c);
  },
  zoom(c, A, B, t) {
    const S0 = 40, before = t < c.t, k = before ? prog(t, c.t - c.pre, c.t) : prog(t, c.t, c.t + c.post);
    const lnS = Math.log(S0) * (before ? easeIn(k) : 1 - easeOut(k));
    const rate = Math.log(S0) * 3 * (before ? k * k : (1 - k) * (1 - k)) / c.pre;   // d(ln s)/dt
    const P = before ? zooTarget(c.t) : c.pb, src = before ? bufA : bufB;
    drawShot(before ? A : B, before ? ag : bg, t);
    const S = Math.exp(lnS), m = (S - 1) / (S0 - 1), cx = lerp(P[0], 540, m), cy = lerp(P[1], 960, m), blurLn = rate / FPS * .8;
    reset(sg); sg.fillStyle = "#000"; sg.fillRect(0, 0, W, H);
    for (let i = 0; i < 8; i++) {   // zoom blur: average of slightly different scales
      const s = S * Math.exp(blurLn * (i / 7 - .5));
      sg.setTransform(s, 0, 0, s, cx - P[0] * s, cy - P[1] * s); sg.globalAlpha = 1 / (i + 1); sg.drawImage(src, 0, 0);
    }
    reset(sg);
    const L = Object.assign({}, lookOf(before ? A : B, t)); L.flash = Math.max(L.flash, .3 * Math.exp(-Math.abs(t - c.t) * 14));
    return L;
  },
  push(c, A, B, t) {
    const T = c.pre + c.post, k = prog(t, c.t - c.pre, c.t + c.post);
    const e = .5 - .5 * Math.cos(Math.PI * k), v = Math.PI / 2 * Math.sin(Math.PI * k) / T, y0 = -H * e, blur = v * H / FPS * .9;
    drawShot(A, ag, t); drawShot(B, bg, t);
    smear(9, (g, u) => { const y = y0 + u * blur; g.drawImage(bufA, 0, y); g.drawImage(bufB, 0, y + H); });
    return cutLook(A, B, t, c, .12);
  },
  wipe(c, A, B, t) {
    const k = easeInOut(prog(t, c.t - c.pre, c.t + c.post)), slope = .32, band = 120;
    const X = lerp(-slope * H / 2 - 40, W + slope * H / 2 + band + 40, k), ex = y => X + slope * (y - H / 2);
    drawShot(A, sg, t); drawShot(B, bg, t);
    sg.save(); sg.beginPath(); sg.moveTo(-10, -10); sg.lineTo(ex(-10) - band, -10); sg.lineTo(ex(H + 10) - band, H + 10); sg.lineTo(-10, H + 10); sg.closePath(); sg.clip(); sg.drawImage(bufB, 0, 0); sg.restore();
    // the graphic bar riding the edge: sky blue, a white leading stripe, a navy keyline
    const quad = (x0, x1, col) => { sg.fillStyle = col; sg.beginPath(); sg.moveTo(ex(-10) - x0, -10); sg.lineTo(ex(-10) - x1, -10); sg.lineTo(ex(H + 10) - x1, H + 10); sg.lineTo(ex(H + 10) - x0, H + 10); sg.closePath(); sg.fill(); };
    quad(band, 18, "#6cb4e4"); quad(18, 0, "#f4f6f8"); quad(band + 10, band, "#16264a");
    reset(sg);
    return mixLook(lookOf(A, t), lookOf(B, t), k);
  },
  sweep(c, A, B, t) {
    const k = easeInOut(prog(t, c.t - c.pre, c.t + c.post)), X = lerp(-320, W + 320, k);
    drawShot(A, sg, t); drawShot(B, bg, t);
    reset(xg); xg.clearRect(0, 0, W, H); xg.drawImage(bufB, 0, 0);
    const m = xg.createLinearGradient(X - 300, 0, X + 60, 0); m.addColorStop(0, "rgba(0,0,0,1)"); m.addColorStop(1, "rgba(0,0,0,0)");
    xg.globalCompositeOperation = "destination-in"; xg.fillStyle = m; xg.fillRect(0, 0, W, H); reset(xg);
    sg.drawImage(tmp, 0, 0);
    // the light itself
    const a = Math.sin(Math.PI * k), gl = sg.createLinearGradient(X - 170, 0, X + 170, 0);
    gl.addColorStop(0, "rgba(255,200,120,0)"); gl.addColorStop(.5, `rgba(255,214,150,${.55 * a})`); gl.addColorStop(1, "rgba(255,200,120,0)");
    sg.globalCompositeOperation = "lighter"; sg.fillStyle = gl; sg.fillRect(0, 0, W, H); reset(sg);
    for (const y of [520, 1010, 1430]) streak(sg, X, y, 520, .45 * a, "rgba(255,210,150,");
    blit(sg, SPR.glowWarm, X, 960, 900, .35 * a);
    return mixLook(lookOf(A, t), lookOf(B, t), k);
  },
  dissolve(c, A, B, t) {
    const k = smooth(prog(t, c.t - c.pre, c.t + c.post));
    drawShot(A, sg, t); drawShot(B, bg, t);
    sg.globalAlpha = k; sg.drawImage(bufB, 0, 0); reset(sg);
    return mixLook(lookOf(A, t), lookOf(B, t), k);
  },
  flare(c, A, B, t) {
    const d = t - c.t, s = d < 0 ? A : B, k = prog(t, c.t - c.pre, c.t + c.post), a = Math.sin(Math.PI * k);
    drawShot(s, sg, t);
    const x = lerp(-260, W + 260, easeInOut(k)), y = 760;   // an anamorphic flare crosses the lens; the cut hides under its peak
    blit(sg, SPR.glowCool, x, y, 1500, .5 * a); blit(sg, SPR.glowWhite, x, y, 320, .9 * a);
    streak(sg, x, y, 1000, .85 * a); streak(sg, x, y + 5, 640, .5 * a, "rgba(255,220,180,");
    for (const [f, sz, al] of [[.45, 90, .28], [-.3, 170, .2], [-.75, 70, .32]]) blit(sg, SPR.bokehCool, 540 + (x - 540) * f, 960 + (y - 960) * f, sz, al * a, "lighter");
    const L = Object.assign({}, lookOf(s, t)); L.flash = Math.max(L.flash, .32 * Math.exp(-Math.abs(d) * 9));
    return L;
  },
};

/* ---------- subtitles ---------- */
const CUES = [
  { t0: .6, t1: 4.15, zh: ["2026年10月11日，利物浦安菲尔德", "客场看台升起了数百根充气香蕉"], en: "Anfield, 11 October 2026. Hundreds of inflatable bananas rise in the away end." },
  { t0: 4.3, t1: 7.25, zh: ["这是曼城被裁定114项指控成立后", "踢的第一场比赛"], en: "City's first match since 114 charges against them were upheld." },
  { t0: 7.4, t1: 10.3, zh: ["为什么偏偏是香蕉？", "答案要回到39年前"], en: "Why bananas? The answer is 39 years old." },
  { t0: 12.5, t1: 15.7, zh: ["1987年的曼彻斯特，工厂接连关门", "曼城刚刚从顶级联赛降级"], en: "Manchester, 1987: the mills were closing, and City had just been relegated." },
  { t0: 15.9, t1: 19.3, zh: ["英格兰足球也在最灰暗的年代", "看台围着铁丝网，球队被禁欧战"], en: "English football at its darkest: caged terraces, English clubs banned from Europe." },
  { t0: 19.5, t1: 23.3, zh: ["8月15日，曼城主场对普利茅斯", "球迷弗兰克·牛顿扛来一根大香蕉"], en: "15 August, v Plymouth: fan Frank Newton carries in a giant inflatable banana." },
  { t0: 23.45, t1: 26.25, zh: ["这根充气香蕉有1.7米长", "没人知道为什么，大家都笑了"], en: "Five feet six of inflatable fruit. Nobody knew why. Everybody laughed." },
  { t0: 26.4, t1: 30.8, zh: ["到赛季末，球迷把前锋瓦拉迪", "唱成了“伊姆雷·香蕉”"], en: "By season's end, striker Imre Varadi had become 'Imre Banana' in the chants." },
  { t0: 31.15, t1: 34.95, zh: ["最后一个客场，已有约50根香蕉", "下个赛季，鲨鱼、鳄鱼、恐龙也来了"], en: "By the last away game there were about fifty. Next season: sharks, crocodiles, dinosaurs." },
  { t0: 35.3, t1: 39.05, zh: ["香蕉厂商加大了产量", "还有水果公司开始赞助曼城的比赛"], en: "A banana maker stepped up production. A fruit company sponsored City games." },
  { t0: 39.5, t1: 43.25, zh: ["同一时期，曼彻斯特的夜店", "响起了迷幻浩室音乐"], en: "Meanwhile, Manchester's clubs were playing acid house." },
  { t0: 43.45, t1: 45.4, zh: ["一座萧条的城市", "在找自己的快乐"], en: "A city in decline, finding its own joy." },
  { t0: 45.65, t1: 49.5, zh: ["1988年节礼日，客场斯托克城", "一万两千名曼城球迷奇装异服来了"], en: "Boxing Day 1988, away at Stoke: 12,000 City fans in fancy dress." },
  { t0: 49.65, t1: 53.0, zh: ["主队让出了整整两面看台", "球员们也抱着充气玩具出场"], en: "Stoke gave them two whole sides of the ground. The players ran out with inflatables too." },
  { t0: 53.15, t1: 56.3, zh: ["那天曼城输了", "比分没人记得，大家只记得香蕉"], en: "City lost. Nobody remembers the score. Everyone remembers the bananas." },
  { t0: 57.0, t1: 60.7, zh: ["后来，球场改成全座席", "充气玩具渐渐消失，曼城却一路下滑"], en: "Then came all-seater grounds. The inflatables faded; City kept falling." },
  { t0: 60.95, t1: 64.3, zh: ["1998年，曼城跌入第三级别", "这是球队从未到过的最低谷"], en: "1998: down to the third tier, lower than City had ever been." },
  { t0: 64.65, t1: 69.2, zh: ["1999年附加赛决赛，第89分钟", "曼城还0比2落后"], en: "1999 play-off final at Wembley: 89 minutes gone, City 2-0 down." },
  { t0: 69.45, t1: 74.25, zh: ["补时阶段扳平比分", "点球大战，他们赢了"], en: "Level in stoppage time. Then they won on penalties." },
  { t0: 74.55, t1: 78.3, zh: ["2008年，阿布扎比财团收购曼城", "冠军开始一座接一座"], en: "2008: Abu Dhabi buys the club. The trophies start arriving." },
  { t0: 78.55, t1: 84.2, zh: ["2012年，44年来首个顶级联赛冠军", "2023年，三冠王"], en: "2012: first league title in 44 years. 2023: the treble." },
  { t0: 84.6, t1: 87.05, zh: ["香蕉，成了老球迷鞋盒里的回忆"], en: "The bananas went into old fans' shoeboxes." },
  { t0: 87.65, t1: 91.65, zh: ["2026年9月29日，独立委员会认定", "曼城在2009至2018年间违反财务规则"], en: "29 September 2026: an independent commission finds City broke financial rules from 2009 to 2018." },
  { t0: 91.8, t1: 95.7, zh: ["115项指控中，114项成立", "处罚未定，曼城否认违规并已上诉"], en: "114 of 115 charges upheld. Sanctions pending; City deny wrongdoing and have appealed." },
  { t0: 96.05, t1: 100.2, label: "球迷组织 1894", zh: ["于是，香蕉回来了。曼城3比0取胜", "“这群球迷，一直在坐过山车”"], en: "So the bananas came back, and City won 3-0. 1894: 'This fan base has always been on a rollercoaster.'" },
  { t0: 100.35, t1: 104.35, zh: ["主队看台的横幅写着：", "“一代球迷被欺骗了”"], en: "The home end's banner: 'A generation of supporters cheated.'" },
  { t0: 104.85, t1: 109.4, zh: ["账本上的对错，交给裁决", "举起香蕉的球迷，没有做错什么"], en: "Let the verdict judge the accounts. The fans holding bananas did nothing wrong." },
  { t0: 109.75, t1: 112.0, zh: ["跌到第三级别时，他们在"], en: "When City fell to the third tier, they were there." },
  { t0: 112.15, t1: 114.45, zh: ["站上欧洲之巅时，他们也在"], en: "When City stood on top of Europe, they were there too." },
  { t0: 114.8, t1: 121, big: 1, zh: ["香蕉没变", "举香蕉的人，一直都在"], en: "The banana hasn't changed. The people holding it never left." },
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
  let k = smooth(prog(t, 10.55, 11.05)), a = k * (1 - smooth(prog(t, 12.0, 12.45)));
  textBlock(g, a, (1 - k) * 12, () => {
    line(g, "足球与城市 · 第三集", 540, 640, "500 30px NotoSerifSC", 10, CREAM, a * .8);
    line(g, "一根香蕉的39年", 540, 780, "600 100px NotoSerifSC", 12, "255,226,120", a);
    line(g, "1987 — 2026", 540, 870, "600 40px Oswald", 14, CREAM, a * .85);
  });
  // full-time score at Anfield
  a = smooth(prog(t, 96.85, 97.45)) * (1 - smooth(prog(t, 103.9, 104.35)));
  if (a > 0) {
    g.save(); g.globalAlpha = a; g.fillStyle = "rgba(12,16,24,0.85)"; g.fillRect(70, 186, 420, 64); g.fillStyle = "#f4f4f4"; g.font = "600 36px Oswald"; g.textBaseline = "middle";
    g.fillText("LIV  0 - 3  MCI", 92, 219); g.fillStyle = "#f5d33a"; g.fillText("FT", 420, 219); g.restore();
  }
  // end card, on the last chord
  k = smooth(prog(t, 117.75, 118.55)); a = k;
  textBlock(g, a, (1 - k) * 10, () => {
    line(g, "一根香蕉的39年", 540, 1400, "600 62px NotoSerifSC", 10, "255,226,120", a);
    line(g, "足球与城市 · 第三集", 540, 1470, "500 30px NotoSerifSC", 10, CREAM, a * .85);
  });
}

/* ---------- frame ---------- */
function renderFrame(t) {
  const frame = Math.round(t * FPS), c = CUTS.find(c => t >= c.t - (c.pre || 0) && t < c.t + (c.post || 0));
  let L;
  if (c) {
    const A = SHOTS.find(s => Math.abs(s.b - c.t) < 1e-4), B = SHOTS.find(s => Math.abs(s.a - c.t) < 1e-4);
    L = TRANS[c.type](c, A, B, t);
  } else { const s = shotAt(t); drawShot(s, sg, t); L = Object.assign({}, lookOf(s, t)); }
  reset(og); og.clearRect(0, 0, W, H);
  // a soft scrim behind the lower subtitles keeps them legible over busy crowds
  let sa = 0; for (const q of CUES) if (!q.big) sa = Math.max(sa, smooth(prog(t, q.t0 - .2, q.t0 + .3)) * (1 - smooth(prog(t, q.t1 - .1, q.t1 + .4))));
  if (sa > 0) { const gr = og.createLinearGradient(0, 1230, 0, 1600); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(.45, `rgba(0,0,0,${.42 * sa})`); gr.addColorStop(1, "rgba(0,0,0,0)"); og.fillStyle = gr; og.fillRect(0, 1230, W, 370); }
  // and a softer one behind the big closing line at the top
  let ba = 0; for (const q of CUES) if (q.big) ba = Math.max(ba, smooth(prog(t, q.t0 - .2, q.t0 + .4)) * (1 - smooth(prog(t, q.t1 - .1, q.t1 + .4))));
  if (ba > 0) { const gr = og.createLinearGradient(0, 260, 0, 640); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(.5, `rgba(0,0,0,${.4 * ba})`); gr.addColorStop(1, "rgba(0,0,0,0)"); og.fillStyle = gr; og.fillRect(0, 260, W, 380); }
  for (const q of CUES) if (t > q.t0 - .05 && t < q.t1 + .05) drawCue(og, q, t);
  drawTitles(og, t);
  L.fade = Math.max(L.fade, 1 - smooth(prog(t, 0, .5)), smooth(prog(t, DURATION - 1.3, DURATION - .05)));
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
