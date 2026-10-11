import { expect, it } from "vitest";
import manifest from "../../../project.manifest.json";
import { project, enabled } from "./index";
it("keeps unsupported and paid modules disabled and records the blocked gate", () => {
  expect(project.id).toBe("espelhomeu");
  expect(enabled("library")).toBe(true);
  expect(enabled("programs")).toBe(false);
  expect(enabled("commerce")).toBe(false);
  expect(manifest.gate.contentReady).toBe(false);
  expect(manifest.amf.contentSchema).toMatch(/^[a-f0-9]{40}$/);
  expect(manifest.amf.experienceCore).toMatch(/^[a-f0-9]{40}$/);
});
