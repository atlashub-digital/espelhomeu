"use client";
import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import {
  readAttribution,
  withAttribution,
  createSalesEvent,
  accessStateLabels,
  getAccessPresentation,
  type SalesAttribution,
  type SalesEventName,
  type SalesAccessState,
} from "@espelhomeu/project-config/sales";
import type { BodySource } from "@atlashub-digital/amf-content-schema";
import { ReaderBody } from "../reader-body";
const SampleChoice = createContext<{
  index: number;
  opened: boolean;
  choose: (index: number, opened: boolean) => void;
}>({ index: 0, opened: false, choose: () => {} });
const Attribution = createContext<SalesAttribution>({});
function emit(
  name: SalesEventName,
  offerId: string | undefined,
  surface: string,
  attr: SalesAttribution,
) {
  window.dispatchEvent(
    new CustomEvent("espelhomeu:sales", {
      detail: createSalesEvent(
        name,
        { offerId, productId: offerId, surface },
        attr,
      ),
    }),
  );
}
export function SalesSession({
  children,
  attribution,
  offerId,
  surface,
}: {
  children: React.ReactNode;
  attribution: SalesAttribution;
  offerId?: string;
  surface: string;
}) {
  const [sample, setSample] = useState({ index: 0, opened: false });
  const encoded = JSON.stringify(attribution);
  useEffect(() => {
    emit(
      "sales_page_view",
      offerId,
      surface,
      readAttribution(JSON.parse(encoded)),
    );
    document
      .querySelector(".sales-root")
      ?.setAttribute("data-sales-ready", "true");
  }, [encoded, offerId, surface]);
  return (
    <Attribution.Provider value={attribution}>
      <SampleChoice.Provider
        value={{
          ...sample,
          choose: (index, opened) => setSample({ index, opened }),
        }}
      >
        <div className="sales-root">{children}</div>
      </SampleChoice.Provider>
    </Attribution.Provider>
  );
}
export function SalesLink({
  href,
  children,
  className,
  event,
  offerId,
  surface = "offer",
  onClick,
  ...rest
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  event?: SalesEventName;
  offerId?: string;
  surface?: string;
  id?: string;
  "aria-label"?: string;
  onClick?: () => void;
}) {
  const attr = useContext(Attribution);
  return (
    <Link
      {...rest}
      href={withAttribution(href, attr)}
      className={className}
      onClick={() => {
        onClick?.();
        if (event) emit(event, offerId, surface, attr);
      }}
    >
      {children}
    </Link>
  );
}
const questions = [
  {
    title: "O que faria sentido agora?",
    options: [
      "Uma pequena pausa",
      "Uma pergunta para refletir",
      "Um começo sem pressa",
    ],
  },
  {
    title: "Como você gosta de começar?",
    options: [
      "Com uma leitura breve",
      "Com uma experiência simples",
      "Com espaço para escrever",
    ],
  },
  {
    title: "Que ritmo cabe hoje?",
    options: [
      "Um encontro de cada vez",
      "Quando surgir vontade",
      "Quero apenas experimentar",
    ],
  },
];
export function PathQuiz({
  offerId = "p01",
  samplePath,
}: {
  offerId?: string;
  samplePath: string;
}) {
  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState<number[]>([]);
  const sample = useContext(SampleChoice);
  const approach = answers[1] ?? 0;
  const recommendations = [
    {
      title: "Comece pela leitura.",
      text: "Abra um trecho do Dia 1 — Escutar. Leia antes de decidir se quer fazer uma atividade.",
      cta: "Ler um trecho do Dia 1",
    },
    {
      title: "Comece por uma reflexão.",
      text: "Abra um trecho do Dia 2 — Reconhecer. Leve uma pergunta consigo, sem obrigação de responder.",
      cta: "Explorar o Dia 2",
    },
    {
      title: "Comece com espaço para escrever.",
      text: "Conheça os Cartões e o Mapa do Que É Meu. Você pode usar um caderno seu; nada será recolhido aqui.",
      cta: "Conhecer o Mapa do Que É Meu",
    },
  ];
  const recommendation = recommendations[approach];
  const attr = useContext(Attribution);
  return (
    <div className="sales-interaction" id="por-onde-comeco">
      <p className="sales-kicker">Um convite, não um teste</p>
      <h2>Por onde começo?</h2>
      <p>
        Três perguntas simples para experimentar o primeiro volume. Sem perfil,
        diagnóstico ou pontuação.
      </p>
      {step === -1 ? (
        <button
          className="sales-button"
          data-testid="quiz-start"
          onClick={() => {
            setStep(0);
            emit("quiz_start", offerId, "quiz", attr);
          }}
        >
          Encontrar meu primeiro passo <span>↗</span>
        </button>
      ) : step < 3 ? (
        <fieldset key={step} className="quiz-options">
          <legend>
            <small>{step + 1} / 3</small>
            {questions[step].title}
          </legend>
          {questions[step].options.map((option, choice) => (
            <button
              key={option}
              data-testid="quiz-option"
              onClick={() => {
                setAnswers((previous) => [...previous, choice]);
                setStep(step + 1);
                if (step === 2) emit("quiz_complete", offerId, "quiz", attr);
              }}
            >
              {option} <span>→</span>
            </button>
          ))}
        </fieldset>
      ) : (
        <div data-testid="quiz-result" role="status">
          <h3>{recommendation.title}</h3>
          <p>
            {
              [
                "Você escolheu uma pequena pausa.",
                "Você escolheu uma pergunta para refletir.",
                "Você escolheu um começo sem pressa.",
              ][answers[0]]
            }
          </p>
          <p>{recommendation.text}</p>
          <p>
            {
              [
                "Experimente um encontro de cada vez; o próximo pode esperar.",
                "Volte quando surgir vontade, sem calendário obrigatório.",
                "Fique apenas com a amostra hoje; não há compromisso de continuar.",
              ][answers[2]]
            }
          </p>
          <small>
            Esta é uma sugestão editorial baseada no que você selecionou, não
            uma avaliação.
          </small>
          <SalesLink
            href={samplePath}
            onClick={() => sample.choose(approach, true)}
            className="sales-button"
            event="sample_open"
            offerId={offerId}
            surface="quiz"
          >
            {recommendation.cta} →
          </SalesLink>
          <button
            className="sales-text-button"
            onClick={() => {
              setStep(-1);
              setAnswers([]);
              sample.choose(0, false);
            }}
          >
            Recomeçar
          </button>
        </div>
      )}
      <small>As escolhas não são guardadas nem enviadas.</small>
    </div>
  );
}
export function IntentSelector({
  kind,
  offerId,
  samplePath,
  options,
}: {
  kind: "expression" | "intention";
  offerId: string;
  samplePath: string;
  options: {
    label: string;
    context: string;
    chapterId: string;
    title: string;
  }[];
}) {
  const [selection, setSelection] = useState<number | null>(null);
  const sample = useContext(SampleChoice);
  const attr = useContext(Attribution);
  return (
    <div className="sales-interaction">
      <p className="sales-kicker">Escolha uma intenção</p>
      <h2>
        {kind === "expression"
          ? "O que você quer expressar mais?"
          : "Que capítulo gostaria de abrir agora?"}
      </h2>
      <div className="sales-pills">
        {options.map((o, index) => (
          <button
            aria-pressed={selection === index}
            data-testid="intent-option"
            key={o.label}
            onClick={() => {
              if (selection === null) emit("quiz_start", offerId, "quiz", attr);
              setSelection(index);
              sample.choose(index, true);
              emit("quiz_complete", offerId, "quiz", attr);
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
      {selection !== null && (
        <div role="status" data-testid="intent-result">
          <p>
            <strong>{options[selection].label}.</strong>{" "}
            {options[selection].context}
          </p>
          <p>{options[selection].title}</p>
          <SalesLink
            href={samplePath}
            className="sales-link"
            offerId={offerId}
            event="sample_open"
          >
            Ler este trecho →
          </SalesLink>
        </div>
      )}
      <small>
        Sem avaliação ou perfil. Sua escolha fica apenas nesta página.
      </small>
    </div>
  );
}
export function InsidePreview({
  samples,
  offerId,
  draw = false,
}: {
  samples: { title: string; body: BodySource }[];
  offerId: string;
  draw?: boolean;
}) {
  const { opened, index, choose } = useContext(SampleChoice);
  const attr = useContext(Attribution);
  return (
    <section
      className={`sales-sample ${draw ? "sales-journal" : ""}`}
      id="amostra"
    >
      <div>
        <p className="sales-kicker">Uma amostra real · sem cadastro</p>
        <h2>{draw ? "Abra um encontro." : "A leitura começa aqui."}</h2>
        <p>
          {draw
            ? "Você não precisa começar na primeira página. Experimente um dos três encontros selecionados."
            : "Um trecho da publicação, exatamente como está no conteúdo editorial."}
        </p>
        {!opened && (
          <button
            data-testid="sample-open"
            className="sales-button"
            onClick={() => {
              choose(index, true);
              emit("sample_open", offerId, "sample", attr);
            }}
          >
            {draw ? "Abrir um encontro" : "Ler uma amostra"} <span>↗</span>
          </button>
        )}
      </div>
      {opened ? (
        <article
          className="sales-sample-paper"
          data-testid="sample-body"
          aria-live="polite"
        >
          <p className="sales-kicker">Trecho selecionado</p>
          <h3>{samples[index].title}</h3>
          <ReaderBody body={samples[index].body} />
          {draw && (
            <button
              className="sales-text-button"
              data-testid="sample-next"
              onClick={() => {
                choose((index + 1) % samples.length, true);
                emit("sample_open", offerId, "sample", attr);
              }}
            >
              Abrir outro encontro ↗
            </button>
          )}
          <small>
            Este é um trecho, não o capítulo completo. Seus registros pessoais
            não são recolhidos aqui.
          </small>
        </article>
      ) : (
        <div className="sales-closed-page" aria-hidden="true">
          <span>{draw ? "01 / 30" : "Uma pausa"}</span>
          <i>
            {draw ? "Uma página.\nUma possibilidade." : "Hoje,\neu me escolho."}
          </i>
          <span>ESPELHOMEU · LEITURAS PARA VOCÊ</span>
        </div>
      )}
    </section>
  );
}
export function AccessDemo() {
  const [state, setState] = useState<SalesAccessState>("PREVIEW");
  const info = getAccessPresentation(state);
  return (
    <section className="sales-interaction">
      <h1>Estados de acesso · demonstração</h1>
      <p>
        Exclusivo do Preview. Esta demonstração não autentica, compra ou concede
        acesso.
      </p>
      <label>
        Estado de acesso{" "}
        <select
          aria-label="Estado de acesso"
          value={state}
          onChange={(e) => setState(e.target.value as SalesAccessState)}
        >
          {Object.keys(accessStateLabels).map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <article>
        <h2 data-testid="access-demo-label">{info.label}</h2>
        <p>{info.description}</p>
        {state === "LOCKED" ? (
          <SalesLink href="/7-dias-para-me-escolher" className="sales-button">
            Conhecer a oferta
          </SalesLink>
        ) : (
          <SalesLink
            href={
              state === "ACQUIRED"
                ? "/biblioteca"
                : state === "PUBLIC"
                  ? "/inicio"
                  : "/7-dias-para-me-escolher#amostra"
            }
            className="sales-button"
          >
            {state === "ACQUIRED"
              ? "Continuar na Biblioteca"
              : state === "PUBLIC"
                ? "Abrir leitura livre"
                : "Ver amostra"}
          </SalesLink>
        )}
      </article>
    </section>
  );
}
