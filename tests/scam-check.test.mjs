import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

await import("../public/scam-check.js");
const SC = globalThis.ScamCheck;

test("detects the input type", () => {
  assert.equal(SC.detectType("a@b.vn"), "email");
  assert.equal(SC.detectType("8.8.8.8"), "ip");
  assert.equal(SC.detectType("2001:db8::1"), "ip");
  assert.equal(SC.detectType("+84 912 345 678"), "phone");
  assert.equal(SC.detectType("hdbank.com.vn/abc"), "url");
});

test("flags brand impersonation and lookalike domains but not the official domain", () => {
  const fake = SC.analyzeUrl("http://hdbank-xacminh.top/login");
  assert.ok(fake.score >= 60, "fake bank link should be high risk");
  assert.ok(SC.analyzeUrl("https://hdbamk.com.vn").findings.some((f) => f.includes("gần giống")));
  const real = SC.analyzeUrl("https://www.hdbank.com.vn/vi");
  assert.equal(real.score, 0);
  assert.ok(real.notes.length > 0);
});

test("flags government impersonation, IP hosts, apk downloads and shorteners", () => {
  assert.ok(SC.analyzeUrl("https://dichvucong-xacthuc.com").score >= 40);
  assert.ok(SC.analyzeUrl("http://103.1.2.3/app.apk").score >= 60);
  assert.ok(SC.analyzeUrl("https://bit.ly/x").score >= 20);
  assert.equal(SC.analyzeUrl("https://dichvucong.gov.vn").score, 0);
});

test("rejects text that is not a link", () => {
  assert.equal(SC.analyzeUrl("0123").invalid, true);
  assert.equal(SC.analyzeUrl("ftp://x.com").invalid, true);
});

test("normalizes and validates Vietnamese phone numbers", () => {
  assert.equal(SC.normalizePhone("+84 912 345 678").national, "0912345678");
  assert.equal(SC.normalizePhone("0084912345678").national, "0912345678");
  assert.equal(SC.analyzePhone("0912.345.678").score, 0);
  assert.ok(SC.analyzePhone("+855 12 345 678").score >= 30);
  assert.ok(SC.analyzePhone("0412345678").score >= 30);
  assert.equal(SC.analyzePhone("02812345678").score, 0);
});

test("flags impersonating and disposable emails", () => {
  assert.ok(SC.analyzeEmail("hdbank.hotro@gmail.com").score >= 40);
  assert.ok(SC.analyzeEmail("x@mailinator.com").score >= 30);
  assert.ok(SC.analyzeEmail("cskh@hdbank-vn.top").score >= 60);
  assert.equal(SC.analyzeEmail("nguyenvan@gmail.com").score, 0);
  assert.equal(SC.analyzeEmail("not-an-email").invalid, true);
});

test("classifies IP addresses and CIDR membership", () => {
  assert.equal(SC.analyzeIp("192.168.1.10").local, true);
  assert.equal(SC.analyzeIp("8.8.8.8").local, undefined);
  assert.equal(SC.analyzeIp("999.1.1.1").invalid, true);
  assert.equal(SC.ipv4InCidr("1.10.20.5", "1.10.16.0/20"), true);
  assert.equal(SC.ipv4InCidr("1.10.40.5", "1.10.16.0/20"), false);
});

test("a clean result is never labelled as safe", () => {
  assert.equal(SC.LEVELS.none, "Chưa phát hiện dấu hiệu");
  assert.ok(!Object.values(SC.LEVELS).some((label) => /an toàn/i.test(label)));
});

test("feed lookup matches hashed entries and degrades when the feed is missing", async () => {
  const url = SC.normalizeUrlInput("http://evil.example/payload.exe");
  const key = await SC.feedKey(`u:${SC.feedUrlKey(url)}`);
  const hostKey = await SC.feedKey("h:evil.example");
  const files = {
    "meta.json": { generatedAt: "2026-10-04T00:00:00Z", sources: [] },
    [`s/${key.slice(0, 2)}.json`]: { u: { [key]: "uh" }, h: {} },
    [`s/${hostKey.slice(0, 2)}.json`]: { u: {}, h: { [hostKey]: "uh" } },
  };
  const fetchImpl = async (target) => {
    const name = target.replace("/td/", "");
    if (name in files) return { ok: true, json: async () => files[name] };
    return { ok: true, json: async () => ({ u: {}, h: {} }) };
  };
  const hit = await SC.analyze("http://evil.example/payload.exe", { feed: SC.createFeed("/td", fetchImpl) });
  assert.equal(hit.level, "high");
  assert.equal(hit.feed.matched, true);
  const down = await SC.analyze("https://example.org", { feed: SC.createFeed("/td", async () => ({ ok: false })) });
  assert.equal(down.feed.available, false);
  assert.equal(down.level, "none");
});

test("scam check page, edge function and pipeline stay wired together", async () => {
  const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");
  const [page, fn, pkg, ui] = await Promise.all([
    read("public/cong-cu/kiem-tra-lua-dao/index.html"),
    read("supabase/functions/scam-analyze/index.ts"),
    read("package.json"),
    read("public/scam-check-ui.js"),
  ]);
  assert.match(page, /<h1>Kiểm tra lừa đảo: link, số điện thoại, email, IP<\/h1>/);
  assert.match(page, /scam-check-ui\.js/);
  assert.match(page, /Miễn trừ trách nhiệm/);
  assert.match(pkg, /"build:pages": "[^"]*build-threat-feed\.mjs/);
  assert.match(fn, /is_anonymous/);
  assert.match(fn, /consume_scam_check_quota/);
  assert.match(fn, /AI_API_KEY/);
  assert.doesNotMatch(fn, /OLLAMA/);
  assert.doesNotMatch(ui, /innerHTML/);
});
