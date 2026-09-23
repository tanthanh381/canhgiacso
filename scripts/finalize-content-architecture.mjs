import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public");
const HOME = path.join(ROOT, "github-pages", "index.html");
const SITE = "https://canhgiacso.com";

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

const records = [];
for (const file of [HOME, ...(await htmlFiles(PUBLIC))]) {
  const html = await readFile(file, "utf8");
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
