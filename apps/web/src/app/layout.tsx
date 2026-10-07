import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Jost } from "next/font/google";
import "./globals.css";

const bodoni = Bodoni_Moda({
  variable: "--font-bodoni",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "EspelhoMeu — O espelho que me conhece",
  description: "Espelho meu, espelho meu. Hoje, eu me escolho.",
};

export const viewport: Viewport = {
  themeColor: "#f8f1e9",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt" className={`${bodoni.variable} ${jost.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
