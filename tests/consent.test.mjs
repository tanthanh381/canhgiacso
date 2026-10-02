import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { after } from "node:test";
import { cookieNames, launchChromium, newInstrumentedContext, SITE_ORIGIN } from "./helpers/consent-harness.mjs";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

// ---------------------------------------------------------------- tĩnh: mã nguồn và đầu ra pipeline

test("consent.js keeps analytics behind explicit consent and exposes the public API", async () => {
  const source = await read("public/consent.js");
  assert.match(source, /cgs-consent-v1/);
  assert.match(source, /window\.CGSConsent = Object\.freeze\(\{ get, onChange, open \}\)/);
  assert.match(source, /globalPrivacyControl/);
  assert.match(source, /doNotTrack/);
  for (const flag of ["analytics_storage: 'denied'", "ad_storage: 'denied'", "ad_user_data: 'denied'", "ad_personalization: 'denied'"]) {
    assert.ok(source.includes(flag), `Consent Mode v2 default must include ${flag}`);
  }
  assert.match(source, /gtag\('consent', 'update', \{ analytics_storage: 'granted' \}\)/);
  assert.doesNotMatch(source, /ad_storage: 'granted'|ad_user_data: 'granted'|ad_personalization: 'granted'/);
  assert.match(source, /MAX_AGE_MS = 365 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(source, /role: 'region'/);
  assert.match(source, /Chấp nhận phân tích/);
  assert.match(source, /Từ chối/);
  assert.match(source, /\/quyen-rieng-tu\//);
});

test("GA4 init and first-party tracker refuse to run without consent", async () => {
  const [init, tracker, css] = await Promise.all([
    read("public/google-analytics-init.js"),
    read("public/web-analytics.js"),
    read("public/consent.css"),
  ]);
  assert.match(init, /CGSConsent/);
  assert.match(init, /G-HH04Q7FYHM/);
  assert.match(init, /allow_google_signals: false/);
  assert.match(init, /allow_ad_personalization_signals: false/);
  assert.match(tracker, /cgs-consent-v1/);
  assert.match(tracker, /initialConsent\.granted\) return/);
  assert.match(tracker, /doNotTrack/);
  assert.match(tracker, /function stop\(\)/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /@media print/);
});

test("every compiled page loads consent.js once, never loads analytics directly, and has a script-safe CSP", async () => {
  const { readdir, stat } = await import("node:fs/promises");
  const path = await import("node:path");
  const root = new URL("../", import.meta.url).pathname;
  async function htmlFiles(dir) {
    const out = [];
    for (const entry of await readdir(dir)) {
      const full = path.join(dir, entry);
      if ((await stat(full)).isDirectory()) out.push(...await htmlFiles(full));
      else if (entry.endsWith(".html")) out.push(full);
    }
    return out;
  }
  const files = [...await htmlFiles(path.join(root, "public")), path.join(root, "github-pages", "index.html")]
    .filter((file) => !file.endsWith(path.join("gioi-thieu", "hoat-hinh.html")));
  assert.ok(files.length >= 84, `expected at least 84 pages, found ${files.length}`);
  for (const file of files) {
    const html = await readFile(file, "utf8");
    const name = path.relative(root, file);
    assert.equal((html.match(/<script\b[^>]*src="\/consent\.js"[^>]*defer/g) ?? []).length, 1, `${name}: one deferred consent.js`);
    assert.doesNotMatch(html, /googletagmanager\.com\/gtag\/js|\/google-analytics-init\.js|\/web-analytics\.js/, `${name}: analytics must load only via consent.js`);
    const csp = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)"/)?.[1] ?? "";
    assert.ok(csp, `${name}: CSP meta`);
    assert.doesNotMatch(csp.match(/script-src[^;]*/)?.[0] ?? "", /unsafe-inline|unsafe-eval/, `${name}: script-src`);
    assert.doesNotMatch(html, /<script>[^<]*localStorage/, `${name}: no inline theme script`);
  }
});

test("instrumentation stage removes direct analytics tags and keeps the GA id guard", async () => {
  const stage = await read("scripts/instrument-content.mjs");
  assert.match(stage, /Unexpected Google tag/);
  assert.match(stage, /\/consent\.js/);
  assert.match(stage, /theme-init\.js/);
  assert.match(stage, /connect-src/);
  assert.match(stage, /https:\/\/www\.googletagmanager\.com/);
});

