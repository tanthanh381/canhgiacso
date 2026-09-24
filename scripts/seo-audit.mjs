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
const extract = (html, regex) => {
  const match = html.match(regex);
  if (!match) return "";
  return (match.slice(1).find((value) => typeof value === "string" && value.length) || "").trim();
};

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

const seenTitles = new Map();
const seenDescriptions = new Map();
const prioritySerpChecks = new Map([
  [`${site}/kien-thuc/kiem-tra-so-dien-thoai-lua-dao/`, "kiểm tra số điện thoại lừa đảo"],
  [`${site}/kien-thuc/kiem-tra-link-gia-mao/`, "kiểm tra link lừa đảo"],
  [`${site}/kien-thuc/lua-dao-cong-tac-vien-viec-nhe-luong-cao/`, "lừa đảo cộng tác viên online"],
  [`${site}/kien-thuc/gia-mao-ngan-hang/`, "giả mạo ngân hàng"],
  [`${site}/kien-thuc/xu-ly-khi-bi-lua-dao-chuyen-tien/`, "bị lừa chuyển tiền"],
  [`${site}/kien-thuc/phishing-la-gi/`, "phishing là gì"],
]);

for (const url of urls) {
  const file = localPathFor(url);
  if (!(await exists(file))) {
    fail(`${url}: missing generated HTML at ${path.relative(root, file)}`);
    continue;
  }
  const html = await readFile(file, "utf8");
  const title = extract(html, /<title>([\s\S]*?)<\/title>/i);
  const description = extract(html, /<meta\s+name=["']description["']\s+content=(?:"([^"]*)"|'([^']*)')/i);
  const canonical = extract(html, /<link\s+rel=["']canonical["']\s+href=(?:"([^"]*)"|'([^']*)')/i);
  const h1Count = (html.match(/<h1\b/gi) || []).length;
  const wordCount = stripTags(html.split("<body")[1] || html).split(/\s+/).filter(Boolean).length;

  if (title.length < 15 || title.length > 70) fail(`${url}: title length ${title.length}`);
  if (seenTitles.has(title)) fail(`${url}: duplicate title with ${seenTitles.get(title)}`);
  else seenTitles.set(title, url);
  if (seenDescriptions.has(description)) fail(`${url}: duplicate meta description with ${seenDescriptions.get(description)}`);
  else seenDescriptions.set(description, url);
  if (description.length < 90 || description.length > 160) fail(`${url}: meta description length ${description.length}`);
  if (canonical !== url) fail(`${url}: canonical mismatch (${canonical})`);
  if (h1Count !== 1) fail(`${url}: expected exactly one H1, found ${h1Count}`);
  if (!/name=["']robots["'][^>]*index,follow/i.test(html)) fail(`${url}: missing index,follow robots`);
  if (!/rel=["']alternate["'][^>]*hreflang=["']vi-VN["']/i.test(html)) fail(`${url}: missing vi-VN hreflang`);
  if (!/rel=["']alternate["'][^>]*hreflang=["']x-default["']/i.test(html)) fail(`${url}: missing x-default hreflang`);
  if (!/<link\s+rel=["']icon["'][^>]*href=["']\/favicon\.png["'][^>]*>/i.test(html)) fail(`${url}: favicon must use stable /favicon.png`);
  if (!/property=["']og:title["']/i.test(html)) fail(`${url}: missing Open Graph title`);
  if (!/name=["']twitter:card["']/i.test(html)) fail(`${url}: missing Twitter card`);

  const primaryIntent = prioritySerpChecks.get(url);
  if (primaryIntent) {
    if (title.length < 42 || title.length > 62) fail(`${url}: priority SERP title length ${title.length}`);
    if (description.length < 120 || description.length > 160) fail(`${url}: priority SERP description length ${description.length}`);
    if (!title.toLocaleLowerCase("vi").includes(primaryIntent)) fail(`${url}: title does not lead with primary intent ${primaryIntent}`);
    if (!html.includes('class="seo-answer-box"')) fail(`${url}: missing answer-first block`);
    if (!html.includes('class="seo-search-cluster"')) fail(`${url}: missing contextual search cluster`);
    if (!/property=["']article:modified_time["']/i.test(html)) fail(`${url}: missing article:modified_time`);
    if (!/<time\s+datetime=["']\d{4}-\d{2}-\d{2}["']/i.test(html)) fail(`${url}: missing visible updated date`);
  }

  if (url.includes("/kien-thuc/") && url !== `${site}/kien-thuc/`) {
    if (!/"@type":"Article"/.test(html)) fail(`${url}: missing Article schema`);
    if (!/"@type":"BreadcrumbList"/.test(html)) fail(`${url}: missing BreadcrumbList schema`);
    if (!/"image":/.test(html)) fail(`${url}: Article schema missing image`);
    if (!/"logo":/.test(html)) fail(`${url}: Organization schema missing logo`);
    if (wordCount < 300) fail(`${url}: thin article (${wordCount} words)`);
  }
}

const knowledgeRoot = path.join(root, "kien-thuc");
if (await exists(knowledgeRoot)) {
  const knowledgeEntries = await (await import("node:fs/promises")).readdir(knowledgeRoot, { withFileTypes: true });
  for (const entry of knowledgeEntries) {
    if (!entry.isDirectory()) continue;
    const file = path.join(knowledgeRoot, entry.name, "index.html");
    if (!(await exists(file))) continue;
    const expected = `${site}/kien-thuc/${entry.name}/`;
    if (!urls.includes(expected)) fail(`${expected}: generated article missing from sitemap`);
  }
}

for (const required of [`${site}/gioi-thieu/`, `${site}/quyen-rieng-tu/`, `${site}/phuong-phap-kiem-chung/`]) {
  if (!urls.includes(required)) fail(`${required}: trust page missing from sitemap`);
}

const growthWave9Required = [
  "/canh-bao-lua-dao-hom-nay/",
  "/co-phai-lua-dao-khong/",
  "/tu-dien-lua-dao/",
  "/cong-cu/",
  "/cong-cu/kiem-tra-cuoc-goi-la/",
  "/cong-cu/xu-ly-khi-bi-lua/",
  "/cong-cu/kiem-tra-bien-lai-chuyen-khoan/",
  "/cong-cu/kiem-tra-tin-nhan-dang-ngo/",
  "/cong-cu/kiem-tra-quyen-ung-dung-android/",
  "/cong-cu/kiem-tra-truoc-khi-chuyen-tien/",
  "/cong-cu/tra-cuu-kenh-chinh-thuc/",
  "/cong-cu/thu-vien-kich-ban-lua-dao/",
  "/kien-thuc/bien-lai-chuyen-khoan-gia/",
  "/kien-thuc/cuoc-goi-im-lang-lua-dao/",
  "/kien-thuc/lua-dao-khoa-sim-chuan-hoa-thue-bao/",
  "/kien-thuc/app-quyen-tro-nang-lua-dao/",
  "/kien-thuc/app-dieu-khien-dien-thoai-tu-xa/",
  "/kien-thuc/lua-dao-hoan-thue-gia-mao/",
  "/kien-thuc/gia-danh-giao-vien-bao-con-tai-nan/",
  "/kien-thuc/gia-danh-benh-vien-bao-nguoi-than-cap-cuu/",
  "/kien-thuc/sms-brandname-gia-mao/",
  "/kien-thuc/nguoi-mua-gui-link-nhan-tien-lua-dao/",
  "/kien-thuc/dat-coc-mua-hang-online-lua-dao/",
  "/kien-thuc/trung-thuong-nhan-qua-dong-phi-lua-dao/",
  "/kien-thuc/romance-scam-lua-dao-tinh-cam/",
  "/kien-thuc/lua-dao-dau-tu-telegram-zalo/",
  "/kien-thuc/bat-coc-online/",
  "/kien-thuc/ai-ghep-anh-video-tong-tien/",
  "/kien-thuc/gia-mao-lanh-dao-yeu-cau-chuyen-tien-bec/",
];
for (const pathname of growthWave9Required) {
  const required = `${site}${pathname}`;
  if (!urls.includes(required)) fail(`${required}: Growth Wave 9 URL missing from sitemap`);
}

const interactiveToolPaths = [
  "/cong-cu/kiem-tra-cuoc-goi-la/",
  "/cong-cu/xu-ly-khi-bi-lua/",
  "/cong-cu/kiem-tra-bien-lai-chuyen-khoan/",
  "/cong-cu/kiem-tra-tin-nhan-dang-ngo/",
  "/cong-cu/kiem-tra-quyen-ung-dung-android/",
  "/cong-cu/kiem-tra-truoc-khi-chuyen-tien/",
  "/cong-cu/tra-cuu-kenh-chinh-thuc/",
  "/cong-cu/thu-vien-kich-ban-lua-dao/",
];
for (const pathname of interactiveToolPaths) {
  const file = localPathFor(`${site}${pathname}`);
  if (!(await exists(file))) continue;
  const html = await readFile(file, "utf8");
  if (!html.includes('/scam-tools.js')) fail(`${site}${pathname}: missing client-side anti-scam tool script`);
  if (!html.includes('/theme-init.js')) fail(`${site}${pathname}: missing CSP-safe theme initializer`);
  if (!/http-equiv=["']Content-Security-Policy["']/i.test(html)) fail(`${site}${pathname}: missing Content Security Policy`);
  if (!/script-src[^;]*'self'/i.test(html)) fail(`${site}${pathname}: CSP does not allow same-origin tool scripts`);
  if (!/object-src[^;]*'none'/i.test(html)) fail(`${site}${pathname}: CSP does not block plugin objects`);
}

const faviconPath = path.join(root, "favicon.png");
if (!(await exists(faviconPath))) {
  fail("Missing favicon.png");
} else {
  const faviconBytes = await readFile(faviconPath);
  const pngSignature = faviconBytes.subarray(0, 8).toString("hex");
  const width = faviconBytes.length >= 24 ? faviconBytes.readUInt32BE(16) : 0;
  const height = faviconBytes.length >= 24 ? faviconBytes.readUInt32BE(20) : 0;
  if (pngSignature !== "89504e470d0a1a0a") fail("favicon.png is not a valid PNG");
  if (width !== height) fail(`favicon.png must be square, found ${width}x${height}`);
  if (width < 48) fail(`favicon.png must be at least 48x48, found ${width}x${height}`);
  if (width === height && width >= 48) ok(`favicon.png is ${width}x${height} and Google Search eligible by size`);
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
if (!home.includes("/gioi-thieu/")) fail("Homepage missing About/trust link");
if (!home.includes("/phuong-phap-kiem-chung/")) fail("Homepage missing editorial-method link");
if (!home.includes("/quyen-rieng-tu/")) fail("Homepage missing privacy link");

if (!process.exitCode) console.log("SEO audit passed.");
