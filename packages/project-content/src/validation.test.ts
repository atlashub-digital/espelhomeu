import { describe, expect, it, vi } from "vitest";
import { PublicationSchema } from "@atlashub/amf-content-schema";
import { conservativeAccessResolver } from "@atlashub/amf-experience-core";
import raw from "../content/manifest.json";
import { validateProjectContent } from "./validation";
import { accessiblePublication, catalog, contentSource } from "./index";

describe("project content release policy", () => {
  it("validates every supported fixture against pinned AMF", () => {
    expect(validateProjectContent(raw).publications.map((p) => p.type)).toEqual(
      ["essay", "guide"],
    );
  });
  it("does not mislabel an essay as unsupported Article", () => {
    expect(
      PublicationSchema.safeParse({ ...raw.publications[0], type: "article" })
        .success,
    ).toBe(false);
  });
  it("rejects misplaced prices, duplicate slugs, unresolved media and unsupported bodies", () => {
    const priced = structuredClone(raw);
    Object.assign(priced.publications[0]!, { price: 9 });
    expect(() => validateProjectContent(priced)).toThrow(/Prices/);
    const duplicate = structuredClone(raw);
    duplicate.publications[1]!.slug = duplicate.publications[0]!.slug;
    expect(() => validateProjectContent(duplicate)).toThrow(/Duplicate/);
    const broken = structuredClone(raw);
    broken.publications[1]!.chapters[0]!.mediaPlacements![0]!.mediaId =
      "missing";
    expect(() => validateProjectContent(broken)).toThrow(/reference/);
    const unsafe = structuredClone(raw);
    unsafe.publications[0]!.chapters[0]!.body.blocks[0]!.type = "html";
    expect(() => validateProjectContent(unsafe)).toThrow(/Unsupported/);
  });
  it("finds publications by id and slug, rejects unknown refs", async () => {
    expect(
      (await contentSource.getPublication("um-reflexo-mais-gentil"))?.type,
    ).toBe("guide");
    expect(await accessiblePublication("missing")).toBeNull();
  });
  it("does not expose bodies in catalog metadata", async () => {
    expect(JSON.stringify(await catalog())).not.toContain(
      "Não precisa decidir tudo hoje",
    );
    expect((await catalog())[0]).not.toHaveProperty("chapters");
  });
  it("strips the body at the denied access boundary", async () => {
    const fixture = validateProjectContent(raw).publications[0]!;
    const spy = vi
      .spyOn(contentSource, "getPublication")
      .mockResolvedValue({ ...fixture, access: { mode: "free-account" } });
    try {
      const result = await accessiblePublication(fixture.id);
      expect(result?.allowed).toBe(false);
      expect(result?.publication).not.toHaveProperty("body");
      expect(result?.publication).not.toHaveProperty("chapters");
      expect(JSON.stringify(result)).not.toContain("Hoje, reserve um momento");
    } finally {
      spy.mockRestore();
    }
  });
  it("denies anonymous free-account and every commercial access mode", async () => {
    for (const mode of [
      "free-account",
      "one-time",
      "bundle",
      "pack",
      "membership",
      "subscription",
      "manual-grant",
      "lead-gate",
      "campaign-reward",
    ] as const)
      expect(
        (
          await conservativeAccessResolver.resolve(
            { mode },
            { authenticated: false },
          )
        ).allowed,
      ).toBe(false);
    expect(
      (
        await conservativeAccessResolver.resolve(
          { mode: "one-time", productRefs: ["x"] },
          { authenticated: true, productRefs: ["x"] },
        )
      ).allowed,
    ).toBe(false);
  });
});