// ---------------------------------------------------------------- hành vi thật trong Chromium

const browser = await launchChromium();
const browserSkip = browser ? false : "Playwright/Chromium không khả dụng; bỏ qua test hành vi consent";
const PAGE = `${SITE_ORIGIN}/quyen-rieng-tu/`;
const CONSENT_KEY = "cgs-consent-v1";
const ANALYTICS_KEYS = ["canhgiacso-analytics-visitor-v1", "canhgiacso-analytics-session-v2"];

async function open(context) {
  const page = await context.newPage();
  await page.goto(PAGE, { waitUntil: "load" });
  return page;
}

const stored = (page, key) => page.evaluate((name) => window.localStorage.getItem(name), key);
const quiet = (ms = 700) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(condition, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (condition()) return;
    await quiet(50);
  }
  assert.fail("condition not met in time");
}

test("before consent: banner shows, no Google/Supabase request, no _ga cookie, no analytics identifiers", { skip: browserSkip }, async () => {
  const { context, log } = await newInstrumentedContext(browser);
  try {
    const page = await open(context);
    const banner = page.locator('section.cgs-consent[role="region"]');
    await banner.waitFor({ state: "visible" });
    assert.ok(await banner.getAttribute("aria-label"));

    const accept = banner.getByRole("button", { name: "Chấp nhận phân tích" });
    const reject = banner.getByRole("button", { name: "Từ chối" });
    const [a, r] = [await accept.boundingBox(), await reject.boundingBox()];
    assert.ok(a.height >= 44 && r.height >= 44, "buttons must be at least 44px tall");
    assert.ok(a.width >= 44 && r.width >= 44);
    assert.equal(Math.round(a.height), Math.round(r.height), "both choices must have equal prominence");
    const styles = await page.evaluate(() => [...document.querySelectorAll(".cgs-consent__btn:not(.cgs-consent__btn--quiet)")].map((node) => {
      const s = getComputedStyle(node);
      return [s.backgroundColor, s.color, s.fontSize, s.fontWeight].join("|");
    }));
    assert.equal(styles[0], styles[1], "accept and reject must be styled identically");
    assert.ok(Number.parseFloat(styles[0].split("|")[2]) >= 12);
    assert.ok(await banner.getByRole("link", { name: /Quyền riêng tư/ }).count());

    await quiet(1500);
    assert.deepEqual(log.google, [], "no request to Google before consent");
    assert.deepEqual(log.supabase, [], "no request to Supabase analytics before consent");
    assert.deepEqual(log.tracker, [], "analytics scripts must not even be requested before consent");
    assert.deepEqual(log.blocked, []);
    assert.deepEqual((await cookieNames(context)).filter((name) => name.startsWith("_ga")), []);
    for (const key of ANALYTICS_KEYS) assert.equal(await stored(page, key), null, key);
    assert.equal(await stored(page, CONSENT_KEY), null);
    assert.deepEqual(await page.evaluate(() => window.__cspViolations), []);
    assert.equal(await page.evaluate(() => typeof window.gtag), "undefined");
  } finally {
    await context.close();
  }
});

