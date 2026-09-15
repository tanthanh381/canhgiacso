import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("public tracker estimates country without IP geolocation", async () => {
  const tracker = await read("public/web-analytics.js");
  assert.match(tracker, /record_web_analytics_event_v4/);
  assert.match(tracker, /estimatedCountryCode/);
  assert.match(tracker, /Asia\/Ho_Chi_Minh/);
  assert.match(tracker, /p_country_code/);
  assert.match(tracker, /Intl\.DateTimeFormat/);
  assert.match(tracker, /Intl\.Locale/);
  assert.doesNotMatch(tracker, /navigator\.geolocation|ipapi|ipinfo|ipwho|geoip/i);
});

test("country migration validates country codes and the follow-up migration fixes Google referrer lookup", async () => {
  const sql = await read("supabase/migrations/20260915090000_analytics_country_dimension.sql");
  const professionalSql = await read("supabase/migrations/20260915153000_professional_analytics_dashboard.sql");
  assert.match(sql, /country_code text/);
  assert.match(sql, /\^\[A-Z\]\{2\}\$/);
  assert.match(sql, /record_web_analytics_event_v3/);
  assert.match(sql, /get_country_traffic_dashboard/);
  assert.match(sql, /private\.user_is_app_admin\(\)/);
  assert.match(sql, /revoke all on function public\.get_country_traffic_dashboard.*from public, anon/s);
  assert.match(sql, /googleCountries/);
  assert.match(professionalSql, /create or replace function public\.get_country_traffic_dashboard/);
  assert.match(professionalSql, /private\.is_google_referrer\(s\.entry_referrer_host\)/);
  assert.doesNotMatch(professionalSql, /private\.is_google_referrer_host/);
});

test("country dashboard is mounted directly into the professional traffic dashboard", async () => {
  const component = await read("app/admin-country-analytics.tsx");
  const traffic = await read("app/admin-traffic-analytics.tsx");
  assert.match(component, /Quốc gia người dùng \(ước tính\)/);
  assert.match(component, /get_country_traffic_dashboard/);
  assert.match(component, /Quốc gia · Traffic từ Google/);
  assert.match(component, /Không dùng IP geolocation|không dùng IP geolocation/i);
  assert.match(traffic, /AdminCountryAnalytics/);
  assert.match(traffic, /<AdminCountryAnalytics windowKey=\{windowKey\} \/>/);
});
