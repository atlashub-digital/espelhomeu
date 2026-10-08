"use client";

import Link from "next/link";
import { useActionState } from "react";
import { joinWaitlist, type WaitlistState } from "./actions";

const messages: Record<Exclude<WaitlistState["status"], "idle">, string> = {
  ok: "Inscrição feita. Vamos avisar por email quando a primeira turma abrir.",
  invalid: "Confirme o email e a caixa dos 18 anos.",
  error: "Não foi possível guardar agora. Tente de novo daqui a pouco.",
};

export function WaitlistForm() {
  const [state, action, pending] = useActionState<WaitlistState, FormData>(joinWaitlist, { status: "idle" });

  if (state.status === "ok") {
    return (
      <p role="status" className="rounded-2xl bg-cream px-6 py-5 text-ink">
        {messages.ok}
      </p>
    );
  }

  return (
    <form action={action} className="grid w-full max-w-md gap-4 text-left">
      <label className="grid gap-1 text-sm">
        Email
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="rounded-xl border border-rose-gold/60 bg-cream px-4 py-3 text-base outline-none focus:border-copper"
        />
      </label>
      <label className="grid gap-1 text-sm">
        País
        <select
          name="market"
          defaultValue="PT"
          className="rounded-xl border border-rose-gold/60 bg-cream px-4 py-3 text-base outline-none focus:border-copper"
        >
          <option value="PT">Portugal</option>
          <option value="BR">Brasil</option>
        </select>
      </label>
      <label className="flex items-start gap-3 text-sm text-ink-soft">
        <input type="checkbox" name="adult" required className="mt-1 size-4 accent-copper" />
        <span>
          Tenho 18 anos ou mais e aceito receber um email quando a primeira turma abrir. Li a{" "}
          <Link href="/privacidade" className="text-copper-deep underline">
            política de privacidade
          </Link>
          .
        </span>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-copper px-6 py-3 font-medium tracking-wide text-cream transition hover:bg-copper-deep disabled:opacity-60"
      >
        {pending ? "A enviar…" : "Quero entrar na lista"}
      </button>
      {state.status !== "idle" && (
        <p role="alert" className="text-sm text-copper-deep">
          {messages[state.status]}
        </p>
      )}
    </form>
  );
}
