import { notFound } from "next/navigation";
import { SalesShell } from "@/components/sales/pages";
import { AccessDemo } from "@/components/sales/interactions";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "S1 · Demonstração de acesso",
  robots: { index: false, follow: false },
};
export default function Page() {
  if (
    process.env.VERCEL_ENV !== "preview" &&
    process.env.NODE_ENV === "production"
  )
    notFound();
  return (
    <SalesShell surface="offer">
      <AccessDemo />
    </SalesShell>
  );
}
