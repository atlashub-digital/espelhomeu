# EspelhoMeu — consumidor ARO / preparação E7

Substitui a implementação financeira local anterior do PR #30. SALES READY=false.

## Contrato

Fonte canónica: `atlashub-digital/atlashub-finance`, `openapi/aro-v1.yaml`, contrato
`docs/35_PROJECT_INTEGRATION_CONTRACT_V1.md`, kit Developer e plano
`docs/41_ESPELHOMEU_PILOT_EXECUTION.md` do branch backend auditado em
`9b9247ced0d5634cff64935009dad63cd3412564`.

- Sales → `/checkout/p01` (p01–p05/colecao) → BFF Next → ARO
  `POST /v1/checkout-sessions`; códigos `p01-br`…`p05-br`, `colecao-br`.
- Preços apresentados vêm do registry homologado; valor financeiro final vem do ARO.
  Roteamento/provider/preço confirmado/order/grant/revoke pertencem exclusivamente ao ARO.
- CPF/CNPJ vai apenas para criar a sessão; não é persistido no EspelhoMeu nem registado.
- Idempotency-Key estável por tentativa/dados; retry não muda a chave. QR local codifica
  `qr_payload` sem alterações; Copia e Cola usa `copy_paste`.
- Cookie cifrado AES-GCM HttpOnly contém capacidade de checkout, não direitos de acesso.
  Não é aceite o token antigo `espelho_access`. Checkout secret não entra em JSON/browser logs.
- Polling usa `X-ARO-Checkout-Secret` no servidor. UI recebe só estados normalizados.
- Antes do acesso: sessão comprovada → order canónico (`GET /v1/orders/{id}` com server key)
  → customer_id canónico → `POST /v1/entitlements/resolve`. Apenas ACTIVE, dentro da validade,
  no projeto e source_order_id da sessão permite Reader/Journey/download. Email digitado
  não é identidade e não permite herdar outras compras desse email.
- V1 mantém a compra desta sessão guest por sete dias, não uma conta multi-dispositivo.
  Recuperação de identidade/login e agregação de compras são trabalho posterior.
- Library apresenta adquirido/bloqueado; amostras comerciais continuam públicas. Conteúdo
  integral e downloads PDF/ZIP/Markdown passam por autorização no servidor.
- Retorno/sucesso e webhook nunca concedem acesso. Re-resolve no-store a cada acesso;
  falha/timeouts/revogação bloqueiam. Jornada/Membership não têm checkout.

## Configuração — Helena

Vercel/server web: `ARO_API_URL=https://aro.atlashub.si`, `ARO_PROJECT_SLUG=espelhomeu`,
`ARO_PUBLIC_KEY`, `ARO_SERVER_KEY`, `ARO_WEBHOOK_SECRET`, API origin existente.
Não imprimir valores. Nenhuma credencial de PixGo/MisticPay/Stripe no projeto.
O server key também deriva a chave de cifragem da capacidade; rotação invalida as
sessões guest existentes. Não colocar credenciais ARO no NEXT_PUBLIC.

API Fastify existente: apenas `ARO_WEBHOOK_SECRET` e DATABASE_URL já usada pela aplicação
para receipt dedupe. Não executa pagamento, reconciliação, order ou entitlement.

`POST /api/aro/webhook`: raw bytes + timestamp de 5 min + HMAC-SHA256 constante +
project/event ID. Encaminha os mesmos bytes/headers à API `/aro/webhook`, que verifica
novamente e grava só event ID/project/hash/timestamp em `aro_webhook_receipts`.
Unique PK faz dedupe concorrente; ID igual/hash diferente retorna 409. Sem DB/schema,
retorna 503, permitindo retry. Nenhum corpo com PII ou header secreto é guardado.

## Plano durável de dados

- Migration local financeira 0002 retirada do journal/caminho de execução e conservada
  em `docs/commerce/retired/0002_quick_checkout.sql` como referência histórica.
- Schema financeiro, providers, state machines/grants locais e deploy hook de 0002 removidos.
- Nova migration **0003_aro_webhook_receipts**, posterior ao timestamp de 0002, cria somente
  a tabela de dedupe. Não foi aplicada nesta tarefa; Helena valida/aplica no deploy da API.
- Tabelas financeiras legadas que já existam permanecem intocadas e não são consultadas.
  Não há DROP, backfill, migração de dinheiro ou conversão de direitos locais.
- Antes do smoke E7, confirmar API com 0003 e segredo HMAC igual ao configurado no ARO/web.
  O ARO deve alcançar o endpoint configurado; não desligar a proteção do Preview.

## Verificação determinística

`corepack enable`, `pnpm install --frozen-lockfile`, `pnpm validate:content`, `pnpm lint`,
`pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm verify:browser`.

Browser CI sobe um HTTP double local ARO com credenciais sintéticas, sem acesso a
providers. Prova P01→request ARO, PENDING bloqueado, ACTIVE abre, REVOKED bloqueia,
retorno forjado negado, downloads protegidos e regressão editorial autorizada por
entitlement da coleção. Nada neste smoke cria PIX real. O teste de webhook cobre
assinatura inválida/corpo alterado/expirado/projeto errado, duplicação e falha de receipt.

E7 real é separado: Helena faz deploy/config/binding, confirma P01→ARO e posteriormente
executa a prova financeira autorizada pelo PDG. Esta tarefa para antes de PIX real,
merge, publicação ou SALES READY. Quota Vercel pode impedir Preview sem afetar o CI;
reportar estado observado, não promover builds manualmente.
