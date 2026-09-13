import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const root = process.argv[2] || "docs";
const requiredPages = [
  "index.html",
  "kien-thuc/index.html",
  "kien-thuc/nhan-dien-lua-dao-truc-tuyen/index.html",
  "kien-thuc/nhan-dien-email-phishing/index.html",
  "kien-thuc/xu-ly-khi-bi-lua-dao-chuyen-tien/index.html",
];

const errors = [];

function check(condition, message) {
  if (!condition) errors.push(message);
}

function countMatches(text, regex) {
  return [...text.matchAll(regex)].length;
}

async function auditHtml(relativePath) {
  const fullPath = path.join(root, relativePath);
  const html = await readFile(fullPath, "utf8");
  const label = `/${relativePath.replace(/index\.html$/, "")}`;

  check(/<html[^>]+lang="vi(?:-VN)?"/i.test(html), `${label}: missing Vietnamese lang attribute`);
  check(/<title>[^<]{15,65}<\/title>/i.test(html), `${label}: title should be 15-65 characters`);
  check(/<meta\s+name="description"\s+content="[^"]{80,180}"/i.test(html), `${label}: meta description should be 80-180 characters`);
  check(countMatches(html, /<link\s+rel="canonical"/gi) === 1, `${label}: must contain exactly one canonical URL`);
  check(/<meta\s+name="robots"[^>]+index[^>]+follow/i.test(html), `${label}: page must be indexable and followable`);
  check(/property="og:title"/i.test(html), `${label}: missing Open Graph title`);
  check(/property="og:description"/i.test(html), `${label}: missing Open Graph description`);
  check(/property="og:image"/i.test(html), `${label}: missing Open Graph image`);
  check(/application\/ld\+json/i.test(html), `${label}: missing JSON-LD structured data`);
  check(/<h1(?:\s[^>]*)?>[\s\S]*?<\/h1>/i.test(html), `${label}: missing H1`);
  check(countMatches(html, /<h1(?:\s[^>]*)?>/gi) === 1, `${label}: should contain exactly one H1`);

  if (relativePath === "index.html") {
    check(/<div id="root">[\s\S]*?<h1/i.test(html), `${label}: homepage must expose crawlable content before JavaScript executes`);
    check(/href="\/kien-thuc\//i.test(html), `${label}: homepage must link to the knowledge hub`);
  }
}

async function walk(dir) {
  const entries = await readdir(dir);
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const info = await stat(full);
    if (info.isDirectory()) await walk(full);
  }
}

await walk(root);

for (const page of requiredPages) {
  try {
    await auditHtml(page);
  } catch (error) {
    errors.push(`/${page}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const robots = await readFile(path.join(root, "robots.txt"), "utf8");
check(/User-agent:\s*\*/i.test(robots), "robots.txt: missing default user-agent");
check(/Allow:\s*\//i.test(robots), "robots.txt: site is not explicitly crawlable");
check(/Sitemap:\s*https:\/\/canhgiacso\.com\/sitemap\.xml/i.test(robots), "robots.txt: missing production sitemap URL");

const sitemap = await readFile(path.join(root, "sitemap.xml"), "utf8");
for (const url of [
  "https://canhgiacso.com/",
  "https://canhgiacso.com/kien-thuc/",
  "https://canhgiacso.com/kien-thuc/nhan-dien-lua-dao-truc-tuyen/",
  "https://canhgiacso.com/kien-thuc/nhan-dien-email-phishing/",
  "https://canhgiacso.com/kien-thuc/xu-ly-khi-bi-lua-dao-chuyen-tien/",
]) {
  check(sitemap.includes(`<loc>${url}</loc>`), `sitemap.xml: missing ${url}`);
}

if (errors.length) {
  console.error(`SEO audit failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`SEO audit passed for ${requiredPages.length} indexable pages.`);
