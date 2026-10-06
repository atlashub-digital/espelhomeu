export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 bg-cream px-6 py-24 text-center">
      <p className="text-sm uppercase tracking-[0.3em] text-ink-soft">EspelhoMeu</p>
      <h1 className="max-w-xl font-display text-5xl leading-tight italic sm:text-6xl">
        Espelho meu, espelho meu.
        <br />
        <span className="text-ember not-italic">Hoje, eu me escolho.</span>
      </h1>
      <p className="max-w-md text-lg font-light text-ink-soft">
        21 Dias — Meu Melhor Reflexo. Em breve.
      </p>
    </main>
  );
}
