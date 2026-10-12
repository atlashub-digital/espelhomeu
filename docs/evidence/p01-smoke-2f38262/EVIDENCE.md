# Smoke online autenticado — PREVIEW CANDIDATE · P01

- **Deployment:** `dpl_5J7WS8o3CsijGDDedQ7kAX4YJmp2` (`espelhomeu-cnga3vxol-atlas-hub1.vercel.app`)
- **Head homologado:** `2f382620c690abc2ebed5a882572d0def9465eee` (PR #15)
- **Data:** 12-10-2026 ~06:45 UTC
- **Método:** Vercel Automation Bypass secret (fornecido pelo PDG; **proteção SSO intacta** — `ssoProtection: all_except_custom_domains` verificada antes e depois)
- **Produção:** intocada; `contentReady=false` mantido.

## Resultado: PASS

- 22/22 rotas com status esperado (200/404), incluindo:
  - `/inicio`, `/biblioteca`, `/descobrir`, `/programas`, `/programas/7-dias-para-me-escolher`
  - Reader do guia `/ler/7-dias-para-me-escolher`
  - Leituras diárias `/ler/p01-leitura-dia-1` … `dia-7`
  - Article `/ler/uma-pausa-que-tambem-e-sua`
  - 404 honesto para slug inexistente
  - `/privacidade`, `/status`
- Latências: 66–386 ms TTFB+download.
- Markers de conteúdo verificados: «7 Dias Para Me Escolher», «Um reencontro
  gentil comigo mesma», «Escutar», «Mapa do Que É Meu» — presentes nas rotas esperadas.
- Detalhe por rota: `smoke-online.json` (mesma pasta; commitado em
  `docs/evidence/p01-smoke-2f38262/`).

## Observação editorial registada (sem correção)

- **Alt text no Dia 4** (`/ler/p01-leitura-dia-4`): renderizado como
  «Espelho, flores e decoração em tons champagne sob iluminação delicada.»
  O master editorial (MEDIA 04) define: «mãos ajustando uma peça de roupa macia».
  **Divergência confirmada e registada** — correção condicionada ao ajuste da
  fonte editorial pelo MGJ (instrução do PDG; sem iniciativa técnica).
- Evidência visual: browser headless (lightpanda) renderiza sem CSS — capturas
  `preview-inicio-raw.png` apenas como prova de render/estrutura; QA visual
  estilizado pertence à revisão humana no browser.

## Limites

- Sem login de aplicação (app não tem auth ativa); smoke = rotas públicas do preview.
- Nenhum dado pessoal; nenhuma escrita em backend; Production intocada.
