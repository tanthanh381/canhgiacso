# Cài đặt GitHub cần bật cho repository

> Các cài đặt dưới đây **nằm ngoài mã nguồn**: chúng được cấu hình trên GitHub, nên không thể thực hiện bằng Pull Request. Tài liệu này được soạn ngoại tuyến và **chưa có lệnh nào được chạy lên GitHub**. Người có quyền *Admin* trên repository phải chạy các lệnh bên dưới (cần `gh auth login` với quyền `repo`). Mỗi mục kèm lệnh kiểm tra để xác nhận kết quả.

Hiện trạng đã ghi nhận trước khi soạn tài liệu: 129/130 commit trên `main` là commit trực tiếp (không qua PR), repository chưa có tag, `CODEOWNERS` chỉ có một người (`@tanthanh381`), chưa thấy ruleset bảo vệ `main`. Chưa kiểm tra được trạng thái bật/tắt của secret scanning và private vulnerability reporting vì không truy cập GitHub từ môi trường soạn thảo; hãy dùng các lệnh kiểm tra bên dưới.

Đặt biến dùng chung cho các lệnh:

```bash
OWNER=tanthanh381
REPO=canhgiacso
gh auth status
```

## 1. Bảo vệ nhánh `main` bằng Ruleset

Mục tiêu: bắt buộc Pull Request, 1 review, các kiểm tra bắt buộc xanh, cấm force-push và xóa nhánh, lịch sử tuyến tính.

> **Cảnh báo trước khi bật — tự động hóa đang đẩy thẳng vào `main`.** Commit `content: add daily security alerts for ...` do một tiến trình chạy trên máy cá nhân của chủ repository (`tanthanh381@Mini.local`) đẩy trực tiếp vào `main`. Ruleset này sẽ **chặn** các lần đẩy trực tiếp đó. Chọn một cách xử lý trước khi bật:
> 1. (Khuyến nghị) đổi tiến trình để nó tạo nhánh + Pull Request và bật auto-merge khi kiểm tra xanh;
> 2. hoặc dùng một tài khoản/GitHub App riêng cho tiến trình này và thêm làm *bypass actor* (`bypass_mode: "always"`) chỉ cho ruleset này;
> 3. hoặc giữ bypass `pull_request` cho vai trò Admin (đã đặt sẵn trong JSON dưới đây): chủ repository vẫn đẩy trực tiếp được qua cơ chế "bypass", mọi lần bypass được ghi log, nhưng khi đó bảo vệ chỉ có ý nghĩa với người khác.

Tên kiểm tra bắt buộc (check run name = tên job):

| Kiểm tra | Workflow | Lý do |
|---|---|---|
| `verify` | `.github/workflows/verify.yml` | quét bí mật, audit, lint, typecheck, test, build:pages, seo:audit |
| `e2e-smoke` | `.github/workflows/verify.yml` | smoke Playwright trên Chromium |
| `CodeQL` | `.github/workflows/security-analysis.yml` | phân tích tĩnh |

Không đưa vào danh sách bắt buộc các workflow có bộ lọc đường dẫn (`seo-verify.yml`) hoặc chỉ chạy sau merge (`cross-os-qc.yml`, `cross-browser-qc.yml`): PR không kích hoạt chúng sẽ bị treo ở trạng thái "đang chờ". Một check chỉ xuất hiện trong danh sách chọn sau khi đã chạy ít nhất một lần, nên hãy mở một PR thử hoặc chạy `verify` trên nhánh bất kỳ trước khi bật.

```bash
cat > /tmp/ruleset-main.json <<'JSON'
{
  "name": "protect-main",
  "target": "branch",
  "enforcement": "active",
  "conditions": {
    "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] }
  },
  "bypass_actors": [
    { "actor_id": 5, "actor_type": "RepositoryRole", "bypass_mode": "pull_request" }
  ],
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "required_linear_history" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 1,
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": true,
        "allowed_merge_methods": ["squash", "rebase"]
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [
          { "context": "verify" },
          { "context": "e2e-smoke" },
          { "context": "CodeQL" }
        ]
      }
    }
  ]
}
JSON

gh api -X POST "repos/$OWNER/$REPO/rulesets" --input /tmp/ruleset-main.json

# Kiểm tra
gh api "repos/$OWNER/$REPO/rulesets" --jq '.[] | {id, name, enforcement}'
```

Ghi chú:

- `actor_id: 5` là vai trò *Repository admin*; `bypass_mode: "pull_request"` nghĩa là admin chỉ bypass được khi mở PR (không đẩy thẳng). Đổi thành `"always"` chỉ khi chấp nhận đẩy thẳng cho vai trò đó.
- Repository chỉ có một người duy nhất có thể review: GitHub không cho tác giả tự duyệt PR của mình. Hãy **thêm ít nhất một người review thứ hai** (hoặc dùng bypass ở trên khi cần). Khi đã có từ 2 người bảo trì trở lên, đổi `require_code_owner_review` thành `true` để `CODEOWNERS` có hiệu lực.
- `required_linear_history` đòi hỏi tắt merge commit (đã tắt ở mục 5); chỉ còn *squash* hoặc *rebase*.
- Ruleset cần repository public hoặc gói GitHub Pro/Team/Enterprise. Nếu API trả về lỗi 403/422 về gói, dùng branch protection kinh điển:

