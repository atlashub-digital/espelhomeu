import Image from "next/image";
import type { BodySource, MediaAsset } from "@atlashub-digital/amf-content-schema";
export function ReaderBody({ body }: { body?: BodySource }) {
  if (!body) return null;
  if (body.format === "markdown-inline")
    return (
      <div className="reader-prose">
        {body.markdown.split(/\n\s*\n/).map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
    );
  if (body.format !== "blocks")
    return <p>Este formato ainda não está disponível nesta experiência.</p>;
  return (
    <div className="reader-prose">
      {body.blocks.map((block, i) => {
        if (block.type === "paragraph" && typeof block.text === "string")
          return <p key={i}>{block.text}</p>;
        if (block.type === "heading" && typeof block.text === "string")
          return <h3 key={i}>{block.text}</h3>;
        if (block.type === "callout" && typeof block.text === "string")
          return (
            <aside className="reader-callout" key={i}>
              {typeof block.title === "string" && <h3>{block.title}</h3>}
              <p>{block.text}</p>
            </aside>
          );
        return <p key={i}>Bloco de conteúdo não suportado.</p>;
      })}
    </div>
  );
}
// Safe project-owned rendering. Never evaluate HTML or arbitrary iframe content.
export function ReaderMedia({ media }: { media: MediaAsset }) {
  const local = media.assetPath && /^\/(?:marca|conteudo\/[a-z0-9-]+)\/[a-zA-Z0-9/_.-]+$/.test(media.assetPath) && !media.assetPath.includes("..") ? media.assetPath : null;
  if (media.kind === "image" && local)
    return (
      <figure className="reader-media">
        <Image unoptimized={/\/cartao_reflexao_\d+\.png$/i.test(local)} src={local} width={typeof media.metadata?.width === "number" ? media.metadata.width : 300} height={typeof media.metadata?.height === "number" ? media.metadata.height : 300} sizes="(max-width: 800px) 88vw, 700px" alt={media.alt ?? ""} />
        <figcaption>
          {media.caption}
          {media.attributionRequired && media.attribution}
        </figcaption>
      </figure>
    );
  if (media.kind === "document" && local)
    return (
      <p className="reader-media">
        <a className="text-link" href={local} download>{media.title ?? "Descarregar documento"}</a>
      </p>
    );
  const url = media.kind === "embed" ? media.embedUrl : media.assetUrl;
  if (url && url.startsWith("https://"))
    return (
      <figure className="reader-media">
        <a href={url} rel="noopener noreferrer" target="_blank">
          {media.title ?? "Abrir mídia"} ↗
        </a>
        {media.caption && <figcaption>{media.caption}</figcaption>}
      </figure>
    );
  return null;
}
