# Báo cáo kiểm thử QC — Khiên Số

- Ngày kiểm thử: 04/09/2026 (Asia/Ho_Chi_Minh)
- Phạm vi nguồn: nhánh `codex/more-scenarios`, commit nền `9f49e48` và bộ kiểm thử QC bổ sung trong working tree
- Bản public đối chiếu: `https://tanthanh381.github.io/chongluadao/`
- Môi trường: Chromium, desktop; mobile 390×844; tablet 768×1024; giao diện sáng/tối
- Dữ liệu thử: chế độ khách trên origin cục bộ, không dùng dữ liệu ngân hàng hoặc tài khoản thật

## Kết luận phát hành

**Chưa nên coi là đạt nghiệm thu toàn bộ.** Các luồng công khai cốt lõi hoạt động ổn định, nhưng còn 3 lỗi cần xử lý và 6 ca kiểm thử tài khoản/phân quyền chưa thể chạy trọn vẹn nếu không có bộ tài khoản QC riêng trên Supabase.

| Trạng thái | Số lượng |
|---|---:|
| Đạt | 40 |
| Không đạt | 3 |
| Bị chặn | 6 |
| Cảnh báo | 1 |
| **Tổng** | **50** |

## Danh sách testcase và kết quả

| ID | Nhóm | Testcase / Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|---|---|---|---|---|
| TC-01 | Build | Build ứng dụng chính thành công | Vinext build hoàn tất | Đạt |
| TC-02 | Build | Build GitHub Pages thành công | Vite tạo đủ `docs/index.html`, CSS, JS, logo | Đạt |
| TC-03 | Code quality | Không có lỗi lint | ESLint thoát mã 0 | Đạt |
| TC-04 | Tự động | Toàn bộ regression test đạt | 7/7 test đạt | Đạt |
| TC-05 | Phụ thuộc | Không có cảnh báo lỗ hổng mức moderate trở lên | `pnpm audit --prod --audit-level moderate` không báo lỗ hổng | Đạt |
| TC-06 | Deploy | Workflow Pages theo dõi `main`, cài đúng lockfile | Cấu hình đúng | Đạt |
| TC-07 | Public | URL GitHub Pages truy cập được | Trang tải, có 42 tình huống, không có lỗi console | Đạt |
| TC-08 | Deploy | Bản public đồng nhất với nguồn mới nhất | Public chưa có dải “Môi trường mô phỏng” đang có ở local | **Không đạt** |
| TC-09 | Khách | Vào chơi không cần đăng ký | Hiện nhãn Khách và thông báo lưu trên thiết bị | Đạt |
| TC-10 | Tình huống | Hiện đủ thư viện | 42/42 tình huống, ID 01–42 | Đạt |
| TC-11 | Tìm kiếm | Tìm `deepfake` trả đúng dữ liệu | Trả 3 tình huống deepfake | Đạt |
| TC-12 | Bộ lọc | Lọc “Rất khó” | Trả 15 tình huống | Đạt |
| TC-13 | Ngẫu nhiên | Nút chọn ngẫu nhiên đổi tình huống | Từ tình huống 01 sang “Tình yêu mạng…” | Đạt |
| TC-14 | Trả lời sai | Trừ tài sản và hiện popup hậu quả | Trừ 5.000.000đ, giảm 18%, còn 295.000.000đ | Đạt |
| TC-15 | Trả lời đúng | Không trừ tiền, cộng điểm/cảnh giác, mở chứng cứ | Không hiện popup mất tiền; chứng cứ tăng lên 1 | Đạt |
| TC-16 | Điều hướng bài | “Kịch bản tiếp theo” chuyển sang tình huống chưa làm | Chuyển đúng | Đạt |
| TC-17 | Lưu khách | Tải lại vẫn giữ kết quả | Giữ 295.000.000đ, 87%, 140 điểm, 1 chứng cứ | Đạt |
| TC-18 | Reset | Có xác nhận trước khi xóa toàn bộ tiến độ | Xóa ngay sau một lần bấm, không xác nhận | **Không đạt** |
| TC-19 | Chứng cứ | Đủ 42 thẻ, chỉ mở thẻ đã trả lời đúng | 42 thẻ; chứng cứ 02 mở, 41 thẻ khóa | Đạt |
| TC-20 | Thành tích | Thống kê khớp lượt chơi | 2 lượt, 1 đúng, 50%, 140 điểm, còn 295 triệu | Đạt |
| TC-21 | Huy hiệu | Có 14 huy hiệu và mở đúng điều kiện | 1/14; “Tân binh cảnh giác” đã mở | Đạt |
| TC-22 | Cẩm nang | Hiện đủ nội dung hướng dẫn | 6 thẻ kiến thức | Đạt |
| TC-23 | Khẩn cấp | Hiện quy trình Dừng–Khóa–Báo và kênh phản ánh | Đủ 3 bước, có 156/5656 và cảnh báo thu hồi tiền giả | Đạt |
| TC-24 | Dashboard | Khách không xem dữ liệu tổng hợp | Hiện màn yêu cầu đăng nhập và quyền Quản trị | Đạt |
| TC-25 | Quản trị | Khách không vào được `#/admin` | Hiện cổng đăng nhập, không lộ nội dung quản trị | Đạt |
| TC-26 | Đăng ký | Email trống/sai bị chặn phía client | Hiện “Vui lòng nhập địa chỉ email hợp lệ” | Đạt |
| TC-27 | Đăng ký | Username sai định dạng bị chặn | Hiện đúng quy tắc 3–24 ký tự | Đạt |
| TC-28 | Đăng ký | Mật khẩu yếu bị chặn | Yêu cầu 8–72 ký tự, hoa, thường, số, đặc biệt | Đạt |
| TC-29 | Đăng ký | Xác nhận mật khẩu khác nhau bị chặn | Hiện “Mật khẩu xác nhận chưa khớp” | Đạt |
| TC-30 | Đăng ký | Tên hiển thị quá ngắn bị chặn | Tên 1 ký tự bị từ chối | Đạt |
| TC-31 | Đăng ký | Tạo tài khoản và ghi hồ sơ/progress | Không chạy để tránh tạo tài khoản/rác email; cần tài khoản QC | Bị chặn |
| TC-32 | Email | Link xác nhận trả về đúng GitHub Pages và lập phiên | Cần hộp thư QC và cấu hình Auth Site URL đang chạy | Bị chặn |
| TC-33 | Phiên | Đăng nhập tài khoản B xóa sạch trạng thái phiên A | Cần hai tài khoản QC đã xác nhận | Bị chặn |
| TC-34 | Đồng bộ | Đăng xuất, đăng nhập lại và đồng bộ chéo thiết bị | Cần tài khoản QC và hai phiên trình duyệt | Bị chặn |
| TC-35 | Dashboard | Cấu trúc CSV có số cột dữ liệu bằng số cột tiêu đề | Kiểm tra nguồn: header và mỗi dòng cùng 8 cột | Đạt |
| TC-36 | Phân quyền | Admin cấp/thu hồi Admin–Editor; Editor chỉ lưu nháp | Cần bộ tài khoản Admin/Editor/Member QC và migration đã áp dụng | Bị chặn |
| TC-37 | Responsive | Mobile 390×844 không tràn ngang | Không tràn; bố cục một cột đúng | Đạt |
| TC-38 | Responsive | Tablet 768×1024 không tràn ngang | Không tràn; header, bộ lọc, thẻ trạng thái đúng | Đạt |
| TC-39 | Theme | Chuyển sáng/tối, trạng thái được lưu | Chuyển và tải lại đúng | Đạt |
| TC-40 | Màu sắc | Nội dung chính dễ đọc ở dark mode | Chữ nội dung/nav/footer nhìn rõ, không mất chữ | Đạt |
| TC-41 | Accessibility | Escape đóng modal và trả focus về nút gọi | Đúng với modal hướng dẫn và đăng ký | Đạt |
| TC-42 | Runtime | Không có warning/error console | Không ghi nhận lỗi ở local và public | Đạt |
| TC-43 | Typography | Chữ điều hướng mobile tối thiểu 12px, ưu tiên 14px | 4 nút điều hướng đang 10px; tagline footer 10px | **Không đạt** |
| TC-44 | Footer | Nội dung không chồng lấn, xuống dòng đúng | Desktop/tablet/mobile hiển thị ổn | Đạt |
| TC-45 | Bảo mật | RLS bật cho toàn bộ bảng public | `profiles`, `user_progress`, `test_attempts`, `site_content` đều bật RLS | Đạt |
| TC-46 | Bảo mật | Bundle client không chứa service-role secret | Chỉ dùng publishable key | Đạt |
| TC-47 | Bảo mật live | Thử truy cập chéo user và gọi RPC đặc quyền bằng member | Cần token của các vai trò QC; mới xác minh tĩnh policy/SQL | Bị chặn |
| TC-48 | Nội dung | Mỗi tình huống có đúng 3 đáp án, 1 đúng/2 sai | 42 tình huống hợp lệ | Đạt |
| TC-49 | Nội dung | Vị trí đáp án đúng được phân bố A/B/C | Pattern có đủ cả 3 vị trí, không dồn đáp án A | Đạt |
| TC-50 | Hiệu năng | Bundle JavaScript không vượt ngưỡng cảnh báo 500 kB | Bundle 530,87 kB; build vẫn thành công | Cảnh báo |

