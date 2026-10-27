#!/usr/bin/env node
// Ferramenta local da Reality Concept. Uso (a partir de rc3d-server/tools):
//   node rc3d.mjs demos  <leads.csv>   prepara modelo + demo + email para cada lead com ficheiro_glb e email
//   node rc3d.mjs check  <leads.csv>   confirma que as demos preparadas já estão online
//   node rc3d.mjs drafts <leads.csv>   cria os rascunhos na Zoho (só para demos já online)
//   node rc3d.mjs zoho-setup           troca o código da Zoho por um token (ver README)
// Nada é enviado: os emails ficam como rascunhos na Zoho para reveres e enviares tu.

import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv, writeCsv } from "./csv.mjs";
import { buildEmail } from "./email.mjs";
import { createDraft, setup } from "./zoho.mjs";

const TOOLS = dirname(fileURLToPath(import.meta.url));
const SERVER = join(TOOLS, "..");
const OUT = join(TOOLS, "out");
const ORIGIN = "https://ar.realityconcept3d.com";
const SITE = "https://realityconcept3d.com";
const COLUMNS = ["nome_contacto", "email", "peca", "frase_email", "ficheiro_glb", "demo_link", "modelo_id", "data_contacto", "estado"];
const MAX_TEXTURE = 2048;

