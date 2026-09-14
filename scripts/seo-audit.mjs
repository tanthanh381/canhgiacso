import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const outDir = process.argv[2] || "docs";
const root = path.resolve(outDir);
const site = "https://canhgiacso.com";

const fail = (message) => {
  console.error(`SEO AUDIT FAIL: ${message}`);
  process.exitCode = 1;
};
const ok = (message) => console.log(`✓ ${message}`);
const exists = async (p) => {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
};
const stripTags = (value) =>
  value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const extract = (html, regex) => html.match(regex)?.[1]?.trim() || "";

const sitemapPath = path.join(root, "sitemap.xml");
if (!(await exists(sitemapPath))) {
  fail("Missing sitemap.xml");
  process.exit(1);
}
const sitemap = await readFile(sitemapPath, "utf8");
const urls = [...sitemap.matchAll(/<loc>(https:\/\/canhgiacso\.com\/[^<]*)<\/loc>/g)].map((m) => m[1]);
if (urls.length < 15) fail(`Expected at least 15 indexable URLs, found ${urls.length}`);
else ok(`Sitemap contains ${urls.length} URLs`);

const localPathFor = (url) => {
  const pathname = new URL(url).pathname;
  if (pathname === "/") return path.join(root, "index.html");
  return path.join(root, pathname.replace(/^\/|\/$/g, ""), "index.html");
};

for (const url of urls) {
  const file = localPathFor(url);
  if (!(await exists(file))) {
    fail(`${url}: missing generated HTML at ${path.relative(root, file)}`);
    continue;
  }
  const html = await readFile(file, "utf8");
  const title = extract(html, /<title>([\s\S]*?)<\/title>/i);
  const description = extract(html, /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
  const canonical = extract(html, /<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i);
  const h1Count = (html.match(/<h1\b/gi) || []).length;
  const wordCount = stripTags(html.split("<body")[1] || html).split(/\s+/).filter(Boolean).length;

  if (title.length < 15 || title.length > 70) fail(`${url}: title length ${title.length}`);
  if (description.length < 90 || description.length > 160) fail(`${url}: meta description length ${description.length}`);
  if (canonical !== url) fail(`${url}: canonical mismatch (${canonical})`);
  if (h1Count !== 1) fail(`${url}: expected exactly one H1, found ${h1Count}`);
  if (!/name=["']robots["'][^>]*index,follow/i.test(html)) fail(`${url}: missing index,follow robots`);
  if (!/rel=["']alternate["'][^>]*hreflang=["']vi-VN["']/i.test(html)) fail(`${url}: missing vi-VN hreflang`);
  if (!/rel=["']alternate["'][^>]*hreflang=["']x-default["']/i.test(html)) fail(`${url}: missing x-default hreflang`);
  if (!/rel=["']icon["']/i.test(html)) fail(`${url}: missing favicon`);
  if (!/property=["']og:title["']/i.test(html)) fail(`${url}: missing Open Graph title`);
  if (!/name=["']twitter:card["']/i.test(html)) fail(`${url}: missing Twitter card`);

  if (url.includes("/kien-thuc/") && url !== `${site}/kien-thuc/`) {
    if (!/"@type":"Article"/.test(html)) fail(`${url}: missing Article schema`);
    if (!/"@type":"BreadcrumbList"/.test(html)) fail(`${url}: missing BreadcrumbList schema`);
    if (!/"image":/.test(html)) fail(`${url}: Article schema missing image`);
    if (!/"logo":/.test(html)) fail(`${url}: Organization schema missing logo`);
    if (wordCount < 300) fail(`${url}: thin article (${wordCount} words)`);
  }
}

const robots = await readFile(path.join(root, "robots.txt"), "utf8");
if (!robots.includes("Sitemap: https://canhgiacso.com/sitemap.xml")) fail("robots.txt does not advertise sitemap");
else ok("robots.txt advertises sitemap");

const home = await readFile(path.join(root, "index.html"), "utf8");
const homeWords = stripTags(home.split("<body")[1] || home).split(/\s+/).filter(Boolean).length;
if (homeWords < 450) fail(`Homepage crawlable content is thin (${homeWords} words)`);
else ok(`Homepage has ${homeWords} crawlable words`);
if (!home.includes("/kien-thuc/phong-chong-lua-dao-truc-tuyen/")) fail("Homepage missing anti-scam pillar link");
if (!home.includes("/kien-thuc/an-toan-thong-tin-ca-nhan/")) fail("Homepage missing information-security pillar link");

if (!process.exitCode) console.log("SEO audit passed.");
