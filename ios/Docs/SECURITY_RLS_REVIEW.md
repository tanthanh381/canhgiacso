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
  - `public.get_my_training_certificates`
  - `public.issue_training_certificate`

## Row Level Security and RPC Findings

- Public content remains read-only through the published-content RPC and `site_content_public_read`.
- Training progress remains server-authoritative. iOS sends `run_id`, `scenario_id`, and `choice_index`; scoring and balance/awareness changes stay in Postgres functions.
- Training certificates remain server-issued through `private.training_certificates`; iOS can request and display certificates but cannot write certificate rows.
- Existing policies restrict direct profile/progress/attempt access by `auth.uid()`.
- Existing migrations revoke direct browser writes to `public.test_attempts` and `public.user_progress`; clients must use the scorer RPC.
- Private admin/editor tables remain in the `private` schema with no direct browser access.

## Session Handling

- iOS stores the Supabase session in Keychain with `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`.
- The app does not store access tokens in `UserDefaults`.
- P0 attempts Supabase refresh-token rotation after 401/403 responses, updates the Keychain session on success, and clears the local session when refresh fails.

## Supabase Changelog Check

The 2026-09-26 changelog scan found no breaking change that requires a different P0 iOS REST/RPC integration. Relevant notes:

- PostgreSQL 15.19 / 17.11 minor release notes affect ltree, pgcrypto legacy ciphers, btree_gist indexes and custom operators. This iOS branch does not add database encryption, extensions, custom operators or migrations, so no client-side change is required.
- Realtime schema lock-down does not affect this app; P0 does not modify Realtime schema.
- Management API `logs.all` migration does not affect the mobile client.
- Extension version pinning deprecation does not affect this branch; no extension migration is added.

## Remaining Release Gates

- Run Supabase Advisors against the connected project before production submission.
- Confirm App Store redirect/deep-link settings for Supabase Auth if adding magic-link, OAuth, or passkeys.
- Add automated UI tests once Xcode simulator access is available in CI or a local Mac with full Xcode.
