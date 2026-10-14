import "server-only";
import { cookies } from "next/headers";

export interface CommerceAccess {
  authenticated: boolean;
  productRefs: string[];
  entitlementRefs: string[];
}

function apiBase() {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(
    /\/$/,
    "",
  );
}

export async function getCommerceAccess(): Promise<CommerceAccess> {
  const token = (await cookies()).get("espelho_access")?.value;
  if (!token)
    return { authenticated: false, productRefs: [], entitlementRefs: [] };
  try {
    const response = await fetch(apiBase() + "/commerce/access/resolve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
      cache: "no-store",
    });
    if (!response.ok)
      return { authenticated: false, productRefs: [], entitlementRefs: [] };
    const payload = (await response.json()) as Partial<CommerceAccess>;
    return {
      authenticated: payload.authenticated === true,
      productRefs: Array.isArray(payload.productRefs)
        ? payload.productRefs.filter((value): value is string => typeof value === "string")
        : [],
      entitlementRefs: Array.isArray(payload.entitlementRefs)
        ? payload.entitlementRefs.filter((value): value is string => typeof value === "string")
        : [],
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
    access.productRefs.includes(productRef) ||
    access.entitlementRefs.includes("espelhomeu:" + productRef)
  );
}
