import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("GA4 uses the configured measurement id without ad signals and only after consent", async () => {
  const init = await read("public/google-analytics-init.js");
  const consent = await read("public/consent.js");
  assert.match(init, /G-HH04Q7FYHM/);
  assert.match(init, /window\.gtag\("config", "G-HH04Q7FYHM", \{/);
  assert.match(init, /allow_google_signals: false/);
  assert.match(init, /allow_ad_personalization_signals: false/);
  assert.match(init, /CGSConsent/);
  assert.match(consent, /G-HH04Q7FYHM/);
  assert.match(consent, /google-analytics-init\.js/);
});

test("GA4 instrumentation keeps the CSP allowlist, rejects foreign Google tags and never loads GA directly", async () => {
  const patch = await read("scripts/instrument-content.mjs");
  assert.match(patch, /https:\/\/www\.googletagmanager\.com/);
  assert.match(patch, /https:\/\/www\.google-analytics\.com/);
  assert.match(patch, /https:\/\/www\.google\.com/);
  assert.match(patch, /https:\/\/analytics\.google\.com/);
  assert.match(patch, /https:\/\/region1\.google-analytics\.com/);
  assert.match(patch, /Unexpected Google tag/);
  assert.match(patch, /must only be loaded by consent\.js/);
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
