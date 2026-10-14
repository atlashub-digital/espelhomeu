"use client";

import { useId, useState } from "react";
import Link from "next/link";

/** A voluntary email request, not an automatic mailing-list registration. */
export function InterestRequest({
  title,
  contact,
}: {
  title: string;
  contact: string;
}) {
  const [consented, setConsented] = useState(false);
  const descriptionId = useId();
  const subject = `Interesse — ${title}`;
  const body = [
    `Olá! Tenho interesse em ${title}.`,
    "",
    `Confirmo que tenho 18 anos ou mais e autorizo o uso deste endereço de email apenas para receber um aviso de disponibilidade de ${title}.`,
    "Não autorizo outras campanhas por este pedido. Posso retirar este consentimento respondendo a este email.",
  ].join("\n");
  const href = `mailto:${encodeURIComponent(contact)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <section
      id="interesse"
      className="sales-interest"
      aria-label={`Interesse em ${title}`}
    >
      <h3>Quero saber quando estiver disponível</h3>
      <p id={descriptionId}>
        O pedido abre no seu aplicativo de email. Reveja a mensagem e envie-a
        para solicitar um aviso sobre {title}. Abrir o email não efetua uma
        inscrição automática nem reserva acesso.
      </p>
      <label className="sales-interest-consent">
        <input
          type="checkbox"
          checked={consented}
          onChange={(event) => setConsented(event.target.checked)}
          aria-describedby={descriptionId}
          data-testid="interest-consent"
        />
        <span>
          Tenho 18 anos ou mais e quero receber um único aviso por email quando{" "}
          {title} estiver disponível. Posso retirar este consentimento a
          qualquer momento, respondendo ao email.
        </span>
      </label>
      {consented ? (
        <a className="sales-button" href={href} data-testid="interest-email">
          Preparar pedido por email <span aria-hidden="true">↗</span>
        </a>
      ) : (
        <button className="sales-button" type="button" disabled>
          Preparar pedido por email
        </button>
      )}
      <p className="sales-interest-note">
        Se o aplicativo não abrir, envie o pedido para{" "}
        <strong>{contact}</strong> indicando {title} e a autorização acima. Não
        precisa enviar CPF, respostas pessoais ou dados de pagamento. Consulte a{" "}
        <Link href="/privacidade">política de privacidade</Link>.
      </p>
    </section>
  );
}
