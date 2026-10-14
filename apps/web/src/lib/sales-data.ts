import "server-only";
import { manifest } from "@espelhomeu/project-content";
import { productOffers } from "@espelhomeu/project-config/sales";
import type { BodySource } from "@atlashub-digital/amf-content-schema";
import { funnels } from "./sales-narratives";

// Project projection only: no complete Publication crosses the sales client boundary.
export function salesProducts() {
  return productOffers.map((offer) => {
    const publication = manifest.publications.find(
      (p) => p.id === offer.publicationRefs[0],
    );
    if (!publication) throw new Error("Missing sales publication: " + offer.id);
    const narrative = funnels[offer.id as keyof typeof funnels];
    const indexes =
      offer.id === "p05" ? [1, 7, 19] : [offer.id === "p02" ? 0 : 1];
    const samples = indexes.map((index) => {
      const chapter = publication.chapters?.[index];
      const blocks =
        chapter?.body?.format === "blocks" ? chapter.body.blocks : [];
      return {
        title: chapter?.title ?? publication.title,
        body: {
          format: "blocks",
          blocks: blocks
            .filter((b) => b.type === "paragraph" || b.type === "callout")
            .slice(0, 2),
        } as BodySource,
      };
    });
    return {
      offer,
      narrative,
      title: publication.title,
      subtitle: publication.subtitle ?? "",
      cover: publication.cover!,
      reader: "/ler/" + publication.slug,
      chapters: (publication.chapters ?? []).map((c) => ({
        id: c.id,
        title: c.title,
        part: c.part,
      })),
      extras: (publication.media ?? [])
        .filter((m) => m.kind === "document")
        .map((m) => ({ title: m.title ?? "Material complementar" })),
      samples,
    };
  });
}
export type SalesProduct = ReturnType<typeof salesProducts>[number];
