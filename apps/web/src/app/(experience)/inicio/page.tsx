import Link from "next/link";
import { PublicationCards } from "@/components/publication-cards";
import { WaitlistForm } from "@/app/waitlist-form";
export default function Home() {
  return (
    <>
      <section className="editorial-hero">
        <div className="hero-copy">
          <p className="eyebrow">Um espaço para se escolher</p>
          <h1>
            O seu próximo capítulo
            <br />
            <em>começa em você.</em>
          </h1>
          <p>
            Entre tantas vozes, reencontre a sua. Leituras e pequenas pausas
            para observar, experimentar e escolher — ao seu ritmo.
          </p>
          <div className="hero-actions">
            <Link className="button" href="/biblioteca">
              Encontrar uma leitura <span aria-hidden="true">↗</span>
            </Link>
            <Link className="text-link" href="/programas">
              Conhecer as jornadas →
            </Link>
          </div>
          <span className="hero-note">
            Sem comparações. Sem uma versão ideal de você.
          </span>
        </div>
        <div className="mirror-art" aria-hidden="true">
          <span className="mirror-inner" />
          <span className="mirror-script">
            Hoje,
            <br />
            eu me
            <br />
            <em>escolho.</em>
          </span>
          <span className="mirror-number">01 / UM NOVO OLHAR</span>
        </div>
      </section>
      <section className="philosophy">
        <p className="eyebrow">O espelho que me conhece</p>
        <h2>
          Não para decidir por mim.
          <br />
          <em>Para me ajudar a escolher.</em>
        </h2>
        <div className="principles">
          {[
            ["01", "Observe.", "Um olhar mais gentil sobre o que sente hoje."],
            [
              "02",
              "Experimente.",
              "Novas possibilidades, sem pressa de decidir.",
            ],
            ["03", "Escolha.", "O que faz sentido para você. E só para você."],
          ].map(([n, t, c]) => (
            <div key={n}>
              <span>{n}</span>
              <h3>{t}</h3>
              <p>{c}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="reading-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A sua biblioteca</p>
            <h2>Palavras que abrem espaço.</h2>
          </div>
          <Link className="text-link" href="/biblioteca">
            Todas as leituras →
          </Link>
        </div>
        <p className="fixture-note">
          Preview editorial · Leituras em pré-publicação.
        </p>
        <PublicationCards />
      </section>
      <section className="journey-banner">
        <div>
          <p className="eyebrow">Pequenos passos, no seu tempo</p>
          <h2>
            Há caminhos que começam
            <br />
            <em>com uma pausa.</em>
          </h2>
          <p>
            Explore os encontros disponíveis, no seu ritmo. Os exercícios são
            opcionais e as suas respostas pertencem a você.
          </p>
          <Link className="button" href="/programas">
            Explorar jornadas →
          </Link>
        </div>
        <span className="journey-motif" aria-hidden="true">
          7
        </span>
      </section>
      <section id="lista" className="founder-section">
        <div>
          <p className="eyebrow">21 Dias · Meu Melhor Reflexo</p>
          <h2>
            Faça parte
            <br />
            <em>do primeiro capítulo.</em>
          </h2>
          <p>
            A primeira turma abre em breve. Receba um aviso por email quando
            chegar o momento.
          </p>
          <p className="fixture-note">
            Só maiores de 18 anos. Inscrição voluntária.
          </p>
        </div>
        <WaitlistForm />
      </section>
    </>
  );
}
