// Trang xác minh chứng nhận (/xac-minh-chung-chi/), hợp đồng RPC công khai và làm sạch URL gửi GA4.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("trang xác minh là HTML tĩnh do pipeline sinh, không script/style nội tuyến và CSP chỉ cho phép Supabase hiện có", async () => {
  const [html, generator, architecture, sitemap] = await Promise.all([
    read("public/xac-minh-chung-chi/index.html"),
    read("scripts/patch-seo-authority-wave6.mjs"),
    read("content/content-architecture.json"),
    read("public/sitemap.xml"),
  ]);
  // Nguồn của trang nằm trong generator của pipeline (không chỉnh tay HTML sinh ra).
  assert.match(generator, /xac-minh-chung-chi\/index\.html/);
  assert.ok(JSON.parse(architecture).phases.flatMap((phase) => phase.stages).includes("patch-seo-authority-wave6.mjs"));
  assert.match(sitemap, /<loc>https:\/\/canhgiacso\.com\/xac-minh-chung-chi\/<\/loc>/);

  // Không có script thực thi nội tuyến, không có thuộc tính style/on*.
  const inlineScripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, attributes, body]) => !/\bsrc=/i.test(attributes) && !/application\/ld\+json/i.test(attributes) && body.trim());
  assert.deepEqual(inlineScripts, []);
  assert.doesNotMatch(html, /<style\b/i);
  assert.doesNotMatch(html, /\sstyle=/i);
  assert.doesNotMatch(html, /\son[a-z]+=/i);
  assert.match(html, /<script src="\/verify-certificate\.js" defer><\/script>/);
  assert.match(html, /<link rel="stylesheet" href="\/verify-certificate\.css" \/>/);

  const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1] ?? "";
  assert.match(csp, /script-src 'self' https:\/\/www\.googletagmanager\.com/);
  assert.doesNotMatch(csp.match(/script-src[^;]*/)[0], /unsafe-inline|unsafe-eval/);
  const connect = csp.match(/connect-src ([^;]*)/)[1].split(" ");
  assert.ok(connect.includes("https://goietwyapiywrtibpkwo.supabase.co"), "đã có Supabase trong connect-src");
  assert.equal(csp.match(/default-src ([^;]*)/)[1], "'self'");
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /form-action 'self'/);

  assert.match(html, /<h1>Xác minh chứng nhận<\/h1>/);
  assert.match(html, /id="verify-form"/);
  assert.match(html, /id="verify-result"[^>]*aria-live="polite"/);
  assert.match(html, /<label for="verify-code">/);
});

test("khóa và địa chỉ Supabase của trang xác minh trùng với ứng dụng", async () => {
  const [script, app] = await Promise.all([read("public/verify-certificate.js"), read("app/supabase.ts")]);
  for (const pattern of [/https:\/\/[a-z0-9]+\.supabase\.co/, /sb_publishable_[A-Za-z0-9_-]+/]) {
    assert.equal(script.match(pattern)?.[0], app.match(pattern)?.[0]);
  }
  assert.doesNotMatch(script, /service_role|sb_secret_/);
  assert.match(script, /\/rest\/v1\/rpc\/verify_training_certificate/);
  assert.doesNotMatch(script, /innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function/);
});

