# EspelhoMeu — Fast Launch PIX Runbook

## Decision

Hotmart is outside the launch critical path.

Brazil / BRL uses the first-party EspelhoMeu checkout with ARO-style PIX routing.

Initial provider:
**PixGo**

Fallback/future provider:
**MisticPay**

International:
**Stripe**, outside the BR PIX launch gate.

## Launch flow

```
Sales Page
→ /checkout/[offer]
→ payer data
→ PIX create
→ QR + Copia e Cola
→ PixGo
→ webhook/status verification
→ order APPROVED
→ entitlement
→ Library / WebReader
```

## Launch offers

- P01 — R$11,90
- P02 — R$19,90
- P03 — R$29,90
- P04 — R$24,90
- P05 — R$29,90
- Coleção — R$79,90

Jornada and Membership remain non-purchasable.

## Order bumps

- P01 → P02
- P02 → P03
- P04 → P05
- P05 → P04

No automatic discount is claimed.

## PIX rendering

PixGo is payment infrastructure, not checkout branding.

The checkout uses the canonical PIX Copia e Cola payload as the payment source.

Controlled test may temporarily render the provider-supplied QR to prove payment correctness.

Before public SALES READY:
- render a clean QR from the canonical PIX payload;
- do not depend on provider visual branding;
- retain Copia e Cola as fallback;
- verify the rendered QR decodes byte-for-byte to the canonical payload.

Do not alter the PIX payload when re-rendering.

## Runtime secrets

Keep runtime secrets in:

`/opt/espelhomeu/.env`

Never commit them.

Minimum BR/PIX:

```
WEB_BASE_URL=https://espelho.lia.doctor
API_PUBLIC_BASE_URL=https://api.espelhomeu.lia.doctor
COMMERCE_ENABLED=false
BR_PIX_PROVIDER=pixgo
PIXGO_API_KEY=<secret>
PIXGO_WEBHOOK_SECRET=<secret>
ACCESS_TOKEN_DAYS=180
```

Optional notifications:

```
REVENUE_TELEGRAM_BOT_TOKEN=
REVENUE_TELEGRAM_CHAT_ID=
REVENUE_DISCORD_WEBHOOK_URL=
```

## Revenue notifications

Notifications are operational outputs, never financial authority.

Current events:
- payment approved;
- payment refunded.

Notifications contain only:
- project;
- offer;
- amount/currency;
- provider;
- short order reference.

No CPF/CNPJ, email or secret is sent.

Failure to notify never changes payment/order/entitlement state.

## Hermes

Hermes is not part of the payment confirmation path for launch.

Phase 0:
- direct Telegram/Discord notification.

Phase 1:
- Hermes reads ARO normalized events;
- explains the event;
- produces daily/weekly summaries;
- detects anomalies;
- posts operational context.

Hermes must not decide whether a payment is APPROVED.

## Database migration

Apply the commerce migration before enabling commerce.

Verify:
- orders
- order_items
- payment_events
- entitlements
- access_tokens

## Activation sequence

1. deploy current API image/config with COMMERCE_ENABLED=false;
2. apply migration;
3. configure PixGo secrets;
4. verify API health;
5. set BR_PIX_PROVIDER=pixgo;
6. set COMMERCE_ENABLED=true;
7. create controlled P01 PIX;
8. validate QR/Copia-e-Cola;
9. pay;
10. provider confirmation/webhook/status;
11. order APPROVED;
12. entitlement granted;
13. claim access;
14. Reader open;
15. Collection grant test;
16. refund/revoke test where provider supports it;
17. clean QR rendering gate;
18. authenticated smoke;
19. PDG release approval.

## Access

Return/client polling does not create financial truth.

The API verifies provider state server-side before changing order state and granting entitlement.

## SALES READY

Remain false until the complete controlled PIX transaction passes.

`COMMERCE_ACCESS_ENFORCED=true` is a final release gate, not an implementation default.
