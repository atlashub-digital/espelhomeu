"use client";

import { FormEvent, useMemo, useRef, useState } from "react";

type OfferView = {
  id: string;
  title: string;
  amountMinor: number;
};

type StripeElement = {
  mount(target: HTMLElement): void;
  destroy?: () => void;
};

type CheckoutSdk = {
  createPaymentElement(): StripeElement;
  createContactDetailsElement(): StripeElement;
  loadActions(): Promise<
    | {
        type: "success";
        actions: {
          confirm(): Promise<
            | { error?: { message?: string } }
            | { message?: string }
            | undefined
          >;
        };
      }
    | { type: "error"; error?: { message?: string } }
  >;
};

type StripeInstance = {
  initCheckoutElementsSdk(options: {
    clientSecret: string;
  }): CheckoutSdk | Promise<CheckoutSdk>;
};

declare global {
  interface Window {
    Stripe?: (publishableKey: string) => StripeInstance;
  }
}

let stripeScriptPromise: Promise<void> | null = null;

function loadStripeJs() {
  if (window.Stripe) return Promise.resolve();
  if (stripeScriptPromise) return stripeScriptPromise;
  stripeScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-espelho-stripe="true"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("stripe_load")), {
        once: true,
      });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/endive/stripe.js";
    script.async = true;
    script.dataset.espelhoStripe = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("stripe_load"));
    document.head.appendChild(script);
  });
  return stripeScriptPromise;
}

function money(amountMinor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amountMinor / 100);
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
  const [phase, setPhase] = useState<"summary" | "loading" | "payment">(
    "summary",
  );
  const [error, setError] = useState("");
  const checkout = useRef<CheckoutSdk | null>(null);
  const contactTarget = useRef<HTMLDivElement | null>(null);
  const paymentTarget = useRef<HTMLDivElement | null>(null);
  const total = useMemo(
    () => offer.amountMinor + (includeBump && bump ? bump.amountMinor : 0),
    [offer.amountMinor, includeBump, bump],
  );

  async function startCheckout() {
    setError("");
    setPhase("loading");
    try {
      const response = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          offerId: offer.id,
          bumpOfferIds: includeBump && bump ? [bump.id] : [],
          attribution,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        clientSecret?: string;
        publishableKey?: string;
        error?: string;
      };
      if (!response.ok || !payload.clientSecret || !payload.publishableKey)
        throw new Error(payload.error || "checkout_unavailable");

      await loadStripeJs();
      if (!window.Stripe) throw new Error("stripe_unavailable");
      const instance = window.Stripe(payload.publishableKey);
      const sdk = await instance.initCheckoutElementsSdk({
        clientSecret: payload.clientSecret,
      });
      checkout.current = sdk;
      setPhase("payment");
      await new Promise<void>((resolve) =>
        window.requestAnimationFrame(() => resolve()),
      );
      if (!contactTarget.current || !paymentTarget.current)
        throw new Error("checkout_mount");
      sdk.createContactDetailsElement().mount(contactTarget.current);
      sdk.createPaymentElement().mount(paymentTarget.current);
    } catch {
      setPhase("summary");
      setError(
        "O checkout está temporariamente indisponível. Nenhuma cobrança foi realizada.",
      );
    }
  }

  async function confirmPayment(event: FormEvent) {
    event.preventDefault();
    if (!checkout.current) return;
    setError("");
    const result = await checkout.current.loadActions();
    if (result.type === "error") {
      setError(result.error?.message || "Revise os dados de pagamento.");
      return;
    }
    const confirmed = await result.actions.confirm();
    const message =
      confirmed && "error" in confirmed
        ? confirmed.error?.message
        : confirmed && "message" in confirmed
          ? confirmed.message
          : undefined;
    if (message) setError(message);
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
          <button className="checkout-primary" onClick={startCheckout}>
            Continuar para pagamento seguro
          </button>
        )}
        {phase === "loading" && (
          <button className="checkout-primary" disabled>
            Preparando checkout…
          </button>
        )}
        <ul className="checkout-assurance">
          <li>✓ Cartão e Pix</li>
          <li>✓ Pagamento processado em ambiente seguro</li>
          <li>✓ Acesso liberado após confirmação</li>
        </ul>
      </section>

      <form
        className="checkout-payment"
        onSubmit={confirmPayment}
        hidden={phase !== "payment"}
      >
        <p className="checkout-eyebrow">Pagamento</p>
        <h2>Finalize sem sair do EspelhoMeu.</h2>
        <div ref={contactTarget} className="checkout-stripe-slot" />
        <div ref={paymentTarget} className="checkout-stripe-slot" />
        <button className="checkout-primary" type="submit">
          Pagar {money(total)}
        </button>
        <small>
          Os dados do cartão são enviados diretamente ao processador de
          pagamento e não passam pelos nossos servidores.
        </small>
      </form>

      {error && (
        <p className="checkout-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
