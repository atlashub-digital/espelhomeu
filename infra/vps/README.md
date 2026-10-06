# VPS: API + Postgres

Pré-requisitos na VPS (Ubuntu 24.04 ou semelhante): Docker + plugin compose, firewall só com 22/80/443 abertos,
e um registo DNS `A` de `api.<domínio>` a apontar para o IP da VPS.

## DNS (Cloudflare)

| Nome | Tipo | Valor | Proxy |
| --- | --- | --- | --- |
| `api.espelho.lia.doctor` | A | IP da VPS | DNS only (nuvem cinzenta) |
| `espelho.lia.doctor` | CNAME | valor indicado pela Vercel em Domains | DNS only |
| `espelhomeu.lia.doctor` | CNAME | o mesmo valor da Vercel | DNS only; na Vercel, redirecionar (308) para `espelho.lia.doctor` |

Com nuvem cinzenta, o Caddy emite o certificado da API sozinho. O certificado gratuito do Cloudflare não cobre
subdomínios de segundo nível (`api.espelho.…`), por isso não ativar o proxy laranja sem um certificado avançado.

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
