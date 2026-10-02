import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

// Harness dùng chung cho test hành vi consent: chạy Chromium thật, phục vụ thư mục public/ như https://canhgiacso.com
// bằng page.route (không cần mạng, không chạm Google/Supabase thật) và ghi lại mọi request ra ngoài.

export const SITE_ORIGIN = "https://canhgiacso.com";
const PUBLIC_ROOT = resolve(process.env.CONSENT_SITE_ROOT || new URL("../../public", import.meta.url).pathname);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

export async function loadPlaywright() {
  const candidates = [
    process.env.PLAYWRIGHT_MODULE,
    "playwright",
    "playwright-core",
    "/opt/npm-tools/node_modules/playwright/index.mjs",
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const specifier = candidate.startsWith("/") ? pathToFileURL(candidate).href : candidate;
      const loaded = await import(specifier);
      const chromium = loaded.chromium ?? loaded.default?.chromium;
      if (chromium) return chromium;
    } catch {
      // thử ứng viên tiếp theo
    }
  }
  return null;
}

export async function launchChromium() {
  const chromium = await loadPlaywright();
  if (!chromium) return null;
  try {
    return await chromium.launch({ headless: true });
  } catch {
    return null;
  }
}

function resolvePublicFile(urlPath) {
  const clean = decodeURIComponent((urlPath || "/").split("?")[0].split("#")[0]);
  const relative = normalize(clean).replace(/^([/\\])+/, "");
  let candidate = resolve(PUBLIC_ROOT, relative || ".");
  if (candidate !== PUBLIC_ROOT && !candidate.startsWith(PUBLIC_ROOT + sep)) return null;
  if (existsSync(candidate) && statSync(candidate).isDirectory()) candidate = join(candidate, "index.html");
  if (!existsSync(candidate) && !extname(candidate)) candidate = join(candidate, "index.html");
  return existsSync(candidate) && statSync(candidate).isFile() ? candidate : null;
}

// GA giả: tạo cookie _ga* giống gtag.js thật khi được tải, để kiểm tra việc dọn dẹp khi rút lại đồng ý.
const GTAG_STUB = `
window.__gtagStubLoaded = true;
document.cookie = "_ga=GA1.1.111.222; path=/; domain=.canhgiacso.com; max-age=34128000";
document.cookie = "_ga_HH04Q7FYHM=GS2.1.s1; path=/; domain=.canhgiacso.com; max-age=34128000";
`;

export async function newInstrumentedContext(browser, { init, locale = "vi-VN" } = {}) {
  const context = await browser.newContext({ locale, viewport: { width: 1280, height: 720 } });
  const log = { all: [], google: [], supabase: [], tracker: [], blocked: [], violations: [] };
  if (init) await context.addInitScript(init);
  await context.addInitScript(() => {
    window.__cspViolations = [];
    document.addEventListener("securitypolicyviolation", (event) => {
      window.__cspViolations.push(`${event.violatedDirective} ${event.blockedURI}`);
    });
  });

  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    log.all.push(`${request.method()} ${request.url()}`);
    if (url.origin === SITE_ORIGIN) {
      if (url.pathname === "/web-analytics.js" || url.pathname === "/google-analytics-init.js") log.tracker.push(url.pathname);
      const file = resolvePublicFile(url.pathname);
      if (!file) {
        const notFound = resolvePublicFile("/404.html");
        await route.fulfill({ status: 404, contentType: TYPES[".html"], body: notFound ? readFileSync(notFound) : "Not found" });
        return;
      }
      await route.fulfill({ status: 200, contentType: TYPES[extname(file)] ?? "application/octet-stream", body: readFileSync(file) });
      return;
    }
    if (url.hostname === "www.googletagmanager.com") {
      log.google.push(request.url());
      await route.fulfill({ status: 200, contentType: TYPES[".js"], body: GTAG_STUB });
      return;
    }
    if (/(^|\.)google-analytics\.com$|^analytics\.google\.com$|^www\.google\.com$/.test(url.hostname)) {
      log.google.push(request.url());
      await route.fulfill({ status: 204, body: "" });
      return;
    }
    if (url.hostname === "goietwyapiywrtibpkwo.supabase.co") {
      log.supabase.push(`${request.method()} ${url.pathname}`);
      await route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" }, body: "null" });
      return;
    }
    log.blocked.push(request.url());
    await route.abort();
  });

  return { context, log };
}

export async function cookieNames(context) {
  return (await context.cookies(SITE_ORIGIN)).map((cookie) => cookie.name);
}
