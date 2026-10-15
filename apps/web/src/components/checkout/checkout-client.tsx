"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type OfferView = {
  id: string;
  title: string;
  amountMinor: number;
};

type PixCheckout = {
  orderId: string;
  provider: string;
  qrCodeText: string;
  qrImage?: string | null;
  expiresAt?: string | null;
};

function money(amountMinor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amountMinor / 100);
}

function digits(value: string) {
  return value.replace(/\D/g, "");
}

export function CheckoutClient({
  offer,
  bump,
  attribution,
}: {
  offer: OfferView;
  bump?: OfferView | null;
  attribution: Record<string, string>;
}) {
  const [includeBump, setIncludeBump] = useState(false);
  const [phase, setPhase] = useState<
    "summary" | "loading" | "pix" | "confirming"
  >("summary");
  const [error, setError] = useState("");
  const [payerName, setPayerName] = useState("");
  const [payerDocument, setPayerDocument] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [pix, setPix] = useState<PixCheckout | null>(null);
  const [copied, setCopied] = useState(false);

  const total = useMemo(
    () => offer.amountMinor + (includeBump && bump ? bump.amountMinor : 0),
    [offer.amountMinor, includeBump, bump],
  );

  useEffect(() => {
    if (!pix || phase !== "pix") return;
    let stopped = false;
    let timer: number | undefined;

    async function check() {
      try {
        const response = await fetch("/api/checkout/status", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        });
        const payload = (await response.json().catch(() => ({}))) as {
          status?: string;
        };
        if (stopped) return;
        if (payload.status === "approved") {
          setPhase("confirming");
          const claim = await fetch("/api/access/claim", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: "{}",
          });
          const granted = (await claim.json().catch(() => ({}))) as {
            ok?: boolean;
            offerId?: string;
            productRefs?: string[];
          };
          if (claim.ok && granted.ok) {
            const target = new URL("/checkout/sucesso", window.location.origin);
            if (granted.offerId) target.searchParams.set("offer", granted.offerId);
            if (granted.productRefs?.length)
              target.searchParams.set("owned", granted.productRefs.join(","));
            window.location.replace(target.toString());
            return;
          }
          setError(
            "Pagamento confirmado. O acesso ainda está a ser liberado; não pague novamente.",
          );
          return;
        }
        if (["failed", "canceled", "refunded", "chargeback"].includes(payload.status || "")) {
          setError(
            "Esta cobrança não está mais ativa. Nenhuma nova cobrança será feita automaticamente.",
          );
          return;
        }
      } catch {
        // Keep the PIX on-screen. A webhook can still complete the order.
      }
      if (!stopped) timer = window.setTimeout(check, 2500);
    }

    timer = window.setTimeout(check, 1800);
    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [pix, phase]);

  async function startCheckout(event: FormEvent) {
    event.preventDefault();
    setError("");

    const document = digits(payerDocument);
    if (!payerName.trim() || !payerEmail.trim() || ![11, 14].includes(document.length)) {
      setError("Preencha nome, email e CPF/CNPJ para gerar o PIX.");
      return;
    }

    setPhase("loading");
    try {
      const response = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          offerId: offer.id,
          bumpOfferIds: includeBump && bump ? [bump.id] : [],
          payerName: payerName.trim(),
          payerDocument: document,
          payerEmail: payerEmail.trim().toLowerCase(),
          attribution,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        orderId?: string;
        provider?: string;
        qrCodeText?: string;
        qrImage?: string | null;
        expiresAt?: string | null;
        error?: string;
      };
      if (
        !response.ok ||
        !payload.orderId ||
        !payload.provider ||
        !payload.qrCodeText
      ) {
        throw new Error(payload.error || "checkout_unavailable");
      }

      setPix({
        orderId: payload.orderId,
        provider: payload.provider,
        qrCodeText: payload.qrCodeText,
        qrImage: payload.qrImage,
        expiresAt: payload.expiresAt,
      });
      setPhase("pix");
    } catch (cause) {
      setPhase("summary");
      setError(
        cause instanceof Error &&
          cause.message === "invalid_payer_document"
          ? "CPF/CNPJ inválido. Revise o documento informado."
          : "O PIX está temporariamente indisponível. Nenhuma cobrança foi realizada.",
      );
    }
  }

  async function copyPix() {
    if (!pix) return;
    await navigator.clipboard.writeText(pix.qrCodeText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="checkout-widget">
      <section className="checkout-summary">
        <p className="checkout-eyebrow">Seu pedido</p>
        <h2>{offer.title}</h2>
        <div className="checkout-line">
          <span>Produto digital · acesso WebReader</span>
          <strong>{money(offer.amountMinor)}</strong>
        </div>

        {bump && phase === "summary" && (
          <label className="checkout-bump">
            <input
              type="checkbox"
              checked={includeBump}
              onChange={(event) => setIncludeBump(event.target.checked)}
            />
            <span>
              <small>Adicionar ao mesmo pedido</small>
              <strong>{bump.title}</strong>
              <em>+ {money(bump.amountMinor)}</em>
            </span>
          </label>
        )}

        <div className="checkout-total">
          <span>Total</span>
          <strong>{money(total)}</strong>
        </div>

        {phase === "summary" && (
          <form className="checkout-payer" onSubmit={startCheckout}>
            <label>
              Nome
              <input
                name="name"
                autoComplete="name"
                value={payerName}
                onChange={(event) => setPayerName(event.target.value)}
                placeholder="Seu nome"
                required
              />
            </label>
            <label>
              Email
              <input
                name="email"
                type="email"
                autoComplete="email"
                value={payerEmail}
                onChange={(event) => setPayerEmail(event.target.value)}
                placeholder="voce@exemplo.com"
                required
              />
            </label>
            <label>
              CPF ou CNPJ do pagador
              <input
                name="document"
                inputMode="numeric"
                autoComplete="off"
                value={payerDocument}
                onChange={(event) => setPayerDocument(event.target.value)}
                placeholder="Somente números"
                required
              />
            </label>
            <button className="checkout-primary" type="submit">
              Gerar PIX · {money(total)}
            </button>
          </form>
        )}

        {phase === "loading" && (
          <button className="checkout-primary" disabled>
            Gerando PIX seguro…
          </button>
        )}

        {(phase === "pix" || phase === "confirming") && pix && (
          <div className="checkout-pix" data-testid="pix-payment">
            <p className="checkout-eyebrow">
              PIX gerado · aguardando confirmação
            </p>
            {pix.qrImage && (
              <img
                className="checkout-qr"
                src={pix.qrImage}
                alt="QR Code PIX para pagamento"
              />
            )}
            <label>
              PIX Copia e Cola
              <textarea readOnly value={pix.qrCodeText} rows={4} />
            </label>
            <button
              type="button"
              className="checkout-primary"
              onClick={copyPix}
            >
              {copied ? "PIX copiado ✓" : "Copiar código PIX"}
            </button>
            <small>
              Depois de pagar no seu banco, mantenha esta página aberta. O acesso
              é liberado automaticamente após a confirmação.
            </small>
            <small>Processamento: {pix.provider}</small>
            {pix.expiresAt && (
              <small>
                Validade da cobrança:{" "}
                {new Date(pix.expiresAt).toLocaleString("pt-BR")}
              </small>
            )}
          </div>
        )}

        <ul className="checkout-assurance">
          <li>✓ PIX dentro do EspelhoMeu</li>
          <li>✓ Confirmação server-side antes do acesso</li>
          <li>✓ O mesmo pedido controla os seus produtos digitais</li>
        </ul>
      </section>

      {error && (
        <p className="checkout-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
