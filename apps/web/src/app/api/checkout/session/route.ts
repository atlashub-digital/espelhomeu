import { sameOrigin } from "@/lib/aro/core";
import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { readAttribution } from "@espelhomeu/project-config/sales";
import { aroConfig, aroFetch } from "@/lib/aro/client";
import {
  bumpIds,
  offerCodes,
  sealSession,
  sessionCookie,
  UUID,
  validSession,
  type CheckoutSession,
} from "@/lib/aro/core";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (!sameOrigin(request.headers.get("origin"), request.headers.get("host"), request.nextUrl.protocol))
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  const idem = request.headers.get("idempotency-key") || "";
  if (!UUID.test(idem))
    return NextResponse.json(
      { error: "invalid_idempotency_key" },
      { status: 400 },
    );
  try {
    const config = aroConfig();
    if (!config.publicKey || !config.serverKey)
      return NextResponse.json(
        { error: "checkout_unavailable" },
        { status: 503 },
      );
    const raw = await request.text();
    if (raw.length > 16384)
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    const body = JSON.parse(raw);
    const offer =
      typeof body.offerId === "string" &&
      Object.hasOwn(offerCodes, body.offerId)
        ? offerCodes[body.offerId]
        : null;
    const bumps: unknown = body.bumpOfferIds ?? [];
    if (
      !offer ||
      !Array.isArray(bumps) ||
      bumps.length > 1 ||
      bumps.some((id) => typeof id !== "string" || id !== bumpIds[body.offerId])
    )
      return NextResponse.json({ error: "invalid_offer" }, { status: 400 });
    if (
      typeof body.payerName !== "string" ||
      body.payerName.trim().length < 2 ||
      body.payerName.length > 160 ||
      typeof body.payerEmail !== "string" ||
      body.payerEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.payerEmail) ||
      typeof body.payerDocument !== "string" ||
      !/^\d{11}(\d{3})?$/.test(body.payerDocument)
    )
      return NextResponse.json({ error: "invalid_payer" }, { status: 400 });
    const checkout: CheckoutSession = await aroFetch("/v1/checkout-sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-ARO-Public-Key": config.publicKey,
        "Idempotency-Key": idem,
      },
      body: JSON.stringify({
        project: "espelhomeu",
        offer,
        market: "BR",
        country: "BR",
        currency: "BRL",
        payment_method: "PIX",
        payer: {
          name: body.payerName.trim(),
          email: body.payerEmail.trim().toLowerCase(),
          document: body.payerDocument,
        },
        bump_offers: bumps.map((id) => offerCodes[id]),
        attribution: readAttribution(body.attribution ?? {}),
      }),
    });
    if (
      !validSession(checkout) ||
      checkout.offer !== offer ||
      typeof checkout.checkout_secret !== "string" ||
      checkout.checkout_secret.length < 16 ||
      checkout.payment?.kind !== "PIX" ||
      !checkout.payment.qr_payload ||
      !checkout.payment.copy_paste
    )
      throw new Error("invalid_checkout");
    const response = NextResponse.json(
      {
        orderId: checkout.order_id,
        checkoutId: checkout.id,
        state: checkout.state,
        amount: checkout.amount,
        qrCodeText: checkout.payment.copy_paste,
        qrImage: await QRCode.toDataURL(checkout.payment.qr_payload, {
          margin: 4,
          width: 320,
        }),
        expiresAt: checkout.payment.expires_at,
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set(
      sessionCookie,
      sealSession(
        {
          id: checkout.id,
          orderId: checkout.order_id,
          offer,
          secret: checkout.checkout_secret,
          exp: Date.now() + 7 * 86400000,
        },
        config.serverKey,
      ),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 86400,
      },
    );
    return response;
  } catch {
    return NextResponse.json(
      { error: "checkout_unavailable" },
      { status: 503 },
    );
  }
}
