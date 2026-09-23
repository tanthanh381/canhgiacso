import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("SEO authority wave adds trust pages and reconciles sitemap coverage", async () => {
  const script = await read("scripts/patch-seo-authority-wave6.mjs");
  assert.match(script, /gioi-thieu\/index\.html/);
  assert.match(script, /quyen-rieng-tu\/index\.html/);
  assert.match(script, /publishingPrinciples/);
  assert.match(script, /seo-footer-links/);
  assert.match(script, /generated article missing from sitemap|ensureUrl/);
});

test("Pages build runs SEO authority wave after QC content passes", async () => {
  const pkg = JSON.parse(await read("package.json"));
  const build = pkg.scripts["build:pages"];
  assert.match(build, /patch-qc-wave3\.mjs/);
  assert.match(build, /patch-seo-authority-wave6\.mjs/);
  assert.ok(build.indexOf("patch-qc-wave3.mjs") < build.indexOf("patch-seo-authority-wave6.mjs"));
  assert.ok(build.indexOf("patch-seo-authority-wave6.mjs") < build.indexOf("patch-realtime-analytics.mjs"));
});

test("Verify workflow enforces generated-site SEO audit", async () => {
  const workflow = await read(".github/workflows/verify.yml");
  assert.match(workflow, /pnpm run build:pages/);
  assert.match(workflow, /pnpm run seo:audit/);
  assert.ok(workflow.indexOf("pnpm run build:pages") < workflow.indexOf("pnpm run seo:audit"));
});

test("Homepage exposes trust links and publishing principles", async () => {
  const home = await read("github-pages/index.html");
  assert.match(home, /publishingPrinciples/);
  assert.match(home, /\/gioi-thieu\//);
  assert.match(home, /\/phuong-phap-kiem-chung\//);
  assert.match(home, /\/quyen-rieng-tu\//);
});
