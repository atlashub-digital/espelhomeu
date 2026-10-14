"use client";

import { useEffect, useState } from "react";

export function ClaimAccess({ sessionId }: { sessionId: string }) {
  const [message, setMessage] = useState("Confirmando o pagamento…");

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    async function claim() {
      attempts += 1;
      try {
        const response = await fetch("/api/access/claim", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const payload = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          offerId?: string;
          productRefs?: string[];
          error?: string;
        };
        if (cancelled) return;
        if (response.ok && payload.ok) {
          const target = new URL("/checkout/sucesso", window.location.origin);
          if (payload.offerId) target.searchParams.set("offer", payload.offerId);
          if (payload.productRefs?.length)
            target.searchParams.set("owned", payload.productRefs.join(","));
          window.location.replace(target.toString());
          return;
        }
        if (response.status === 202 && attempts < 30) {
          setMessage("Pagamento identificado. Aguardando confirmação…");
          window.setTimeout(claim, 2000);
          return;
        }
        setMessage(
          "Não conseguimos confirmar o acesso automaticamente. O pagamento não será repetido.",
        );
      } catch {
        if (!cancelled && attempts < 30) {
          setMessage("Reconectando para confirmar o pagamento…");
          window.setTimeout(claim, 2000);
        }
      }
    }

    void claim();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <div className="checkout-processing" role="status">
      <div className="checkout-spinner" aria-hidden="true" />
      <h1>{message}</h1>
      <p>
        Não feche esta página enquanto confirmamos a compra e liberamos a sua
        Biblioteca.
      </p>
    </div>
  );
}
