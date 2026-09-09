import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("scenario library has 42 valid three-choice scenarios", async () => {
  const data = await read("../app/data.ts");
  const definitions = data.slice(data.indexOf("const scenarioDefinitions"), data.indexOf("const ANSWER_POSITION_PATTERN"));
  const ids = [...definitions.matchAll(/\bid:\s*(\d+),/g)].map((match) => Number(match[1]));
  assert.deepEqual(ids, Array.from({ length: 42 }, (_, index) => index + 1));
  assert.equal((definitions.match(/correct:\s*true/g) ?? []).length, 42);
  assert.equal((definitions.match(/correct:\s*false/g) ?? []).length, 84);
  assert.match(data, /ANSWER_POSITION_PATTERN\s*=\s*\[1, 2, 1, 0/);
  for (const position of [0, 1, 2]) assert.match(data, new RegExp(`ANSWER_POSITION_PATTERN[^;]*\\b${position}\\b`));
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
  assert.match(page, /progressKey\(profile\.username\)/);
  assert.match(page, /progressKey\(null\)/);
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
  assert.match(page, /Tiến trình hiện tại được giữ nguyên/);
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
  assert.match(html, /42 tình huống tương tác/);
  assert.match(html, /\/khien-so-logo\.png/);
  assert.match(config, /base:\s*"\/"/);
  assert.match(html, /https:\/\/canhgiacso\.com\/og\.png/);
  assert.match(html, /rel="canonical" href="https:\/\/canhgiacso\.com\/"/);
  assert.match(workflow, /branches: \[main\]/);
  assert.match(workflow, /pnpm install --frozen-lockfile/);
});
