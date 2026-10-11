import type {
  ReaderProgress,
  ReaderProgressAdapter,
} from "@atlashub/amf-experience-core";

// Deliberately ephemeral: no cookies, localStorage, reflections or account identity.
// Track B can inject a project-scoped, consent-aware API adapter later.
export function createSessionProgressAdapter(): ReaderProgressAdapter {
  const values = new Map<string, ReaderProgress>();
  return {
    async load(id) {
      return values.get(id) ?? null;
    },
    async save(progress) {
      values.set(progress.publicationId, structuredClone(progress));
    },
  };
}
