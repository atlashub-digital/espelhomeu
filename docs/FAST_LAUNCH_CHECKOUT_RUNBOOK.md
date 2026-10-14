# EspelhoMeu — Fast Launch Checkout Runbook

## Decision

Hotmart is outside the launch critical path.

The first-party EspelhoMeu checkout uses:
- Sales Engine S1;
- embedded Stripe Checkout Sessions + Payment Element;
- cartão e métodos locais elegíveis via Stripe Payment Element; Pix aparece quando habilitado/elegível;
- Fastify API as payment/order authority;
- Postgres order ledger;
- webhook-confirmed entitlements;
- first-party access cookie for Reader/Journey.

The browser never sends raw card data to the EspelhoMeu API.

## Launch offers

- P01 — R$ 11,90
- P02 — R$ 19,90
- P03 — R$ 29,90
- P04 — R$ 24,90
- P05 — R$ 29,90
- Coleção — R$ 79,90

Jornada and Membership remain non-purchasable.

## Order bumps

Initial checkout bumps:
- P01 → P02
- P02 → P03
- P04 → P05
- P05 → P04

No automatic discount is claimed. The bump uses the approved individual price.

## Runtime secrets

Configure only in the VPS environment, never Git:
- STRIPE_SECRET_KEY
- STRIPE_PUBLISHABLE_KEY
- STRIPE_WEBHOOK_SECRET

Operational values:
- WEB_BASE_URL=https://espelho.lia.doctor
- COMMERCE_ENABLED=true only after test-mode smoke
- STRIPE_PAYMENT_METHODS=automatic (ou card,pix depois de validar a conta)
- ACCESS_TOKEN_DAYS=180

Vercel already needs:
- NEXT_PUBLIC_API_URL=https://api.espelhomeu.lia.doctor
- COMMERCE_ACCESS_ENFORCED=true only at the final release gate

## Webhook

Production endpoint:

POST https://api.espelhomeu.lia.doctor/commerce/webhooks/stripe

Subscribe at minimum:
- checkout.session.completed
- checkout.session.async_payment_succeeded
- checkout.session.async_payment_failed
- checkout.session.expired
- charge.refunded
- charge.dispute.created

The endpoint verifies the Stripe signature, stores only event id/type/hash for audit, is idempotent, and never logs secrets or raw payment data.

## Access

After a paid Checkout Session:
1. return to /checkout/retorno;
2. claim endpoint verifies the Session server-side;
3. order becomes approved;
4. entitlements are granted;
5. opaque access token is set as an httpOnly cookie;
6. Reader/Journey resolves active product entitlements through the API.

The return URL alone never grants access.

## Release gate

Before SALES READY=true:
1. CI green;
2. API migration applied;
3. Stripe test session PASS;
4. card success PASS;
5. card decline PASS;
6. Pix PASS if enabled;
7. webhook event PASS;
8. duplicate webhook PASS;
9. entitlement grant PASS;
10. refund/revoke PASS;
11. P01 Reader/Journey locked before payment and open after payment;
12. Collection grants P01–P05;
13. desktop/mobile checkout PASS;
14. authenticated production-stage smoke PASS;
15. PDG release approval.

## Known launch limitation

The first release uses a durable browser access cookie instead of a full account login.
Account recovery / magic link is the next identity hardening step and must be completed before relying on the cookie as the only long-term access mechanism.
