# Arquitetura técnica — EspelhoMeu

**Estado: proposta.** Este documento recomenda o stack; a aprovação formal fica registada no Notion (ver README).
A base no repositório é deliberadamente mínima: até ao E02 PASS não se constroem funcionalidades de produto.

## Visão geral

```
Utilizadora ──HTTPS──> Vercel (Next.js, apps/web)
                          │  fetch / Server Actions
                          ▼
                 VPS ── Caddy (TLS) ──> API Fastify (apps/api) ──> Postgres
                                             │
                                             ├─> Armazenamento de fotos (S3 compatível, UE, privado)
                                             ├─> Claude API (agente "Meu Espelho")
                                             ├─> Serviço de imagem (simulação de cabelo)
                                             └─> Stripe (UE) / PixGo (PIX Brasil) — webhooks
```

| Camada | Escolha | Porquê |
| --- | --- | --- |
| Frontend | **Next.js 16** (App Router, React 19, TypeScript, Tailwind 4) em **Vercel** | Deploy por push no GitHub, previews por PR, SSR para SEO e páginas de oferta rápidas. |
| Backend | **Node 22 + Fastify 5** (TypeScript) em Docker na **VPS** | Leve, rápido, bom ecossistema; mesmo idioma que o frontend; tipos partilhados. |
| Tipos partilhados | `packages/shared` com **zod** | Um só contrato entre web e API (consentimentos, mercados, respostas). |
| Base de dados | **PostgreSQL 17** na VPS, **Drizzle ORM** + migrações SQL versionadas | Relacional, simples de fazer backup; Drizzle gera SQL legível. |
| Proxy / TLS | **Caddy** | HTTPS automático (Let's Encrypt) sem configuração manual. |
| Monorepo | **pnpm workspaces** | `apps/web`, `apps/api`, `packages/shared` num só repositório e num só CI. |
| CI | **GitHub Actions**: lint, typecheck, testes, build | Bloqueia PRs partidos antes de chegar à Vercel ou à VPS. |
| Deploy API | Imagem Docker no **GHCR** em cada push para `main`; SSH para a VPS faz `docker compose pull && up -d` | Reprodutível, com rollback por tag (`:<sha>`). |

## Decisões ainda abertas (recomendação entre parênteses)

1. **Autenticação** (magic link por email gerido pela API, sessões em cookie `httpOnly` no domínio da API; Better Auth como biblioteca).
   Sem password reduz suporte e risco; adequado a uma oferta concierge.
2. **Armazenamento de fotos** (bucket S3 compatível com região UE e sem acesso público, p.ex. Cloudflare R2 com jurisdição UE
   ou o object storage do próprio fornecedor da VPS). URLs assinadas de curta duração; apagamento automático
   após o fim da jornada salvo consentimento contrário. Evitar guardar fotos no disco da VPS.
3. **Agente "Meu Espelho"** (Claude API a partir da API, nunca do browser). Memória = registos estruturados em Postgres
   (escolhas, preferências, marcos dos 21 dias) que entram no contexto; nada de inferências sobre o corpo ou rosto.
4. **Simulação de cabelo** (fornecedor de geração de imagem por API, escolhido no E03; contrato de tratamento de dados
   que proíba treino com as fotos).
5. **Pagamentos**: Stripe Checkout (EUR) e PixGo (BRL) com webhooks na API; a API é a única fonte de verdade do estado
   de pagamento. Na fase concierge, links de pagamento manuais chegam e não exigem código.
6. **Email transacional** (Resend ou Postmark, região UE quando disponível).
7. **Observabilidade** (logs JSON do Fastify + Sentry no web e na API; uptime check em `/health`).
8. ~~Domínios~~ decidido: site em `espelho.lia.doctor` (e `espelhomeu.lia.doctor`) na Vercel, API em `api.espelhomeu.lia.doctor` na VPS, DNS na Cloudflare em modo DNS only.

## Privacidade e regras do projeto no código

- Só maiores de 18: `isAdult()` em `packages/shared` (conservador por ano de nascimento).
- Consentimento por finalidade, append-only (`consents`), com versão do texto aceite. Testemunhos nunca por defeito.
- Pedido de apagamento registado em `users.deletion_requested_at`; um job apaga dados e fotos.
- Postgres só em `127.0.0.1` na VPS; segredos apenas em `.env` da VPS e nas variáveis da Vercel/GitHub.
- Sem pontuação de beleza, diagnóstico de formato de rosto nem alegações médicas — vale para prompts do agente e textos.
- Nenhuma partilha de dados com LeveLab.

## Estrutura do repositório

```
apps/web          Next.js (Vercel; Root Directory = apps/web)
apps/api          Fastify + Drizzle (Docker na VPS)
packages/shared   Esquemas zod partilhados
infra/vps         docker-compose, Caddyfile, guia da VPS
.github/workflows CI e deploy da API
```

## Configuração que só a equipa pode fazer

Feito em 07/10/2026 (produção ligada e deploy automático da API a funcionar); fica como referência para refazer o ambiente.

- **Vercel**: importar o repositório, Root Directory `apps/web`, variável `NEXT_PUBLIC_API_URL`.
- **VPS**: Docker, firewall (SSH na porta 22022, 80/443), DNS de `api.<domínio>`, `/opt/espelhomeu/.env` (ver `infra/vps`).
- **GitHub**: environment `production` com secrets `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`; proteção do branch `main`.

## Desenvolvimento local

```bash
corepack enable && pnpm install
POSTGRES_PASSWORD=espelhomeu WEB_ORIGINS=http://localhost:3000 \
  docker compose -f infra/vps/docker-compose.yml up -d db   # Postgres local
cp apps/api/.env.example apps/api/.env
pnpm --filter api db:migrate
pnpm dev     # web em :3000, API em :4000; /status mostra a ligação
```
