import Image from "next/image";
import {
  formatOfferPrice,
  getCollectionValue,
  getSalesOffer,
  salesOffers,
  type SalesOffer,
  type SalesAttribution,
} from "@espelhomeu/project-config/sales";
import { salesProducts, type SalesProduct } from "@/lib/sales-data";
import {
  SalesSession,
  SalesLink,
  PathQuiz,
  IntentSelector,
  InsidePreview,
} from "./interactions";
import { InterestRequest } from "./interest";
import "./sales.css";

const scene = "/conteudo/produto-04/MEDIA_EDITORIAL_P04_01_v1.2.jpg";
export function SalesShell({
  children,
  attribution = {},
  offerId,
  surface = "home",
}: {
  children: React.ReactNode;
  attribution?: SalesAttribution;
  offerId?: string;
  surface?: string;
}) {
  return (
    <SalesSession
      key={offerId ?? surface}
      attribution={attribution}
      offerId={offerId}
      surface={surface}
    >
      <a className="skip-link" href="#sales-main">
        Ir para o conteúdo
      </a>
      <div className="sales-announcement">
        Uma coleção para se escolher.{" "}
        <span>Checkout próprio · cartão e Pix · acesso após confirmação</span>
      </div>
      <header className="sales-header">
        <SalesLink href="/" aria-label="EspelhoMeu — início">
          <Image
            src="/marca/logo-principal-800.webp"
            width={110}
            height={110}
            alt="EspelhoMeu"
            priority
          />
        </SalesLink>
        <nav aria-label="Navegação comercial">
          <SalesLink href="/colecao">A coleção</SalesLink>
          <SalesLink href="/#escolher">Por onde começar</SalesLink>
          <SalesLink href="/jornada">A Jornada</SalesLink>
        </nav>
        <SalesLink href="/biblioteca" className="sales-library">
          Minha Biblioteca <span>↗</span>
        </SalesLink>
      </header>
      <main id="sales-main">{children}</main>
      <footer className="sales-footer">
        <div>
          <p className="sales-wordmark">EspelhoMeu</p>
          <p>
            Espelho meu, espelho meu.
            <br />
            Hoje, eu me escolho.
          </p>
        </div>
        <div>
          <SalesLink href="/colecao">A coleção</SalesLink>
          <SalesLink href="/inicio">Explorar leituras</SalesLink>
          <SalesLink href="/biblioteca">Biblioteca</SalesLink>
        </div>
        <div>
          <SalesLink href="/jornada">Jornada · em preparação</SalesLink>
          <SalesLink href="/membership">Membership · em preparação</SalesLink>
          <SalesLink href="/lista-de-espera">
            Lista de espera existente
          </SalesLink>
        </div>
        <div>
          <SalesLink href="/privacidade">Privacidade</SalesLink>
          <span>Para mulheres adultas · 18+</span>
          <span>Reflexão pessoal. Não substitui cuidado profissional.</span>
        </div>
        <small>
          EspelhoMeu · AVS — Atlas Venture Studio · Experiência comercial em
          Preview. Sem cobrança.
        </small>
      </footer>
    </SalesSession>
  );
}
function Cover({
  p,
  priority = false,
}: {
  p: SalesProduct;
  priority?: boolean;
}) {
  return (
    <Image
      src={p.cover}
      alt={`Capa de ${p.title}`}
      width={400}
      height={600}
      sizes="(max-width: 700px) 65vw, 320px"
      priority={priority}
      className="sales-cover"
    />
  );
}
export function ProductCard({ p, index }: { p: SalesProduct; index: number }) {
  return (
    <article className="sales-card">
      <SalesLink
        href={p.offer.path}
        event="offer_cta"
        offerId={p.offer.id}
        surface="collection"
        className="sales-card-image"
        aria-label={`Conhecer ${p.title}`}
      >
        <span>VOLUME {String(index + 1).padStart(2, "0")}</span>
        <Cover p={p} />
        <i>↗</i>
      </SalesLink>
      <p className="sales-kicker">{p.narrative.intent}</p>
      <h3>
        <SalesLink href={p.offer.path} event="offer_cta" offerId={p.offer.id}>
          {p.title}
        </SalesLink>
      </h3>
      <p>{p.narrative.count} · WebReader + extras</p>
      <div className="sales-card-bottom">
        <strong>{formatOfferPrice(p.offer)}</strong>
        <SalesLink
          href={p.offer.path + "#amostra"}
          event="sample_open"
          offerId={p.offer.id}
        >
          Experimentar ↗
        </SalesLink>
      </div>
    </article>
  );
}
function FAQ() {
  return (
    <section className="sales-section sales-faq">
      <div>
        <p className="sales-kicker">Antes de escolher</p>
        <h2>
          Espaço para
          <br />
          <em>as suas perguntas.</em>
        </h2>
      </div>
      <div>
        {[
          [
            "Como vou ler?",
            "O WebReader já está disponível: capítulos, índice, progresso e acesso aos materiais complementares. A Biblioteca reúne as leituras. Você pode experimentar essa experiência no Preview.",
          ],
          [
            "Como funciona a compra?",
            "Os cinco volumes e a Coleção são ofertas digitais de pagamento único. O checkout acontece dentro do EspelhoMeu com processamento seguro por cartão ou Pix. Jornada e Membership continuam em preparação.",
          ],
          [
            "Preciso seguir todos os exercícios?",
            "Não. As atividades são opcionais. Você pode pular uma pergunta, voltar depois ou apenas ler. O diário tem encontros independentes.",
          ],
          [
            "É um produto físico ou um acompanhamento terapêutico?",
            "Não. São publicações digitais para reflexão pessoal, destinadas a maiores de 18 anos. Não são diagnóstico, terapia ou promessa de resultados. Os materiais de apoio disponíveis podem ser descarregados no Reader.",
          ],
          [
            "O Companion já está incluído?",
            "O EspelhoMeu Companion está em preparação. Jornada e Membership só terão compra disponível quando as suas funcionalidades e condições de entrega estiverem prontas.",
          ],
        ].map(([q, a]) => (
          <details key={q}>
            <summary>
              {q}
              <span>+</span>
            </summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
function CollectionValue({ offer }: { offer: SalesOffer }) {
  const value = getCollectionValue(offer);
  if (!value) return null;
  const money = (amount: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: value.currency,
    }).format(amount / 100);
  return (
    <div className="sales-collection-value" data-testid="collection-value">
      <p>
        {value.productCount} volumes e os materiais correspondentes, reunidos no
        mesmo lugar.
      </p>
      <dl>
        <div>
          <dt>Soma dos volumes individuais</dt>
          <dd>{money(value.individualTotalMinor)}</dd>
        </div>
        <div>
          <dt>Coleção completa</dt>
          <dd>{money(value.collectionAmountMinor)}</dd>
        </div>
        {value.savingMinor > 0 && (
          <div>
            <dt>Diferença a favor da coleção</dt>
            <dd>{money(value.savingMinor)}</dd>
          </div>
        )}
      </dl>
      <small>
        Comparação com os valores individuais atuais. Não é um preço anterior
        nem uma promoção por tempo limitado.
      </small>
    </div>
  );
}
function CollectionDecision({
  products,
  offer,
  attribution,
}: {
  products: SalesProduct[];
  offer: SalesOffer;
  attribution: SalesAttribution;
}) {
  return (
    <SalesShell
      attribution={attribution}
      offerId={offer.id}
      surface="collection"
    >
      <section className="sales-collection-intro">
        <div>
          <p className="sales-kicker">A coleção completa · cinco intenções</p>
          <h1>
            Uma leitura para hoje.
            <br />
            <em>Outras para quando fizer sentido.</em>
          </h1>
          <p>
            Compare os volumes por intenção e formato. Escolha uma leitura ou
            reúna os cinco caminhos na Coleção EspelhoMeu.
          </p>
          <div className="sales-actions">
            <SalesLink
              href="/colecao#oferta"
              className="sales-button"
              event="collection_cta"
              offerId="colecao"
            >
              Conhecer a coleção · {formatOfferPrice(offer)} ↗
            </SalesLink>
            <SalesLink href="/colecao#comparar" className="sales-link">
              Comparar os cinco volumes ↓
            </SalesLink>
          </div>
        </div>
        <Image
          src="/comercial/COLECAO_HERO_1920x760.jpg"
          width={1920}
          height={760}
          sizes="100vw"
          priority
          alt="Os cinco volumes da Coleção EspelhoMeu"
        />
      </section>
      <OfferBox
        offer={offer}
        samplePath="/colecao#comparar"
        cta="Escolher uma amostra"
      />
      <section
        className="sales-section"
        id="comparar"
        data-testid="collection-comparison"
      >
        <p className="sales-kicker">Onde estou? O que quero explorar?</p>
        <h2>
          Cinco caminhos.
          <br />
          <em>Escolha pela intenção.</em>
        </h2>
        <div className="sales-comparison" id="volumes">
          {products.map((p) => (
            <article key={p.offer.id}>
              <Cover p={p} />
              <div>
                <p className="sales-kicker">{p.narrative.intent}</p>
                <h3>{p.title}</h3>
                <p>{p.narrative.context}</p>
              </div>
              <dl>
                <div>
                  <dt>Estrutura</dt>
                  <dd>{p.narrative.count}</dd>
                </div>
                <div>
                  <dt>Materiais</dt>
                  <dd>{p.extras.map((e) => e.title).join(" · ")}</dd>
                </div>
                <div>
                  <dt>Individual</dt>
                  <dd>{formatOfferPrice(p.offer)}</dd>
                </div>
              </dl>
              <SalesLink
                href={p.offer.path + "#amostra"}
                className="sales-link"
                event="sample_open"
                offerId={p.offer.id}
              >
                Experimentar este volume ↗
              </SalesLink>
            </article>
          ))}
        </div>
        <p>
          Todos incluem leitura no WebReader e os seus materiais
          correspondentes. A Coleção reúne os cinco volumes; Companion e
          Membership são propostas separadas.
        </p>
        <SalesLink
          href="/colecao#oferta"
          className="sales-button"
          event="collection_cta"
          offerId="colecao"
        >
          Voltar à oferta completa · {formatOfferPrice(offer)} ↑
        </SalesLink>
      </section>
      <WebReaderPreview product={products[0]} />
      <Bundles />
      <FAQ />
    </SalesShell>
  );
}
function OfferBox({
  offer,
  reader,
  samplePath,
  cta = "Experimentar antes de escolher",
}: {
  offer: SalesOffer;
  reader?: string;
  samplePath?: string;
  cta?: string;
}) {
  return (
    <section className="sales-offer" id="oferta">
      <div>
        <p className="sales-kicker">
          {offer.productRefs.length > 1
            ? "Uma coleção, vários caminhos"
            : "Seu próximo encontro"}
        </p>
        <h2>{offer.title}</h2>
        <p>
          Leitura digital no WebReader e materiais correspondentes, no seu
          ritmo.
        </p>
        {offer.id === "colecao" && <CollectionValue offer={offer} />}
        <p className="sales-badge">
          {offer.availability === "preparing"
            ? "Em preparação"
            : "Amostra disponível"}
        </p>
      </div>
      <div className="sales-offer-price">
        <strong>{formatOfferPrice(offer)}</strong>
        <small>
          {offer.purchaseEnabled
            ? "Pagamento único · acesso após confirmação"
            : offer.cadence === "month"
              ? "Assinatura ainda não disponível"
              : "Oferta em preparação"}
        </small>
        <SalesLink
          href={
            offer.purchaseEnabled
              ? "/checkout/" + offer.id
              : samplePath ?? "/colecao#volumes"
          }
          className="sales-button"
          event={offer.id === "colecao" ? "collection_cta" : "offer_cta"}
          offerId={offer.id}
        >
          {offer.purchaseEnabled
            ? "Comprar agora · " + formatOfferPrice(offer)
            : cta}{" "}
          ↗
        </SalesLink>
        {reader && (
          <SalesLink
            href={reader}
            className="sales-link"
            event="sample_open"
            offerId={offer.id}
            surface="reader"
          >
            Explorar o WebReader de demonstração →
          </SalesLink>
        )}
        <small>
          O pagamento é confirmado antes da liberação do acesso integral.
        </small>
      </div>
    </section>
  );
}
function WebReaderPreview({ product }: { product: SalesProduct }) {
  return (
    <section className="sales-section sales-reader-section" id="experiencia">
      <div className="sales-reader-mock">
        <div className="reader-mock-top">
          <span>EspelhoMeu</span>
          <span>WebReader ↗</span>
        </div>
        <div className="reader-mock-body">
          <div>
            <Cover p={product} />
          </div>
          <div>
            <small>UMA LEITURA, UM NOVO OLHAR</small>
            <h3>{product.samples[0].title}</h3>
            <div className="reader-mock-lines" />
            <p>Índice. Capítulos. Seu ritmo.</p>
            <span className="reader-mock-progress" />
          </div>
        </div>
      </div>
      <div>
        <p className="sales-kicker">A experiência já existe</p>
        <h2>
          Não é só abrir um arquivo.
          <br />
          <em>É ter um lugar para voltar.</em>
        </h2>
        <p>
          Encontre a leitura na Biblioteca, navegue pelo índice, acompanhe o
          progresso neste dispositivo e abra os extras junto do texto.
        </p>
        <ol className="sales-steps">
          <li>
            <b>01</b>Escolha uma leitura
          </li>
          <li>
            <b>02</b>Abra no WebReader
          </li>
          <li>
            <b>03</b>Explore os extras e continue
          </li>
        </ol>
        <SalesLink
          href={product.reader}
          event="sample_open"
          offerId={product.offer.id}
          surface="reader"
          className="sales-link"
        >
          Ver a experiência real →
        </SalesLink>
        <small>
          A amostra continua aberta. O acesso integral ao Reader é liberado
          após confirmação da compra.
        </small>
      </div>
    </section>
  );
}
function Bundles() {
  const bundles = salesOffers.filter((o) => o.availability === "unpriced");
  return (
    <section className="sales-section">
      <div className="sales-section-heading">
        <p className="sales-kicker">Leituras que conversam</p>
        <h2>
          Mais de um caminho
          <br />
          <em>pode ser seu.</em>
        </h2>
        <p>
          Combinações em preparação. Os volumes já podem ser explorados
          individualmente.
        </p>
      </div>
      <div className="sales-bundles">
        {bundles.map((o, i) => (
          <article key={o.id} id={o.path.split("#")[1]}>
            {i !== 1 && (
              <Image
                src={`/comercial/BUNDLE_0${i === 0 ? 1 : 2}_P0${i === 0 ? 1 : 4}_P0${i === 0 ? 2 : 5}_1080x1080.jpg`}
                width={1080}
                height={1080}
                sizes="(max-width:700px) 90vw, 360px"
                alt={`Composição ilustrada dos volumes de ${o.title}`}
              />
            )}
            <p className="sales-kicker">
              {o.productRefs.join(" + ").toUpperCase()}
            </p>
            <h3>{o.title}</h3>
            <p>Combinação em preparação · sem compra ativa</p>
            <div>
              {o.productRefs.map((id) => {
                const p = getSalesOffer(id)!;
                return (
                  <SalesLink
                    href={p.path}
                    key={id}
                    event="bundle_cta"
                    offerId={o.id}
                    surface="bundle"
                    className="sales-link"
                  >
                    Conhecer {id.toUpperCase()} ↗
                  </SalesLink>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
export function CollectionPage({
  attribution,
  home = false,
}: {
  attribution: SalesAttribution;
  home?: boolean;
}) {
  const products = salesProducts();
  const offer = getSalesOffer("colecao")!;
  if (!home)
    return (
      <CollectionDecision
        products={products}
        offer={offer}
        attribution={attribution}
      />
    );
  return (
    <SalesShell
      attribution={attribution}
      surface={home ? "home" : "collection"}
      offerId={home ? undefined : offer.id}
    >
      <section className="sales-home-hero">
        <div className="sales-home-copy">
          <p className="sales-kicker">
            Leituras para se reconhecer · Coleção EspelhoMeu
          </p>
          <h1>
            {home ? (
              <>
                Hoje,
                <br />
                <em>eu me escolho.</em>
              </>
            ) : (
              <>
                Cinco volumes.
                <br />
                <em>Muitos jeitos de ser sua.</em>
              </>
            )}
          </h1>
          <p>
            Um espaço para olhar para si com gentileza. Leituras, perguntas e
            pequenas escolhas para encontrar o que faz sentido para você.
          </p>
          <div className="sales-actions">
            <SalesLink
              href="/colecao#volumes"
              className="sales-button"
              event="collection_cta"
              offerId="colecao"
              surface="hero"
            >
              Conhecer a coleção <span>↗</span>
            </SalesLink>
            <SalesLink href="/#escolher" className="sales-link">
              Encontrar meu começo →
            </SalesLink>
          </div>
          <span className="sales-hero-note">
            5 volumes · WebReader · Cadernos e extras
          </span>
        </div>
        <div className="sales-home-visual">
          <Image
            src={scene}
            fill
            sizes="(max-width:800px) 100vw, 55vw"
            alt="Imagem editorial de uma mulher diante da costa ao entardecer"
            priority
          />
          <div className="sales-cover-duo">
            <Cover p={products[0]} priority />
            <Cover p={products[4]} priority />
          </div>
          <div className="sales-visual-caption">
            Um encontro com você.
            <br />
            <em>Uma página de cada vez.</em>
          </div>
        </div>
      </section>
      <div className="sales-values">
        <span>Observe.</span>
        <span>Experimente.</span>
        <span>Escolha.</span>
        <small>Sem notas. Sem comparação. No seu ritmo.</small>
      </div>
      <section className="sales-section sales-choice" id="escolher">
        <div>
          <p className="sales-kicker">Por onde começar?</p>
          <h2>
            O que faz sentido
            <br />
            <em>para você, hoje?</em>
          </h2>
          <p>
            Não precisa escolher uma nova versão de si. Pode escolher apenas uma
            próxima leitura.
          </p>
        </div>
        <div className="sales-choice-list">
          {products.map((p, i) => (
            <SalesLink
              key={p.offer.id}
              href={p.offer.path}
              event="offer_cta"
              offerId={p.offer.id}
              surface="collection"
            >
              <span>0{i + 1}</span>
              <div>
                <strong>{p.narrative.intent}</strong>
                <small>{p.title}</small>
              </div>
              <b>↗</b>
            </SalesLink>
          ))}
        </div>
      </section>
      <section className="sales-section" id="volumes">
        <div className="sales-section-heading">
          <p className="sales-kicker">A coleção</p>
          <h2>
            Histórias, perguntas
            <br />
            <em>e espaço para você.</em>
          </h2>
          <p>Escolha pela intenção, não pela obrigação de completar.</p>
        </div>
        <div className="sales-products">
          {products.map((p, i) => (
            <ProductCard key={p.offer.id} p={p} index={i} />
          ))}
        </div>
      </section>
      <section className="sales-collection-banner">
        <Image
          src="/comercial/COLECAO_HERO_1920x760.jpg"
          width={1920}
          height={760}
          sizes="100vw"
          alt="Os cinco volumes da coleção EspelhoMeu, apresentados lado a lado"
        />
        <div>
          <p className="sales-kicker">Todos os volumes, diferentes momentos</p>
          <h2>
            Uma coleção para voltar
            <br />
            <em>mais de uma vez.</em>
          </h2>
          <p>
            Começar, reconhecer a própria beleza, criar continuidade, abrir
            novos capítulos e escrever. Os cinco livros e seus materiais
            correspondentes, reunidos.
          </p>
          <SalesLink
            href="/colecao#oferta"
            className="sales-button"
            event="collection_cta"
            offerId="colecao"
          >
            Ver coleção · {formatOfferPrice(offer)} ↗
          </SalesLink>
        </div>
      </section>
      <WebReaderPreview product={products[0]} />

      <section className="sales-section sales-future">
        <p className="sales-kicker">O que vem depois</p>
        <h2>
          Um caminho que
          <br />
          <em>pode continuar.</em>
        </h2>
        <p>
          A Jornada EspelhoMeu está em preparação: coleção, onboarding, caminho
          guiado e futuro Companion. Uma proposta integrada para acompanhar a
          leitura — ainda sem compra ou funcionalidades adicionais ativas.
        </p>
        <div className="sales-actions">
          <SalesLink href="/jornada" className="sales-button">
            Conhecer a proposta ↗
          </SalesLink>
          <SalesLink href="/membership" className="sales-link">
            EspelhoMeu contínuo →
          </SalesLink>
        </div>
      </section>
      <FAQ />
      <section className="sales-final">
        <p className="sales-kicker">Não precisa ser tudo hoje.</p>
        <h2>
          Pode ser só
          <br />
          <em>a primeira página.</em>
        </h2>
        <SalesLink
          href="/7-dias-para-me-escolher#amostra"
          className="sales-button"
          event="sample_open"
          offerId="p01"
          surface="footer"
        >
          Experimentar o primeiro encontro ↗
        </SalesLink>
      </section>
    </SalesShell>
  );
}
function ProductStructure({ p }: { p: SalesProduct }) {
  const core =
    p.offer.id === "p01"
      ? p.chapters.filter((c) => /^Dia /.test(c.title))
      : p.offer.id === "p03"
        ? p.chapters.filter((c) => /^Dia /.test(c.title))
        : p.offer.id === "p04"
          ? p.chapters.filter((c) => /^CAPÍTULO/.test(c.title))
          : p.offer.id === "p05"
            ? p.chapters.filter((c) => /^ENCONTRO/.test(c.title))
            : p.chapters;
  return (
    <section className="sales-section sales-structure">
      <div>
        <p className="sales-kicker">Por dentro do volume</p>
        <h2>{p.narrative.rhythm}</h2>
        <p>{p.narrative.context}</p>
        {p.offer.id === "p03" && (
          <>
            <div className="sales-acts">
              <span>01 · Ver</span>
              <span>02 · Experimentar</span>
              <span>03 · Evoluir</span>
            </div>
            <small>
              A sequência de 21 encontros está no WebReader. Um Journey
              interativo específico deste volume ainda não está disponível.
            </small>
          </>
        )}
        {p.offer.id === "p05" && (
          <div className="sales-acts">
            {Array.from(
              new Set(p.chapters.map((c) => c.part).filter(Boolean)),
            ).map((part) => (
              <span key={part}>{part?.replace("PARTE — ", "")}</span>
            ))}
          </div>
        )}
      </div>
      <div className="sales-contents">
        {core.map((c, i) => (
          <details key={c.id}>
            <summary>
              <span>{String(i + 1).padStart(2, "0")}</span>
              {c.title.replace(/^(CAPÍTULO|ENCONTRO|Dia) \d+\s*—\s*/i, "")}
              <b>+</b>
            </summary>
            <p>Leitura e reflexão no seu ritmo.</p>
            <SalesLink
              href={p.reader}
              className="sales-link"
              event="sample_open"
              offerId={p.offer.id}
            >
              Explorar no WebReader →
            </SalesLink>
          </details>
        ))}
      </div>
    </section>
  );
}
export function ProductSalesPage({
  p,
  attribution,
}: {
  p: SalesProduct;
  attribution: SalesAttribution;
}) {
  const n = p.narrative;
  return (
    <SalesShell
      attribution={attribution}
      offerId={p.offer.id}
      surface="product"
    >
      <div className={`sales-product-page variant-${n.variant}`}>
        <section className="sales-product-hero">
          <div>
            <SalesLink href="/colecao" className="sales-back">
              ← A coleção
            </SalesLink>
            <p className="sales-kicker">
              {n.eyebrow} · Volume {p.offer.id.slice(1)}
            </p>
            <h1>{n.headline}</h1>
            <h2>{p.title}</h2>
            <p>{n.lead}</p>
            <div className="sales-actions">
              <SalesLink
                href={p.offer.path + "#amostra"}
                className="sales-button"
                event="sample_open"
                offerId={p.offer.id}
                surface="hero"
              >
                {n.action} ↗
              </SalesLink>
              <SalesLink href={p.offer.path + "#oferta"} className="sales-link">
                {formatOfferPrice(p.offer)} · ver oferta
              </SalesLink>
            </div>
            <div className="sales-hero-note">
              {n.count} · WebReader · Extras digitais
            </div>
            <span className="sales-badge">
              Amostra disponível · checkout integrado
            </span>
          </div>
          <div className="sales-product-visual">
            <span className="sales-volume-number">{p.offer.id.slice(1)}</span>
            <Cover p={p} priority />
            <span>{p.subtitle}</span>
          </div>
        </section>
        {n.interaction === "draw" && (
          <InsidePreview samples={p.samples} offerId={p.offer.id} draw />
        )}
        <section className="sales-section sales-promise">
          <div>
            <p className="sales-kicker">{n.eyebrow}</p>
            <h2>{n.promise}</h2>
            <p>{n.context}</p>
          </div>
          <ul>
            {n.benefits.map((b, i) => (
              <li key={b}>
                <span>0{i + 1}</span>
                <p>{b}</p>
              </li>
            ))}
          </ul>
        </section>
        {n.interaction === "quiz" && (
          <PathQuiz samplePath={p.offer.path + "#amostra"} />
        )}
        {(n.interaction === "expression" || n.interaction === "intention") && (
          <IntentSelector
            options={p.intentions.map((option, index) => ({
              ...option,
              title: p.samples[index].title,
            }))}
            kind={n.interaction}
            offerId={p.offer.id}
            samplePath={p.offer.path + "#amostra"}
          />
        )}
        {n.interaction !== "draw" && (
          <InsidePreview samples={p.samples} offerId={p.offer.id} />
        )}
        <ProductStructure p={p} />
        <section className="sales-section sales-extras">
          <div>
            <Image
              src={`/comercial/${p.offer.id.toUpperCase()}_HERO_1600x900.jpg`}
              width={1600}
              height={900}
              sizes="(max-width:800px) 100vw, 50vw"
              alt={`Apresentação ilustrada de ${p.title}`}
            />
          </div>
          <div>
            <p className="sales-kicker">Além da leitura</p>
            <h2>
              Um lugar para
              <br />
              <em>o que é seu.</em>
            </h2>
            {p.extras.map((e) => (
              <p key={e.title} className="sales-extra-item">
                ↗ {e.title}
              </p>
            ))}
            <p>
              Materiais complementares acessíveis junto do texto. Escrever é
              opcional; suas respostas ficam com você.
            </p>
            {p.offer.id === "p01" && (
              <SalesLink
                href="/programas/7-dias-para-me-escolher"
                className="sales-link"
              >
                Explorar o Journey de 7 dias →
              </SalesLink>
            )}
          </div>
        </section>
        <section className="sales-for">
          <p className="sales-kicker">Este convite é para você?</p>
          <h2>{n.forWhom}</h2>
          <p>
            Para maiores de 18 anos. Não é terapia, diagnóstico ou promessa de
            transformação. Você escolhe o ritmo e pode interromper qualquer
            atividade.
          </p>
        </section>
        <WebReaderPreview product={p} />
        <OfferBox
          offer={p.offer}
          reader={p.reader}
          samplePath={p.offer.path + "#amostra"}
        />
        <section className="sales-section sales-cross">
          <p className="sales-kicker">Se fizer sentido continuar</p>
          <h2>{n.next}</h2>
          <div>
            {p.offer.crossSellIds
              .filter((id) => getSalesOffer(id)?.amountMinor !== null)
              .map((id) => {
                const o = getSalesOffer(id)!;
                return (
                  <SalesLink
                    key={id}
                    href={o.path}
                    event={
                      id === "colecao"
                        ? "collection_cta"
                        : id.startsWith("bundle")
                          ? "bundle_cta"
                          : "offer_cta"
                    }
                    offerId={id}
                    surface="cross-sell"
                  >
                    <small>
                      {o.availability === "preparing"
                        ? "Em preparação"
                        : o.amountMinor === null
                          ? "Combinação em preparação"
                          : "Conhecer"}
                    </small>
                    <h3>{o.title}</h3>
                    <strong>{formatOfferPrice(o)} ↗</strong>
                  </SalesLink>
                );
              })}
          </div>
        </section>
        <FAQ />
        <div className="sales-sticky">
          <span>
            {p.title}
            <strong>{formatOfferPrice(p.offer)}</strong>
          </span>
          <SalesLink
            href={
              p.offer.purchaseEnabled
                ? "/checkout/" + p.offer.id
                : p.offer.path + "#amostra"
            }
            className="sales-button"
            offerId={p.offer.id}
            event="offer_cta"
            surface="sticky"
          >
            {p.offer.purchaseEnabled
              ? "Comprar · " + formatOfferPrice(p.offer)
              : "Ler amostra"}{" "}
            ↗
          </SalesLink>
        </div>
      </div>
    </SalesShell>
  );
}
export function FuturePage({
  offer,
  attribution,
}: {
  offer: SalesOffer;
  attribution: SalesAttribution;
}) {
  const member = offer.id === "membership";
  return (
    <SalesShell attribution={attribution} offerId={offer.id} surface={offer.id}>
      <section className="sales-future-hero">
        <p className="sales-kicker">Em preparação · compra indisponível</p>
        <h1>
          {member ? (
            <>
              Um espaço
              <br />
              <em>para continuar.</em>
            </>
          ) : (
            <>
              A coleção é o começo.
              <br />
              <em>O caminho é seu.</em>
            </>
          )}
        </h1>
        <h2>{offer.title}</h2>
        <p>
          {member
            ? "A proposta de um EspelhoMeu contínuo, com novas leituras e um acompanhamento que respeita as suas escolhas."
            : "Uma experiência integrada que pretende reunir os cinco volumes, onboarding, caminho guiado e o futuro EspelhoMeu Companion."}
        </p>
        <strong>{formatOfferPrice(offer)}</strong>
        <small>
          Valor aprovado para a proposta. {member ? "Assinatura" : "Compra"}{" "}
          ainda não disponível.
        </small>
        <SalesLink href={offer.path + "#interesse"} className="sales-button">
          Quero saber quando estiver disponível ↓
        </SalesLink>
        <SalesLink
          href="/colecao"
          className="sales-link"
          event="collection_cta"
          offerId="colecao"
        >
          Enquanto isso, explore a coleção ↗
        </SalesLink>
      </section>
      <InterestRequest
        title={offer.title}
        contact={process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contact@lia.doctor"}
      />
      <section className="sales-section">
        <p className="sales-kicker">Proposta, não funcionalidades ativas</p>
        <div className="sales-future-grid">
          {(member
            ? [
                "Companion e memória consentida",
                "My Evolution, fotos e check-ins",
                "Novos conteúdos, rituais e áudios",
                "Comunidade e continuidade",
              ]
            : [
                "Coleção P01–P05",
                "Onboarding e caminho guiado",
                "Progresso e marcos pessoais",
                "EspelhoMeu Companion",
              ]
          ).map((t) => (
            <article key={t}>
              <span>EM PREPARAÇÃO</span>
              <h2>{t}</h2>
            </article>
          ))}
        </div>
        <p>
          A ativação depende da capacidade de entregar estas funcionalidades,
          consentimentos e condições comerciais aprovadas. Nada é cobrado ou
          ativado neste Preview.
        </p>
      </section>
      <FAQ />
    </SalesShell>
  );
}
