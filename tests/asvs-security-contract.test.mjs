import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');
const migration = read('supabase/migrations/20260913063000_asvs_l2_security_hardening.sql');
const fixups = read('supabase/migrations/20260913063100_asvs_l2_security_fixups.sql');
const mfa = read('app/security-hardening.tsx');
const entry = read('github-pages/main.tsx');
const html = read('github-pages/index.html');
const workflow = read('.github/workflows/security-analysis.yml');

test('privileged content helpers require AAL2 and a live session', () => {
  assert.match(migration, /auth\.jwt\(\)->>'aal'\)[\s\S]*?= 'aal2'/);
  assert.ok((migration.match(/= 'aal2'/g) ?? []).length >= 2);
  assert.match(migration, /from auth\.sessions session_row/);
});

test('admin and editor UI implements TOTP enrollment and challenge', () => {
  assert.match(mfa, /getAuthenticatorAssuranceLevel\(\)/);
  assert.match(mfa, /mfa\.enroll\(\{[\s\S]*?factorType: "totp"/);
  assert.match(mfa, /mfa\.challenge\(/);
  assert.match(mfa, /mfa\.verify\(/);
  assert.match(entry, /<PrivilegedMfaGate \/>/);
});

test('privileged MFA is enforced immediately after sign-in and is not admin-route gated', () => {
  assert.match(mfa, /supabase\.auth\.getSession\(\)/);
  assert.match(mfa, /supabase\.rpc\("get_content_management_role"\)/);
  assert.match(mfa, /event === "SIGNED_IN"/);
  assert.match(mfa, /roleResult\.data === "admin" \|\| roleResult\.data === "editor"/);
  assert.doesNotMatch(mfa, /isAdminRoute|window\.location\.hash\s*===\s*["']#\/admin["']|!adminRoute/);
});

test('role discovery is read-only invoker RPC with narrow private-helper grant', () => {
  assert.match(migration, /create or replace function public\.get_content_management_role\(\)[\s\S]*?security invoker/);
  assert.match(migration, /revoke execute on function public\.get_content_management_role\(\) from public, anon/);
  assert.match(fixups, /grant execute on function private\.get_content_management_role\(\) to authenticated, service_role/);
});

test('security events are append-only to browser roles', () => {
  assert.match(migration, /create table if not exists private\.security_audit_log/);
  assert.match(migration, /revoke all on table private\.security_audit_log from public, anon, authenticated/);
  assert.match(migration, /CONTENT_PUBLISHED/);
  assert.match(migration, /CONTENT_DRAFT_SAVED/);
  assert.match(migration, /ROLE_CHANGED/);
});

test('Data API abuse controls cover guest and privileged RPCs', () => {
  const combined = `${migration}\n${fixups}`;
  assert.match(combined, /rpc\/evaluate_guest_choice/);
  assert.match(combined, /rpc\/save_managed_site_content/);
  assert.match(combined, /rpc\/set_content_manager_role/);
  assert.match(combined, /pgrst\.db_pre_request/);
  assert.match(combined, /'status', 429/);
});

test('browser CSP keeps executable code self-hosted and disables dangerous resource classes', () => {
  assert.match(html, /script-src 'self'/);
  assert.match(html, /object-src 'none'/);
  assert.match(html, /base-uri 'none'/);
  assert.match(html, /media-src 'none'/);
  assert.match(html, /worker-src 'none'/);
});

test('security pipeline includes SAST, SCA and SBOM', () => {
  assert.match(workflow, /CodeQL/);
  assert.match(workflow, /osv-scanner-action/);
  assert.match(workflow, /pnpm audit --prod --audit-level low/);
  assert.match(workflow, /Generate SBOM/);
  assert.match(workflow, /javascript-typescript/);
  assert.match(workflow, /cyclonedx-json/);
});
