import { RecoveryPanel } from "@/components/access-panel";
import Link from "next/link";
import { notFound } from "next/navigation";
import { enabled } from "@espelhomeu/project-config";
import { accessibleJourney } from "@/lib/content";
import { ReaderBody, ReaderMedia } from "@/components/reader-body";
import { Intro } from "@/components/product-shell";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ slug: string; unit: string }> }) {
  if (!enabled("programs")) notFound();
  const route = await params;
  const result = await accessibleJourney(route.slug);
  if (!result) notFound();
  if (!result.allowed) return <Intro eyebrow="Jornadas" title="Esta jornada tem acesso reservado."><Link href="/biblioteca">Explorar leituras abertas</Link>{process.env.ACCESS_V1_ENABLED === "true" && <RecoveryPanel />}</Intro>;
  const { model } = result;
  const index = model.units.findIndex(item => item.unit.id === route.unit);
  const current = model.units[index];
  if (!current) notFound();
  const { unit, readers } = current;
  const base = "/programas/" + model.program.slug;
  return <>
    <div className="reader-topline"><Link href={base}>← Todos os encontros</Link><span>Preview editorial · Pré-publicação</span></div>
    <header className="reader-header">
      <p className="eyebrow">{model.program.title} · {index + 1} / {model.units.length}</p>
      <h1>{unit.title}</h1>
      <p>Ao seu ritmo. Os exercícios são opcionais.</p>
    </header>
    <div className="reader-layout">
      <nav className="reader-sidebar" aria-label="Encontros da jornada">
        <ol>{model.units.map(({ unit: item }) => <li key={item.id}>
          <Link href={base + "/" + item.id} aria-current={item.id === unit.id ? "step" : undefined}>
            {item.kind === "day" ? item.day + ". " : ""}{item.title}
          </Link>
        </li>)}</ol>
        <p className="fixture-note">Não guardamos respostas nem progresso da jornada neste Preview. Use um caderno ou nota privada, se quiser.</p>
      </nav>
      <article className="reader-content">
        {readers.map(reader => <section key={reader.publication.id}>
          {reader.chapters.map(chapter => <section key={chapter.id}>
            <h2>{chapter.title}</h2>
            {(chapter.mediaPlacements ?? []).filter(p => p.position === "before").map(p => {
              const media = reader.mediaById.get(p.mediaId);
              return media ? <ReaderMedia key={p.id} media={media} /> : null;
            })}
            <ReaderBody body={chapter.body} />
            {(chapter.mediaPlacements ?? []).filter(p => p.position !== "before").map(p => {
              const media = reader.mediaById.get(p.mediaId);
              return media ? <ReaderMedia key={p.id} media={media} /> : null;
            })}
          </section>)}
          {!reader.chapters.length && <ReaderBody body={reader.publication.body} />}
        </section>)}
        <section className="journey-activities" aria-label="Atividades do encontro">
          {unit.missions.length > 0 && <details><summary>Exercícios do encontro</summary>
            {unit.missions.map(m => <div key={m.id}><h3>{m.title}</h3><p className="activity-copy">{m.instructions}</p></div>)}
          </details>}
          {unit.reflections.length > 0 && <details><summary>Reflexões para guardar</summary>
            {unit.reflections.map(r => <p className="activity-copy" key={r.id}>{r.prompt}</p>)}
          </details>}
          {unit.checkIns.length > 0 && <details><summary>Meu registro privado</summary>
            <p className="fixture-note">Se quiser, responda fora da aplicação. Nada é enviado ou guardado aqui.</p>
            {unit.checkIns.map(c => <div key={c.id}>
              <p className="activity-copy">{c.prompt}</p>
              {c.kind === "choice" && <ul>{c.options.map(o => <li key={o.id}>{o.label}</li>)}</ul>}
              {c.kind === "scale" && <p>{c.min} — {c.max}</p>}
            </div>)}
          </details>}
        </section>
        <div className="reader-navigation">
          {index > 0 ? <Link className="text-link" href={base + "/" + model.units[index - 1].unit.id}>← Encontro anterior</Link> : <span />}
          {index < model.units.length - 1
            ? <Link className="button" href={base + "/" + model.units[index + 1].unit.id}>Próximo encontro →</Link>
            : <Link className="button" href={base}>Voltar aos encontros</Link>}
        </div>
      </article>
    </div>
  </>;
}
