# Evidência do Golden Pilot

As imagens PNG e verification.json anteriormente commitadas nesta pasta documentam
a fundação com fixtures. **Não são evidência do Produto 01 atual.**

Para cada commit editorial, o CI executa `pnpm verify:browser` e publica o artifact
`track-a-visual-evidence` com screenshots desktop (1440×1000) e mobile (390×844),
route smoke, Article, Guide de dez capítulos e navegação pelos sete dias da Journey.
O refresh inclui screenshots de cada dia no Guide/Journey e workbook, teste de imagens
carregadas/alt text e download do PDF oficial. Consultar docs/PRODUTO_01_REFRESH.md.
Consultar o run associado ao head do PR #15; não reutilizar imagens de outro commit.

O gate fica pendente até CI verde, Preview READY e revisão humana online sem bloqueadores.
Este QA técnico não substitui os gates editoriais/comerciais anteriores à venda.
