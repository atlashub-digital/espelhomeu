import Image from "next/image";
import Link from "next/link";
import type { ReactNode, CSSProperties } from "react";
import { themeCssVariables } from "@atlashub-digital/amf-experience-core";
import { theme, enabled } from "@espelhomeu/project-config";
import logo from "../../public/marca/logo-principal-800.webp";

export function ProductShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="experience"
      style={themeCssVariables(theme) as CSSProperties}
    >
      <a className="skip-link" href="#conteudo">
        Saltar para o conteúdo
      </a>
      <header className="product-header">
        <Link href="/inicio" aria-label="EspelhoMeu — início">
          <Image
            src={logo}
            width={136}
            height={136}
            alt="EspelhoMeu"
            className="brand-image"
          />
        </Link>
        <nav aria-label="Navegação principal">
          <Link href="/inicio">Início</Link>
          {enabled("library") && (
            <>
              <Link href="/descobrir">Descobrir</Link>
              <Link href="/biblioteca">Biblioteca</Link>
            </>
          )}
          <Link href="/programas">Jornadas</Link>
        </nav>
        <Link className="member-link" href="/perfil">
          Meu espaço <span aria-hidden="true">↗</span>
        </Link>
      </header>
      <main id="conteudo" className="product-main">
        {children}
      </main>
      <footer className="product-footer">
        <div>
          <strong>EspelhoMeu</strong>
          <p>O espelho que me conhece.</p>
        </div>
        <div>
          <Link href="/meu-espelho">Meu Espelho</Link>
          <Link href="/comunidade">Comunidade</Link>
          <Link href="/premium">Founder</Link>
        </div>
        <div>
          <Link href="/privacidade">Privacidade</Link>
          <Link href="/status">Estado do serviço</Link>
          <span>Maiores de 18 anos · AVS</span>
        </div>
      </footer>
    </div>
  );
}
export function Intro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="page-intro">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <div className="intro-copy">{children}</div>
    </section>
  );
}
