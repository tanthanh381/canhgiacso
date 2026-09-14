import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("public tracker is privacy constrained", async () => {
  const tracker = await read("public/web-analytics.js");
  assert.match(tracker, /record_web_analytics_event/);
  assert.match(tracker, /sessionStorage/);
  assert.match(tracker, /document\.visibilityState/);
  assert.doesNotMatch(tracker, /navigator\.userAgent/);
  assert.doesNotMatch(tracker, /location\.search/);
  assert.doesNotMatch(tracker, /document\.cookie/);
});

test("admin analytics dashboard is admin-rpc backed", async () => {
  const component = await read("app/admin-traffic-analytics.tsx");
  assert.match(component, /get_web_analytics_dashboard/);
  assert.match(component, /10_000/);
  assert.match(component, /Đang online/);
  assert.match(component, /Nguồn truy cập/);
});

test("build patch adds analytics tab and tracker", async () => {
  const patch = await read("scripts/patch-realtime-analytics.mjs");
  assert.match(patch, /AdminTrafficAnalytics/);
  assert.match(patch, /Thống kê truy cập/);
  assert.match(patch, /web-analytics\.js/);
  assert.match(patch, /connect-src/);
});

test("database migration keeps analytics private and dashboard admin-only", async () => {
  const sql = await read("supabase/migrations/20260914142826_realtime_web_analytics.sql");
  assert.match(sql, /private\.web_analytics_sessions/);
  assert.match(sql, /private\.web_analytics_pageviews/);
  assert.match(sql, /private\.user_is_app_admin\(\)/);
  assert.match(sql, /revoke all on private\.web_analytics_sessions/);
  assert.match(sql, /grant execute on function public\.record_web_analytics_event.*to anon, authenticated/s);
});
