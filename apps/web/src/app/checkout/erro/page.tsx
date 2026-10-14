import Link from "next/link";

export default function Page() {
  return (
    <main className="checkout-success">
      <p className="checkout-eyebrow">Não concluído</p>
      <h1>Não houve uma nova cobrança nesta página.</h1>
      <p>
        Se você já realizou o pagamento e chegou aqui por engano, volte ao
        checkout ou fale com o suporte antes de tentar pagar novamente.
      </p>
      <div className="checkout-success-actions">
        <Link className="checkout-primary" href="/colecao">
          Voltar à coleção
        </Link>
        <Link href="/">Início</Link>
      </div>
    </main>
  );
}
