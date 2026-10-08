import { describe, expect, it } from "vitest";
import { WAITLIST_CONSENT_VERSION, WaitlistSignup } from "./waitlist";

const valid = {
  email: "  Ana@Exemplo.PT ",
  market: "PT",
  adult: true,
  consent: true,
  consentVersion: WAITLIST_CONSENT_VERSION,
};

describe("WaitlistSignup", () => {
  it("normaliza o email", () => {
    expect(WaitlistSignup.parse(valid).email).toBe("ana@exemplo.pt");
  });

  it("exige declaração de 18+ e consentimento", () => {
    expect(WaitlistSignup.safeParse({ ...valid, adult: false }).success).toBe(false);
    expect(WaitlistSignup.safeParse({ ...valid, consent: false }).success).toBe(false);
  });

  it("rejeita emails inválidos", () => {
    expect(WaitlistSignup.safeParse({ ...valid, email: "ana@" }).success).toBe(false);
  });
});
