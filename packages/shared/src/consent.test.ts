import { describe, expect, it } from "vitest";
import { ConsentRecord, isAdult } from "./consent";

describe("isAdult", () => {
  const now = new Date("2026-10-06T00:00:00Z");
  it("aceita quem já fez 18 de certeza", () => {
    expect(isAdult(2007, now)).toBe(true);
  });
  it("recusa quem pode ainda não ter 18", () => {
    expect(isAdult(2008, now)).toBe(false);
  });
});

describe("ConsentRecord", () => {
  it("rejeita finalidade desconhecida", () => {
    expect(() =>
      ConsentRecord.parse({ purpose: "beauty_score", granted: true, textVersion: "v1", recordedAt: now() }),
    ).toThrow();
  });
});

function now() {
  return new Date().toISOString();
}
