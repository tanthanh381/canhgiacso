import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

// Stage cuối của pipeline nội dung. Mọi trang HTML đi qua đây đúng một lần để:
//  1. gỡ khối Google tag và thẻ /web-analytics.js nạp trực tiếp (chúng chỉ được nạp bởi /consent.js sau khi người dùng đồng ý);
//  2. gắn đúng MỘT thẻ <script src="/consent.js" defer> vào <head>;
//  3. chuẩn hóa Content-Security-Policy (không 'unsafe-inline' cho script) và thay script theme inline bằng /theme-init.js.
// Stage idempotent: chạy lại trên kết quả của chính nó không đổi gì.

const ROOT = process.cwd();
const GA_ID = "G-HH04Q7FYHM";
const SUPABASE_ORIGIN = "https://goietwyapiywrtibpkwo.supabase.co";
const CONSENT_TAG = '<script src="/consent.js" defer></script>';
const THEME_TAG = '<script src="/theme-init.js"></script>';
const SPA_PAGE = path.join(ROOT, "github-pages", "index.html");
const SKIPPED_PAGES = new Set([
  // Nhúng trong /gioi-thieu/ bằng iframe; tự chứa, không nạp phân tích để khỏi đếm đôi lượt xem.
  path.join(ROOT, "public", "gioi-thieu", "hoat-hinh.html"),
]);

const BASE_CSP = {
  "default-src": ["'self'"],
  "script-src": ["'self'", "https://www.googletagmanager.com"],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "data:", "blob:", "https://www.google-analytics.com", "https://www.googletagmanager.com"],
  "font-src": ["'self'", "data:"],
  "connect-src": [
    "'self'",
    SUPABASE_ORIGIN,
    SUPABASE_ORIGIN.replace("https://", "wss://"),
    "https://www.google-analytics.com",
    "https://analytics.google.com",
    "https://region1.google-analytics.com",
    "https://www.googletagmanager.com",
    "https://www.google.com",
  ],
};
const STATIC_CSP_DIRECTIVES = {
  ...BASE_CSP,
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "upgrade-insecure-requests": [],
};
// SPA nhúng bài quiz của Google và không dùng media/worker.
const SPA_CSP_DIRECTIVES = {
  ...BASE_CSP,
  "frame-src": ["https://phishingquiz.withgoogle.com"],
  "media-src": ["'none'"],
  "worker-src": ["'none'"],
  "object-src": ["'none'"],
  "base-uri": ["'none'"],
  "form-action": ["'self'"],
  "manifest-src": ["'self'"],
  "upgrade-insecure-requests": [],
};

const serializeCsp = (directives) => Object.entries(directives)
  .map(([name, values]) => [name, ...values].join(" "))
  .join("; ");

const STATIC_CSP = serializeCsp(STATIC_CSP_DIRECTIVES);
const SPA_CSP = serializeCsp(SPA_CSP_DIRECTIVES);

