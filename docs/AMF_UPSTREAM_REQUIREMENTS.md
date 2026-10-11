# Contratos AMF necessários para CONTENT READY

Estado: **bloqueado nos baselines autorizados**. Relacionado com issue #10.
Nenhum dos repositórios AMF foi alterado por este PR.

## Evidência

- Content Schema `d5c8c2056b1ac4d82e40ae47cc968f9450b0b32b`: `PublicationTypeSchema` admite `essay`, `guide`, `program`, etc., mas **não `article`**.
- O tipo `program` é uma Publication comum. Não existe `ProgramSchema`, Day/Module, Mission, Reflection ou Check-in. `ContentManifestSchema` só oferece publications e collections.
- Experience Core `b4190cdbb67f7676fce0328c31ac6da44974427f`: oferece ContentSource, ReaderModel, ReaderProgressAdapter, AccessResolver, Theme e módulos; não oferece modelos de Journey.
- `BodySource.blocks` contém records genéricos: não existe união canónica de tipos de bloco.

## Alteração genérica no amf-content-schema

Num PR próprio, manter compatibilidade v0.1 e introduzir:

1. Tipo `article`, com metadados e BodySource de Publication.
2. Contrato Program separado de Publication: id/slug/status/locale, access policy, dias/módulos ordenados, referências a Publications, missões, reflexões e check-ins. Identificadores estáveis, duração e referências validadas. Não conter preços, dados pessoais ou provider de pagamentos.
3. Manifest capaz de representar Programs e validar referências entre dias e Publications.
4. Contratos discriminados de blocos, incluindo paragraph, heading e callout. Manter leitura compatível das fontes anteriores.
5. Exemplos e testes: Article, Guide e um Program de 7 dias; referências inexistentes, ordens/ids duplicados e fixtures incompletas devem falhar.

O formato exacto deve ser aprovado no repo AMF; este projeto não inventa um formato paralelo em `extensions` nem disfarça `essay` como Article.

## Alteração genérica no amf-experience-core

Num PR próprio, após o Schema:

1. ContentSource com listagem/resolução de Programs.
2. Journey model headless, resolução/ordenação de dias e suas publicações, missões, reflexões e check-ins.
3. JourneyProgressAdapter com isolamento project/member e sem persistência implícita; eventos de avanço/compleção idempotentes.
4. AccessResolver consistente para Program e Publication; nenhum cliente determina acesso pago.
5. Documentar semântica de `requiresAuth` em política `public`: o resolver v0.1 concede `public` independentemente dessa flag. Não usar combinações contraditórias neste piloto.

## O que continua possível agora

Guide e Essay válidos, Library, WebReader, configurações de projeto/tema/módulos e conteúdo substituível por Git/JSON. Program, Member, Companion e Commerce têm entry surfaces honestas e módulos desactivados.

## Retoma do gate

Depois de merge dos PRs AMF, criar PR explícito neste repo actualizando os dois SHAs e lockfile. Acrescentar Article + Program de 7 dias, ligar o Journey headless e repetir validação/CI/smoke/evidências visuais. Só então mudar `project.manifest.json.gate.contentReady` após comprovar o DoD completo. Issue #10 permanece aberta.
