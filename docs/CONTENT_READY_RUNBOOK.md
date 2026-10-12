# Golden Pilot — Produto 01 no Preview

Estado editorial: **PREVIEW CANDIDATE / PRE-PUBLICAÇÃO**. O gate técnico não autoriza venda.
PR #15 permanece DRAFT. Nenhum merge, release ou mudança de produção nesta etapa.

## Reproduzir

Node 22 e pnpm 10.28.0. Os packages são artifacts previamente compilados:
- `@atlashub-digital/amf-content-schema@0.2.0`
- `@atlashub-digital/amf-experience-core@0.2.1`

A configuração de registry/leitura já foi integrada pela Helena no PR #16.
`NODE_AUTH_TOKEN` é fornecido pelo ambiente autorizado; nunca gravar o valor no repo.
No CI, é usado `GITHUB_TOKEN` com packages:read. O consumidor não compila AMF.
As versões e o lockfile dessa integração são preservados.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm content:sync
pnpm validate:content
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install --with-deps chromium
pnpm verify:browser
```

`validate:content` verifica drift entre Markdown e JSON e valida os contratos AMF.
`verify:browser` inicia web/API locais sem DB, executa route smoke, Library, Article,
dez capítulos do Guide, sete encontros e navegação anterior/próximo, e produz screenshots
desktop/mobile em `docs/evidence/track-a`. O CI publica esses ficheiros como artifact.
A verificação da waitlist usa só a API local sem DB; não envia inscrições a produção.

## Fonte e transformação

Originais integrais em `packages/project-content/sources/produto-01/`.
Proveniência: [pasta editorial](https://drive.google.com/drive/folders/1dehnDcGNI8XwGPd2O35B2B-VkVFos57y).
O master tem 42 936 bytes UTF-8; o Article original, 4 357 bytes.
Não se extraiu texto do PDF.

`scripts/transform-product.mjs` é o adapter estrutural **desta fonte editorial**,
não um contrato AMF paralelo. Remove apenas marcação Markdown de apresentação,
mapeia headings/callouts e mantém o texto. Quebras de linha/listas ficam preservadas.
- Guide: secção 3 integral + cartões e mapa da secção 4; dez capítulos.
- Article: leitura original, sem cabeçalho operacional, media brief e checklist de entrega.
- Journey: sete units ordenadas; cada uma referencia uma Publication diária derivada
  do mesmo capítulo. O Schema 0.2 referencia Publications completas, não fragmentos.
- Missions: exercício e versão curta; reflections: pergunta para guardar;
  check-ins text: campos do Mapa do Que É Meu. Todos opcionais, sem respostas pessoais.
- Biblioteca: Collection canónica com Article e Guide; as sete projeções diárias
  continuam resolvíveis pelo Core sem duplicar os cards do catálogo.
- Título do dia 6: “Experimentar”, conforme o texto de leitura original;
  a arquitetura editorial chama o mesmo encontro “Recuperar prazer”.

Briefs, hipóteses de preço, fontes e gates comerciais ficam no original humano;
não entram nas Publications nem no Program. Todos os itens estão em status preview.
As capas tipográficas existentes são a apresentação deste Preview; não se adicionaram
imagens do Drive nem se declarou aprovação comercial de assets.

Para substituir conteúdo: atualizar a fonte humana aprovada, executar content:sync,
rever o diff e validar. Mudanças no formato da fonte exigem adaptar o conversor, nunca
inserir texto editorial nos componentes React. Outros conteúdos AMF válidos podem
ser fornecidos pelo ContentSource sem alteração nos renderers.

## Experiência e acesso

`createManifestContentSource`, `loadJourneyModel` e `authorizeJourney` vêm do Core.
A autorização verifica Program e todas as Publications antes de renderizar.
Draft/archived não são servidos. Uma decisão negada não inclui conteúdo.
O Preview é público e marcado como pré-publicação; não representa entitlement de compra.

Journey usa navegação por URL, sem calendário obrigatório ou bloqueio de exercícios.
Não recolhe respostas, não cria uma conta fictícia e não persiste progresso.
Reader mantém apenas o adapter de memória da página já existente.
JourneyProgressAdapter persistente e identidade verificada ficam para Track B/Member Ready.

## Branch → PR → Preview → revisão

1. Branch de conteúdo a partir da base acordada; modificar fontes/manifest e validar.
2. Atualizar o PR DRAFT; GitHub Actions valida e Vercel cria Preview automaticamente.
3. Confirmar CI verde e deployment READY **do mesmo head SHA**.
4. Rever online Library, Article, Guide, Journey dias 1–7 em desktop/mobile.
5. Registar revisão humana e bloqueadores. Apenas depois de todos os critérios,
   atualizar contentReady; isto não aprova checkout, anúncios ou venda.
6. Merge/release requer instrução humana separada e coordenação com Helena:
   o workflow API existente pode ser acionado por mudanças no lockfile na main.
7. Rollback por revert dos commits de conteúdo/aplicação; sem migração de dados.

## Separação de QA

**Golden Pilot:** schema, referências, render, navegação, acesso, CI, Preview,
acessibilidade essencial, browser smoke e revisão humana online.

**Antes de venda:** copydesk, leitura piloto, direitos finais/arte/capa, preço,
checkout/entrega, reembolso/imposto, claims e gate comercial.
Os documentos QA originais continuam em sources/produto-01.
Sem migração, Supabase/RLS, secret, DNS, VPS ou mudança de waitlist.
