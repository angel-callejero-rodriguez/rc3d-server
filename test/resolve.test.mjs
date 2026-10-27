import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeId, qrTarget, resolveModel } from "../resolve.js";
import { allowedQrData } from "../api/qr.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const readJson = (path) => JSON.parse(readFileSync(join(root, path), "utf8"));

// Registo falso: um público ativo, um público desativado e um privado.
const fakeFiles = {
  "/models.json": {
    mesa: { src: "/mesa.glb", name: "Mesa", credit: "C" },
    antiga: { src: "/antiga.glb", name: "Antiga", active: false },
  },
  "/m/9f3c2a7d1e8b4c6a.json": { src: "/m/9f3c2a7d1e8b4c6a.glb", name: "Loja" },
};
const fakeFetch = async (path) => fakeFiles[path] ?? null;

test("id conhecido devolve o modelo", async () => {
  const model = await resolveModel("mesa", fakeFetch);
  assert.deepEqual(model, { id: "mesa", src: "/mesa.glb", name: "Mesa", credit: "C" });
});

test("links antigos com .glb continuam a funcionar", async () => {
  assert.deepEqual(await resolveModel("mesa.glb", fakeFetch), await resolveModel("mesa", fakeFetch));
  assert.equal(normalizeId("CadeiraCouro.GLB"), "cadeiracouro");
});

test("modelo privado só é encontrado pelo id exato", async () => {
  const model = await resolveModel("9f3c2a7d1e8b4c6a", fakeFetch);
  assert.equal(model.src, "/m/9f3c2a7d1e8b4c6a.glb");
  assert.equal(await resolveModel("9f3c2a7d", fakeFetch), null);
});

test("id desconhecido ou desativado devolve null", async () => {
  assert.equal(await resolveModel("sofa", fakeFetch), null);
  assert.equal(await resolveModel("antiga", fakeFetch), null);
});

test("URLs de outros sites e caminhos são bloqueados", async () => {
  for (const raw of ["https://evil.example/x.glb", "//evil.example/x.glb", "../mesa", "m/9f3c2a7d1e8b4c6a", "__proto__", "constructor"]) {
    assert.equal(await resolveModel(raw, fakeFetch), null, raw);
  }
});

test("sem parâmetro devolve null", async () => {
  assert.equal(await resolveModel(null, fakeFetch), null);
  assert.equal(await resolveModel("", fakeFetch), null);
});

test("registo falha (rede ou JSON inválido) devolve null", async () => {
  assert.equal(await resolveModel("mesa", async () => null), null);
});

test("todas as entradas do registo real apontam para ficheiros que existem", () => {
  const entries = Object.entries(readJson("models.json"));
  const privateDir = join(root, "m");
  if (existsSync(privateDir)) {
    for (const file of readdirSync(privateDir).filter((f) => f.endsWith(".json"))) {
      entries.push([file.replace(/\.json$/, ""), readJson(join("m", file))]);
    }
  }
  assert.ok(entries.length > 0);
  for (const [id, entry] of entries) {
    assert.equal(normalizeId(id), id, `id inválido: ${id}`);
    assert.match(entry.src, /^\/(?:m\/)?[a-z0-9][a-z0-9-]*\.glb$/, `src inválido em ${id}`);
    assert.ok(existsSync(join(root, entry.src)), `falta o ficheiro ${entry.src} (${id})`);
    assert.ok(entry.name && entry.credit, `falta name/credit em ${id}`);
  }
});

test("todas as demos (d/<token>.json) estão completas e apontam para modelos que existem", () => {
  const demoDir = join(root, "d");
  if (!existsSync(demoDir)) return;
  const publicIds = Object.keys(readJson("models.json"));
  for (const file of readdirSync(demoDir).filter((f) => f.endsWith(".json"))) {
    const token = file.replace(/\.json$/, "");
    const demo = readJson(join("d", file));
    assert.match(token, /^[a-f0-9]{16}$/, `token inválido: ${token}`);
    assert.ok(typeof demo.store === "string" && demo.store, `falta store em ${token}`);
    assert.ok(typeof demo.product === "string" && demo.product, `falta product em ${token}`);
    const exists = publicIds.includes(demo.model) || existsSync(join(root, "m", `${demo.model}.json`));
    assert.ok(exists, `a demo ${token} aponta para um modelo que não existe: ${demo.model}`);
    for (const row of demo.compare ?? []) {
      assert.ok(row.label && row.before && row.after, `linha compare incompleta em ${token}`);
    }
  }
});

test("QR só aceita links https dos nossos sites", () => {
  assert.equal(allowedQrData("https://realityconcept3d.com/demo/abc"), "https://realityconcept3d.com/demo/abc");
  assert.equal(allowedQrData("https://ar.realityconcept3d.com/?modelo=mesa"), "https://ar.realityconcept3d.com/?modelo=mesa");
  assert.equal(allowedQrData("http://realityconcept3d.com/"), null);
  assert.equal(allowedQrData("https://evil.example/"), null);
  assert.equal(allowedQrData("https://realityconcept3d.com.evil.example/"), null);
  assert.equal(allowedQrData(null), null);
  assert.equal(qrTarget("https://evil.example/", "https://ar.realityconcept3d.com/?modelo=mesa"), "https://ar.realityconcept3d.com/?modelo=mesa");
});