test("accept: Consent Mode v2 order, gtag + tracker load, identifiers appear, choice persists across reload", { skip: browserSkip }, async () => {
  const { context, log } = await newInstrumentedContext(browser);
  try {
    const page = await open(context);
    await page.getByRole("button", { name: "Chấp nhận phân tích" }).click();
    await page.waitForFunction(() => window.__gtagStubLoaded === true);
    await page.waitForFunction((keys) => keys.every((key) => window.localStorage.getItem(key)), ANALYTICS_KEYS);
    await page.waitForFunction(() => document.querySelector(".cgs-consent")?.hidden === true);

    const record = JSON.parse(await stored(page, CONSENT_KEY));
    assert.equal(record.analytics, true);
    assert.equal(record.v, 1);
    assert.ok(Number.isFinite(record.ts));
    assert.equal(log.google.filter((url) => url.includes("/gtag/js?id=G-HH04Q7FYHM")).length, 1);
    assert.ok(log.tracker.includes("/web-analytics.js") && log.tracker.includes("/google-analytics-init.js"));
    await until(() => log.supabase.some((entry) => entry.includes("/rest/v1/rpc/record_web_analytics_event_v4")));
    assert.ok((await cookieNames(context)).includes("_ga"));

    const layer = await page.evaluate(() => Array.from(window.dataLayer, (entry) => Array.from(entry)));
    assert.deepEqual(layer[0], ["consent", "default", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" }]);
    assert.deepEqual(layer[1], ["consent", "update", { analytics_storage: "granted" }]);
    assert.equal(layer[2][0], "js");
    assert.deepEqual(layer[3].slice(0, 2), ["config", "G-HH04Q7FYHM"]);
    assert.equal(layer[3][2].allow_google_signals, false);
    assert.equal(layer[3][2].allow_ad_personalization_signals, false);
    assert.ok(!layer.some((entry) => entry[0] === "consent" && Object.entries(entry[2] ?? {}).some(([key, value]) => key !== "analytics_storage" && value === "granted")), "ad_* must never be granted");
    assert.deepEqual(await page.evaluate(() => window.__cspViolations), []);

    const before = log.google.length;
    await page.reload({ waitUntil: "load" });
    await page.waitForFunction(() => window.__gtagStubLoaded === true);
    assert.equal(await page.locator("section.cgs-consent:visible").count(), 0, "banner must not return after a choice");
    assert.ok(log.google.length > before, "analytics loads again for a consenting visitor");
  } finally {
    await context.close();
  }
});

test("reject: nothing loads, choice persists and no banner on reload", { skip: browserSkip }, async () => {
  const { context, log } = await newInstrumentedContext(browser);
  try {
    const page = await open(context);
    await page.getByRole("button", { name: "Từ chối" }).click();
    assert.equal(JSON.parse(await stored(page, CONSENT_KEY)).analytics, false);
    await page.reload({ waitUntil: "load" });
    await quiet(1200);
    assert.equal(await page.locator("section.cgs-consent:visible").count(), 0);
    assert.deepEqual(log.google, []);
    assert.deepEqual(log.supabase, []);
    assert.deepEqual(log.tracker, []);
    assert.deepEqual((await cookieNames(context)).filter((name) => name.startsWith("_ga")), []);
    assert.equal(await page.evaluate(() => window.CGSConsent.get().analytics), false);
  } finally {
    await context.close();
  }
});

test("withdraw: cookies and identifiers are purged and the tracker stops sending", { skip: browserSkip }, async () => {
  const { context, log } = await newInstrumentedContext(browser);
  try {
    const page = await open(context);
    await page.getByRole("button", { name: "Chấp nhận phân tích" }).click();
    await page.waitForFunction((keys) => keys.every((key) => window.localStorage.getItem(key)), ANALYTICS_KEYS);
    assert.ok((await cookieNames(context)).includes("_ga"));

    const changes = await page.evaluate(() => {
      window.__changes = [];
      window.CGSConsent.onChange((state) => window.__changes.push(state.analytics));
      window.CGSConsent.open();
    });
    void changes;
    const banner = page.locator("section.cgs-consent");
    await banner.waitFor({ state: "visible" });
    assert.match(await banner.innerText(), /đã chấp nhận/);
    await banner.getByRole("button", { name: "Từ chối" }).click();
    await quiet(800);

    assert.deepEqual((await cookieNames(context)).filter((name) => name.startsWith("_ga")), []);
    for (const key of ANALYTICS_KEYS) assert.equal(await stored(page, key), null, key);
    assert.equal(JSON.parse(await stored(page, CONSENT_KEY)).analytics, false);
    assert.deepEqual(await page.evaluate(() => window.__changes), [false]);
    assert.equal(await page.evaluate(() => window["ga-disable-G-HH04Q7FYHM"]), true);

    const sent = log.supabase.length;
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
      history.pushState({}, "", "/quyen-rieng-tu/?after-withdraw=1");
    });
    await quiet(800);
    assert.equal(log.supabase.length, sent, "tracker must send nothing after withdrawal");
    for (const key of ANALYTICS_KEYS) assert.equal(await stored(page, key), null, `${key} must not be recreated`);
    assert.deepEqual((await cookieNames(context)).filter((name) => name.startsWith("_ga")), []);
  } finally {
    await context.close();
  }
});

