import Image from "next/image";
import logo from "../../public/marca/logo-principal-800.webp";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 bg-[radial-gradient(ellipse_at_top,var(--cream),var(--champagne)_60%,var(--marble))] px-6 py-16 text-center">
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
      <p className="text-xs uppercase tracking-[0.2em] text-copper sm:text-sm sm:tracking-[0.3em]">Observe. Experimente. Escolha.</p>
      <p className="max-w-md text-lg font-light text-ink-soft">21 Dias — Meu Melhor Reflexo. Em breve.</p>
    </main>
  );
}
