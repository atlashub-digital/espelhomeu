export type CommerceOfferId =
  | "p01"
  | "p02"
  | "p03"
  | "p04"
  | "p05"
  | "colecao";

export interface CommerceOffer {
  id: CommerceOfferId;
  title: string;
  amountMinor: number;
  currency: "brl";
  productRefs: string[];
  allowedBumpIds: CommerceOfferId[];
}

export const commerceOffers: Record<CommerceOfferId, CommerceOffer> = {
  p01: {
    id: "p01",
    title: "7 Dias Para Me Escolher",
    amountMinor: 1190,
    currency: "brl",
    productRefs: ["p01"],
    allowedBumpIds: ["p02"],
  },
  p02: {
    id: "p02",
    title: "Eu Sou Bela — Do Meu Jeito",
    amountMinor: 1990,
    currency: "brl",
    productRefs: ["p02"],
    allowedBumpIds: ["p03"],
  },
  p03: {
    id: "p03",
    title: "21 Dias — Meu Melhor Reflexo",
    amountMinor: 2990,
    currency: "brl",
    productRefs: ["p03"],
    allowedBumpIds: [],
  },
  p04: {
    id: "p04",
    title: "Recomeçar Depois dos 40",
    amountMinor: 2490,
    currency: "brl",
    productRefs: ["p04"],
    allowedBumpIds: ["p05"],
  },
  p05: {
    id: "p05",
    title: "Diário de Amor-Próprio — 30 Encontros Comigo",
    amountMinor: 2990,
    currency: "brl",
    productRefs: ["p05"],
    allowedBumpIds: ["p04"],
  },
  colecao: {
    id: "colecao",
    title: "Coleção EspelhoMeu",
    amountMinor: 7990,
    currency: "brl",
    productRefs: ["p01", "p02", "p03", "p04", "p05"],
    allowedBumpIds: [],
  },
};

export function isCommerceOfferId(value: unknown): value is CommerceOfferId {
  return typeof value === "string" && value in commerceOffers;
}

export function resolveCheckoutOffers(
  baseId: CommerceOfferId,
  bumpIds: CommerceOfferId[] = [],
) {
  const base = commerceOffers[baseId];
  const unique = [...new Set(bumpIds)];
  for (const id of unique) {
    if (!base.allowedBumpIds.includes(id))
      throw new Error("unsupported_bump");
  }
  const selected = [base, ...unique.map((id) => commerceOffers[id])];
  const seenProducts = new Set<string>();
  for (const offer of selected) {
    for (const product of offer.productRefs) {
      if (seenProducts.has(product)) throw new Error("duplicate_product");
      seenProducts.add(product);
    }
  }
  return {
    base,
    selected,
    productRefs: [...seenProducts],
    totalMinor: selected.reduce((total, offer) => total + offer.amountMinor, 0),
  };
}
