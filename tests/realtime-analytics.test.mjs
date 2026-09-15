import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("public tracker is privacy constrained and uses shared 30 minute sessions", async () => {
  const tracker = await read("public/web-analytics.js");
  assert.match(tracker, /record_web_analytics_event_v2/);
  assert.match(tracker, /localStorage/);
  assert.match(tracker, /SESSION_TIMEOUT_MS/);
  assert.match(tracker, /30 \* 60 \* 1000/);
  assert.match(tracker, /VISITOR_TTL_MS/);
  assert.match(tracker, /90 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(tracker, /event\.key === SESSION_KEY/);
  assert.match(tracker, /document\.visibilityState/);
  assert.match(tracker, /p_browser/);
  assert.match(tracker, /p_operating_system/);
  assert.match(tracker, /p_device_type/);
  assert.doesNotMatch(tracker, /sessionStorage/);
  assert.doesNotMatch(tracker, /navigator\.userAgent\b/);
  assert.doesNotMatch(tracker, /location\.search/);
  assert.doesNotMatch(tracker, /document\.cookie/);
});

test("admin analytics dashboard separates identified users from legacy sessions and tracks Google traffic", async () => {
  const component = await read("app/admin-traffic-analytics.tsx");
  assert.match(component, /get_web_analytics_dashboard/);
  assert.match(component, /get_google_traffic_dashboard/);
  assert.match(component, /10_000/);
  assert.match(component, /Người dùng đã nhận diện hôm nay/);
  assert.match(component, /Độ tin cậy dữ liệu người dùng/);
  assert.match(component, /Phiên legacy/);
  assert.match(component, /không quy đổi session legacy thành user/);
  assert.match(component, /Traffic từ Google/);
  assert.match(component, /Người dùng từ Google/);
  assert.match(component, /Phiên từ Google/);
  assert.match(component, /Landing page từ Google/);
  assert.match(component, /Google Search Console/);
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

test("database analytics remains private and never converts legacy sessions into users", async () => {
  const baseSql = await read("supabase/migrations/20260914142826_realtime_web_analytics.sql");
  const dimensionSql = await read("supabase/migrations/20260915043500_analytics_user_browser_dimensions.sql");
  const accuracySql = await read("supabase/migrations/20260915073000_analytics_session_accuracy.sql");
  const googleSql = await read("supabase/migrations/20260915082000_google_traffic_dashboard.sql");
  assert.match(baseSql, /private\.web_analytics_sessions/);
  assert.match(baseSql, /private\.web_analytics_pageviews/);
  assert.match(baseSql, /private\.user_is_app_admin\(\)/);
  assert.match(baseSql, /revoke all on private\.web_analytics_sessions/);
  assert.match(dimensionSql, /visitor_id uuid/);
  assert.match(dimensionSql, /record_web_analytics_event_v2/);
  assert.match(accuracySql, /count\(distinct s\.visitor_id\)/);
  assert.match(accuracySql, /s\.visitor_id is null/);
  assert.match(accuracySql, /legacySessionsWindow/);
  assert.match(accuracySql, /identifiedPageviewsWindow/);
  assert.doesNotMatch(accuracySql, /coalesce\(s\.visitor_id::text, s\.session_id::text\)/);
  assert.match(accuracySql, /private\.user_is_app_admin\(\)/);
  assert.match(accuracySql, /revoke all on function public\.get_web_analytics_dashboard.*from public, anon/s);
  assert.match(googleSql, /private\.is_google_referrer/);
  assert.match(googleSql, /get_google_traffic_dashboard/);
  assert.match(googleSql, /googleSessions/);
  assert.match(googleSql, /googleLandingPages/);
  assert.match(googleSql, /googleBrowsers/);
  assert.match(googleSql, /private\.user_is_app_admin\(\)/);
  assert.match(googleSql, /revoke all on function public\.get_google_traffic_dashboard.*from public, anon/s);
  assert.doesNotMatch(googleSql, /googleadservices/);
});
