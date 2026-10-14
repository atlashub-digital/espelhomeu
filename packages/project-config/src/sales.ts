import type { AccessPolicy } from "@atlashub-digital/amf-content-schema";

/** Project commercial configuration. No payment, identity or entitlement grants. */
export interface SalesOffer {
  readonly id: string;
  readonly path: string;
  readonly title: string;
  readonly productRefs: readonly string[];
  readonly publicationRefs: readonly string[];
  readonly amountMinor: number | null;
  readonly currency: "BRL";
  readonly cadence: "once" | "month";
  readonly availability: "preview" | "preparing" | "unpriced";
  readonly purchaseEnabled: false;
  readonly accessPolicy: AccessPolicy;
  readonly crossSellIds: readonly string[];
}

const publications = {
  p01: "7-dias-para-me-escolher",
  p02: "eu-sou-bela-do-meu-jeito",
  p03: "21-dias-meu-melhor-reflexo",
  p04: "recomecar-depois-dos-40",
  p05: "diario-de-amor-proprio-30-encontros-comigo",
} as const;
export type SalesProductId = keyof typeof publications;
const allProducts = Object.keys(publications) as SalesProductId[];

function offer(
  id: string,
  path: string,
  title: string,
  productRefs: SalesProductId[],
  amountMinor: number | null,
  crossSellIds: string[],
  mode: AccessPolicy["mode"] = "one-time",
  availability: SalesOffer["availability"] = "preview",
): SalesOffer {
  return {
    id,
    path,
    title,
    productRefs,
    publicationRefs: productRefs.map((product) => publications[product]),
    amountMinor,
    currency: "BRL",
    cadence: mode === "membership" ? "month" : "once",
    availability,
    purchaseEnabled: false,
    crossSellIds,
    // Planned commercial policy only. The homologated editorial catalog is unchanged.
    accessPolicy: {
      mode,
      productRefs: [...productRefs],
      entitlementRefs: productRefs.map((product) => `espelhomeu:${product}`),
      preview: { enabled: true, chapterLimit: 1 },
    },
  };
}

export const salesOffers: readonly SalesOffer[] = [
  offer(
    "p01",
    "/7-dias-para-me-escolher",
    "7 Dias Para Me Escolher",
    ["p01"],
    1190,
    ["p02", "colecao"],
  ),
  offer(
    "p02",
    "/eu-sou-bela-do-meu-jeito",
    "Eu Sou Bela — Do Meu Jeito",
    ["p02"],
    1990,
    ["p03", "colecao"],
  ),
  offer(
    "p03",
    "/21-dias-meu-melhor-reflexo",
    "21 Dias — Meu Melhor Reflexo",
    ["p03"],
    2990,
    ["colecao", "jornada"],
  ),
  offer(
    "p04",
    "/recomecar-depois-dos-40",
    "Recomeçar Depois dos 40",
    ["p04"],
    2490,
    ["p05", "bundle-voltar", "colecao"],
  ),
  offer(
    "p05",
    "/diario-de-amor-proprio",
    "Diário de Amor-Próprio — 30 Encontros Comigo",
    ["p05"],
    2990,
    ["p04", "bundle-voltar", "colecao"],
  ),
  offer(
    "colecao",
    "/colecao",
    "Coleção EspelhoMeu",
    allProducts,
    7990,
    ["jornada"],
    "bundle",
  ),
  offer(
    "jornada",
    "/jornada",
    "Jornada EspelhoMeu",
    allProducts,
    9990,
    ["colecao"],
    "pack",
    "preparing",
  ),
  offer(
    "membership",
    "/membership",
    "EspelhoMeu contínuo",
    allProducts,
    2990,
    ["colecao"],
    "membership",
    "preparing",
  ),
  offer(
    "bundle-primeiro",
    "/colecao#primeiro-espelho",
    "Primeiro Espelho",
    ["p01", "p02"],
    null,
    ["colecao"],
    "bundle",
    "unpriced",
  ),
  offer(
    "bundle-percurso",
    "/colecao#meu-percurso",
    "Meu Percurso",
    ["p01", "p02", "p03"],
    null,
    ["colecao"],
    "bundle",
    "unpriced",
  ),
  offer(
    "bundle-voltar",
    "/colecao#voltar-a-mim",
    "Voltar a Mim",
    ["p04", "p05"],
    null,
    ["colecao"],
    "bundle",
    "unpriced",
  ),
];
export const productOffers = salesOffers.filter((entry) =>
  allProducts.includes(entry.id as SalesProductId),
);
export const getSalesOffer = (id: string) =>
  salesOffers.find((entry) => entry.id === id);
export const getSalesOfferByPath = (path: string) =>
  salesOffers.find((entry) => entry.path === path);
export function formatOfferPrice(entry: SalesOffer): string {
  if (entry.amountMinor === null) return "Em preparação";
  const price = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: entry.currency,
  }).format(entry.amountMinor / 100);
  return entry.cadence === "month" ? `${price}/mês` : price;
}

