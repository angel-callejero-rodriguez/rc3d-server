// Foto da loja + 6 ângulos do modelo lado a lado, para escolher o "t0" (ângulo inicial) parecido com a fotografia.
// Uso (dentro de tools/): node gif/angles.mjs gif/lojas/<loja>.json  →  out/gif/<loja>-angulos.png
// Ângulos na imagem, da esquerda para a direita: foto, -90, -45, 0, 45, 90, 135.
import { stage, loadConfig } from "./stage.mjs";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
const cfgFile = process.argv[2];
const cfg = loadConfig(cfgFile);
const outDir = new URL("../out/gif/", import.meta.url);
fs.mkdirSync(outDir, { recursive: true });
const out = decodeURIComponent(new URL(`${path.basename(cfgFile, ".json")}-angulos.png`, outDir).pathname.replace(/^\/([A-Za-z]:)/, "$1"));

const { b, p } = await stage(cfg);
await p.evaluate((y) => window.__set({ scroll: y }), cfg.scroll ?? 0);
await p.waitForTimeout(500);
const r = await p.evaluate(() => window.__rect("rc-mvwrap"));
const y0 = Math.max(0, r.y);
const clip = { x: Math.max(0, r.x), y: y0, width: r.w, height: Math.min(r.h - (y0 - r.y), 800 - y0) };
const tiles = [await sharp(await p.screenshot({ clip })).resize(260).toBuffer()];
for (const t of [-90, -45, 0, 45, 90, 135]) {
  await p.evaluate(([t, phi]) => window.__set({ mv: 1, btn: 0, theta: t, phi }), [t, cfg.phi ?? 75]);
  await p.waitForTimeout(400);
  tiles.push(await sharp(await p.screenshot({ clip })).resize(260).toBuffer());
}
await b.close();
const h = Math.round((260 * clip.height) / clip.width);
await sharp({ create: { width: 260 * 7, height: h, channels: 3, background: "#888" } }).composite(tiles.map((t, i) => ({ input: t, left: i * 260, top: 0 }))).png().toFile(out);
console.log(`✔ ${out}`);
