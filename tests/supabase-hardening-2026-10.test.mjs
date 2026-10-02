import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");
const exists = async (file) => {
  try {
    await stat(new URL(`../${file}`, import.meta.url));
    return true;
  } catch {
    return false;
  }
};

const MIGRATIONS = {
  roles: "supabase/migrations/20261002100000_privileged_roles_require_confirmed_email.sql",
  wrappers: "supabase/migrations/20261002101000_public_rpc_audit_and_no_direct_writes.sql",
  guest: "supabase/migrations/20261002102000_guest_choice_rpc.sql",
  privacy: "supabase/migrations/20261002103000_privacy_rate_limit_and_retention.sql",
  mfa: "supabase/migrations/20261002104000_privileged_mfa_event_log.sql",
  accountLifecycle: "supabase/migrations/20261002130000_account_lifecycle_export_delete.sql",
  certificateVerification: "supabase/migrations/20261002131000_certificate_verification.sql",
  accountRoutesRateLimit: "supabase/migrations/20261002132000_rate_limit_account_and_verification_routes.sql",
};
const POST_DEPLOY = "supabase/post-deploy/20261002120000_revoke_public_answer_key_access.sql";

test("privileged roles require a confirmed email and the migration cannot lock out existing admins", async () => {
  const sql = await read(MIGRATIONS.roles);
  assert.match(sql, /email_confirmed_at is not null/);
  assert.match(sql, /errcode = 'CG003'/);
  assert.match(sql, /errcode = 'CG001'/);
  assert.match(sql, /errcode = 'CG002'/);
  // Safety guard runs before any object is changed.
  assert.ok(sql.indexOf("CG003") < sql.indexOf("create table if not exists private.privileged_email_domains"));
  assert.match(sql, /'ROLE_CHANGED'/);
  for (const helper of ["user_is_app_admin", "user_can_edit_content"]) {
    assert.match(sql, new RegExp(`create or replace function private\\.${helper}\\(\\)`));
  }
  assert.match(sql, /'aal2'/);
  assert.match(sql, /auth\.sessions/);
});

