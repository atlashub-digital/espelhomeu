import { ContentManifestSchema } from "@atlashub-digital/amf-content-schema";
import type { ContentManifest } from "@atlashub-digital/amf-content-schema";

export function validateProjectContent(raw: unknown): ContentManifest {
  const manifest = ContentManifestSchema.parse(raw);
  if (manifest.project !== "espelhomeu") throw new Error("Wrong project scope");
  const ids = new Set<string>(),
    slugs = new Set<string>();
  for (const p of manifest.publications) {
    if (ids.has(p.id) || slugs.has(p.slug))
      throw new Error("Duplicate publication id/slug");
    ids.add(p.id);
    slugs.add(p.slug);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug))
      throw new Error("Unsafe publication slug");
    const chapterIds = new Set<string>(),
      orders = new Set<number>();
    const mediaIds = new Set(p.media.map((m) => m.id));
    if (mediaIds.size !== p.media.length) throw new Error("Duplicate media id");
    for (const chapter of p.chapters) {
      if (chapterIds.has(chapter.id) || orders.has(chapter.order))
        throw new Error("Duplicate chapter id/order");
      chapterIds.add(chapter.id);
      orders.add(chapter.order);
      for (const placement of chapter.mediaPlacements ?? []) {
        if (!mediaIds.has(placement.mediaId))
          throw new Error("Unresolved media reference");
        // This first project renderer supports whole-chapter anchors only.
        if (placement.anchor !== chapter.id)
          throw new Error("Unsupported media anchor");
      }
    }
    for (const body of [p.body, ...p.chapters.map((c) => c.body)]) {
      if (!body) continue;
      if (body.format !== "blocks")
        throw new Error("Project preview supports validated blocks only");
      for (const block of body.blocks) {
        if (
          !["paragraph", "heading", "callout"].includes(String(block.type)) ||
          typeof block.text !== "string"
        )
          throw new Error("Unsupported project block");
      }
    }
    for (const media of p.media) {
      if (
        ["image", "document"].includes(media.kind) &&
        (!/^\/(?:marca|conteudo\/produto-01)\/[a-zA-Z0-9/_.-]+$/.test(media.assetPath ?? "") ||
          media.assetPath?.includes("..") ||
          (media.kind === "image" && !media.alt) ||
          !media.license)
      )
        throw new Error(
          "Media must have a safe local asset, provenance and image alt",
        );
      if (media.attributionRequired && !media.attribution)
        throw new Error("Missing attribution");
      for (const url of [media.assetUrl, media.embedUrl])
        if (url && !url.startsWith("https://"))
          throw new Error("Unsafe media URL");
    }
  }
  // Canonical schema intentionally strips unknown fields. Catch misplaced commerce
  // data before parsing instead of accidentally accepting discarded prices.
  function walk(value: unknown): void {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if (["price", "prices", "amount", "currency"].includes(key))
        throw new Error("Prices belong in offers, not publications");
      walk(child);
    }
  }
  walk(raw);
  return manifest;
}
