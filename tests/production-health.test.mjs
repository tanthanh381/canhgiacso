import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("production health probes canonical public entry points without secrets", async () => {
  const health = await read("scripts/production-health.mjs");
  for (const path of ["/", "/kien-thuc/", "/cong-cu/", "/sitemap.xml", "/robots.txt"]) {
    assert.ok(health.includes(`path: "${path}"`), `missing health path ${path}`);
  }
  assert.match(health, /AbortController/);
  assert.match(health, /HEALTH_TIMEOUT_MS/);
  assert.doesNotMatch(health, /SUPABASE_SECRET|service_role|password|Authorization/i);
});

test("production health runs on schedule and after Pages deployment", async () => {
  const [scheduled, pages, pkg] = await Promise.all([
    read(".github/workflows/production-health.yml"),
    read(".github/workflows/pages.yml"),
    read("package.json"),
  ]);
  assert.match(scheduled, /cron: "17 \*\/6 \* \* \*"/);
  assert.match(scheduled, /node scripts\/production-health\.mjs/);
  assert.match(pages, /production-health:/);
  assert.match(pages, /needs: deploy/);
  assert.match(pages, /Verify production after deployment/);
  assert.equal(JSON.parse(pkg).scripts["health:production"], "node scripts/production-health.mjs");
});