test("public admin RPCs are SECURITY INVOKER wrappers that delegate to audited private functions", async () => {
  const sql = await read(MIGRATIONS.wrappers);
  assert.match(sql, /function public\.save_managed_site_content\(/);
  assert.match(sql, /function public\.set_content_manager_role\(/);
  assert.match(sql, /security invoker/);
  assert.match(sql, /private\.save_managed_site_content/);
  assert.match(sql, /revoke insert, update, delete, truncate, references, trigger\s+on (?:table )?public\.site_content\s+from anon, authenticated/);
  assert.match(sql, /log_security_event/);
});

test("guest scoring RPC returns one choice, fails closed and is allowed for anon only through the allowlisted function", async () => {
  const sql = await read(MIGRATIONS.guest);
  assert.match(sql, /function public\.evaluate_guest_choice\(scenario_id integer, choice_index integer\)/);
  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /errcode = '22023'/);
  assert.match(sql, /grant execute on function public\.evaluate_guest_choice\(integer, integer\) to anon, authenticated/);
  const gateway = await read("app/domains/training/gateway.ts");
  assert.match(gateway, /requestGuestChoiceOutcome/);
  assert.match(gateway, /rpc\("evaluate_guest_choice", \{\s+scenario_id: /);
});

test("answer-key table access is revoked only by the post-deploy script, never by a migration", async () => {
  const post = await read(POST_DEPLOY);
  assert.match(post, /CHỈ ÁP DỤNG SAU KHI FRONTEND MỚI ĐÃ ĐƯỢC DEPLOY/);
  assert.match(post, /revoke all on table public\.site_content from anon, authenticated/);
  assert.match(post, /errcode = 'CG004'/);
  const migrations = await readdir(new URL("../supabase/migrations/", import.meta.url));
  for (const name of migrations.filter((file) => file.endsWith(".sql"))) {
    const sql = await read(`supabase/migrations/${name}`);
    assert.doesNotMatch(sql, /revoke all on table public\.site_content from anon, authenticated/, name);
  }
});

test("no baseline file is added to supabase/migrations and new migrations keep the documented order", async () => {
  const migrations = (await readdir(new URL("../supabase/migrations/", import.meta.url))).filter((file) => file.endsWith(".sql")).sort();
  assert.ok(!migrations.some((name) => /baseline/i.test(name)), "no baseline migration");
  const newer = migrations.filter((name) => name >= "20261002");
  assert.deepEqual(newer, Object.values(MIGRATIONS).map((file) => file.split("/").pop()));
});

test("rate limiting stores a salted IP hash, trusts one header and purges expired data", async () => {
  const sql = await read(MIGRATIONS.privacy);
  assert.match(sql, /add column if not exists source_ip_hash text/);
  assert.match(sql, /alter column source_ip_hash set not null/);
  assert.match(sql, /drop column if exists source_ip/);
  assert.match(sql, /pg_catalog\.sha256/);
  assert.match(sql, /trusted_ip_header/);
  assert.doesNotMatch(sql, /headers\s*->>\s*'x-forwarded-for'/);
  assert.match(sql, /function private\.purge_expired_security_data\(/);
  assert.match(sql, /interval '24 hours'/);
  assert.match(sql, /interval '13 months'/);
  assert.match(sql, /skip locked/);
  assert.match(sql, /cron\.schedule/);
  // The insert into the rate-limit table must use the hash, not the raw address.
  assert.doesNotMatch(sql, /insert into private\.api_rate_limits\s*\(\s*source_ip\s*,/);
});

test("documentation no longer claims that no IP is stored", async () => {
  const [overview, security] = await Promise.all([
    read("documentation/realtime-analytics.md"),
    read("documentation/realtime-analytics-security.md"),
  ]);
  assert.doesNotMatch(overview, /Hệ thống không lưu IP,/);
  assert.match(overview, /mã băm muối của IP/);
  assert.match(overview, /13 tháng/);
  assert.match(security, /sha256\(secret : utc_day : ip\)/);
  const privacyNote = await read("app/admin-traffic-analytics.tsx");
  assert.match(privacyNote, /mã băm/);
});

test("the unused admin-analytics edge function stays removed", async () => {
  assert.equal(await exists("supabase/functions/admin-analytics/index.ts"), false);
  const security = await read("documentation/realtime-analytics-security.md");
  assert.match(security, /supabase functions delete admin-analytics/);
});

test("supabase/config.toml encodes the intended Auth baseline and no secrets", async () => {
  const toml = await read("supabase/config.toml");
  assert.match(toml, /^site_url = "https:\/\/canhgiacso\.com\/"$/m);
  assert.match(toml, /"https:\/\/canhgiacso\.com\/\*\*"/);
  assert.match(toml, /"https:\/\/www\.canhgiacso\.com\/\*\*"/);
  assert.match(toml, /^enable_confirmations = true$/m);
  assert.match(toml, /^minimum_password_length = 10$/m);
  assert.match(toml, /^password_requirements = "lower_upper_letters_digits"$/m);
  assert.match(toml, /\[auth\.mfa\.totp\]\s+enroll_enabled = true\s+verify_enabled = true/);
  assert.match(toml, /^jwt_expiry = 3600$/m);
  assert.match(toml, /^enable_anonymous_sign_ins = false$/m);
  // `config push` must not be able to throttle production by accident.
  assert.doesNotMatch(toml, /^\[auth\.rate_limit\]/m);
  assert.doesNotMatch(toml, /secret\s*=\s*"[^e"]/i);
});

test("remediation runbook and dashboard checklist cover apply order, rollback and owner-only settings", async () => {
  const [runbook, checklist] = await Promise.all([
    read("documentation/security/REMEDIATION-2026-10.md"),
    read("documentation/security/SUPABASE-DASHBOARD-CHECKLIST.md"),
  ]);
  for (const migration of Object.values(MIGRATIONS)) {
    assert.ok(runbook.includes(migration.split("/").pop()), migration);
  }
  assert.ok(runbook.includes("20261002120000_revoke_public_answer_key_access.sql"));
  assert.match(runbook, /Thứ tự áp dụng/);
  assert.match(runbook, /Hoàn tác/);
  assert.match(runbook, /PKCE/);
  assert.match(checklist, /Confirm email/);
  assert.match(checklist, /CAPTCHA/);
  assert.match(checklist, /captchaToken/);
  assert.match(checklist, /admin-analytics/);
});

test("SQL test harness covers every new migration and CI runs with minimal permissions", async () => {
  const workflow = await read(".github/workflows/supabase-db-tests.yml");
  assert.match(workflow, /^permissions:\n {2}contents: read$/m);
  assert.match(workflow, /actions\/checkout@[0-9a-f]{40}/);
  assert.doesNotMatch(workflow, /secrets\./);
  assert.match(workflow, /pg_prove/);
  assert.match(workflow, /migration_guards\.sh/);
  assert.match(workflow, /--post-deploy/);
  const tests = (await readdir(new URL("../supabase/tests/database/", import.meta.url))).filter((file) => file.endsWith(".test.sql"));
  assert.ok(tests.length >= 4);
  assert.equal(await exists("supabase/tests/bootstrap.sh"), true);
  assert.equal(await exists("supabase/tests/post-deploy/001_post_deploy.test.sql"), true);
});

test("admin UI blocks granting privileged roles to unconfirmed or out-of-allowlist emails and registration does not leak existing accounts", async () => {
  const [admin, authError, dialogs, gateway, security] = await Promise.all([
    read("app/admin.tsx"),
    read("app/auth-error.ts"),
    read("app/domains/auth/dialogs.tsx"),
    read("app/domains/auth/gateway.ts"),
    read("app/security-hardening.tsx"),
  ]);
  assert.match(admin, /privilegeGrantBlockReason/);
  assert.match(admin, /CG001/);
  assert.match(admin, /CG002/);
  assert.match(authError, /REGISTRATION_UNAVAILABLE/);
  assert.doesNotMatch(authError, /email này đã được đăng ký|đã tồn tại tài khoản/i);
  assert.match(dialogs, /ConfirmationPending/);
  assert.match(gateway, /auth\.resend\(\{ type: "signup"/);
  assert.match(security, /log_privileged_mfa_event/);
});
