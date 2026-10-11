import Link from "next/link";
import { Intro } from "@/components/product-shell";
export default function Page() {
  return (
    <>
      <Intro eyebrow="Jornadas EspelhoMeu" title="Um passo de cada vez.">
        <p>
          Um caminho de 7 dias para observar, experimentar e escolher. As
          jornadas estão em preparação; você já pode explorar as leituras
          abertas.
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
            Explorar leituras →
          </Link>
        </div>
      </section>
    </>
  );
}
