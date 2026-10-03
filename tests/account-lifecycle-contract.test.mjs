// Hợp đồng tĩnh cho đợt D2: RPC xóa/xuất dữ liệu, xác minh chứng nhận, giao diện quên mật khẩu /
// xóa tài khoản và tài liệu vận hành. (Hành vi thật của SQL nằm ở pgTAP 005 và 006.)
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");
const LIFECYCLE = "supabase/migrations/20261002130000_account_lifecycle_export_delete.sql";
const VERIFY = "supabase/migrations/20261002131000_certificate_verification.sql";
const ROUTES = "supabase/migrations/20261002132000_rate_limit_account_and_verification_routes.sql";

function functionBody(sql, signature) {
  const start = sql.indexOf(`create or replace function ${signature}`);
  assert.ok(start >= 0, `missing ${signature}`);
  const end = sql.indexOf("\n$$;", start);
  return sql.slice(start, end + 4);
}

test("delete/export RPCs are authenticated-only, session-bound and delegate to private SECURITY DEFINER functions", async () => {
  const sql = await read(LIFECYCLE);
  for (const name of ["private.delete_my_account(confirmation text)", "private.export_my_data()"]) {
    const body = functionBody(sql, name);
    assert.match(body, /security definer/);
    assert.match(body, /set search_path = ''/);
  }
  assert.match(sql, /revoke all on function public\.delete_my_account\(text\) from public, anon/);
  assert.match(sql, /grant execute on function public\.delete_my_account\(text\) to authenticated/);
  assert.match(sql, /grant execute on function public\.export_my_data\(\) to authenticated/);
  assert.doesNotMatch(sql, /grant execute on function public\.(delete_my_account|export_my_data)[^;]*to[^;]*anon/);
  // Cả hai chỉ thao tác trên auth.uid() của người gọi, không nhận mã tài khoản từ client.
  const del = functionBody(sql, "private.delete_my_account(confirmation text)");
  assert.doesNotMatch(del, /user_id uuid|target_user/);
  assert.match(del, /private\.assert_recent_authentication\(\)/);
  assert.match(del, /errcode = 'CG005'/);
  assert.match(del, /errcode = '22023'/);
  assert.match(del, /lock table private\.app_admins, private\.app_editors in share row exclusive mode/);
  assert.match(del, /delete from auth\.users where id = uid/);
});

test("account deletion audit trail contains no raw PII", async () => {
  const sql = await read(LIFECYCLE);
  const del = functionBody(sql, "private.delete_my_account(confirmation text)");
  const logCall = del.slice(del.indexOf("private.log_privacy_event("));
  assert.match(logCall, /'ACCOUNT_DELETED'/);
  assert.match(logCall, /private\.pseudonymize_id|pseudonym/);
  assert.doesNotMatch(logCall, /email|username|display_name|ip|user_agent|auth\.uid/i);
  const logger = functionBody(sql, "private.log_privacy_event(");
  assert.doesNotMatch(logger, /ip_address|user_agent|actor_user_id|auth\.uid/);
  // Không dùng bộ ghi nhật ký có IP/user-agent cho sự kiện này.
  assert.doesNotMatch(del, /private\.log_security_event/);
});

test("recent authentication check reads the live session and the amr claim, and is not callable by clients", async () => {
  const sql = await read(LIFECYCLE);
  const body = functionBody(sql, "private.assert_recent_authentication(max_age interval default interval '10 minutes')");
  assert.match(body, /from auth\.sessions/);
  assert.match(body, /claims -> 'amr'|claims ->> 'session_id'/);
  assert.match(body, /errcode = 'CG006'/);
  assert.match(sql, /revoke all on function private\.assert_recent_authentication\(interval\) from public, anon, authenticated/);
});

test("verification RPC is minimal, volatile (so the POST-only rate limit applies) and legacy codes are preserved", async () => {
  const sql = await read(VERIFY);
  const body = functionBody(sql, "public.verify_training_certificate(code text)");
  assert.match(body, /security definer/);
  assert.match(body, /set search_path = ''/);
  assert.doesNotMatch(sql.slice(sql.indexOf("create or replace function public.verify_training_certificate")), /\bstable\b|\bimmutable\b/);
  const returned = body.slice(body.lastIndexOf("jsonb_build_object("));
  for (const forbidden of ["email", "username", "user_id", "run_id", "certificate_id", "id,", "score"]) {
    assert.ok(!new RegExp(`'${forbidden.replace(",", "")}'`).test(returned), `must not return ${forbidden}`);
  }
  assert.match(returned, /'name', private\.mask_display_name/);
  assert.match(sql, /grant execute on function public\.verify_training_certificate\(text\) to anon, authenticated/);
  // Mã cũ giữ nguyên: không có UPDATE hay backfill mã đã tồn tại.
  assert.doesNotMatch(sql, /update private\.training_certificates/i);
  assert.match(sql, /before insert on private\.training_certificates/);
  assert.match(sql, /\[0-9A-F\]\{10\}/);
});

