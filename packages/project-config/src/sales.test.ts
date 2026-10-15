import { describe, expect, it } from "vitest";
import { AccessPolicySchema } from "@atlashub-digital/amf-content-schema";
import manifest from "../../project-content/content/manifest.json";
import {
  salesOffers,
  productOffers,
  getSalesOffer,
  getSalesOfferByPath,
  formatOfferPrice,
  getCollectionValue,
  getAccessPresentation,
  readAttribution,
  withAttribution,
  createSalesEvent,
} from "./sales";

describe("approved S1 commercial registry", () => {
  it("keeps approved prices and enables only launch-ready one-time offers", () => {
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
    expect(
      salesOffers.filter((offer) => offer.purchaseEnabled).map((offer) => offer.id),
    ).toEqual(["p01", "p02", "p03", "p04", "p05", "colecao"]);
    expect(getSalesOffer("jornada")?.purchaseEnabled).toBe(false);
    expect(getSalesOffer("membership")?.purchaseEnabled).toBe(false);
    expect(getSalesOffer("bundle-primeiro")?.purchaseEnabled).toBe(false);
    expect(getSalesOffer("membership")?.cadence).toBe("month");
    expect(getSalesOffer("jornada")?.availability).toBe("preparing");
    expect(getSalesOffer("membership")?.availability).toBe("preparing");
    expect(formatOfferPrice(getSalesOffer("p01")!)).toMatch(/11,90/);
    expect(formatOfferPrice(getSalesOffer("membership")!)).toMatch(
      /29,90\/mês/,
    );
    expect(formatOfferPrice(getSalesOffer("bundle-voltar")!)).toBe(
      "Em preparação",
    );
  });
  it("derives collection value from current referenced offers and follows price changes", () => {
    const collection = getSalesOffer("colecao")!;
    expect(getCollectionValue(collection)).toEqual({
      productCount: 5,
      individualTotalMinor: 11650,
      collectionAmountMinor: 7990,
      savingMinor: 3660,
      currency: "BRL",
    });
    const updated = salesOffers.map((entry) =>
      entry.id === "p01" ? { ...entry, amountMinor: 1290 } : entry,
    );
    expect(getCollectionValue(collection, updated)?.savingMinor).toBe(3760);
    expect(
      getCollectionValue({ ...collection, amountMinor: 12000 })?.savingMinor,
    ).toBe(0);
  });
  it("omits incomparable, incomplete or ambiguous bundle comparisons", () => {
    const collection = getSalesOffer("colecao")!;
    const p01 = getSalesOffer("p01")!;
    for (const changed of [
      { ...p01, amountMinor: null },
      { ...p01, amountMinor: -1 },
      { ...p01, amountMinor: 1.5 },
      { ...p01, amountMinor: Number.NaN },
      { ...p01, amountMinor: Number.MAX_SAFE_INTEGER },
      { ...p01, cadence: "month" as const },
      { ...p01, currency: "EUR" as never },
    ]) {
      expect(
        getCollectionValue(
          collection,
          salesOffers.map((entry) => (entry.id === "p01" ? changed : entry)),
        ),
      ).toBeNull();
    }
    expect(
      getCollectionValue(
        collection,
        salesOffers.filter((entry) => entry.id !== "p01"),
      ),
    ).toBeNull();
    expect(
      getCollectionValue(collection, [
        ...salesOffers,
        { ...p01, id: "duplicate" },
      ]),
    ).toBeNull();
    expect(
      getCollectionValue({ ...collection, productRefs: ["p01", "p01"] }),
    ).toBeNull();
    expect(
      getCollectionValue({ ...collection, productRefs: ["p01", "missing"] }),
    ).toBeNull();
    expect(getCollectionValue({ ...collection, amountMinor: null })).toBeNull();
    expect(getCollectionValue(getSalesOffer("membership")!)).toBeNull();
    expect(getCollectionValue(getSalesOffer("jornada")!)).toBeNull();
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