```bash
cat > /tmp/branch-protection.json <<'JSON'
{
  "required_status_checks": { "strict": true, "contexts": ["verify", "e2e-smoke", "CodeQL"] },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
JSON
gh api -X PUT "repos/$OWNER/$REPO/branches/main/protection" --input /tmp/branch-protection.json
gh api "repos/$OWNER/$REPO/branches/main/protection" --jq '{linear: .required_linear_history.enabled, force: .allow_force_pushes.enabled}'
```

Tùy chọn: ruleset cho tag (`"target": "tag"`, rule `deletion` + `non_fast_forward`) để các tag phát hành không bị xóa hay di chuyển, sau khi bắt đầu gắn tag cho mỗi lần phát hành (ví dụ `v2026.10.0`).

## 2. Secret scanning và push protection

```bash
gh api -X PATCH "repos/$OWNER/$REPO" --input - <<'JSON'
{
  "security_and_analysis": {
    "secret_scanning": { "status": "enabled" },
    "secret_scanning_push_protection": { "status": "enabled" }
  }
}
JSON

# Kiểm tra
gh api "repos/$OWNER/$REPO" --jq '.security_and_analysis | {secret_scanning: .secret_scanning.status, push_protection: .secret_scanning_push_protection.status}'
```

Repository private cần GitHub Advanced Security để bật các mục này. Ngoài ra `node scripts/security-scan.mjs` trong CI vẫn là lớp quét thứ hai và không phụ thuộc cài đặt GitHub.

## 3. Báo cáo lỗ hổng riêng tư (private vulnerability reporting)

`SECURITY.md` hướng dẫn người báo cáo dùng mục *Security advisories*; mục đó chỉ hoạt động khi tính năng này được bật.

```bash
gh api -X PUT "repos/$OWNER/$REPO/private-vulnerability-reporting"

# Kiểm tra (kỳ vọng {"enabled": true})
gh api "repos/$OWNER/$REPO/private-vulnerability-reporting"
```

## 4. Dependabot alerts và security updates

```bash
gh api -X PUT "repos/$OWNER/$REPO/vulnerability-alerts"        # Dependabot alerts
gh api -X PUT "repos/$OWNER/$REPO/automated-security-fixes"    # Dependabot security updates

# Kiểm tra (204 = bật, 404 = tắt)
gh api -i "repos/$OWNER/$REPO/vulnerability-alerts" | head -1
gh api "repos/$OWNER/$REPO/automated-security-fixes"
```

Cấu hình cập nhật phiên bản nằm trong mã nguồn tại `.github/dependabot.yml` (đã gom nhóm npm minor/patch và GitHub Actions).

## 5. Phương thức merge và xóa nhánh sau merge

```bash
gh api -X PATCH "repos/$OWNER/$REPO" \
  -F delete_branch_on_merge=true \
  -F allow_merge_commit=false \
  -F allow_squash_merge=true \
  -F allow_rebase_merge=true \
  -F allow_auto_merge=true

gh api "repos/$OWNER/$REPO" --jq '{delete_branch_on_merge, allow_merge_commit, allow_squash_merge, allow_rebase_merge, allow_auto_merge}'
```

## 6. Quyền mặc định của GitHub Actions

Workflow trong repository đã khai báo `permissions` tối thiểu; đặt mặc định ở cấp repository là chỉ-đọc để workflow mới không vô tình có quyền ghi.

```bash
gh api -X PUT "repos/$OWNER/$REPO/actions/permissions/workflow" \
  -f default_workflow_permissions=read \
  -F can_approve_pull_request_reviews=false

gh api "repos/$OWNER/$REPO/actions/permissions/workflow"
```

Tùy chọn (chặt hơn): chỉ cho phép action của GitHub, action đã xác minh và các action đang dùng.

```bash
gh api -X PUT "repos/$OWNER/$REPO/actions/permissions" -F enabled=true -f allowed_actions=selected
gh api -X PUT "repos/$OWNER/$REPO/actions/permissions/selected-actions" --input - <<'JSON'
{
  "github_owned_allowed": true,
  "verified_allowed": false,
  "patterns_allowed": [
    "pnpm/action-setup@*",
    "google/osv-scanner-action/*",
    "anchore/sbom-action@*"
  ]
}
JSON
```

Nếu dùng danh sách này, thêm mẫu mới mỗi khi workflow dùng thêm một action của bên thứ ba.

## 7. GitHub Pages

Production được triển khai bằng workflow `pages.yml` (nguồn: GitHub Actions).

```bash
gh api "repos/$OWNER/$REPO/pages" --jq '{build_type, cname, https_enforced, status}'
# kỳ vọng: build_type = "workflow", cname = "canhgiacso.com", https_enforced = true
gh api -X PUT "repos/$OWNER/$REPO/pages" -F https_enforced=true     # nếu https_enforced đang false
```

