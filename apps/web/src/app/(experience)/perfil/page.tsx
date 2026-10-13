import Link from "next/link";
import { Intro } from "@/components/product-shell";
export default function Page() {
  return (
    <>
      <Intro eyebrow="Meu espaço" title="Um espaço que será seu.">
        <p>
          A área de membros está em preparação. A leitura aberta não exige
          conta. Quando a primeira turma abrir, avisaremos quem se inscreveu
          voluntariamente.
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
            Entrar na lista de espera →
          </Link>
        </div>
      </section>
    </>
  );
}
