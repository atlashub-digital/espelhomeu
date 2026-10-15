import { expect, it } from "vitest";
import manifest from "../../../project.manifest.json";
import { project, enabled } from "./index";
it("records editorial homologation with commerce module staged but SALES READY false", () => {
  expect(project.id).toBe("espelhomeu");
  expect(enabled("library")).toBe(true);
  expect(enabled("programs")).toBe(true);
  expect(enabled("commerce")).toBe(true);
  expect(manifest.gate.contentReady).toBe(true);
  expect(manifest.gate.salesReady).toBe(false);
  // Fase 3: pins deixaram de ser SHAs git e passaram a artifacts do registry
  expect(manifest.amf.contentSchema).toMatch(/@atlashub-digital\/amf-content-schema@0\.2\.0/);
  expect(manifest.amf.experienceCore).toMatch(/@atlashub-digital\/amf-experience-core@0\.2\.1/);
});
