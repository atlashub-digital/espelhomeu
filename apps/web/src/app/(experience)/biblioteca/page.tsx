import { currentCapability, resolveCheckoutAccess } from "@/lib/aro/client";
import { AccessPanel } from "@/components/access-panel";
export const dynamic = "force-dynamic";
import { Intro } from "@/components/product-shell";
import { PublicationCards } from "@/components/publication-cards";
import { enabled } from "@espelhomeu/project-config";
import { notFound } from "next/navigation";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string }>;
}) {
  if (!enabled("library")) notFound();
  let canBind = false;
  if (process.env.ACCESS_V1_ENABLED === "true") {
    try {
      const capability = await currentCapability();
      canBind = !!capability && (await resolveCheckoutAccess(capability)).length > 0;
    } catch { /* Recovery activation requires a currently valid purchase. */ }
  }
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const type = typeof params.tipo === "string" ? params.tipo : "";
  return (
    <>
      <Intro
        eyebrow="Biblioteca EspelhoMeu"
        title="Uma leitura. Um novo olhar."
      >
        <p>
          Reserve um momento para você. Explore as leituras em pré-publicação, com
          liberdade e sem pressa.
        </p>
      </Intro>
      {process.env.ACCESS_V1_ENABLED === "true" && <AccessPanel canBind={canBind} />}
      <form className="catalog-filter">
        <label>
          Buscar uma leitura
          <input
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Uma palavra, uma curiosidade…"
          />
        </label>
        <label>
          Formato
          <select name="tipo" defaultValue={type}>
            <option value="">Todos</option>
            <option value="article">Artigo</option>
            <option value="guide">Guia</option>
            <option value="ebook">eBook</option>
          </select>
        </label>
        <button className="button" type="submit">
          Explorar
        </button>
      </form>
      <PublicationCards query={query} type={type} />
    </>
  );
}
