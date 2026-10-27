// CSV simples (RFC 4180): campos entre aspas, vírgulas e quebras de linha dentro de aspas.
// O Google Sheets exporta assim.

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }

  const [header, ...body] = rows.filter((r) => r.some((v) => v.trim() !== ""));
  return {
    header,
    records: body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""]))),
  };
}

function quote(value) {
  const v = String(value ?? "");
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function writeCsv(header, records) {
  return [header, ...records.map((r) => header.map((h) => r[h]))]
    .map((r) => r.map(quote).join(","))
    .join("\n") + "\n";
}
