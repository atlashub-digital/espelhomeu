import Link from "next/link";
import { notFound } from "next/navigation";
import { enabled } from "@espelhomeu/project-config";
import { programCatalog } from "@/lib/content";
import { Intro } from "@/components/product-shell";
export default async function Page() {
  if (!enabled("programs")) notFound();
  const programs = await programCatalog();
  return <>
    <Intro eyebrow="Jornadas EspelhoMeu · Pré-publicação" title="Um passo de cada vez.">
      <p>Leituras e encontros no seu ritmo. Sem calendário obrigatório.</p>
    </Intro>
    {programs.map(p => <section className="entry-panel" key={p.id}>
      <span className="entry-symbol" aria-hidden="true">{p.durationDays ?? "✦"}</span>
      <div><p className="eyebrow">Preview editorial</p><h2>{p.title}</h2>
        <p className="activity-copy">{p.description}</p>
        <Link className="button" href={"/programas/" + p.slug}>Conhecer os encontros →</Link>
      </div>
    </section>)}
  </>;
}
