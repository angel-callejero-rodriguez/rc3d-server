// Primeiro passo numa loja nova: tira um screenshot da página e lista as imagens grandes com os seletores à volta,
// para escolher o "target" (a caixa da foto principal) da config.
// Uso (dentro de tools/): node gif/peek.mjs <url-do-produto>  →  out/gif/peek.png
import { chromium } from "playwright";
import fs from "node:fs";
const url = process.argv[2];
const outDir = new URL("../out/gif/", import.meta.url);
fs.mkdirSync(outDir, { recursive: true });
const out = decodeURIComponent(new URL("peek.png", outDir).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const b = await chromium.launch({ args: ["--disable-blink-features=AutomationControlled"] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36", locale: "pt-PT" });
const p = await ctx.newPage();
await p.goto(url, { waitUntil: "networkidle", timeout: 90000 }).catch(() => {});
await p.mouse.move(400, 300); await p.mouse.move(600, 400); await p.waitForTimeout(5000);
await p.screenshot({ path: out });
console.log(await p.evaluate(() => [...document.querySelectorAll("img")].map((i) => ({ i, r: i.getBoundingClientRect() })).filter(({ r }) => r.width > 250 && r.top < 800 && r.bottom > 0).map(({ i, r }) => {
  const chain = []; let e = i; for (let k = 0; k < 5 && e; k++, e = e.parentElement) chain.push(`${e.tagName.toLowerCase()}${e.id ? "#" + e.id : ""}.${(e.className + "").trim().split(/\s+/).slice(0, 2).join(".")}`);
  return `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}  ${chain.join(" < ")}`; }).join("\n")));
console.log(`✔ ${out}`);
await b.close();
