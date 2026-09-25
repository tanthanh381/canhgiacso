# iOS Security and Supabase RLS Review

Review date: 2026-09-25
Branch: `feat/ios-native-p0`

## Scope

The native iOS P0 does not add new database tables, policies, storage buckets, Edge Functions, or service credentials. It reuses the existing Supabase project and public RPC boundary already used by the web app.

## Client Boundary

- The app ships only the Supabase publishable key in `ios/CanhGiacSoCore/AppConfiguration.swift`.
- No `service_role`, `sb_secret`, database URL, or admin credential is present in iOS source.
- Anonymous content reads call `public.get_public_site_content` through `/rest/v1/rpc/get_public_site_content`.
- Authenticated training calls use the user's JWT as the bearer token for:
  - `public.get_game_state`
  - `public.submit_game_choice`
  - `public.restart_game`

## Row Level Security and RPC Findings

- Public content remains read-only through the published-content RPC and `site_content_public_read`.
- Training progress remains server-authoritative. iOS sends `run_id`, `scenario_id`, and `choice_index`; scoring and balance/awareness changes stay in Postgres functions.
- Existing policies restrict direct profile/progress/attempt access by `auth.uid()`.
- Existing migrations revoke direct browser writes to `public.test_attempts` and `public.user_progress`; clients must use the scorer RPC.
- Private admin/editor tables remain in the `private` schema with no direct browser access.

## Session Handling

- iOS stores the Supabase session in Keychain with `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`.
- The app does not store access tokens in `UserDefaults`.
- P0 clears the local session when the server rejects the stored token. A production hardening follow-up should add refresh-token rotation before broad rollout.

## Supabase Changelog Check

The 2026-09-25 changelog scan found no breaking change that requires a different P0 iOS REST/RPC integration. Relevant notes:

- Realtime schema lock-down does not affect this app; P0 does not modify Realtime schema.
- Management API `logs.all` migration does not affect the mobile client.
- Extension version pinning deprecation does not affect this branch; no extension migration is added.

## Remaining Release Gates

- Run Supabase Advisors against the connected project before production submission.
- Confirm App Store redirect/deep-link settings for Supabase Auth if adding magic-link, OAuth, or passkeys.
- Add automated UI tests once Xcode simulator access is available in CI or a local Mac with full Xcode.
