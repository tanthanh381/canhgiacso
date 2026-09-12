import type { NewsArticle } from "./data";

export type RichNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: RichNode[];
};
export const emptyDocument: RichNode = {
  type: "doc",
  content: [{ type: "paragraph" }],
};
export function newsSlug(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100)
    .replace(/-$/g, "");
}
export function safeLink(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 1000) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}
export function safeImage(value: unknown): value is string {
  return (
    safeLink(value) ||
    (typeof value === "string" &&
      value.length <= 130000 &&
      /^data:image\/(webp|png|jpe?g);base64,[A-Za-z0-9+/]+=*$/.test(value))
  );
}
export function richText(node?: RichNode): string {
  return node
    ? (node.text ?? "") + (node.content?.map(richText).join(" ") ?? "")
    : "";
}
export function validDocument(value: unknown): value is RichNode {
  let count = 0;
  function check(node: unknown, depth: number): boolean {
    if (!node || typeof node !== "object" || depth > 16 || ++count > 12000)
      return false;
    const n = node as RichNode;
    if (
      ![
        "doc",
        "paragraph",
        "heading",
        "text",
        "bulletList",
        "orderedList",
        "listItem",
        "blockquote",
        "hardBreak",
        "image",
        "horizontalRule",
      ].includes(n.type)
    )
      return false;
    if (
      n.text !== undefined &&
      (typeof n.text !== "string" || n.text.length > 80000)
    )
      return false;
    if (
      n.type === "image" &&
      (!safeImage(n.attrs?.src) ||
        (n.attrs?.alt !== undefined &&
          (typeof n.attrs.alt !== "string" || n.attrs.alt.length > 240)))
    )
      return false;
    if (n.type === "image" && n.attrs?.caption !== undefined &&
      (typeof n.attrs.caption !== "string" || n.attrs.caption.length > 500)) return false;
    if (n.type === "heading" && ![2, 3].includes(Number(n.attrs?.level)))
      return false;
    if (
      n.marks &&
      (!Array.isArray(n.marks) ||
        !n.marks.every(
          (mark) =>
            mark &&
            ["bold", "italic", "strike", "underline", "link"].includes(
              mark.type,
            ) &&
            (mark.type !== "link" || safeLink(mark.attrs?.href)),
        ))
    )
      return false;
    return (
      n.content === undefined ||
      (Array.isArray(n.content) &&
        n.content.every((child) => check(child, depth + 1)))
    );
  }
  return (
    check(value, 0) &&
    (value as RichNode).type === "doc" &&
    JSON.stringify(value).length <= 600000
  );
}
export function newsErrors(
  article: NewsArticle,
  articles: NewsArticle[],
  publishing = false,
): string[] {
  const errors: string[] = [];
  if (!article.title.trim() || article.title.length > 240)
    errors.push("Nhập tiêu đề (tối đa 240 ký tự).");
  if (
    article.slug !== undefined &&
    (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug) ||
      article.slug.length > 100)
  )
    errors.push("Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang.");
  if (
    articles.some(
      (other) =>
        other.id !== article.id &&
        (other.slug || other.id) === (article.slug || article.id),
    )
  )
    errors.push("Slug đã được một bài khác sử dụng.");
  if (
    article.status !== undefined &&
    !["draft", "published"].includes(article.status)
  )
    errors.push("Trạng thái không hợp lệ.");
  if (
    article.summary.length > 1500 ||
    ((publishing || article.status !== "draft") && !article.summary.trim())
  )
    errors.push("Nhập mô tả ngắn (tối đa 1.500 ký tự).");
  if (!article.category.trim() || article.category.length > 80)
    errors.push("Nhập chủ đề (tối đa 80 ký tự).");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(article.publishedAt) ||
    !Number.isFinite(Date.parse(article.publishedAt)) ||
    new Date(article.publishedAt).toISOString().slice(0, 10) !==
      article.publishedAt
  )
    errors.push("Ngày xuất bản không hợp lệ.");
  if (article.publishedTime !== undefined && article.publishedTime !== "" &&
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(article.publishedTime))
    errors.push("Giờ xuất bản không hợp lệ (HH:mm).");
  if (article.thumbnailCaption !== undefined &&
    (typeof article.thumbnailCaption !== "string" || article.thumbnailCaption.length > 500))
    errors.push("Chú thích ảnh tối đa 500 ký tự.");
  if (
    (article.sourceUrl && !safeLink(article.sourceUrl)) ||
    article.sourceName.length > 120 ||
    !!article.sourceUrl !== !!article.sourceName.trim()
  )
    errors.push("Điền cả tên nguồn và URL nguồn HTTPS, hoặc để trống cả hai.");
  if (article.thumbnail && !safeImage(article.thumbnail))
    errors.push("Ảnh đại diện không hợp lệ hoặc quá lớn.");
  if (article.thumbnail && !article.thumbnailAlt?.trim())
    errors.push("Nhập văn bản thay thế cho ảnh đại diện.");
  if ((article.thumbnailAlt?.length ?? 0) > 240)
    errors.push("Alt text tối đa 240 ký tự.");
  if (article.body !== undefined && !validDocument(article.body))
    errors.push("Nội dung bài có định dạng hoặc hình ảnh không hợp lệ.");
  if (
    publishing &&
    article.body !== undefined &&
    validDocument(article.body) &&
    !richText(article.body).trim()
  )
    errors.push("Nhập nội dung bài viết trước khi xuất bản.");
  if (
    (article.seoTitle?.length ?? 0) > 70 ||
    (article.metaDescription?.length ?? 0) > 180
  )
    errors.push(
      "SEO title tối đa 70 ký tự, meta description tối đa 180 ký tự.",
    );
  return errors;
}
export function publicNews(articles: NewsArticle[]): NewsArticle[] {
  return articles.filter((article) => article.status !== "draft");
}
