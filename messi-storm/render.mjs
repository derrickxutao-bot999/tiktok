// node render.mjs [--stills 1,5.2]  -> out/still-<t>.png, or out/messi-storm.mp4 (muxes out/score.wav)
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const here = dirname(fileURLToPath(import.meta.url)), out = join(here, "out"); mkdirSync(out, { recursive: true });
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const browser = await chromium.launch({ args: ["--allow-file-access-from-files"] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on("pageerror", e => console.error("[pageerror]", e.message));
await page.goto(pathToFileURL(join(here, "index.html")).href + "?render");
await page.evaluate(() => window.ready);
const grab = (t, type) => page.evaluate(([t, type]) => { window.renderFrame(t); return document.getElementById("c").toDataURL(type, .95); }, [t, type]).then(u => Buffer.from(u.split(",")[1], "base64"));
if (arg("--stills")) {
  for (const t of arg("--stills").split(",").map(Number)) writeFileSync(join(out, `still-${t}.png`), await grab(t, "image/png"));
} else {
  const D = await page.evaluate(() => window.DURATION), wav = join(out, "score.wav");
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", "30", "-i", "-", ...(existsSync(wav) ? ["-i", wav, "-c:a", "aac", "-b:a", "256k", "-shortest"] : []),
    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", join(out, "messi-storm.mp4")], { stdio: ["pipe", "inherit", "inherit"] });
  for (let i = 0; i < D * 30; i++) { if (!ff.stdin.write(await grab(i / 30, "image/jpeg"))) await new Promise(r => ff.stdin.once("drain", r)); }
  ff.stdin.end(); await new Promise(r => ff.on("close", r));
}
await browser.close(); console.log("done");