test("logic trang xác minh: chuẩn hóa mã, phân loại định dạng và hiểu phản hồi tối thiểu", () => {
  const sandbox = { module: { exports: {} } };
  vm.runInNewContext(readFileSync(new URL("../public/verify-certificate.js", import.meta.url), "utf8"), sandbox);
  const { normalizeCode, classifyCode, formatDate } = sandbox.module.exports;
  // Đối tượng sinh ra trong vm có Object.prototype khác realm: chuẩn hóa trước khi so sánh sâu.
  const interpretResponse = (...args) => JSON.parse(JSON.stringify(sandbox.module.exports.interpretResponse(...args)));
  assert.equal(normalizeCode("  cgs-2026-0123 4567 89abcdef\n"), "CGS-2026-0123456789ABCDEF");
  assert.equal(normalizeCode(null), "");
  assert.equal(classifyCode(""), "empty");
  assert.equal(classifyCode("HELLO"), "format");
  assert.equal(classifyCode("CGS-2026-XYZ"), "format");
  assert.equal(classifyCode("CGS-2026-0123456789"), "candidate", "mã cũ 10 ký tự hex");
  assert.equal(classifyCode("CGS-2026-0123456789ABCDEF"), "candidate", "mã mới 16 ký tự hex");
  assert.equal(classifyCode("CGS-GUEST-AB12CD"), "guest");
  assert.equal(classifyCode(`CGS-2026-${"A".repeat(60)}`), "format");
  assert.equal(formatDate("2026-10-03"), "03/10/2026");
  assert.equal(formatDate("hôm nay"), "");

  assert.deepEqual(
    interpretResponse(200, { valid: true, name: "N*** V***", issuedOn: "2026-10-03", rating: "XUẤT SẮC", accuracy: 95, scenarioTotal: 40, completed: 40, email: "kẻ.xấu@x.vn", userId: "u" }),
    { state: "valid", name: "N*** V***", issuedOn: "03/10/2026", rating: "XUẤT SẮC", accuracy: 95, completed: 40, scenarioTotal: 40 },
    "trường lạ do máy chủ trả về (nếu có) không bao giờ được hiển thị",
  );
  assert.deepEqual(interpretResponse(200, { valid: false }), { state: "invalid" });
  assert.deepEqual(interpretResponse(200, { valid: false, kind: "guest" }), { state: "guest" });
  assert.deepEqual(interpretResponse(429, { code: "PGRST", message: "rate limit" }), { state: "rate-limited" });
  assert.deepEqual(interpretResponse(500, null), { state: "error" });
  assert.deepEqual(interpretResponse(200, null), { state: "error" });
});

// Chạy google-analytics-init.js trong sandbox với window/document giả để quan sát cấu hình gửi cho gtag.
function runAnalyticsInit({ href, referrer = "" }) {
  const calls = [];
  const url = new URL(href);
  const window = {
    location: { href, origin: url.origin, pathname: url.pathname },
    CGSConsent: { get: () => ({ analytics: true }) },
    dataLayer: [],
  };
  window.gtag = (...args) => calls.push(args);
  const sandbox = { window, document: { referrer }, URL, URLSearchParams, Date };
  vm.runInNewContext(readFileSync(new URL("../public/google-analytics-init.js", import.meta.url), "utf8"), sandbox);
  return calls.find(([command]) => command === "config")?.[2];
}

test("GA4 không nhận token/mã nhạy cảm trong URL hay trang giới thiệu", () => {
  const recovery = runAnalyticsInit({ href: "https://canhgiacso.com/#access_token=AAA.BBB&refresh_token=rrr&type=recovery" });
  assert.equal(recovery.page_location, "https://canhgiacso.com/");
  assert.doesNotMatch(JSON.stringify(recovery), /AAA|rrr|access_token/);

  const authError = runAnalyticsInit({ href: "https://canhgiacso.com/?error=access_denied&error_code=otp_expired#error=access_denied&error_code=otp_expired" });
  assert.equal(authError.page_location, "https://canhgiacso.com/");

  const certificate = runAnalyticsInit({ href: "https://canhgiacso.com/xac-minh-chung-chi/?code=CGS-2026-0123456789ABCDEF&utm_source=qr&utm_medium=print" });
  assert.equal(certificate.page_location, "https://canhgiacso.com/xac-minh-chung-chi/?utm_source=qr&utm_medium=print");
  assert.doesNotMatch(JSON.stringify(certificate), /CGS-2026/);

  const referred = runAnalyticsInit({ href: "https://canhgiacso.com/lien-he/", referrer: "https://canhgiacso.com/xac-minh-chung-chi/?code=CGS-2026-0123456789ABCDEF" });
  assert.equal(referred.page_referrer, "https://canhgiacso.com/xac-minh-chung-chi/");
  assert.equal(referred.page_location, undefined, "URL sạch giữ nguyên mặc định của GA4");

  // Trang và tuyến đường SPA bình thường không bị đổi hành vi.
  for (const href of ["https://canhgiacso.com/", "https://canhgiacso.com/kien-thuc/", "https://canhgiacso.com/#/game", "https://canhgiacso.com/?utm_source=x#/quiz"]) {
    assert.equal("page_location" in runAnalyticsInit({ href }), false, `${href} không bị ghi đè`);
  }
  const base = runAnalyticsInit({ href: "https://canhgiacso.com/" });
  assert.equal(base.allow_google_signals, false);
  assert.equal(base.allow_ad_personalization_signals, false);
});
