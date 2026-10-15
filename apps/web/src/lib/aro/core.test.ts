import { sameOrigin } from "./core";
import { describe, it, expect } from "vitest";
import {
  activeProductRefs,
  sealSession,
  openSession,
  offerCodes,
} from "./core";
const order = "11111111-1111-4111-8111-111111111111",
  customer = "22222222-2222-4222-8222-222222222222";
const capability = {
  id: order,
  orderId: order,
  offer: "p01-br",
  secret: "synthetic-checkout-secret",
  exp: Date.now() + 100000,
};
describe("ARO capability and entitlement boundary", () => {
  it("rejects browser-tampered, expired and differently signed capabilities", () => {
    const sealed = sealSession(capability, "synthetic-server-key");
    expect(openSession(sealed, "synthetic-server-key")).toEqual(capability);
    expect(sealed).not.toContain(capability.secret);
    expect(openSession(sealed + "a", "synthetic-server-key")).toBeNull();
    expect(openSession(sealed, "another-key")).toBeNull();
    expect(
      openSession(sealed, "synthetic-server-key", capability.exp + 1),
    ).toBeNull();
  });
  it("allows only ACTIVE unexpired rights from the proven project, customer and order", () => {
    const entitlement = {
      key: "espelhomeu:p01",
      status: "ACTIVE",
      source_order_id: order,
      starts_at: "2020-01-01T00:00:00Z",
    };
    const p = {
      project: "espelhomeu",
      customer_id: customer,
      entitlements: [entitlement],
    };
    expect(activeProductRefs(p, order, customer)).toEqual(["p01"]);
    for (const change of [
      { status: "REVOKED" },
      { status: "EXPIRED" },
      { expires_at: "2020-01-01" },
      { starts_at: "invalid" },
      { starts_at: "2099-01-01" },
      { source_order_id: customer },
    ])
      expect(
        activeProductRefs(
          { ...p, entitlements: [{ ...entitlement, ...change }] },
          order,
          customer,
        ),
      ).toEqual([]);
    expect(
      activeProductRefs({ ...p, project: "other" }, order, customer),
    ).toEqual([]);
    expect(
      activeProductRefs({ ...p, customer_id: order }, order, customer),
    ).toEqual([]);
  });
  it("maps exactly the six E7 offers without memberships", () => {
    expect(Object.values(offerCodes)).toEqual([
      "p01-br",
      "p02-br",
      "p03-br",
      "p04-br",
      "p05-br",
      "colecao-br",
    ]);
    expect(offerCodes.jornada).toBeUndefined();
  });
});

it("requires same scheme and actual HTTP host; rejects absent, malformed and foreign origins", () => {
  expect(sameOrigin("https://preview.example", "preview.example", "https:")).toBe(true);
  expect(sameOrigin("http://127.0.0.1:3000", "127.0.0.1:3000", "http:")).toBe(true);
  expect(sameOrigin("https://evil.example", "preview.example", "https:")).toBe(false);
  expect(sameOrigin("http://preview.example", "preview.example", "https:")).toBe(false);
  expect(sameOrigin(null, "preview.example", "https:")).toBe(false);
  expect(sameOrigin("invalid", "preview.example", "https:")).toBe(false);
});
