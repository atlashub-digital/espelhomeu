import Link from "next/link";
import { Intro } from "@/components/product-shell";
export default function Page() {
  return (
    <>
      <Intro eyebrow="Founder" title="O primeiro capítulo, juntas.">
        <p>
          A oferta Founder está em preparação. Não há checkout ou cobrança nesta
          fase. Conheça a experiência e receba um aviso quando a primeira turma
          abrir.
        </p>
      </Intro>
      <section className="entry-panel">
        <span className="entry-symbol" aria-hidden="true">
          ✦
        </span>
        <div>
          <p className="eyebrow">Em preparação</p>
          <h2>
            Ao seu ritmo.
            <br />
            <em>Desde o primeiro dia.</em>
          </h2>
          <Link className="button" href="/biblioteca">
            Conhecer a biblioteca →
          </Link>
        </div>
      </section>
    </>
  );
}
