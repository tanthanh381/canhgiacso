import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SUPABASE_ORIGINS = "https://goietwyapiywrtibpkwo.supabase.co wss://goietwyapiywrtibpkwo.supabase.co";
const TRACKER_TAG = '<script src="/web-analytics.js" defer></script>';
const GA_ID = "G-HH04Q7FYHM";
const GTAG_URL = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
const GOOGLE_TAG = `<!-- Google tag (gtag.js) -->\n  <script async src="${GTAG_URL}"></script>\n  <script src="/google-analytics-init.js"></script>`;

const CSP_ORIGINS = {
  "script-src": ["https://www.googletagmanager.com"],
  "connect-src": [
    "https://www.google-analytics.com",
    "https://www.google.com",
    "https://analytics.google.com",
    "https://region1.google-analytics.com",
    "https://www.googletagmanager.com",
  ],
  "img-src": [
    "https://www.google-analytics.com",
    "https://www.googletagmanager.com",
  ],
};

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

function ensureCspOrigin(html, directive, origins) {
  const pattern = new RegExp(`${directive}([^;]*);`, "g");
  return html.replace(pattern, (_match, rest) => {
    const missing = origins.filter((origin) => !rest.includes(origin));
    return `${directive}${rest}${missing.length ? ` ${missing.join(" ")}` : ""};`;
  });
}

function ensureCsp(html) {
  let next = html;
  next = ensureCspOrigin(next, "connect-src", SUPABASE_ORIGINS.split(" "));
  for (const [directive, origins] of Object.entries(CSP_ORIGINS)) {
    next = ensureCspOrigin(next, directive, origins);
  }
  return next;
}

function gaMatches(html) {
  return [...html.matchAll(/https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=([A-Za-z0-9_-]+)/g)];
}

function ensureGa(html, file) {
  const matches = gaMatches(html);
  if (matches.length > 1) throw new Error(`Multiple Google tags found in ${file}`);
  if (matches.length === 1 && matches[0][1] !== GA_ID) {
    throw new Error(`Unexpected Google tag ${matches[0][1]} found in ${file}`);
  }
  let next = html;
  if (!matches.length) {
    const cspMeta = next.match(/<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*>/i);
    next = cspMeta
      ? next.replace(cspMeta[0], `${cspMeta[0]}\n  ${GOOGLE_TAG}`)
      : next.replace(/<head>/i, `<head>\n  ${GOOGLE_TAG}`);
  }
  if (!next.includes('/google-analytics-init.js')) {
    throw new Error(`Missing GA4 initializer in ${file}`);
  }
  return next;
}

function ensureFirstPartyTracker(html) {
  if (html.includes('/web-analytics.js')) return html;
  if (html.includes('</body>')) return html.replace('</body>', `  ${TRACKER_TAG}\n</body>`);
  return html.replace('</head>', `  ${TRACKER_TAG}\n</head>`);
}

let checked = 0;
let changed = 0;
for (const relativeRoot of ["public", "github-pages"]) {
  const root = path.join(ROOT, relativeRoot);
  for (const file of await htmlFiles(root)) {
    checked += 1;
    let html = await readFile(file, "utf8");
    const before = html;
    html = ensureCsp(html);
    html = ensureFirstPartyTracker(html);
    html = ensureGa(html, file);
    if (html !== before) {
      await writeFile(file, html, "utf8");
      changed += 1;
    }
  }
}

console.log(`Content instrumentation: first-party analytics + GA4 ${GA_ID} verified on ${checked} HTML pages (${changed} updated).`);
