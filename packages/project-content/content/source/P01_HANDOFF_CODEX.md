# P01 — Handoff técnico ao CODEX · PRODUTO_01_7_DIAS_PARA_ME_ESCOLHER

Fonte editorial (MASTER, intocada): `content/source/P01_MASTER_EDITORIAL.md`
sha256 `743e94b462a947b31cf8ec1da7cfb8e933fcde30843a511835b375d8202d1010`
Drive: pasta `PRODUTO_01__7_DIAS_PARA_ME_ESCOLHER__FINAL` → `00_MASTER_EDITORIAL`
(owner atlashub.digital@gmail.com; id pasta `1dehnDcGNI8XwGPd2O35B2B-VkVFos57y`).
Outros assets no Drive (não materializados aqui): EBOOK_LEITURA_PREMIUM_FINAL.pdf,
WORKBOOK_7_CARTOES_E_MAPA_A4.pdf, CAPA_PRINCIPAL_1600x2400.png,
CAPA_SOCIAL_QUADRADA_1080.png, ESPELHOMEU_PRODUTO_01_FINAL_V1.zip.

## Estado: PREVIEW CANDIDATE

Comercialmente fechado (`comercio: false`, oferta desativada). Só o conteúdo
editorial entra no preview; preço/testemunhos/licenças de media continuam fora.

## Mapeamento para contratos AMF 0.2 (sugestão estrutural, decisão do CODEX)

### 1. Publication `guide` — leitura (WebReader)

- id sugerido: `p01-7-dias-para-me-escolher`; slug `7-dias-para-me-escolher`;
  type `guide`; locale pt-BR; market `br`.
- Título: «7 Dias Para Me Escolher»; subtítulo «Um reencontro gentil comigo mesma».
- 9 capítulos (uma seção `## DIA x — ...` = um capítulo; ordem canónica):
  1. `abertura` — Uma carta antes do primeiro dia (parágrafos + callout insight
     + «Primeira pergunta» + orientação do Mapa)
  2..8. `dia-1-escutar` … `dia-7-continuar` (cada um: narrativa, EXERCÍCIO,
     VERSÃO DE DOIS MINUTOS, REFLEXÃO PARA GUARDAR, MEU MAPA, fecho;
     dia 3 tem callout ATENÇÃO; dia 4 tem callout INSIGHT; dia 7 callout INSIGHT)
  9. `ultima-pagina` — Quando você voltar (+ convite de continuidade p/
     *Eu Sou Bela — Do Meu Jeito*)
- Blocos permitidos pelo projeto: `paragraph`, `heading`, `callout`.
  Mapeamento dos elementos especiais:
  - **EXERCÍCIO / VERSÃO DE DOIS MINUTOS / REFLEXÃO PARA GUARDAR / MEU MAPA** →
    `heading` curto + `paragraph` (ou `callout` se o CODEX preferir destaque);
    manter exatamente o texto master.
  - `[CALLOUT — INSIGHT]` → callout tipo `insight`; `[CALLOUT — ATENÇÃO]` →
    callout tipo `attention` (verificar blocos discriminados do schema 0.2).
  - Campos `______` do Mapa → texto literal; sem interação no Reader.
- `access.mode`: `free` no preview (sem checkout); conservadorAccessResolver
  continua no servidor.
- Sem preço, sem testemunho, sem afirmação clínica (fact-check §6 do master).

### 2. Program/Journey 0.2 — jornada de 7 dias

- Manifest v0.2 `programs` com 1 program: dias 1..7 (ordem/dias únicos),
  publication ref → `p01-7-dias-para-me-escolher`.
- Por dia: título do encontro (Escutar/Reconhecer/Respeitar/Escolher
  referências/Criar espaço/Experimentar/Continuar), pergunta central
  (tabela §2), mission (o EXERCÍCIO do dia), check-in (o campo
  «MEU MAPA — DIA x») e reflexão (REFLEXÃO PARA GUARDAR).
- Ritmo: sem bloqueio por calendário (não-coercivo, §2 do master).
- Progress/check-ins: runtime primitivo do Core 0.2; persistência continua
  in-memory por instância (Issue #11 congelada).

### 3. Derivados já prontos no master (para cards/catalogo)

- Descrição curta (§8) para card de catálogo.
- 10 frases editoriais (§8) para UI secundária.
- CTA principal: «Reserve um encontro com você.» (sem link de venda ativo).

## Regras do gate (Track B)

- `validateProjectContent` + `validate:content` devem passar (blocos
  paragraph/heading/callout, slugs kebab-case, sem preços).
- `gate.contentReady` permanece **false** até: CI verde + Preview Vercel verde +
  Article/Guide/Journey renderizados no browser + revisão humana.
- Não alterar React components; conteúdo substituível só via JSON canónico.
- Markdown master NUNCA é editado para gerar JSON — é fonte editorial; JSON
  derivado vive em `content/` (manifest + publications/ + programs/).
