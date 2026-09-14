# Security decisions for realtime analytics

The public collector is intentionally write-only through a narrow SECURITY DEFINER RPC. Supabase database linter therefore reports that the function is executable by `anon`; this is expected for collecting visits from anonymous website visitors. Direct table access remains revoked and RLS enabled.

The dashboard RPC is intentionally SECURITY DEFINER but checks `private.user_is_app_admin()` before returning any analytics data. It is executable only by authenticated users; non-admin sessions receive SQLSTATE 42501.

The collector validates the browser Origin, UUID format, path length/format, referrer hostname and event type. Origin validation is not an anti-bot control; analytics can still be spammed by a custom HTTP client. If abuse becomes material, move collection behind a rate-limited first-party Edge/Worker endpoint.