const hex = () => randomBytes(8).toString("hex");
const mb = (bytes) => (bytes / 1e6).toFixed(1).replace(".", ",");
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Corre o gltf-transform com o próprio node (sem shell: caminhos com espaços funcionam).
function gltf(args) {
  const cli = join(TOOLS, "node_modules", "@gltf-transform", "cli", "bin", "cli.js");
  return execFileSync(process.execPath, [cli, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
}

// Tamanho, memória gráfica das texturas e medidas (cm) de um .glb.
function measure(file) {
  const csv = gltf(["inspect", file, "--format", "csv"]);
  const textures = csv.split(/\n\s*TEXTURES/)[1]?.split(/\n\s*ANIMATIONS/)[0] ?? "";
  const gpu = textures.split("\n").filter((l) => /^\d+,/.test(l)).reduce((sum, l) => sum + Number(l.split(",").pop()), 0);
  const maxRes = Math.max(0, ...[...textures.matchAll(/,(\d+)x(\d+),/g)].map((m) => Math.max(+m[1], +m[2])));
  const scene = csv.match(/\n0,[^,]*,[^,]*,"([^"]+)","([^"]+)"/);
  let dims = "";
  if (scene) {
    const [a, b] = [scene[1], scene[2]].map((s) => s.split(",").map(Number));
    const [w, h, d] = [b[0] - a[0], b[1] - a[1], b[2] - a[2]].map((v) => Math.round(v * 100));
    dims = `${w} × ${d} × ${h} cm`;
  }
  return { bytes: statSync(file).size, sizeMb: mb(statSync(file).size), gpuMb: Math.round(gpu / 1e6), maxRes, dims };
}

function findGlb(name) {
  const candidates = isAbsolute(name) ? [name] : [join(homedir(), "Downloads", name), join(process.cwd(), name)];
  const hit = candidates.find((p) => existsSync(p));
  if (!hit) throw new Error(`não encontrei ${name} (procurei em ${candidates.join(" e ")})`);
  return hit;
}

function readLeads(path) {
  const { header, records } = parseCsv(readFileSync(path, "utf8"));
  for (const c of COLUMNS) if (!header.includes(c)) header.push(c);
  return { header, records };
}

function saveLeads(path, header, records) {
  writeFileSync(path, writeCsv(header, records));
}

function prepare(lead) {
  const source = findGlb(lead.ficheiro_glb.trim());
  const id = hex();
  const token = hex();
  const work = join(OUT, "work");
  mkdirSync(work, { recursive: true });

  const before = measure(source);
  const resized = join(work, `${id}-resized.glb`);
  const target = join(SERVER, "m", `${id}.glb`);
  if (before.maxRes > MAX_TEXTURE) gltf(["resize", source, resized, "--width", String(MAX_TEXTURE), "--height", String(MAX_TEXTURE)]);
  else copyFileSync(source, resized);
  gltf(["optimize", resized, target, "--compress", "draco", "--texture-compress", "false", "--simplify", "false"]);
  const after = measure(target);

  const hasOwn3d = /^sim/i.test(lead["tem 3D no site"] || "");
  const credit = hasOwn3d
    ? `${lead.peca} — modelo ${lead.marca}, otimizado por Reality Concept`
    : `${lead.peca} — ${lead.marca}, modelo para demonstração`;
  writeFileSync(join(SERVER, "m", `${id}.json`), JSON.stringify({ src: `/m/${id}.glb`, name: lead.peca, credit }, null, 2) + "\n");

  const demo = { store: lead.marca, product: lead.peca, model: id };
  if (hasOwn3d) {
    demo.compare = [
      { label: "Tamanho do ficheiro", before: `${before.sizeMb} MB`, after: `${after.sizeMb} MB` },
      { label: "Memória gráfica no telemóvel", before: `≈ ${before.gpuMb} MB`, after: `≈ ${after.gpuMb} MB` },
      { label: "Tamanho no AR", before: "pode ser esticado", after: `fixo, tamanho real${after.dims ? ` (${after.dims})` : ""}` },
    ];
  }
  writeFileSync(join(SERVER, "d", `${token}.json`), JSON.stringify(demo, null, 2) + "\n");

  const link = `${SITE}/demo/${token}`;
  const email = buildEmail({ lead, link, before: hasOwn3d ? before : null, after, dims: after.dims });
  const file = join(OUT, `${slug(lead.marca)}-${token}.html`);
  writeFileSync(file, `<!doctype html><meta charset="utf-8"><title>${email.subject}</title><p><b>Para:</b> ${lead.email}<br><b>Assunto:</b> ${email.subject}</p><hr>${email.html}`);

  return { id, token, link, before, after, preview: file, subject: email.subject };
}

async function online(url) {
  try { return (await fetch(url, { method: "GET", redirect: "follow" })).status === 200; } catch { return false; }
}

const [command, csvPath] = process.argv.slice(2);

if (command === "zoho-setup") {
  await setup(TOOLS);
} else if (["demos", "check", "drafts"].includes(command) && csvPath) {
  const { header, records } = readLeads(csvPath);
  const today = new Date().toISOString().slice(0, 10);

  for (const lead of records) {
    const ready = lead.ficheiro_glb?.trim() && lead.email?.trim() && lead.peca?.trim();
    try {
      if (command === "demos" && ready && !lead.demo_link) {
        const r = prepare(lead);
        Object.assign(lead, { demo_link: r.link, modelo_id: r.id, estado: "demo pronta (falta publicar)" });
        console.log(`✔ ${lead.marca}: ${r.before.sizeMb} MB → ${r.after.sizeMb} MB, GPU ${r.before.gpuMb} → ${r.after.gpuMb} MB, medidas do modelo ${r.after.dims || "?"}\n  ${r.link}\n  email: ${r.preview}`);
      } else if (command === "check" && lead.demo_link) {
        const ok = (await online(lead.demo_link)) && (await online(`${ORIGIN}/m/${lead.modelo_id}.glb`));
        if (ok && /falta publicar/.test(lead.estado)) lead.estado = "demo online";
        console.log(`${ok ? "✔" : "✖"} ${lead.marca}: ${lead.demo_link}`);
      } else if (command === "drafts" && lead.estado === "demo online") {
        if (!(await online(lead.demo_link))) { console.log(`✖ ${lead.marca}: demo ainda não está online, rascunho não criado`); continue; }
        const token = lead.demo_link.split("/").pop();
        const after = measure(join(SERVER, "m", `${lead.modelo_id}.glb`));
        const demo = JSON.parse(readFileSync(join(SERVER, "d", `${token}.json`), "utf8"));
        const before = demo.compare ? { sizeMb: demo.compare[0].before.replace(" MB", ""), gpuMb: demo.compare[1].before.replace(/[^\d]/g, "") } : null;
        const email = buildEmail({ lead, link: lead.demo_link, before, after, dims: after.dims });
        await createDraft(TOOLS, { to: lead.email.trim(), subject: email.subject, html: email.html });
        Object.assign(lead, { estado: "rascunho na Zoho", data_contacto: today });
        console.log(`✔ ${lead.marca}: rascunho criado para ${lead.email}`);
      }
    } catch (error) {
      console.log(`✖ ${lead.marca}: ${error.message}`);
    }
  }
  saveLeads(csvPath, header, records);
  console.log(`\nLista atualizada: ${basename(csvPath)}`);
} else {
  console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 7).join("\n"));
  process.exitCode = 1;
}
