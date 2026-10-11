# EspelhoMeu — Content & Publication Pipeline

This is the first workflow AMF should automate.

## Objective

Allow the team to create and publish new EspelhoMeu content continuously without editing application UI code.

## Canonical flow

```text
Content Brief
  ↓
Source gathering / approved references
  ↓
AMF normalization or generation
  ↓
Publication / Program schema
  ↓
Media requirements + provenance
  ↓
Validation
  ↓
Preview
  ↓
GitHub branch + PR
  ↓
Human editorial review
  ↓
Release
  ↓
Library / WebReader
  ↓
Companion knowledge
  ↓
Derived social content
```

## First supported content types

### Article
Short/medium educational content, public or gated.

### Guide / eBook
Long-form content rendered in WebReader.

### Program / Journey
Structured multi-day or multi-module experience containing publications, missions, reflections and check-ins.

## Brief contract — v0

A content request should carry, at minimum:

```yaml
project: espelhomeu
type: guide
working_title: "..."
locale: pt-BR
market: BR
audience: "..."
objective: "..."
tone:
  - acolhedor
  - elegante
  - não clínico
access:
  launch: free
distribution:
  library: true
  companion_context: true
  social_derivatives: true
sources:
  policy: approved-only
publish:
  mode: pull-request
```

## AMF responsibilities

- preserve source provenance;
- never invent citations or media attribution;
- produce deterministic ids/slugs where possible;
- validate AMF schema;
- validate required metadata;
- validate media/attribution;
- generate change summary;
- generate preview;
- open PR;
- produce release evidence.

## Human review responsibilities

Before merge:
- factual/editorial quality;
- product tone;
- safety/claims;
- privacy implications;
- visual quality;
- access policy;
- social derivatives.

## Publishing modes

V0:
- PR + human merge.

Later:
- trusted low-risk categories may use auto-approval policies, but only after measured quality evidence.

## Social derivatives

Canonical content may derive:
- Instagram carousel;
- post caption;
- reel script;
- story sequence;
- Facebook post;
- WhatsApp community message;
- Companion reflection/prompt;
- mission/check-in prompt.

Social copy is a derivative. The Publication/Program remains the source of truth.

## Initial acceptance test

Create three real assets through the pipeline:
1. one Article;
2. one Guide;
3. one 7-day Program.

Success means all three:
- validate;
- preview;
- publish;
- appear in Library/Reader;
- expose structured metadata to the Companion layer;
- can generate reviewed social derivatives.
