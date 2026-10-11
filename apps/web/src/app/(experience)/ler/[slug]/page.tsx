import { notFound } from "next/navigation";
import Link from "next/link";
import { accessiblePublication } from "@/lib/content";
import { enabled } from "@espelhomeu/project-config";
import { WebReader } from "@/components/webreader";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!enabled("webreader")) notFound();
  const result = await accessiblePublication((await params).slug);
  if (!result) notFound();
  if (!result.allowed)
    return (
      <section className="page-intro">
        <p className="eyebrow">{result.publication.title}</p>
        <h1>Esta leitura tem acesso reservado.</h1>
        <p>
          A área de membros está em preparação. Você pode explorar as leituras
          abertas.
        </p>
        <Link className="button" href="/biblioteca">
          Voltar à biblioteca
        </Link>
      </section>
    );
  // Entire content is sent only after the server access decision.
  return (
    <WebReader key={result.publication.id} publication={result.publication} />
  );
}
