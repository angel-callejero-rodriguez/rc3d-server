// Liga o parâmetro ?modelo= a um modelo registado.
// Usado pelo index.html (browser) e pelos testes (node --test).

// Um id: letras minúsculas, números e hífens. Ex.: "mesa", "9f3c2a7d1e8b4c6a".
const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

// Só caminhos do próprio servidor para ficheiros .glb. Ex.: "/mesa.glb", "/m/9f3c.glb".
const SRC_PATTERN = /^\/(?:m\/)?[a-z0-9][a-z0-9-]*\.glb$/;

// Hosts que podem aparecer num código QR.
export const QR_HOSTS = new Set([
  "ar.realityconcept3d.com",
  "realityconcept3d.com",
  "www.realityconcept3d.com",
]);

// "mesa.glb" (links antigos) e "mesa" dão o mesmo id. Tudo o resto devolve null.
export function normalizeId(raw) {
  if (typeof raw !== "string") return null;
  const id = raw.trim().toLowerCase().replace(/\.glb$/, "");
  return ID_PATTERN.test(id) ? id : null;
}

export function isSafeSrc(src) {
  return typeof src === "string" && SRC_PATTERN.test(src);
}

// Uma entrada do registo vira um modelo, ou null se estiver desativada ou mal escrita.
export function toModel(id, entry) {
  if (!entry || typeof entry !== "object") return null;
  if (entry.active === false) return null;
  if (!isSafeSrc(entry.src)) return null;
  return {
    id,
    src: entry.src,
    name: typeof entry.name === "string" ? entry.name : "",
    credit: typeof entry.credit === "string" ? entry.credit : "",
  };
}

// Procura primeiro no registo público (/models.json) e depois num ficheiro privado (/m/<id>.json).
// fetchJson(path) devolve o JSON ou null quando o ficheiro não existe.
export async function resolveModel(raw, fetchJson) {
  const id = normalizeId(raw);
  if (!id) return null;

  const index = await fetchJson("/models.json");
  if (index && Object.hasOwn(index, id)) return toModel(id, index[id]);

  const privateEntry = await fetchJson(`/m/${id}.json`);
  return toModel(id, privateEntry);
}

// O QR aponta para a página pedida (ex.: a demo da loja) só se for um site nosso em https.
export function qrTarget(requested, fallback) {
  try {
    const url = new URL(requested);
    if (url.protocol === "https:" && QR_HOSTS.has(url.hostname)) return url.href;
  } catch {
    // valor inválido: usa o fallback
  }
  return fallback;
}
