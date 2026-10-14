# Interesse em Jornada / Membership — S1 Preview

`InterestRequest` é um pedido voluntário por email, específico para a oferta exibida. O componente recebe `title` e o contacto público já usado pela política de privacidade (`NEXT_PUBLIC_CONTACT_EMAIL || "contact@lia.doctor"`), resolvido no servidor.

- Consentimento inicialmente desmarcado: maior de 18 anos e um único aviso de disponibilidade da oferta nomeada. Sem autorização para outras campanhas.
- Só após consentimento fica disponível o link `mailto:`. A mensagem explica a finalidade e a retirada do consentimento por resposta ao email.
- A interface explica que a leitora ainda deve enviar o email: não declara inscrição, entrega, reserva ou confirmação automática.
- Contacto visível como alternativa quando não existir aplicativo de email configurado.
- Sem API, base de dados, storage local, submissão automática, analytics de email, UTMs ou respostas de quiz no pedido.
- A waitlist existente de 21 Dias mantém finalidade e implementação intactas. Não recebe os pedidos destas ofertas.

Limitação de S1: o pedido depende do envio pela leitora e do tratamento humano da caixa de contacto. Não existe lista de espera automatizada nem garantia de aviso. Antes de automatizar, definir consentimento próprio, retenção, retirada e processo de comunicação na fase correspondente. Este caminho não concede entitlement nem ativa SALES READY.
