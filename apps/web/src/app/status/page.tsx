import { getApiHealth } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Página técnica para confirmar que a Vercel chega à API na VPS. */
export default async function Status() {
  const health = await getApiHealth();
  return (
    <main className="mx-auto max-w-lg px-6 py-16 font-sans">
      <h1 className="font-display text-3xl">Estado</h1>
      <dl className="mt-6 grid grid-cols-2 gap-2 text-sm">
        <dt>Frontend</dt>
        <dd className="text-teal">ok</dd>
        <dt>API</dt>
        <dd className={health ? "text-teal" : "text-ember"}>{health ? health.status : "sem resposta"}</dd>
        <dt>Base de dados</dt>
        <dd>{health?.db ?? "—"}</dd>
        <dt>Versão da API</dt>
        <dd>{health?.version ?? "—"}</dd>
      </dl>
    </main>
  );
}
