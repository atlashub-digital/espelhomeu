import { readFile, writeFile } from "node:fs/promises";
import { transformProduct } from "./transform-product.mjs";
const base = new URL("../", import.meta.url);
const read = name => readFile(new URL(name, base), "utf8");
const manifest = transformProduct(
  await read("sources/produto-01/ESPELHOMEU_P01_MASTER_EDITORIAL_FINAL.md"),
  await read("sources/produto-01/LEITURA_GRATUITA_ORIGINAL.md"),
);
const result = JSON.stringify(manifest, null, 2) + "\n";
if (process.argv.includes("--check")) {
  if (await read("content/manifest.json") !== result) throw new Error("Editorial projection drift: run pnpm content:sync and review the diff.");
  console.log("PASS original Markdown → canonical AMF: no projection drift");
} else {
  await writeFile(new URL("content/manifest.json", base), result);
}
