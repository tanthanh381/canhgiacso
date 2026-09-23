import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("public tracker is privacy constrained, session-correct and only captures allowlisted UTM fields", async () => {
  const tracker = await read("public/web-analytics.js");
  assert.match(tracker, /record_web_analytics_event_v4/);
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
  assert.match(tracker, /p_country_code/);
  assert.match(tracker, /utm_source/);
  assert.match(tracker, /utm_medium/);
  assert.match(tracker, /utm_campaign/);
  assert.match(tracker, /URLSearchParams\(window\.location\.search\)/);
  assert.doesNotMatch(tracker, /utm_term|utm_content|gclid|fbclid/i);
  assert.doesNotMatch(tracker, /sessionStorage/);
  assert.doesNotMatch(tracker, /navigator\.userAgent\b/);
  assert.doesNotMatch(tracker, /document\.cookie/);
});

test("admin analytics dashboard is organized as a professional end-to-end analytics console", async () => {
  const component = await read("app/admin-traffic-analytics.tsx");
  assert.match(component, /get_web_analytics_dashboard/);
  assert.match(component, /get_google_traffic_dashboard/);
  assert.match(component, /get_web_analytics_insights/);
  assert.match(component, /10_000/);
  assert.match(component, /TỔNG QUAN/);
  assert.match(component, /THU HÚT/);
  assert.match(component, /NỘI DUNG/);
  assert.match(component, /ĐỐI TƯỢNG/);
  assert.match(component, /CHẤT LƯỢNG DỮ LIỆU/);
  assert.match(component, /Thời lượng phiên TB/);
  assert.match(component, /Tỷ lệ tương tác/);
  assert.match(component, /Channel group/);
  assert.match(component, /Campaign UTM/);
  assert.match(component, /Landing page/);
  assert.match(component, /Exit page/);
  assert.match(component, /Traffic từ Google \(referrer\)/);
  assert.match(component, /không phải số liệu GA4/);
  assert.match(component, /chưa kết nối GA4 Data API/);
  assert.match(component, /Google Search Console/);
  assert.match(component, /AdminCountryAnalytics/);
  assert.match(component, /Trình duyệt/);
  assert.match(component, /Hệ điều hành/);
  assert.match(component, /Thiết bị/);
});

test("analytics application wiring is canonical source while build instrumentation only touches static HTML", async () => {
  const [patch, admin, traffic] = await Promise.all([
    read("scripts/patch-realtime-analytics.mjs"),
    read("app/admin.tsx"),
    read("app/admin-traffic-analytics.tsx"),
  ]);
  assert.match(admin, /AdminTrafficAnalytics/);
  assert.match(admin, /Thống kê truy cập/);
  assert.match(traffic, /AdminCountryAnalytics/);
  assert.doesNotMatch(patch, /patchAdmin|patchCountryAnalytics|admin\.tsx|admin-traffic-analytics\.tsx/);
  assert.match(patch, /web-analytics\.js/);
  assert.match(patch, /connect-src/);
});

test("database analytics remains private, separates legacy data and exposes professional insights", async () => {
  const baseSql = await read("supabase/migrations/20260914142826_realtime_web_analytics.sql");
  const dimensionSql = await read("supabase/migrations/20260915043500_analytics_user_browser_dimensions.sql");
  const accuracySql = await read("supabase/migrations/20260915073000_analytics_session_accuracy.sql");
  const googleSql = await read("supabase/migrations/20260915082000_google_traffic_dashboard.sql");
  const professionalSql = await read("supabase/migrations/20260915153000_professional_analytics_dashboard.sql");
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
  assert.match(googleSql, /private\.is_google_referrer/);
  assert.match(googleSql, /get_google_traffic_dashboard/);
  assert.doesNotMatch(googleSql, /googleadservices/);
  assert.match(professionalSql, /record_web_analytics_event_v4/);
  assert.match(professionalSql, /utm_source/);
  assert.match(professionalSql, /utm_medium/);
  assert.match(professionalSql, /utm_campaign/);
  assert.match(professionalSql, /get_web_analytics_insights/);
  assert.match(professionalSql, /pagesPerSession/);
  assert.match(professionalSql, /avgSessionDurationSeconds/);
  assert.match(professionalSql, /engagementRate/);
  assert.match(professionalSql, /landingPages/);
  assert.match(professionalSql, /exitPages/);
  assert.match(professionalSql, /durationBuckets/);
  assert.match(professionalSql, /private\.user_is_app_admin\(\)/);
  assert.match(professionalSql, /revoke all on function public\.get_web_analytics_insights.*from public, anon/s);
});
