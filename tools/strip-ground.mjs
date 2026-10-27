// Remove chãos/fundos que muitos modelos do Sketchfab trazem (ex.: "ground", 2 × 2 m).
// Sem isto, as medidas saem erradas e aparece um quadrado debaixo da peça em AR.
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { prune } from "@gltf-transform/functions";
import draco3d from "draco3dgltf";

const GROUND = /\b(ground|floor|plane|shadow|backdrop|chao|sol)\b|^(ground|floor|plane|shadow)/i;

export async function stripGround(input, output) {
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      "draco3d.decoder": await draco3d.createDecoderModule(),
      "draco3d.encoder": await draco3d.createEncoderModule(),
    });
  const document = await io.read(input);
  const removed = [];

  for (const node of document.getRoot().listNodes()) {
    const mesh = node.getMesh();
    const names = [node.getName(), mesh?.getName() ?? ""].join(" ").replace(/_/g, " ");
    if (mesh && GROUND.test(names)) {
      removed.push(node.getName() || mesh.getName());
      node.setMesh(null);
    }
  }

  await document.transform(prune());
  await io.write(output, document);
  return removed;
}