test("Global Privacy Control counts as refusal without a blocking banner, but the user can still opt in", { skip: browserSkip }, async () => {
  const { context, log } = await newInstrumentedContext(browser, {
    init: () => Object.defineProperty(navigator, "globalPrivacyControl", { value: true, configurable: true }),
  });
  try {
    const page = await open(context);
    await quiet(1200);
    assert.equal(await page.locator("section.cgs-consent:visible").count(), 0, "no banner under GPC");
    assert.deepEqual(log.google, []);
    assert.deepEqual(log.supabase, []);
    const state = await page.evaluate(() => window.CGSConsent.get());
    assert.equal(state.analytics, false);
    assert.equal(state.decided, false);
    assert.equal(state.signal, "gpc");

    await page.locator("a[data-cgs-consent-footer]").click();
    const banner = page.locator("section.cgs-consent");
    await banner.waitFor({ state: "visible" });
    assert.match(await banner.innerText(), /Global Privacy Control/);
    await banner.getByRole("button", { name: "Chấp nhận phân tích" }).click();
    await page.waitForFunction(() => window.__gtagStubLoaded === true);
    await until(() => log.supabase.length > 0);
  } finally {
    await context.close();
  }
});

test("Do Not Track also suppresses the banner and analytics until the user chooses", { skip: browserSkip }, async () => {
  const { context, log } = await newInstrumentedContext(browser, {
    init: () => Object.defineProperty(navigator, "doNotTrack", { value: "1", configurable: true }),
  });
  try {
    const page = await open(context);
    await quiet(1000);
    assert.equal(await page.locator("section.cgs-consent:visible").count(), 0);
    assert.deepEqual(log.google, []);
    assert.deepEqual(log.supabase, []);
    assert.equal(await page.evaluate(() => window.CGSConsent.get().signal), "dnt");
  } finally {
    await context.close();
  }
});

test("expired or outdated consent is ignored and asked again without loading analytics", { skip: browserSkip }, async () => {
  for (const record of [
    { analytics: true, ts: Date.now() - 400 * 24 * 60 * 60 * 1000, v: 1 },
    { analytics: true, ts: Date.now(), v: 0 },
  ]) {
    const { context, log } = await newInstrumentedContext(browser, {
      init: `window.localStorage.setItem("cgs-consent-v1", ${JSON.stringify(JSON.stringify(record))}); window.localStorage.setItem("canhgiacso-analytics-visitor-v1", "legacy");`,
    });
    try {
      const page = await open(context);
      await page.locator("section.cgs-consent").waitFor({ state: "visible" });
      await quiet(1000);
      assert.deepEqual(log.google, []);
      assert.deepEqual(log.supabase, []);
      assert.equal(await page.evaluate(() => window.CGSConsent.get().analytics), false);
      assert.equal(await stored(page, "canhgiacso-analytics-visitor-v1"), null, "legacy identifiers are purged when consent is missing");
    } finally {
      await context.close();
    }
  }
});

test("legacy analytics cookies from before the banner are removed for visitors who have not consented", { skip: browserSkip }, async () => {
  const { context } = await newInstrumentedContext(browser);
  try {
    await context.addCookies([
      { name: "_ga", value: "GA1.1.1.1", domain: ".canhgiacso.com", path: "/", secure: true },
      { name: "_ga_HH04Q7FYHM", value: "GS2.1.s1", domain: ".canhgiacso.com", path: "/", secure: true },
    ]);
    const page = await open(context);
    await quiet(900);
    assert.deepEqual((await cookieNames(context)).filter((name) => name.startsWith("_ga")), []);
    assert.ok(page);
  } finally {
    await context.close();
  }
});

test("footer link opens settings, Escape closes them and the page keeps bottom space while the banner is open", { skip: browserSkip }, async () => {
  const { context } = await newInstrumentedContext(browser);
  try {
    const page = await open(context);
    await page.getByRole("button", { name: "Từ chối" }).click();
    const link = page.locator("a[data-cgs-consent-footer]");
    assert.equal((await link.count()), 1, "exactly one footer link");
    await link.click();
    const banner = page.locator("section.cgs-consent");
    await banner.waitFor({ state: "visible" });
    const padding = await page.evaluate(() => Number.parseFloat(getComputedStyle(document.body).paddingBottom));
    assert.ok(padding > 40, `body must reserve space for the banner (got ${padding})`);
    await page.keyboard.press("Escape");
    await banner.waitFor({ state: "hidden" });
    assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute("data-cgs-consent-footer")), true, "focus returns to the opener");
  } finally {
    await context.close();
  }
});

after(async () => {
  if (browser) await browser.close();
});
