# OWASP ASVS Level 2 — Remediation Evidence

This document records the implementation status of the eight remediation items identified during the Cảnh Giác Số ASVS Level 2 gap assessment.

| # | Remediation | Status | Implemented evidence | Remaining dependency / note |
|---|---|---|---|---|
| 1 | Mandatory MFA/TOTP for Admin & Editor; enforce AAL2 server-side | Implemented | `app/security-hardening.tsx`; database helpers require `auth.jwt()->>'aal' = 'aal2'`; live `auth.sessions` check retained | Admin/Editor must enroll a TOTP factor on next privileged access |
| 2 | Supabase Leaked Password Protection | Blocked by plan | Password complexity already enforced in app; security advisor tracks leaked-password protection | Supabase feature requires Pro Plan or above; enable immediately after plan upgrade |
| 3 | Append-only security audit logging | Implemented | Supabase Auth audit logs + `private.security_audit_log`; successful role/content changes recorded; denied privileged attempts emitted to Postgres security logs | External SIEM/log drain recommended for centralized alerting |
| 4 | Rate limiting / anti-automation | Implemented / partial infrastructure | `private.data_api_pre_request()` throttles guest and privileged Data API RPCs by source IP; Supabase Auth built-in rate limits protect login | CAPTCHA is optional hardening and requires hCaptcha/Turnstile provider credentials and Auth dashboard configuration |
| 5 | CSP / HTTP security-header hardening | Partial | CSP tightened with self-hosted scripts, `object-src 'none'`, `base-uri 'none'`, disabled media/workers, HTTPS upgrade | GitHub Pages cannot set full response-header baseline; `style-src 'unsafe-inline'` remains until inline-style refactor/hosting migration |
| 6 | ASVS negative authorization tests | Implemented | `supabase/tests/database/001_asvs_authorization.test.sql`; `tests/asvs-security-contract.test.mjs` | Runtime authenticated role matrix should also be exercised in a staging environment before formal certification |
| 7 | SAST + SCA + SBOM | Implemented | `.github/workflows/security-analysis.yml`: CodeQL security-extended, OSV Scanner, CycloneDX SBOM | Keep actions/dependency versions current via periodic review |
| 8 | Threat model / DFD / trust boundaries | Implemented | `docs/security/THREAT-MODEL.md` with assets, DFD, trust boundaries, STRIDE and abuse cases | Re-review on architectural/security-sensitive changes |

## Enforcement details

### Privileged MFA

The browser MFA gate improves user experience, but it is not the security boundary. Authorization remains enforced by PostgreSQL. `private.user_can_edit_content()` and `private.user_is_app_admin()` require:

- an authenticated user;
- a live `auth.sessions` row matching the JWT `session_id`;
- JWT `aal=aal2`;
- the required editor/admin membership.

This prevents bypassing MFA by modifying JavaScript, hiding the modal, or calling the RPC directly.

### Audit model

Authentication lifecycle events are captured by Supabase Auth audit logging. Application-specific privileged events are stored separately in the private append-only audit table. Browser roles receive no INSERT/UPDATE/DELETE privilege on this table.

Successful events include:

- `CONTENT_DRAFT_SAVED`
- `CONTENT_PUBLISHED`
- `ROLE_CHANGED`

Denied privileged requests and rate-limit violations are written to PostgreSQL server logs with a `security_event` marker because a database audit insert in the same transaction would be rolled back together with the denied request.

### Anti-abuse

Data API pre-request throttling is applied to mutating calls for:

- `evaluate_guest_choice`: 60 requests / 5 minutes / IP
- `save_managed_site_content`: 30 requests / 5 minutes / IP
- `set_content_manager_role`: 10 requests / 5 minutes / IP

The Auth service is outside PostgREST and therefore uses Supabase Auth's own rate-limit controls. CAPTCHA should be added when provider credentials are available if the public authentication surface experiences automated abuse.

## Infrastructure blockers

### Leaked Password Protection

Supabase documents Leaked Password Protection as a Pro Plan-and-above feature. The current project is on the Free plan, so this setting cannot be completed by application/database code alone.

Remediation after upgrade:

1. Upgrade the Supabase organization to Pro or higher.
2. Open Auth password-security settings.
3. Enable leaked password protection.
4. Re-run Supabase Security Advisor and require zero remaining authentication warnings.

Reference: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

### Full HTTP security headers

GitHub Pages does not provide repository-controlled arbitrary HTTP response headers. Meta CSP provides useful browser protection but cannot fully replace response headers, especially for directives such as `frame-ancestors` and controls such as HSTS, `X-Content-Type-Options`, and Permissions-Policy.

Target architecture for full remediation:

```text
Internet
   |
Header-capable CDN / reverse proxy
   |  CSP response header
   |  HSTS
   |  X-Content-Type-Options
   |  Permissions-Policy
   |  frame-ancestors
   v
GitHub Pages origin
```

A future frontend cleanup should also replace inline style attributes so `style-src 'unsafe-inline'` can be removed.

## ASVS verification rule

These controls materially improve ASVS Level 2 readiness, but formal ASVS L2 conformance should only be claimed after:

- the production migrations have been applied and verified;
- security workflows pass on `main`;
- Admin/Editor TOTP enrollment and AAL2 enforcement are tested end-to-end;
- horizontal and vertical authorization tests are executed against a staging environment;
- production TLS and HTTP response headers are independently verified;
- the two infrastructure blockers above are closed or formally accepted as residual risk.
