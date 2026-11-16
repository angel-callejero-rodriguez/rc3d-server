// Grava a simulação (página real + botão "Ver em 3D" + modelo a rodar 360°) e monta um GIF leve para email (~1 MB).
// Uso (dentro de tools/): node gif/record.mjs gif/lojas/<loja>.json
// Sai em tools/out/gif/<loja>.gif, mais <loja>-folha.png (4 momentos, para rever antes de enviar).
import { stage, loadConfig } from "./stage.mjs";
import gifenc from "gifenc";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
const { GIFEncoder, quantize, applyPalette } = gifenc;

const cfgFile = process.argv[2];
if (!cfgFile) { console.log("uso: node gif/record.mjs gif/lojas/<loja>.json"); process.exit(1); }
const cfg = loadConfig(cfgFile);
const outDir = new URL("../out/gif/", import.meta.url);
fs.mkdirSync(outDir, { recursive: true });
const name = path.basename(cfgFile, ".json");
const outGif = decodeURIComponent(new URL(`${name}.gif`, outDir).pathname.replace(/^\/([A-Za-z]:)/, "$1"));

const W = cfg.width ?? 720, H = Math.round((W * 800) / 1280), t0 = cfg.t0 ?? 0, phi = cfg.phi ?? 75, scroll = cfg.scroll ?? 0;
const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
const lerp = (a, b, k) => a + (b - a) * k;

const { b, p } = await stage(cfg);
const btnR = await p.evaluate(() => window.__rect("rc-btn"));
const btn = { x: btnR.x + btnR.w / 2, y: btnR.y + btnR.h / 2 };
await p.evaluate((y) => window.__set({ scroll: y }), scroll);
const box = await p.evaluate(() => window.__rect("rc-mvwrap"));
await p.evaluate(() => window.__set({ scroll: 0 }));
const visTop = Math.max(box.y, 0), visBot = Math.min(box.y + box.h, 800);
const mid = { x: box.x + box.w * 0.3, y: (visTop + visBot) / 2 + 40 }, end = { x: box.x + box.w * 0.75, y: mid.y };
const start = { x: 980, y: 690 };

const S = [];
const hold = (n, s) => { for (let i = 0; i < n; i++) S.push({ ...s }); };
hold(12, { scroll: 0, mv: 0, btn: 1, hint: 0, theta: t0, phi, cur: { ...start, o: 0 } });                         // página como é, com o botão
for (let i = 1; i <= 10; i++) { const k = ease(i / 10); S.push({ cur: { x: lerp(start.x, btn.x, k), y: lerp(start.y, btn.y, k), o: 1 } }); } // cursor vai ao botão
hold(3, { pressed: true, cur: { ...btn } });                                                                        // clique
for (let i = 1; i <= 6; i++) S.push({ pressed: false, mv: i / 6, btn: 1 - i / 6, cur: { ...btn, o: 1 - i / 6 } });  // a foto passa a 3D
if (scroll) for (let i = 1; i <= 8; i++) S.push({ scroll: Math.round(scroll * ease(i / 8)) });                      // desce para ver a peça inteira
for (let i = 1; i <= 5; i++) S.push({ hint: i / 5, cur: { ...mid, drag: true, o: i / 5 } });
const N = 60;                                                                                                       // arrastar = rodar 360°
for (let i = 1; i <= N; i++) { const k = ease(i / N); S.push({ theta: t0 + 360 * k, phi, cur: { x: lerp(mid.x, end.x, k), y: mid.y - Math.sin(k * Math.PI) * 6, drag: true, o: 1 } }); }
for (let i = 1; i <= 4; i++) S.push({ cur: { ...end, drag: true, o: 1 - i / 4 } });
hold(14, {});                                                                                                       // pausa no fim

const frames = [];
for (const s of S) {
  await p.evaluate((s) => window.__set(s), s);
  frames.push(await sharp(await p.screenshot()).resize(W, H).ensureAlpha().raw().toBuffer());
}
await b.close();

// uma paleta para tudo; índice 255 = "igual à imagem anterior" (transparente), para o GIF ficar leve
const pick = [0, Math.floor(frames.length * 0.4), Math.floor(frames.length * 0.65), frames.length - 1];
const palette = quantize(Buffer.concat(pick.map((i) => frames[i])), 255, { format: "rgb565" });
while (palette.length < 255) palette.push([0, 0, 0]);
const pal255 = palette.slice(0, 255);
palette.push([255, 0, 255]);
const gif = GIFEncoder();
let prev = null;
for (const f of frames) {
  const idx = applyPalette(f, pal255, "rgb565");
  if (prev) {
    const out = new Uint8Array(idx);
    for (let j = 0; j < idx.length; j++) if (idx[j] === prev[j]) out[j] = 255;
    gif.writeFrame(out, W, H, { delay: 100, transparent: true, transparentIndex: 255, dispose: 1 });
  } else gif.writeFrame(idx, W, H, { palette, delay: 100, repeat: 0, dispose: 1 });
  prev = idx;
}
gif.finish();
fs.writeFileSync(outGif, gif.bytes());

const sheetIdx = [0, 22, Math.floor(frames.length * 0.55), frames.length - 1];
const tiles = await Promise.all(sheetIdx.map((i) => sharp(frames[i], { raw: { width: W, height: H, channels: 4 } }).resize(480).png().toBuffer()));
const th = Math.round((480 * H) / W);
await sharp({ create: { width: 960, height: th * 2, channels: 3, background: "#888" } }).composite(tiles.map((t, k) => ({ input: t, left: (k % 2) * 480, top: Math.floor(k / 2) * th }))).png().toFile(outGif.replace(/\.gif$/, "-folha.png"));
console.log(`✔ ${outGif}: ${frames.length} imagens, ${(gif.bytes().length / 1024 / 1024).toFixed(2)} MB`);
