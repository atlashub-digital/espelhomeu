# ESPELHOMEU — SALES ROADMAP v1

Baseline editorial: `095bcf1c711050bb5c08aad228a6bbe557120787`

Status: Catálogo P01–P05 homologado. SALES READY = false.

## S1 — Collection Landing / Preview Commercial

Goal:
Build the commercial presentation layer without real payment or entitlement mutation.

Deliver:
- unified collection landing;
- P01–P05 product cards;
- individual offer pages/surfaces;
- real samples/previews;
- configurable bundles;
- access states;
- CTAs;
- mobile/desktop CRO;
- zero regression to Library/Reader/Journey.

### Architecture rule

Editorial content and commercial offer data must be separate.

Editorial:
- title;
- subtitle;
- description;
- content type;
- cover/media;
- sample;
- Reader/Journey.

Commercial:
- offer id;
- price;
- currency;
- bundle composition;
- CTA;
- availability;
- campaign metadata.

No price hardcoding inside publication masters.

### Initial offer registry

Use placeholder/configurable commercial states until PDG approval.

Products:
- P01
- P02
- P03
- P04
- P05

Candidate bundles:
- Primeiro Espelho — P01 + P02
- Percurso Essencial — P01 + P02 + P03
- Voltar a Mim — P04 + P05
- Coleção EspelhoMeu — P01–P05

The names/composition may be implemented as configuration but are not final commercial approval.

### Access states

Support UI states:
- PUBLIC
- PREVIEW
- LOCKED
- ACQUIRED

S1 may simulate state for Preview/demo purposes.
S1 must not create real entitlements.

### Main landing structure

1. Hero
2. Brand/collection promise
3. "Por onde começar?"
4. Five-product collection
5. Product comparison by intent
6. Bundles
7. How the experience works
8. Library/WebReader preview
9. EspelhoMeu companion teaser
10. FAQ
11. CTA/footer

### Product-card emphasis

P01 — entry / first encounter
P02 — beauty and personal expression
P03 — guided continuity
P04 — restart / 40+
P05 — recurring reflective journal

Avoid clinical claims or guaranteed self-esteem outcomes.

### Companion teaser

S1 can introduce EspelhoMeu as a future/preview capability:
- accompany reading;
- help resume;
- reflections;
- progress;
- future My Evolution.

Do not promise capabilities not yet active in production.

## S2 — Commerce / Checkout

Only after S1 visual/UX approval.

Deliver:
- final Offer registry;
- PDG-approved pricing;
- checkout session;
- provider integration;
- order lifecycle;
- guest/account purchase;
- success/cancel/error states;
- receipts/status;
- refund policy surface.

Rule:
CONTENT → COMMERCE → PAYMENT → ENTITLEMENT

Payment success alone does not equal frontend unlock unless entitlement grant succeeds.

## S3 — Entitlements / Account / Access

Deliver:
- entitlement source of truth;
- product/bundle grants;
- account linking;
- magic-link/post-purchase flow;
- Library acquired state;
- Reader authorization;
- refund/revoke;
- duplicate purchase protection;
- upgrade-aware offers.

No email string alone is sufficient identity proof.

## S4 — SALES READY Gate

Required:
- editorial baseline intact;
- pricing approved;
- checkout test PASS;
- entitlement grant/revoke PASS;
- policy pages;
- refund terms;
- accessibility;
- mobile devices;
- authenticated smoke;
- analytics;
- support/handoff;
- evidence pack.

Only then:
`SALES READY = true`

## S5 — Launch / Growth

After SALES READY:
- organic launch;
- paid campaign test;
- P01 entry offer;
- bundle tests;
- abandoned checkout sequence where consent allows;
- post-purchase onboarding;
- cross-sell based on entitlement, not vulnerability;
- community integration;
- EspelhoMeu Agent activation according to its own gates.

## Parallel Track — EspelhoMeu Agent

Owner: Helena / agentic operations.

Parallel work:
- historical pack reconciliation;
- isolated Hermes;
- WA DM;
- Product Companion;
- Community;
- My Evolution;
- Membership.

S1 must not wait for the agent runtime.
The agent runtime must not redefine S1 commercial truth.

## Current immediate gate

Complete S1 in Preview and obtain visual/product approval before starting real checkout.
