import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  formatOfferPrice,
  getSalesOffer,
  readAttribution,
} from "@espelhomeu/project-config/sales";
import { CheckoutClient } from "@/components/checkout/checkout-client";
import { salesProducts } from "@/lib/sales-data";

const bumpByOffer: Record<string, string> = {
  p01: "p02",
  p02: "p03",
  p04: "p05",
  p05: "p04",
};

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ offer: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const offerId = (await params).offer;
  const offer = getSalesOffer(offerId);
  if (
    !offer ||
    !offer.purchaseEnabled ||
    offer.amountMinor === null ||
    offer.cadence !== "once"
  )
    notFound();

  const product = salesProducts().find((item) => item.offer.id === offer.id);
  const bumpId = bumpByOffer[offer.id];
  const bump = bumpId ? getSalesOffer(bumpId) : undefined;
  const attribution = readAttribution(await searchParams);

  return (
    <>
      <header className="checkout-header">
        <Link href={offer.path} aria-label="Voltar à oferta">
          <Image
            src="/marca/logo-principal-800.webp"
            width={88}
            height={88}
            alt="EspelhoMeu"
            priority
          />
        </Link>
        <div>
          <span>Checkout EspelhoMeu</span>
          <small>PIX Brasil · acesso digital</small>
        </div>
      </header>

      <main className="checkout-grid" data-checkout-version="aro-pix-v1">
        <section className="checkout-intro">
          <Link href={offer.path} className="checkout-back">
            ← Voltar à página do produto
          </Link>
          <p className="checkout-eyebrow">Sua próxima leitura</p>
          <h1>{offer.title}</h1>
          <p>
            Continue no seu ritmo. Após a confirmação do pagamento, o acesso é
            liberado para a Biblioteca e WebReader.
          </p>
          {product && (
            <div className="checkout-product">
              <Image
                src={product.cover}
                width={260}
                height={390}
                alt={"Capa de " + product.title}
                priority
              />
              <div>
                <strong>{formatOfferPrice(offer)}</strong>
                <span>{product.narrative.count}</span>
                <span>WebReader + materiais digitais</span>
              </div>
            </div>
          )}
          <div className="checkout-trust">
            <strong>Sem redirecionamento para uma loja externa.</strong>
            <p>
              Para compras em BRL, o PIX é gerado nesta página e confirmado
              pelo nosso backend antes de liberar o acesso.
            </p>
          </div>
        </section>

        <CheckoutClient
          offer={{
            id: offer.id,
            title: offer.title,
            amountMinor: offer.amountMinor,
          }}
          bump={
            bump && bump.purchaseEnabled && bump.amountMinor !== null
              ? {
                  id: bump.id,
                  title: bump.title,
                  amountMinor: bump.amountMinor,
                }
              : null
          }
          attribution={attribution}
        />
      </main>

      <footer className="checkout-footer">
        <Link href="/privacidade">Privacidade</Link>
        <span>Produto digital · maiores de 18 anos</span>
        <span>EspelhoMeu · Atlas Venture Studio</span>
      </footer>
    </>
  );
}
