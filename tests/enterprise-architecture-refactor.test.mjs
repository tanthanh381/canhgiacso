import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("P1 exposes one deterministic content compiler entrypoint", async () => {
  const pkg = JSON.parse(await read("package.json"));
  const architecture = JSON.parse(await read("content/content-architecture.json"));
  assert.equal(pkg.scripts["content:compile"], "node scripts/content-compiler.mjs");
  assert.equal(pkg.scripts["build:pages"], "pnpm run content:compile && vite build --config vite.github-pages.config.ts");
  const stages = architecture.phases.flatMap((phase) => phase.stages);
  assert.ok(stages.length >= 1);
  assert.ok(stages.length <= 20, `content pipeline should shrink over time; found ${stages.length} stages`);
  assert.equal(new Set(stages).size, stages.length);
  assert.equal(architecture.output.root, "docs");
  assert.equal(architecture.output.generatedOnly, true);
});

test("P2 keeps page.tsx as orchestrator and moves domain concerns out", async () => {
  const [page, checklist, training, storage, ui] = await Promise.all([
    read("app/page.tsx"),
    read("app/domains/security-awareness/checklist.ts"),
    read("app/domains/training/model.ts"),
    read("app/shared/browser-storage.ts"),
    read("app/shared/ui-primitives.tsx"),
  ]);
  assert.match(page, /domains\/security-awareness\/checklist/);
  assert.match(page, /domains\/training\/model/);
  assert.match(page, /shared\/browser-storage/);
  assert.match(page, /shared\/ui-primitives/);
  assert.doesNotMatch(page, /const securityChecklistGroups:/);
  assert.doesNotMatch(page, /function safeStorageGet/);
  assert.doesNotMatch(page, /function BrandMark/);
  assert.doesNotMatch(page, /function Modal/);
  assert.match(checklist, /export const securityChecklistGroups/);
  assert.match(training, /export function evaluateGuestChoice/);
  assert.match(storage, /export function safeStorageGet/);
  assert.match(ui, /export function Modal/);
});

test("P0 migrations default-deny private control-plane access and legacy RPCs", async () => {
  const [hardening, deny] = await Promise.all([
    read("supabase/migrations/20260923085000_enterprise_security_hardening_p0.sql"),
    read("supabase/migrations/20260923085500_enterprise_security_default_deny_p0.sql"),
  ]);
  assert.match(hardening, /alter table private\.security_audit_log enable row level security/);
  assert.match(hardening, /alter table private\.api_rate_limits enable row level security/);
  assert.match(hardening, /primary key \(id\)/);
  assert.match(hardening, /record_web_analytics_event_v4/);
  assert.match(hardening, /revoke all on function public\.evaluate_guest_choice/);
  assert.match(deny, /alter default privileges for role postgres in schema public/);
  assert.match(deny, /web_analytics_sessions_no_direct_access/);
  assert.match(deny, /web_analytics_pageviews_no_direct_access/);
});
