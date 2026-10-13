# Final Catalog Sync — P04 v1.2 / P05 v1.3

Estado: READY FOR AMF INGESTION / Preview. Não SALES READY.
Base: main `06a00a62d5420e3f68dbefdeccb5b4ca55852ffc`, após merge do PR #18.
Branch: `feat/catalogo-p04-p05-final-sync`. S1 fica num PR separado.

## Fontes e identificação da entrega ativa

- P04: https://drive.google.com/drive/folders/1kz7t7X2QIt7A4dbQkSyWrx5aQJUPhwYZ
- P05: https://drive.google.com/drive/folders/1olPeLHsSGPAZ1u_7AnM5H1ursypM-gzR

Existem nomes duplicados nas pastas ativas. A seleção foi confirmada pelo conteúdo
dos READMEs/revisões e pelos hashes do `INVENTARIO_SHA256_vNEXT.json`, não apenas
pelo nome/data. Os IDs Drive e hashes dos ficheiros efetivamente ingeridos estão
em `packages/project-content/sources/produto-04/delivery.json` e no equivalente P05.
Masters preservados byte a byte. Nenhuma consulta a `99_ARQUIVO`, extração textual
de PDF ou de mockups. O inventário original é evidência de origem; não implica
ingestão de todos os ficheiros nele listados.

| Fonte | SHA-256 anterior → atual |
| --- | --- |
| P04 master | `ab1c785ffca4cbf29f4c528c7a7cd04b8788ca695ff4f3b1d418745bd104d102` → `7fda6e68d5cec3a5302406051159baaeaee0b5a3887b294f5cdee406f0d404ba` |
| P05 master | `2a20e837f9c2e0e8e533397f3888945435aa4c3ce95699bbeade8a1336a46f98` → `045b5b5684451e06c2676b042253b79bf0ab8daf96f95cfd2ec5fe6c687ff3d7` |
| P04 MEDIA_MAP atual | `87daabcd9550a42fb4291b843ad3f8c085b66f3f60eda24a1b5492d6d82fe67d` |
| P05 MEDIA_MAP atual | `908dd8edf4a24ca3760e31ea7a3e3ac59fd6d9ad9b5d53edc0a307ca5003d7b0` |

## Delta editorial e media

P04 mantém sete capítulos, exercícios/reflexões, Mapa de Novos Capítulos e nove
secções de navegação. Acrescenta à última secção o complemento «O meu próximo
capítulo»: três horizontes, carta e limites do material. P05 mantém 30 encontros,
cinco partes e 32 secções. Acrescenta à última secção «Um índice afetivo» e
«Uma página inteiramente sua», incluindo a nota final. O restante texto de leitura
anterior não foi reescrito. A linha de edição do master também foi atualizada pelo MGJ.

As capas ativas v1.2/v1.3 e três fotografias por produto substituem as imagens
antigas servidas pelo catálogo. Os três JPG são iguais entre os packs, por hash,
mas têm nomes/ordem próprios: seguem os maps, não são uma deduplicação editorial.

| Produto | Media 01 | Media 02 | Media 03 |
| --- | --- | --- | --- |
| P04 | abertura do capítulo 1 | capítulo 3, tempo/pausa | Mapa e continuidade |
| P05 | acolhimento inicial | encontro 19, escolhas/autonomia | encontro 25, continuidade/pausa |

Alts do MEDIA_MAP, capas identificadas pelo título. As imagens foram inspecionadas
visualmente; direitos comerciais e revisão editorial certificada continuam gates
humanos. Não se apresentam imagens sintéticas como testemunhos.

Workbooks/cartões v1.1 preservados, inclusive bytes e URLs, conforme os READMEs.
O inventário chama estes PDFs de v1.0, mas os hashes coincidem com os ficheiros
v1.1 ativos: divergência de nome documentada, sem substituir os extras.
CURADORIA_MEDIA ainda menciona nomes anteriores; o MEDIA_MAP atual é a autoridade
para as três fotografias ativas. QA/revisão/README/inventário guardados como fonte,
nunca renderizados no Reader. Propostas de preços nos READMEs não são ofertas.

## Divergência de paginação MGJ

| Produto | Revisão editorial/visual | QA_PUBLICACAO |
| --- | --- | --- |
| P04 | 25 páginas | 28 páginas |
| P05 | 38 páginas | 41 páginas |

Não tentámos resolver a divergência extraindo texto dos PDFs. Paginação física não
é contrato do WebReader: o Markdown e a estrutura editorial são a fonte canónica.

## Pipeline e compatibilidade

O complemento aparece depois das notas operacionais no master. Uma única extensão
genérica do importer permite `end: null` para uma secção terminar no fim do ficheiro.
As recipes omitem explicitamente os quatro parágrafos operacionais intermédios.
Isto conserva o complemento sem inventar capítulos, contratos AMF ou primitives.
IDs, slugs, URLs, ordem e número de secções mantidos; só os novos media têm novos IDs.
P01/P02/P03 e Journey P01 preservados por fingerprints. Nenhuma alteração React,
AMF upstream, dependências, API, Supabase, waitlist, checkout ou infraestrutura.

## Reprodução e verificação

Node 22, acesso de leitura aos packages AMF já configurado no CI:

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

O sync valida SHA-256 de masters, assets e documentação desta entrega. Checks
verificam suplementos presentes, 7 capítulos/30 encontros/5 partes, ausência de
marcadores operacionais e preservação P01–P03. Browser percorre secções desktop e
mobile, verifica imagens/downloads, suplementos e regressões P01/P02/Journey.
CI publica screenshots e relatório. Links do head/CI/Preview ficam no PR.

Helena: smoke operacional autenticado do Preview no mesmo head após entrega.
Não reutilizar o PASS do PR #18. Revisão humana e smoke online são distintos do
browser local do CI. Não houve ativação SALES READY nem deploy público deliberado.
