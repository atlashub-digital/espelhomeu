import { cookies } from "next/headers";
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
    let productRefs = capability ? await resolveCheckoutAccess(capability) : [];
    if (process.env.ACCESS_V1_ENABLED === "true") {
      const token = (await cookies()).get("__Host-espelho_access")?.value;
      if (token) {
        try {
          const url = new URL(process.env.ACCESS_V1_API_URL || "http://127.0.0.1:4000");
          if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(url.hostname))) throw new Error("access_configuration");
          const response = await fetch(new URL("/access/entitlements", url), { headers: { cookie: "__Host-espelho_access=" + token }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000) });
          if (response.ok) {
            const result = await response.json();
            if (Array.isArray(result.productRefs)) productRefs = [...new Set([...productRefs, ...result.productRefs.filter((p: unknown) => typeof p === "string" && /^p0[1-5]$/.test(p))])];
          }
        } catch { /* E7 continues independently when Access is unavailable. */ }
      }
    }
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
  return paidPublications[ref] ?? (/^p01-leitura-dia-[1-7]$/.test(ref) ? "p01" : null);
}
export function hasProduct(access: CommerceAccess, productRef: string) {
  return (
    access.authenticated &&
    access.productRefs.includes(productRef) &&
    access.entitlementRefs.includes("espelhomeu:" + productRef)
  );
}
