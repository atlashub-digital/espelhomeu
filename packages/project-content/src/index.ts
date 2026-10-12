import { validateProjectContent } from "./validation";
import type {
  ContentSource,
  AccessContext,
} from "@atlashub-digital/amf-experience-core";
import {
  conservativeAccessResolver,
  findPublication,
} from "@atlashub-digital/amf-experience-core";
import raw from "../content/manifest.json";

export const manifest = validateProjectContent(raw);
export const contentSource: ContentSource = {
  id: "espelhomeu-git-json",
  async getManifest() {
    return manifest;
  },
  async getPublication(ref) {
    return findPublication(manifest, ref);
  },
};
// Anonymous by default. Track B must provide a server-verified session/entitlement
// adapter. Never trust URL parameters, client storage or simulated purchases.
export async function accessiblePublication(
  ref: string,
  context: AccessContext = { authenticated: false },
) {
  const publication = await contentSource.getPublication(ref);
  if (!publication || !["preview", "published"].includes(publication.status))
    return null;
  const decision = await conservativeAccessResolver.resolve(
    publication.access,
    context,
  );
  return decision.allowed
    ? { allowed: true as const, publication, decision }
    : {
        allowed: false as const,
        publication: { id: publication.id, title: publication.title },
        decision,
      };
}
export async function catalog() {
  return manifest.publications
    .filter((p) => ["preview", "published"].includes(p.status))
    .map(
      ({ body: _body, chapters: _chapters, media: _media, ...summary }) =>
        summary,
    );
}
