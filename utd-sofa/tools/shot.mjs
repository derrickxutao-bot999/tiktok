import { chromium } from "playwright"; import { writeFileSync } from "node:fs"; import { pathToFileURL } from "node:url";
const [page_, outf, w, h] = process.argv.slice(2);
const b = await chromium.launch({ args: ["--allow-file-access-from-files"] }); const p = await b.newPage({ viewport: { width: +w, height: +h } });
p.on("pageerror", e => console.error(e.message));
await p.goto(pathToFileURL(page_).href + (process.argv[6] || "")); await p.evaluate(() => window.ready); await p.evaluate(() => window.draw());
const u = await p.evaluate(() => document.getElementById("c").toDataURL("image/png")); writeFileSync(outf, Buffer.from(u.split(",")[1], "base64")); await b.close();
