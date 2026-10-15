# ESPELHOMEU — S1 Ownership & Operating Model

## PDG / Founder

Owns:
- commercial decisions;
- approved prices;
- positioning;
- product priority;
- approval of final Preview;
- authorization to start real checkout / SALES READY.

Current approved:
- P01 R$ 11,90
- P02 R$ 19,90
- P03 R$ 29,90
- P04 R$ 24,90
- P05 R$ 29,90
- Collection R$ 79,90
- Jornada R$ 99,90
- Membership R$ 29,90/month

## MGJ — Commercial Product / CRO Specification

MGJ owns the commercial specification of S1, not infrastructure.

Responsibilities:
- audit and select Drive marketing assets;
- define conversion angle per P01–P05;
- refine sales-page copy;
- define product-specific funnel;
- define quiz/sample interaction;
- define cross-sell/upsell placements;
- ensure claims stay compatible with editorial/commercial guardrails;
- review implemented Preview for conversion quality.

MGJ must not:
- rewrite canonical editorial masters inside S1;
- create payment/entitlement architecture independently;
- hardcode alternate pricing outside the approved Offer Registry.

## Engineering Lead — CODEX / delegated Claude Code

Owns implementation in:
`atlashub-digital/espelhomeu`

Branch:
`feat/sales-s1-collection-landing`

Responsibilities:
- Offer Registry;
- reusable sales-page engine;
- shareable routes;
- product-specific layouts/variants;
- quiz/sample components;
- UTM attribution plumbing;
- access-state UI;
- collection landing;
- responsive implementation;
- tests;
- CI;
- Vercel Preview;
- evidence.

Engineering must use MGJ/Drive assets as inputs, not as architectural authority.

## Helena — Agentic Ops / Infra / Gate

Primary work remains:
- EspelhoMeu Agent;
- Hermes isolated runtime;
- infrastructure;
- WhatsApp when resumed;
- agent observability/evals.

For S1 Helena only owns:
- environment/deployment support if required;
- authenticated Preview smoke;
- Vercel binding verification;
- operational evidence.

Helena does not need to redesign or implement S1 pages.

## AMF / Duarte

Owns:
- canonical editorial provenance;
- AMF content packages;
- future editorial revisions;
- content integrity.

S1 consumes the editorial baseline; it does not reopen it.

## Laura — Editorial / Brand Review

Recommended role:
- final human review of sales copy against brand/editorial voice;
- check non-clinical, non-coercive language;
- identify copy that overpromises or misrepresents the publication.

## Rui — Growth / Media

Recommended role after first S1 Preview:
- map existing creatives to sales URLs;
- campaign/ad variants;
- UTM taxonomy;
- organic/paid launch plan;
- CRO test hypotheses.

Do not launch paid traffic before the landing/measurement gate is ready.

## Operating sequence

1. PDG decisions fixed.
2. MGJ produces/updates funnel specification and copy.
3. Engineering implements.
4. MGJ performs CRO/content review on Preview.
5. Laura reviews copy/brand where needed.
6. Helena performs authenticated operational smoke.
7. PDG approves S1.
8. Engineering begins S2 Commerce only after explicit gate.
9. Rui prepares/activates acquisition only when URLs and tracking are stable.

## One-source rules

Editorial truth:
P01–P05 catalog baseline in Git.

Commercial truth:
Offer Registry + approved decision docs in Git.

Marketing media:
Drive reviewed pack.

Runtime/agent truth:
espelhomeu-agent repository.

No shadow prices, URLs, prompts or funnel rules in chat-only instructions.
