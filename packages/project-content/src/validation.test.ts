import { describe, expect, it, vi } from "vitest";
import { ContentManifestSchema } from "@atlashub-digital/amf-content-schema";
import { conservativeAccessResolver, createJourneyModel, authorizeJourney } from "@atlashub-digital/amf-experience-core";
import raw from "../content/manifest.json";
import { validateProjectContent } from "./validation";
import { accessiblePublication, accessibleJourney, catalog, contentSource } from "./index";

describe("Produto 01 preview release", () => {
  it("validates real canonical Article, complete Guide and seven-day Journey", () => {
    const m = validateProjectContent(raw);
    expect(m.schemaVersion).toBe("0.2");
    expect(m.publications.slice(0, 2).map(p => p.type)).toEqual(["article", "guide"]);
    expect(m.publications.every(p => p.schemaVersion === "0.2" && p.status === "preview")).toBe(true);
    expect(m.publications[1]!.chapters).toHaveLength(10);
    const journey = createJourneyModel(m, "p01-jornada", "espelhomeu")!;
    expect(journey.units.map(u => u.unit.kind === "day" && u.unit.day)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(journey.units.map(u => u.unit.title)).toEqual(["Escutar", "Reconhecer", "Respeitar", "Escolher referências", "Criar espaço", "Experimentar", "Continuar"]);
    for (const [i, unit] of journey.units.entries()) {
      expect(unit.publications).toHaveLength(1);
      // Daily text is the same structural projection as the Guide chapter.
      expect(unit.publications[0]!.chapters[0]!.body).toEqual(m.publications[1]!.chapters[i + 1]!.body);
      expect(unit.unit.missions).toHaveLength(2);
      expect(unit.unit.reflections).toHaveLength(1);
      expect(unit.unit.checkIns).toHaveLength(1);
      expect([...unit.unit.missions, ...unit.unit.reflections, ...unit.unit.checkIns].every(a => !a.required)).toBe(true);
    }
  });
  it("resolves official cover, seven base images and workbook without Drive runtime", () => {
    const m = validateProjectContent(raw);
    const guide = m.publications[1]!;
    expect(guide.media).toHaveLength(9);
    expect(guide.cover).toBe("/conteudo/produto-01/capa.jpg");
    expect(guide.media.find(media => media.assetPath === guide.cover)?.kind).toBe("image");
    for (let i = 0; i < 7; i++) {
      const placement = guide.chapters[i + 1]!.mediaPlacements![0]!;
      const media = guide.media.find(item => item.id === placement.mediaId)!;
      expect(media.assetPath).toBe("/conteudo/produto-01/dia-" + String(i + 1).padStart(2, "0") + ".jpg");
      expect(media.alt).toBeTruthy();
      expect(m.publications[i + 2]!.media).toEqual([media]);
      expect(m.publications[i + 2]!.chapters[0]!.mediaPlacements).toEqual([placement]);
    }
    expect(guide.media.find(media => media.id === "p01-workbook")?.kind).toBe("document");
    const unsafe = structuredClone(raw);
    unsafe.publications[1]!.media[0]!.assetPath = "/conteudo/produto-01/../private.jpg";
    expect(() => validateProjectContent(unsafe)).toThrow();
  });
  it("rejects unresolved references, duplicate orders and incomplete seven-day content", () => {
    const broken = structuredClone(raw);
    broken.programs[0]!.units[0]!.publicationRefs = ["missing"];
    expect(ContentManifestSchema.safeParse(broken).success).toBe(false);
    const duplicate = structuredClone(raw);
    duplicate.programs[0]!.units[1]!.order = 0;
    expect(ContentManifestSchema.safeParse(duplicate).success).toBe(false);
    const incomplete = structuredClone(raw);
    incomplete.programs[0]!.units.pop();
    expect(ContentManifestSchema.safeParse(incomplete).success).toBe(false);
  });
  it("rejects misplaced prices, duplicate slugs and unsupported content", () => {
    const priced = structuredClone(raw);
    Object.assign(priced.publications[0]!, { price: 9 });
    expect(() => validateProjectContent(priced)).toThrow();
    const duplicate = structuredClone(raw);
    duplicate.publications[1]!.slug = duplicate.publications[0]!.slug;
    expect(() => validateProjectContent(duplicate)).toThrow();
    const unsafe = structuredClone(raw);
    unsafe.publications[0]!.chapters[0]!.body.blocks[0]!.type = "html";
    expect(() => validateProjectContent(unsafe)).toThrow();
  });
  it("resolves real Publications and Programs, rejects missing and draft content", async () => {
    expect((await contentSource.getPublication("7-dias-para-me-escolher"))?.type).toBe("guide");
    expect((await contentSource.getProgram("p01-jornada"))?.durationDays).toBe(7);
    expect((await accessibleJourney("7-dias-para-me-escolher"))?.allowed).toBe(true);
    expect(await accessiblePublication("missing")).toBeNull();
    expect(await accessibleJourney("missing")).toBeNull();
    const spy = vi.spyOn(contentSource, "getPublication").mockResolvedValue({
      ...validateProjectContent(raw).publications[0]!, status: "draft",
    });
    try { expect(await accessiblePublication(raw.publications[0]!.id)).toBeNull(); }
    finally { spy.mockRestore(); }
  });
  it("shows the curated Article and Guide without duplicating daily projections in Library", async () => {
    const items = await catalog();
    expect(items.map(p => p.id)).toEqual(["uma-pausa-que-tambem-e-sua", "7-dias-para-me-escolher"]);
    for (const p of items) {
      expect(p).not.toHaveProperty("chapters");
      expect(p).not.toHaveProperty("body");
    }
    expect(JSON.stringify(raw)).not.toContain("R$");
    expect(JSON.stringify(raw)).not.toContain("MEDIA BRIEF");
  });
  it("strips content at denied Publication and Journey boundaries", async () => {
    const fixture = validateProjectContent(raw).publications[0]!;
    const spy = vi.spyOn(contentSource, "getPublication").mockResolvedValue({ ...fixture, access: { mode: "free-account" } });
    try {
      const result = await accessiblePublication(fixture.id);
      expect(result?.allowed).toBe(false);
      expect(result?.publication).not.toHaveProperty("body");
      expect(result?.publication).not.toHaveProperty("chapters");
    } finally { spy.mockRestore(); }
    const model = createJourneyModel(raw, "p01-jornada", "espelhomeu")!;
    model.units[0]!.publications[0]!.access = { mode: "free-account" };
    const result = await authorizeJourney(model, { authenticated: false });
    expect(result.allowed).toBe(false);
    expect(result).not.toHaveProperty("model");
    expect(JSON.stringify(result)).not.toContain("O celular vibra");
  });
  it("denies anonymous free-account and commercial access modes", async () => {
    for (const mode of ["free-account", "one-time", "bundle", "pack", "membership", "subscription", "manual-grant", "lead-gate", "campaign-reward"] as const)
      expect((await conservativeAccessResolver.resolve({ mode }, { authenticated: false })).allowed).toBe(false);
  });
});
