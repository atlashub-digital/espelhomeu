# EDITORIAL INGESTION PIPELINE — HOMOLOGATED v1

Em 2026-10-13, o PDG confirmou a homologação humana de P01 e P02 e autorizou explicitamente o fecho do gate `contentReady=true`.

Baseline editorial homologado: `1ac64cadb2e55b109b26a0ec26224b09ccfccf88`.
- CI #30 SUCCESS: https://github.com/atlashub-digital/espelhomeu/actions/runs/38314724056
- Preview READY: https://vercel.com/atlas-hub1/espelhomeu/Gt8Mq7nSZVBpgvki9SFXPrqMKCFs
- Evidência: 24 testes, 40 checks browser locais, 68 screenshots desktop/mobile.
- O smoke online automatizado registou BLOCKED por Deployment Protection; não é reclassificado como PASS. A homologação humana e a decisão do PDG encerram o gate editorial.

Este fecho altera apenas o gate, a sua asserção e o texto de diagnóstico da automação. Não altera fontes, Publications, Program, IDs, slugs, URLs ou assets homologados.

## Transição

PR #15 permanece DRAFT, aberto para aprovação do baseline e decisão de merge. Não fazer auto-merge, release ou deploy de produção. “Fechar” refere-se ao ciclo editorial, não a encerrar o PR sem merge.

Commerce permanece desativado. CONTENT READY não significa SALES READY.

Sales Ready será um novo ciclo, com branch/PR próprio após aprovação do baseline. Primeiro: plano e revisão humana da landing, sales pages e amostra. Depois: Commerce com pagamentos mock e entitlements. Por fim: homologação PIX real controlada, com Helena a gerir credenciais, migrations e infraestrutura aprovadas.

A nova fase deve preservar CONTENT / COMMERCE / PAYMENT / ENTITLEMENT separados. Conteúdo protegido não poderá ficar em downloads públicos ou ser enviado integralmente ao browser de visitantes sem autorização. Os conteúdos já partilhados no repositório público e previews anteriores não podem tornar-se retroativamente secretos.
