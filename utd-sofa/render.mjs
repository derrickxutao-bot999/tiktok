// node render.mjs <page.html> <out.mp4> [audio.wav] [--stills t1,t2]  (page exposes async renderFrame(t), DURATION)
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const here = dirname(fileURLToPath(import.meta.url)); mkdirSync(join(here, "out"), { recursive: true });
const [pageName, outFile, wav] = process.argv.slice(2).filter(a => !a.startsWith("--") && !/^[\d.,]+$/.test(a));
const si = process.argv.indexOf("--stills"), stills = si > 0 ? process.argv[si + 1].split(",").map(Number) : null;
const browser = await chromium.launch({ args: ["--allow-file-access-from-files"] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on("pageerror", e => console.error("[pageerror]", e.message));
await page.goto(pathToFileURL(join(here, pageName)).href);
await page.evaluate(() => window.ready);
const grab = (t, type) => page.evaluate(async ([t, type]) => { await window.renderFrame(t); return document.getElementById("c").toDataURL(type, .95); }, [t, type])
  .then(u => Buffer.from(u.split(",")[1], "base64"));
if (stills) for (const t of stills) writeFileSync(join(here, "out", `still-${t}.png`), await grab(t, "image/png"));
else {
  const D = await page.evaluate(() => window.DURATION);
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", "30", "-i", "-",
    ...(wav && existsSync(wav) ? ["-i", wav, "-c:a", "aac", "-b:a", "256k", "-shortest"] : []),
    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", outFile], { stdio: ["pipe", "inherit", "inherit"] });
  for (let i = 0; i < D * 30; i++) { if (!ff.stdin.write(await grab(i / 30, "image/jpeg"))) await new Promise(r => ff.stdin.once("drain", r)); }
  ff.stdin.end(); await new Promise(r => ff.on("close", r));
}
await browser.close(); console.log("done");
