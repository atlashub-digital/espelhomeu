# Evidência Track A

Screenshots reais do build de produção local, Node 22.22.2, Chromium 153, desktop 1440×1000 e mobile 390×844. Não são mockups. `verification.json` regista 24 verificações e zero page errors.

| Superfície | Desktop | Mobile |
| --- | --- | --- |
| Home candidata | [desktop](desktop-inicio.png) | [mobile](mobile-inicio.png) |
| Biblioteca | [desktop](desktop-biblioteca.png) | [mobile](mobile-biblioteca.png) |
| Descobrir | [desktop](desktop-descobrir.png) | [mobile](mobile-descobrir.png) |
| WebReader | [desktop](desktop-reader.png) | [mobile](mobile-reader.png) |
| Jornadas (entry, não Program funcional) | [desktop](desktop-programas.png) | [mobile](mobile-programas.png) |
| Perfil (shell) | [desktop](desktop-perfil.png) | [mobile](mobile-perfil.png) |
| Meu Espelho (entry) | [desktop](desktop-meu-espelho.png) | [mobile](mobile-meu-espelho.png) |
| Comunidade (entry) | [desktop](desktop-comunidade.png) | [mobile](mobile-comunidade.png) |
| Founder (entry) | [desktop](desktop-premium.png) | [mobile](mobile-premium.png) |

Smoke: homepage original, privacidade, status, protótipo e nove superfícies novas HTTP 200; leitura inexistente HTTP 404. Reader: capítulos, progresso 33→100%, conclusão e resume na instância. Catalog: pesquisa por conteúdo JSON. Status: web chega à API local com DB `not_configured`. Waitlist: API 503 sem DB é mostrada como erro honesto; não foi escrita inscrição real.

A verificação visual manual confirmou Home, Library e Reader em desktop/mobile. Typography, identidade, contraste dos textos principais, adaptação das colunas, títulos e cards sem cortes. Todos os controlos têm labels, índice com aria-current e foco visível; redução de movimento respeitada.

## Limites

Não há validação de escrita em DB real, sessão, entitlement pago, Supabase, comunidade, Companion ou Program estruturado. Não houve operação sobre produção. CONTENT READY continua bloqueado upstream. Estas imagens comprovam build local; URL de preview e CI remoto devem ser consultados nos checks do PR.

## Reproduzir

`pnpm build`, `pnpm exec playwright install --with-deps chromium`, `pnpm verify:browser`. Detalhes em [runbook](../../CONTENT_READY_RUNBOOK.md).
