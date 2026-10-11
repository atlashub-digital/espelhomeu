import Link from "next/link";
import type { Publication } from "@atlashub/amf-content-schema";
import { catalog } from "@/lib/content";
const labels: Partial<Record<Publication["type"], string>> = {
  essay: "Ensaio",
  guide: "Guia",
  ebook: "eBook",
  program: "Programa",
};
const accessLabels: Record<Publication["access"]["mode"], string> = {
  public: "Leitura aberta",
  "free-account": "Conta gratuita",
  "lead-gate": "Acesso mediante consentimento",
  "one-time": "Produto individual",
  bundle: "Bundle",
  pack: "Pack",
  membership: "Membros",
  subscription: "Assinatura",
  "campaign-reward": "Campanha",
  "manual-grant": "Acesso por convite",
};
export async function PublicationCards({
  query = "",
  type = "",
}: {
  query?: string;
  type?: string;
}) {
  const publications = (await catalog()).filter(
    (p) =>
      (!type || p.type === type) &&
      `${p.title} ${p.tags.join(" ")}`
        .toLocaleLowerCase("pt")
        .includes(query.toLocaleLowerCase("pt")),
  );
  return (
    <div className="publication-grid">
      {publications.map((p, i) => (
        <article className="publication-card" key={p.id}>
          <Link
            href={`/ler/${p.slug}`}
            className={`editorial-cover cover-${i % 2}`}
            aria-label={`Ler ${p.title}`}
          >
            <span className="cover-series">ESPELHOMEU · LEITURAS</span>
            <span className="cover-orbit" aria-hidden="true" />
            <span className="cover-title">{p.title}</span>
            <span className="cover-caption">{p.subtitle}</span>
          </Link>
          <div className="card-meta">
            <span>{labels[p.type] ?? p.type}</span>
            <span>{p.readingMinutes ?? "—"} min</span>
          </div>
          <h2>
            <Link href={`/ler/${p.slug}`}>{p.title}</Link>
          </h2>
          <p>{p.subtitle}</p>
          <div className="card-meta">
            <span>{accessLabels[p.access.mode]}</span>
            <span>Demonstração</span>
          </div>
        </article>
      ))}
      {!publications.length && (
        <p role="status">
          Nenhuma leitura encontrada. Experimente outra palavra.
        </p>
      )}
    </div>
  );
}
