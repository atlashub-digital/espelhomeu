import Link from "next/link";
import { getCommerceAccess } from "@/lib/commerce-access";
export const dynamic = "force-dynamic";
export default async function Page() {
  const access = await getCommerceAccess();
  return (
    <main className="checkout-success">
      <p className="checkout-eyebrow">Confirmação EspelhoMeu</p>
      <h1>
        {access.authenticated
          ? "Sua próxima página já está aberta."
          : "Estamos a confirmar o seu acesso."}
      </h1>
      <p>
        {access.authenticated
          ? "O ARO confirmou um direito de acesso ativo para esta sessão. Você pode continuar na Biblioteca."
          : "Voltar do pagamento não libera uma leitura. O acesso depende de um entitlement ACTIVE confirmado pelo ARO. Não pague novamente."}
      </p>
      <Link
        className="checkout-primary"
        href={access.authenticated ? "/biblioteca" : "/checkout/processando"}
      >
        {access.authenticated
          ? "Abrir minha Biblioteca"
          : "Consultar confirmação"}
      </Link>
    </main>
  );
}
