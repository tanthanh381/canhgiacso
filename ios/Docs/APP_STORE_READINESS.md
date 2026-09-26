# Cảnh Giác Số iOS App Store Readiness

Status: P0 native SwiftUI app scaffolded
Bundle ID: `com.canhgiacso.ios`
Minimum iOS: 17.0

## Implemented

- Native SwiftUI shell with Thử thách, Cẩm nang, Tin tức, and Tài khoản tabs.
- Supabase REST/Auth integration using the existing publishable key and RLS-protected RPCs.
- Public content loading through `get_public_site_content` with bundled fallback content.
- Email/password sign-in and sign-up using existing username/display-name metadata contract.
- Authenticated training state loading, answer submission, and restart through server-side scoring RPCs.
- Keychain session storage with refresh-token retry for expired access tokens.
- Server-issued certificate listing and certificate issuance from the current completed training run.
- Swift core checks, XCTest files, Xcode project, and a GitHub Actions iOS workflow template.

## CI Activation Note

`ios/Docs/IOS_GITHUB_ACTIONS_TEMPLATE.yml` is ready to copy into `.github/workflows/ios.yml` after the GitHub credential used for pushing has `workflow scope`. The current Codex OAuth token can push app and documentation code, but GitHub rejects direct workflow-file updates without that scope.

## TestFlight Checklist

- Create the App Store Connect app record for `com.canhgiacso.ios`.
- Assign the Apple Developer Team ID in the Xcode target.
- Replace generated launch screen defaults if brand guidelines require a custom launch screen.
- Add production App Icon assets for all required iOS sizes.
- Archive with Release configuration and upload from Xcode Organizer or CI signing lane.
- Add internal testers first, then external testers after beta review.
- Verify sign-up, sign-in, training submission, restart, offline fallback, and source links on a physical iPhone.

## App Store Submission Checklist

- App name: `Cảnh Giác Số`.
- Category: Education.
- Age rating: training/education content; no real-money gaming.
- Privacy Nutrition Label:
  - Account information: collected for authentication.
  - User ID: used for training progress.
  - Training interactions: used for app functionality and organizational reporting where applicable.
  - No tracking across apps or websites in the P0 native app.
- Data safety copy should explain that scenario balances are simulation data, not real financial accounts.
- Provide support URL and privacy policy URL from `canhgiacso.com`.
- Add screenshots for 6.7-inch iPhone, 6.5-inch iPhone if required, and iPad if keeping iPad support enabled.
- Include beta notes that the app uses Supabase-hosted content and requires network access for saved training progress.

## Production Hardening Follow-Ups

- Add UI tests for onboarding, content loading, answer submission, and restart.
- Add App Attest or DeviceCheck if abuse pressure appears on public endpoints.
- Add localized App Store metadata in Vietnamese and English.
- Add native certificate PDF rendering/export to match the web download flow.
