import { Config } from "@remotion/cli/config";
import fs from "node:fs";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setConcurrency(Number(process.env.REMOTION_CONCURRENCY ?? 3));
// The film is pure SVG/CSS; a software GL backend only slows it down (about 8x).
// Opt in for a future WebGL scene with REMOTION_GL=swangle|angle|egl.
if (process.env.REMOTION_GL) Config.setChromiumOpenGlRenderer(process.env.REMOTION_GL as "swangle" | "angle" | "egl");

// Cloud containers ship a Playwright Chromium; use it instead of downloading one.
const local = [
  process.env.REMOTION_BROWSER,
  "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell",
].find((p) => p && fs.existsSync(p));
if (local) Config.setBrowserExecutable(local);
