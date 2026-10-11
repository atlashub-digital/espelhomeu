# EspelhoMeu — AMF Golden Pilot V1

**Decision date:** 2026-10-11  
**Status:** Authorized for implementation  
**Public surface:** https://espelho.lia.doctor/  
**Repository:** `atlashub-digital/espelhomeu`

## 1. Objective

EspelhoMeu is the first real reference implementation of the AMF platform.

The goal is not merely to launch one product. The goal is to prove a reproducible product architecture that can later be instantiated for AtlasHub Editions, LeveLab/LIA, MyTrainX, MyPets and future ventures, markets and business models.

The Golden Pilot must support modular composition rather than project-specific hard-coding.

## 2. Reference architecture

```text
AMF
├── Project manifest / modules
├── Content schema + Content Ops
├── Theme / design system
├── Library / WebReader / Programs
├── Commerce / Entitlements
└── Release / publication workflow

AWF
├── AI Attendant
├── Meu Espelho Companion
├── WhatsApp
├── Memory / Check-ins
├── Gamification triggers
└── CRM / relationship events

AtlasHub Finance
├── Offers / Orders contract
├── Payment adapters
├── Reconciliation
└── Ledger / reporting

EspelhoMeu
= AMF project + Espelho theme + Espelho content + AWF profiles + Finance config
```

## 3. Product modules

The architecture must allow modules to be enabled or disabled without rebuilding the platform.

### Required for Golden Pilot V1

- Web / SEO / landing pages
- Identity and profile
- Library
- WebReader
- Publications: article, guide, ebook, workbook
- Programs / journeys
- Free and gated content
- Commerce-ready offers and entitlements
- Community entry point, initially WhatsApp
- Meu Espelho Companion
- Public AI Attendant
- Progress tracking
- Check-ins
- Missions / streaks / milestones
- Analytics / events
- Brazil and Portugal market configuration

### Prepared but not required for the first release

- paid checkout activation
- native social feed
- physical products / fulfillment
- affiliate marketplace
- advanced image simulation
- additional countries and currencies

## 4. Execution gates

Do not wait for the full product before enabling AMF Content Ops.

### Gate A — FOUNDATION READY

Required:
- EspelhoMeu consumes pinned AMF Content Schema and Experience Core;
- `project.manifest` exists;
- project config and theme are isolated from core;
- CI is green;
- existing public routes do not regress;
- migration is additive/reversible.

### Gate B — CONTENT READY — highest priority

Required:
- Library route;
- WebReader route;
- at least Article, Guide and Program represented in AMF contracts;
- local/Git content adapter;
- content schema validation in CI;
- preview environment;
- documented branch → PR → preview → release workflow;
- content can be changed without editing React application code.

**When Gate B passes, AMF Content Ops may start producing real content even while other modules are still in development.**

### Gate C — MEMBER READY

Required:
- account/profile;
- consent model;
- user library;
- reading/program progress;
- check-ins;
- basic missions/streaks;
- free founder/community entitlement.

### Gate D — COMPANION READY

Required:
- distinct Attendant and Companion profiles;
- authenticated Companion;
- consented memory boundary;
- content retrieval;
- progress/check-in tools;
- WhatsApp adapter boundary;
- private Companion data separated from marketing CRM.

### Gate E — COMMERCE READY

Required:
- Product / Offer / Price / Order / Entitlement model;
- free launch offer works;
- finance adapter interface;
- paid providers may be configured but do not need to be activated;
- no reader code depends on a payment provider.

### Gate F — AUTOMATION READY

Required:
- brief → normalized content → validation → preview → PR/release;
- derived social assets generated from canonical content;
- AMF run has audit trail;
- AWF can receive published content and use it as Companion knowledge;
- all manual steps required to reproduce a release are documented or automated.

## 5. Workstreams

### WS1 — AMF integration — Codex

Owner: Codex / product engineering.

- integrate pinned `amf-content-schema`;
- integrate pinned `amf-experience-core`;
- add project manifest/config/content packages where appropriate;
- preserve the existing monorepo and working deployment;
- keep project-specific design in EspelhoMeu-owned code;
- do not fork AMF core behavior into the project without justification.

### WS2 — Product UX / Frontend — Codex

- evolve the current site into a premium full product;
- homepage, discovery, Library, Reader, Programs, Profile;
- responsive and accessible;
- preserve/legal pages and status route;
- initial free-launch experience;
- add module boundaries rather than one giant page/application.

Codex has design freedom inside project-owned UI. It must preserve product guardrails and cannot weaken access/auth/payment boundaries for visual convenience.

### WS3 — Data / API / Infrastructure — Helena

Helena may use Codex for heavy implementation and GLM 5.3 Flash for reasoning/review.

Responsibilities:
- choose the least disruptive path between existing Fastify/Postgres runtime and the shared pilot Supabase;
- implement required data contracts;
- preserve existing health/status/waitlist behavior;
- migrations and rollback;
- VPS/Caddy/deploy changes if necessary;
- environment/secrets setup;
- observability and smoke tests.

**Pilot default:** one shared AtlasHub/AMF Supabase may be used, with project isolation and RLS. Existing operational databases do not have to be migrated unless there is a clear benefit.

### WS4 — Content Ops — AMF

Starts immediately after Gate B.

- ingest source briefs/documents;
- create AMF Publication/Program manifests;
- generate or normalize chapters/blocks;
- maintain source provenance;
- media and attribution checks;
- validation;
- preview;
- GitHub PR/release;
- no auto-merge in first stage.

### WS5 — AI / Relationship — AWF

Starts after minimum identity/content contracts stabilize.

- AI Attendant;
- Meu Espelho Companion;
- WhatsApp adapter;
- check-ins;
- progress tools;
- gamification triggers;
- re-engagement;
- CRM events.

Private Companion memory must not be reused for marketing/cross-venture targeting without explicit consent and a separate allowed purpose.

## 6. Launch model

The first public product release should minimize financial complexity:

```text
Community Founder        FREE
Meu Espelho Basic        FREE
Selected launch content  FREE
Paid-capable products    configured, inactive or zero-price offer
Premium subscription     modeled, not necessarily activated
```

The architecture must allow the same product/content to later move from free to:
- one-time purchase;
- pack/bundle;
- membership;
- subscription;
- campaign/reward;
without changing the canonical content or WebReader.

## 7. Internationalization

From V1, keep these independent:
- locale;
- market;
- country;
- currency;
- price;
- payment provider;
- tax/receipt configuration;
- content translation/localization.

Initial markets:
- BR / pt-BR / BRL
- PT / pt-PT / EUR

Do not encode BRL/EUR prices directly inside publications.

## 8. Physical commerce readiness

Do not implement logistics now, but do not assume every product is digital.

Product type must be able to evolve toward:
- digital;
- service;
- subscription;
- physical;
- bundle.

A future paid order may produce:
- digital entitlement;
- subscription entitlement;
- fulfillment order;
- or a combination.

## 9. Privacy/data boundary

Separate at minimum:

### Identity / CRM
- name;
- email;
- phone;
- country;
- source;
- explicit marketing consent;
- declared commercial interests.

### Companion private context
- conversations;
- reflections;
- goals;
- check-ins;
- progress;
- consented memories.

Private Companion context must not silently become cross-project CRM data.

## 10. Definition of Golden Pilot success

The technical model is validated when the team can repeatedly execute:

```text
Brief
→ AMF normalization/generation
→ schema validation
→ preview
→ review
→ release
→ Library/WebReader
→ member progress
→ Companion knowledge
→ social derivatives
```

and a new project can be created from the same structural model without copying EspelhoMeu-specific branding or business assumptions.
