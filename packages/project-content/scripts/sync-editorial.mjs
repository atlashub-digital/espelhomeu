import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { transformProduct } from "./transform-product.mjs";
const base = new URL("../", import.meta.url);
const read = name => readFile(new URL(name, base), "utf8");
const delivery = JSON.parse(await read("sources/produto-01/delivery.json"));
for (const file of delivery.files) {
  const bytes = await readFile(new URL("../../" + file.path, base));
  const hash = createHash("sha1").update("blob " + bytes.length + "\0").update(bytes).digest("hex");
  if (bytes.length !== file.bytes || hash !== file.gitBlobSha)
    throw new Error("Official asset differs from delivery: " + file.path);
}
console.log("PASS official assets: nine original binaries match delivery hashes");
const manifest = transformProduct(
  await read("sources/produto-01/00_MASTER_EDITORIAL/ESPELHOMEU_P01_MASTER_EDITORIAL.md"),
  await read("sources/produto-01/04_MARKETING_E_COMERCIAL/LEITURA_GRATUITA_LEAD_MAGNET_v1.0.md"),
  JSON.parse(await read("content/media.json")),
);
const result = JSON.stringify(manifest, null, 2) + "\n";
if (process.argv.includes("--check")) {
  if (await read("content/manifest.json") !== result) throw new Error("Editorial projection drift: run pnpm content:sync and review the diff.");
  console.log("PASS original Markdown → canonical AMF: no projection drift");
} else {
  await writeFile(new URL("content/manifest.json", base), result);
}