/** Current configured individual prices, never a historical or promotional reference price. */
export function getCollectionValue(
  collection: SalesOffer,
  registry: readonly SalesOffer[] = salesOffers,
): {
  productCount: number;
  individualTotalMinor: number;
  collectionAmountMinor: number;
  savingMinor: number;
  currency: SalesOffer["currency"];
} | null {
  const validAmount = (amount: number | null): amount is number =>
    amount !== null && Number.isSafeInteger(amount) && amount >= 0;
  if (
    collection.cadence !== "once" ||
    collection.accessPolicy.mode !== "bundle" ||
    !validAmount(collection.amountMinor) ||
    collection.productRefs.length < 2 ||
    new Set(collection.productRefs).size !== collection.productRefs.length
  )
    return null;

  let individualTotalMinor = 0;
  for (const ref of collection.productRefs) {
    const matches = registry.filter(
      (entry) =>
        entry.productRefs.length === 1 &&
        entry.productRefs[0] === ref &&
        entry.accessPolicy.mode === "one-time",
    );
    if (matches.length !== 1) return null;
    const individual = matches[0];
    if (!individual) return null;
    if (
      individual.cadence !== "once" ||
      individual.currency !== collection.currency ||
      !validAmount(individual.amountMinor)
    )
      return null;
    individualTotalMinor += individual.amountMinor;
    if (!Number.isSafeInteger(individualTotalMinor)) return null;
  }
  return {
    productCount: collection.productRefs.length,
    individualTotalMinor,
    collectionAmountMinor: collection.amountMinor,
    savingMinor: Math.max(0, individualTotalMinor - collection.amountMinor),
    currency: collection.currency,
  };
}

export const accessStateLabels = {
  PUBLIC: "Acesso livre",
  PREVIEW: "Amostra disponível",
  LOCKED: "Bloqueado",
  ACQUIRED: "Adquirido",
} as const;
export type SalesAccessState = keyof typeof accessStateLabels;
export function getAccessPresentation(state: SalesAccessState) {
  const descriptions = {
    PUBLIC: "Conteúdo disponível para leitura livre.",
    LOCKED: "O acesso integral depende de uma autorização válida.",
    PREVIEW: "Conheça uma amostra da experiência de leitura.",
    ACQUIRED: "Conteúdo disponível na sua Biblioteca.",
  };
  return { label: accessStateLabels[state], description: descriptions[state] };
}

const attributionKeys = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
] as const;
export type SalesAttribution = Partial<
  Record<(typeof attributionKeys)[number], string>
>;
type SearchInput =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;
// Campaign slugs only; reject URLs, emails, phone/CPF-like digits, encoded payloads and free text.
function safeCampaign(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[a-z][a-z0-9_-]{0,63}$/i.test(value) &&
    !/\d{7}/.test(value)
  );
}
export function readAttribution(search: SearchInput): SalesAttribution {
  const result: SalesAttribution = {};
  for (const key of attributionKeys) {
    const value =
      search instanceof URLSearchParams
        ? search.getAll(key).length === 1
          ? search.get(key)
          : undefined
        : search[key];
    if (safeCampaign(value)) result[key] = value;
  }
  return result;
}
export function withAttribution(
  href: string,
  attribution: SalesAttribution,
): string {
  if (!href.startsWith("/") || href.startsWith("//") || href.includes("\\"))
    return href;
  const url = new URL(href, "https://espelhomeu.invalid");
  const safe = readAttribution(attribution);
  for (const key of attributionKeys) {
    // Existing target attribution also passes the same boundary.
    const existing = url.searchParams.get(key);
    if (existing !== null && !safeCampaign(existing))
      url.searchParams.delete(key);
    if (safe[key]) url.searchParams.set(key, safe[key]);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export const salesEventNames = [
  "sales_page_view",
  "quiz_start",
  "quiz_complete",
  "sample_open",
  "offer_cta",
  "bundle_cta",
  "collection_cta",
] as const;
export type SalesEventName = (typeof salesEventNames)[number];
export interface SalesEventContext {
  offerId?: string;
  productId?: string;
  surface?: string;
}
const surfaces = [
  "home",
  "collection",
  "product",
  "offer",
  "quiz",
  "sample",
  "reader",
  "library",
  "hero",
  "sticky",
  "footer",
  "cross-sell",
  "bundle",
  "jornada",
  "membership",
];
/** Returns an inert allowlisted event; callers explicitly choose a transport later. */
export function createSalesEvent(
  name: SalesEventName,
  context: SalesEventContext,
  attribution: SalesAttribution = {},
) {
  if (!salesEventNames.includes(name))
    throw new Error("Unsupported sales event");
  const safeContext: SalesEventContext = {};
  if (context.offerId && getSalesOffer(context.offerId))
    safeContext.offerId = context.offerId;
  if (
    context.productId &&
    allProducts.includes(context.productId as SalesProductId)
  )
    safeContext.productId = context.productId;
  if (context.surface && surfaces.includes(context.surface))
    safeContext.surface = context.surface;
  return {
    name,
    projectId: "espelhomeu",
    ...safeContext,
    attribution: readAttribution(attribution),
  };
}
