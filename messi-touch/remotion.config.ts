import { Config } from "@remotion/cli/config";
import fs from "node:fs";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setConcurrency(Number(process.env.REMOTION_CONCURRENCY ?? 3));
Config.setChromiumOpenGlRenderer("swangle");

// Cloud containers ship a Playwright Chromium; use it instead of downloading one.
const local = [
  process.env.REMOTION_BROWSER,
  "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell",
].find((p) => p && fs.existsSync(p));
if (local) Config.setBrowserExecutable(local);
