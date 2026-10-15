# ESPELHOMEU — Commercial Decisions & Funnel Architecture v1

Baseline editorial:
`main@095bcf1c711050bb5c08aad228a6bbe557120787`

Status:
- Catalog P01–P05 homologated.
- S1 commercial build in Preview.
- SALES READY = false.

## 1. Approved pricing

These values are PDG-approved commercial decisions for the current S1/S2 design:

| Offer | Price |
|---|---:|
| P01 — 7 Dias Para Me Escolher | R$ 11,90 |
| P02 — Eu Sou Bela — Do Meu Jeito | R$ 19,90 |
| P03 — 21 Dias — Meu Melhor Reflexo | R$ 29,90 |
| P04 — Recomeçar Depois dos 40 | R$ 24,90 |
| P05 — Diário de Amor-Próprio — 30 Encontros Comigo | R$ 29,90 |
| Coleção EspelhoMeu — P01–P05 | R$ 79,90 |
| Jornada EspelhoMeu | R$ 99,90 |
| EspelhoMeu Membership | R$ 29,90 / mês |

Notes:
- Jornada and Membership may be designed/presented in Preview before activation, but cannot be sold as active capabilities until their delivery/runtime gates are met.
- Bundle prices beyond the complete collection require separate approval.
- Never invent compare-at pricing, scarcity or savings claims.

## 2. Commercial architecture

EspelhoMeu is not one generic sales page.

It is a system of:
- collection discovery;
- product-specific acquisition;
- product-specific sales pages;
- lightweight conversion mechanisms;
- direct purchase paths;
- cross-sell/upsell;
- post-purchase continuity;
- future companion/membership.

The commercial layer must preserve:

`CONTENT → COMMERCE → PAYMENT → ENTITLEMENT → EXPERIENCE`

## 3. Canonical shareable routes

Create shareable commercial routes separate from Reader routes.

Recommended:

- `/colecao`
- `/7-dias-para-me-escolher`
- `/eu-sou-bela-do-meu-jeito`
- `/21-dias-meu-melhor-reflexo`
- `/recomecar-depois-dos-40`
- `/diario-de-amor-proprio`
- `/jornada`
- `/membership`

Reader remains:
- `/ler/<slug>`

Journey/program remains:
- `/programas/<slug>`

Commercial URL and reading URL are different responsibilities.

## 4. Collection landing

Purpose:
help a visitor understand EspelhoMeu and choose a path.

Sections:
1. Hero / brand promise.
2. "O que você procura hoje?"
3. Lightweight path chooser.
4. Five products.
5. Compare by intent.
6. Collection offer R$ 79,90.
7. WebReader / extras experience.
8. Jornada teaser.
9. EspelhoMeu companion teaser.
10. FAQ.
11. CTA.

Primary conversion choices:
- choose one product;
- choose collection;
- continue to a product funnel.

## 5. Product funnels

### P01 — Entry / low-ticket
Price: R$ 11,90

Intent:
first contact / gentle restart.

Funnel:
Ad/social/content
→ compact sales page
→ optional 3-question path check
→ product preview
→ CTA.

Upsell:
- P02 / Primeiro Espelho candidate bundle;
- Collection R$ 79,90 after purchase/intent.

Avoid excessive friction because ticket is low.

### P02 — Identity / personal expression
Price: R$ 19,90

Intent:
beauty without external standard; style/identity reflection.

Funnel:
Content or visual creative
→ short interactive self-expression quiz
→ personalized editorial result
→ P02 offer
→ sample/Reader preview
→ CTA.

Upsell:
- P03;
- Collection.

Quiz must not generate beauty/psychological scores.

### P03 — Guided continuity
Price: R$ 29,90

Intent:
structured 21-meeting path.

Funnel:
Ad/content
→ stronger long-form landing
→ show 3-act / 21-meeting structure
→ sample
→ "começar jornada" CTA.

Upsell:
- Collection;
- Jornada EspelhoMeu when delivery is active.

### P04 — 40+ re-start
Price: R$ 24,90

Intent:
new chapters / maturity / choice.

Funnel:
Segmented content
→ long-form story/value page
→ optional short "qual capítulo quer abrir agora?" selector
→ 7 chapters + final map preview
→ CTA.

Upsell:
- P05;
- P04+P05 bundle when approved;
- Collection.

Do not target or phrase age as a defect/problem.

### P05 — Journal / recurring use
Price: R$ 29,90

Intent:
30 independent reflective encounters.

Funnel:
Visual/editorial content
→ interactive sample "abra um encontro"
→ show 5 parts / 30 encounters
→ journal preview
→ CTA.

Upsell:
- P04;
- P04+P05 bundle when approved;
- Collection.

## 6. Jornada EspelhoMeu

Price: R$ 99,90

Position as an integrated guided experience, not "ebooks + chatbot".

Proposed composition:
- Collection P01–P05;
- onboarding;
- guided path;
- initial Companion access;
- progress/milestones;
- selected member capabilities.

Activation rule:
Do not sell until Companion/Hermes delivery is ready enough to fulfill the promise.

Until then:
- Preview page;
- waitlist/interest;
- "em preparação" state.

## 7. Membership

Price: R$ 29,90/month.

Future recurring value:
- Companion;
- consented memory;
- My Evolution;
- check-ins;
- progress map;
- new member content;
- audio/rituals;
- community/member benefits.

Do not sell subscription until recurring-delivery gate is approved.

## 8. Sales page blocks

Reusable engine, but each product needs its own narrative.

Blocks:
- product hero;
- problem/context without negative personal inference;
- promise/angle;
- "what you will experience";
- real structure;
- inside preview;
- WebReader experience;
- extras;
- who it is for / who it is not for;
- sample/interactive step;
- offer;
- FAQ;
- final CTA;
- cross-sell/upsell.

No generic copy-paste landing across all five.

## 9. Existing Drive assets

Commercial implementation should consume and curate the reviewed assets from:

`EspelhoMEU/ESPELHOMEU_MARKETING_PRO_20261013_v1`

Available:
- Hotmart covers;
- carousels;
- feed;
- stories;
- 13 sales-page assets;
- P01–P05 heroes;
- benefit visuals;
- collection hero;
- bundle visuals;
- product copy;
- funnel structure;
- traffic plan.

Important:
The marketing pack text that describes WebReader as a future capability is outdated.
The actual homologated WebReader must now be treated as a current product capability in the sales experience.

## 10. Acquisition / attribution

Every sales route must support:
- UTM passthrough;
- product/offer ID;
- campaign source;
- creative source;
- funnel entry;
- CTA events;
- sample/quiz events;
- checkout-start event later.

Do not use private workbook/reflection answers as remarketing data.

## 11. S1 acceptance

S1 is successful when:
- every P01–P05 has a shareable sales URL;
- collection has its own landing;
- each product has a differentiated funnel;
- pricing above is configurable and visible correctly;
- collection R$79,90 is supported;
- Jornada/Membership have honest not-yet-active states if runtime is unavailable;
- WebReader is integrated as a selling point;
- no editorial master is changed;
- CI/Preview/mobile/desktop/evidence pass.
