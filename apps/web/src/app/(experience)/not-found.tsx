import Link from "next/link";
export default function NotFound() {
  return (
    <section className="page-intro">
      <h1>Esta leitura ainda não está aqui.</h1>
      <Link className="button" href="/biblioteca">
        Explorar a biblioteca
      </Link>
    </section>
  );
}
