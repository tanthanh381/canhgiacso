import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

const priorityPaths = [
  "/kien-thuc/lua-dao-cong-tac-vien-viec-nhe-luong-cao/",
  "/kien-thuc/kiem-tra-so-dien-thoai-lua-dao/",
  "/kien-thuc/gia-mao-ngan-hang/",
  "/kien-thuc/kiem-tra-link-gia-mao/",
  "/kien-thuc/xu-ly-khi-bi-lua-dao-chuyen-tien/",
  "/kien-thuc/phishing-la-gi/",
];

test("Phase 4 measurement profile documents equal-window monitoring", async () => {
  const profile = JSON.parse(await read("seo/phase4-measurement.json"));
  assert.equal(profile.phase, "Phase 4 - Measurement & Search Expansion");
  assert.equal(profile.measurement.rpc, "public.get_phase4_seo_monitor");
  assert.match(profile.measurement.comparisonPolicy, /equal-length current vs previous windows/);
  assert.equal(profile.searchExpansion.priorityPages.length, 6);
  assert.ok(profile.safeguards.some((item) => item.includes("Do not bulk-change titles")));
});

test("Phase 4 search expansion runs after Wave 9 and before finalization", async () => {
  const architecture = JSON.parse(await read("content/content-architecture.json"));
  const stages = architecture.phases.flatMap((phase) => phase.stages);
  assert.ok(stages.indexOf("patch-content-growth-wave9.mjs") < stages.indexOf("patch-phase4-search-expansion.mjs"));
  assert.ok(stages.indexOf("patch-phase4-search-expansion.mjs") < stages.indexOf("finalize-content-architecture.mjs"));
});

test("Phase 4 search expansion links every priority page to next-step content", async () => {
  const script = await read("scripts/patch-phase4-search-expansion.mjs");
  for (const path of priorityPaths) assert.ok(script.includes(path), `missing priority path: ${path}`);
  for (const path of [
    "/cong-cu/kiem-tra-truoc-khi-chuyen-tien/",
    "/cong-cu/kiem-tra-cuoc-goi-la/",
    "/cong-cu/xu-ly-khi-bi-lua/",
    "/cong-cu/kiem-tra-tin-nhan-dang-ngo/",
    "/kien-thuc/sms-brandname-gia-mao/",
    "/kien-thuc/bien-lai-chuyen-khoan-gia/",
  ]) assert.ok(script.includes(path), `missing next-step link: ${path}`);
  assert.match(script, /data-phase4-search-expansion/);
  assert.match(script, /data-phase4-home/);
  assert.match(script, /data-phase4-hub/);
});