const CSP_META_PATTERN = /<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*>/gi;
const GTAG_COMMENT_PATTERN = /[ \t]*<!--\s*Google tag \(gtag\.js\)\s*-->[ \t]*\r?\n?/gi;
const GTAG_SCRIPT_PATTERN = /[ \t]*<script\b[^>]*\bsrc=["']https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=([A-Za-z0-9_-]+)["'][^>]*>\s*<\/script>[ \t]*\r?\n?/gi;
const GA_INIT_PATTERN = /[ \t]*<script\b[^>]*\bsrc=["']\/google-analytics-init\.js["'][^>]*>\s*<\/script>[ \t]*\r?\n?/gi;
const TRACKER_PATTERN = /[ \t]*<script\b[^>]*\bsrc=["']\/web-analytics\.js["'][^>]*>\s*<\/script>[ \t]*\r?\n?/gi;
const CONSENT_PATTERN = /(?:[ \t]*\r?\n)?[ \t]*<script\b[^>]*\bsrc=["']\/consent\.js["'][^>]*>\s*<\/script>/gi;
const INLINE_THEME_PATTERN = /([ \t]*)<script>\s*try\s*\{\s*if\s*\(\s*(?:window\.)?localStorage\.getItem\(\s*["']khien-so-theme["']\s*\)\s*===\s*["']dark["']\s*\)\s*document\.documentElement\.dataset\.theme\s*=\s*["']dark["']\s*;?\s*\}\s*catch\s*(?:\(\s*\w*\s*\))?\s*\{\s*\}\s*<\/script>[ \t]*(\r?\n)?/g;
const THEME_SCRIPT_PATTERN = /[ \t]*<script\b[^>]*\bsrc=["']\/theme-init\.js["'][^>]*>\s*<\/script>[ \t]*\r?\n?/gi;

async function htmlFiles(dir) {
  const entries = await readdir(dir);
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const info = await stat(full);
    if (info.isDirectory()) files.push(...await htmlFiles(full));
    else if (entry.endsWith(".html")) files.push(full);
  }
  return files;
}

function removeLegacyGoogleTag(html, file) {
  for (const match of html.matchAll(GTAG_SCRIPT_PATTERN)) {
    if (match[1] !== GA_ID) throw new Error(`Unexpected Google tag ${match[1]} found in ${file}`);
  }
  return html
    .replace(GTAG_COMMENT_PATTERN, "")
    .replace(GTAG_SCRIPT_PATTERN, "")
    .replace(GA_INIT_PATTERN, "")
    .replace(TRACKER_PATTERN, "");
}

// Thay script theme inline bằng tệp CSP-safe; nếu trang đã có /theme-init.js thì chỉ giữ một thẻ.
function normalizeTheme(html) {
  const hasExternal = /<script\b[^>]*\bsrc=["']\/theme-init\.js["']/i.test(html);
  let next = html.replace(INLINE_THEME_PATTERN, (_match, indent, newline) => (
    hasExternal ? "" : `${indent}${THEME_TAG}${newline ?? ""}`
  ));
  let seen = false;
  next = next.replace(THEME_SCRIPT_PATTERN, (tag) => {
    if (seen) return "";
    seen = true;
    return tag;
  });
  return next;
}

function normalizeCsp(html, csp) {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${csp}" />`;
  const found = [...html.matchAll(CSP_META_PATTERN)];
  if (found.length) {
    let first = true;
    return html.replace(CSP_META_PATTERN, () => {
      if (first) {
        first = false;
        return meta;
      }
      return "";
    });
  }
  const charset = html.match(/<meta\s+charset=["'][^"']*["'][^>]*>/i);
  if (charset) return html.replace(charset[0], `${charset[0]}\n  ${meta}`);
  return html.replace(/<head>/i, `<head>\n  ${meta}`);
}

function normalizeConsentTag(html) {
  let next = html.replace(CONSENT_PATTERN, "");
  const cspMeta = next.match(/<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*>/i);
  if (!cspMeta) throw new Error("Cannot place consent.js: Content-Security-Policy meta is missing");
  next = next.replace(cspMeta[0], `${cspMeta[0]}\n  ${CONSENT_TAG}`);
  return next;
}

function assertCompliant(html, file) {
  const head = html.slice(0, html.search(/<\/head>/i));
  const cspMetas = [...html.matchAll(CSP_META_PATTERN)];
  if (cspMetas.length !== 1) throw new Error(`${file}: expected exactly one CSP meta, found ${cspMetas.length}`);
  const scriptSrc = cspMetas[0][0].match(/script-src([^;"]*)/)?.[1] ?? "";
  if (/unsafe-inline|unsafe-eval/.test(scriptSrc)) throw new Error(`${file}: script-src must not allow unsafe-inline/unsafe-eval`);
  if ((html.match(/<script\b[^>]*\bsrc=["']\/consent\.js["']/gi) ?? []).length !== 1) throw new Error(`${file}: expected exactly one /consent.js tag`);
  if (!/\/consent\.js["'][^>]*defer/i.test(head)) throw new Error(`${file}: /consent.js must be a deferred script in <head>`);
  for (const forbidden of [/googletagmanager\.com\/gtag\/js/i, /\/google-analytics-init\.js/i, /\/web-analytics\.js/i]) {
    if (forbidden.test(html)) throw new Error(`${file}: ${forbidden} must only be loaded by consent.js`);
  }
  const inline = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, attributes, body]) => !/\bsrc=/i.test(attributes) && !/type=["']application\/ld\+json["']/i.test(attributes) && body.trim());
  if (inline.length) throw new Error(`${file}: inline executable script is not allowed under the page CSP`);
}

let checked = 0;
let changed = 0;
for (const relativeRoot of ["public", "github-pages"]) {
  const root = path.join(ROOT, relativeRoot);
  for (const file of await htmlFiles(root)) {
    if (SKIPPED_PAGES.has(path.normalize(file))) continue;
    checked += 1;
    const original = await readFile(file, "utf8");
    let html = original;
    html = removeLegacyGoogleTag(html, file);
    html = normalizeTheme(html);
    html = normalizeCsp(html, path.normalize(file) === SPA_PAGE ? SPA_CSP : STATIC_CSP);
    html = normalizeConsentTag(html);
    assertCompliant(html, file);
    if (html !== original) {
      await writeFile(file, html, "utf8");
      changed += 1;
    }
  }
}

console.log(`Content instrumentation: consent-gated analytics (GA4 ${GA_ID} + first-party), unified CSP and theme-init verified on ${checked} HTML pages (${changed} updated).`);
