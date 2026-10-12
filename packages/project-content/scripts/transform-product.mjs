// Structural adapter for the supplied Produto 01 master. No editorial generation.
// Source boundaries fail closed: an updated editorial structure requires review.
function between(text, start, end) {
  const a = text.indexOf(start);
  const b = text.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw new Error("Missing editorial boundary: " + start);
  return text.slice(a + start.length, b).trim();
}
function plain(text) {
  return text.replace(/\*\*/g, "").replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/^> ?/gm, "").replace(/[ \t]+$/gm, "").trim();
}
function blocks(text) {
  return text.split(/\n\s*\n/).flatMap(part => {
    const p = part.trim();
    if (!p || p === "---") return [];
    const callout = p.match(/^\[CALLOUT — (.+)\]\n([\s\S]+)$/);
    if (callout) return [{ type: "callout", tone: callout[1] === "ATENÇÃO" ? "warning" : "note", text: plain(callout[2]) }];
    // A heading may be adjacent to its paragraph in the original master.
    if (/^#{1,6} /.test(p)) {
      const [line, ...rest] = p.split("\n");
      return [{ type: "heading", level: 3, text: plain(line.replace(/^#+ /, "")) }, ...blocks(rest.join("\n"))];
    }
    return [{ type: "paragraph", text: plain(p) }];
  });
}
function chapter(id, title, order, text) {
  return { id, slug: id, title, order, body: { format: "blocks", blocks: blocks(text) } };
}
export function transformProduct(master, articleSource) {
  const masterPath = "packages/project-content/sources/produto-01/ESPELHOMEU_P01_MASTER_EDITORIAL_FINAL.md";
  const title = between(master, "**Título:** ", "  \n");
  const subtitle = between(master, "**Subtítulo:** ", "  \n");
  const main = between(master, "# 3. MASTER CONTENT — TEXTO FINAL PARA LEITURA", "# 4. WORKBOOK — CARTÕES DESTACÁVEIS");
  const opening = main.slice(0, main.indexOf("## DIA 1")).trim();
  const days = [...main.matchAll(/^## DIA (\d) — (.+)\n([\s\S]*?)(?=^## DIA \d|^## ÚLTIMA PÁGINA)/gm)];
  if (days.length !== 7 || days.some((d, i) => Number(d[1]) !== i + 1)) throw new Error("Expected seven ordered editorial days");
  const closing = main.slice(main.indexOf("## ÚLTIMA PÁGINA")).trim();
  const workbook = between(master, "### Cartão 0 — Minha intenção", "# 5. MEDIA BRIEF — DIREÇÃO DE ARTE");
  const description = between(master, "## Descrição curta", "## Dez frases editoriais originais");
  const base = { schemaVersion: "0.2", status: "preview", locale: "pt-BR", authors: ["EspelhoMeu"], edition: "Preview candidate · Pré-publicação", access: { mode: "public" }, media: [], tags: [] };
  const guideId = "7-dias-para-me-escolher";
  const guide = {
    ...base, id: guideId, slug: guideId, type: "guide", title, subtitle, description,
    tags: ["Autocuidado", "Mapa do Que É Meu"], source: { repository: "atlashub-digital/espelhomeu", path: masterPath },
    chapters: [
      chapter("abertura", "Uma carta antes do primeiro dia", 0, opening),
      ...days.map((d, i) => chapter("dia-" + d[1], "Dia " + d[1] + " — " + d[2], i + 1, d[3])),
      chapter("quando-voce-voltar", "Quando você voltar", 8, closing),
      chapter("mapa-do-que-e-meu", "Cartões e Mapa do Que É Meu", 9, "### Cartão 0 — Minha intenção\n" + workbook),
    ],
  };
  const articleTitle = between(articleSource, "**Título:** ", "  \n");
  const article = {
    ...base, id: "uma-pausa-que-tambem-e-sua", slug: "uma-pausa-que-tambem-e-sua", type: "article",
    title: articleTitle, subtitle: between(articleSource, "**Subtítulo:** ", "  \n"),
    tags: ["Pausas"], source: { repository: "atlashub-digital/espelhomeu", path: "packages/project-content/sources/produto-01/LEITURA_GRATUITA_ORIGINAL.md" },
    chapters: [chapter("primeiro-encontro", articleTitle, 0, between(articleSource, "# " + articleTitle + "\n", "# MINI MEDIA BRIEF"))],
  };
  // Schema 0.2 references whole Publications, not chapter fragments.
  // Daily Publications are deterministic projections of the Guide, not new prose.
  const readings = days.map((d, i) => ({
    ...base, id: "p01-leitura-dia-" + d[1], slug: "p01-leitura-dia-" + d[1], type: "article",
    title: "Dia " + d[1] + " — " + d[2], subtitle: title, source: guide.source,
    chapters: [chapter("dia-" + d[1], plain(d[3].split("\n")[0].replace(/^### /, "")), 0, d[3])],
  }));
  const units = days.map((d, i) => {
    const text = d[3], day = Number(d[1]), prefix = "p01-dia-" + day;
    const exercise = between(text, "**EXERCÍCIO — ", "**VERSÃO DE DOIS MINUTOS:**");
    const [exerciseTitle, ...instructions] = exercise.split("\n");
    const reflection = between(text, "**REFLEXÃO PARA GUARDAR**", "**MEU MAPA — DIA " + day + "**");
    const map = text.split("**MEU MAPA — DIA " + day + "**")[1].split(/\[CALLOUT|[*][*]Fecho do encontro/)[0].trim();
    const short = between(text, "**VERSÃO DE DOIS MINUTOS:**", "**REFLEXÃO PARA GUARDAR**");
    return {
      id: prefix, kind: "day", day, order: i,
      title: d[2].toLocaleLowerCase("pt-BR").replace(/^./, c => c.toLocaleUpperCase("pt-BR")),
      publicationRefs: [readings[i].id],
      missions: [{ id: prefix + "-exercicio", title: plain(exerciseTitle), instructions: plain(instructions.join("\n")), required: false },
        { id: prefix + "-dois-minutos", title: "VERSÃO DE DOIS MINUTOS", instructions: plain(short), required: false }],
      reflections: [{ id: prefix + "-reflexao", prompt: plain(reflection), required: false }],
      checkIns: [{ id: prefix + "-mapa", kind: "text", prompt: plain(map), required: false }],
    };
  });
  return {
    schemaVersion: "0.2", project: "espelhomeu",
    publications: [article, guide, ...readings],
    collections: [{ schemaVersion: "0.1", id: "biblioteca", slug: "biblioteca", title: "Biblioteca EspelhoMeu", publicationRefs: [article.id, guide.id] }],
    programs: [{ schemaVersion: "0.2", id: "p01-jornada", slug: guideId, kind: "journey", status: "preview", locale: "pt-BR", title, description, authors: ["EspelhoMeu"], durationDays: 7, access: { mode: "public" }, units }],
    metadata: { editorialStatus: "PREVIEW CANDIDATE / PRE-PUBLICAÇÃO", commercialApproval: false, source: masterPath },
  };
}