Môi trường `github-pages` (Settings → Environments) nên chỉ cho phép triển khai từ nhánh `main`.

## 8. Việc làm thủ công khác trên giao diện

- Settings → Code security: xác nhận **CodeQL default setup đang tắt** (đã có workflow CodeQL riêng; bật cả hai sẽ xung đột).
- Settings → Collaborators/Teams: thêm người bảo trì thứ hai; đặt tài khoản bắt buộc 2FA.
- `CODEOWNERS` hiện chỉ có `@tanthanh381`: thêm ít nhất một người/nhóm thứ hai cho `/.github/workflows/`, `app/admin.tsx`, `app/supabase.ts` và `supabase/`.

## 9. Chuyển repository sang tổ chức HDBank

Thực hiện khi đã có tổ chức GitHub của HDBank (thay `<ORG>` bên dưới) và người có quyền *owner* ở tổ chức đó.

**Trước khi chuyển**

1. Ghi lại cài đặt hiện tại (`gh api repos/$OWNER/$REPO`, `.../pages`, `.../rulesets`) để so sánh sau khi chuyển.
2. Dọn nhánh theo `documentation/maintenance/branch-cleanup.md` để không chuyển hàng chục nhánh bị bỏ rơi.
3. Kiểm tra chính sách của tổ chức: danh sách action được phép (các action đang ghim SHA: `actions/*`, `github/codeql-action`, `pnpm/action-setup`, `google/osv-scanner-action`, `anchore/sbom-action`), SSO/SAML, quyền tạo GitHub Pages cho repository.
4. Thông báo cho người đang dùng URL cũ: GitHub tự chuyển hướng URL repository và `git remote`, nhưng không giữ nguyên địa chỉ `*.github.io` (xem bên dưới).

**Thực hiện chuyển**

```bash
gh api -X POST "repos/$OWNER/$REPO/transfer" -f new_owner=<ORG>
# (hoặc Settings → General → Danger Zone → Transfer ownership)
# Sau đó, ở mỗi máy làm việc:
git remote set-url origin https://github.com/<ORG>/$REPO.git
```

**Sau khi chuyển**

1. **Áp dụng lại cài đặt** ở các mục 1–7 (đổi `OWNER=<ORG>`); ruleset và bảo vệ nhánh không đi theo repository một cách đáng tin cậy. Nếu tổ chức dùng ruleset cấp tổ chức, kiểm tra để không trùng lặp.
2. **GitHub Pages và tên miền**: Settings → Pages: xác nhận nguồn là *GitHub Actions*, tên miền tùy chỉnh `canhgiacso.com` còn hiệu lực và bật *Enforce HTTPS*. Nếu tổ chức bật xác minh tên miền, thêm bản ghi TXT `_github-pages-challenge-<ORG>` do GitHub cung cấp vào DNS. Bản ghi DNS A/AAAA/CNAME trỏ tới GitHub Pages không đổi, nhưng địa chỉ mặc định `<owner>.github.io/<repo>/` sẽ đổi sang `<ORG>.github.io/<repo>/`.
3. **Supabase**: Authentication → URL Configuration vẫn dùng `https://canhgiacso.com/**`. Redirect URL cũ `https://tanthanh381.github.io/chongluadao/**` (ghi trong README) sẽ không còn dùng được sau chuyển; thay bằng URL mới nếu cần, rồi xóa mục cũ khi giai đoạn chuyển đổi kết thúc.
4. **CODEOWNERS** và quyền: thay `@tanthanh381` bằng team của tổ chức (ví dụ `@<ORG>/it-security`); gán team *Admin*/*Maintain* thay vì tài khoản cá nhân.
5. **Secrets/Variables/Environments**: kiểm tra mục *Environments → github-pages* và các secret nếu có; secret của repository thường đi theo repository nhưng cần xác nhận, và các secret cấp tài khoản cá nhân thì không.
6. **Dependabot, CodeQL, secret scanning**: xác nhận vẫn bật (mục 2–4); kiểm tra GitHub Advanced Security của tổ chức.
7. **Cập nhật tham chiếu trong mã**: `SECURITY.md`, README và liên kết trong tài liệu nếu có nhắc tới `tanthanh381`; sau đó chạy lại `verify` và `pages` trên `main` để xác nhận triển khai thành công.
8. **Tự động hóa ngoài GitHub** (tiến trình tạo tin cảnh báo hằng ngày, v.v.): cập nhật địa chỉ remote, thông tin xác thực và quyền ghi vào repository mới.

## 10. Kiểm tra tổng thể sau khi cấu hình

```bash
gh api "repos/$OWNER/$REPO" --jq '{default_branch, delete_branch_on_merge, allow_merge_commit, security: .security_and_analysis}'
gh api "repos/$OWNER/$REPO/rulesets" --jq '.[].name'
gh api "repos/$OWNER/$REPO/private-vulnerability-reporting"
gh api "repos/$OWNER/$REPO/actions/permissions/workflow"
# Thử đẩy thẳng vào main bằng tài khoản không có quyền bypass: kỳ vọng bị từ chối (GH013).
```
