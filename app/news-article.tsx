import { createElement, type ReactNode, type CSSProperties } from "react";
import type { NewsArticle } from "./data";
import { type RichNode, safeImage, safeLink } from "./news-content";

function renderNode(node: RichNode, key: number): ReactNode {
  if (node.type === "text") {
    let result: ReactNode = node.text;
    for (const mark of node.marks ?? []) {
      if (mark.type === "link" && safeLink(mark.attrs?.href))
        result = (
          <a href={mark.attrs.href} target="_blank" rel="noopener noreferrer">
            {result}
          </a>
        );
      else if (["bold", "italic", "strike", "underline"].includes(mark.type))
        result = createElement(
          { bold: "strong", italic: "em", strike: "s", underline: "u" }[
            mark.type
          ]!,
          null,
          result,
        );
    }
    return <span key={key}>{result}</span>;
  }
  if (node.type === "image")
    return safeImage(node.attrs?.src) ? (
      <figure key={key}><img
        src={node.attrs.src}
        alt={String(node.attrs?.alt ?? "")}
        loading="lazy"
      />{typeof node.attrs?.caption === "string" && node.attrs.caption && <figcaption>{node.attrs.caption}</figcaption>}</figure>
    ) : null;
  const tag = (
    {
      doc: "div",
      paragraph: "p",
      heading: Number(node.attrs?.level) === 3 ? "h3" : "h2",
      bulletList: "ul",
      orderedList: "ol",
      listItem: "li",
      blockquote: "blockquote",
      hardBreak: "br",
      horizontalRule: "hr",
    } as Record<string, string>
  )[node.type];
  if (!tag) return null;
  const align = String(node.attrs?.textAlign ?? "left");
  return createElement(
    tag,
    {
      key,
      style: {
        textAlign: ["left", "center", "right"].includes(align) ? align : "left",
      } as CSSProperties,
    },
    ["br", "hr"].includes(tag) ? undefined : node.content?.map(renderNode),
  );
}
export function NewsArticleView({ article }: { article: NewsArticle }) {
  return (
    <article className="news-reading">
      <div className="news-meta">
        <span>{article.category}</span>
        <time dateTime={article.publishedTime ? `${article.publishedAt}T${article.publishedTime}:00+07:00` : article.publishedAt}>{article.publishedAt}{article.publishedTime ? ` · ${article.publishedTime} (GMT+7)` : ""}</time>
      </div>
      <h1>{article.title}</h1>
      <p className="news-lead">{article.summary}</p>
      {article.thumbnail && safeImage(article.thumbnail) && (
        <figure><img
          className="news-cover"
          src={article.thumbnail}
          alt={article.thumbnailAlt || ""}
        />{article.thumbnailCaption && <figcaption>{article.thumbnailCaption}</figcaption>}</figure>
      )}
      {article.body && (
        <div className="news-rich">{renderNode(article.body, 0)}</div>
      )}
      {safeLink(article.sourceUrl) && (
        <p>
          Nguồn:{" "}
          <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer">
            {article.sourceName}
          </a>
        </p>
      )}
    </article>
  );
}
