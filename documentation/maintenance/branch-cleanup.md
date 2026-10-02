# Dọn dẹp nhánh remote

> **Ảnh chụp ngày 02/10/2026**, đối chiếu với `origin/main` tại `5d71cc2`. Danh sách này được tạo ngoại tuyến từ các tham chiếu remote đã fetch (`git branch -r --merged` / `--no-merged`). **Chưa có lệnh nào trong tài liệu này được chạy lên GitHub**: người có quyền ghi trên repository phải tự chạy các khối lệnh bên dưới. Hãy chạy lại bước 1 trước khi xóa vì số liệu sẽ cũ dần.

Repository có 82 nhánh remote (kể cả `main`): **42 nhánh đã merge vào `main`**, **39 nhánh chưa merge**. Hầu hết nhánh chưa merge đã bị bỏ rơi từ 10–17/09/2026 và lệch `main` hàng trăm commit.

## 1. Chuẩn bị

```bash
git fetch origin --prune

# Nhánh đã merge hoàn toàn vào main (an toàn để xóa)
git branch -r --merged origin/main | grep -v -E 'origin/(HEAD|main)'

# Nhánh chưa merge
git branch -r --no-merged origin/main

# Với mỗi nhánh chưa merge: số commit ahead/behind so với main, và commit nào chưa có patch tương đương trong main
git rev-list --left-right --count origin/main...origin/<nhánh>   # in ra "<behind> <ahead>": behind = commit của main mà nhánh chưa có, ahead = commit của nhánh mà main chưa có
git cherry origin/main origin/<nhánh>                             # dấu '-' = đã có trong main, '+' = chưa
```

Trước khi xóa, kiểm tra không có Pull Request đang mở dùng nhánh đó:

```bash
gh pr list --repo tanthanh381/canhgiacso --state open --json number,headRefName,title
```

Nhánh bị xóa vẫn khôi phục được trong thời gian ngắn từ giao diện GitHub (Pull Request đã đóng → *Restore branch*) và từ SHA: ghi lại bằng `git for-each-ref --format='%(objectname) %(refname:short)' refs/remotes/origin > branch-backup.txt` trước khi xóa.

## 2. Nhóm A — 42 nhánh đã merge vào `main` (xóa an toàn)

Mọi commit của các nhánh này đã nằm trong lịch sử của `main`. Không mất công việc nào khi xóa.

| Nhánh | Commit cuối |
|---|---|
| `feature/admin-certificate-template` | 2026-09-09 |
| `feature/level-unlocks` | 2026-09-09 |
| `feature/training-certificate-pdf` | 2026-09-09 |
| `feature/training-certificates` | 2026-09-09 |
| `fix/admin-hdbank-logo-editor` | 2026-09-09 |
| `fix/certificate-hdbank-right-logo` | 2026-09-09 |
| `fix/neutral-email-placeholder` | 2026-09-09 |
| `security-hardening-2026-09` | 2026-09-09 |
| `feature/phishing-quiz-link` | 2026-09-10 |
| `feature/standalone-phishing-quiz` | 2026-09-10 |
| `fix/rename-simulation-nav` | 2026-09-10 |
| `fix/status-card-spacing` | 2026-09-10 |
| `privacy/consent-mode-v2` | 2026-09-10 |
| `feat/news-editor` | 2026-09-12 |
| `design/visual-refresh` | 2026-09-13 |
| `fix/interactive-practice-navigation` | 2026-09-13 |
| `fix/keep-interactive-practice-nav` | 2026-09-13 |
| `fix/session-bootstrap` | 2026-09-13 |
| `security-hardening` | 2026-09-13 |
| `security/asvs-l2-hardening` | 2026-09-13 |
| `security/hardening-20260913` | 2026-09-13 |
| `ux-refresh` | 2026-09-13 |
| `feature/realtime-traffic-admin-20260914` | 2026-09-14 |
| `fix/awareness-meter` | 2026-09-14 |
| `fix/use-homepage-logo-in-knowledge` | 2026-09-14 |
| `seo/search-traffic-wave2-20260914` | 2026-09-14 |
| `seo/search-traffic-wave3-20260914` | 2026-09-14 |
| `analytics/country-dimension-20260915` | 2026-09-15 |
| `analytics/google-traffic-20260915` | 2026-09-15 |
| `analytics/session-accuracy-20260915` | 2026-09-15 |
| `analytics/user-browser-dimensions-20260915` | 2026-09-15 |
| `feature/analytics-dashboard-pro-20260915` | 2026-09-15 |
| `feature/ga4-20260915` | 2026-09-15 |
| `seo/google-traffic-wave5-20260915` | 2026-09-15 |
| `seo/indexation-wave4-20260915` | 2026-09-15 |
| `fix/cam-nang-checklist-menu-20260916` | 2026-09-16 |
| `fix/cam-nang-menu-link-20260916` | 2026-09-16 |
| `fix/traffic-section-menu-links-20260916` | 2026-09-16 |
| `qc/wave2-content-trust-20260916` | 2026-09-16 |
| `ui/cam-nang-dropdown-polish-20260916` | 2026-09-16 |
| `ui/nav-balance-20260916` | 2026-09-16 |
| `qc/wave3-evidence-governance-20260917` | 2026-09-17 |

