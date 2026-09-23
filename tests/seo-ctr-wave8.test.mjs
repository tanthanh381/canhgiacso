import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("SEO CTR Wave 8 runs after intent shaping and before analytics", async () => {
  const pkg = JSON.parse(await read("package.json"));
  const build = pkg.scripts["build:pages"];
  assert.match(build, /patch-seo-intent-wave7\.mjs/);
  assert.match(build, /patch-seo-ctr-wave8\.mjs/);
  assert.match(build, /patch-content-growth-wave9\.mjs/);
  assert.match(build, /patch-realtime-analytics\.mjs/);
  assert.ok(build.indexOf("patch-seo-intent-wave7.mjs") < build.indexOf("patch-seo-ctr-wave8.mjs"));
  assert.ok(build.indexOf("patch-seo-ctr-wave8.mjs") < build.indexOf("patch-content-growth-wave9.mjs"));
  assert.ok(build.indexOf("patch-content-growth-wave9.mjs") < build.indexOf("patch-realtime-analytics.mjs"));
});

test("Wave 8 fixes count-to-content mismatches in SERP promises", async () => {
  const script = await read("scripts/patch-seo-ctr-wave8.mjs");
  assert.match(script, /Giả mạo ngân hàng: 6 dấu hiệu và cách xử lý an toàn/);
  assert.match(script, /Bị lừa chuyển tiền phải làm gì\? 5 bước cần làm ngay/);
  assert.doesNotMatch(script, /Giả mạo ngân hàng: 8 dấu hiệu/);
  assert.doesNotMatch(script, /Bị lừa chuyển tiền phải làm gì\? 7 bước/);
});

test("Wave 8 keeps priority titles aligned to high-intent queries", async () => {
  const script = await read("scripts/patch-seo-ctr-wave8.mjs");
  for (const phrase of [
    "Kiểm tra số điện thoại lừa đảo: 7 cách tra cứu số lạ",
    "Kiểm tra link lừa đảo: 6 dấu hiệu trước khi bấm",
    "Lừa đảo cộng tác viên online: Dấu hiệu cần dừng ngay",
    "Giả mạo ngân hàng: 6 dấu hiệu và cách xử lý an toàn",
    "Bị lừa chuyển tiền phải làm gì? 5 bước cần làm ngay",
    "Phishing là gì? 8 dấu hiệu và cách phòng tránh",
  ]) assert.ok(script.includes(phrase), `missing CTR title hypothesis: ${phrase}`);
});

test("Wave 8 adds freshness, answer-first copy and contextual ranking links", async () => {
  const script = await read("scripts/patch-seo-ctr-wave8.mjs");
  assert.match(script, /article:modified_time/);
  assert.match(script, /name="author"/);
  assert.match(script, /seo-answer-box/);
  assert.match(script, /seo-search-cluster/);
  assert.match(script, /data-seo-wave8/);
  assert.match(script, /<time datetime=/);
});

test("SEO audit enforces CTR readiness on priority pages", async () => {
  const audit = await read("scripts/seo-audit.mjs");
  assert.match(audit, /prioritySerpChecks/);
  assert.match(audit, /priority SERP title length/);
  assert.match(audit, /priority SERP description length/);
  assert.match(audit, /missing answer-first block/);
  assert.match(audit, /missing contextual search cluster/);
  assert.match(audit, /missing article:modified_time/);
  assert.match(audit, /missing visible updated date/);
});

test("Phase 3 baseline records the data limitation and measurable starting point", async () => {
  const baseline = JSON.parse(await read("seo/phase3-baseline.json"));
  assert.equal(baseline.phase, "Phase 3 - CTR & Ranking Optimization");
  assert.equal(baseline.searchConsole.status, "unavailable");
  assert.equal(baseline.firstPartyWindowDays, 30);
  assert.equal(baseline.priorityPages.length, 6);
  assert.ok(baseline.optimizationHypotheses.length >= 5);
});
