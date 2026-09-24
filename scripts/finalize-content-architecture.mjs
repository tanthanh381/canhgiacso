import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public");
const HOME = path.join(ROOT, "github-pages", "index.html");
const SITE = "https://canhgiacso.com";
const SEO_CSS_VERSION = "20260923-logo-mask";
const BRAND_MARKUP = '<span class="seo-brand-logo" aria-hidden="true"></span><span class="seo-brand-divider" aria-hidden="true"></span><span class="seo-product-lockup"><strong>CẢNH GIÁC SỐ</strong><small>IT SECURITY</small></span>';

async function htmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await htmlFiles(full));
    else if (entry.name === "index.html") out.push(full);
  }
  return out;
}

function match(html, re) {
  return html.match(re)?.[1]?.trim() ?? "";
}

function modifiedDate(html) {
  const article = match(html, /<meta\s+property=["']article:modified_time["']\s+content=["']([^"']+)["']/i);
  if (article) return article.slice(0, 10);
  const time = match(html, /<time\s+datetime=["'](\d{4}-\d{2}-\d{2})["']/i);
  return time || "";
}

function isIndexable(html) {
  const robots = match(html, /<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i).toLowerCase();
  return !robots.includes("noindex");
}

function attrEscape(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function normalizeKnowledgeShell(html, file) {
  if (!file.includes(`${path.sep}kien-thuc${path.sep}`)) return html;
  return html
    .replaceAll('href="/seo.css"', `href="/seo.css?v=${SEO_CSS_VERSION}"`)
    .replaceAll("href='/seo.css'", `href='/seo.css?v=${SEO_CSS_VERSION}'`)
    .replaceAll(`href="/seo.css?v=${SEO_CSS_VERSION}?v=${SEO_CSS_VERSION}"`, `href="/seo.css?v=${SEO_CSS_VERSION}"`)
    .replaceAll(`href='/seo.css?v=${SEO_CSS_VERSION}?v=${SEO_CSS_VERSION}'`, `href='/seo.css?v=${SEO_CSS_VERSION}'`)
    .replaceAll('<img src="/khien-so-logo.png" alt="Logo Cảnh Giác Số" width="42" height="42" /><span>Cảnh Giác Số</span>', BRAND_MARKUP)
    .replaceAll('<img src="/khien-so-logo.png" alt="Logo Cảnh Giác Số" width="54" height="54" /><span>Cảnh Giác Số</span>', BRAND_MARKUP)
    .replaceAll('<img src="/canh-giac-so-mark.svg" alt="Logo Cảnh Giác Số" width="42" height="42" /><span>Cảnh Giác Số</span>', BRAND_MARKUP)
    .replaceAll('<img src="/canh-giac-so-mark.svg" alt="Logo Cảnh Giác Số" width="54" height="54" /><span>Cảnh Giác Số</span>', BRAND_MARKUP)
    .replaceAll('<span class="seo-brand-logo" aria-hidden="true"></span><span class="seo-brand-lockup">Cảnh Giác Số</span>', BRAND_MARKUP)
    .replaceAll('<span class="seo-brand-logo" role="img" aria-label="Logo Cảnh Giác Số"></span><span class="seo-brand-lockup">Cảnh Giác Số</span>', BRAND_MARKUP)
    .replaceAll('<a href="/kien-thuc/">Kiến thức</a></nav>', '<a href="/kien-thuc/" aria-current="page">Cẩm nang</a></nav>')
    .replaceAll('› <a href="/kien-thuc/">Kiến thức</a> ›', '› <a href="/kien-thuc/">Cẩm nang</a> ›');
}

function normalizeFavicon(html) {
  let next = html
    .replace(/<link\s+rel=["']icon["'][^>]*>/gi, '<link rel="icon" type="image/png" sizes="96x96" href="/favicon.png" />')
    .replace(/<link\s+rel=["']apple-touch-icon["'][^>]*>/gi, '<link rel="apple-touch-icon" href="/favicon.png" />');
  if (!/rel=["']icon["']/i.test(next)) {
    next = next.replace("</head>", '  <link rel="icon" type="image/png" sizes="96x96" href="/favicon.png" />\n</head>');
  }
  if (!/rel=["']apple-touch-icon["']/i.test(next)) {
    next = next.replace("</head>", '  <link rel="apple-touch-icon" href="/favicon.png" />\n</head>');
  }
  return next;
}

function ensureSearchMetadata(html) {
  const canonical = match(html, /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  const title = match(html, /<title>([\s\S]*?)<\/title>/i).replace(/\s+/g, " ");
  const description = match(html, /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
  if (!canonical || !title || !description || !isIndexable(html)) return html;

  const additions = [];
  if (!/rel=["']icon["']/i.test(html)) additions.push('<link rel="icon" type="image/png" sizes="96x96" href="/favicon.png" />');
  if (!/hreflang=["']vi-VN["']/i.test(html)) additions.push(`<link rel="alternate" hreflang="vi-VN" href="${attrEscape(canonical)}" />`);
  if (!/hreflang=["']x-default["']/i.test(html)) additions.push(`<link rel="alternate" hreflang="x-default" href="${attrEscape(canonical)}" />`);
  if (!/property=["']og:site_name["']/i.test(html)) additions.push('<meta property="og:site_name" content="Cảnh Giác Số" />');
  if (!/property=["']og:title["']/i.test(html)) additions.push(`<meta property="og:title" content="${attrEscape(title)}" />`);
  if (!/property=["']og:description["']/i.test(html)) additions.push(`<meta property="og:description" content="${attrEscape(description)}" />`);
  if (!/property=["']og:url["']/i.test(html)) additions.push(`<meta property="og:url" content="${attrEscape(canonical)}" />`);
  if (!/property=["']og:image["']/i.test(html)) additions.push(`<meta property="og:image" content="${SITE}/og.png" />`);
  if (!/name=["']twitter:card["']/i.test(html)) additions.push('<meta name="twitter:card" content="summary_large_image" />');
  if (!/name=["']twitter:title["']/i.test(html)) additions.push(`<meta name="twitter:title" content="${attrEscape(title)}" />`);
  if (!/name=["']twitter:description["']/i.test(html)) additions.push(`<meta name="twitter:description" content="${attrEscape(description)}" />`);
  if (!/name=["']twitter:image["']/i.test(html)) additions.push(`<meta name="twitter:image" content="${SITE}/og.png" />`);

  return additions.length ? html.replace("</head>", `  ${additions.join("\n  ")}\n</head>`) : html;
}

const records = [];
for (const file of [HOME, ...(await htmlFiles(PUBLIC))]) {
  let html = await readFile(file, "utf8");
  html = normalizeKnowledgeShell(html, file);
  html = normalizeFavicon(html);
  const normalized = ensureSearchMetadata(html);
  if (normalized !== html) {
    await writeFile(file, normalized, "utf8");
    html = normalized;
  }
  if (!isIndexable(html)) continue;
  const canonical = match(html, /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  if (!canonical || !canonical.startsWith(SITE)) continue;
  const title = match(html, /<title>([\s\S]*?)<\/title>/i).replace(/\s+/g, " ");
  const description = match(html, /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
  if (!title) throw new Error(`${canonical}: missing title during content finalization`);
  if (!description) throw new Error(`${canonical}: missing description during content finalization`);
  records.push({ canonical, title, description, modified: modifiedDate(html), file });
}

const byCanonical = new Map();
const byTitle = new Map();
const byDescription = new Map();
for (const record of records) {
  if (byCanonical.has(record.canonical)) {
    throw new Error(`Duplicate canonical: ${record.canonical}`);
  }
  byCanonical.set(record.canonical, record.file);

  if (byTitle.has(record.title)) {
    throw new Error(`Duplicate title: ${record.title} :: ${byTitle.get(record.title)} + ${record.file}`);
  }
  byTitle.set(record.title, record.file);

  if (byDescription.has(record.description)) {
    throw new Error(`Duplicate meta description: ${record.canonical}`);
  }
  byDescription.set(record.description, record.file);
}

records.sort((a, b) => {
  if (a.canonical === `${SITE}/`) return -1;
  if (b.canonical === `${SITE}/`) return 1;
  return a.canonical.localeCompare(b.canonical, "vi");
});

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...records.flatMap((record) => [
    '  <url>',
    `    <loc>${record.canonical.replace(/&/g, "&amp;")}</loc>`,
    ...(record.modified ? [`    <lastmod>${record.modified}</lastmod>`] : []),
    '  </url>',
  ]),
  '</urlset>',
  '',
].join("\n");

await writeFile(path.join(PUBLIC, "sitemap.xml"), xml, "utf8");
console.log(`Content finalizer: ${records.length} canonical indexable pages; sitemap rebuilt from final artifacts.`);