Khối lệnh xóa (42 nhánh, chia thành nhiều lần push):

```bash
git push origin --delete \
  feature/admin-certificate-template \
  feature/level-unlocks \
  feature/training-certificate-pdf \
  feature/training-certificates \
  fix/admin-hdbank-logo-editor \
  fix/certificate-hdbank-right-logo \
  fix/neutral-email-placeholder \
  security-hardening-2026-09 \
  feature/phishing-quiz-link \
  feature/standalone-phishing-quiz \
  fix/rename-simulation-nav \
  fix/status-card-spacing \
  privacy/consent-mode-v2 \
  feat/news-editor

git push origin --delete \
  design/visual-refresh \
  fix/interactive-practice-navigation \
  fix/keep-interactive-practice-nav \
  fix/session-bootstrap \
  security-hardening \
  security/asvs-l2-hardening \
  security/hardening-20260913 \
  ux-refresh \
  feature/realtime-traffic-admin-20260914 \
  fix/awareness-meter \
  fix/use-homepage-logo-in-knowledge \
  seo/search-traffic-wave2-20260914 \
  seo/search-traffic-wave3-20260914 \
  analytics/country-dimension-20260915

git push origin --delete \
  analytics/google-traffic-20260915 \
  analytics/session-accuracy-20260915 \
  analytics/user-browser-dimensions-20260915 \
  feature/analytics-dashboard-pro-20260915 \
  feature/ga4-20260915 \
  seo/google-traffic-wave5-20260915 \
  seo/indexation-wave4-20260915 \
  fix/cam-nang-checklist-menu-20260916 \
  fix/cam-nang-menu-link-20260916 \
  fix/traffic-section-menu-links-20260916 \
  qc/wave2-content-trust-20260916 \
  ui/cam-nang-dropdown-polish-20260916 \
  ui/nav-balance-20260916 \
  qc/wave3-evidence-governance-20260917
```

## 3. Nhóm B — nhánh còn hoạt động (giữ)

| Nhánh | Commit cuối | Tuổi (ngày) | Ahead / behind so với main | Commit mới (chưa có trong main) | Tiêu đề commit cuối |
|---|---|---:|---|---:|---|
| `feat/ios-native-p0` | 2026-09-26 | 6 | +5 / −18 | 5 | chore: verify iOS build with Xcode |

`feat/ios-native-p0` là nhánh duy nhất có hoạt động gần đây (commit cuối 26/09/2026). **Giữ lại**, nên rebase lên `main` hiện tại (đang sau `main` 18 commit) và mở Pull Request sớm để tránh lệch thêm.

## 4. Nhóm C — 9 nhánh chưa được ghi nhận là merge nhưng patch đã có trong `main`

