# Kiểm thử bản sửa lưu kết quả và lịch sử — 09/09/2026

Phạm vi: bốn phát hiện ưu tiên cao trong đợt rà soát chức năng.

- Chấm điểm bằng RPC phía máy chủ dựa trên tình huống đã xuất bản; không nhận điểm, số dư hoặc cờ đúng/sai từ trình duyệt.
- Thu hồi quyền ghi trực tiếp test_attempts và user_progress của người dùng.
- Khóa hàng tiến trình để tuần tự hóa câu trả lời; kết quả và số dư được ghi cùng giao dịch.
- Gửi lại cùng tình huống/lượt chơi trả lại trạng thái đã lưu, không tính tổn thất hai lần.
- Không nhập tự động tiến trình khách vào tài khoản. Câu trả lời đang chờ lưu gắn với user ID và run ID; có nút thử lưu lại, giữ qua tải lại trang.
- Chơi lại lưu toàn bộ kết quả vào private.game_history trong cùng giao dịch, sau đó tạo lượt mới. Lượt cũ được giữ nguyên để đối chiếu; giao diện hiển thị 50 lượt gần nhất.
- Dashboard tách số liệu lượt hiện tại và số liệu lịch sử. Kết quả cũ được đánh dấu chưa xác minh bởi cơ chế chấm điểm mới.
- CSV xử lý tên bắt đầu bằng ký tự công thức.

Kiểm thử SQL trong tests/secure-gameplay.sql chạy trong giao dịch ROLLBACK: chấm đáp án sai, số dư chính xác, gửi lặp, chặn ghi trực tiếp, lưu lịch sử, chơi lại lặp, từ chối lượt cũ, chỉ số đáp án sai và nội dung bị sửa. Không lưu dữ liệu kiểm thử vào tài khoản thật.

Kiểm tra nguồn: 8/8 bài kiểm tra đạt trên bản dựng mới; build GitHub Pages và kiểm tra ESLint của app/page.tsx đạt. Kiểm tra TypeScript toàn dự án còn lỗi có sẵn ở app/admin.tsx và khai báo Cloudflare trong db/worker; không có lỗi được báo ở app/page.tsx.

Triển khai: áp dụng supabase/secure_gameplay.sql sau schema.sql trước khi phát hành frontend mới. Sau khi thay đổi quyền ghi, trình duyệt đang giữ bản cũ cần tải lại trang.

Giới hạn: chưa mô phỏng đầy đủ phiên đăng nhập trên nhiều trình duyệt hoặc cắt mạng thật trong giao diện. Các mục ưu tiên trung bình (khôi phục mật khẩu, cấu hình huy hiệu, bộ lọc báo cáo, lịch sử biên tập) thuộc đợt tiếp theo.
