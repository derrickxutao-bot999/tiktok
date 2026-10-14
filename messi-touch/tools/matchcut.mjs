// Visual proof of the match cut. Renders Scene 4's cut frame both ways (the
// 39-year-old and the boy, same frame, same camera, same clock) with the
// engine's markers (magenta = toe tip, cyan = ball outline), plus the real
// frames either side of the cut, and assembles comparison sheets in out/matchcut/.
//
//   node tools/matchcut.mjs [--frame 300] [--crop 900x800+120+720]
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const cut = Number(opt("frame", "300"));
const crop = opt("crop", "900x800+120+720");
const out = path.join(root, "out/matchcut");
fs.mkdirSync(out, { recursive: true });

const browserExecutable = [process.env.REMOTION_BROWSER, "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell"].find(
  (p) => p && fs.existsSync(p),
);
const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts"), enableCaching: false });
const browser = await openBrowser("chrome", { browserExecutable });
const still = async (id, frame, inputProps, file) => {
  const composition = await selectComposition({ serveUrl, id, inputProps, puppeteerInstance: browser, browserExecutable });
  const output = path.join(out, file);
  await renderStill({ composition, serveUrl, frame, output, inputProps, puppeteerInstance: browser, browserExecutable, overwrite: true });
  return output;
};

const vet = await still("MatchCutProbe", 0, { frame: cut, variant: "veteran-39", markers: true }, "probe-veteran.png");
const kid = await still("MatchCutProbe", 0, { frame: cut, variant: "rosario-kid", markers: true }, "probe-kid.png");
const before = await still("Scene4", cut - 1, {}, `scene4-${cut - 1}.png`);
const after = await still("Scene4", cut, {}, `scene4-${cut}.png`);
await browser.close({ silent: true });

const im = (...a) => execFileSync("convert", a);
im(vet, "-crop", crop, "+repage", path.join(out, "crop-veteran.png"));
im(kid, "-crop", crop, "+repage", path.join(out, "crop-kid.png"));
im(path.join(out, "crop-veteran.png"), path.join(out, "crop-kid.png"), "+append", path.join(out, "side-by-side.png"));
execFileSync("composite", ["-blend", "50", path.join(out, "crop-kid.png"), path.join(out, "crop-veteran.png"), path.join(out, "onion.png")]);
im(before, after, "+append", "-resize", "50%", path.join(out, "cut.png"));
console.log(`out/matchcut: side-by-side.png onion.png cut.png (frames ${cut - 1} | ${cut})`);
