import { validateProjectContent } from "./validation";
import type { AccessContext } from "@atlashub-digital/amf-experience-core";
import {
  conservativeAccessResolver, createManifestContentSource, loadJourneyModel, authorizeJourney,
} from "@atlashub-digital/amf-experience-core";
import raw from "../content/manifest.json";

export const manifest = validateProjectContent(raw);
export const contentSource = createManifestContentSource(manifest, "espelhomeu-git-json");
const visible = (status: string) => ["preview", "published"].includes(status);
// Track B supplies verified identity/entitlements; preview defaults to anonymous.
export async function accessiblePublication(
  ref: string, context: AccessContext = { authenticated: false },
) {
  const publication = await contentSource.getPublication(ref);
  if (!publication || !visible(publication.status)) return null;
  const decision = await conservativeAccessResolver.resolve(publication.access, context);
  return decision.allowed
    ? { allowed: true as const, publication, decision }
    : { allowed: false as const, publication: { id: publication.id, title: publication.title }, decision };
}
export async function catalog() {
  const selected = new Set(manifest.collections.find(c => c.id === "biblioteca")?.publicationRefs);
  return manifest.publications
    .filter(p => visible(p.status) && selected.has(p.id))
    .map(({ body: _body, chapters: _chapters, media: _media, ...summary }) => summary);
}
export async function programCatalog() {
  return (await contentSource.listPrograms())
    .filter(p => visible(p.status))
    .map(({ units: _units, ...summary }) => summary);
}
export async function accessibleJourney(
  ref: string, context: AccessContext = { authenticated: false },
) {
  const model = await loadJourneyModel(contentSource, ref, manifest.project);
  if (!model || !visible(model.program.status) ||
      model.units.some(u => u.publications.some(p => !visible(p.status)))) return null;
  // Includes every referenced Publication policy; denied results carry no content.
  return authorizeJourney(model, context);
}
