import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const GA_ID = "G-HH04Q7FYHM";
const GTAG_URL = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
const GOOGLE_TAG = `<!-- Google tag (gtag.js) -->\n  <script async src="${GTAG_URL}"></script>\n  <script src="/google-analytics-init.js"></script>`;

const CSP_ORIGINS = {
  "script-src": ["https://www.googletagmanager.com"],
  "connect-src": [
    "https://www.google-analytics.com",
    "https://analytics.google.com",
    "https://region1.google-analytics.com",
    "https://www.googletagmanager.com",
  ],
  "img-src": [
    "https://www.google-analytics.com",
    "https://www.googletagmanager.com",
  ],
};

function ensureCspOrigins(html) {
  let next = html;
  for (const [directive, origins] of Object.entries(CSP_ORIGINS)) {
    const pattern = new RegExp(`${directive}([^;]*);`, "g");
    next = next.replace(pattern, (_match, rest) => {
      const missing = origins.filter((origin) => !rest.includes(origin));
      return `${directive}${rest}${missing.length ? ` ${missing.join(" ")}` : ""};`;
    });
  }
  return next;
}

function tagMatches(html) {
  return [...html.matchAll(/https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=([^"'&<>\\s]+)/g)];
}

function injectGoogleTag(html, file) {
  const matches = tagMatches(html);
  if (matches.length > 1) {
    throw new Error(`Multiple Google tags found in ${file}`);
  }
  if (matches.length === 1) {
    if (matches[0][1] !== GA_ID) {
      throw new Error(`Unexpected Google tag ${matches[0][1]} found in ${file}`);
    }
    return html;
  }

  const cspMeta = html.match(/<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*>/i);
  if (cspMeta) {
    return html.replace(cspMeta[0], `${cspMeta[0]}\n  ${GOOGLE_TAG}`);
  }
  return html.replace(/<head>/i, `<head>\n  ${GOOGLE_TAG}`);
}

function validateGoogleTag(html, file) {
  const matches = tagMatches(html);
  if (matches.length !== 1 || matches[0][1] !== GA_ID) {
    throw new Error(`Expected exactly one Google tag ${GA_ID} in ${file}, found ${matches.length}`);
  }
  if (!html.includes('/google-analytics-init.js')) {
    throw new Error(`Missing GA4 initializer in ${file}`);
  }
}

async function patchHtml(file) {
  let html = await readFile(file, "utf8");
  const before = html;
  html = ensureCspOrigins(html);
  html = injectGoogleTag(html, file);
  validateGoogleTag(html, file);
  if (html !== before) await writeFile(file, html, "utf8");
  return html !== before;
}

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

let checked = 0;
let changed = 0;
for (const relativeRoot of ["public", "github-pages"]) {
  const root = path.join(ROOT, relativeRoot);
  for (const file of await htmlFiles(root)) {
    checked += 1;
    if (await patchHtml(file)) changed += 1;
  }
}

console.log(`GA4 ${GA_ID} ensured exactly once on ${checked} HTML pages (${changed} updated).`);
