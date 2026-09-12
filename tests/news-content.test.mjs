import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const modules = new Map();

function load(name) {
  if (modules.has(name)) return modules.get(name);
  const source = readFileSync(
    new URL(`../app/${name}.ts`, import.meta.url),
    "utf8",
  );
  const exports = {};
  new Function(
    "exports",
    "require",
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
  )(exports, (path) => load(path.replace("./", "")));
  modules.set(name, exports);
  return exports;
}

const { defaultSiteContent, normalizeSiteContent } = load("data");

test("nội dung mặc định có tin từ nguồn HTTPS và một bài nổi bật", () => {
  assert.ok(defaultSiteContent.newsArticles.length >= 6);
  assert.equal(
    defaultSiteContent.newsArticles.filter((article) => article.featured)
      .length,
    1,
  );
  for (const article of defaultSiteContent.newsArticles) {
    assert.equal(new URL(article.sourceUrl).protocol, "https:");
    assert.match(article.publishedAt, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test("dữ liệu cũ chưa có trường Tin tức được nâng cấp tương thích", () => {
  const legacy = structuredClone(defaultSiteContent);
  delete legacy.newsArticles;
  delete legacy.copy.newsEyebrow;
  delete legacy.copy.newsTitle;
  delete legacy.copy.newsIntro;
  const normalized = normalizeSiteContent(legacy);
  assert.deepEqual(normalized.newsArticles, defaultSiteContent.newsArticles);
  assert.equal(normalized.copy.newsTitle, defaultSiteContent.copy.newsTitle);
});

test("từ chối URL nguồn không an toàn và ID trùng", () => {
  const unsafe = structuredClone(defaultSiteContent);
  unsafe.newsArticles[0].sourceUrl = "javascript:alert(1)";
  assert.equal(normalizeSiteContent(unsafe), null);
  const duplicate = structuredClone(defaultSiteContent);
  duplicate.newsArticles[1].id = duplicate.newsArticles[0].id;
  assert.equal(normalizeSiteContent(duplicate), null);
});

test("giao diện có menu, bộ lọc, liên kết nguồn và khu vực quản trị Tin tức", async () => {
  const [page, admin, editor] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/news-editor.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(page, />Tin tức<\/button>/);
  assert.match(page, /aria-label="Tìm tin tức"/);
  assert.match(page, /rel="noopener noreferrer"/);
  assert.match(editor, /Quản lý bài tin/);
  assert.match(editor, /URL nguồn \(HTTPS\)/);
  assert.match(admin, /Lưu bản nháp/);
});

const { newsErrors, newsSlug, publicNews, validDocument, emptyDocument } =
  load("news-content");
const { normalizeManagedSiteContent } = load("data");
function managedContent() {
  const value = structuredClone(defaultSiteContent);
  value.scenarios.forEach((s) =>
    s.choices.forEach((c, i) =>
      Object.assign(c, {
        correct: i === 0,
        moneyDelta: 0,
        awarenessDelta: 0,
        feedback: "Test feedback",
      }),
    ),
  );
  return value;
}
function newArticle() {
  return {
    id: "new-story",
    title: "Bài mới",
    slug: "bai-moi",
    summary: "",
    category: "Cảnh báo",
    publishedAt: "2026-09-12",
    sourceName: "",
    sourceUrl: "",
    featured: false,
    status: "draft",
    body: structuredClone(emptyDocument),
  };
}

test("bản nháp chưa viết xong lưu được, xuất bản phải có mô tả và nội dung", () => {
  const article = newArticle();
  const content = managedContent();
  content.newsArticles.push(article);
  assert.ok(normalizeManagedSiteContent(content));
  assert.equal(newsErrors(article, [article]).length, 0);
  assert.ok(
    newsErrors(article, [article], true).some((error) =>
      error.includes("mô tả"),
    ),
  );
  assert.ok(
    newsErrors(article, [article], true).some((error) =>
      error.includes("nội dung"),
    ),
  );
});

test("loại Draft khỏi bản công khai, bảo toàn bài cũ và bản nháp quản trị", () => {
  const articles = [
    ...structuredClone(defaultSiteContent.newsArticles),
    newArticle(),
  ];
  const snapshot = JSON.stringify(articles);
  const published = publicNews(articles);
  assert.deepEqual(published, defaultSiteContent.newsArticles);
  assert.equal(JSON.stringify(articles), snapshot);
});

test("slug tiếng Việt, trùng slug và ngày không tồn tại", () => {
  assert.equal(
    newsSlug("Cảnh giác: Đừng bấm link lạ!"),
    "canh-giac-dung-bam-link-la",
  );
  const a = newArticle();
  assert.ok(
    newsErrors(a, [a, { ...a, id: "other" }]).some((error) =>
      error.includes("đã được"),
    ),
  );
  assert.ok(
    newsErrors({ ...a, publishedAt: "2026-02-31" }, [a]).some((error) =>
      error.includes("Ngày"),
    ),
  );
});

test("rich text chỉ cho phép cấu trúc an toàn và từ chối script, SVG, blob URL", () => {
  assert.ok(
    validDocument({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "<script>alert(1)</script>",
              marks: [{ type: "bold" }],
            },
          ],
        },
      ],
    }),
  );
  assert.ok(
    validDocument({
      type: "doc",
      content: [
        { type: "image", attrs: { src: "https://example.com/photo.png", alt: "" } },
      ],
    }),
  );
  for (const child of [
    { type: "script" },
    {
      type: "image",
      attrs: { src: "data:image/svg+xml;base64,AAAA", alt: "x" },
    },
    { type: "image", attrs: { src: "blob:https://example.com/abc", alt: "x" } },
    {
      type: "text",
      text: "x",
      marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
    },
    { type: "text", text: "x", marks: [null] },
  ])
    assert.equal(validDocument({ type: "doc", content: [child] }), false);
});

