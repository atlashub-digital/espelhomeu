import { CollectionPage } from "@/components/sales/pages";
import { readAttribution } from "@espelhomeu/project-config/sales";
export const metadata = {
  title: "EspelhoMeu — Hoje, eu me escolho",
  description:
    "Cinco volumes, WebReader e materiais para explorar escolhas, expressão e reflexão no seu ritmo.",
  robots: { index: false, follow: false },
};
export default async function Home({ searchParams }: PageProps<"/">) {
  return (
    <CollectionPage home attribution={readAttribution(await searchParams)} />
  );
}
