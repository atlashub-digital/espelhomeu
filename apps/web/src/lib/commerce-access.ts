import "server-only";
import { currentCapability, resolveCheckoutAccess } from "./aro/client";
export interface CommerceAccess {
  authenticated: boolean;
  productRefs: string[];
  entitlementRefs: string[];
}
export async function getCommerceAccess(): Promise<CommerceAccess> {
  try {
    const capability = await currentCapability();
    const productRefs = capability
      ? await resolveCheckoutAccess(capability)
      : [];
    return {
      authenticated: productRefs.length > 0,
      productRefs,
      entitlementRefs: productRefs.map((p) => "espelhomeu:" + p),
    };
  } catch {
    return { authenticated: false, productRefs: [], entitlementRefs: [] };
  }
}
const paidPublications: Record<string, string> = {
  "7-dias-para-me-escolher": "p01",
  "eu-sou-bela-do-meu-jeito": "p02",
  "21-dias-meu-melhor-reflexo": "p03",
  "recomecar-depois-dos-40": "p04",
  "diario-de-amor-proprio-30-encontros-comigo": "p05",
};
export function requiredProductForPublication(ref: string) {
  return paidPublications[ref] ?? null;
}
export function hasProduct(access: CommerceAccess, productRef: string) {
  return (
    access.authenticated &&
    access.productRefs.includes(productRef) &&
    access.entitlementRefs.includes("espelhomeu:" + productRef)
  );
}
