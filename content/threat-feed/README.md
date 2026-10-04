# Công cụ kiểm tra lừa đảo (`/cong-cu/kiem-tra-lua-dao/`)

## Kiến trúc
- **Quy tắc + đối chiếu dữ liệu cảnh báo**: `public/scam-check.js` chạy hoàn toàn trên trình duyệt. Nội dung người dùng nhập không rời máy.
- **Dữ liệu cảnh báo**: `scripts/build-threat-feed.mjs` tải URLhaus và Feodo Tracker (abuse.ch, CC0) cùng `content/threat-feed/internal-blocklist.json`, băm SHA-256 và chia thành 256 shard tại `public/threat-data/` (không commit). Trình duyệt chỉ tải shard theo 8 bit đầu của hash. Bước này nằm trong `pnpm run build:pages` nên chạy mỗi lần deploy. Để dữ liệu tự làm mới, thêm vào `.github/workflows/pages.yml` phần `on.schedule: - cron: "17 */6 * * *"`.
- **Chế độ AI**: Edge Function `supabase/functions/scam-analyze` (cần đăng nhập, không nhận tài khoản ẩn danh, giới hạn lượt mỗi ngày). AI chỉ giải thích tín hiệu, không đổi mức rủi ro. Nội dung gửi đi không được lưu; bảng `private.scam_check_usage` chỉ chứa số lượt.

## Triển khai chế độ AI (Ollama trên máy cục bộ)
1. Cài Ollama và model: `ollama pull qwen2.5:7b`.
2. Mở đường hầm tới `http://localhost:11434` bằng Cloudflare Tunnel, bảo vệ bằng Cloudflare Access (service token) hoặc một token riêng. Không mở Ollama công khai.
3. Áp migration `supabase/migrations/20261004090000_scam_check_quota.sql`.
4. Đặt secret cho function rồi deploy:
   ```bash
   supabase secrets set OLLAMA_URL=https://<tunnel-host> OLLAMA_MODEL=qwen2.5:7b \
     OLLAMA_ACCESS_CLIENT_ID=... OLLAMA_ACCESS_CLIENT_SECRET=... SCAM_AI_DAILY_LIMIT=20
   supabase functions deploy scam-analyze
   ```
5. Khi `OLLAMA_URL` chưa đặt hoặc máy tắt, function trả 503 và trang vẫn hiển thị kết quả theo quy tắc.

## Mở rộng dữ liệu
- Thêm mục đã xác minh vào `content/threat-feed/internal-blocklist.json` (domains, urls, ips, phones, emails). Số điện thoại và email được băm khi build.
- Chưa dùng OpenPhish, Spamhaus DROP và danh sách của ChongLuaDao vì chưa xác nhận được quyền phân phối lại dữ liệu.
