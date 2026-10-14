// Render chosen frames of a composition to PNG (one bundle, one browser), and
// optionally tile them into a contact sheet.
//
//   node tools/stills.mjs <Composition> <f1,f2,...|a-b:step> [--out out/stills] [--scale 0.5]
//                         [--sheet out/sheet.png] [--cols 4] [--props '{"debug":true}'] [--entry src/index.ts]
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
const [compId, frameSpec] = args;
if (!compId || !frameSpec) {
  console.error("usage: node tools/stills.mjs <Composition> <frames> [--out dir] [--scale s] [--sheet file] [--cols n] [--props json]");
  process.exit(1);
}
const frames = frameSpec.split(",").flatMap((part) => {
  const m = part.match(/^(\d+)-(\d+)(?::(\d+))?$/);
  if (!m) return [Number(part)];
  const out = [];
  for (let f = Number(m[1]); f <= Number(m[2]); f += Number(m[3] ?? 1)) out.push(f);
  return out;
});
const outDir = path.resolve(root, opt("out", "out/stills"));
const scale = Number(opt("scale", "0.5"));
const inputProps = JSON.parse(opt("props", "{}"));
fs.mkdirSync(outDir, { recursive: true });

const browserExecutable = [process.env.REMOTION_BROWSER, "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell"].find(
  (p) => p && fs.existsSync(p),
);
const entryPoint = path.resolve(root, opt("entry", "src/index.ts"));
// No webpack cache: several people (or agents) may bundle at once.
const serveUrl = await bundle({ entryPoint, enableCaching: false });
const browser = await openBrowser("chrome", { browserExecutable });
const composition = await selectComposition({ serveUrl, id: compId, inputProps, puppeteerInstance: browser, browserExecutable });
const files = [];
for (const frame of frames) {
  const output = path.join(outDir, `${compId}-${String(frame).padStart(4, "0")}.png`);
  await renderStill({ composition, serveUrl, frame, output, scale, inputProps, puppeteerInstance: browser, browserExecutable, overwrite: true });
  files.push(output);
  console.log(output);
}
await browser.close({ silent: true });

const sheet = opt("sheet");
if (sheet) {
  const cols = opt("cols", String(Math.min(frames.length, 5)));
  const labelled = files.flatMap((f, i) => ["-label", `${compId} ${frames[i]}`, f]);
  execFileSync("montage", [...labelled, "-tile", `${cols}x`, "-geometry", "+6+6", "-background", "#222", "-fill", "#eee", "-pointsize", "22", path.resolve(root, sheet)]);
  console.log("sheet:", sheet);
}
