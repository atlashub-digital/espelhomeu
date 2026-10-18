# Atlas Access V1 — fase 3

Implementação no mesmo branch do PR [#33](https://github.com/atlashub-digital/espelhomeu/pull/33).
**ACCESS V1 LIVE: NO.** Esta correção não faz merge, pagamentos, envios reais ou alterações do Master.

## Entrega e identidade

E-mail transacional: `ACCESS_V1_EMAIL_PROVIDER=resend|smtp`, default `smtp`
para preservar compatibilidade. Staging deve selecionar `resend` quando autorizado,
sem mudar configurações de deploy nesta tarefa. Resend usa
[POST HTTPS /emails](https://resend.com/docs/api-reference/emails/send-email),
Bearer `RESEND_API_KEY`, `RESEND_FROM` (default `contact@atlashub.si`), destinatário,
assunto e texto idênticos ao SMTP, tag `category=atlas-access`.
Timeout 8s, redirects proibidos; sem key falha `delivery_disabled`; erro HTTP,
rede ou resposta sem ID falha `delivery_failed`. Sem retries automáticos no
adaptador; idempotência local e cooldown de 60s continuam no serviço.
Aceitação pela API não prova entrega final.

SMTP mantém TLS obrigatório e timeout de 8s, sem debug/log de payload. A credencial
SMTP de `contact@atlashub.si` não está disponível: o token de gestão da Email API
Hostinger não é uma credencial de envio SMTP. Nenhum segredo foi consultado ou
alterado nesta tarefa.

Ambos exigem `ACCESS_V1_EMAIL_TRANSPORT=live`; em não-production cada endereço
tem de constar em `ACCESS_V1_EMAIL_ALLOWLIST`. Em production exige também
`ACCESS_V1_LIVE_ENABLED=true`. Defaults OFF; nenhuma variável de deploy alterada.

WhatsApp: mesma política com `ACCESS_V1_WA_TRANSPORT`, `ACCESS_V1_WA_ALLOWLIST` e gate
LIVE. URL interna e instância fixas: `http://atendimento-evolution:8080`, `atlashub-wa`.
Key apenas em `ATENDIMENTO_EVOLUTION_KEY`. Envio direto, sem Chatwoot/inbox 7 ou Clara.
Formato [Evolution 2.3.7](https://github.com/EvolutionAPI/evolution-api/blob/2.3.7/src/api/dto/sendMessage.dto.ts):
`number` sem +, `text`, `delay: 100`. HTTP 2xx e status reconhecido quando presente
indicam aceitação, não prova de posse; só o consumo do OTP/link prova o número.

Número canónico E.164, consentimento transacional afirmativo no formulário/API,
limites separados por identificador, IP e projeto, TTL/5 tentativas/single-use existentes.
WhatsApp mantém principal local por hash de contacto, sem inventar e-mail Supabase,
sem ligar automaticamente telefone a e-mail, sem autoridade financeira. Logout revoga
no store; nova posse do mesmo canal recupera o principal. Opt-out autenticado em
`POST /access/opt-out` suprime novos pedidos por WhatsApp; e-mail continua alternativa
com verificação própria. Não há fallback automático nem CPF.

Cooldown de 60s serializado por contacto; reenvio reutiliza ID, segredo e expiração
originais. Mudança de método invalida o anterior. Segredo/contacto para reenvio cifrados
AES-GCM e eliminados no consumo. Tentativas/resultados ficam em `access_v1_records`
com hash HMAC do contacto, canal, timestamps e estado, sem OTP/link/PII na auditoria.
Três falhas de transporte abrem circuito por 60s. Falha não persiste challenge utilizável,
sessão ou grant. Sessões/compras já existentes não dependem de notificações.

## ARO: consumidor pronto, emissão externa pendente

Fontes: [ADR PR #19](https://github.com/atlashub-digital/atlas-ops/pull/19),
[ARO #24](https://github.com/atlashub-digital/atlashub-finance/issues/24),
[WhatsApp #21](https://github.com/atlashub-digital/atlas-ops/issues/21).
O hosted checkout pertence a **atlashub-finance**, não ao espelhomeu-api.
A `main` ARO consultada ainda não publica endpoint de troca de claim. Nenhum endpoint
foi inventado como já disponível: sem `ACCESS_V1_ARO_CLAIM_URL` + SERVER KEY scoped,
`POST /access/aro/claim` mantém **409**. A emissão e integração hosted continuam para
PR no atlashub-finance; não há alegação de handoff LIVE concluído.

Contrato consumidor proposto (a acordar com o emissor antes de configurar):

- POST backend ao endpoint HTTPS explícito, `Authorization: Bearer <SERVER KEY scoped>`;
  corpo `project`, `orderId`, `checkoutSessionId`, `offerId`, `proof`, `principalId`.
- Resposta: os mesmos vínculos, `aroCustomerId`, `orderStatus=APPROVED`,
  `entitlementStatus=ACTIVE`, `issuedAt`/`expiresAt` em milissegundos, TTL <=120s.
- O emissor deve verificar assinatura/posse legítima da sessão hosted, projeto, oferta,
  principal verificado e consumo atómico; pedido/entitlement consultados na troca.
- Consumidor exige sessão Atlas Access já verificada por canal. Não cria identidade
  a partir de e-mail digitado, query, postMessage ou status do browser. Grava binding
  cifrado do principal apenas após troca autorizada; replay local negado mesmo se a
  rede falhar. ARO deve também negar replay entre consumidores.
- Reader consulta `/access/entitlements` no backend. Cada leitura revalida pedido
  APPROVED e entitlement ACTIVE em ARO via SERVER KEY; binding não concede acesso
  autónomo. Reembolso/revogação/indisponibilidade negam acesso. O binding P01 do
  principal é recuperável por nova posse do mesmo canal, incluindo novo dispositivo.
- `espelho_aro_checkout`, `/api/access/claim` legado e P01/E7 preservados. A nova
  integração é `/api/access/aro/claim`; a compatibilidade E7 permanece independente.

## Verificação e rollback

`phase3.test.ts`: SMTP fake local, mocks HTTP Resend/Evolution, gates, cooldown/reenvio,
auditoria, breaker, WA OTP/Magic Link, opt-out, rate limit por número, troca HTTP ARO,
estados negativos, TTL, vínculos, replay e concorrência. PostgreSQL isolado testa
persistência, consumo entre workers, concorrência acima do pool e rollback aninhado.
Atualizações aninhadas partilham a transação para evitar esgotamento do pool.

`pnpm verify:access`: browser → BFF → API → SMTP local/GoTrue stub; WA mock;
claim ARO mock → Reader autorizado → reembolso nega; E7 preservado, CSRF,
logout/replay e Magic Link antiscanner. O emissor simulado não substitui validação
contra o futuro serviço ARO real nem testes de entrega com destinatários controlados.

Rollback de aplicação: manter `ACCESS_V1_ENABLED=false` (default); transports OFF,
LIVE false e claim URL ausente. E7 continua ativo. Nenhuma migração nova ou alteração
de config global/SMTP/TTL/allowlist do Master foi necessária. O rollback por flags
é coberto pelos testes de rota desabilitada e gates de transporte.

### Evidência local — 2026-10-18

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` e `pnpm verify:access`: PASS.
- 78 testes PASS, incluindo os dois testes PostgreSQL no container isolado de teste;
  nenhuma ligação ao Master ou à base de produção.
- `pnpm validate:content`: PASS. `pnpm verify:browser`: PASS (95 verificações).
- Reforços da revisão: binding exige a mesma oferta; falha no reenvio elimina o
  payload cifrado de entrega; testes negativos de gates e expiração WhatsApp.
- Nesta implementação, entrega externa e validação móvel manual não foram executadas.
  A homologação externa anterior é registada separadamente abaixo. ACCESS V1 LIVE: NO.

### Correção e homologação — 2026-10-18

- JSONB: o E2E conjunto ARO PR #25 encontrou challenge persistido como string,
  impedindo `previewSecret`/sessão. A correção usa fronteira text explícita e um
  cast JSONB, compatível com os serializadores modificados pelo Drizzle e com
  postgres-js puro. Testes verificam objeto JSONB, segredo e sessão entre instâncias.
- Resend: testes mockados de OTP/Magic Link idênticos ao SMTP, tag transacional,
  sucesso, 5xx/rede/resposta inválida, ausência de key, gates OFF/allowlist/LIVE,
  concorrência e cooldown com o mesmo challenge/segredo. Nenhum envio externo.
- Evidência de homologação anterior fornecida no brief: WA OTP entregue e
  confirmado pelo PDG em 18/10/2026; e-mail Resend para
  `atlashub.digital@gmail.com`, ID `01a15142-27d3-78eb-b38e-8db2a92d9df2`,
  `last_event=delivered`. Domínio `atlashub.si` verificado e sending enabled
  segundo essa homologação. Não foi repetida nem consultada com credenciais aqui.
- Estas evidências não ativam Access em produção nem substituem os gates comerciais.

Validação da correção: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`,
`pnpm verify:access` e `pnpm validate:content` PASS; 84 testes, zero skips, incluindo
três percursos PostgreSQL. O fixture ARO do navegador usa um único instante para
issuedAt/expiresAt, evitando TTL acidental de 120001 ms. E2E conjunto reproduz
challenge/previewSecret/sessão, claim/Reader backend, replay, refund/chargeback,
revogação, cross-tenant, TTL real de 120s e indisponibilidade; sem pagamentos,
provider externo ou envio de mensagens. Evidência detalhada e CI no corpo do PR.
