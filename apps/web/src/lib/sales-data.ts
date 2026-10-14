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
    const routes = editorialRoutes[offer.id] ?? [];
    const indexes =
      offer.id === "p01"
        ? [1, 2, 9]
        : offer.id === "p05"
          ? [1, 7, 19]
          : routes.length
            ? routes.map((route) => {
                const index =
                  publication.chapters?.findIndex(
                    (c) => c.id === route.chapterId,
                  ) ?? -1;
                if (index < 0)
                  throw new Error(
                    "Missing editorial route: " + route.chapterId,
                  );
                return index;
              })
            : [1];
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
      intentions: routes,
    };
  });
}
export type SalesProduct = ReturnType<typeof salesProducts>[number];

// Commercial routing to existing chapters, never an inferred profile or a content contract.
const editorialRoutes: Record<
  string,
  { label: string; chapterId: string; context: string }[]
> = {
  p02: [
    {
      label: "Presença",
      chapterId: "p02-capitulo-6",
      context: "Comece pela presença como expressão, para além da aparência.",
    },
    {
      label: "Estilo",
      chapterId: "p02-capitulo-3",
      context: "Explore o capítulo que relaciona estilo e história pessoal.",
    },
    {
      label: "Autenticidade",
      chapterId: "p02-capitulo-7",
      context: "Abra a leitura sobre a sua própria assinatura.",
    },
    {
      label: "Confiança nas escolhas",
      chapterId: "p02-capitulo-5",
      context: "Experimente a leitura sobre a liberdade de experimentar.",
    },
  ],
  p04: [
    {
      label: "Ter mais espaço para mim",
      chapterId: "p04-secao-4",
      context: "Abra o capítulo dedicado ao tempo que você quer para si.",
    },
    {
      label: "Explorar uma curiosidade",
      chapterId: "p04-secao-6",
      context: "Comece pelo que você ainda quer descobrir.",
    },
    {
      label: "Rever meus limites",
      chapterId: "p04-secao-7",
      context:
        "Explore a leitura sobre relações e limites que fazem sentido para você.",
    },
    {
      label: "Continuar algo importante",
      chapterId: "p04-secao-8",
      context: "Abra o próximo capítulo, com escolhas que continuam suas.",
    },
  ],
};
