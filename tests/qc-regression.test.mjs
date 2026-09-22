import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("scenario library has 42 valid three-choice scenarios", async () => {
  const data = await read("../app/data.ts");
  const definitions = data.slice(data.indexOf("const scenarioDefinitions"), data.indexOf("export const scenarios"));
  const ids = [...definitions.matchAll(/\bid:\s*(\d+),/g)].map((match) => Number(match[1]));
  assert.deepEqual(ids, Array.from({ length: 42 }, (_, index) => index + 1));
  assert.equal((definitions.match(/\{ text:/g) ?? []).length, 126);
  assert.doesNotMatch(definitions, /correct:\s*(?:true|false)|moneyDelta:|awarenessDelta:|feedback:/);
});

test("all public data tables have RLS and ownership policies", async () => {
  const schema = await read("../supabase/schema.sql");
  for (const table of ["profiles", "user_progress", "test_attempts", "site_content"]) {
    assert.match(schema, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(schema, /using \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(schema, /with check \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(schema, /revoke all on function public\.get_ciso_dashboard\(\) from public, anon/);
  assert.match(schema, /if not \(select private\.user_is_app_admin\(\)\)/);
  assert.match(schema, /auth\.sessions session_row/);
});

test("browser bundle contains no server secret and keeps auth validation", async () => {
  const [client, page] = await Promise.all([read("../app/supabase.ts"), read("../app/page.tsx")]);
  assert.match(client, /SUPABASE_PUBLISHABLE_KEY/);
  assert.doesNotMatch(client, /service_role|SUPABASE_SECRET_KEY/i);
  assert.match(page, /PASSWORD_PATTERN/);
  assert.match(page, /USERNAME_PATTERN/);
  assert.match(page, /signOut\(\{ scope: "local" \}\)/);
  assert.match(client, /guestSupabase = guestClient/);
  assert.match(page, /get_public_site_content/);
  assert.match(page, /Guest gameplay is intentionally local/);
  assert.doesNotMatch(page, /supabase\.rpc\("evaluate_guest_choice"/);
  assert.doesNotMatch(page, /scenario_snapshot/);
  assert.doesNotMatch(page, /persistFullProgress|khien-so-migrated/);
  assert.match(page, /progressKey\(null\)/);
});

test("answer keys are redacted and content management uses protected RPCs", async () => {
  const [migration, page, admin, data] = await Promise.all([
    read("../supabase/harden_gameplay_content.sql"),
    read("../app/page.tsx"),
    read("../app/admin.tsx"),
    read("../app/data.ts"),
  ]);
  assert.match(migration, /private\.redact_site_content/);
  assert.match(migration, /choice_item - array\['correct', 'moneyDelta', 'awarenessDelta', 'feedback'\]/);
  assert.match(migration, /public\.get_managed_site_content/);
  assert.match(migration, /public\.save_managed_site_content/);
  assert.match(page, /Guest gameplay is intentionally local/);
  assert.doesNotMatch(page, /supabase\.rpc\("evaluate_guest_choice"/);
  assert.match(admin, /save_managed_site_content/);
  const definitions = data.slice(data.indexOf("const scenarioDefinitions"), data.indexOf("export const scenarios"));
  assert.doesNotMatch(definitions, /correct:\s*(?:true|false)|moneyDelta:|awarenessDelta:|feedback:/);
});

test("guest choice scoring can run with the write-based rate limiter", async () => {
  const migration = await read("../supabase/migrations/20260922143000_allow_guest_choice_rate_limit.sql");
  assert.match(migration, /create or replace function public\.evaluate_guest_choice\(scenario_id integer, choice_index integer\)/);
  assert.match(migration, /security definer/);
  assert.match(migration, /private\.evaluate_choice\(scenario_id, choice_index\)/);
  assert.match(migration, /grant execute on function public\.evaluate_guest_choice\(integer, integer\) to anon, authenticated/);
  assert.doesNotMatch(migration, /\bstable\b/);
});

test("critical UI states are accessible and responsive", async () => {
  const [page, styles] = await Promise.all([read("../app/page.tsx"), read("../app/globals.css")]);
  assert.match(page, /aria-live="polite"/);
  assert.match(page, /role="dialog"/);
  assert.match(page, /aria-modal="true"/);
  assert.match(page, /event\.key === "Escape"/);
  assert.match(page, /aria-current=/);
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /@media \(max-width: 820px\)/);
  assert.match(styles, /@media \(max-width: 520px\)/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /color-scheme: dark/);
});

test("QC fixes keep destructive reset explicit and mobile text readable", async () => {
  const [page, styles, config] = await Promise.all([
    read("../app/page.tsx"),
    read("../app/globals.css"),
    read("../vite.github-pages.config.ts"),
  ]);
  assert.match(page, /resetConfirmOpen/);
  assert.match(page, /Thao tác này không thể hoàn tác/);
  assert.match(page, /Xóa và bắt đầu lại/);
  assert.match(page, /Lịch sử lượt chơi/);
  assert.match(page, /supabase\.rpc\("restart_game"/);
  assert.match(styles, /\.topbar nav button \{ font-size: 12px/);
  assert.match(styles, /footer-brand small \{ font-size: 12px/);
  assert.match(config, /manualChunks\(id\)/);
});

test("GitHub Pages metadata and deployment target are consistent", async () => {
  const [html, config, workflow] = await Promise.all([
    read("../github-pages/index.html"),
    read("../vite.github-pages.config.ts"),
    read("../.github/workflows/pages.yml"),
  ]);
  assert.match(html, /Content-Security-Policy/);
  const gaTags = html.match(/https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-HH04Q7FYHM/g) ?? [];
  assert.equal(gaTags.length, 1);
  assert.match(html, /\/google-analytics-init\.js/);
  assert.match(html, /https:\/\/www\.google-analytics\.com/);
  assert.match(html, /\/khien-so-logo\.png/);
  assert.match(config, /base:\s*"\/"/);
  assert.match(html, /https:\/\/canhgiacso\.com\/og\.png/);
  assert.match(html, /rel="canonical" href="https:\/\/canhgiacso\.com\/"/);
  assert.match(workflow, /branches: \[main\]/);
  assert.match(workflow, /pnpm install --frozen-lockfile/);
});
