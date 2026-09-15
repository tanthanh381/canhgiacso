import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("public tracker estimates country without IP geolocation", async () => {
  const tracker = await read("public/web-analytics.js");
  assert.match(tracker, /record_web_analytics_event_v3/);
  assert.match(tracker, /estimatedCountryCode/);
  assert.match(tracker, /Asia\/Ho_Chi_Minh/);
  assert.match(tracker, /p_country_code/);
  assert.match(tracker, /Intl\.DateTimeFormat/);
  assert.match(tracker, /Intl\.Locale/);
  assert.doesNotMatch(tracker, /geolocation/i);
  assert.doesNotMatch(tracker, /ipapi|ipinfo|ipwho|geoip/i);
});

test("country migration validates ISO-like country codes and keeps admin reads private", async () => {
  const sql = await read("supabase/migrations/20260915090000_analytics_country_dimension.sql");
  assert.match(sql, /country_code text/);
  assert.match(sql, /\^\[A-Z\]\{2\}\$/);
  assert.match(sql, /record_web_analytics_event_v3/);
  assert.match(sql, /get_country_traffic_dashboard/);
  assert.match(sql, /private\.user_is_app_admin\(\)/);
  assert.match(sql, /revoke all on function public\.get_country_traffic_dashboard.*from public, anon/s);
  assert.match(sql, /googleCountries/);
});

test("country dashboard is mounted into traffic analytics during build", async () => {
  const component = await read("app/admin-country-analytics.tsx");
  const patch = await read("scripts/patch-realtime-analytics.mjs");
  assert.match(component, /Quốc gia người dùng \(ước tính\)/);
  assert.match(component, /get_country_traffic_dashboard/);
  assert.match(component, /Quốc gia · Traffic từ Google/);
  assert.match(component, /Không dùng IP geolocation|không dùng IP geolocation/i);
  assert.match(patch, /AdminCountryAnalytics/);
  assert.match(patch, /patchCountryAnalytics/);
});
