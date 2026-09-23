import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("all application builds enter through the unified content compiler", async () => {
  const pkg = JSON.parse(await read("package.json"));
  for (const name of ["dev", "build", "build:pages"]) {
    assert.match(pkg.scripts[name], /content:compile/, `${name} must use content:compile`);
    assert.doesNotMatch(pkg.scripts[name], /patch-[a-z0-9-]+\.mjs/, `${name} must not call patch scripts directly`);
  }
  assert.equal(pkg.scripts["prepare:navigation"], undefined);
  assert.equal(pkg.scripts["prepare:content"], undefined);
  assert.equal(pkg.scripts["prepare:analytics"], undefined);
});

test("content architecture manifest is deterministic and references real stages", async () => {
  const manifest = JSON.parse(await read("content/content-architecture.json"));
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.output.generatedOnly, true);
  const stages = manifest.phases.flatMap((phase) => phase.stages);
  assert.equal(stages.length, new Set(stages).size, "content stages must be unique");
  for (const stage of stages) {
    assert.match(stage, /^[a-z0-9-]+\.mjs$/i);
    await access(new URL(`../scripts/${stage}`, import.meta.url));
  }
});

test("home page consumes domain modules instead of redeclaring cross-cutting models", async () => {
  const page = await read("app/page.tsx");
  assert.match(page, /from "\.\/domains\/auth\/model"/);
  assert.match(page, /from "\.\/domains\/dashboard\/model"/);
  assert.match(page, /from "\.\/domains\/training\/presentation"/);
  assert.match(page, /from "\.\/shared\/browser-storage"/);
  assert.match(page, /from "\.\/shared\/ui-primitives"/);
  assert.doesNotMatch(page, /^type SessionAccount =/m);
  assert.doesNotMatch(page, /^type AnalyticsUser =/m);
  assert.doesNotMatch(page, /^const USERNAME_PATTERN =/m);
  assert.doesNotMatch(page, /^function scenarioCategoryLabel/m);
});

test("domain modules have explicit bounded-context ownership", async () => {
  for (const file of [
    "app/domains/auth/model.ts",
    "app/domains/dashboard/model.ts",
    "app/domains/training/model.ts",
    "app/domains/training/presentation.ts",
    "app/domains/security-awareness/checklist.ts",
    "app/shared/browser-storage.ts",
    "app/shared/ui-primitives.tsx",
  ]) {
    await access(new URL(`../${file}`, import.meta.url));
  }
});