Với các nhánh này, `git cherry` cho thấy **mọi commit đều đã có patch tương đương trong `main`** (cột "Commit mới" bằng 0): công việc đã được đưa vào bằng cherry-pick, rebase hoặc squash, nên Git không coi là "đã merge". Xóa an toàn; nếu muốn chắc chắn, chạy `git diff origin/main...origin/<nhánh>` và xác nhận không còn thay đổi cần giữ.

| Nhánh | Commit cuối | Tuổi (ngày) | Ahead / behind so với main | Commit mới (chưa có trong main) | Tiêu đề commit cuối |
|---|---|---:|---|---:|---|
| `fix/homepage-cache-cleanup` | 2026-09-10 | 22 | +1 / −602 | 0 | fix: prevent stale homepage block from persisting |
| `privacy/remove-secureprivacy` | 2026-09-10 | 22 | +1 / −604 | 0 | privacy: remove Secure Privacy integration |
| `privacy/secureprivacy-tag` | 2026-09-10 | 22 | +1 / −605 | 0 | privacy: inject Secure Privacy tag into all pages |
| `feat/expand-essential-security-checklist` | 2026-09-13 | 19 | +1 / −538 | 0 | feat: expand essential security checklist |
| `feat/knowledge-security-checklist` | 2026-09-13 | 19 | +1 / −585 | 0 | feat: add interactive security checklist to knowledge guide |
| `fix/data-api-pre-request-permissions` | 2026-09-13 | 19 | +1 / −541 | 0 | fix: restore Data API pre-request execution |
| `fix/simulation-banner-visibility` | 2026-09-13 | 19 | +1 / −587 | 0 | fix: limit simulation warning banner to training views |
| `fix/remove-checklist-source-note` | 2026-09-14 | 18 | +1 / −531 | 0 | fix: remove checklist source note |
| `fix/browser-title-remove-hdbank-20260917` | 2026-09-17 | 15 | +1 / −394 | 0 | Fix browser title to Cảnh Giác Số |

```bash
git push origin --delete \
  fix/homepage-cache-cleanup \
  privacy/remove-secureprivacy \
  privacy/secureprivacy-tag \
  feat/expand-essential-security-checklist \
  feat/knowledge-security-checklist \
  fix/data-api-pre-request-permissions \
  fix/simulation-banner-visibility \
  fix/remove-checklist-source-note \
  fix/browser-title-remove-hdbank-20260917
```

## 5. Nhóm D — 10 nhánh Dependabot

| Nhánh | Commit cuối | Tuổi (ngày) | Ahead / behind so với main | Commit mới (chưa có trong main) | Tiêu đề commit cuối |
|---|---|---:|---|---:|---|
| `dependabot/github_actions/anchore/sbom-action-0.24.2` | 2026-09-13 | 19 | +1 / −535 | 1 | chore(deps): bump anchore/sbom-action from 0.20.6 to 0.24.2 |
| `dependabot/npm_and_yarn/multi-7f19880bf6` | 2026-09-13 | 19 | +1 / −586 | 1 | chore(deps): bump react and @types/react |
| `dependabot/npm_and_yarn/tailwindcss/postcss-4.3.3` | 2026-09-13 | 19 | +1 / −586 | 1 | chore(deps-dev): bump @tailwindcss/postcss from 4.2.1 to 4.3.3 |
| `dependabot/npm_and_yarn/vitejs/plugin-react-6.1.1` | 2026-09-13 | 19 | +1 / −586 | 1 | chore(deps-dev): bump @vitejs/plugin-react from 6.0.2 to 6.1.1 |
| `dependabot/npm_and_yarn/vitejs/plugin-rsc-0.5.34` | 2026-09-13 | 19 | +1 / −586 | 1 | chore(deps-dev): bump @vitejs/plugin-rsc from 0.5.26 to 0.5.34 |
| `dependabot/github_actions/actions/checkout-7.0.1` | 2026-09-23 | 9 | +1 / −112 | 1 | build(deps): bump actions/checkout from 6.1.0 to 7.0.1 |
| `dependabot/github_actions/actions/deploy-pages-5.0.1` | 2026-09-23 | 9 | +1 / −112 | 1 | build(deps): bump actions/deploy-pages from 4.0.5 to 5.0.1 |
| `dependabot/github_actions/actions/setup-node-7.0.0` | 2026-09-23 | 9 | +1 / −112 | 1 | build(deps): bump actions/setup-node from 6.5.0 to 7.0.0 |
| `dependabot/github_actions/pnpm/action-setup-6.1.0` | 2026-09-23 | 9 | +1 / −311 | 1 | chore(deps): bump pnpm/action-setup from 4.3.0 to 6.1.0 |
| `dependabot/npm_and_yarn/wrangler-4.130.0` | 2026-09-23 | 9 | +1 / −187 | 1 | chore(deps-dev): bump wrangler from 4.92.0 to 4.135.0 |

