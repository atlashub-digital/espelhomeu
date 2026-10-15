// CI-only HTTP double. Never forwards a request to ARO or a payment provider.
import http from "node:http";
import { randomUUID } from "node:crypto";
export async function startMockAro() {
  const sessions = new Map(),
    keys = new Map(),
    requests = [];
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    let body;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString() || "{}");
    } catch {
      res.writeHead(400).end();
      return;
    }
    requests.push({ path: req.url, body });
    const send = (status, payload) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(payload));
    };
    if (req.url === "/v1/checkout-sessions" && req.method === "POST") {
      if (req.headers["x-aro-public-key"] !== "synthetic-public-key")
        return send(401, {});
      if (
        body.project !== "espelhomeu" ||
        ![
          "p01-br",
          "p02-br",
          "p03-br",
          "p04-br",
          "p05-br",
          "colecao-br",
        ].includes(body.offer)
      )
        return send(400, {});
      const prior = keys.get(req.headers["idempotency-key"]);
      if (prior) return send(200, prior);
      const id = randomUUID(),
        order_id = randomUUID();
      const state =
        body.payer.name === "CI Editorial QA" ? "APPROVED" : "PENDING";
      const amount = {
        "p01-br": 1190,
        "p02-br": 1990,
        "p03-br": 2990,
        "p04-br": 2490,
        "p05-br": 2990,
        "colecao-br": 7990,
      }[body.offer];
      const session = {
        id,
        order_id,
        project: body.project,
        offer: body.offer,
        state,
        amount: { amount_minor: amount, currency: "BRL" },
        checkout_secret: "synthetic-checkout-secret-" + id,
        payment: {
          kind: "PIX",
          copy_paste: "CI-ONLY-NOT-A-PAYABLE-PIX",
          qr_payload: "CI-ONLY-NOT-A-PAYABLE-PIX",
          expires_at: new Date(Date.now() + 1800000).toISOString(),
        },
      };
      sessions.set(id, { session, customer: randomUUID(), revoked: false });
      keys.set(req.headers["idempotency-key"], session);
      return send(201, session);
    }
    const entry = [...sessions.values()].find(
      (e) =>
        req.url === "/v1/checkout-sessions/" + e.session.id ||
        req.url === "/v1/orders/" + e.session.order_id,
    );
    if (entry && req.url.includes("checkout-sessions"))
      return req.headers["x-aro-checkout-secret"] ===
        entry.session.checkout_secret
        ? send(200, entry.session)
        : send(401, {});
    if (req.headers.authorization !== "Bearer synthetic-server-key-for-ci-only")
      return send(401, {});
    if (entry)
      return send(200, {
        id: entry.session.order_id,
        project: "espelhomeu",
        status: entry.session.state,
        customer_id: entry.customer,
      });
    if (req.url === "/v1/entitlements/resolve") {
      const e = [...sessions.values()].find(
        (e) => e.customer === body.customer_id,
      );
      const products =
        e?.session.offer === "colecao-br"
          ? ["p01", "p02", "p03", "p04", "p05"]
          : [e?.session.offer.replace(/-br$/, "")];
      return send(200, {
        project: "espelhomeu",
        customer_id: body.customer_id,
        entitlements: e
          ? products.map((p) => ({
              key: "espelhomeu:" + p,
              status: e.revoked ? "REVOKED" : "ACTIVE",
              source_order_id: e.session.order_id,
              starts_at: "2020-01-01T00:00:00Z",
            }))
          : [],
      });
    }
    send(404, {});
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    requests,
    setState(orderId, state) {
      const e = [...sessions.values()].find(
        (e) => e.session.order_id === orderId,
      );
      if (e) e.session.state = state;
    },
    revoke(orderId) {
      const e = [...sessions.values()].find(
        (e) => e.session.order_id === orderId,
      );
      if (e) e.revoked = true;
    },
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
