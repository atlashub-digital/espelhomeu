import type { Metadata } from "next";
import { ProductShell } from "@/components/product-shell";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <ProductShell>{children}</ProductShell>;
}