## Lỗi cần khắc phục

### QC-01 — Bản public chưa đồng nhất nguồn (Mức độ: Cao)

Trang local có dải cảnh báo “Môi trường mô phỏng”, còn GitHub Pages hiện tại không có. Điều này cho thấy bản public chưa chứa commit mới nhất hoặc workflow chưa chạy từ nhánh chứa thay đổi.

Khuyến nghị: hợp nhất thay đổi vào `main`, đẩy GitHub, theo dõi workflow Pages và kiểm tra lại cache/CDN.

### QC-02 — Reset tiến độ không xác nhận (Mức độ: Trung bình)

Nút “Đặt lại toàn bộ tiến trình” xóa ngay kết quả. Với người dùng đã hoàn thành nhiều bài, đây là thao tác mất dữ liệu khó khôi phục; tài khoản đăng nhập còn xóa cả kết quả trên máy chủ.

Khuyến nghị: thêm hộp xác nhận nêu rõ phạm vi dữ liệu bị xóa; khóa nút trong khi đồng bộ và chỉ cập nhật UI sau khi thao tác máy chủ thành công.

### QC-03 — Chữ điều hướng mobile quá nhỏ (Mức độ: Trung bình)

Các nút `Mô phỏng`, `Cẩm nang`, `Thành tích`, `Dashboard` đang ở 10px trên mobile; tagline footer cũng 10px. Dù tương phản màu ổn, kích thước này chưa phù hợp mục tiêu “dễ nhìn”.

Khuyến nghị: nâng nav lên tối thiểu 12px, ưu tiên 13–14px; tagline tối thiểu 12px và kiểm tra lại ở màn 320px.

### QC-04 — Bundle GitHub Pages lớn (Mức độ: Thấp)

JavaScript sau minify là 530,87 kB, vượt ngưỡng cảnh báo 500 kB.

Khuyến nghị: tách trang Admin/Dashboard bằng lazy loading hoặc cấu hình code splitting.

## Điều kiện để hoàn tất nghiệm thu E2E có tài khoản

Cần ba tài khoản QC riêng: `member`, `editor`, `admin`; một hộp thư nhận link xác nhận; và xác nhận các migration Supabase đã được áp dụng. Không dùng tài khoản quản trị thật cho kiểm thử hồi quy. Sau đó chạy lại TC-31, TC-32, TC-33, TC-34, TC-36 và TC-47 trên môi trường staging hoặc bằng dữ liệu có thể xóa.
