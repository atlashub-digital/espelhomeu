import { notFound } from "next/navigation";
import {
  getSalesOfferByPath,
  readAttribution,
} from "@espelhomeu/project-config/sales";
import { salesProducts } from "@/lib/sales-data";
import {
  CollectionPage,
  ProductSalesPage,
  FuturePage,
} from "@/components/sales/pages";
export async function generateMetadata({ params }: PageProps<"/[offer]">) {
  const { offer: path } = await params;
  const offer = getSalesOfferByPath("/" + path);
  return {
    title: offer
      ? `${offer.title} · EspelhoMeu`
      : "Não encontrado · EspelhoMeu",
    description: offer
      ? `Conheça ${offer.title}, explore uma amostra e descubra a experiência EspelhoMeu.`
      : undefined,
    robots: { index: false, follow: false },
    openGraph: offer
      ? {
          title: offer.title,
          description:
            "Leituras para se reconhecer. Conheça a coleção EspelhoMeu.",
          images: ["/comercial/COLECAO_HERO_1920x760.jpg"],
        }
      : undefined,
  };
}
export default async function Page({
  params,
  searchParams,
}: PageProps<"/[offer]">) {
  const { offer: path } = await params;
  const offer = getSalesOfferByPath("/" + path);
  if (!offer) notFound();
  const attribution = readAttribution(await searchParams);
  if (offer.id === "colecao")
    return <CollectionPage attribution={attribution} />;
  if (offer.availability === "preparing")
    return <FuturePage offer={offer} attribution={attribution} />;
  const p = salesProducts().find((p) => p.offer.id === offer.id);
  if (!p) notFound();
  return <ProductSalesPage p={p} attribution={attribution} />;
}
