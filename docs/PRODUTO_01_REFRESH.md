# Produto 01 — refresh oficial para homologação

Única fonte: [pasta canónica](https://drive.google.com/drive/folders/1dehnDcGNI8XwGPd2O35B2B-VkVFos57y).
Estado: HOMOLOGAÇÃO / PREVIEW. PR #15 DRAFT; sem merge, release ou autorização comercial.

## Ingestão e estabilidade

| Entrega oficial | Integração |
| --- | --- |
| 00_MASTER_EDITORIAL/ESPELHOMEU_P01_MASTER_EDITORIAL.md | Original humano integral; Guide e sete leituras diárias |
| 04_MARKETING_E_COMERCIAL/LEITURA_GRATUITA_LEAD_MAGNET_v1.0.md | Article integral de entrada, excluindo instruções operacionais |
| 01_CAPA_E_IDENTIDADE/CAPA_PREMIUM_1024x1536.jpg | Capa na Library e WebReader, sem corte |
| 02_MEDIA_EDITORIAL/ABERTURA_DIA_01…07.jpg | Antes da leitura de cada dia no Guide e Journey; headings em HTML |
| 02_MEDIA_EDITORIAL/MEDIA_MAP.md | Alt text preservado integralmente |
| 03_WORKBOOK_E_EXTRAS/WORKBOOK_7_DIAS_v2.0.pdf | Download no índice do Guide e capítulo dos cartões |
| 05_QA_E_ENTREGA | QA, inventário, nota e relatório técnico preservados como fonte |

Master: 42 987 bytes; Article: 4 357 bytes. O texto de leitura mantém-se; apenas versão
e estado do cabeçalho do master mudaram nesta entrega. Article sem alteração textual.
Não se extraiu conteúdo de PDF. Não se consultou nem combinou 99_ARQUIVO.
Os quatro snapshots anteriores foram substituídos pela estrutura normalizada atual.
IDs/slugs/URLs de Article, Guide, capítulos, Program, units e atividades permanecem iguais.
Continuam exatamente sete unidades; Guide conserva dez capítulos e o mapa/workbook textual.
Schema 0.2.0 e Core 0.2.1, sem alteração de dependências/lockfile/contratos.

Os assets originais ficam em apps/web/public/conteudo/produto-01. O inventário
sources/produto-01/delivery.json liga cada cópia ao file ID oficial e hash Git verificado.
Não há dependência do Drive em runtime. Media JSON é um conjunto de MediaAsset canónicos,
não um novo contrato local. Não se criaram extras inexistentes, áudio ou campanhas.

## Diferenças e revisão editorial

- MEDIA_MAP dia 4 descreve espelho/flores, mas ABERTURA_DIA_04 é um close de rosto.
  Outros alts podem descrever a composição ampla mais do que o recorte. Mantidos
  conforme a fonte; pedir validação/correção à equipa editorial, sobretudo por acessibilidade.
- Dia 4 mantém “Escolher referências” do master, apesar do rótulo curto “ESCOLHER” no mapa.
  Dia 6 mantém “Experimentar”, como a leitura e a integração existente.
- Capa e logo autónomo foram comparados visualmente: ambos usam espelho cobre, perfil
  feminino e wordmark EspelhoMeu. A conformidade final da identidade continua na revisão humana.
- DIVISORIA_CAPITULO é prova gráfica com título aplicado; usamos ABERTURA_DIA conforme o mapa.
  PDF do eBook e provas gráficas continuam referências de entrega, não fontes de texto.
- O workbook PDF é o único extra entregue nessa pasta. Cartões também permanecem acessíveis
  como texto HTML no último capítulo, sem depender da acessibilidade interna do PDF.
- Dados de preço/campanhas do master e README não entram no manifest nem ativam checkout.

## Evidência e gate

CI do mesmo head executa validate:content, lint, typecheck, testes, build e route smoke.
Playwright desktop/mobile verifica Library/Article, capa, imagens dos sete dias no Guide
e Journey, referências/navegação/progresso e download PDF. Screenshots de cada dia e
workbook acompanham o artifact track-a-visual-evidence, além das superfícies principais.

O smoke Vercel distingue PASS de BLOCKED por Deployment Protection. CI verde e deployment
READY não substituem browser online autorizado e revisão humana. contentReady permanece false
até essas etapas e a avaliação da divergência de alt text não deixarem bloqueadores.

QA técnico Golden Pilot é separado de copydesk, leitura piloto, direitos finais,
preço, cobrança e publicação comercial. Nenhuma mudança de Supabase/RLS/waitlist/produção.
