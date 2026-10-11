"use client";
import Link from "next/link";
import { useMemo, useState, useRef } from "react";
import type { Publication } from "@atlashub/amf-content-schema";
import {
  createReaderModel,
  readerProgressPercentage,
} from "@atlashub/amf-experience-core";
import { createSessionProgressAdapter } from "@/lib/reader-progress";
import { ReaderBody, ReaderMedia } from "./reader-body";

export function WebReader({ publication }: { publication: Publication }) {
  const model = useMemo(() => createReaderModel(publication), [publication]);
  const adapter = useMemo(() => createSessionProgressAdapter(), []);
  const [index, setIndex] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const chapter = model.chapters[index];
  const progress = readerProgressPercentage(completed, model.chapters);
  async function navigate(next: number, markComplete = false) {
    const ids =
      markComplete && chapter
        ? [...new Set([...completed, chapter.id])]
        : completed;
    setCompleted(ids);
    setIndex(next);
    await adapter.save({
      publicationId: publication.id,
      chapterId: model.chapters[next]?.id,
      completedChapterIds: ids,
      percentage: readerProgressPercentage(ids, model.chapters),
      updatedAt: new Date().toISOString(),
    });
    heading.current?.focus();
  }
  async function resume() {
    const saved = await adapter.load(publication.id);
    if (!saved) {
      setMessage(
        "Comece pelo primeiro capítulo. O progresso é mantido apenas enquanto esta página está aberta.",
      );
      return;
    }
    const next = model.chapters.findIndex((c) => c.id === saved.chapterId);
    setIndex(next < 0 ? 0 : next);
    setCompleted(saved.completedChapterIds);
    heading.current?.focus();
  }
  const placements = chapter?.mediaPlacements ?? [];
  const mediaAt = (position: "before" | "after" | "inline") =>
    placements
      .filter((p) => p.position === position)
      .map((p) => {
        const media = model.mediaById.get(p.mediaId);
        return media ? <ReaderMedia key={p.id} media={media} /> : null;
      });
  return (
    <>
      <div className="reader-topline">
        <Link href="/biblioteca">← Biblioteca</Link>
        <span>{publication.edition}</span>
      </div>
      <header className="reader-header">
        <p className="eyebrow">
          {publication.type === "guide" ? "Guia" : "Leitura"} ·{" "}
          {publication.readingMinutes} min · {publication.locale}
        </p>
        <h1>{publication.title}</h1>
        <p>{publication.subtitle}</p>
        <span>{publication.authors.join(" · ")}</span>
      </header>
      <div className="reader-layout">
        <aside className="reader-sidebar">
          <details open>
            <summary>Índice da leitura</summary>
            <ol>
              {model.chapters.map((c, i) => (
                <li key={c.id}>
                  <button
                    onClick={() => navigate(i)}
                    aria-current={index === i ? "step" : undefined}
                  >
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    {c.title}
                    {completed.includes(c.id) && (
                      <span aria-label="Concluído"> ✓</span>
                    )}
                  </button>
                </li>
              ))}
            </ol>
          </details>
          <label className="progress-label" htmlFor="reading-progress">
            Minha leitura · {progress}%
          </label>
          <progress id="reading-progress" value={progress} max={100} />
          <button className="text-link" onClick={resume}>
            Continuar leitura →
          </button>
          <p className="fixture-note">
            O progresso dura apenas enquanto esta página está aberta. Não
            guardamos dados pessoais.
          </p>
          <p className="fixture-note" role="status">
            {message}
          </p>
        </aside>
        <article className="reader-content">
          <p className="eyebrow">
            {chapter
              ? `Capítulo ${index + 1} / ${model.chapters.length}`
              : "Leitura"}
          </p>
          <h2 tabIndex={-1} ref={heading}>
            {chapter?.title ?? publication.title}
          </h2>
          {mediaAt("before")}
          <ReaderBody body={chapter?.body ?? publication.body} />
          {mediaAt("inline")}
          {mediaAt("after")}
          <div className="reader-navigation">
            {index > 0 ? (
              <button className="text-link" onClick={() => navigate(index - 1)}>
                ← Anterior
              </button>
            ) : (
              <span />
            )}
            {index < model.chapters.length - 1 ? (
              <button
                className="button"
                onClick={() => navigate(index + 1, true)}
              >
                Concluir e continuar →
              </button>
            ) : (
              <button className="button" onClick={() => navigate(index, true)}>
                Concluir leitura ✓
              </button>
            )}
          </div>
          {progress === 100 && (
            <p role="status" className="reader-callout">
              Leitura concluída. Leve consigo o que fizer sentido hoje.
            </p>
          )}
        </article>
      </div>
    </>
  );
}
