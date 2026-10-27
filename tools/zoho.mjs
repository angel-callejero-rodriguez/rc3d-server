// Ligação à Zoho Mail (região EU). As credenciais ficam só em tools/.env (fora do git) e nunca são impressas.
// Docs: https://www.zoho.com/mail/help/api/post-save-draft-template.html (mode: "draft")
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ACCOUNTS = "https://accounts.zoho.eu";
const MAIL = "https://mail.zoho.eu";

function readEnv(dir) {
  const file = join(dir, ".env");
  if (!existsSync(file)) throw new Error("falta tools/.env (ver README, secção Zoho)");
  return Object.fromEntries(
    readFileSync(file, "utf8").split(/\r?\n/).filter((l) => /^\s*[A-Z_]+=/.test(l))
      .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
  );
}

function writeEnv(dir, env) {
  writeFileSync(join(dir, ".env"), Object.entries(env).map(([k, v]) => `${k}=${v}`).join("\n") + "\n");
}

async function json(response, what) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.error) {
    // Só o código do erro, nunca o corpo (pode conter tokens)
    throw new Error(`${what} falhou (HTTP ${response.status}${body.error ? `, ${body.error}` : ""}${body.status?.description ? `, ${body.status.description}` : ""})`);
  }
  return body;
}

async function accessToken(env) {
  const params = new URLSearchParams({
    refresh_token: env.ZOHO_REFRESH_TOKEN, client_id: env.ZOHO_CLIENT_ID,
    client_secret: env.ZOHO_CLIENT_SECRET, grant_type: "refresh_token",
  });
  const body = await json(await fetch(`${ACCOUNTS}/oauth/v2/token?${params}`, { method: "POST" }), "renovar token da Zoho");
  return body.access_token;
}

// Uma vez: troca o código (ZOHO_GRANT_CODE) por um refresh token e descobre o accountId.
export async function setup(dir) {
  const env = readEnv(dir);
  for (const k of ["ZOHO_CLIENT_ID", "ZOHO_CLIENT_SECRET", "ZOHO_GRANT_CODE", "ZOHO_FROM"]) {
    if (!env[k]) throw new Error(`falta ${k} em tools/.env`);
  }
  const params = new URLSearchParams({
    code: env.ZOHO_GRANT_CODE, client_id: env.ZOHO_CLIENT_ID,
    client_secret: env.ZOHO_CLIENT_SECRET, grant_type: "authorization_code",
  });
  const token = await json(await fetch(`${ACCOUNTS}/oauth/v2/token?${params}`, { method: "POST" }), "trocar o código da Zoho");
  if (!token.refresh_token) throw new Error("a Zoho não devolveu refresh token: gera um código novo e repete");
  env.ZOHO_REFRESH_TOKEN = token.refresh_token;
  delete env.ZOHO_GRANT_CODE; // o código só serve uma vez

  const accounts = await json(
    await fetch(`${MAIL}/api/accounts`, { headers: { Authorization: `Zoho-oauthtoken ${token.access_token}` } }),
    "ler a conta Zoho",
  );
  const account = accounts.data?.find((a) => (a.emailAddress ?? []).some((e) => e.mailId === env.ZOHO_FROM) || a.primaryEmailAddress === env.ZOHO_FROM) ?? accounts.data?.[0];
  if (!account) throw new Error("não encontrei a conta de email na Zoho");
  env.ZOHO_ACCOUNT_ID = account.accountId;
  writeEnv(dir, env);
  console.log(`✔ Zoho ligada (conta de ${env.ZOHO_FROM}). Já podes correr: node rc3d.mjs drafts <leads.csv>`);
}

export async function createDraft(dir, { to, subject, html }) {
  const env = readEnv(dir);
  if (!env.ZOHO_REFRESH_TOKEN || !env.ZOHO_ACCOUNT_ID) throw new Error("Zoho ainda não ligada: corre primeiro node rc3d.mjs zoho-setup");
  const response = await fetch(`${MAIL}/api/accounts/${env.ZOHO_ACCOUNT_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Zoho-oauthtoken ${await accessToken(env)}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ mode: "draft", fromAddress: env.ZOHO_FROM, toAddress: to, subject, content: html, mailFormat: "html" }),
  });
  await json(response, "criar rascunho");
}
