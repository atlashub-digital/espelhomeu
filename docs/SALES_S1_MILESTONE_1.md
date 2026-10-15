# Sales Engine S1 — Entrega 1

Baseline editorial `095bcf1c711050bb5c08aad228a6bbe557120787`. Branch preparada
`feat/sales-s1-collection-landing`, incluindo os documentos de governação existentes.
Relaciona #20, #21, #22, #23, #24, #25, #28; não encerra o gate visual S1.

## Auditoria e decisões

A antiga `/` anunciava apenas a lista de espera de 21 Dias. Foi preservada em
`/lista-de-espera`, com o mesmo formulário, ação e política. A nova `/` apresenta
marca, seleção por intenção, cinco produtos, coleção, experiência WebReader,
extras e capacidades futuras. `/inicio`, Library, Reader e Journey não foram alterados.

Preços aprovados pelo PDG prevalecem sobre propostas antigas no pack e nos issues.
São inteiros em centavos no Offer Registry, nunca dentro de Publications.
Coleção reúne cinco produtos; bundles candidatos não têm preço. Todas as ofertas
têm `purchaseEnabled: false`. Nenhum pagamento, pedido ou entitlement é criado.

## Arquitetura

- `packages/project-config/src/sales.ts`: ofertas, relações, políticas AMF planeadas,
  preços, estados de apresentação, UTMs e envelope de eventos sem PII.
- `apps/web/src/lib/sales-narratives.ts`: ângulo, intenção e variantes comerciais.
- `apps/web/src/lib/sales-data.ts`: projeção server-only do catálogo. Envia apenas
  título, estrutura, capa, nomes dos extras e dois blocos por amostra aos componentes.
- `components/sales`: composição server-side e ilhas interativas pequenas.
  Hero, promessa, estrutura, amostra, extras, oferta, cross-sell, FAQ e CTA reutilizáveis.
- Nenhuma nova primitive AMF. AccessPolicy existente é reutilizada como política
  comercial planeada; não modifica a autorização editorial aberta do baseline.

## Rotas e diferenças

| Rota | Funil |
| --- | --- |
| `/` | Marca, escolha por intenção, coleção e prova da experiência |
| `/colecao` | Comparação de cinco intenções, coleção e bundles candidatos |
| `/7-dias-para-me-escolher` | Entrada; três perguntas opcionais, amostra e Journey P01 |
| `/eu-sou-bela-do-meu-jeito` | Expressão; seletor de intenção sem scoring |
| `/21-dias-meu-melhor-reflexo` | Continuidade; três atos, 21 encontros e estrutura expandível |
| `/recomecar-depois-dos-40` | Novos capítulos; seletor de intenção e sete capítulos |
| `/diario-de-amor-proprio` | Amostra experiencial; três trechos alternáveis, 30 encontros/cinco partes |
| `/jornada` | Proposta integrada, preço aprovado, em preparação |
| `/membership` | Proposta recorrente, preço aprovado, sem assinatura ativa |

O P03 tem sequência editorial de 21 encontros no WebReader, mas não um Program
interativo canónico próprio. A página informa essa diferença; não inventa um
Journey nem altera upstream. Só P01 liga ao Journey já homologado.

## Media e copy

Fonte: Drive `1chpvKSVrvT2dHbjBWUmcmLuTdFBd0Et5` →
`ESPELHOMEU_MARKETING_PRO_20261013_v1`. Heroes dos cinco volumes, collection hero
e duas composições de bundles usados sem alterar o original. Proveniência e hashes
em `docs/sales/media-provenance.json`. Fotos/capas editoriais já homologadas completam
a composição HTML. Não foram consultados rascunhos de laboratório.

Ângulos vêm de `COPYS_5_VOLUMES_PTBR.md` (Drive `1oeaGzAlOmbDiPIbrzRdH7o6xBa7fq1Bp`).
As referências do pack a WebReader futuro/Hotmart-only foram corrigidas conforme PDG.
O preço P05 antigo e as contagens físicas divergentes não foram importados. Visuais
BENEFICIOS com paginação física ficaram fora desta entrega. A copy comercial é
nova composição para revisão; nenhum master foi reescrito. Direitos comerciais
dos visuais continuam a exigir aprovação antes de venda pública.

## Access states e amostras

