"use client";
import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import type { NewsArticle } from "./data";
import {
  emptyDocument,
  newsErrors,
  newsSlug,
  richText,
  safeImage,
  safeLink,
} from "./news-content";
import { NewsArticleView } from "./news-article";

const CaptionImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      caption: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-caption") || "",
        renderHTML: (attributes) => ({ "data-caption": attributes.caption }),
      },
    };
  },
});

const supportedImageTypes = ["image/jpeg", "image/png", "image/webp"];
const maxImageDataLength = 130000;

async function compressImage(file: File): Promise<string> {
  if (!supportedImageTypes.includes(file.type) || file.size > 8 * 1024 * 1024)
    throw new Error("Chọn hoặc dán ảnh JPG, PNG, WebP tối đa 8 MB.");

  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    const initialScale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
    let width = Math.max(1, Math.round(bitmap.width * initialScale));
    let height = Math.max(1, Math.round(bitmap.height * initialScale));

    for (let attempt = 0; attempt < 8; attempt++) {
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
      for (const quality of [0.82, 0.68, 0.52, 0.4]) {
        const data = canvas.toDataURL("image/webp", quality);
        if (data.length <= maxImageDataLength) return data;
      }
      width = Math.max(320, Math.round(width * 0.8));
      height = Math.max(180, Math.round(height * 0.8));
    }
  } finally {
    bitmap.close();
  }

  throw new Error(
    "Ảnh còn quá lớn sau nén. Chọn ảnh nhỏ hơn hoặc dùng URL HTTPS.",
  );
}

