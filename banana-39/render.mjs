// Renders index.html frame by frame in headless Chromium (WebGL via SwiftShader) and encodes with ffmpeg.
//   node render.mjs                    -> out/banana-39.mp4 (+ CRF 17 master.mp4 and a <30 MB preview; muxes out/soundtrack.wav)
//   node render.mjs --workers 4        parallel browsers, each encoding one segment (default 4)
//   node render.mjs --stills 3,12.5    -> out/still-<t>.png
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url)), out = join(here, "out");
mkdirSync(out, { recursive: true });
const FPS = 30;
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };

async function openPage() {
  const browser = await chromium.launch({ args: ["--allow-file-access-from-files", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on("console", m => { if (m.type() === "error") console.error("[page]", m.text()); });
  page.on("pageerror", e => console.error("[pageerror]", e.message));
  await page.goto(pathToFileURL(join(here, "index.html")).href + "?render");
  await page.evaluate(() => window.ready);
  return { browser, page };
}
const grab = (page, t, type) => page.evaluate(([t, type]) => { window.renderFrame(t); return document.getElementById("c").toDataURL(type, 0.95); }, [t, type])
  .then(u => Buffer.from(u.split(",")[1], "base64"));
const run = (args) => new Promise((res, rej) => spawn("ffmpeg", args, { stdio: "inherit" }).on("close", c => c ? rej(new Error("ffmpeg " + c)) : res()));

if (arg("--stills")) {
  const { browser, page } = await openPage();
  for (const t of arg("--stills").split(",").map(Number)) writeFileSync(join(out, `still-${t}.png`), await grab(page, t, "image/png"));
  await browser.close();
  console.log("stills written");
} else {
  const workers = +(arg("--workers") || 4);
  const probe = await openPage();
  const duration = await probe.page.evaluate(() => window.DURATION);
  await probe.browser.close();
  const frames = Math.round(duration * FPS), per = Math.ceil(frames / workers), t0 = Date.now(), segs = [];
  let done = 0;
  await Promise.all(Array.from({ length: workers }, async (_, w) => {
    const from = w * per, to = Math.min(frames, from + per);
    if (from >= to) return;
    const seg = join(out, `seg-${w}.mp4`); segs[w] = seg;
    const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
      "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p", "-profile:v", "high", "-g", "60", seg], { stdio: ["pipe", "inherit", "inherit"] });
    const { browser, page } = await openPage();
    for (let i = from; i < to; i++) {
      const buf = await grab(page, i / FPS, "image/jpeg");
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once("drain", r));
      if (++done % 90 === 0) console.log(`${done}/${frames} frames · ${((Date.now() - t0) / done).toFixed(0)} ms/frame overall`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on("close", r));
    await browser.close();
  }));
  const list = join(out, "segs.txt");
  writeFileSync(list, segs.filter(Boolean).map(s => `file '${s}'`).join("\n"));
  const wav = join(out, "soundtrack.wav");
  const audio = existsSync(wav) ? ["-i", wav, "-c:a", "aac", "-b:a", "256k", "-shortest"] : [];
  const master = join(out, "master.mp4");
  await run(["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, ...audio, "-c:v", "copy", "-movflags", "+faststart", master]);
  segs.forEach(s => s && rmSync(s)); rmSync(list);
  // delivery encodes: grain-aware, size-capped (the CRF 17 master is ~300 MB because of the film grain)
  const enc = (name, rate) => run(["-y", "-loglevel", "error", "-i", master, "-c:v", "libx264", "-preset", "slow", "-tune", "grain", ...rate,
    "-pix_fmt", "yuv420p", "-profile:v", "high", "-c:a", "copy", "-movflags", "+faststart", join(out, name)]);
  await enc("banana-39.mp4", ["-crf", "22", "-maxrate", "7M", "-bufsize", "14M"]);
  await enc("banana-39-preview.mp4", ["-b:v", "3.6M", "-maxrate", "4.5M", "-bufsize", "9M"]);
  console.log(`done in ${((Date.now() - t0) / 1000).toFixed(0)} s -> out/banana-39.mp4 (+ master.mp4, banana-39-preview.mp4)`);
}
