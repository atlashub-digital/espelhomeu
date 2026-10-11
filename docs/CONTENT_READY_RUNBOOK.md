# Track A — reprodução e publicação de conteúdo

## Decisão e compatibilidade

A integração é aditiva. A homepage `/`, waitlist, privacidade, status, protótipo, API e infraestrutura mantêm o código anterior. A experiência candidata é `/inicio`; a sua promoção para homepage exige revisão visual/editorial e outro PR. Não se copia o Project Template: apenas se adoptam as fronteiras manifest/config/content/theme.

`project.manifest.json` identifica projeto, módulos, baselines AMF, targets e gate. `packages/project-config` contém marca/tema/mercados e oferta desactivada. `packages/project-content/content/manifest.json` é a fonte canónica de fixtures. `ContentSource` é o adapter Git JSON; `findPublication`, `createReaderModel`, `readerProgressPercentage`, `conservativeAccessResolver` e `themeCssVariables` vêm do Experience Core, sem cópias locais.

A UI EspelhoMeu permanece em `apps/web`. O renderer local interpreta os blocos aprovados por este projeto; não define um novo contrato AMF nem contém o texto editorial. A validação falha para fontes externas/path ou blocos não suportados, em vez de publicar silenciosamente conteúdo incompleto.

## Reproduzir

Node 22, pnpm 10.28.0, Git e acesso de leitura aos dois repos AMF públicos:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm validate:content
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm --filter web start
# Outro terminal:
pnpm smoke:web
```

Para verificação completa com API local sem DB e screenshots desktop/mobile:

```sh
pnpm exec playwright install --with-deps chromium
pnpm verify:browser
```

`verify:browser` arranca e encerra os dois processos, testa navegação/progresso/search/waitlist e grava PNGs e verification.json em `docs/evidence/track-a`. Em runtimes sem download de browser, `BROWSER_EXECUTABLE_PATH` pode indicar Chromium compatível instalado localmente. Os dois processos e o browser correm na mesma invocação para funcionar também em ambientes cloud com redes isoladas por comando. O CI executa esta verificação depois do build e publica os ficheiros como artifact.

Se o runtime partilhado não permitir symlinks globais, usar `corepack enable --install-directory <pasta-gravavel>` e acrescentar essa pasta ao PATH. Não depende do disco Windows do operador.

As dependências Git executam `prepare`; os dois nomes AMF estão explicitamente em `onlyBuiltDependencies`, junto de esbuild. Isso é necessário no install limpo e está versionado.

Não há secret novo. As variáveis existentes continuam a ser `NEXT_PUBLIC_API_URL` (URL pública da API, propriedade Track B) e `NEXT_PUBLIC_CONTACT_EMAIL`. Build/preview não exige Supabase nem base de dados. API/DB ausentes aparecem como indisponíveis no status; uma waitlist sem DB nunca devolve sucesso falso.

## Publicar sem editar React

1. Criar branch de conteúdo a partir da main actualizada.
2. Normalizar brief aprovado (contrato em CONTENT_PUBLISHING_PIPELINE) para o manifest JSON.
3. Usar ids e slugs estáveis, schemaVersion 0.1, locale, authors, status e access; Guide precisa body/chapters. As fixtures actuais são `preview` e explicitamente demonstrativas. Não importar ficheiros privados/comerciais sem autorização.
4. Neste release, usar `blocks`: paragraph/heading/callout com `text`. Imagens apenas assets locais aprovados em `/marca/` com alt/licença. Placements suportam anchor do capítulo e before/inline/after. Vídeo/embed externo HTTPS abre por acção explícita em nova aba; não há iframe arbitrário nem tracking embed automático.
5. Publicações não contêm preço. Offers e future entitlements ficam fora do manifest editorial. A Library lista metadados de public/free-account/product/pack/bundle/membership/subscription; o Reader só recebe o corpo depois de autorização no servidor. Não há conta autenticada ou resolver comercial neste release.
6. Executar todos os comandos de verificação acima. Abrir PR editorial, obter preview Vercel da integração existente; não alterar hosting nem secrets.
7. Rever Library/Reader em desktop/mobile, factualidade, tom, fontes, consentimentos, 18+, acessibilidade e access policy. Nenhum auto-merge.
8. Após aprovação, humano faz merge. A integração Vercel existente publica web; conteúdo novo aparece na Library e Reader a partir do build. Registar SHA, URL do preview/release, CI, smoke e evidência. O preço/oferta nunca requer alteração da Publication.
9. Rollback por revert do commit de conteúdo ou promoção do deploy anterior por Helena. Não há migração de dados.

Todas as rotas candidatas têm noindex/nofollow enquanto fixtures e gate estão pendentes. A homepage original mantém SEO e funcionalidade existente. Conteúdo draft/archived não aparece no catálogo nem Reader. Ref desconhecida devolve 404.

## Handoff AMF Content Ops

Já pode preparar Guides/Essays no contrato pinned, validar e solicitar revisão por PR. As fixtures não são produto editorial final. A AMF deve entregar Article e Program nos contratos upstream antes de publicar esses tipos. Uma simples substituição de título/texto/chapters no JSON actualiza a experiência sem React.

## Handoff Helena / issue #11

Sem alterações de schema, migrações, RLS, DB ou Supabase. Sem SSH, VPS, Caddy, DNS ou secrets. Necessários posteriormente: session server-verified, founder account, entitlements, ReaderProgressAdapter persistente com consentimento e scope project/member, Journey progress/check-ins após upstream, separação CRM/memória privada, apagamento e observabilidade.

O Reader usa um adapter em memória por instância: progresso/resume apenas durante a página aberta; refresh/navegação reinicia. Sem localStorage/cookie ou reflexão persistida. Não confundir com MEMBER READY.

O lockfile alterado está no filtro de paths do deploy API existente: um merge deste PR dispara o workflow API mesmo sem mudança no backend. Helena deve rever esse efeito e aprovar a sequência; não foi alterado o workflow de deploy nem executada produção nesta tarefa.

## Gate e módulos adiados

CONTENT READY permanece falso: consultar AMF_UPSTREAM_REQUIREMENTS. Programs, auth, commerce, community, attendant, companion e analytics ficam desactivados. Entry surfaces são apresentações, não módulos funcionais. Adiados: feed, checkout, physical fulfillment, gamificação, WhatsApp, imagem avançada, dashboard financeiro e catálogo internacional. Mercados BR/PT são configuração independente de locale/currency; não se afirma localização editorial completa.
