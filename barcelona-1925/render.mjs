// Renders index.html frame-by-frame with headless Chromium and encodes it with ffmpeg.
//   node render.mjs                 -> out/barcelona-1925.mp4 (with soundtrack if out/soundtrack.wav exists)
//   node render.mjs --stills 1,6,9  -> out/still-<t>.png for quick checks
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "out");
mkdirSync(out, { recursive: true });
const FPS = 30;
const args = process.argv.slice(2);
const stillsArg = args.includes("--stills") ? args[args.indexOf("--stills") + 1] : null;

const browser = await chromium.launch({
  args: ["--allow-file-access-from-files"],
});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(pathToFileURL(join(here, "index.html")).href + "?render");
await page.evaluate(() => window.fontsReady);

const grab = async t => {
  const url = await page.evaluate(t => { window.renderFrame(t); return document.getElementById("c").toDataURL("image/png"); }, t);
  return Buffer.from(url.split(",")[1], "base64");
};

if (stillsArg) {
  for (const t of stillsArg.split(",").map(Number)) writeFileSync(join(out, `still-${t}.png`), await grab(t));
  console.log("stills written");
} else {
  const duration = await page.evaluate(() => window.DURATION);
  const frames = Math.round(duration * FPS);
  const wav = join(out, "soundtrack.wav");
  const audio = existsSync(wav) ? ["-i", wav] : [];
  const ff = spawn("ffmpeg", [
    "-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-", ...audio,
    "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-profile:v", "high",
    ...(audio.length ? ["-c:a", "aac", "-b:a", "192k", "-shortest"] : []),
    "-movflags", "+faststart", join(out, "barcelona-1925.mp4"),
  ], { stdio: ["pipe", "inherit", "inherit"] });
  for (let i = 0; i < frames; i++) {
    const buf = await grab(i / FPS);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once("drain", r));
    if (i % 60 === 0) process.stdout.write(`frame ${i}/${frames}\n`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on("close", r));
  console.log("done: out/barcelona-1925.mp4");
}
await browser.close();
