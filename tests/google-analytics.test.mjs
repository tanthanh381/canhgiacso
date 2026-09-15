import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("GA4 uses the configured measurement id", async () => {
  const init = await read("public/google-analytics-init.js");
  assert.match(init, /G-HH04Q7FYHM/);
  assert.match(init, /window\.gtag\("config", "G-HH04Q7FYHM"\)/);
});

test("GA4 injector patches CSP and rejects duplicate Google tags", async () => {
  const patch = await read("scripts/patch-google-analytics.mjs");
  assert.match(patch, /https:\/\/www\.googletagmanager\.com/);
  assert.match(patch, /https:\/\/www\.google-analytics\.com/);
  assert.match(patch, /https:\/\/analytics\.google\.com/);
  assert.match(patch, /https:\/\/region1\.google-analytics\.com/);
  assert.match(patch, /Multiple Google tags found/);
  assert.match(patch, /Expected exactly one Google tag/);
});

test("Pages build installs GA4 after the first-party analytics/CSP patch", async () => {
  const pkg = JSON.parse(await read("package.json"));
  const pages = pkg.scripts["build:pages"];
  const prepare = pkg.scripts["prepare:analytics"];
  assert.match(pages, /patch-realtime-analytics\.mjs/);
  assert.match(pages, /patch-google-analytics\.mjs/);
  assert.ok(pages.indexOf("patch-realtime-analytics.mjs") < pages.indexOf("patch-google-analytics.mjs"));
  assert.match(prepare, /patch-google-analytics\.mjs/);
});
