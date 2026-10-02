# Security decisions for realtime analytics

The public collector is intentionally write-only through narrow SECURITY DEFINER RPCs. Supabase database linter therefore reports that the collector functions are executable by `anon`; this is expected for collecting visits from anonymous website visitors. Direct table access remains revoked and RLS enabled.

The dashboard RPC is intentionally SECURITY DEFINER but checks `private.user_is_app_admin()` before returning any analytics data. It is executable only by authenticated users; non-admin sessions receive SQLSTATE 42501.

The collector validates browser Origin, UUID format, path length/format, referrer hostname, event type, and whitelists browser / operating-system / device labels. It does not accept or persist raw user-agent strings.

Analytics v2 introduces a first-party anonymous visitor UUID so the dashboard can distinguish users from browser sessions and estimate new versus returning users. The visitor UUID is stored in localStorage and rotated after 90 days. It is not linked to Supabase Auth user IDs, emails, names, IP addresses, form values or account data. The tracker also honors Do Not Track.

Browser, OS and device classification happens locally in the browser using coarse browser-provided hints and feature/platform information. Only normalized labels such as `Chrome`, `Safari`, `Windows`, `iOS`, `Desktop` or `Mobile` are sent to the analytics RPC.

Origin validation is not an anti-bot control; analytics can still be spammed by a custom HTTP client. If abuse becomes material, move collection behind a rate-limited first-party Edge/Worker endpoint and add server-side bot filtering.