test("ảnh nội dung chấp nhận data URI PNG, JPG, JPEG và WebP hợp lệ", () => {
  for (const src of [
    "data:image/png;base64,AAAA",
    "data:image/jpg;base64,AAAA",
    "data:image/jpeg;base64,AAAA",
    "data:image/webp;base64,AAAA",
  ]) {
    assert.equal(
      validDocument({ type: "doc", content: [{ type: "image", attrs: { src, alt: "Ảnh" } }] }),
      true,
    );
  }
});

test("round trip giữ nội dung rich text và metadata của bài mới và bài cũ", () => {
  const content = managedContent();
  const article = {
    ...newArticle(),
    summary: "Mô tả bài viết",
    seoTitle: "Tiêu đề SEO",
    metaDescription: "Mô tả SEO",
    thumbnail: "https://example.com/photo.webp",
    thumbnailAlt: "Ảnh cảnh báo",
    body: {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2, textAlign: "center" },
          content: [{ type: "text", text: "Nội dung" }],
        },
      ],
    },
  };
  content.newsArticles.push(article);
  assert.deepEqual(
    normalizeManagedSiteContent(JSON.parse(JSON.stringify(content)))
      .newsArticles,
    content.newsArticles,
  );
});


test("giữ chú thích và giờ khi tạo/lưu/sửa bài; từ chối dữ liệu không hợp lệ", () => {
  const content = managedContent();
  const article = { ...newArticle(), publishedTime: "09:30", thumbnailCaption: "Ảnh minh họa",
    body: { type: "doc", content: [{ type: "image", attrs: { src: "https://example.com/a.png", alt: "Cảnh báo", caption: "Nguồn ảnh" } }] } };
  content.newsArticles.push(article);
  const saved = normalizeManagedSiteContent(JSON.parse(JSON.stringify(content)));
  assert.deepEqual(saved.newsArticles.at(-1), article);
  saved.newsArticles.at(-1).title = "Tiêu đề đã sửa";
  assert.equal(normalizeManagedSiteContent(saved).newsArticles.at(-1).slug, "bai-moi");
  for (const publishedTime of ["24:00", "12:60", "9:30"]) assert.ok(newsErrors({ ...article, publishedTime }, [article]).length);
  assert.ok(newsErrors({ ...article, thumbnailCaption: "x".repeat(501) }, [article]).length);
  article.body.content[0].attrs.caption = 123;
  assert.equal(validDocument(article.body), false);
});
