# Segunda homologação — P01 + P02

P01 Guide humanamente validado. P02: READY FOR AMF INGESTION / Preview, não SALES READY.
PR #15 DRAFT, sem merge, release, checkout, alterações de dados ou produção.

## Fonte e mapeamento

Única fonte textual: [ESPELHOMEU_P02_MASTER_EDITORIAL.md](https://drive.google.com/file/d/1V2gssNotvPEukNiXPaKg5stqy0h6EzKb/view),
na [pasta canónica P02](https://drive.google.com/drive/folders/1zjI3zCbRNYBWHxpzutK0SiDXwar-E186).
Original integral preservado (31 792 bytes). PDF do eBook não foi usado para extrair texto.
99_ARQUIVO não foi consultado/ingerido. Leitura gratuita de marketing não foi promovida a Article.

| Fonte | Representação AMF / Reader |
| --- | --- |
| Sete capítulos | Uma Publication guide, sete chapters ordenados |
| Carta de abertura | Início do primeiro capítulo, com heading próprio |
| Carta de encerramento, como usar o caderno, limites editoriais | Final do sétimo capítulo, headings próprios |
| Exercícios / reflexões / insight | heading, paragraph e callout existentes; sem Program ou dias |
| Capa oficial | cover + MediaAsset image, Library e cabeçalho do Reader |
| FOTO_EDITORIAL_C01…07 | MediaPlacement before de cada capítulo, headings HTML |
| Caderno da Minha Assinatura | MediaAsset document: PDF original, 17 páginas |
| 14 cartões PNG | ZIP determinístico dos originais, MediaAsset document |

Downloads aparecem no índice e no fim do capítulo 7. Nenhum dado pessoal é recolhido.
A primeira imagem antecede também a carta de abertura: o renderer suporta anchors de capítulo,
não posicionamento entre blocos. Não se criou nova primitive para esta diferença.
Ficha editorial, índice operacional, checklist humano e instrução final de revisão de licença
ficam só na fonte humana. Avisos destinados à leitora e limites de saúde/privacidade permanecem.

Library: apenas **7 Dias Para Me Escolher** e **Eu Sou Bela — Do Meu Jeito**.
O Article uma-pausa-que-tambem-e-sua foi retirado apenas da Collection: continua resolvível para
testes técnicos/legacy, sem novo ciclo editorial. Não é apresentado como Produto 01 oficial.

URLs:
- /ler/7-dias-para-me-escolher
- /programas/7-dias-para-me-escolher
- /ler/eu-sou-bela-do-meu-jeito

## Alterações mínimas no pipeline

- P01 conserva o adapter, fontes, assets e toda a projeção Publication/Program anterior.
  check-imports.mjs verifica o fingerprint do conteúdo aprovado no head 2f382620.
- content/imports.json lista as novas ingestões. content/library.json controla a curadoria.
- import-guide.mjs converte intervalos explícitos de Markdown em blocos AMF existentes.
  sources/produto-02/import.json contém metadata/chapters/media canónicos e limites de seleção.
  É configuração de ingestão, não um contrato de conteúdo alternativo nem API de runtime.
- O renderer tinha uma restrição literal a produto-01. Foi generalizada para namespaces
  locais de conteúdo; mantém bloqueio de traversal e URLs arbitrários. Sem novo layout,
  componentes ou condições específicas para P02.
- Binários locais e delivery.json com hashes/tamanhos; sem Drive em runtime.
- Schema 0.2.0 e Experience Core 0.2.1 inalterados; lockfile e infraestrutura preservados.

## Repetição por Content Ops

1. Copiar master e assets autorizados de uma única pasta canónica; preservar source pack.
2. Preparar import.json: Publication canónica, capítulos, media e intervalos textuais exatos.
3. Registar hashes em delivery.json e adicionar entrada em imports.json e ID em library.json.
4. Executar content:sync, validate:content, lint, typecheck, testes, build, browser e Preview.
5. Rever diff e evidência do mesmo head; solicitar revisão humana.

Para Guides com esta gramática (paragraph/heading/callout + imagens/documentos), novos produtos
passam por dados/configuração, sem editar React nem criar outro adapter por produto. O teste
do importer exercita também outro Guide com apenas um capítulo e sem ramo específico de P02.
O processo ainda exige curadoria dos intervalos e media; não é ingestão automática de qualquer
Markdown arbitrário. Formatos não suportados devem ser avaliados, não silenciosamente descartados.

## Diferenças e limitações

- MEDIA_MAP fornece alts das aberturas com títulos. Nas fotos-base foi mantida a descrição
  visual sem afirmar a existência do heading rasterizado.
- FOTO_EDITORIAL_C03 e C04 contêm texto/mockups apesar da descrição “sem texto”.
  Ficheiros preservados; alts descrevem os mockups. Rever visualmente antes de aprovação P02.
- O próprio pack avisa que o logo da capa pode não corresponder pixel a pixel ao original.
  Sem redesenho nesta ingestão; aprovação comercial continua separada.
- Cartões são imagens originais em ZIP e também estão no workbook; não se fez OCR nem
  extração textual de PDF. A acessibilidade interna desses extras não foi certificada.
- Article legacy e observações anteriores de P01 não reabrem o Guide validado.
- Smoke online depende do acesso autorizado à Vercel. READY e CI verde não equivalem
  a smoke autenticado aprovado; relatório BLOCKED continua explícito quando há proteção.

## Verificação

CI Node 22: instalação frozen, conteúdo/refs, fingerprint P01, limites do importer,
lint/typecheck/testes/build. Browser desktop/mobile: dois cards/capas, P01 intacto,
sete capítulos P02, imagens carregadas, ausência de marcadores operacionais, downloads
PDF/ZIP e navegação/progresso; Journey P01 com sete units. Evidência no artifact do mesmo head.
Revisão humana P01 registada; P02 e gate global aguardam evidência online e revisão.
