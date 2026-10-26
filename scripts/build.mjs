// Copia para dist/ só os ficheiros que devem ser públicos.
// Testes, scripts, README e package.json ficam de fora.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = join(root, "dist");
const PUBLIC_FILES = ["index.html", "resolve.js", "widget.js", "models.json"];

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist);

for (const file of PUBLIC_FILES) cpSync(join(root, file), join(dist, file));
for (const file of readdirSync(root)) {
  if (file.endsWith(".glb")) cpSync(join(root, file), join(dist, file));
}
if (existsSync(join(root, "m"))) cpSync(join(root, "m"), join(dist, "m"), { recursive: true });

console.log(`dist/ pronto: ${readdirSync(dist).length} entradas`);
