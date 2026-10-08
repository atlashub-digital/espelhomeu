import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacidade · EspelhoMeu" };

const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contact@lia.doctor";

export default function Privacidade() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 font-light leading-relaxed text-ink">
      <Link href="/" className="text-sm text-copper-deep underline">
        ← Voltar
      </Link>
      <h1 className="mt-6 font-display text-4xl font-normal">Privacidade</h1>
      <p className="mt-2 text-sm text-ink-soft">Lista de espera · versão de 8 de outubro de 2026</p>

      <h2 className="mt-10 font-display text-2xl">O que guardamos</h2>
      <p className="mt-3">
        Só o email, o país (Portugal ou Brasil), a data da inscrição e a versão deste texto que aceitou. Não pedimos
        fotografias, nome nem outros dados nesta fase.
      </p>

      <h2 className="mt-8 font-display text-2xl">Para quê</h2>
      <p className="mt-3">
        Para avisar, por email, quando a primeira turma de &ldquo;21 Dias — Meu Melhor Reflexo&rdquo; abrir, e para
        sabermos quantas pessoas têm interesse. Não vendemos nem partilhamos estes dados com terceiros para marketing.
      </p>

      <h2 className="mt-8 font-display text-2xl">Quem trata os dados</h2>
      <p className="mt-3">
        O projeto EspelhoMeu, da AVS — Atlas Venture Studio. Os dados ficam numa base de dados num servidor nosso; o
        site é servido pela Vercel.
      </p>

      <h2 className="mt-8 font-display text-2xl">Durante quanto tempo</h2>
      <p className="mt-3">
        Até a primeira turma abrir e no máximo 12 meses após a inscrição. Depois são apagados, a menos que se
        inscreva no programa.
      </p>

      <h2 className="mt-8 font-display text-2xl">Os seus direitos</h2>
      <p className="mt-3">
        Pode pedir para ver, corrigir ou apagar os seus dados, e retirar o consentimento a qualquer momento, ao abrigo
        do RGPD (Portugal) e da LGPD (Brasil).{" "}
        {contact ? (
          <>
            Escreva para <a className="text-copper-deep underline" href={`mailto:${contact}`}>{contact}</a>.
          </>
        ) : (
          <>Responda a qualquer email nosso e tratamos do pedido.</>
        )}
      </p>

      <p className="mt-10 text-sm text-ink-soft">O EspelhoMeu destina-se apenas a maiores de 18 anos.</p>
    </main>
  );
}
