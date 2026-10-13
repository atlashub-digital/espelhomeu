// Build-time source mapping only. Output uses the existing AMF Publication contract.
// Exact source boundaries let Content Ops ingest a new Guide by editing data, not React.
export function importGuide(source, recipe) {
  const plain = text => text.replace(/\*\*/g, "").replace(/\*([^*\n]+)\*/g, "$1").replace(/^> ?/gm, "").trim();
  function blocks(text) {
    return text.split(/\n\s*\n/).flatMap(part => {
      const p = part.trim();
      if (!p || p === "---") return [];
      const label = p.match(/^\[([^\]]+)\]\n([\s\S]+)$/);
      if (label) {
        if (label[1].startsWith("CALLOUT"))
          return [{ type: "callout", tone: "note", text: plain(label[2]) }];
        return [{ type: "heading", level: 3, text: label[1] }, ...blocks(label[2])];
      }
      if (/^#{1,6} /.test(p)) {
        const [line, ...rest] = p.split("\n");
        return [{ type: "heading", level: 3, text: plain(line.replace(/^#+ /, "")) }, ...blocks(rest.join("\n"))];
      }
      return [{ type: "paragraph", text: plain(p) }];
    });
  }
  const publication = structuredClone(recipe.publication);
  if (recipe.sections.length !== publication.chapters.length) throw new Error("Source/chapter mapping mismatch");
  for (const [i, section] of recipe.sections.entries()) {
    const start = source.indexOf(section.start);
    const end = source.indexOf(section.end, start + section.start.length);
    if (start < 0 || end < 0 || source.indexOf(section.start, start + 1) !== -1)
      throw new Error("Missing or ambiguous editorial boundary: " + section.start);
    publication.chapters[i].body = { format: "blocks", blocks: blocks(source.slice(start, end)) };
  }
  return publication;
}
