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

// P02 is also human-approved: ingestion must not change its canonical data.
assert.equal(createHash("sha256").update(JSON.stringify(manifest.publications.find(p => p.id === "eu-sou-bela-do-meu-jeito"))).digest("hex"), "70d6bc34f76467b679feb6b15bae8a2145cbad54229125ec9462e9dcae0289aa");
for (const [slug, count, entries, pattern] of [
  ["21-dias-meu-melhor-reflexo", 23, 21, /^Dia \d/],
  ["recomecar-depois-dos-40", 9, 7, /^CAPÍTULO /],
  ["diario-de-amor-proprio-30-encontros-comigo", 32, 30, /^ENCONTRO /],
]) {
  const product = manifest.publications.find(p => p.id === slug);
  assert.equal(product.chapters.length, count);
  assert.equal(product.chapters.filter(c => pattern.test(c.title)).length, entries);
  assert.equal(product.media.filter(m => m.kind === "document").length, 2);
  assert.ok(!/\[MEDIA|\[CALLOUT|FICHA EDITORIAL|FACT-CHECK|NOTAS EDITORIAIS|Lembrete editorial:|99_ARQUIVO|R\$/.test(JSON.stringify(product)));
}
const syntaxes = structuredClone(other);
syntaxes.omitParagraphs = ["[MEDIA 01] Operacional"];
const text = "## Intro\n\n> [CALLOUT — INSIGHT] Texto preservado.\n\n[MEDIA 01] Operacional\n\n## QA";
assert.deepEqual(importGuide(text, syntaxes).chapters[0].body.blocks.at(-1), { type: "callout", tone: "note", text: "Texto preservado." });
console.log("PASS P01/P02 unchanged; three editorial shapes and inline callouts; no operational markers");

// Final-sync supplements occur after operational notes, at EOF; no silent truncation.
assert.equal(createHash("sha256").update(JSON.stringify(manifest.publications.find(p => p.id === "21-dias-meu-melhor-reflexo"))).digest("hex"), "841d52a2a97ebf01241d257cd261c0821ca3ad1d7f7391cdf4f20c29da0655be");
const eofRecipe = structuredClone(other);
eofRecipe.sections[0].end = null;
assert.equal(importGuide("## Intro\n\nÚltimo parágrafo.", eofRecipe).chapters[0].body.blocks.at(-1).text, "Último parágrafo.");
assert.throws(() => importGuide("Fonte sem marcador", eofRecipe), /boundary/);
for (const [slug, supplement] of [
  ["recomecar-depois-dos-40", "Três horizontes, sem pressa."],
  ["diario-de-amor-proprio-30-encontros-comigo", "Uma página inteiramente sua"],
]) {
  const product = manifest.publications.find(p => p.id === slug);
  assert.ok(JSON.stringify(product.chapters.at(-1).body).includes(supplement));
  assert.equal(product.media.filter(m => m.kind === "image").length, 4);
}
const diary = manifest.publications.find(p => p.id === "diario-de-amor-proprio-30-encontros-comigo");
assert.equal(new Set(diary.chapters.filter(c => c.part).map(c => c.part)).size, 5);
console.log("PASS final supplements retained, five diary parts, current covers/media, EOF boundary guard");
