import Link from "next/link";
import { getSalesOffer } from "@espelhomeu/project-config/sales";

const nextOffer: Record<string, string> = {
  p01: "p02",
  p02: "p03",
  p04: "p05",
  p05: "p04",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ offer?: string; owned?: string }>;
}) {
  const params = await searchParams;
  const offer = params.offer ? getSalesOffer(params.offer) : undefined;
  const owned = new Set((params.owned || "").split(",").filter(Boolean));
  const suggestionId = offer ? nextOffer[offer.id] : undefined;
  const suggestion =
    suggestionId && !owned.has(suggestionId)
      ? getSalesOffer(suggestionId)
      : undefined;

  return (
    <main className="checkout-success">
      <p className="checkout-eyebrow">Pagamento confirmado</p>
      <h1>Sua próxima página já está aberta.</h1>
      <p>
        O acesso foi associado a este navegador. Você já pode entrar na
        Biblioteca e continuar no WebReader.
      </p>
      <div className="checkout-success-actions">
        <Link className="checkout-primary" href="/biblioteca">
          Abrir minha Biblioteca
        </Link>
        <Link href="/colecao">Ver a coleção</Link>
      </div>

      {suggestion?.purchaseEnabled && suggestion.amountMinor !== null && (
        <section className="checkout-upsell">
          <p className="checkout-eyebrow">Se quiser continuar</p>
          <h2>{suggestion.title}</h2>
          <p>
            Uma próxima leitura que conversa com o que você acabou de escolher.
            É opcional e será uma compra separada.
          </p>
          <Link
            className="checkout-primary"
            href={"/checkout/" + suggestion.id}
          >
            Adicionar esta leitura
          </Link>
          <Link href={suggestion.path}>Conhecer antes de decidir</Link>
        </section>
      )}
    </main>
  );
}
