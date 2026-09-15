import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("public tracker is privacy constrained", async () => {
  const tracker = await read("public/web-analytics.js");
  assert.match(tracker, /record_web_analytics_event_v2/);
  assert.match(tracker, /sessionStorage/);
  assert.match(tracker, /localStorage/);
  assert.match(tracker, /VISITOR_TTL_MS/);
  assert.match(tracker, /90 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(tracker, /document\.visibilityState/);
  assert.match(tracker, /p_browser/);
  assert.match(tracker, /p_operating_system/);
  assert.match(tracker, /p_device_type/);
  assert.doesNotMatch(tracker, /navigator\.userAgent\b/);
  assert.doesNotMatch(tracker, /location\.search/);
  assert.doesNotMatch(tracker, /document\.cookie/);
});

test("admin analytics dashboard includes user and client dimensions", async () => {
  const component = await read("app/admin-traffic-analytics.tsx");
  assert.match(component, /get_web_analytics_dashboard/);
  assert.match(component, /10_000/);
  assert.match(component, /Người dùng hôm nay/);
  assert.match(component, /Người dùng mới/);
  assert.match(component, /Quay lại/);
  assert.match(component, /Trình duyệt/);
  assert.match(component, /Hệ điều hành/);
  assert.match(component, /Thiết bị/);
  assert.match(component, /Nguồn truy cập/);
});

test("build patch adds analytics tab and tracker", async () => {
  const patch = await read("scripts/patch-realtime-analytics.mjs");
  assert.match(patch, /AdminTrafficAnalytics/);
  assert.match(patch, /Thống kê truy cập/);
  assert.match(patch, /web-analytics\.js/);
  assert.match(patch, /connect-src/);
});

test("database analytics remains private and dashboard admin-only", async () => {
  const baseSql = await read("supabase/migrations/20260914142826_realtime_web_analytics.sql");
  const dimensionSql = await read("supabase/migrations/20260915043500_analytics_user_browser_dimensions.sql");
  assert.match(baseSql, /private\.web_analytics_sessions/);
  assert.match(baseSql, /private\.web_analytics_pageviews/);
  assert.match(baseSql, /private\.user_is_app_admin\(\)/);
  assert.match(baseSql, /revoke all on private\.web_analytics_sessions/);
  assert.match(dimensionSql, /visitor_id uuid/);
  assert.match(dimensionSql, /record_web_analytics_event_v2/);
  assert.match(dimensionSql, /private\.user_is_app_admin\(\)/);
  assert.match(dimensionSql, /grant execute on function public\.record_web_analytics_event_v2.*to anon, authenticated/s);
  assert.match(dimensionSql, /revoke all on function public\.get_web_analytics_dashboard.*from public, anon/s);
});