function ImagePicker({
  images,
  initial,
  onUse,
}: {
  images: string[];
  initial?: { src: string; alt: string; caption?: string };
  onUse: (src: string, alt: string, caption: string) => void;
}) {
  const [src, setSrc] = useState(initial?.src ?? "");
  const [alt, setAlt] = useState(initial?.alt ?? "");
  const [caption, setCaption] = useState(initial?.caption ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const version = useRef(0);
  useEffect(
    () => () => {
      version.current++;
    },
    [],
  );
  async function upload(file?: File) {
    if (!file) return;
    const current = ++version.current;
    setError("");
    if (
      !supportedImageTypes.includes(file.type) ||
      file.size > 8 * 1024 * 1024
    ) {
      setError("Chọn JPG, PNG hoặc WebP tối đa 8 MB.");
      return;
    }
    setBusy(true);
    try {
      const data = await compressImage(file);
      if (version.current === current) setSrc(data);
    } catch (cause) {
      if (version.current === current)
        setError(
          cause instanceof Error ? cause.message : "Không đọc được ảnh.",
        );
    } finally {
      if (version.current === current) setBusy(false);
    }
  }
  return (
    <div className="news-image-picker">
      <label>
        Tải ảnh từ máy
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(e) => {
            void upload(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      <small>
        JPG, PNG, WebP ≤ 8 MB. Ảnh được nén; toàn bộ kho nội dung tối đa 1 MB.
      </small>
      <label>
        Hoặc URL ảnh HTTPS
        <input
          type="url"
          value={src.startsWith("data:") ? "" : src}
          placeholder="https://…"
          onChange={(e) => {
            version.current++;
            setBusy(false);
            setSrc(e.target.value);
          }}
        />
      </label>
      {images.length > 0 && (
        <details>
          <summary>Chọn ảnh đã dùng ({images.length})</summary>
          <div className="news-media-grid">
            {images.map((url, index) => (
              <button
                type="button"
                key={index}
                onClick={() => {
                  version.current++;
                  setBusy(false);
                  setSrc(url);
                }}
                aria-label={`Chọn ảnh ${index + 1}`}
              >
                <img src={url} alt={`Ảnh trong thư viện ${index + 1}`} />
              </button>
            ))}
          </div>
        </details>
      )}
      {safeImage(src) && (
        <img
          className="news-image-preview"
          src={src}
          alt={alt || "Xem trước ảnh đang chọn"}
        />
      )}
      <label>
        Văn bản thay thế (alt text) *
        <input
          value={alt}
          maxLength={240}
          onChange={(e) => setAlt(e.target.value)}
          placeholder="Mô tả nội dung ảnh cho người không nhìn thấy ảnh"
        />
      </label>
      <label>Chú thích ảnh<input value={caption} maxLength={500} onChange={(e) => setCaption(e.target.value)} placeholder="Chú thích hiển thị dưới ảnh (không bắt buộc)" /></label>
      {error && <p role="alert">{error}</p>}
      <button
        type="button"
        className="admin-secondary"
        disabled={busy || !safeImage(src) || !alt.trim()}
        onClick={() => onUse(src, alt.trim(), caption.trim())}
      >
        {busy ? "Đang xử lý ảnh…" : "Sử dụng ảnh"}
      </button>
    </div>
  );
}

function ArticleEditor({
  article,
  articles,
  onChange,
  canPublish,
  disabled,
}: {
  article: NewsArticle;
  articles: NewsArticle[];
  onChange: (patch: Partial<NewsArticle>) => void;
  canPublish: boolean;
  disabled?: boolean;
}) {
  const [imageTarget, setImageTarget] = useState<"cover" | "body" | null>(null);
  const [autoSlug, setAutoSlug] = useState(article.slug === article.id && article.status === "draft");
  const [showLink, setShowLink] = useState(false);
  const [link, setLink] = useState("");
  const [pasteError, setPasteError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        code: false,
        link: {
          openOnClick: false,
          protocols: ["https"],
          isAllowedUri: safeLink,
        },
      }),
      CaptionImage.configure({ allowBase64: true }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right"],
      }),
    ],
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    content: article.body ?? emptyDocument,
    editorProps: {
      attributes: {
        "aria-label": "Nội dung bài viết",
        role: "textbox",
        "aria-multiline": "true",
      },
      handlePaste: (view, event) => {
        const image = Array.from(event.clipboardData?.files ?? []).find((file) =>
          supportedImageTypes.includes(file.type),
        );
        if (!image) return false;
        setPasteError("");
        void compressImage(image)
          .then((src) => {
            if (view.isDestroyed) return;
            const node = view.state.schema.nodes.image.create({
              src,
              alt: "Ảnh chụp màn hình",
              caption: "",
            });
            view.dispatch(
              view.state.tr.replaceSelectionWith(node).scrollIntoView(),
            );
          })
          .catch((cause) =>
            setPasteError(
              cause instanceof Error ? cause.message : "Không đọc được ảnh đã dán.",
            ),
          );
        return true;
      },
    },
    onUpdate: ({ editor: current }) => onChange({ body: current.getJSON() }),
  });
  useEffect(() => {
    if (
      editor &&
      JSON.stringify(editor.getJSON()) !==
        JSON.stringify(article.body ?? emptyDocument)
    )
      editor.commands.setContent(article.body ?? emptyDocument, {
        emitUpdate: false,
      });
  }, [article.body, editor]);
  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);
  const errors = newsErrors(
    article,
    articles,
    article.status === "published" && !!article.body,
  );
  const images = [
    ...new Set(
      articles.flatMap((item) => {
        const urls = item.thumbnail ? [item.thumbnail] : [];
        function collect(node: typeof item.body) {
          if (node?.type === "image" && safeImage(node.attrs?.src))
            urls.push(node.attrs.src);
          node?.content?.forEach(collect);
        }
        collect(item.body);
        return urls;
      }),
    ),
  ].filter(safeImage);
  const selectedImage = editor?.isActive("image")
    ? editor.getAttributes("image")
    : null;
  return (
    <div className="news-compose">
      <div className="news-compose-main">
        <label>
          Tiêu đề *
          <input
            className="news-title-input"
            value={article.title}
            maxLength={240}
            onChange={(e) =>
              onChange({
                title: e.target.value,
                ...(autoSlug
                  ? { slug: newsSlug(e.target.value) }
                  : {}),
              })
            }
          />
        </label>
        <label>
          Mô tả ngắn *
          <textarea
            rows={3}
            value={article.summary}
            maxLength={1500}
            onChange={(e) => onChange({ summary: e.target.value })}
          />
        </label>
        <div className="news-editor-label">
          <strong>Nội dung bài viết</strong>
          <small>
            {richText(article.body).trim().split(/\s+/).filter(Boolean).length}{" "}
            từ
          </small>
        </div>
        <div
          className="news-toolbar"
          role="toolbar"
          aria-label="Định dạng bài viết"
        >
          <select
            aria-label="Kiểu đoạn văn"
            value={
              editor?.isActive("heading", { level: 2 })
                ? "2"
                : editor?.isActive("heading", { level: 3 })
                  ? "3"
                  : "p"
            }
            onChange={(e) =>
              e.target.value === "p"
                ? editor?.chain().focus().setParagraph().run()
                : editor
                    ?.chain()
                    .focus()
                    .setHeading({ level: Number(e.target.value) as 2 | 3 })
                    .run()
            }
          >
            <option value="p">Đoạn văn</option>
            <option value="2">Heading 2</option>
            <option value="3">Heading 3</option>
          </select>
          {[
            {
              label: "Đậm",
              active: "bold",
              run: () => editor?.chain().focus().toggleBold().run(),
            },
            {
              label: "Nghiêng",
              active: "italic",
              run: () => editor?.chain().focus().toggleItalic().run(),
            },
            {
              label: "• Danh sách",
              active: "bulletList",
              run: () => editor?.chain().focus().toggleBulletList().run(),
            },
            {
              label: "1. Danh sách",
              active: "orderedList",
              run: () => editor?.chain().focus().toggleOrderedList().run(),
            },
            {
              label: "Trích dẫn",
              active: "blockquote",
              run: () => editor?.chain().focus().toggleBlockquote().run(),
            },
          ].map((item) => (
            <button
              type="button"
              key={item.active}
              aria-pressed={editor?.isActive(item.active) ?? false}
              onClick={item.run}
            >
              {item.label}
            </button>
          ))}
          {(["left", "center", "right"] as const).map((align, i) => (
            <button
              type="button"
              key={align}
              aria-pressed={editor?.isActive({ textAlign: align }) ?? false}
              onClick={() => editor?.chain().focus().setTextAlign(align).run()}
            >
              {["Căn trái", "Căn giữa", "Căn phải"][i]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setLink(editor?.getAttributes("link").href ?? "");
              setShowLink(!showLink);
            }}
          >
            Liên kết
          </button>
          <button
            type="button"
            onClick={() =>
              setImageTarget(imageTarget === "body" ? null : "body")
            }
          >
            {selectedImage ? "Sửa ảnh" : "Chèn ảnh"}
          </button>
          <button
            type="button"
            disabled={!editor?.can().undo()}
            onClick={() => editor?.chain().focus().undo().run()}
          >
            Hoàn tác
          </button>
          <button
            type="button"
            disabled={!editor?.can().redo()}
            onClick={() => editor?.chain().focus().redo().run()}
          >
            Làm lại
          </button>
        </div>
        {showLink && (
          <div className="news-inline-controls">
            <label>
              Liên kết HTTPS
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />
            </label>
            <button
              type="button"
              disabled={!safeLink(link)}
              onClick={() => {
                editor
                  ?.chain()
                  .focus()
                  .extendMarkRange("link")
                  .setLink({ href: link })
                  .run();
                setShowLink(false);
              }}
            >
              Áp dụng
            </button>
            <button
              type="button"
              onClick={() => {
                editor?.chain().focus().unsetLink().run();
                setShowLink(false);
              }}
            >
              Gỡ liên kết
            </button>
          </div>
        )}
        {imageTarget === "body" && (
          <ImagePicker
            key="body"
            images={images}
            initial={
              selectedImage
                ? { src: selectedImage.src, alt: selectedImage.alt, caption: selectedImage.caption }
                : undefined
            }
            onUse={(src, alt, caption) => {
              if (selectedImage)
                editor
                  ?.chain()
                  .focus()
                  .updateAttributes("image", { src, alt, caption })
                  .run();
              else editor?.chain().focus().insertContent({ type: "image", attrs: { src, alt, caption } }).run();
              setImageTarget(null);
            }}
          />
        )}
        <EditorContent
          editor={editor}
          className="news-rich news-editor-surface"
        />
        {pasteError && <p role="alert">{pasteError}</p>}
        <small>
          Có thể dán trực tiếp ảnh chụp màn hình; ảnh sẽ được tự động nén. Chọn
          ảnh trong bài để sửa alt text hoặc nhấn Delete để xóa.
        </small>
        <details className="news-source-settings">
          <summary>Nguồn tham khảo</summary>
          <label>
            Tên nguồn
            <input
              value={article.sourceName}
              maxLength={120}
              onChange={(e) => onChange({ sourceName: e.target.value })}
            />
          </label>
          <label>
            URL nguồn (HTTPS)
            <input
              type="url"
              value={article.sourceUrl}
              onChange={(e) => onChange({ sourceUrl: e.target.value })}
            />
          </label>
        </details>
      </div>
      <aside className="news-compose-side">
        <section>
          <h3>Xuất bản</h3>
          <label>
            Trạng thái
            <select
              value={article.status ?? "published"}
              disabled={!canPublish}
              onChange={(e) =>
                onChange({ status: e.target.value as "draft" | "published" })
              }
            >
              <option value="draft">Draft · Bản nháp</option>
              <option value="published">
                Published · Đưa vào bản xuất bản
              </option>
            </select>
          </label>
          <small>
            Chọn Published rồi bấm Xuất bản ở đầu trang để công khai bài. Lưu
            bản nháp không thay đổi website.
          </small>
          <label>
            Ngày xuất bản *
            <input
              type="date"
              value={article.publishedAt}
              onChange={(e) => onChange({ publishedAt: e.target.value })}
            />
          </label>
          <label>Giờ xuất bản (giờ Việt Nam)<input type="time" value={article.publishedTime ?? ""} onChange={(e) => onChange({ publishedTime: e.target.value })} /></label>
          <small>Ngày giờ hiển thị trên bài, không phải hẹn giờ đăng.</small>
          <label>
            Chủ đề *
            <input
              value={article.category}
              maxLength={80}
              list="news-topics"
              onChange={(e) => onChange({ category: e.target.value })}
            />
            <datalist id="news-topics">
              {[...new Set(articles.map((item) => item.category))].map(
                (category) => (
                  <option key={category} value={category} />
                ),
              )}
            </datalist>
          </label>
          <button
            type="button"
            className="admin-secondary"
            onClick={() => dialog.current?.showModal()}
          >
            Xem trước bài viết
          </button>
        </section>
        <section>
          <h3>Ảnh đại diện</h3>
          {article.thumbnail && (
            <>
              <img
                className="news-image-preview"
                src={article.thumbnail}
                alt={article.thumbnailAlt || ""}
              />
              <label>
                Alt text *
                <input
                  value={article.thumbnailAlt ?? ""}
                  maxLength={240}
                  onChange={(e) => onChange({ thumbnailAlt: e.target.value })}
                />
              </label>
              <label>Chú thích ảnh<textarea rows={2} value={article.thumbnailCaption ?? ""} maxLength={500} onChange={(e) => onChange({ thumbnailCaption: e.target.value })} /></label>
              <button
                type="button"
                onClick={() => onChange({ thumbnail: "", thumbnailAlt: "", thumbnailCaption: "" })}
              >
                Xóa ảnh đại diện
              </button>
            </>
          )}
          <button
            type="button"
            className="admin-secondary"
            onClick={() =>
              setImageTarget(imageTarget === "cover" ? null : "cover")
            }
          >
            Upload / chọn ảnh
          </button>
          {imageTarget === "cover" && (
            <ImagePicker
              key="cover"
              images={images}
              initial={{
                src: article.thumbnail ?? "",
                alt: article.thumbnailAlt ?? "",
                caption: article.thumbnailCaption ?? "",
              }}
              onUse={(thumbnail, thumbnailAlt, thumbnailCaption) => {
                onChange({ thumbnail, thumbnailAlt, thumbnailCaption });
                setImageTarget(null);
              }}
            />
          )}
        </section>
        <section>
          <h3>Đường dẫn & SEO</h3>
          <label>
            Slug *
            <input
              value={article.slug ?? article.id}
              maxLength={100}
              onChange={(e) => { setAutoSlug(false); onChange({ slug: e.target.value }); }}
            />
          </label>
          <button
            type="button"
            onClick={() => { setAutoSlug(true); onChange({ slug: newsSlug(article.title) }); }}
          >
            Tạo slug từ tiêu đề
          </button>
          <small>Đổi slug sẽ thay đổi đường dẫn chia sẻ bài.</small>
          <label>
            SEO title
            <input
              value={article.seoTitle ?? ""}
              maxLength={70}
              placeholder={article.title}
              onChange={(e) => onChange({ seoTitle: e.target.value })}
            />
          </label>
          <small>{article.seoTitle?.length ?? 0}/70</small>
          <label>
            Meta description
            <textarea
              rows={3}
              value={article.metaDescription ?? ""}
              maxLength={180}
              placeholder={article.summary.slice(0, 180)}
              onChange={(e) => onChange({ metaDescription: e.target.value })}
            />
          </label>
          <small>{article.metaDescription?.length ?? 0}/180</small>
        </section>
        {errors.length > 0 && (
          <section className="news-validation" role="status">
            <h3>Cần hoàn thiện</h3>
            <ul>
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </section>
        )}
      </aside>
      <dialog ref={dialog} className="news-preview-dialog" aria-label="Xem trước bài viết">
        <div className="news-preview-head">
          <strong>Xem trước · Chưa xuất bản</strong>
          <button type="button" onClick={() => dialog.current?.close()}>
            Đóng
          </button>
        </div>
        <NewsArticleView article={article} />
      </dialog>
    </div>
  );
}

export function NewsEditor({
  articles,
  onChange,
  canPublish,
  disabled,
}: {
  articles: NewsArticle[];
  onChange: (articles: NewsArticle[]) => void;
  canPublish: boolean;
  disabled?: boolean;
}) {
  const [selectedId, setSelectedId] = useState(articles[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const article = articles.find((item) => item.id === selectedId);
  function add() {
    const id = `tin-${crypto.randomUUID()}`;
    onChange([
      {
        id,
        title: "Tin tức mới",
        slug: id,
        summary: "",
        category: "Cảnh báo lừa đảo",
        publishedAt: new Date().toLocaleDateString("en-CA"),
        sourceName: "",
        sourceUrl: "",
        featured: false,
        status: "draft",
        body: structuredClone(emptyDocument),
      },
      ...articles,
    ]);
    setSelectedId(id);
  }
  return (
    <div className="news-admin">
      <div className="admin-section-title">
        <div>
          <span className="eyebrow">TIN TỨC AN TOÀN SỐ</span>
          <h2>Quản lý bài tin</h2>
          <p>Soạn bài, xem trước và lưu bản nháp trước khi xuất bản.</p>
        </div>
        <button
          type="button"
          className="admin-secondary"
          disabled={articles.length >= 60}
          onClick={add}
        >
          + Thêm tin
        </button>
      </div>
      <div className="news-workspace">
        <aside className="news-article-list">
          <label>
            Tìm bài viết
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          {articles
            .filter((item) =>
              item.title
                .toLocaleLowerCase("vi")
                .includes(query.toLocaleLowerCase("vi")),
            )
            .map((item) => (
              <button
                type="button"
                key={item.id}
                aria-pressed={item.id === selectedId}
                onClick={() => setSelectedId(item.id)}
              >
                <strong>{item.title || "Chưa có tiêu đề"}</strong>
                <small>
                  {item.status === "draft"
                    ? "Bản nháp"
                    : "Đưa vào bản xuất bản"}
                  {item.featured ? " · Nổi bật" : ""}
                </small>
              </button>
            ))}
        </aside>
        <div>
          {article ? (
            <>
              <div className="news-selected-actions">
                <label>
                  <input
                    type="checkbox"
                    checked={article.featured}
                    onChange={(e) =>
                      onChange(
                        articles.map((item) => ({
                          ...item,
                          featured:
                            item.id === article.id ? e.target.checked : false,
                        })),
                      )
                    }
                  />{" "}
                  Tin nổi bật
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(`Xóa “${article.title}” khỏi bản nháp?`)
                    ) {
                      onChange(
                        articles.filter((item) => item.id !== article.id),
                      );
                      setSelectedId("");
                    }
                  }}
                >
                  Xóa bài
                </button>
              </div>
              <ArticleEditor
                key={article.id}
                article={article}
                articles={articles}
                canPublish={canPublish}
                disabled={disabled}
                onChange={(patch) =>
                  onChange(
                    articles.map((item) =>
                      item.id === article.id ? { ...item, ...patch } : item,
                    ),
                  )
                }
              />
            </>
          ) : (
            <p className="news-admin-empty">
              Chọn một bài trong danh sách hoặc bấm “Thêm tin”.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
