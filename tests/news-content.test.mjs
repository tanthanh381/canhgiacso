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
  const source = readFileSync(new URL(`../app/${name}.ts`, import.meta.url), "utf8");
  const exports = {};
  new Function("exports", "require", ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText)(exports, (path) => load(path.replace("./", "")));
  modules.set(name, exports);
  return exports;
}

const { defaultSiteContent, normalizeSiteContent } = load("data");

test("nội dung mặc định có tin từ nguồn HTTPS và một bài nổi bật", () => {
  assert.ok(defaultSiteContent.newsArticles.length >= 6);
  assert.equal(defaultSiteContent.newsArticles.filter((article) => article.featured).length, 1);
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
  const [page, admin] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(page, />Tin tức<\/button>/);
  assert.match(page, /aria-label="Tìm tin tức"/);
  assert.match(page, /rel="noopener noreferrer"/);
  assert.match(admin, /Quản lý bài tin/);
  assert.match(admin, /URL nguồn \(HTTPS\)/);
  assert.match(admin, /Lưu bản nháp/);
});
