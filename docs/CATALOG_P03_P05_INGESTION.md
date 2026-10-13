# Expansão editorial P01–P05

Base: main `3d761d29db8b4bca6fb7cd9d147b9235f82d8d14`, merge do PR #15 homologado.
P01/P02 e Journey P01 preservados por fingerprint. CONTENT READY do baseline permanece aprovado;
a expansão P03/P04/P05 está em Preview e aguarda revisão humana própria. Não é SALES READY.

## Fonte e representação

| Produto | Pasta canónica | Representação |
| --- | --- | --- |
| P03 | https://drive.google.com/drive/folders/1VtFWM-7BXiptVyJ_bZzsPhIIjsLrTP0u | Guide: abertura, 21 encontros em três atos, fechamento (23 secções) |
| P04 | https://drive.google.com/drive/folders/1kz7t7X2QIt7A4dbQkSyWrx5aQJUPhwYZ | Guide: enquadramento, sete capítulos (abertura junto ao primeiro), perguntas/mapa/carta final (9 secções) |
| P05 | https://drive.google.com/drive/folders/1olPeLHsSGPAZ1u_7AnM5H1ursypM-gzR | eBook/diário: introdução, 30 entradas independentes em cinco partes, continuidade (32 secções) |

Masters `00_MASTER_EDITORIAL/ESPELHOMEU_P0N_MASTER_EDITORIAL.md` preservados byte a byte,
incluindo BOM/CRLF do P03; delivery.json inclui hashes SHA-256 dos masters e binários.
Sem OCR/extração de PDF, arquivo, campanhas ou preços na Publication. PDFs complementares são downloads originais.
Todos os produtos usam o Reader existente; nenhum componente React alterado.
P03 mantém a sequência editorial em leitura, sem inventar regras de progressão, desbloqueios ou um novo Program.
P05 não é uma jornada diária: o índice dá acesso livre às 30 entradas. Nenhum registo pessoal é recolhido.

## Media e extras

- P03: capa, três fotos de abertura dos atos e três faixas de atmosfera nas sínteses; Caderno e 21 cartões PDF.
- P04: capa v1.1, quatro media ativos distribuídos pelos capítulos; Caderno/Mapa e sete cartões PDF.
- P05: capa ativa v1.2, quatro media ativos v1.1 nas partes; Caderno e 30 cartões PDF ativos v1.1.
- Downloads no índice e secção final. Capa na Library e Reader. Assets locais, sem Drive runtime.
- Alt text conferido contra os ficheiros reais. Imagens sintéticas não são depoimentos ou resultados.

## Diferenças da entrega

1. P03 MEDIA_MAP refere um JPG de capa ausente. Foi usado o PNG ativo `CAPA_APROVADA_VOLUME_03_v1.0.png`,
   conferido visualmente; não o nome ausente nem o arquivo.
2. Durante a ingestão, P05 foi atualizado na pasta canónica para revisão gráfica v1.2.
   `REVISAO_v1.2.md` declara nenhuma alteração do master; capa ativa v1.2 e extras ativos v1.1
   compõem a entrega. Não se recuperou a capa anterior de 99_ARQUIVO.
3. MEDIA_MAP P05 usa nomes sem sufixo/vários nomes ausentes; os quatro ficheiros ativos v1.1
   foram identificados e conferidos. Alguns recortes contêm tipografia da imagem original;
   preservados como imagem, nunca transcritos para texto canónico.
4. READMEs/handoffs/QA têm referências antigas de versão e preços divergentes. Não bloqueiam
   a ingestão; preços não são importados. A configuração Commerce futura será a autoridade.
5. PDFs P03 são provas rasterizadas conforme QA do pack. Acessibilidade interna dos downloads
   não é certificada por esta ingestão; o texto do Reader vem exclusivamente do Markdown.

## Alterações mínimas no pipeline

- Três recipes canónicas, deliveries e entradas em imports.json/library.json.
- Parser genérico passou a aceitar callout editorial na mesma linha e o rótulo estrutural
  `Lembrete editorial:` como callout, preservando o texto que o segue.
- `omitParagraphs` é configuração de ingestão para excluir parágrafos operacionais exatos
  (diretivas MEDIA e um heading operacional), sem editar o master. Não é contrato AMF runtime.
- Ficha, índice redundante, fact-check de produção e notas de media ficam fora dos intervalos
  editoriais. Avisos de segurança e privacidade destinados à leitora são preservados.
- Schema 0.2.0/Core 0.2.1, lockfile, React, API e infraestrutura inalterados.

## Reprodução e verificação

Node 22, corepack enable, pnpm install --frozen-lockfile com leitura autorizada dos packages AMF.
Executar pnpm content:sync, pnpm validate:content, pnpm lint, pnpm typecheck, pnpm test, pnpm build,
pnpm exec playwright install --with-deps chromium, pnpm verify:browser.
CI usa a configuração GITHUB_TOKEN já existente. Sem credenciais nos ficheiros.

Checks: cinco capas/cards, todas as secções dos novos Readers, imagens decodificadas, downloads
PDF, navegação/progresso, desktop/mobile sem overflow, ausência de marcadores operacionais,
P01/P02 e Journey P01 intactos. Preview online é verificado contra o SHA do PR;
se encontrar Deployment Protection, o relatório mantém BLOCKED, nunca PASS fictício.

## Repetibilidade

As três formas editoriais usam o mesmo importer/Reader por configuração. A pequena extensão
de sintaxe resolve marcação presente nos packs; não há condições por ID de produto no runtime.
Content Ops continua a precisar de selecionar limites textuais, media ativos e alt text.
Não se afirma ingestão automática de Markdown arbitrário. Novo formato deve ser validado
explicitamente, sem inferir um Program a partir da contagem de capítulos.

## Handoff

Rever /biblioteca e /ler/21-dias-meu-melhor-reflexo, /ler/recomecar-depois-dos-40,
/ler/diario-de-amor-proprio-30-encontros-comigo. P01/P02 mantêm as URLs homologadas.
Helena: smoke autenticado do mesmo head quando a proteção impedir o CI online.
Nenhuma migration, secret, Supabase/RLS, waitlist, checkout, PIX, entitlement ou WhatsApp neste PR.
S1 Sales Ready só começa depois da homologação visual deste catálogo.
