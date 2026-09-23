import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const wave3 = await readFile(new URL("../scripts/patch-qc-wave3.mjs", import.meta.url), "utf8");

test("QC Wave 3 runs immediately after Wave 2 before the SEO authority wave", () => {
  assert.match(
    packageJson.scripts["build:pages"],
    /patch-qc-wave2\.mjs && node scripts\/patch-qc-wave3\.mjs && node scripts\/patch-seo-authority-wave6\.mjs && node scripts\/patch-seo-intent-wave7\.mjs && node scripts\/patch-seo-ctr-wave8\.mjs && node scripts\/patch-content-growth-wave9\.mjs && node scripts\/patch-realtime-analytics\.mjs/,
  );
});

test("QC Wave 3 enforces evidence traceability and trust floor", () => {
  for (const phrase of [
    "EXPECTED_TOPIC_COUNT = 36",
    "expected at least two topic-specific sources",
    "evidence floor not met",
    "data-source-tier",
    "data-source-domain",
    "data-source-checked",
    "Dấu vết dẫn chứng",
    "numbered-sources",
  ]) {
    assert.ok(wave3.includes(phrase), `missing evidence-governance control: ${phrase}`);
  }
});

test("QC Wave 3 validates link safety, duplicate sources and page semantics", () => {
  for (const phrase of [
    "source must use HTTPS",
    "target=_blank source missing noopener/noreferrer",
    "duplicate source URL found",
    "expected exactly one H1",
    "expected exactly one canonical URL",
    "expected exactly one QC source section",
  ]) {
    assert.ok(wave3.includes(phrase), `missing QC validation: ${phrase}`);
  }
});

test("QC Wave 3 extends methodology with source lifecycle governance", () => {
  for (const phrase of [
    "Dấu vết dẫn chứng và vòng đời nguồn",
    "Nguồn biến mất hoặc thay đổi",
    "Nguồn mâu thuẫn",
    "Kiểm soát freshness",
    "source manifest",
  ]) {
    assert.ok(wave3.includes(phrase), `missing methodology control: ${phrase}`);
  }
});

test("QC Wave 3 emits a machine-readable source manifest", () => {
  for (const phrase of [
    '"source-manifest.json"',
    "schemaVersion: 1",
    "qcWave: 3",
    "governedTopicCount",
    "uniqueSourceCount",
    "trustFloor",
  ]) {
    assert.ok(wave3.includes(phrase), `missing source-manifest field: ${phrase}`);
  }
});
