# Guia para agentes — EspelhoMeu

Ponto de entrada para qualquer agente (Claude, Cursor, Codex…) que trabalhe neste repositório. Ler isto primeiro.

## O que é

EspelhoMeu ("Espelho meu, espelho meu. Hoje, eu me escolho.") é uma iniciativa da AVS — Atlas Venture Studio para mulheres
adultas em Portugal e no Brasil. Troca a comparação e a "beleza ideal" por descoberta e evolução pessoal. O ativo central
será o **Meu Espelho**, um agente pessoal que se lembra das escolhas da cliente ao longo do tempo.

## Onde está cada coisa

| Assunto | Fonte | Neste repo? |
| --- | --- | --- |
| Código, infraestrutura, CI/CD | Este repositório | Sim |
| Arquitetura e decisões técnicas em aberto | [docs/ARQUITETURA.md](docs/ARQUITETURA.md) | Sim |
| Operação da VPS e DNS | [infra/vps/README.md](infra/vps/README.md) | Sim |
| Identidade visual e regras de uso do logo | [docs/MARCA.md](docs/MARCA.md) | Sim |
| Estratégia, oferta, preços, experiências e decisões aprovadas | Notion (ver links no [README](README.md)) | **Não** — o repositório é público |
| Tarefas e responsáveis | PaperClip | Não |
| Ficheiros de marca originais, fotos, eBook, criativos | Google Drive da equipa | Não (binários pesados e conteúdo comercial) |

**Notion decide, PaperClip executa, GitHub constrói.** Em caso de dúvida sobre escopo, o Notion manda.

## Estado atual

- Fase de **validação**. Não construir funcionalidades de produto (agente, simulação de cabelo, pagamentos, contas)
  antes de a experiência de oferta paga (E02) passar e de o escopo estar aprovado no Notion.
- Em produção: página inicial com lista de espera em https://espelho.lia.doctor (também espelhomeu.lia.doctor),
  política em `/privacidade`, protótipo de 10 ecrãs em `/prototipo` (só para entrevistas, `noindex`) e API em
  https://api.espelhomeu.lia.doctor/health. A página `/status` do site confirma a ligação web → API → base de dados.
- A lista de espera grava na tabela `waitlist` (email, país, versão do consentimento). A API aplica as migrações de
  `apps/api/drizzle/` ao arrancar.

## Regras que valem para código, textos e prompts

- Só maiores de 18 anos (`isAdult()` em `packages/shared`).
- Nada de pontuação de beleza, diagnóstico de formato de rosto, alegações médicas ou mensagens que explorem insegurança.
- Consentimento explícito e por finalidade para imagens e testemunhos (`packages/shared/src/consent.ts`); nunca por defeito.
- Fotos de pessoas: apenas geradas ou licenciadas, nunca recolhidas da internet (Pinterest, Instagram…).
- RGPD (Portugal) e LGPD (Brasil): dados mínimos, apagamento a pedido, segredos só em variáveis de ambiente.
- Nenhuma partilha de dados com LeveLab.
- Textos para clientes em português; ter em conta PT-PT e PT-BR (`Market` = `PT` | `BR`).

## Como trabalhar no código

```bash
corepack enable && pnpm install
pnpm dev        # web :3000, API :4000
pnpm lint && pnpm typecheck && pnpm test && pnpm build   # o mesmo que o CI corre
```

- Monorepo pnpm: `apps/web` (Next.js 16, ver [apps/web/AGENTS.md](apps/web/AGENTS.md): a API do Next mudou, ler a
  documentação em `node_modules/next/dist/docs/`), `apps/api` (Fastify 5 + Drizzle), `packages/shared` (zod).
- Deploy: a Vercel publica `apps/web` a cada push; um push para `main` publica a API na VPS (imagem no GHCR, SSH na porta 22022).
- Não mexer em definições da Vercel, da VPS, do GitHub nem em segredos sem aprovação explícita de Atlas.
- Commits e PRs pequenos, em português, com o CI verde antes de pedir revisão.
