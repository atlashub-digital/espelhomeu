import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createPixPayment,
  getPixPayment,
  pixProviderReady,
  selectedPixProvider,
  type PixProvider,
  type PixState,
} from "../commerce/pix";
import {
  commerceOffers,
  isCommerceOfferId,
  resolveCheckoutOffers,
} from "../commerce/offers";
import type { Db } from "../db/client";
import {
  accessTokens,
  entitlements,
  orderItems,
  orders,
  paymentEvents,
} from "../db/schema";
import type { Env } from "../env";

const PixCheckoutRequest = z.object({
  offerId: z.string(),
  bumpOfferIds: z.array(z.string()).max(2).default([]),
  payerName: z.string().trim().min(2).max(100),
  payerDocument: z.string().trim().min(11).max(18),
  payerEmail: z.string().email().max(255),
  attribution: z.record(z.string(), z.string()).optional(),
});

const OrderClaimRequest = z.object({
  orderId: z.string().uuid(),
  claimSecret: z.string().min(20).max(255),
});

const allowedAttribution = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
]);

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function safeEqualHex(a: string, b: string) {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

function documentDigits(value: string) {
  return value.replace(/\D/g, "");
}

function validCpf(value: string) {
  const cpf = documentDigits(value);
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(cpf[i]) * (length + 1 - i);
    const digit = (sum * 10) % 11;
    return digit === 10 ? 0 : digit;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

function validCnpj(value: string) {
  const cnpj = documentDigits(value);
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (base: string, weights: number[]) => {
    const sum = base
      .split("")
      .reduce((total, digit, index) => total + Number(digit) * weights[index]!, 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  const d1 = calc(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc(cnpj.slice(0, 12) + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === Number(cnpj[12]) && d2 === Number(cnpj[13]);
}

function validDocument(value: string) {
  const digits = documentDigits(value);
  return digits.length === 11 ? validCpf(digits) : digits.length === 14 ? validCnpj(digits) : false;
}

async function productRefsForOrder(db: Db, orderId: string) {
  const items = await db.db
    .select({ offerId: orderItems.offerId })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
  const refs = new Set<string>();
  for (const item of items) {
    if (!isCommerceOfferId(item.offerId)) continue;
    for (const ref of commerceOffers[item.offerId].productRefs) refs.add(ref);
  }
  return [...refs];
}

async function grantOrder(db: Db, orderId: string) {
  const refs = await productRefsForOrder(db, orderId);
  for (const productRef of refs) {
    await db.db
      .insert(entitlements)
      .values({ orderId, productRef, active: true, revokedAt: null })
      .onConflictDoUpdate({
        target: [entitlements.orderId, entitlements.productRef],
        set: { active: true, revokedAt: null, grantedAt: new Date() },
      });
  }
  return refs;
}

async function revokeOrder(db: Db, orderId: string) {
  await db.db
    .update(entitlements)
    .set({ active: false, revokedAt: new Date() })
    .where(eq(entitlements.orderId, orderId));
}

async function setOrderFromPixState(
  db: Db,
  orderId: string,
  state: PixState,
  buyerEmail?: string | null,
) {
  const status =
    state === "approved"
      ? "approved"
      : state === "failed"
        ? "failed"
        : state === "canceled"
          ? "canceled"
          : state === "refunded"
            ? "refunded"
            : "pending";
  await db.db
    .update(orders)
    .set({
      status,
      updatedAt: new Date(),
      ...(buyerEmail ? { buyerEmail: buyerEmail.toLowerCase() } : {}),
    })
    .where(eq(orders.id, orderId));

  if (state === "approved") await grantOrder(db, orderId);
  if (state === "refunded") await revokeOrder(db, orderId);
  return status;
}

async function claimedOrder(db: Db, orderId: string, claimSecret: string) {
  const [order] = await db.db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!order || !safeEqualHex(order.claimSecretHash, hash(claimSecret))) return null;
  return order;
}

async function recordProviderEvent(
  db: Db,
  providerEventId: string,
  eventType: string,
  raw: string,
) {
  const inserted = await db.db
    .insert(paymentEvents)
    .values({
      providerEventId,
      eventType,
      payloadHash: hash(raw),
    })
    .onConflictDoNothing({ target: paymentEvents.providerEventId })
    .returning({ id: paymentEvents.id });
  return inserted.length > 0;
}

function verifyPixGoSignature(
  raw: string,
  timestamp: string,
  signature: string,
  secret: string,
) {
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds)) return false;
  if (Math.abs(Date.now() / 1000 - seconds) > 600) return false;
  const expected = createHmac("sha256", secret)
    .update(timestamp + "." + raw)
    .digest("hex");
  return safeEqualHex(signature, expected);
}

export function pixCommerceRoutes(
  app: FastifyInstance,
  opts: { db?: Db; env: Env },
) {
  app.post(
    "/commerce/checkout/pix",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (req, reply) => {
      if (!opts.db || !opts.env.COMMERCE_ENABLED)
        return reply.code(503).send({ ok: false, error: "commerce_unavailable" });

      const parsed = PixCheckoutRequest.safeParse(req.body);
      if (!parsed.success || !isCommerceOfferId(parsed.data.offerId))
        return reply.code(400).send({ ok: false, error: "invalid_checkout" });
      if (!validDocument(parsed.data.payerDocument))
        return reply.code(400).send({ ok: false, error: "invalid_payer_document" });

      const bumpIds = parsed.data.bumpOfferIds.filter(isCommerceOfferId);
      if (bumpIds.length !== parsed.data.bumpOfferIds.length)
        return reply.code(400).send({ ok: false, error: "invalid_bump" });

      let selection;
      try {
        selection = resolveCheckoutOffers(parsed.data.offerId, bumpIds);
      } catch {
        return reply.code(400).send({ ok: false, error: "unsupported_bump" });
      }

      const provider = selectedPixProvider(opts.env);
      if (!pixProviderReady(opts.env, provider))
        return reply.code(503).send({
          ok: false,
          error: "pix_provider_unavailable",
          provider,
        });

      const claimSecret = randomBytes(32).toString("base64url");
      const [order] = await opts.db.db
        .insert(orders)
        .values({
          provider,
          paymentMethod: "PIX",
          baseOfferId: selection.base.id,
          amountMinor: selection.totalMinor,
          currency: "BRL",
          buyerEmail: parsed.data.payerEmail.toLowerCase(),
          claimSecretHash: hash(claimSecret),
          status: "created",
        })
        .returning({ id: orders.id });
      if (!order)
        return reply.code(500).send({ ok: false, error: "order_create_failed" });

      await opts.db.db.insert(orderItems).values(
        selection.selected.map((offer) => ({
          orderId: order.id,
          offerId: offer.id,
          title: offer.title,
          amountMinor: offer.amountMinor,
        })),
      );

      try {
        const payment = await createPixPayment(opts.env, provider, {
          orderId: order.id,
          amountMinor: selection.totalMinor,
          payerName: parsed.data.payerName,
          payerDocument: parsed.data.payerDocument,
          payerEmail: parsed.data.payerEmail,
          description: "EspelhoMeu · " + selection.base.title,
        });
        await opts.db.db
          .update(orders)
          .set({
            provider: payment.provider,
            providerPaymentId: payment.providerPaymentId,
            status: payment.state === "approved" ? "approved" : "pending",
            updatedAt: new Date(),
          })
          .where(eq(orders.id, order.id));

        if (payment.state === "approved") await grantOrder(opts.db, order.id);

        return reply.code(201).send({
          ok: true,
          orderId: order.id,
          claimSecret,
          provider: payment.provider,
          providerPaymentId: payment.providerPaymentId,
          status: payment.state,
          qrCodeText: payment.qrCodeText,
          qrImage: payment.qrImage,
          expiresAt: payment.expiresAt,
          amountMinor: selection.totalMinor,
          currency: "BRL",
        });
      } catch (error) {
        await opts.db.db
          .update(orders)
          .set({ status: "failed", updatedAt: new Date() })
          .where(eq(orders.id, order.id));
        req.log.error(
          { err: error, orderId: order.id, provider },
          "PIX checkout provider failed",
        );
        return reply.code(502).send({ ok: false, error: "pix_provider_error" });
      }
    },
  );

  app.post(
    "/commerce/checkout/pix/status",
    { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } },
    async (req, reply) => {
      if (!opts.db)
        return reply.code(503).send({ ok: false, error: "commerce_unavailable" });
      const parsed = OrderClaimRequest.safeParse(req.body);
      if (!parsed.success)
        return reply.code(400).send({ ok: false, error: "invalid_status_request" });

      const order = await claimedOrder(
        opts.db,
        parsed.data.orderId,
        parsed.data.claimSecret,
      );
      if (!order)
        return reply.code(403).send({ ok: false, error: "claim_denied" });

      if (order.status === "approved")
        return reply.send({ ok: true, status: "approved" });
      if (["failed", "canceled", "refunded", "chargeback"].includes(order.status))
        return reply.send({ ok: true, status: order.status });

      if (
        !order.providerPaymentId ||
        !["pixgo", "misticpay"].includes(order.provider)
      )
        return reply.send({ ok: true, status: order.status });

      try {
        const payment = await getPixPayment(
          opts.env,
          order.provider as PixProvider,
          order.providerPaymentId,
        );
        const status = await setOrderFromPixState(
          opts.db,
          order.id,
          payment.state,
          order.buyerEmail,
        );
        return reply.send({ ok: true, status });
      } catch (error) {
        req.log.warn(
          { err: error, orderId: order.id, provider: order.provider },
          "PIX status verification failed",
        );
        return reply.send({ ok: true, status: order.status });
      }
    },
  );

  app.post(
    "/commerce/access/claim-order",
    { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (req, reply) => {
      if (!opts.db)
        return reply.code(503).send({ ok: false, error: "commerce_unavailable" });
      const parsed = OrderClaimRequest.safeParse(req.body);
      if (!parsed.success)
        return reply.code(400).send({ ok: false, error: "invalid_claim" });

      const order = await claimedOrder(
        opts.db,
        parsed.data.orderId,
        parsed.data.claimSecret,
      );
      if (!order)
        return reply.code(403).send({ ok: false, error: "claim_denied" });
      if (order.status !== "approved")
        return reply.code(202).send({ ok: false, status: order.status });

      const productRefs = await grantOrder(opts.db, order.id);
      const token = randomBytes(32).toString("base64url");
      const expiresAt = new Date(
        Date.now() + opts.env.ACCESS_TOKEN_DAYS * 24 * 60 * 60 * 1000,
      );
      await opts.db.db.insert(accessTokens).values({
        orderId: order.id,
        tokenHash: hash(token),
        expiresAt,
      });
      return reply.send({
        ok: true,
        accessToken: token,
        offerId: order.baseOfferId,
        productRefs,
        entitlementRefs: productRefs.map((ref) => "espelhomeu:" + ref),
        expiresAt: expiresAt.toISOString(),
      });
    },
  );

  app.register(async (webhook) => {
    webhook.removeContentTypeParser("application/json");
    webhook.addContentTypeParser(
      "application/json",
      { parseAs: "buffer" },
      (_request, body, done) => done(null, body),
    );

    webhook.post("/commerce/webhooks/pixgo", async (req, reply) => {
      if (!opts.db || !opts.env.PIXGO_WEBHOOK_SECRET)
        return reply.code(503).send({ ok: false });
      if (!Buffer.isBuffer(req.body))
        return reply.code(400).send({ ok: false });

      const raw = req.body.toString("utf8");
      const timestamp = req.headers["x-webhook-timestamp"];
      const signature = req.headers["x-webhook-signature"];
      if (
        typeof timestamp !== "string" ||
        typeof signature !== "string" ||
        !verifyPixGoSignature(
          raw,
          timestamp,
          signature,
          opts.env.PIXGO_WEBHOOK_SECRET,
        )
      )
        return reply.code(401).send({ ok: false });

      let payload: Record<string, any>;
      try {
        payload = JSON.parse(raw) as Record<string, any>;
      } catch {
        return reply.code(400).send({ ok: false });
      }
      const event = String(payload.event ?? req.headers["x-webhook-event"] ?? "");
      const data =
        payload.data && typeof payload.data === "object" ? payload.data : payload;
      const paymentId = String(data.payment_id ?? "");
      const externalId = String(data.external_id ?? "");
      if (!paymentId && !externalId)
        return reply.code(400).send({ ok: false });

      const providerEventId =
        "pixgo:" + (event || "event") + ":" + (paymentId || externalId);
      const [seen] = await opts.db.db
        .select({ id: paymentEvents.id })
        .from(paymentEvents)
        .where(eq(paymentEvents.providerEventId, providerEventId))
        .limit(1);
      if (seen) return reply.send({ ok: true, duplicate: true });

      const orderByExternal =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          externalId,
        )
          ? (
              await opts.db.db
                .select()
                .from(orders)
                .where(and(eq(orders.provider, "pixgo"), eq(orders.id, externalId)))
                .limit(1)
            )[0]
          : undefined;
      const orderByPayment =
        !orderByExternal && paymentId
          ? (
              await opts.db.db
                .select()
                .from(orders)
                .where(
                  and(
                    eq(orders.provider, "pixgo"),
                    eq(orders.providerPaymentId, paymentId),
                  ),
                )
                .limit(1)
            )[0]
          : undefined;
      const order = orderByExternal ?? orderByPayment;
      if (!order) {
        await recordProviderEvent(opts.db, providerEventId, event, raw);
        return reply.send({ ok: true, ignored: true });
      }

      const state: PixState =
        event === "payment.completed"
          ? "approved"
          : event === "payment.refunded"
            ? "refunded"
            : event === "payment.expired"
              ? "canceled"
              : "pending";
      await setOrderFromPixState(opts.db, order.id, state, order.buyerEmail);
      await recordProviderEvent(opts.db, providerEventId, event, raw);
      return reply.send({ ok: true });
    });

    webhook.post("/commerce/webhooks/misticpay", async (req, reply) => {
      if (!opts.db || !Buffer.isBuffer(req.body))
        return reply.code(400).send({ ok: false });

      const raw = req.body.toString("utf8");
      let payload: Record<string, any>;
      try {
        payload = JSON.parse(raw) as Record<string, any>;
      } catch {
        return reply.code(400).send({ ok: false });
      }
      const transactionId = String(payload.transactionId ?? "");
      if (!transactionId)
        return reply.code(400).send({ ok: false });

      const [order] = await opts.db.db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.provider, "misticpay"),
            eq(orders.providerPaymentId, transactionId),
          ),
        )
        .limit(1);
      if (!order) return reply.send({ ok: true, ignored: true });

      // MisticPay webhook is treated as a signal. Verify the provider state by API
      // before changing money/entitlement state.
      try {
        const verified = await getPixPayment(
          opts.env,
          "misticpay",
          transactionId,
        );
        const providerEventId =
          "misticpay:" + transactionId + ":" + verified.state;
        const [seen] = await opts.db.db
          .select({ id: paymentEvents.id })
          .from(paymentEvents)
          .where(eq(paymentEvents.providerEventId, providerEventId))
          .limit(1);
        if (seen) return reply.send({ ok: true, duplicate: true });

        await setOrderFromPixState(
          opts.db,
          order.id,
          verified.state,
          order.buyerEmail,
        );
        await recordProviderEvent(
          opts.db,
          providerEventId,
          "misticpay." + verified.state,
          raw,
        );
        return reply.send({ ok: true });
      } catch (error) {
        req.log.warn(
          { err: error, orderId: order.id },
          "MisticPay webhook status verification failed",
        );
        return reply.code(503).send({ ok: false, retry: true });
      }
    });
  });
}
