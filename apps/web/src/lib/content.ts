import "server-only";
import {
  accessiblePublication as baseAccessiblePublication,
  accessibleJourney as baseAccessibleJourney,
  catalog,
  programCatalog,
} from "@espelhomeu/project-content";
import {
  getCommerceAccess,
  hasProduct,
  requiredProductForPublication,
} from "./commerce-access";

export { catalog, programCatalog };

export async function accessiblePublication(ref: string) {
  const access = await getCommerceAccess();
  const result = await baseAccessiblePublication(ref, access as never);
  if (!result) return null;
  if (process.env.COMMERCE_ACCESS_ENFORCED !== "true") return result;
  const publicationRef =
    "slug" in result.publication && typeof result.publication.slug === "string"
      ? result.publication.slug
      : result.publication.id;
  const required =
    requiredProductForPublication(ref) ??
    requiredProductForPublication(publicationRef);
  if (required && !hasProduct(access, required))
    return {
      allowed: false as const,
      publication: {
        id: result.publication.id,
        title: result.publication.title,
      },
      decision: { allowed: false, reason: "entitlement_required" },
    };
  return result;
}

export async function accessibleJourney(ref: string) {
  const access = await getCommerceAccess();
  const result = await baseAccessibleJourney(ref, access as never);
  if (!result) return null;
  if (process.env.COMMERCE_ACCESS_ENFORCED !== "true") return result;
  if (ref === "7-dias-para-me-escolher" && !hasProduct(access, "p01"))
    return {
      allowed: false as const,
      decision: { allowed: false, reason: "entitlement_required" },
    } as unknown as typeof result;
  return result;
}