As páginas de produto apresentam PREVIEW. `/s1-demo` permite verificar PUBLIC,
PREVIEW, LOCKED e ACQUIRED apenas em `VERCEL_ENV=preview` ou desenvolvimento;
produção devolve 404. Demonstração de apresentação não concede acesso e não guarda
entitlements. A Library permanece a experiência editorial homologada.

As amostras são recortes estruturais de blocos completos, selecionados no servidor.
O catálogo de demonstração continua aberto como no baseline. S1 não implementa
paywall, nem afirma proteger os assets editoriais já públicos. A proteção integral
server-side, identidade e grants pertencem S2/S3 antes da abertura comercial.

## Atribuição

SalesLink preserva `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` na
navegação comercial e na entrada para Reader/Library. Só slugs até 64 caracteres;
emails, texto livre, URLs, valores duplicados e sequências numéricas longas são
descartados. A navegação interna posterior do Reader mantém o comportamento atual.

Evento local `window` CustomEvent `espelhomeu:sales`, sem transporte, pixels, cookies
ou persistência: sales_page_view, quiz_start, quiz_complete, sample_open, offer_cta,
bundle_cta, collection_cta. Payload limitado a projeto, offer/product, superfície e
UTMs aceites. Respostas nunca são incluídas. Escutar esse evento é o ponto explícito
para futura integração consentida; isto ainda não mede conversões reais.

## Reprodução e gates

Node 22; corepack enable; pnpm install --frozen-lockfile; pnpm validate:content;
pnpm lint; pnpm typecheck; pnpm test; pnpm build; pnpm exec playwright install
--with-deps chromium; pnpm verify:browser.

Neste ambiente a instalação privada exige token de leitura e retorna 401 sem ele.
CI usa a configuração GITHUB_TOKEN existente. Nada mudou em secrets/infra.
Testes cobrem preços, referências, políticas, UTMs, eventos, funis, estados e a
regressão editorial já existente. Browser local CI roda como Preview para verificar
o demonstrador; o endpoint não é um grant. Screenshots desktop/mobile no artifact.

Helena: smoke autenticado no Preview do mesmo head; confirmar o binding Vercel.
MGJ/Laura/PDG: revisão visual, narrativa e CRO antes de otimizar/completar S1.
S2/S3 só depois do gate: checkout, confirmação, identidade, grants/revogação,
políticas comerciais e fulfillment. Não houve lançamento público ou SALES READY.

## Fecho do review — milestone 1

- `/` mantém descoberta de marca, escolha por intenção e prova do Reader. `/colecao`
  tem hero próprio, oferta completa prioritária e comparação de intenção, estrutura,
  materiais e preço individual de cada volume; não repete a sequência da homepage.
- Valor da coleção calculado pelo Offer Registry: soma dos preços individuais atuais,
  preço da coleção e diferença. Não é compare-at, desconto anterior ou urgência.
  O cálculo recusa referências incompletas, preço ausente e moeda/cadência divergente.
- P01: a primeira escolha contextualiza o convite, a segunda escolhe leitura (Dia 1),
  reflexão (Dia 2) ou escrita (Cartões/Mapa), a terceira determina a orientação de ritmo.
  O CTA abre a amostra correspondente. Sem inferência, score ou persistência de respostas.
- P02/P04: cada intenção aponta explicitamente para um capítulo existente, apresenta
  contexto e abre dois blocos canónicos desse capítulo; nenhuma alteração editorial.
- Bundles sem preço saem do cross-sell principal. Na coleção permanecem identificados
  como combinações em preparação, sem valor indefinido apresentado como oferta.
- Jornada/Membership: pedido manual por email com consentimento próprio e desmarcado.
  Ver SALES_INTEREST_PREVIEW.md. Não reutiliza a finalidade da waitlist de 21 Dias,
  não afirma inscrição automática e não envia emails nos testes.

### Fronteira de release — bloqueante

`gate.salesReady=false` e `purchaseEnabled=false` permanecem explícitos. CI verde,
Preview READY e smoke aprovado **não autorizam merge nem lançamento**. Esta PR
substitui a homepage e o merge para main pode disparar os deploys existentes; por isso
permanece DRAFT e sem auto-merge. Exige autorização explícita do PDG para release
produtivo, ou implementação/revisão prévia de um feature flag seguro para produção.
Aprovação técnica/visual deste milestone não substitui essa autorização. Não foi
alterada configuração de deploy nem ativada produção nesta entrega.
