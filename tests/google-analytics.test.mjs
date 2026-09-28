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
  const patch = await read("scripts/instrument-content.mjs");
  assert.match(patch, /https:\/\/www\.googletagmanager\.com/);
  assert.match(patch, /https:\/\/www\.google-analytics\.com/);
  assert.match(patch, /https:\/\/www\.google\.com/);
  assert.match(patch, /https:\/\/analytics\.google\.com/);
  assert.match(patch, /https:\/\/region1\.google-analytics\.com/);
  assert.match(patch, /Multiple Google tags found/);
  assert.match(patch, /Unexpected Google tag/);
});

test("Content compiler installs GA4 and first-party analytics in one instrumentation stage", async () => {
  const pkg = JSON.parse(await read("package.json"));
  const architecture = JSON.parse(await read("content/content-architecture.json"));
  const stages = architecture.phases.flatMap((phase) => phase.stages);
  assert.ok(stages.includes("instrument-content.mjs"));
  assert.equal(stages.filter((stage) => stage === "instrument-content.mjs").length, 1);
  assert.match(pkg.scripts["build:pages"], /content:compile/);
  assert.equal(pkg.scripts["prepare:analytics"], undefined);
});
