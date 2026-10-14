import { describe, expect, it } from "vitest";
import { AccessPolicySchema } from "@atlashub-digital/amf-content-schema";
import manifest from "../../project-content/content/manifest.json";
import {
  salesOffers,
  productOffers,
  getSalesOffer,
  getSalesOfferByPath,
  formatOfferPrice,
  getAccessPresentation,
  readAttribution,
  withAttribution,
  createSalesEvent,
} from "./sales";

describe("approved S1 commercial registry", () => {
  it("keeps approved prices, unapproved bundles and disabled fulfillment explicit", () => {
    expect(
      Object.fromEntries(
        salesOffers.map((offer) => [offer.id, offer.amountMinor]),
      ),
    ).toEqual({
      p01: 1190,
      p02: 1990,
      p03: 2990,
      p04: 2490,
      p05: 2990,
      colecao: 7990,
      jornada: 9990,
      membership: 2990,
      "bundle-primeiro": null,
      "bundle-percurso": null,
      "bundle-voltar": null,
    });
    expect(salesOffers.every((offer) => offer.purchaseEnabled === false)).toBe(
      true,
    );
    expect(getSalesOffer("membership")?.cadence).toBe("month");
    expect(getSalesOffer("jornada")?.availability).toBe("preparing");
    expect(getSalesOffer("membership")?.availability).toBe("preparing");
    expect(formatOfferPrice(getSalesOffer("p01")!)).toMatch(/11,90/);
    expect(formatOfferPrice(getSalesOffer("membership")!)).toMatch(
      /29,90\/mês/,
    );
    expect(formatOfferPrice(getSalesOffer("bundle-voltar")!)).toBe(
      "Preço em definição",
    );
  });
  it("resolves catalog and cross-sell references without changing AMF contracts", () => {
    expect(productOffers).toHaveLength(5);
    expect(new Set(salesOffers.map((offer) => offer.id)).size).toBe(
      salesOffers.length,
    );
    expect(new Set(salesOffers.map((offer) => offer.path)).size).toBe(
      salesOffers.length,
    );
    for (const offer of salesOffers) {
      expect(AccessPolicySchema.safeParse(offer.accessPolicy).success).toBe(
        true,
      );
      expect(getSalesOfferByPath(offer.path)).toBe(offer);
      for (const ref of offer.publicationRefs)
        expect(
          manifest.publications.some((publication) => publication.id === ref),
        ).toBe(true);
      for (const ref of offer.crossSellIds)
        expect(getSalesOffer(ref)).toBeDefined();
    }
    expect(getSalesOffer("missing")).toBeUndefined();
    expect(getSalesOfferByPath("/missing")).toBeUndefined();
    expect(getAccessPresentation("PUBLIC").label).toBe("Acesso livre");
    expect(getAccessPresentation("PREVIEW").label).toBe("Amostra disponível");
    expect(getAccessPresentation("LOCKED").label).toBe("Bloqueado");
    expect(getAccessPresentation("ACQUIRED").label).toBe("Adquirido");
  });
});

describe("explicit campaign attribution without personal answers", () => {
  it("preserves four campaign slugs and existing internal query/hash", () => {
    const attribution = readAttribution(
      new URLSearchParams(
        "utm_source=instagram&utm_medium=social&utm_campaign=colecao-2026&utm_content=hero_01&email=reader@example.com",
      ),
    );
    expect(attribution).toEqual({
      utm_source: "instagram",
      utm_medium: "social",
      utm_campaign: "colecao-2026",
      utm_content: "hero_01",
    });
    const linked = new URL(
      withAttribution(
        "/ler/7-dias-para-me-escolher?capitulo=2#leitura",
        attribution,
      ),
      "https://example.com",
    );
    expect(linked.searchParams.get("capitulo")).toBe("2");
    expect(linked.searchParams.get("utm_content")).toBe("hero_01");
    expect(linked.hash).toBe("#leitura");
    for (const href of [
      "https://other.test/path",
      "//other.test/path",
      "mailto:a@b.test",
      "/\\other.test/path",
    ])
      expect(withAttribution(href, attribution)).toBe(href);
  });
  it("rejects free text, email, encoded values, duplicated arrays and identifier-like digits", () => {
    expect(
      readAttribution({
        utm_source: "reader@example.com",
        utm_medium: ["social", "email"],
        utm_campaign: "meu nome aqui",
        utm_content: "cpf12345678901",
      }),
    ).toEqual({});
    expect(
      readAttribution(
        new URLSearchParams("utm_source=social&utm_source=email"),
      ),
    ).toEqual({});
    expect(
      readAttribution({
        utm_source: "a".repeat(65),
        utm_campaign: "%40private",
      }),
    ).toEqual({});
    expect(
      withAttribution("/colecao?utm_source=reader%40example.com#oferta", {}),
    ).toBe("/colecao#oferta");
  });
  it("emits only explicit event fields, never quiz answers or arbitrary runtime properties", () => {
    const context = {
      offerId: "p01",
      productId: "p01",
      surface: "quiz",
      answers: ["private reflection"],
      email: "reader@example.com",
    };
    expect(
      createSalesEvent("quiz_complete", context, { utm_source: "instagram" }),
    ).toEqual({
      name: "quiz_complete",
      projectId: "espelhomeu",
      offerId: "p01",
      productId: "p01",
      surface: "quiz",
      attribution: { utm_source: "instagram" },
    });
    expect(
      createSalesEvent("sample_open", {
        offerId: "unknown",
        productId: "email@example.com",
        surface: "private text",
      }),
    ).toEqual({
      name: "sample_open",
      projectId: "espelhomeu",
      attribution: {},
    });
    expect(() => createSalesEvent("purchase" as never, {})).toThrow(
      "Unsupported sales event",
    );
  });
});
