import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readText = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");
const readBinary = (file) => readFile(new URL(`../${file}`, import.meta.url));

test("homepage points Google Search to a stable visible favicon", async () => {
  const home = await readText("github-pages/index.html");
  assert.match(home, /<link rel="icon" type="image\/png" sizes="96x96" href="\/favicon\.png\?v=20260924" \/>/);
  assert.match(home, /<link rel="apple-touch-icon" href="\/favicon\.png\?v=20260924" \/>/);
  assert.doesNotMatch(home, /rel="icon"[^>]*khien-so-logo\.png/);
});

test("favicon asset is a square PNG larger than Google's recommended minimum", async () => {
  const favicon = await readBinary("public/favicon.png");
  assert.equal(favicon.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  const width = favicon.readUInt32BE(16);
  const height = favicon.readUInt32BE(20);
  assert.equal(width, height);
  assert.ok(width >= 48);
});

test("content finalizer normalizes every indexable page to the same favicon URL", async () => {
  const finalizer = await readText("scripts/finalize-content-architecture.mjs");
  assert.match(finalizer, /function normalizeFavicon/);
  assert.match(finalizer, /href="\/favicon\.png\?v=20260924"/);
  assert.match(finalizer, /sizes="96x96"/);
});

test("SEO audit rejects favicon regressions", async () => {
  const audit = await readText("scripts/seo-audit.mjs");
  assert.match(audit, /favicon must use stable \/favicon\.png\?v=20260924/);
  assert.match(audit, /favicon\.png must be square/);
  assert.match(audit, /at least 48x48/);
});