Khuyến nghị: **đóng các PR và xóa nhánh**. Cấu hình `.github/dependabot.yml` mới gom cập nhật npm minor/patch và GitHub Actions thành ít PR hơn, nên Dependabot sẽ tự mở lại các bản cập nhật còn thiếu theo nhóm. Một số bản nâng đã được áp dụng trực tiếp (ví dụ `react`/`react-dom` 19.2.8, `wrangler` 4.146.0, `vite` 8.3.2, `@playwright/test` 1.55.1). Các bản nâng GitHub Actions (`checkout`, `setup-node`, `deploy-pages`, `pnpm/action-setup`, `sbom-action`) vẫn chưa được áp dụng: nên để Dependabot mở lại PR gom nhóm và kiểm tra từng workflow trước khi merge.

```bash
git push origin --delete \
  dependabot/github_actions/anchore/sbom-action-0.24.2 \
  dependabot/npm_and_yarn/multi-7f19880bf6 \
  dependabot/npm_and_yarn/tailwindcss/postcss-4.3.3 \
  dependabot/npm_and_yarn/vitejs/plugin-react-6.1.1 \
  dependabot/npm_and_yarn/vitejs/plugin-rsc-0.5.34 \
  dependabot/github_actions/actions/checkout-7.0.1 \
  dependabot/github_actions/actions/deploy-pages-5.0.1 \
  dependabot/github_actions/actions/setup-node-7.0.0 \
  dependabot/github_actions/pnpm/action-setup-6.1.0 \
  dependabot/npm_and_yarn/wrangler-4.130.0
```

## 6. Nhóm E — 19 nhánh chưa merge, có commit chưa có trong `main`, đã bị bỏ rơi

Nhóm này có công việc **chưa** nằm trong `main`, nhưng đều cũ (commit cuối từ 10/09 đến 16/09/2026) và tụt sau `main` rất xa (behind từ 411 đến 634 commit), nên rebase nguyên nhánh gần như không khả thi. Một số nhánh trùng chủ đề với nhánh đã merge ở Nhóm A (ví dụ `seo/*`, `analytics/*`), có khả năng đã bị thay thế; cần người phụ trách xác nhận. Gợi ý xử lý:

1. Với mỗi nhánh, người từng làm nhánh đó xác nhận trong vòng một tuần xem có ý tưởng/test nào còn cần.
2. Nếu còn cần: tạo Issue ghi mục tiêu và đường dẫn nhánh, **cherry-pick** các commit cần thiết lên nhánh mới từ `main` hiện tại (đừng rebase cả nhánh).
3. Nếu không còn cần hoặc không ai nhận: **đóng PR (nếu có) và xóa nhánh**. Để lưu vết, tạo tag lưu trữ trước khi xóa, ví dụ `git tag archive/<nhánh> origin/<nhánh> && git push origin archive/<nhánh>`.

