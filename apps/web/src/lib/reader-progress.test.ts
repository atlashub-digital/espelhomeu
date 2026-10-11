import { expect, it } from "vitest";
import { createSessionProgressAdapter } from "./reader-progress";
it("keeps progress scoped to the adapter instance and clones writes", async () => {
  const adapter = createSessionProgressAdapter();
  const progress = {
    publicationId: "guide",
    chapterId: "one",
    completedChapterIds: ["one"],
    percentage: 50,
    updatedAt: "2026-10-11",
  };
  await adapter.save(progress);
  progress.completedChapterIds.push("two");
  expect((await adapter.load("guide"))?.completedChapterIds).toEqual(["one"]);
  expect(await createSessionProgressAdapter().load("guide")).toBeNull();
});
