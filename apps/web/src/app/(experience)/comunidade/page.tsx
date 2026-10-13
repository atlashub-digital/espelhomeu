import Link from "next/link";
import { Intro } from "@/components/product-shell";
export default function Page() {
  return (
    <>
      <Intro eyebrow="Comunidade" title="Pertencer, com liberdade.">
        <p>
          Um espaço de escuta e troca, sem comparação. A comunidade ainda não
          está aberta; receba um aviso quando a primeira turma começar.
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
          <Link className="button" href="/inicio#lista">
            Receber um aviso →
          </Link>
        </div>
      </section>
    </>
  );
}
