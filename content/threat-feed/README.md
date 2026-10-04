# Công cụ kiểm tra lừa đảo (`/cong-cu/kiem-tra-lua-dao/`)

## Kiến trúc
- **Quy tắc + đối chiếu dữ liệu cảnh báo**: `public/scam-check.js` chạy hoàn toàn trên trình duyệt. Nội dung người dùng nhập không rời máy.
- **Dữ liệu cảnh báo**: `scripts/build-threat-feed.mjs` tải URLhaus và Feodo Tracker (abuse.ch, CC0) cùng `content/threat-feed/internal-blocklist.json`, băm SHA-256 và chia thành 256 shard tại `public/threat-data/` (không commit). Trình duyệt chỉ tải shard theo 8 bit đầu của hash. Bước này nằm trong `pnpm run build:pages` nên chạy mỗi lần deploy. Để dữ liệu tự làm mới, thêm vào `.github/workflows/pages.yml` phần `on.schedule: - cron: "17 */6 * * *"`.
- **Chế độ AI**: Edge Function `supabase/functions/scam-analyze` (cần đăng nhập, không nhận tài khoản ẩn danh, giới hạn lượt mỗi ngày). AI chỉ giải thích tín hiệu, không đổi mức rủi ro. Nội dung gửi đi không được lưu; bảng `private.scam_check_usage` chỉ chứa số lượt.

## Triển khai chế độ AI (API miễn phí của bên thứ ba)
Function gọi API tương thích OpenAI (`/chat/completions`), dùng được với Groq, Cloudflare Workers AI, OpenRouter, Mistral...
1. Tạo khóa API ở nhà cung cấp, kiểm tra điều khoản gói miễn phí (đặc biệt là việc dữ liệu có bị dùng để huấn luyện hay không) và tên model hiện hành.
2. Áp migration `supabase/migrations/20261004090000_scam_check_quota.sql`.
3. Đặt secret rồi deploy:
   ```bash
   supabase secrets set AI_API_KEY=... AI_MODEL=<ten-model> \
     AI_BASE_URL=https://api.groq.com/openai/v1 SCAM_AI_DAILY_LIMIT=20
   supabase functions deploy scam-analyze
   ```
   `AI_BASE_URL` mặc định là Groq. Với Cloudflare Workers AI dùng `https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/ai/v1`.
4. Khi `AI_API_KEY` hoặc `AI_MODEL` chưa đặt, hoặc nhà cung cấp lỗi/hết hạn mức, function trả 503 và trang vẫn hiển thị kết quả theo quy tắc.

## Mở rộng dữ liệu
- Thêm mục đã xác minh vào `content/threat-feed/internal-blocklist.json` (domains, urls, ips, phones, emails). Số điện thoại và email được băm khi build.
- Chưa dùng OpenPhish, Spamhaus DROP và danh sách của ChongLuaDao vì chưa xác nhận được quyền phân phối lại dữ liệu.
