import Image from "next/image";
import Link from "next/link";
import logo from "../../public/marca/logo-principal-800.webp";
import { WaitlistForm } from "./waitlist-form";

const steps = [
  { title: "Observe", text: "Perceber como eu me vejo hoje, sem notas nem comparações." },
  { title: "Experimente", text: "Testar ideias novas com calma, antes de decidir." },
  { title: "Escolha", text: "Ficar com o que é meu. O Meu Espelho guarda o que eu escolhi." },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center bg-[radial-gradient(ellipse_at_top,var(--cream),var(--champagne)_60%,var(--marble))] px-6 text-center">
      <section className="flex min-h-[90svh] flex-col items-center justify-center gap-8 py-16">
        <Image
          src={logo}
          alt="EspelhoMeu — O espelho que me conhece"
          priority
          sizes="(min-width: 640px) 400px, 75vw"
          className="h-auto w-3/4 max-w-[400px]"
        />
        <h1 className="max-w-xl font-display text-3xl leading-tight italic sm:text-5xl">
          Espelho meu, espelho meu.
          <br />
          <span className="text-copper-deep not-italic">Hoje, eu me escolho.</span>
        </h1>
        <p className="max-w-md text-lg font-light text-ink-soft">
          Não para decidir por mim. Para me ajudar a escolher.
        </p>
        <a
          href="#lista"
          className="rounded-full border border-copper px-6 py-3 text-sm uppercase tracking-[0.2em] text-copper-deep transition hover:bg-copper hover:text-cream"
        >
          Entrar na lista de espera
        </a>
      </section>

      <section className="grid w-full max-w-4xl gap-6 py-16 sm:grid-cols-3">
        {steps.map((step) => (
          <div key={step.title} className="rounded-3xl bg-cream/70 px-6 py-8">
            <h2 className="font-display text-2xl text-copper-deep italic">{step.title}.</h2>
            <p className="mt-3 font-light text-ink-soft">{step.text}</p>
          </div>
        ))}
      </section>

      <section id="lista" className="flex w-full max-w-xl scroll-mt-8 flex-col items-center gap-6 py-16">
        <p className="text-xs uppercase tracking-[0.3em] text-copper">21 Dias</p>
        <h2 className="font-display text-3xl sm:text-4xl">Meu Melhor Reflexo</h2>
        <p className="font-light text-ink-soft">
          Uma jornada acompanhada de 21 dias para observar, experimentar e escolher, ao meu ritmo. A primeira
          turma abre em breve.
        </p>
        <WaitlistForm />
      </section>

      <footer className="flex w-full max-w-4xl flex-wrap justify-center gap-x-6 gap-y-2 border-t border-rose-gold/40 py-8 text-xs text-ink-soft">
        <span>EspelhoMeu · AVS — Atlas Venture Studio</span>
        <span>Só para maiores de 18 anos</span>
        <Link href="/privacidade" className="underline">
          Privacidade
        </Link>
      </footer>
    </main>
  );
}
