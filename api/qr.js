// Gera o código QR do botão "Ver no Smartphone" no nosso servidor.
// Antes usávamos api.qrserver.com, que via todos os links (incluindo demos privadas).
import QRCode from "qrcode";
import { QR_HOSTS } from "../resolve.js";

const MAX_LENGTH = 2048;

// Devolve o URL se for https e de um site nosso; caso contrário null.
export function allowedQrData(data) {
  if (typeof data !== "string" || data.length > MAX_LENGTH) return null;
  try {
    const url = new URL(data);
    return url.protocol === "https:" && QR_HOSTS.has(url.hostname) ? url.href : null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const data = new URL(req.url, "https://ar.realityconcept3d.com").searchParams.get("data");
  const url = allowedQrData(data);

  if (!url) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("QR só para links https de realityconcept3d.com");
    return;
  }

  const svg = await QRCode.toString(url, { type: "svg", margin: 1, width: 300 });
  res.statusCode = 200;
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.setHeader("X-Robots-Tag", "noindex");
  res.end(svg);
}
