# Associação E7 e recuperação noutro dispositivo

`ACCESS_V1_ENABLED` permanece `false` por defeito em ambos os serviços.
A Biblioteca oferece **Ativar recuperação** apenas quando o cookie E7 tem uma
compra atualmente aprovada com entitlement ativo. Após confirmar o contacto por
OTP, a cliente escolhe **Ativar recuperação com este contacto**.

O BFF `POST /api/access/bind` exige same-origin e os cookies E7 e Access. Ignora
provas ou identidades submetidas pelo navegador: envia apenas `id`, `orderId` e
`checkoutSecret` obtidos do cookie E7 no servidor. A API `POST /access/bind`
exige sessão verificada e revalida a capability contra checkout, ordem e
entitlements do ARO antes de persistir o binding cifrado em `access_v1_records`.
O segredo de checkout não é persistido no binding.

O resolver partilhado em `packages/shared/src/aro-access.ts` serve E7, associação
e recuperação. `/access/entitlements` revalida ordem e entitlements em cada
leitura: a sessão de sete dias não prolonga o prazo da oferta. A associação
reutiliza o binding existente por principal/projeto; não acrescenta cookies,
tabelas, credenciais ou dependência de hosted handoff.

Na API, `ARO_API_URL` e `ARO_SERVER_KEY` reutilizam a configuração ARO scoped
existente. `ACCESS_V1_ARO_SERVER_KEY` continua compatível e tem precedência.
O endpoint hosted opcional continua suportado por `ACCESS_V1_ARO_CLAIM_URL`.
Nenhuma configuração de produção é alterada por este PR.

## Verificação reproduzível

`pnpm verify:access` executa a regressão Access e o novo E2E Playwright
`automation/verify-bind-recovery.mjs`. O novo percurso usa o formulário de
checkout real no navegador, BFF, API Access e adapter Resend com allowlist;
Supabase, Resend e ARO têm doubles HTTP locais. O OTP é lido da mensagem capturada
pelo double Resend, não do preview do challenge. O relógio de teste avança 61s
entre dispositivos para respeitar o cooldown existente.

- PASS: checkout sintético APPROVED → cookie E7 → Reader sem OTP.
- PASS: sem OTP/sessão ou cross-origin → associação recusada.
- PASS: OTP → associação validada → confirmação na Biblioteca; E7 preservado.
- PASS: contexto limpo sem E7 → OTP do mesmo contacto → sessão 7d → mesmo Reader.
- PASS: outro contacto com OTP, sem binding → Reader bloqueado.
- PASS: entitlement expirado → Reader e nova associação bloqueados.
- PASS: entitlement revogado ou ordem REFUNDED → Reader bloqueado com sessão.
- PASS: regressão E7 com flags OFF; os dois endpoints bind devolvem 404.

**Entrega externa Resend: pendente.** O teste local não demonstra entrega real.
É necessário executar em ambiente controlado com a configuração homologada e um
contacto autorizado; não devem ser incluídos segredos ou códigos no relatório.
