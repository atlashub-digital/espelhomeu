import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { importGuide } from "./import-guide.mjs";
const read = path => readFile(new URL("../" + path, import.meta.url), "utf8");
const manifest = JSON.parse(await read("content/manifest.json"));
// Approved P01 head 2f382620: all its Publications and Journey remain byte-equivalent as JSON.
const p01 = { publications: manifest.publications.filter(p => ["uma-pausa-que-tambem-e-sua", "7-dias-para-me-escolher"].includes(p.id) || p.id.startsWith("p01-leitura-dia-")), programs: manifest.programs.filter(p => p.id === "p01-jornada") };
assert.equal(createHash("sha256").update(JSON.stringify(p01)).digest("hex"),
  "c68bc4e0e1b441cb53e093099437659f90367b6bb1c5a1d1a1edb2cd0217b231");
const recipe = JSON.parse(await read("sources/produto-02/import.json"));
const source = await read("sources/produto-02/00_MASTER_EDITORIAL/ESPELHOMEU_P02_MASTER_EDITORIAL.md");
assert.throws(() => importGuide(source.replace(recipe.sections[0].start, "missing"), recipe), /boundary/);
// A different Guide and chapter count need data only: no product-specific branch in the importer.
const other = structuredClone(recipe);
other.publication.id = "another-guide";
other.publication.chapters = [{ id: "intro", slug: "intro", title: "Intro", order: 0 }];
other.sections = [{ start: "## Intro", end: "## QA" }];
const generated = importGuide("## Intro\n\nTexto editorial.\n\n## QA\nOperacional.", other);
assert.equal(generated.chapters.length, 1);
assert.equal(generated.chapters[0].body.blocks[1].text, "Texto editorial.");
assert.ok(!JSON.stringify(generated.chapters).includes("Operacional"));
console.log("PASS approved P01 unchanged; invalid boundaries rejected; second recipe without code changes");
