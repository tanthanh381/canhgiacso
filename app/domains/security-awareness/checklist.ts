export type SecurityChecklistGroup = {
  id: string;
  icon: string;
  title: string;
  description: string;
  items: Array<{ id: string; title: string; description: string; priority: "Thiết yếu" | "Nên làm" }>;
};

export const SECURITY_CHECKLIST_KEY = "canh-giac-so-security-checklist";

export const securityChecklistGroups: SecurityChecklistGroup[] = [
  {
    id: "account", icon: "◇", title: "Tài khoản & xác thực",
    description: "Giảm nguy cơ bị chiếm tài khoản ngay cả khi mật khẩu bị lộ.",
    items: [
      { id: "account-unique-password", title: "Dùng mật khẩu riêng cho từng tài khoản", description: "Ưu tiên cụm mật khẩu dài hoặc trình quản lý mật khẩu; không dùng lại mật khẩu email cho ngân hàng và mạng xã hội.", priority: "Thiết yếu" },
      { id: "account-mfa", title: "Bật xác thực hai lớp", description: "Dùng ứng dụng xác thực, passkey hoặc khóa bảo mật nếu dịch vụ hỗ trợ; tuyệt đối không chuyển mã xác thực cho người khác.", priority: "Thiết yếu" },
      { id: "account-recovery", title: "Bảo vệ phương thức khôi phục", description: "Kiểm tra email, số điện thoại khôi phục và cất mã dự phòng ở nơi riêng biệt, an toàn.", priority: "Thiết yếu" },
      { id: "account-sessions", title: "Rà soát thiết bị đang đăng nhập", description: "Đăng xuất thiết bị lạ và bật cảnh báo khi có đăng nhập mới hoặc thay đổi thông tin bảo mật.", priority: "Nên làm" },
    ],
  },
  {
    id: "finance", icon: "₫", title: "Tài chính & giao dịch",
    description: "Tạo thêm điểm dừng trước khi tiền rời khỏi tài khoản.",
    items: [
      { id: "finance-beneficiary", title: "Đọc lại người nhận trước khi chuyển", description: "Đối chiếu tên, số tài khoản, ngân hàng và nội dung giao dịch trên màn hình xác nhận cuối cùng.", priority: "Thiết yếu" },
      { id: "finance-independent-check", title: "Xác minh yêu cầu tiền qua kênh khác", description: "Tự gọi số quen thuộc hoặc gặp trực tiếp; không xác minh bằng số điện thoại hay đường link do người yêu cầu cung cấp.", priority: "Thiết yếu" },
      { id: "finance-alerts", title: "Bật thông báo biến động số dư", description: "Theo dõi giao dịch ngay khi phát sinh và liên hệ ngân hàng qua kênh chính thức nếu thấy bất thường.", priority: "Thiết yếu" },
      { id: "finance-limits", title: "Đặt hạn mức phù hợp", description: "Giữ hạn mức chuyển tiền hằng ngày ở mức cần thiết và chỉ nâng tạm thời khi chính bạn chủ động giao dịch.", priority: "Nên làm" },
    ],
  },
  {
    id: "contact", icon: "☎", title: "Cuộc gọi & tin nhắn",
    description: "Nhận diện thao túng tâm lý trước khi làm theo chỉ dẫn.",
    items: [
      { id: "contact-pause", title: "Dừng lại khi bị thúc ép", description: "Cúp máy hoặc ngừng nhắn tin nếu đối phương đe dọa, yêu cầu giữ bí mật hay ép xử lý trong vài phút.", priority: "Thiết yếu" },
      { id: "contact-identity", title: "Tự tìm kênh liên hệ chính thức", description: "Tra cứu số tổng đài trên website hoặc ứng dụng chính thức thay vì gọi lại số mà người lạ đọc cho bạn.", priority: "Thiết yếu" },
      { id: "contact-no-install", title: "Không cài ứng dụng theo hướng dẫn từ xa", description: "Không chia sẻ màn hình, cấp quyền trợ năng hoặc cài tệp APK do người tự xưng là cơ quan, ngân hàng hay shipper gửi.", priority: "Thiết yếu" },
      { id: "contact-report", title: "Chặn và lưu bằng chứng", description: "Lưu số điện thoại, nội dung tin nhắn, đường link và thời gian liên hệ trước khi chặn hoặc báo cáo.", priority: "Nên làm" },
    ],
  },
  {
    id: "links", icon: "⌁", title: "Đường link & mã QR",
    description: "Kiểm tra điểm đến trước khi đăng nhập, thanh toán hoặc tải tệp.",
    items: [
      { id: "links-domain", title: "Đọc kỹ tên miền", description: "Kiểm tra lỗi chính tả, ký tự thay thế và phần tên miền thật ngay trước dấu gạch chéo đầu tiên.", priority: "Thiết yếu" },
      { id: "links-official-entry", title: "Tự mở ứng dụng hoặc gõ địa chỉ", description: "Với ngân hàng và dịch vụ quan trọng, không đăng nhập từ link trong SMS, email, quảng cáo tìm kiếm hoặc tin nhắn.", priority: "Thiết yếu" },
      { id: "links-https", title: "Không xem biểu tượng ổ khóa là đủ", description: "HTTPS chỉ mã hóa kết nối; website giả vẫn có thể sở hữu chứng chỉ và giao diện giống trang thật.", priority: "Nên làm" },
      { id: "links-qr", title: "Xem trước địa chỉ sau mã QR", description: "Không quét mã bị dán đè; đọc tên miền hiển thị trước khi tiếp tục hoặc nhập thông tin.", priority: "Thiết yếu" },
    ],
  },
  {
    id: "social", icon: "◎", title: "Mạng xã hội & quyền riêng tư",
    description: "Hạn chế dữ liệu mà kẻ gian có thể dùng để tạo câu chuyện đáng tin.",
    items: [
      { id: "social-visibility", title: "Giới hạn thông tin công khai", description: "Ẩn ngày sinh, số điện thoại, địa chỉ, lịch trình và thông tin người thân khỏi người không quen biết.", priority: "Nên làm" },
      { id: "social-requests", title: "Kiểm tra tài khoản kết bạn", description: "Xem lịch sử hoạt động, bạn chung và xác minh ngoài nền tảng trước khi tin một tài khoản mới hoặc tài khoản sao chép.", priority: "Thiết yếu" },
      { id: "social-video", title: "Có mật hiệu xác minh với người thân", description: "Khi nhận cuộc gọi vay tiền bất thường, đặt câu hỏi riêng hoặc gọi lại để phòng video và giọng nói giả mạo.", priority: "Thiết yếu" },
      { id: "social-permissions", title: "Rà soát ứng dụng đã liên kết", description: "Gỡ trò chơi, tiện ích và ứng dụng không còn dùng khỏi tài khoản Google, Apple, Facebook hoặc Microsoft.", priority: "Nên làm" },
    ],
  },
  {
    id: "devices", icon: "▣", title: "Thiết bị & dữ liệu",
    description: "Giữ thiết bị đủ an toàn để các lớp bảo vệ khác phát huy tác dụng.",
    items: [
      { id: "devices-updates", title: "Bật cập nhật tự động", description: "Cập nhật hệ điều hành, trình duyệt và ứng dụng để vá các lỗ hổng đã được công bố.", priority: "Thiết yếu" },
      { id: "devices-lock", title: "Khóa màn hình và bật tìm thiết bị", description: "Dùng mã khóa mạnh hoặc sinh trắc học, bật tính năng định vị và xóa từ xa khi thiết bị thất lạc.", priority: "Thiết yếu" },
      { id: "devices-store", title: "Chỉ cài ứng dụng từ nguồn chính thức", description: "Kiểm tra đúng nhà phát hành và quyền truy cập; không cài tệp gửi qua chat hoặc website lạ.", priority: "Thiết yếu" },
      { id: "devices-backup", title: "Duy trì bản sao lưu quan trọng", description: "Sao lưu ảnh, tài liệu và dữ liệu thiết yếu định kỳ; kiểm tra rằng bản sao có thể khôi phục được.", priority: "Thiết yếu" },
    ],
  },
  {
    id: "email", icon: "@", title: "Email & tệp đính kèm",
    description: "Chặn các đường vào phổ biến của lừa đảo, mã độc và đánh cắp tài khoản.",
    items: [
      { id: "email-sender", title: "Kiểm tra địa chỉ người gửi và nơi trả lời", description: "Mở đầy đủ địa chỉ email, so sánh tên miền và cảnh giác khi địa chỉ Reply-To khác người gửi hiển thị.", priority: "Thiết yếu" },
      { id: "email-attachments", title: "Xác minh trước khi mở tệp", description: "Gọi lại người gửi nếu tệp bất ngờ; không bật macro, không giải nén tệp có mật khẩu từ một email chưa được xác minh.", priority: "Thiết yếu" },
      { id: "email-images", title: "Hạn chế tải ảnh từ email lạ", description: "Ảnh từ xa có thể xác nhận bạn đã mở thư; chỉ tải khi nhận diện chắc chắn người gửi và nội dung.", priority: "Nên làm" },
      { id: "email-recovery", title: "Bảo vệ riêng email khôi phục", description: "Dùng mật khẩu độc nhất và xác thực hai lớp cho hộp thư dùng để khôi phục các tài khoản quan trọng.", priority: "Thiết yếu" },
    ],
  },
  {
    id: "browsing", icon: "◉", title: "Trình duyệt & quyền riêng tư",
    description: "Giảm theo dõi, tiện ích độc hại và rò rỉ dữ liệu khi duyệt web.",
    items: [
      { id: "browsing-extensions", title: "Gỡ tiện ích mở rộng không cần thiết", description: "Rà soát quyền đọc dữ liệu trang web và chỉ giữ tiện ích từ nhà phát hành đáng tin cậy, còn được cập nhật.", priority: "Thiết yếu" },
      { id: "browsing-notifications", title: "Chặn thông báo từ website lạ", description: "Xóa quyền thông báo, vị trí, camera và micro đã cấp nhầm; không bấm Cho phép chỉ để xem nội dung.", priority: "Thiết yếu" },
      { id: "browsing-profiles", title: "Tách hồ sơ duyệt web quan trọng", description: "Dùng hồ sơ riêng cho ngân hàng hoặc công việc để hạn chế cookie và tiện ích từ hoạt động duyệt web thông thường.", priority: "Nên làm" },
      { id: "browsing-shared-device", title: "Không đăng nhập nhạy cảm trên máy dùng chung", description: "Nếu bắt buộc, không lưu mật khẩu, đăng xuất hoàn toàn và đổi mật khẩu từ thiết bị tin cậy sau đó.", priority: "Thiết yếu" },
    ],
  },
  {
    id: "networks", icon: "⌁", title: "Mạng & Wi‑Fi",
    description: "Bảo vệ đường truyền tại nhà và hạn chế rủi ro trên mạng công cộng.",
    items: [
      { id: "networks-router", title: "Đổi mật khẩu quản trị bộ phát Wi‑Fi", description: "Không dùng tài khoản mặc định; cập nhật phần mềm bộ phát và tắt quản trị từ Internet nếu không cần.", priority: "Thiết yếu" },
      { id: "networks-encryption", title: "Dùng WPA2 hoặc WPA3 và tắt WPS", description: "Đặt mật khẩu Wi‑Fi dài, không chứa thông tin dễ đoán và không dùng chuẩn bảo mật cũ như WEP.", priority: "Thiết yếu" },
      { id: "networks-public", title: "Tránh giao dịch nhạy cảm trên Wi‑Fi công cộng", description: "Ưu tiên 4G/5G cá nhân; không nhập thông tin ngân hàng khi mạng yêu cầu cài chứng chỉ hoặc ứng dụng lạ.", priority: "Thiết yếu" },
      { id: "networks-guest", title: "Tạo mạng khách cho người lạ và thiết bị IoT", description: "Tách các thiết bị ít tin cậy khỏi máy tính và điện thoại chứa dữ liệu quan trọng trong gia đình.", priority: "Nên làm" },
    ],
  },
  {
    id: "smart-home", icon: "⌂", title: "Nhà thông minh & IoT",
    description: "Giảm nguy cơ camera, loa, TV và thiết bị gia dụng trở thành điểm xâm nhập.",
    items: [
      { id: "smart-home-passwords", title: "Đổi mọi mật khẩu mặc định", description: "Đặt mật khẩu riêng cho camera, đầu ghi, bộ điều khiển và tài khoản đám mây ngay khi lắp đặt.", priority: "Thiết yếu" },
      { id: "smart-home-updates", title: "Bật cập nhật và kiểm tra hỗ trợ", description: "Cập nhật ứng dụng cùng phần mềm thiết bị; thay thiết bị đã hết hỗ trợ và không còn nhận bản vá.", priority: "Thiết yếu" },
      { id: "smart-home-features", title: "Tắt truy cập từ xa, camera hoặc micro không dùng", description: "Chỉ bật tính năng cần thiết và che hoặc rút nguồn thiết bị ghi hình ở khu vực riêng tư khi không sử dụng.", priority: "Thiết yếu" },
      { id: "smart-home-inventory", title: "Lập danh sách thiết bị đang kết nối", description: "Kiểm tra định kỳ trong bộ phát Wi‑Fi, xóa thiết bị lạ và đặt thiết bị thông minh vào mạng khách.", priority: "Nên làm" },
    ],
  },
  {
    id: "human", icon: "△", title: "Thao túng tâm lý",
    description: "Dùng quy tắc đơn giản để chống giả danh, deepfake và áp lực ra quyết định.",
    items: [
      { id: "human-second-opinion", title: "Hỏi thêm một người tin cậy trước quyết định lớn", description: "Tạm dừng và kể lại toàn bộ yêu cầu cho người thân hoặc đồng nghiệp, nhất là khi phải chuyển tiền, cài ứng dụng hay giữ bí mật.", priority: "Thiết yếu" },
      { id: "human-pressure", title: "Không quyết định khi đang bị gây áp lực", description: "Dừng ít nhất vài phút trước yêu cầu có yếu tố đe dọa, giữ bí mật, phần thưởng lớn hoặc thời hạn cực ngắn.", priority: "Thiết yếu" },
      { id: "human-authority", title: "Xác minh người có thẩm quyền qua kênh chính thức", description: "Tự gọi cơ quan, công ty hoặc quản lý bằng thông tin bạn đã biết; không dùng số và link đối phương cung cấp.", priority: "Thiết yếu" },
      { id: "human-oversharing", title: "Hạn chế công khai lịch trình và vai trò", description: "Không đăng trước chuyến đi, sơ đồ tổ chức hoặc công việc nội bộ có thể giúp kẻ gian xây dựng kịch bản giả danh.", priority: "Nên làm" },
    ],
  },
  {
    id: "physical", icon: "▰", title: "An toàn vật lý",
    description: "Bảo vệ thiết bị, giấy tờ và phương tiện khôi phục khỏi tiếp cận trực tiếp.",
    items: [
      { id: "physical-unattended", title: "Khóa thiết bị mỗi khi rời chỗ", description: "Bật tự động khóa trong thời gian ngắn và không để điện thoại hoặc máy tính mở khóa ngoài tầm mắt.", priority: "Thiết yếu" },
      { id: "physical-usb", title: "Không cắm USB hoặc cáp không rõ nguồn gốc", description: "Dùng bộ sạc của mình; không kết nối thiết bị lưu trữ nhặt được hay được gửi đến khi chưa kiểm tra an toàn.", priority: "Thiết yếu" },
      { id: "physical-documents", title: "Hủy giấy tờ nhạy cảm trước khi bỏ", description: "Cắt hoặc hủy hóa đơn, bản sao giấy tờ, mã vận đơn; che bàn phím khi nhập PIN ở nơi công cộng.", priority: "Nên làm" },
      { id: "physical-recovery", title: "Cất bản sao lưu và mã khôi phục ở nơi riêng", description: "Không để tất cả thiết bị, khóa bảo mật, mã dự phòng và giấy tờ gốc trong cùng một túi hoặc vị trí.", priority: "Thiết yếu" },
    ],
  },
];

export const securityChecklistItemIds = new Set(
  securityChecklistGroups.flatMap((group) => group.items.map((item) => item.id)),
);
