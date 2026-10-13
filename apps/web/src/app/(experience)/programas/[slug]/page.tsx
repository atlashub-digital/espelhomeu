import Link from "next/link";
import { notFound } from "next/navigation";
import { enabled } from "@espelhomeu/project-config";
import { accessibleJourney } from "@/lib/content";
import { Intro } from "@/components/product-shell";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  if (!enabled("programs")) notFound();
  const result = await accessibleJourney((await params).slug);
  if (!result) notFound();
  if (!result.allowed) return <Intro eyebrow="Jornadas" title="Esta jornada tem acesso reservado."><Link href="/biblioteca">Explorar leituras abertas</Link></Intro>;
  const { model } = result;
  return <>
    <Intro eyebrow="Preview editorial · Pré-publicação" title={model.program.title}>
      <p>{model.program.description}</p>
      <p>Escolha qualquer encontro. Pode ler sem fazer os exercícios ou voltar quando quiser.</p>
    </Intro>
    <ol className="journey-days">
      {model.units.map(({ unit }) => <li key={unit.id}>
        <Link href={"/programas/" + model.program.slug + "/" + unit.id}>
          <span className="eyebrow">{unit.kind === "day" ? "Dia " + unit.day : "Módulo"}</span>
          <h2>{unit.title} →</h2>
        </Link>
      </li>)}
    </ol>
  </>;
}
