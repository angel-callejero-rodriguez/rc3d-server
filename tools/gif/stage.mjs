// Abre a página real do produto e prepara a simulação: modelo 3D por cima da foto principal, botão "Ver em 3D", cursor.
// Nada é alterado no site da loja; só neste browser local.
import { chromium } from "playwright";
import fs from "node:fs";
import { createRequire } from "node:module";
const MV = createRequire(import.meta.url).resolve("@google/model-viewer/dist/model-viewer-umd.min.js");

export async function stage({ url, glb, target, bg = "#fff", btnPos = "bottom", toneMapping = "aces", exposure = ".8" }) {
  const b = await chromium.launch({ args: ["--disable-blink-features=AutomationControlled", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36", locale: "pt-PT" });
  await ctx.route("https://rc3d.local/model.glb", (r) => r.fulfill({ body: fs.readFileSync(glb), contentType: "model/gltf-binary", headers: { "access-control-allow-origin": "*" } }));
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: "networkidle", timeout: 90000 }).catch(() => {});
  // alguns sites (ex.: CSS adiado) só acabam de carregar depois de "mexer o rato"
  await p.mouse.move(400, 300); await p.mouse.move(600, 400);
  await p.waitForTimeout(5000);
  await p.addScriptTag({ content: fs.readFileSync(MV, "utf8") });
  await p.evaluate(({ target, bg, btnPos, toneMapping, exposure }) => {
    // tira avisos de cookies, chats e botões flutuantes que tapam a página
    for (const el of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(el);
      if (cs.position !== "fixed") continue;
      const r = el.getBoundingClientRect();
      if ((/cookie|consent/i.test(el.textContent || "") && r.height < innerHeight * 0.9) || r.top > innerHeight - 120) el.style.display = "none";
    }
    const el = document.querySelector(target);
    if (!el) throw new Error(`não encontrei ${target} na página`);
    const r = el.getBoundingClientRect();
    const box = document.createElement("div");
    box.id = "rc-box";
    box.style.cssText = `position:absolute;left:${r.left + scrollX}px;top:${r.top + scrollY}px;width:${r.width}px;height:${r.height}px;z-index:99;pointer-events:none;font-family:Montserrat,Helvetica,Arial,sans-serif`;
    const pos = btnPos === "top" ? "top:16px" : "bottom:16px";
    box.innerHTML = `
      <div id="rc-mvwrap" style="position:absolute;inset:0;background:${bg};opacity:0">
        <model-viewer id="rc-mv" src="https://rc3d.local/model.glb" shadow-intensity="1" tone-mapping="${toneMapping}" exposure="${exposure}" environment-image="neutral" interaction-prompt="none" disable-zoom
          style="width:100%;height:100%;background:${bg}"></model-viewer>
        <div id="rc-hint" style="position:absolute;left:0;right:0;bottom:16px;display:flex;justify-content:space-between;padding:0 16px;font-size:14px;letter-spacing:.02em;opacity:0">
          <span style="color:#555;align-self:center">↻ Arraste para rodar</span>
          <span style="background:#111;color:#fff;padding:11px 18px;border-radius:999px;font-weight:600">Ver na sua sala (AR)</span>
        </div>
      </div>
      <div id="rc-btn" style="position:absolute;left:16px;${pos};background:#fff;color:#111;border:1px solid #111;padding:12px 22px;border-radius:999px;font-size:17px;font-weight:600;letter-spacing:.02em;box-shadow:0 2px 10px rgba(0,0,0,.18);display:flex;gap:8px;align-items:center">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="M3 7l9 5 9-5M12 12v10"/></svg>Ver em 3D</div>`;
    document.body.appendChild(box);
    const cur = document.createElement("div");
    cur.style.cssText = "position:fixed;left:0;top:0;z-index:100000;pointer-events:none;opacity:0;width:28px;height:28px";
    document.body.appendChild(cur);
    const arrow = `<svg width="24" height="28" viewBox="0 0 24 28"><path d="M2 2v20l5.5-5 3.5 8 3.5-1.5-3.5-8H18z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
    const hand = `<svg width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="11" fill="rgba(17,17,17,.15)" stroke="#111" stroke-width="2"/><circle cx="14" cy="14" r="3" fill="#111"/></svg>`;
    window.__set = (s) => {
      const mv = document.getElementById("rc-mv"), btn = document.getElementById("rc-btn");
      if (s.mv !== undefined) document.getElementById("rc-mvwrap").style.opacity = s.mv;
      if (s.btn !== undefined) btn.style.opacity = s.btn;
      if (s.pressed !== undefined) Object.assign(btn.style, s.pressed ? { background: "#111", color: "#fff", transform: "scale(.96)" } : { background: "#fff", color: "#111", transform: "none" });
      if (s.hint !== undefined) document.getElementById("rc-hint").style.opacity = s.hint;
      if (s.theta !== undefined) { mv.cameraOrbit = `${s.theta}deg ${s.phi ?? 75}deg auto`; mv.jumpCameraToGoal(); }
      if (s.scroll !== undefined) window.scrollTo(0, s.scroll);
      if (s.cur) { cur.style.opacity = s.cur.o ?? 1; cur.style.transform = `translate(${s.cur.x}px,${s.cur.y}px)`; cur.innerHTML = s.cur.drag ? hand : arrow; }
      return new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(res))));
    };
    window.__rect = (id) => { const r = document.getElementById(id).getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
  }, { target, bg, btnPos, toneMapping, exposure });
  await p.waitForFunction(() => document.getElementById("rc-mv")?.loaded, null, { timeout: 90000 });
  await p.waitForTimeout(1000);
  return { b, p };
}

// Lê a config da loja; o caminho do .glb é relativo à raiz do rc3d-server (ex.: "m/<id>.glb").
export function loadConfig(file) {
  const cfg = JSON.parse(fs.readFileSync(file, "utf8"));
  cfg.glb = new URL(`../../${cfg.glb}`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
  cfg.glb = decodeURIComponent(cfg.glb);
  return cfg;
}