| Nhánh | Commit cuối | Tuổi (ngày) | Ahead / behind so với main | Commit mới (chưa có trong main) | Tiêu đề commit cuối |
|---|---|---:|---|---:|---|
| `analytics/google-tag` | 2026-09-10 | 22 | +5 / −606 | 5 | analytics: add GA4 Google tag to scam awareness article |
| `feature/cyber-certificate-v3` | 2026-09-10 | 22 | +2 / −620 | 2 | ci: validate cyber certificate v3 |
| `feature/google-analytics` | 2026-09-10 | 22 | +3 / −606 | 3 | test: verify GA4 injection in Pages build |
| `feature/standalone-phishing-quiz-temp` | 2026-09-10 | 22 | +2 / −634 | 1 | ci: apply quiz navigation rename |
| `fix/certificate-stale-sync-20260910` | 2026-09-10 | 22 | +2 / −610 | 2 | ci: validate certificate sync recovery |
| `qa/full-site-20260910` | 2026-09-10 | 22 | +7 / −612 | 7 | fix: resolve QC regressions and web type errors |
| `qc/full-site-2026-09-10` | 2026-09-10 | 22 | +2 / −612 | 2 | fix: resolve certificate editor lint and accessibility issues |
| `security/hardening-90` | 2026-09-10 | 22 | +14 / −608 | 14 | ci: replace dependency review with portable pnpm audit |
| `seo/google-search-optimization` | 2026-09-10 | 22 | +10 / −607 | 10 | ci: add SEO regression verification |
| `ui/remove-home-seo-footer` | 2026-09-10 | 22 | +2 / −603 | 2 | ci: stop requiring homepage knowledge links |
| `fix/news-editor-image-validation` | 2026-09-12 | 20 | +2 / −593 | 2 | test: cover body image validation regression |
| `seo/full-site-optimization-20260913` | 2026-09-13 | 19 | +9 / −538 | 9 | seo: add noindex 404 page |
| `seo/keyword-clusters-20260913` | 2026-09-13 | 19 | +7 / −536 | 7 | seo: audit new anti-scam keyword landing pages |
| `seo/top10-foundation` | 2026-09-13 | 19 | +5 / −587 | 5 | ci: verify new SEO landing pages |
| `seo/full-recommendations-20260914` | 2026-09-14 | 18 | +10 / −528 | 10 | chore: align manifest with lockfile |
| `seo/organic-growth-engine-20260914` | 2026-09-14 | 18 | +7 / −526 | 7 | seo: expose high-intent pages from homepage |
| `seo/trim-long-titles-20260914` | 2026-09-14 | 18 | +2 / −527 | 2 | seo: apply title overrides before Pages build |
| `ui/knowledge-brand-alignment-20260914` | 2026-09-14 | 18 | +4 / −525 | 4 | fix: keep manifest aligned with lockfile |
| `ui/navbar-balance-fix-20260916` | 2026-09-16 | 16 | +2 / −411 | 2 | test(nav): lock balanced menu alignment |

Khối lệnh xóa sau khi đã xác nhận (chỉ chạy khi chấp nhận mất các commit trên, hoặc đã tạo tag lưu trữ):

```bash
git push origin --delete \
  analytics/google-tag \
  feature/cyber-certificate-v3 \
  feature/google-analytics \
  feature/standalone-phishing-quiz-temp \
  fix/certificate-stale-sync-20260910 \
  qa/full-site-20260910 \
  qc/full-site-2026-09-10 \
  security/hardening-90 \
  seo/google-search-optimization \
  ui/remove-home-seo-footer \
  fix/news-editor-image-validation \
  seo/full-site-optimization-20260913 \
  seo/keyword-clusters-20260913 \
  seo/top10-foundation

git push origin --delete \
  seo/full-recommendations-20260914 \
  seo/organic-growth-engine-20260914 \
  seo/trim-long-titles-20260914 \
  ui/knowledge-brand-alignment-20260914 \
  ui/navbar-balance-fix-20260916
```

## 7. Ngăn tình trạng này quay lại

- Bật **Automatically delete head branches** (Settings → General → Pull Requests, hoặc `gh api -X PATCH repos/tanthanh381/canhgiacso -f delete_branch_on_merge=true`). Xem `documentation/maintenance/github-settings.md`.
- Làm việc theo Pull Request từ nhánh ngắn hạn, merge nhanh (xem `CONTRIBUTING.md`).
- Đặt quy ước đặt tên: `feat/…`, `fix/…`, `docs/…`, `chore/…`; nhánh không có hoạt động quá 30 ngày thì đóng.
