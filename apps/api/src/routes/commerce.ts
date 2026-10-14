import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { and, eq, gt, inArray } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Db } from "../db/client";
import {
  accessTokens,
  entitlements,
  orderItems,
  orders,
  paymentEvents,
} from "../db/schema";
import type { Env } from "../env";
import {
  commerceOffers,
  isCommerceOfferId,
  resolveCheckoutOffers,
  type CommerceOfferId,
} from "../commerce/offers";
import {
  stripeGet,
  stripePostForm,
  type StripeCheckoutSession,
  type StripeEvent,
} from "../commerce/stripe";

const CheckoutRequest = z.object({
  offerId: z.string(),
  bumpOfferIds: z.array(z.string()).max(2).default([]),
  attribution: z.record(z.string(), z.string()).optional(),
});
const ClaimRequest = z.object({
  sessionId: z.string().min(10).max(255),
  claimSecret: z.string().min(20).max(255),
});
const ResolveRequest = z.object({
  token: z.string().min(20).max(255),
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

function verifyStripeSignature(
  raw: string,
  header: string,
  secret: string,
  toleranceSeconds = 300,
) {
  const parts = header.split(",");
  const timestamp = parts
    .find((part) => part.startsWith("t="))
    ?.slice(2);
  const signatures = parts
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3));
  if (!timestamp || signatures.length === 0) return false;
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds)) return false;
  if (Math.abs(Date.now() / 1000 - seconds) > toleranceSeconds) return false;
  const expected = createHmac("sha256", secret)
    .update(timestamp + "." + raw)
    .digest("hex");
  return signatures.some((signature) => safeEqualHex(signature, expected));
}

function stripeReady(env: Env) {
  return Boolean(
    env.COMMERCE_ENABLED &&
      env.STRIPE_SECRET_KEY &&
      env.STRIPE_PUBLISHABLE_KEY,
  );
}

async function setOrderStatus(
  db: Db,
  orderId: string,
  status:
    | "created"
    | "pending"
    | "approved"
    | "failed"
    | "canceled"
    | "refunded"
    | "chargeback",
  buyerEmail?: string | null,
) {
  await db.db
    .update(orders)
    .set({
      status,
      updatedAt: new Date(),
      ...(buyerEmail ? { buyerEmail: buyerEmail.toLowerCase() } : {}),
    })
    .where(eq(orders.id, orderId));
}