test("rate-limit hook covers the three new routes and keeps the earlier ones", async () => {
  const sql = await read(ROUTES);
  for (const route of [
    "rpc/delete_my_account", "rpc/export_my_data", "rpc/verify_training_certificate",
    "rpc/record_web_analytics_event_v4", "rpc/evaluate_guest_choice", "rpc/save_managed_site_content",
    "rpc/set_content_manager_role", "rpc/set_privileged_email_domain", "rpc/log_privileged_mfa_event",
  ]) {
    assert.ok(sql.includes(`'${route}'`), `route ${route}`);
  }
  assert.match(sql, /'rpc\/delete_my_account' then 5/);
  assert.match(sql, /'rpc\/verify_training_certificate' then 30/);
});

test("pgTAP and post-deploy checks cover the new migrations", async () => {
  const [lifecycle, verification, checks] = await Promise.all([
    read("supabase/tests/database/005_account_lifecycle.test.sql"),
    read("supabase/tests/database/006_certificate_verification.test.sql"),
    read("supabase/verification/production-checks.sql"),
  ]);
  assert.match(lifecycle, /delete_my_account/);
  assert.match(lifecycle, /CG005/);
  assert.match(lifecycle, /CG006/);
  assert.match(verification, /verify_training_certificate/);
  assert.match(checks, /20261002130000/);
  assert.match(checks, /verify_training_certificate/);
});

