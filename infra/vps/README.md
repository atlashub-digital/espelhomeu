# VPS: API + Postgres

Pré-requisitos na VPS (Ubuntu 24.04 ou semelhante): Docker + plugin compose, firewall só com 22/80/443 abertos,
e um registo DNS `A` de `api.<domínio>` a apontar para o IP da VPS.

## DNS (Cloudflare)

| Nome | Tipo | Valor | Proxy |
| --- | --- | --- | --- |
| `api.espelhomeu.lia.doctor` | A | IP da VPS | DNS only (nuvem cinzenta) |
| `espelho.lia.doctor` | CNAME | valor indicado pela Vercel em Domains | DNS only |
| `espelhomeu.lia.doctor` | CNAME | o mesmo valor da Vercel | DNS only; na Vercel, redirecionar (308) para `espelho.lia.doctor` |

Com nuvem cinzenta, o Caddy emite o certificado da API sozinho. O certificado gratuito do Cloudflare não cobre
subdomínios de segundo nível (`api.espelhomeu.…`), por isso não ativar o proxy laranja sem um certificado avançado.

## Primeira instalação

```bash
sudo mkdir -p /opt/espelhomeu && cd /opt/espelhomeu
# copiar docker-compose.yml e Caddyfile desta pasta; criar .env a partir de .env.example
docker login ghcr.io            # token com read:packages (a imagem é privada)
docker compose up -d
curl https://api.<domínio>/health
```

## Migrações

As migrações SQL vivem em `apps/api/drizzle/`. Até existir um passo automático, aplicar a partir de uma máquina
com acesso (túnel SSH para `127.0.0.1:5432`):

```bash
ssh -L 5432:127.0.0.1:5432 deploy@vps
DATABASE_URL=postgres://... pnpm --filter api db:migrate
```

## Deploy contínuo

O workflow `deploy-api.yml` constrói a imagem em cada push para `main` e publica no GHCR.
O passo de SSH para a VPS só corre quando os secrets `VPS_HOST`, `VPS_USER` e `VPS_SSH_KEY` existirem no repositório.

## Backups

Por fazer antes de haver dados reais: `pg_dump` diário cifrado para armazenamento fora da VPS (ver docs/ARQUITETURA.md).


## Fast Launch PIX — secrets e ativação

Para o primeiro lançamento BR/PIX, manter os secrets no ficheiro local da VPS:

`/opt/espelhomeu/.env`

Não colocar API keys em Git, chat, Docker image ou frontend.

Variáveis mínimas:

```bash
WEB_BASE_URL=https://espelho.lia.doctor
API_PUBLIC_BASE_URL=https://api.espelhomeu.lia.doctor
COMMERCE_ENABLED=false
BR_PIX_PROVIDER=pixgo
PIXGO_API_KEY=<secret>
PIXGO_WEBHOOK_SECRET=<secret>
ACCESS_TOKEN_DAYS=180
```

Manter `COMMERCE_ENABLED=false` durante deploy/migration. Ativar apenas no gate de PIX controlado.

### Editar secrets na VPS

```bash
ssh -p 22022 <user>@<vps>
cd /opt/espelhomeu
sudo cp .env ".env.backup.$(date +%Y%m%d-%H%M%S)"
sudo nano .env
sudo chmod 600 .env
```

Depois de guardar:

```bash
docker compose config >/dev/null
docker compose up -d api
docker compose ps
curl -fsS https://api.espelhomeu.lia.doctor/health
```

### Aplicar migration do Commerce

Enquanto as migrations ainda não fazem parte do deploy automático, usar o método documentado por túnel SSH e Drizzle a partir de uma cópia atual do repositório:

```bash
ssh -p 22022 -L 5432:127.0.0.1:5432 <user>@<vps>
```

Noutra shell, no repositório no head homologado:

```bash
DATABASE_URL='postgres://espelhomeu:<password>@127.0.0.1:5432/espelhomeu' \
  pnpm --filter api db:migrate
```

Verificar antes de ativar commerce:

```sql
select to_regclass('public.orders');
select to_regclass('public.order_items');
select to_regclass('public.payment_events');
select to_regclass('public.entitlements');
select to_regclass('public.access_tokens');
```

### Ativar gate controlado

Depois da migration + health:

```bash
cd /opt/espelhomeu
sudo nano .env
# alterar:
# COMMERCE_ENABLED=true

docker compose up -d api
curl -fsS https://api.espelhomeu.lia.doctor/health
```

A aplicação continua com `SALES READY=false` até a compra PIX ponta-a-ponta passar.
