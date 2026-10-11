# Golden Pilot Execution Handoff

## Priority order

1. **Content Ready**
2. Member/Profile/Progress
3. Companion/WhatsApp
4. Commerce-ready/free launch
5. Community/Gamification depth
6. Full AMF/AWF automation

This order is intentional. AMF content production must not wait for the entire application.

## Parallel execution

### Codex — Track A: application

Start from current `main`.

Deliver:
- AMF dependencies and project manifest;
- modular application shell;
- evolved homepage;
- Library;
- WebReader;
- Program/Journey UI;
- profile/member shell;
- module boundaries;
- CI/tests.

Do not change VPS, DNS or secrets unless Helena owns/approves that part.

### Helena — Track B: backend/data/infra

Start by auditing the current API/Postgres/VPS before changing anything.

Deliver:
- backend/data decision record;
- shared pilot Supabase integration if selected;
- project-scoped data model and RLS;
- identity/profile/content/progress/entitlement contracts;
- migration/runbook;
- deployment and rollback;
- public health/smoke.

### AMF — Track C: content

Can start as soon as Codex exposes a stable schema and preview route.

Deliver:
- initial Article;
- initial Guide;
- initial 7-day Program;
- validated manifests;
- PRs/previews;
- content release report.

### AWF — Track D: relationship

Start after identity/content interfaces stabilize.

Deliver:
- Attendant profile;
- Companion profile;
- content retrieval;
- check-in/progress tools;
- WhatsApp integration boundary;
- gamification event contract.

## First integrated release

The first integrated release does **not** need paid checkout.

Required:
- public site;
- founder/free account path;
- Library + Reader;
- one Program;
- profile/progress;
- basic Meu Espelho;
- WhatsApp community CTA;
- content pipeline working.

## Do not block Content Ready on

- native community feed;
- physical products;
- real paid provider activation;
- advanced image simulation;
- sophisticated gamification;
- full international catalog;
- complete finance dashboard.

Those are subsequent modules, not prerequisites for AMF Content Ops.