async function productsForOrder(db: Db, orderId: string) {
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
  const refs = await productsForOrder(db, orderId);
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

async function orderIdFromStripeObject(
  secret: string,
  object: Record<string, unknown>,
) {
  const metadata = object.metadata;
  if (
    metadata &&
    typeof metadata === "object" &&
    typeof (metadata as Record<string, unknown>).order_id === "string"
  )
    return (metadata as Record<string, string>).order_id;

  let paymentIntent =
    typeof object.payment_intent === "string" ? object.payment_intent : null;
  if (!paymentIntent && typeof object.charge === "string") {
    const charge = await stripeGet<Record<string, unknown>>(
      secret,
      "/v1/charges/" + encodeURIComponent(object.charge),
    );
    paymentIntent =
      typeof charge.payment_intent === "string" ? charge.payment_intent : null;
  }
  if (!paymentIntent) return null;
  const intent = await stripeGet<Record<string, unknown>>(
    secret,
    "/v1/payment_intents/" + encodeURIComponent(paymentIntent),
  );
  const intentMetadata = intent.metadata;
  return intentMetadata &&
    typeof intentMetadata === "object" &&
    typeof (intentMetadata as Record<string, unknown>).order_id === "string"
    ? (intentMetadata as Record<string, string>).order_id
    : null;
}

export function commerceRoutes(
  app: FastifyInstance,
  opts: { db?: Db; env: Env },
) {
  app.post(
    "/commerce/checkout/session",
    { config: { rateLimit: { max: 15, timeWindow: "1 minute" } } },
    async (req, reply) => {
      if (!opts.db || !stripeReady(opts.env))
        return reply.code(503).send({ ok: false, error: "commerce_unavailable" });

      const parsed = CheckoutRequest.safeParse(req.body);
      if (!parsed.success || !isCommerceOfferId(parsed.data.offerId))
        return reply.code(400).send({ ok: false, error: "invalid_offer" });
      const bumpIds = parsed.data.bumpOfferIds.filter(isCommerceOfferId);
      if (bumpIds.length !== parsed.data.bumpOfferIds.length)
        return reply.code(400).send({ ok: false, error: "invalid_bump" });

      let selection;
      try {
        selection = resolveCheckoutOffers(parsed.data.offerId, bumpIds);
      } catch {
        return reply.code(400).send({ ok: false, error: "unsupported_bump" });
      }

      const claimSecret = randomBytes(32).toString("base64url");
      const [order] = await opts.db.db
        .insert(orders)
        .values({
          baseOfferId: selection.base.id,
          amountMinor: selection.totalMinor,
          currency: "BRL",
          claimSecretHash: hash(claimSecret),
          status: "created",
        })
        .returning({ id: orders.id });
      if (!order) {
        req.log.error("order insert returned no row");
        return reply.code(500).send({ ok: false, error: "order_create_failed" });
      }

      await opts.db.db.insert(orderItems).values(
        selection.selected.map((offer) => ({
          orderId: order.id,
          offerId: offer.id,
          title: offer.title,
          amountMinor: offer.amountMinor,
        })),
      );

      const form = new URLSearchParams();
      form.set("mode", "payment");
      form.set("ui_mode", "elements");
      form.set(
        "return_url",
        opts.env.WEB_BASE_URL.replace(/\/$/, "") +
          "/checkout/retorno?session_id={CHECKOUT_SESSION_ID}",
      );
      form.set("customer_creation", "always");
      opts.env.STRIPE_PAYMENT_METHODS.forEach((method, index) =>
        form.set("payment_method_types[" + index + "]", method),
      );
      selection.selected.forEach((offer, index) => {
        const prefix = "line_items[" + index + "]";
        form.set(prefix + "[price_data][currency]", offer.currency);
        form.set(prefix + "[price_data][unit_amount]", String(offer.amountMinor));
        form.set(prefix + "[price_data][product_data][name]", offer.title);
        form.set(prefix + "[quantity]", "1");
      });
      form.set("metadata[order_id]", order.id);
      form.set("metadata[offer_id]", selection.base.id);
      form.set(
        "metadata[item_offer_ids]",
        selection.selected.map((offer) => offer.id).join(","),
      );
      form.set("payment_intent_data[metadata][order_id]", order.id);

      for (const [key, value] of Object.entries(parsed.data.attribution ?? {})) {
        if (
          allowedAttribution.has(key) &&
          /^[a-z][a-z0-9_-]{0,63}$/i.test(value)
        )
          form.set("metadata[" + key + "]", value);
      }

      try {
        const session = await stripePostForm<StripeCheckoutSession>(
          opts.env.STRIPE_SECRET_KEY!,
          "/v1/checkout/sessions",
          form,
          "espelhomeu-order-" + order.id,
        );
        if (!session.client_secret)
          throw new Error("missing_checkout_client_secret");
        await opts.db.db
          .update(orders)
          .set({
            providerSessionId: session.id,
            status: "pending",
            updatedAt: new Date(),
          })
          .where(eq(orders.id, order.id));
        return reply.code(201).send({
          ok: true,
          orderId: order.id,
          claimSecret,
          clientSecret: session.client_secret,
          publishableKey: opts.env.STRIPE_PUBLISHABLE_KEY,
          amountMinor: selection.totalMinor,
          currency: "BRL",
        });
      } catch (error) {
        await setOrderStatus(opts.db, order.id, "failed");
        req.log.error({ err: error, orderId: order.id }, "checkout session failed");
        return reply.code(502).send({ ok: false, error: "checkout_provider_error" });
      }
    },
  );

  app.post(
    "/commerce/access/claim",
    { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (req, reply) => {
      if (!opts.db || !opts.env.STRIPE_SECRET_KEY)
        return reply.code(503).send({ ok: false, error: "commerce_unavailable" });
      const parsed = ClaimRequest.safeParse(req.body);
      if (!parsed.success)
        return reply.code(400).send({ ok: false, error: "invalid_claim" });

      const session = await stripeGet<StripeCheckoutSession>(
        opts.env.STRIPE_SECRET_KEY,
        "/v1/checkout/sessions/" + encodeURIComponent(parsed.data.sessionId),
      );
      const orderId = session.metadata?.order_id;
      if (!orderId)
        return reply.code(404).send({ ok: false, error: "order_not_found" });
      const [order] = await opts.db.db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.id, orderId),
            eq(orders.providerSessionId, parsed.data.sessionId),
          ),
        )
        .limit(1);
      if (!order || !safeEqualHex(order.claimSecretHash, hash(parsed.data.claimSecret)))
        return reply.code(403).send({ ok: false, error: "claim_denied" });

      if (session.payment_status !== "paid")
        return reply.code(202).send({ ok: false, status: "pending" });

      const email = session.customer_details?.email ?? null;
      await setOrderStatus(opts.db, order.id, "approved", email);
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

  app.post(
    "/commerce/access/resolve",
    { config: { rateLimit: { max: 120, timeWindow: "1 minute" } } },
    async (req, reply) => {
      if (!opts.db)
        return reply.code(503).send({ ok: false, error: "commerce_unavailable" });
      const parsed = ResolveRequest.safeParse(req.body);
      if (!parsed.success)
        return reply.code(400).send({ ok: false, error: "invalid_token" });

      const [access] = await opts.db.db
        .select()
        .from(accessTokens)
        .where(
          and(
            eq(accessTokens.tokenHash, hash(parsed.data.token)),
            gt(accessTokens.expiresAt, new Date()),
          ),
        )
        .limit(1);
      if (!access)
        return reply.code(401).send({ ok: false, error: "access_expired" });

      const [originOrder] = await opts.db.db
        .select()
        .from(orders)
        .where(eq(orders.id, access.orderId))
        .limit(1);
      if (!originOrder)
        return reply.code(401).send({ ok: false, error: "access_invalid" });

      let orderIds = [originOrder.id];
      if (originOrder.buyerEmail) {
        const sameBuyer = await opts.db.db
          .select({ id: orders.id })
          .from(orders)
          .where(
            and(
              eq(orders.buyerEmail, originOrder.buyerEmail),
              eq(orders.status, "approved"),
            ),
          );
        orderIds = sameBuyer.map((row) => row.id);
      }
      const grants = await opts.db.db
        .select({ productRef: entitlements.productRef })
        .from(entitlements)
        .where(
          and(
            inArray(entitlements.orderId, orderIds),
            eq(entitlements.active, true),
          ),
        );
      const productRefs = [...new Set(grants.map((grant) => grant.productRef))];
      return reply.send({
        ok: true,
        authenticated: true,
        productRefs,
        entitlementRefs: productRefs.map((ref) => "espelhomeu:" + ref),
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
    webhook.post("/commerce/webhooks/stripe", async (req, reply) => {
      if (!opts.db || !opts.env.STRIPE_SECRET_KEY || !opts.env.STRIPE_WEBHOOK_SECRET)
        return reply.code(503).send({ ok: false });
      const rawBuffer = req.body;
      if (!Buffer.isBuffer(rawBuffer))
        return reply.code(400).send({ ok: false });
      const raw = rawBuffer.toString("utf8");
      const signature = req.headers["stripe-signature"];
      if (
        typeof signature !== "string" ||
        !verifyStripeSignature(raw, signature, opts.env.STRIPE_WEBHOOK_SECRET)
      )
        return reply.code(400).send({ ok: false });

      let event: StripeEvent;
      try {
        event = JSON.parse(raw) as StripeEvent;
      } catch {
        return reply.code(400).send({ ok: false });
      }
      const [seen] = await opts.db.db
        .select({ id: paymentEvents.id })
        .from(paymentEvents)
        .where(eq(paymentEvents.providerEventId, event.id))
        .limit(1);
      if (seen) return reply.send({ ok: true, duplicate: true });

      const recordEvent = async () => {
        await opts.db!.db
          .insert(paymentEvents)
          .values({
            providerEventId: event.id,
            eventType: event.type,
            payloadHash: hash(raw),
          })
          .onConflictDoNothing({ target: paymentEvents.providerEventId });
      };

      const object = event.data.object;
      const orderId = await orderIdFromStripeObject(
        opts.env.STRIPE_SECRET_KEY,
        object,
      );
      if (!orderId) {
        await recordEvent();
        return reply.send({ ok: true, ignored: true });
      }

      if (
        event.type === "checkout.session.completed" ||
        event.type === "checkout.session.async_payment_succeeded"
      ) {
        const paymentStatus =
          typeof object.payment_status === "string"
            ? object.payment_status
            : null;
        const customerDetails =
          object.customer_details && typeof object.customer_details === "object"
            ? (object.customer_details as Record<string, unknown>)
            : null;
        const buyerEmail =
          customerDetails && typeof customerDetails.email === "string"
            ? customerDetails.email
            : null;
        if (paymentStatus === "paid" || event.type.endsWith("succeeded")) {
          await setOrderStatus(opts.db, orderId, "approved", buyerEmail);
          await grantOrder(opts.db, orderId);
        } else {
          await setOrderStatus(opts.db, orderId, "pending", buyerEmail);
        }
      } else if (event.type === "checkout.session.async_payment_failed") {
        await setOrderStatus(opts.db, orderId, "failed");
      } else if (event.type === "checkout.session.expired") {
        await setOrderStatus(opts.db, orderId, "canceled");
      } else if (event.type === "charge.refunded") {
        await setOrderStatus(opts.db, orderId, "refunded");
        await revokeOrder(opts.db, orderId);
      } else if (event.type === "charge.dispute.created") {
        await setOrderStatus(opts.db, orderId, "chargeback");
        await revokeOrder(opts.db, orderId);
      }
      await recordEvent();
      return reply.send({ ok: true });
    });
  });
}
