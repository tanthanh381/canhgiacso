# Security decisions for realtime analytics

The public collector is intentionally write-only through narrow SECURITY DEFINER RPCs. Supabase database linter therefore reports that the collector functions are executable by `anon`; this is expected for collecting visits from anonymous website visitors. Direct table access remains revoked and RLS enabled.

The dashboard RPC is intentionally SECURITY DEFINER but checks `private.user_is_app_admin()` before returning any analytics data. It is executable only by authenticated users; non-admin sessions receive SQLSTATE 42501.

The collector validates browser Origin, UUID format, path length/format, referrer hostname, event type, and whitelists browser / operating-system / device labels. It does not accept or persist raw user-agent strings.

Analytics v2 introduces a first-party anonymous visitor UUID so the dashboard can distinguish users from browser sessions and estimate new versus returning users. The visitor UUID is stored in localStorage and rotated after 90 days. It is not linked to Supabase Auth user IDs, emails, names, IP addresses, form values or account data. The tracker also honors Do Not Track.

Browser, OS and device classification happens locally in the browser using coarse browser-provided hints and feature/platform information. Only normalized labels such as `Chrome`, `Safari`, `Windows`, `iOS`, `Desktop` or `Mobile` are sent to the analytics RPC.

Origin validation is not an anti-bot control; analytics can still be spammed by a custom HTTP client. The Data API pre-request hook rate-limits the collector per hashed source IP (300 requests per 5 minutes), which bounds casual abuse but is not bot detection. If abuse becomes material, move collection behind a first-party Edge/Worker endpoint and add server-side bot filtering.

## Source IP handling and retention (2026-10 remediation)

- The analytics tables (`private.web_analytics_*`) never contain an IP address.
- The rate-limit table `private.api_rate_limits` previously stored the raw client IP. Since migration `20261002103000_privacy_rate_limit_and_retention.sql` it stores only `source_ip_hash = sha256(secret : utc_day : ip)`. The secret is generated inside the database (`private.security_settings`, unreadable by the API roles), and the day component means the same IP produces a different hash every day, so hashes cannot be linked across days. The earlier raw-IP rows were deleted when the migration was applied.
- Only the single header configured in `private.security_settings.trusted_ip_header` (default `cf-connecting-ip`, which Cloudflare overwrites) is trusted. `x-forwarded-for` is ignored because its first element is client-controlled. If the platform does not set the trusted header, no source IP is known and rate limiting does not apply (fail-open, to avoid denying legitimate visitors); change the header name in `security_settings` if the hosting path changes.
- Retention: rate-limit rows are purged after 24 hours; analytics pageviews/sessions after 13 months. Purging runs in batches through `private.purge_expired_security_data()`, scheduled hourly with pg_cron when the extension is available and otherwise run opportunistically from the pre-request hook.
- `private.security_audit_log` keeps the IP and user-agent of privileged actors (role changes, content publishing) for security purposes. It has no automatic expiry yet; define a retention period with the data owner.

## Removed: admin-analytics Edge Function

`supabase/functions/admin-analytics` was removed. Nothing in the frontend called it, it decoded the JWT without verifying its signature, and it called the admin-only dashboard RPCs with the service-role key, where `auth.uid()` is NULL and `private.user_is_app_admin()` therefore always denies. The dashboard calls the RPCs directly with the administrator's own AAL2 session. If the function was ever deployed to the Supabase project, delete it with `supabase functions delete admin-analytics` (see `documentation/security/REMEDIATION-2026-10.md`).
