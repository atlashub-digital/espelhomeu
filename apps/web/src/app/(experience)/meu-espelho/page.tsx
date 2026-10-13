import Link from "next/link";
import { Intro } from "@/components/product-shell";
export default function Page() {
  return (
    <>
      <Intro eyebrow="Meu Espelho" title="Uma conversa com espaço para você.">
        <p>
          O seu companheiro pessoal está em preparação. As suas reflexões serão
          privadas e só poderão ser guardadas com consentimento. Por enquanto,
          encontre uma leitura para fazer uma pausa.
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
            Encontrar uma leitura →
          </Link>
        </div>
      </section>
    </>
  );
}
