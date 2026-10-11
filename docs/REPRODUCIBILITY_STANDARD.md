# AMF Reproducibility Standard

Every material EspelhoMeu implementation step must be reproducible without relying on undocumented human memory.

## Required documentation for every workstream

### 1. Decision
Record:
- what changed;
- why;
- alternatives rejected;
- compatibility impact.

Strategic/product decisions belong in Notion. Technical implementation evidence belongs in GitHub.

### 2. Configuration
Document:
- required environment variable names;
- which system owns each secret;
- domain/DNS assumptions;
- provider/account identifiers that are safe to record;
- defaults and market-specific overrides.

Never commit secret values.

### 3. Data
Every schema change requires:
- migration;
- rollback or forward-fix strategy;
- RLS/access assumptions;
- seed/mock data when needed for preview/testing.

### 4. Deployment
Every deployable component requires:
- build command;
- deployment target;
- health check;
- smoke test;
- rollback procedure.

### 5. Verification
A release is not complete without evidence:
- CI run;
- preview/public smoke;
- key route checks;
- API health;
- content validation;
- entitlement/access checks when applicable.

## Change record template

Every major PR should include:

```markdown
## Scope
What this PR changes.

## Why
Decision / requirement.

## Reproduction
Commands and configuration needed to reproduce.

## Data / migrations
Schema impact and rollback.

## Deployment
Targets and sequence.

## Verification
CI, smoke, screenshots, test evidence.

## Risks / deferred work
Known limitations.
```

## Golden rule

If a person has to remember a hidden step to reproduce a project, the AMF template is not ready.

Manual steps are allowed during the pilot, but every manual step must be converted into:
1. documented runbook step; or
2. automation task.

## Version pinning

Shared AMF dependencies must be pinned to immutable releases/SHAs for reproducible builds. Project upgrades happen through explicit PRs.

## Project bootstrap evidence

A future AMF-created project must produce a machine-readable handoff containing:
- project id;
- module manifest;
- AMF dependency versions;
- content schema version;
- domains;
- deploy targets;
- database project/schema;
- provider adapters enabled;
- release SHA;
- smoke result.
