# Atlas Access V1 — fase 2 (preview controlado)

**ACCESS V1 LIVE: NO.** Flag `ACCESS_V1_ENABLED=false` por defeito na API e web.
Sem deploy, SMTP, envio real, mudanças no Master ou checkout E7.
Contrato: [ADR Atlas Access V1](https://github.com/atlashub-digital/atlas-ops/pull/19),
[EspelhoMeu #31](https://github.com/atlashub-digital/espelhomeu/issues/31).

## Implementação real

- Fastify: `POST /access/challenges`, `POST /access/recover`,
  `POST /access/challenges/verify`, `GET /access/session`, `POST /access/logout`.
- Adapter server-side `@supabase/supabase-js`: gera prova, verifica com `verifyOtp`,
  roda refresh tokens, verifica utilizador confirmado e revoga com
  `auth.admin.signOut(accessToken, "local")`. Não usa ban global nem revoga Club.
  Clientes Supabase independentes por operação, sem sessão partilhada em memória.
- Código da aplicação CSPRNG de 6 dígitos / TTL 5 minutos; token de link com 256 bits /
  TTL 10 minutos. HMAC dos segredos, AES-256-GCM das provas Supabase, contactos e
  refresh/access tokens. Chave de cifragem independente, só na API.
- PostgreSQL `access_v1_records`: desafios, contadores e sessões duráveis. Advisory
  transaction locks serializam até chaves inexistentes entre processos. Consumo
  local antes da chamada Supabase; falha/crash exige novo desafio. Cinco tentativas
  por desafio; tentativa correta na sexta é negada. Projeto fixo `espelhomeu`.
- Sessão opaca aleatória no cookie `__Host-espelho_access`, Secure / HttpOnly /
  SameSite=Lax / Path=/ / sem Domain, máximo absoluto 604800 segundos. Só hash do
  identificador no banco. Cada leitura de sessão roda refresh sob lock, verifica
  identidade e estado remoto; erro revoga localmente. Refresh não estende sete dias.
  Logout confirma revogação local antes de chamar o provider; falha remota mantém
  cookie antigo inutilizável no projeto. Novo login revoga sessão local anterior.
- POST exige Origin exata na allow-list; proxy web exige same-origin e só encaminha
  o cookie Access. Respostas sem cache; sem bodies, contactos ou tokens nos logs.
- Respostas de criação iguais (ID opaco + resend_after), incluindo falha do provider
  e limite atingido. Limites: 3/identificador/minuto, 10/IP/minuto e 100/projeto/minuto,
  contadores HMAC partilhados no banco. IP usa o peer TCP, ignorando forwarded headers
  controláveis pelo cliente; atrás do proxy o limite é conservador por peer.
- Biblioteca: escolha e-mail/código ou link, erros de código/link expirado ou
  inválido, novo pedido, confirmação explícita do link, logout e sessão após reload.
  Link da aplicação: `/biblioteca#access_challenge=<id>&access_token=<segredo>`.
  Fragmento é removido do histórico e nunca enviado ao servidor. GET não autentica;
  apenas botão/POST consome. Destino fixo `/biblioteca`, sem redirects arbitrários.

## Diferença necessária face ao brief: emissão sem envio

O Master tem OTP global de 8 dígitos / 3600s. `signInWithOtp` enviaria e-mail real com
esse template partilhado. Não é possível impor os 6 dígitos da aplicação usando
apenas esse envio nativo sem transporte/template autorizado. Por isso esta fase usa
`auth.admin.generateLink({type: "magiclink", email})`, que gera prova **sem envio**,
e guarda o `hashed_token` Supabase cifrado, associado ao desafio da aplicação.
O código/link próprio confirma posse no transporte controlado; só então o backend
consome a prova via `verifyOtp({token_hash, type: "email"})`. Não se usa `email_otp`
nativo, não se muda TTL/length, site_url, allow-list nem SMTP do Master.
Referências: [generateLink](https://supabase.com/docs/reference/javascript/auth-admin-generatelink),
[refreshSession](https://supabase.com/docs/reference/javascript/auth-refreshsession),
[admin.signOut](https://supabase.com/docs/reference/javascript/auth-admin-signout).

A emissão está limitada a backend **não production** com `ACCESS_V1_TEST_MODE=true`
e `ACCESS_V1_TEST_TOKEN` forte. A rota `GET /access/testing/challenges/:id` exige esse
segredo no header `X-Access-Test-Token` e revela só o segredo do desafio antes do
consumo/expiração. A web nunca encaminha essa rota nem recebe o segredo de teste.
Em production, mesmo com flags true, não se monta essa rota e a API Access falha
fechada (503). Um transporte real exige alteração revista e gate explícito; ligar
apenas a flag não envia mensagens. Gerar desafio pode criar utilizador Supabase:
qualquer teste manual contra Master também precisa de autorização; os testes deste
PR usam apenas stub local, nunca credenciais ou rede do Master.

## ARO e limitações deliberadas

`POST /access/aro/claim` devolve sempre `409 not_available_yet`. Interfaces de prova e
adapter prontas em `apps/api/src/access/claim.ts`; contrato hosted ARO #24 pendente.
Não existe associação por e-mail digitado nem inferência automática de compras.
Login verificado sozinho não desbloqueia Reader/downloads. O gate da fase 1 exige
sessão válida + posse de checkout comprovada + pedido APPROVED + entitlement ACTIVE
do mesmo projeto/pedido; ARO continua autoridade. Binding cross-device utilizável
fica fechado até existir prova de associação aprovada pelo ARO.

O caminho E7 existente, cookie `espelho_aro_checkout` e `entitlements/resolve`
server-side em cada acesso pago permanecem intactos. A suíte existente cobre acesso
pago; nova suíte comprova que autenticação sem entitlement mantém Reader e downloads
fechados e não altera o cookie E7. WhatsApp e entrega de mensagens não implementados.

## Verificação e operação

`pnpm lint && pnpm typecheck && pnpm test && pnpm build`, `pnpm validate:content`,
`pnpm verify:browser` e `pnpm verify:access` (Chromium instalado).
A última inicia Next dev e API isolada, SDK Supabase real contra stub HTTP GoTrue
local e store em memória exclusivo dos testes. Não prova entrega real de e-mail.
`access.e2e.test.ts` testa API/adapter HTTP e casos negativos; `service.test.ts` testa
política; `store.integration.test.ts` testa PostgreSQL real, duas instâncias,
consumo concorrente, persistência após reinício e revogação. Este último só corre
com `ACCESS_TEST_DATABASE_URL` de banco descartável e migração `0004_access_v1.sql`
aplicada; CI fornece serviço PostgreSQL e executa também ambos os E2E de navegador.

Aplicar migração apenas no banco local/preview autorizado; nunca no Master. Para
retenção, eliminar no banco da aplicação registos com `updated_at < now() - interval
'8 days'` em manutenção autorizada (todas as sessões/desafios já expiraram). Apagamento
individual pode remover sessões pelo principalId verificado server-side; não expor
consulta por contacto. A perda/rotação da chave invalida os segredos persistidos.

Rollback técnico: desligar `ACCESS_V1_ENABLED` na web/API; rotas Access deixam de
emitir ou aceitar sessões e UI desaparece. Não apagar tabela nem cookie E7. Teste
automático cobre flag OFF e bloqueio do modo de teste em production. Nenhuma
ativação, credencial, configuração de infraestrutura ou deploy integra esta entrega.

## Evidência local de 2026-10-18

- `pnpm validate:content`: PASS (9 testes de validação + projeções/hashes/imports).
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`: PASS.
- `pnpm test` com PostgreSQL descartável: 60 testes, sem skips.
- `pnpm verify:browser`: PASS, 95 checks existentes (inclui checkout/Reader e mobile).
- `pnpm verify:access`: PASS, navegador com OTP, reload, cookie seguro, logout,
  replay de sessão revogada, Magic Link GET/POST/replay, CSRF, claim 409,
  Reader/downloads bloqueados sem compra e cookie E7 preservado.
- Master/SMTP/envio real não chamados; provider testado pelo SDK contra stub HTTP.
- SHA, URL do PR draft e resultado CI ficam no PR/relatório final para apontar
  exatamente para o commit testado. Não houve teste manual de entrega de e-mail.
