import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("application build is side-effect free while Pages publication owns content compilation", async () => {
  const pkg = JSON.parse(await read("package.json"));
  for (const name of ["dev", "build"]) {
    assert.doesNotMatch(pkg.scripts[name], /content:compile|patch-[a-z0-9-]+\.mjs/, `${name} must not mutate static content`);
  }
  assert.match(pkg.scripts["build:pages"], /content:compile/);
  assert.doesNotMatch(pkg.scripts["build:pages"], /patch-[a-z0-9-]+\.mjs/);
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
    "app/domains/shell/navigation.ts",
    "app/shared/browser-storage.ts",
    "app/shared/ui-primitives.tsx",
  ]) {
    await access(new URL(`../${file}`, import.meta.url));
  }
});


test("content compiler finalizes canonical inventory after growth and before instrumentation", async () => {
  const manifest = JSON.parse(await read("content/content-architecture.json"));
  const ids = manifest.phases.map((phase) => phase.id);
  const finalizeIndex = ids.indexOf("finalize");
  const growthIndex = ids.indexOf("growth");
  const instrumentationIndex = ids.indexOf("instrumentation");
  assert.ok(finalizeIndex > growthIndex);
  assert.ok(finalizeIndex < instrumentationIndex);
  const finalizer = await read("scripts/finalize-content-architecture.mjs");
  assert.match(finalizer, /Duplicate canonical/);
  assert.match(finalizer, /Duplicate title/);
  assert.match(finalizer, /Duplicate meta description/);
  assert.match(finalizer, /sitemap rebuilt from final artifacts/);
  assert.match(finalizer, /ensureSearchMetadata/);
  assert.match(finalizer, /twitter:card/);
  assert.match(finalizer, /hreflang="x-default"/);
});


test("shell navigation and auth validation are owned by their bounded contexts", async () => {
  const [page, navigation, auth] = await Promise.all([
    read("app/page.tsx"),
    read("app/domains/shell/navigation.ts"),
    read("app/domains/auth/model.ts"),
  ]);
  assert.match(page, /routeFromHash/);
  assert.match(page, /navigateBrowser/);
  assert.doesNotMatch(page, /^type View =/m);
  assert.match(navigation, /export type View/);
  assert.match(navigation, /function routeFromHash/);
  assert.match(navigation, /admin-before-leave/);
  assert.match(page, /validateAuthSubmission/);
  assert.match(auth, /function validateAuthSubmission/);
  assert.match(auth, /USERNAME_PATTERN/);
  assert.match(auth, /PASSWORD_PATTERN/);
});
