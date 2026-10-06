import { describe, expect, it } from "vitest";
import { normalizeApiUrl } from "./api";

describe("normalizeApiUrl", () => {
  it("acrescenta https quando falta o esquema", () => {
    expect(normalizeApiUrl("api.espelho.lia.doctor")).toBe("https://api.espelho.lia.doctor");
  });
  it("mantém o esquema e remove a barra final", () => {
    expect(normalizeApiUrl("http://localhost:4000/")).toBe("http://localhost:4000");
  });
  it("usa localhost quando não está definida", () => {
    expect(normalizeApiUrl(undefined)).toBe("http://localhost:4000");
  });
});