test("auth UI: forgot password, recovery dialog, export and deletion are wired through the gateway", async () => {
  const [dialogs, recovery, privacy, gateway, supabase, model] = await Promise.all([
    read("app/domains/auth/dialogs.tsx"),
    read("app/domains/auth/password-recovery.tsx"),
    read("app/domains/auth/account-privacy.tsx"),
    read("app/domains/auth/gateway.ts"),
    read("app/supabase.ts"),
    read("app/domains/auth/model.ts"),
  ]);
  assert.match(dialogs, /Quên mật khẩu\?/);
  assert.match(dialogs, /<ForgotPasswordForm/);
  assert.match(dialogs, /<PasswordRecoveryDialog/);
  assert.match(dialogs, /<AccountPrivacyPanel/);
  assert.match(dialogs, /<DeleteAccountView/);
  assert.match(dialogs, /<AccountDeletedNotice/);
  // Không còn glyph × làm nút đóng.
  assert.doesNotMatch(dialogs, />×<\/button>/);
  assert.equal((dialogs.match(/<Icon name="close"/g) ?? []).length, 3);
  assert.match(await read("app/admin.tsx"), /aria-label=\{`Xóa \$\{card\.title\}`\}><Icon name="close"/);

  assert.match(privacy, /Tải dữ liệu của tôi \(JSON\)/);
  assert.match(privacy, /downloadJsonFile/);
  assert.doesNotMatch(privacy, /fetch\(|sendBeacon|XMLHttpRequest/);
  assert.match(privacy, /Xóa tài khoản vĩnh viễn/);
  assert.match(privacy, /autoComplete="current-password"/);

  // Hộp thoại khôi phục không đóng bằng Esc/nền: phải chọn đặt mật khẩu hoặc đăng xuất.
  assert.match(recovery, /onClose=\{\(\) => undefined\}/);
  assert.match(recovery, /insufficient_aal/);
  assert.match(recovery, /signOutOtherSessions/);
  assert.match(recovery, /PASSWORD_RECOVERY/);

  for (const fn of ["requestPasswordReset", "updateAccountPassword", "exportMyData", "deleteMyAccount", "getInitialAuthRedirect"]) {
    assert.match(gateway, new RegExp(`export (async )?function ${fn}`));
  }
  // Xóa tài khoản đăng nhập lại bằng ứng dụng khách riêng, không dùng phiên chính.
  const del = gateway.slice(gateway.indexOf("export async function deleteMyAccount"));
  assert.match(del, /createReauthClient\(\)/);
  assert.match(del, /reauth\.auth\.signInWithPassword/);
  assert.match(del, /reauth\.rpc\("delete_my_account"/);
  assert.doesNotMatch(del, /\bsupabase\./);
  assert.match(gateway, /resetPasswordForEmail\(email, \{ redirectTo: passwordResetRedirectUrl\(\) \}\)/);

  // Trạng thái chuyển hướng phải được ghi nhận TRƯỚC khi createClient xử lý và xóa URL.
  assert.ok(supabase.indexOf("parseAuthRedirect(window.location.hash") < supabase.indexOf("const client = createClient("));
  assert.match(supabase, /storageKey: "cgs-reauth-isolated"/);
  assert.match(model, /PASSWORD_PATTERN\.test\(password\)/);
});

test("account/privacy styles live in the cascade-layer stylesheet and only use defined tokens", async () => {
  const [css, index, tokens] = await Promise.all([read("app/styles/account.css"), read("app/styles/index.css"), read("app/styles/tokens.css")]);
  assert.match(css, /\.privacy-panel/);
  assert.match(css, /\.auth-forgot-link/);
  assert.match(index, /@import "\.\/account\.css" layer\(components\);/);
  for (const name of new Set([...css.matchAll(/var\((--[a-z0-9-]+)/g)].map((match) => match[1]))) {
    assert.match(tokens, new RegExp(`${name}\\s*:`), `${name} must be defined in app/styles/tokens.css`);
  }
  const [privacy, recovery] = await Promise.all([read("app/domains/auth/account-privacy.tsx"), read("app/domains/auth/password-recovery.tsx")]);
  assert.doesNotMatch(privacy + recovery, /\.css"/, "styles come from the shared layered entry, not per-component imports");
});

test("runbook and checklist document apply order, Redirect URLs, e-mail template and manual staging checks", async () => {
  const [runbook, checklist, privacyPage, contactPage] = await Promise.all([
    read("documentation/security/REMEDIATION-2026-10.md"),
    read("documentation/security/SUPABASE-DASHBOARD-CHECKLIST.md"),
    read("public/quyen-rieng-tu/index.html"),
    read("public/lien-he/index.html"),
  ]);
  for (const file of ["20261002130000_account_lifecycle_export_delete.sql", "20261002131000_certificate_verification.sql", "20261002132000_rate_limit_account_and_verification_routes.sql"]) {
    assert.ok(runbook.includes(file), file);
    assert.ok(runbook.indexOf(file) > runbook.indexOf("20261002104000_privileged_mfa_event_log.sql"), `${file} comes after the D1 migrations`);
  }
  assert.match(runbook, /CG005/);
  assert.match(runbook, /CG006/);
  assert.match(runbook, /\/xac-minh-chung-chi\//);
  assert.match(runbook, /Quên mật khẩu/);
  assert.match(checklist, /redirectTo = https:\/\/canhgiacso\.com\//);
  assert.match(checklist, /Reset Password/);
  assert.match(checklist, /\{\{ \.ConfirmationURL \}\}/);

  // Trang công khai mô tả đúng các chức năng (nguồn: patch-seo-authority-wave6.mjs).
  for (const phrase of ["Tải dữ liệu của tôi (JSON)", "Xóa tài khoản…", "Quên mật khẩu", "/xac-minh-chung-chi/"]) {
    assert.ok(privacyPage.includes(phrase), `privacy page mentions ${phrase}`);
  }
  assert.match(privacyPage, /id="xac-minh-chung-chi"/);
  assert.match(contactPage, /tự tải dữ liệu và tự xóa tài khoản/);
});

// Hai lỗi do rà soát tự động (Codex) nêu trên PR #73; giữ lại để không tái phát.
test("password-recovery TOTP step uses the verified factor, not whichever factor is listed first", async () => {
  const gateway = await read("app/domains/auth/gateway.ts");
  const start = gateway.indexOf("export async function verifyTotpForPasswordChange");
  assert.ok(start >= 0, "verifyTotpForPasswordChange exists");
  const body = gateway.slice(start, gateway.indexOf("\n}\n", start));
  assert.match(body, /\.find\(\(\w+\) => \w+\.status === "verified"\)/);
  assert.doesNotMatch(body, /totp\?\.\[0\]/);
});

test("rate-limit hook serialises the count-then-insert per IP and route in every definition", async () => {
  for (const file of [
    "supabase/migrations/20261002103000_privacy_rate_limit_and_retention.sql",
    ROUTES,
  ]) {
    const sql = await read(file);
    const lock = sql.indexOf("pg_advisory_xact_lock(hashtextextended(ip_hash || '|' || route_key, 0))");
    const count = sql.indexOf("select count(*) into recent_count");
    const insert = sql.indexOf("insert into private.api_rate_limits");
    assert.ok(lock > 0 && lock < count && count < insert, `${file}: lock must come before count and insert`);
  }
});
