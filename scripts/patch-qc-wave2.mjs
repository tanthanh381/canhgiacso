import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const knowledgeRoot = path.join(ROOT, "public", "kien-thuc");
const UPDATED_ISO = "2026-09-16";
const UPDATED_DISPLAY = "16/09/2026";
const SITE = "https://canhgiacso.com";

const SOURCES = {
  bcaScenarios: {
    label: "Bộ Công an — 25 kịch bản lừa đảo trên không gian mạng năm 2026",
    url: "https://www.bocongan.gov.vn/bai-viet/nang-cao-canh-giac-truoc-25-kich-ban-lua-dao-tren-khong-gian-mang-nam-2026-1788865614",
    note: "Đối chiếu mô típ mạo danh, AI/deepfake, đầu tư, việc làm, mua bán trực tuyến và chiếm quyền thiết bị.",
  },
  bcaCoordination: {
    label: "Bộ Công an — Phối hợp với Ngân hàng Nhà nước phòng, chống lừa đảo trực tuyến",
    url: "https://www.bocongan.gov.vn/bai-viet/bo-cong-an-va-ngan-hang-nha-nuoc-viet-nam-ky-ket-quy-che-phoi-hop-trong-cong-tac-phong-chong-lua-dao-truc-tuyen-1782217322",
    note: "Bối cảnh phối hợp chính thức giữa cơ quan Công an và ngành Ngân hàng trong phòng, chống lừa đảo trực tuyến.",
  },
  bcaPhatNguoi: {
    label: "Bộ Công an — Cảnh báo SMS “phạt nguội” kèm đường link giả mạo",
    url: "https://bocongan.gov.vn/bai-viet/canh-bao-thu-doan-gia-danh-co-quan-cong-an-gui-tin-nhan-phat-nguoi-kem-duong-link-gia-mao-de-lua-dao-chiem-doat-tai-san-1788945012",
    note: "Đối chiếu kịch bản giả danh cơ quan Công an, website giả mạo, OTP và kênh tra cứu chính thức.",
  },
  bcaVneid: {
    label: "Bộ Công an — Cảnh báo ứng dụng VNeID giả mạo",
    url: "https://bocongan.gov.vn/bai-viet/canh-bao-thu-doan-lua-dao-cai-ung-dung-vneid-gia-mao-d104-t45880",
    note: "Đối chiếu nguy cơ cài ứng dụng giả, mã độc, quyền điều khiển thiết bị, OTP và dữ liệu sinh trắc học.",
  },
  bcaShipper: {
    label: "Bộ Công an — Đường dây giả danh shipper lừa đảo qua đơn hàng trực tuyến",
    url: "https://www.bocongan.gov.vn/bai-viet/cong-an-tinh-lang-son-khoi-to-7-doi-tuong-trong-duong-day-gia-danh-shipper-lua-dao-qua-don-hang-truc-tuyen-1788867848",
    note: "Đối chiếu thủ đoạn giả danh nhân viên giao hàng và lợi dụng thông tin đơn hàng để dẫn dụ chuyển tiền.",
  },
  bcaJobs: {
    label: "Bộ Công an — Cảnh giác bẫy “việc nhẹ, lương cao”",
    url: "https://www.bocongan.gov.vn/bai-viet/canh-giac-bay-viec-nhe-luong-cao-1787361157",
    note: "Đối chiếu thủ đoạn tuyển dụng qua mạng, dụ dỗ và tạo áp lực bằng lời mời việc làm hấp dẫn.",
  },
  bcaTinAI: {
    label: "Bộ Công an — Chiến dịch TinAI “Kiểm trước tin sau”",
    url: "https://bocongan.gov.vn/bai-viet/phat-dong-chien-dich-tinai-kiem-truoc-tin-sau-chan-lan-song-tin-gia-ai-1785571852",
    note: "Tham chiếu nguyên tắc kiểm chứng nội dung do AI tạo và nguy cơ giả mạo hình ảnh, âm thanh, video.",
  },
  bcaWrongTransfer: {
    label: "Bộ Công an — Quy trình xử lý an toàn khi chuyển nhầm tiền qua tài khoản",
    url: "https://www.bocongan.gov.vn/bai-viet/canh-giac-thu-doan-lua-dao-va-quy-trinh-xu-ly-an-toan-khi-chuyen-nham-tien-qua-tai-khoan-1770361075",
    note: "Đối chiếu thủ đoạn “hỗ trợ lấy lại tiền”, QR/link lạ và nguyên tắc làm việc qua ngân hàng, cơ quan Công an.",
  },
  sbvAntiFraud: {
    label: "Ngân hàng Nhà nước Việt Nam — Tăng cường giải pháp ngăn chặn lừa đảo chiếm đoạt tiền trong tài khoản",
    url: "https://www.sbv.gov.vn/vi/web/sbv_portal/w/sbv592485",
    note: "Đối chiếu khuyến cáo về website chính thức, QR/link lạ, ứng dụng ngoài kho chính thức, quyền Accessibility và xác minh qua kênh chính thức.",
  },
  sscInvestment: {
    label: "Ủy ban Chứng khoán Nhà nước — Khuyến cáo hoạt động hợp tác đầu tư trên môi trường mạng",
    url: "https://ssc.gov.vn/webcenter/portal/ubck/pages_r/l/chitit?dDocName=APPSSCGOVVN1620165260",
    note: "Đối chiếu rủi ro pháp lý và yêu cầu thận trọng khi giao dịch/hợp tác đầu tư qua ứng dụng, website trên môi trường mạng.",
  },
  micQr: {
    label: "Bộ Thông tin và Truyền thông — Khuyến cáo an toàn khi quét mã QR",
    url: "https://mic.gov.vn/bo-thong-tin-va-truyen-thong-hop-bao-thuong-ky-197159635.htm",
    note: "Đối chiếu nguy cơ QR dẫn tới website giả mạo và khuyến cáo kiểm tra URL, danh tính người gửi, không cung cấp thông tin đăng nhập.",
  },
  microsoftPhishing: {
    label: "Microsoft Support — Tự bảo vệ khỏi phishing (lừa đảo giả mạo)",
    url: "https://support.microsoft.com/vi-vn/security/protect-yourself-from-phishing",
    note: "Tham chiếu dấu hiệu phishing, yêu cầu khẩn cấp, link giả và các bước xử lý sau khi lộ thông tin.",
  },
  googleSafety: {
    label: "Google Safety Center — Mẹo tránh lừa đảo và phishing",
    url: "https://safety.google/safety/security-tips/",
    note: "Tham chiếu kiểm tra người gửi, tên miền gần giống, yêu cầu khẩn cấp và link lạ trước khi đăng nhập.",
  },
  evnBillVerification: {
    label: "EVN — Nhận thông báo nợ tiền điện, xác minh thế nào?",
    url: "https://www.evn.com.vn/d/vi-VN/news/Nhan-thong-bao-no-tien-dien-xac-minh-the-nao-60-3569-509453",
    note: "Đối chiếu kịch bản mạo danh nhân viên điện lực, thông báo nợ tiền điện, yêu cầu cài ứng dụng giả và nguyên tắc xác minh qua kênh chính thức.",
  },
  evnFakeApp: {
    label: "EVN — Khuyến cáo cảnh giác chiêu trò cài đặt ứng dụng điện lực giả",
    url: "https://evn.com.vn/d/vi-VN/news/Khuyen-cao-nguoi-dan-canh-giac-truoc-chieu-tro-lua-dao-cai-dat-ung-dung-dien-luc-moi-60-134-500858",
    note: "Đối chiếu rủi ro cài ứng dụng điện lực giả, cuộc gọi mạo danh và thao túng tâm lý để chiếm đoạt tiền trong tài khoản.",
  },
  bhxhFakeVssid: {
    label: "Bảo hiểm xã hội Việt Nam — Cảnh báo ứng dụng VssID giả mạo chứa mã độc",
    url: "https://baohiemxahoi.gov.vn/tintuc/Pages/chuyen-doi-so.aspx?CateID=176&ItemID=26544",
    note: "Đối chiếu thủ đoạn giả mạo VssID, file APK chứa mã độc, chiếm quyền điều khiển thiết bị và đánh cắp thông tin/tài sản.",
  },
  bhxhOfficialChannels: {
    label: "Bảo hiểm xã hội Việt Nam — Cảnh giác thủ đoạn lừa đảo về BHXH, BHYT",
    url: "https://baohiemxahoi.gov.vn/tintuc/Pages/hoat-dong-he-thong-bao-hiem-xa-hoi.aspx?CateID=52&itemID=22957",
    note: "Đối chiếu kênh liên hệ chính thức, dấu hiệu mạo danh cán bộ BHXH, cập nhật VssID và yêu cầu cung cấp dữ liệu cá nhân.",
  },
  bcaOnlineLoan: {
    label: "Bộ Công an — “Tín dụng đen” trực tuyến với những chiêu trò mới",
    url: "https://cdcsnd1.bocongan.gov.vn/home/khoa-hoc-cong-nghe/tin-dung-den-truc-tuyen-voi-nhung-chieu-tro-moi-4859",
    note: "Đối chiếu rủi ro app vay tiền online, phí/lãi biến tướng, truy cập danh bạ và đòi nợ gây áp lực.",
  },
  bcaTravelScam: {
    label: "Bộ Công an — Cảnh báo thủ đoạn lừa đảo mùa du lịch",
    url: "https://bocongan.gov.vn/bai-viet/canh-bao-thu-doan-lua-dao-mua-du-lich-d104-t45881",
    note: "Đối chiếu fanpage giả, đặt tour/phòng/ vé máy bay giá rẻ, yêu cầu chuyển cọc và mã đặt phòng giả.",
  },
  bcaVacationCases: {
    label: "Bộ Công an — Khởi tố các vụ án liên quan lừa đảo gói nghỉ dưỡng, du lịch",
    url: "https://www.bocongan.gov.vn/bai-viet/cong-an-ha-noi-khoi-to-21-vu-an-187-bi-can-lien-quan-den-lua-dao-mua-ban-goi-nghi-duong-du-lich-1781698389",
    note: "Bối cảnh thực tế về các vụ việc liên quan gói nghỉ dưỡng, du lịch và dấu hiệu chiếm đoạt tài sản.",
  },
};

const topicSources = {
  "bao-cao-lua-dao-truc-tuyen": ["bcaScenarios", "bcaCoordination"],
  "cach-kiem-tra-link-lua-dao": ["microsoftPhishing", "googleSafety"],
  "cach-nhan-biet-so-dien-thoai-lua-dao": ["bcaScenarios", "bcaPhatNguoi"],
  "deepfake-lua-dao": ["bcaTinAI", "bcaScenarios"],
  "gia-mao-cong-an": ["bcaPhatNguoi", "bcaScenarios"],
  "lua-dao-ngan-hang": ["sbvAntiFraud", "bcaCoordination"],
  "lua-dao-truc-tuyen-la-gi": ["bcaScenarios", "googleSafety"],
  "lua-dao-viec-nhe-luong-cao": ["bcaJobs", "bcaScenarios"],
  "otp-la-gi": ["sbvAntiFraud", "bcaScenarios"],
  "phong-chong-lua-dao-truc-tuyen": ["bcaScenarios", "bcaCoordination"],
  "nhan-dien-lua-dao-truc-tuyen": ["bcaScenarios", "googleSafety"],
  "nhan-dien-email-phishing": ["microsoftPhishing", "googleSafety"],
  "an-toan-thong-tin-ca-nhan": ["googleSafety", "bcaScenarios"],
  "xu-ly-khi-bi-lua-dao-chuyen-tien": ["bcaWrongTransfer", "sbvAntiFraud"],
  "lua-dao-ma-qr": ["micQr", "sbvAntiFraud"],
  "gia-mao-cong-an-co-quan-nha-nuoc": ["bcaPhatNguoi", "bcaScenarios"],
  "gia-mao-ngan-hang": ["sbvAntiFraud", "bcaCoordination"],
  "lua-dao-shipper-giao-hang": ["bcaShipper", "bcaScenarios"],
  "lua-dao-cong-tac-vien-viec-nhe-luong-cao": ["bcaJobs", "bcaScenarios"],
  "lua-dao-dau-tu-online": ["sscInvestment", "bcaScenarios"],
  "deepfake-gia-giong-nguoi-than": ["bcaTinAI", "bcaScenarios"],
  "lua-dao-otp-chiem-doat-tai-khoan": ["sbvAntiFraud", "bcaScenarios"],
  "kiem-tra-link-gia-mao": ["microsoftPhishing", "googleSafety"],
  "tai-khoan-bi-hack-phai-lam-gi": ["microsoftPhishing", "googleSafety"],
  "tra-cuu-lua-dao": ["bcaScenarios", "bcaCoordination"],
  "kiem-tra-so-dien-thoai-lua-dao": ["bcaScenarios", "bcaPhatNguoi"],
  "tra-cuu-so-tai-khoan-lua-dao": ["sbvAntiFraud", "bcaWrongTransfer"],
  "25-kich-ban-lua-dao-2026": ["bcaScenarios", "bcaCoordination"],
  "lua-dao-vneid-gia-mao": ["bcaVneid", "bcaScenarios"],
  "lua-dao-phat-nguoi-qua-sms": ["bcaPhatNguoi", "bcaVneid"],
  "lua-dao-hoan-tien-don-hang": ["bcaShipper", "bcaScenarios"],
  "lua-dao-tien-dien-gia-mao-evn": ["evnBillVerification", "evnFakeApp", "bcaScenarios"],
  "lua-dao-bao-hiem-xa-hoi-vssid": ["bhxhFakeVssid", "bhxhOfficialChannels"],
  "lua-dao-vay-tien-online": ["bcaOnlineLoan", "bcaScenarios"],
  "lua-dao-dat-phong-du-lich": ["bcaTravelScam", "bcaVacationCases"],
  "lua-dao-tuyen-dung-online": ["bcaJobs", "bcaScenarios"],
};

const actionBySlug = {
  "bao-cao-lua-dao-truc-tuyen": "Dừng tương tác, lưu bằng chứng, liên hệ ngân hàng qua kênh chính thức và phản ánh cuộc gọi/tin nhắn lừa đảo theo hướng dẫn của cơ quan chức năng.",
  "cach-kiem-tra-link-lua-dao": "Không đăng nhập từ link trong SMS, email hoặc tin nhắn. Tự mở ứng dụng/website chính thức, kiểm tra tên miền chính và cảnh giác với link rút gọn.",
  "cach-nhan-biet-so-dien-thoai-lua-dao": "Không đánh giá chỉ dựa trên đầu số hoặc tên hiển thị. Hãy kiểm tra nội dung yêu cầu, áp lực thời gian và xác minh lại qua kênh chính thức.",
  "deepfake-lua-dao": "Không xem hình ảnh, video hoặc giọng nói là bằng chứng đủ mạnh. Hãy ngắt cuộc gọi, gọi lại kênh quen thuộc và dùng câu hỏi riêng để xác minh.",
  "gia-mao-cong-an": "Cơ quan chức năng không yêu cầu chuyển tiền vào tài khoản cá nhân để xác minh. Khi bị đe dọa qua điện thoại, hãy dừng cuộc gọi và tự liên hệ kênh công khai.",
  "lua-dao-ngan-hang": "Không cung cấp OTP, PIN, CVV, mật khẩu; không cài ứng dụng hoặc chia sẻ màn hình theo hướng dẫn từ cuộc gọi/tin nhắn. Tự mở ứng dụng ngân hàng hoặc gọi hotline chính thức.",
  "lua-dao-truc-tuyen-la-gi": "Hiểu mô típ thao túng trước khi xử lý: yêu cầu khẩn cấp, lợi ích bất thường, giữ bí mật, link/app lạ và đòi mã xác thực đều là tín hiệu cần dừng lại.",
  "lua-dao-viec-nhe-luong-cao": "Dừng ngay khi công việc yêu cầu nạp tiền để mở nhiệm vụ, nâng cấp tài khoản hoặc rút hoa hồng. Không chuyển thêm tiền để gỡ khoản đã nạp.",
  "otp-la-gi": "OTP là mã xác thực dùng một lần. Không đọc, chuyển tiếp hoặc nhập OTP vào trang được gửi bởi người lạ; nếu đã lộ, liên hệ ngay tổ chức cung cấp tài khoản.",
  "kiem-tra-link-gia-mao": "Không đăng nhập từ đường link nhận qua email, SMS hoặc tin nhắn. Tự mở ứng dụng/website chính thức và đối chiếu tên miền trước khi nhập thông tin.",
  "nhan-dien-email-phishing": "Không mở tệp hoặc link chỉ vì email dùng logo quen thuộc. Kiểm tra địa chỉ người gửi, tên miền đích và xác minh yêu cầu bằng kênh độc lập.",
  "gia-mao-ngan-hang": "Không cung cấp OTP, PIN, CVV, mật khẩu; không cài ứng dụng hoặc chia sẻ màn hình theo hướng dẫn từ cuộc gọi/tin nhắn. Tự mở ứng dụng ngân hàng hoặc gọi hotline chính thức.",
  "lua-dao-otp-chiem-doat-tai-khoan": "OTP là mã xác thực dùng một lần. Không đọc, chuyển tiếp hoặc nhập OTP vào trang được gửi bởi người lạ; nếu đã lộ, liên hệ ngay tổ chức cung cấp tài khoản.",
  "tai-khoan-bi-hack-phai-lam-gi": "Ưu tiên giành lại quyền kiểm soát: đổi mật khẩu từ thiết bị sạch, thu hồi phiên đăng nhập, bật xác thực nhiều lớp và báo nhà cung cấp dịch vụ.",
  "gia-mao-cong-an-co-quan-nha-nuoc": "Kết thúc cuộc gọi gây áp lực, không chuyển tiền để “xác minh” và tự liên hệ cơ quan được nhắc tới qua số/địa chỉ công khai trên kênh chính thức.",
  "lua-dao-vneid-gia-mao": "Chỉ cài VNeID từ kho ứng dụng chính thức và kiểm tra đúng nhà phát triển. Không cài APK hoặc cấp quyền điều khiển thiết bị theo hướng dẫn qua điện thoại.",
  "lua-dao-phat-nguoi-qua-sms": "Không nộp phạt qua đường link trong SMS lạ. Tra cứu trên VNeID, VNeTraffic, Cục CSGT hoặc cổng dịch vụ công chính thức.",
  "lua-dao-tien-dien-gia-mao-evn": "Không thanh toán tiền điện qua link, QR hoặc tài khoản cá nhân do người lạ gửi. Tự mở ứng dụng/website/tổng đài điện lực chính thức để xác minh mã khách hàng và hóa đơn.",
  "lua-dao-bao-hiem-xa-hoi-vssid": "Không cài VssID từ file APK hoặc link chat, không cung cấp mật khẩu/OTP. Tự truy cập kênh BHXH chính thức hoặc liên hệ cơ quan BHXH địa phương để kiểm tra.",
  "lua-dao-vay-tien-online": "Không nộp phí trước giải ngân, không cấp quyền danh bạ/ảnh/tin nhắn nếu không hiểu rõ mục đích. Kiểm tra pháp nhân, hợp đồng, tổng chi phí và dừng khi bị đe dọa.",
  "lua-dao-dat-phong-du-lich": "Trước khi đặt cọc, tự gọi kênh chính thức của khách sạn, hãng bay hoặc công ty lữ hành để xác minh mã đặt chỗ, tài khoản nhận tiền và chính sách hoàn hủy.",
  "lua-dao-tuyen-dung-online": "Không nộp phí tuyển dụng hoặc nạp tiền làm nhiệm vụ thử. Tự xác minh công ty qua website/email nhân sự chính thức trước khi gửi giấy tờ hoặc dữ liệu cá nhân.",
  "lua-dao-shipper-giao-hang": "Đối chiếu mã đơn, sản phẩm và trạng thái ngay trong ứng dụng mua hàng. Không chuyển khoản hoặc quét QR chỉ dựa trên cuộc gọi tự xưng là shipper.",
  "lua-dao-hoan-tien-don-hang": "Hoàn tiền hợp lệ phải kiểm tra được trong kênh chính thức của sàn/ngân hàng. Không nộp “phí mở khóa”, quét QR hay nhập thông tin ngân hàng từ link do người lạ gửi.",
  "lua-dao-cong-tac-vien-viec-nhe-luong-cao": "Dừng ngay khi công việc yêu cầu nạp tiền để mở nhiệm vụ, nâng cấp tài khoản hoặc rút hoa hồng. Không chuyển thêm tiền để “gỡ” khoản đã nạp.",
  "lua-dao-dau-tu-online": "Kiểm tra pháp nhân, giấy phép và đơn vị nhận tiền ở nguồn độc lập. Không dùng khoản rút nhỏ ban đầu làm bằng chứng rằng nền tảng đầu tư là hợp pháp.",
  "deepfake-gia-giong-nguoi-than": "Ngắt cuộc gọi, gọi lại số quen thuộc và dùng câu hỏi riêng để xác minh. Hình ảnh/giọng nói giống người thật không còn là bằng chứng đủ mạnh về danh tính.",
  "lua-dao-ma-qr": "Coi QR như một đường link bị che. Kiểm tra người đưa mã, tên miền đích, tên người nhận và nội dung giao dịch trước khi tiếp tục.",
  "xu-ly-khi-bi-lua-dao-chuyen-tien": "Dừng mọi khoản chuyển tiếp theo, lưu bằng chứng, liên hệ ngân hàng qua kênh chính thức càng sớm càng tốt và trình báo cơ quan Công an.",
  "tra-cuu-so-tai-khoan-lua-dao": "Kết quả tìm kiếm chỉ là tín hiệu. Trước khi chuyển tiền, đối chiếu danh tính, mục đích giao dịch, tên người nhận và xác minh bằng kênh độc lập.",
  "kiem-tra-so-dien-thoai-lua-dao": "Không đánh giá chỉ dựa trên đầu số hoặc tên hiển thị. Hãy kiểm tra nội dung yêu cầu, mức độ thúc ép và xác minh danh tính người gọi bằng kênh chính thức.",
  "tra-cuu-lua-dao": "Không có kết quả cảnh báo không đồng nghĩa an toàn. Kết hợp dữ liệu công khai với bối cảnh giao dịch, danh tính và kênh xác minh độc lập.",
  "25-kich-ban-lua-dao-2026": "Dùng danh sách kịch bản để nhận diện mô típ, không dùng như danh sách đóng. Thủ đoạn thay đổi liên tục nên luôn kiểm tra cảnh báo mới từ nguồn có thẩm quyền.",
  "phong-chong-lua-dao-truc-tuyen": "Áp dụng nguyên tắc Dừng – Kiểm tra – Xác minh trước mọi yêu cầu liên quan tiền, tài khoản, mã xác thực, cài ứng dụng hoặc dữ liệu nhạy cảm.",
  "nhan-dien-lua-dao-truc-tuyen": "Đánh giá tổng hợp: danh tính người liên hệ, kênh liên hệ, yêu cầu, áp lực thời gian và khả năng xác minh độc lập. Không dựa vào một tín hiệu đơn lẻ.",
  "an-toan-thong-tin-ca-nhan": "Giảm dữ liệu công khai, dùng mật khẩu riêng cho từng dịch vụ, bật xác thực nhiều lớp và cập nhật thiết bị/ứng dụng thường xuyên.",
};

const genericTrustPatterns = [
  /<p>Cảnh Giác Số ưu tiên đối chiếu nội dung với nguồn chính thức và cập nhật khi thủ đoạn thay đổi\.[\s\S]*?Xem thêm <a href="\/phuong-phap-kiem-chung\/">phương pháp kiểm chứng &amp; nguyên tắc biên tập của website<\/a>\.<\/p>/g,
  /<p>Cảnh Giác Số ưu tiên đối chiếu nội dung với nguồn chính thức và cập nhật khi thủ đoạn thay đổi\.[\s\S]*?Xem thêm <a href="\/phuong-phap-kiem-chung\/">phương pháp kiểm chứng & nguyên tắc biên tập của website<\/a>\.<\/p>/g,
  /<p class="seo-safety"><a href="\/phuong-phap-kiem-chung\/">Phương pháp kiểm chứng &amp; nguyên tắc biên tập<\/a> · Cách Cảnh Giác Số chọn nguồn, đánh giá tín hiệu và bảo vệ dữ liệu người dùng\.<\/p>/g,
  /<p class="seo-safety"><a href="\/phuong-phap-kiem-chung\/">Phương pháp kiểm chứng & nguyên tắc biên tập<\/a> · Cách Cảnh Giác Số chọn nguồn, đánh giá tín hiệu và bảo vệ dữ liệu người dùng\.<\/p>/g,
];

function sourceSection(slug) {
  const keys = topicSources[slug] || ["bcaScenarios"];
  const items = keys.map((key) => {
    const source = SOURCES[key];
    return `<li><a href="${source.url}" target="_blank" rel="noopener noreferrer">${source.label}</a><br/><span>${source.note}</span></li>`;
  }).join("");
  return `<section data-qc-wave2="sources"><h2>Nguồn kiểm chứng theo chủ đề</h2><ul class="seo-checklist">${items}</ul><p class="seo-safety">Nguồn được rà soát ngày <time datetime="${UPDATED_ISO}">${UPDATED_DISPLAY}</time>. Xem <a href="/phuong-phap-kiem-chung/">cách Cảnh Giác Số xếp hạng nguồn và đánh giá mức độ chắc chắn</a>.</p></section>`;
}

function replaceQuickAction(html, slug) {
  const action = actionBySlug[slug];
  if (!action) return html;
  const block = `<div class="seo-note" data-qc-wave2="action"><strong>Hành động an toàn ưu tiên:</strong><p>${action}</p></div>`;
  const noteRegex = /<div class="seo-note"><strong>(?:Nguyên tắc an toàn|Lưu ý quan trọng):<\/strong><p>[\s\S]*?<\/p><\/div>/;
  if (noteRegex.test(html)) return html.replace(noteRegex, block);
  return html.replace(/(<div class="seo-meta">[\s\S]*?<\/div>)/, `$1${block}`);
}

function normalizeArticle(html, slug) {
  for (const pattern of genericTrustPatterns) html = html.replace(pattern, "");
  html = html.replace(/<section data-seo-wave4="sources">[\s\S]*?<\/section>/g, "");
  html = html.replace(/<p class="seo-safety">Nội dung phục vụ[^<]*<\/p>/g, "");
  html = replaceQuickAction(html, slug);
  html = html.replace(/<section data-qc-wave2="sources">[\s\S]*?<\/section>/g, "");
  html = html.replace('<section class="seo-related">', `${sourceSection(slug)}<section class="seo-related">`);
  html = html.replace(/Cập nhật ngày \d{2}\/\d{2}\/\d{4}/g, `Cập nhật ngày ${UPDATED_DISPLAY}`);
  html = html.replace(/(<meta property="article:modified_time" content=")[^"]+("\s*\/?>)/g, `$1${UPDATED_ISO}$2`);
  html = html.replace(/("dateModified"\s*:\s*")[^"]+("\s*[},])/g, `$1${UPDATED_ISO}$2`);
  html = html.replace(/<p class="seo-safety"><a href="\/phuong-phap-kiem-chung\/">Cách nội dung được kiểm chứng<\/a> · Rà soát \d{2}\/\d{2}\/\d{4}\.<\/p>/g, "");
  html = html.replace(/<\/div><\/footer>/, `<p class="seo-safety"><a href="/phuong-phap-kiem-chung/">Cách nội dung được kiểm chứng</a> · Rà soát ${UPDATED_DISPLAY}.</p></div></footer>`);
  return html;
}

const methodology = `<!doctype html><html lang="vi-VN"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Phương pháp kiểm chứng, nguồn & thuật ngữ | Cảnh Giác Số</title>
<meta name="description" content="Cách Cảnh Giác Số xếp hạng nguồn, kiểm chứng cảnh báo lừa đảo, chuẩn hóa thuật ngữ, sửa sai và bảo vệ dữ liệu người dùng."/>
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1"/>
<link rel="canonical" href="${SITE}/phuong-phap-kiem-chung/"/><link rel="alternate" hreflang="vi-VN" href="${SITE}/phuong-phap-kiem-chung/"/><link rel="alternate" hreflang="x-default" href="${SITE}/phuong-phap-kiem-chung/"/>
<meta property="og:type" content="website"/><meta property="og:locale" content="vi_VN"/><meta property="og:site_name" content="Cảnh Giác Số"/><meta property="og:title" content="Phương pháp kiểm chứng, nguồn & thuật ngữ | Cảnh Giác Số"/><meta property="og:description" content="Thứ bậc nguồn, quy trình kiểm chứng, giới hạn kết luận, chính sách sửa sai và thuật ngữ chuẩn của Cảnh Giác Số."/><meta property="og:url" content="${SITE}/phuong-phap-kiem-chung/"/><meta property="og:image" content="${SITE}/og.png"/>
<meta name="twitter:card" content="summary_large_image"/><meta name="twitter:title" content="Phương pháp kiểm chứng, nguồn & thuật ngữ | Cảnh Giác Số"/><meta name="twitter:description" content="Cách Cảnh Giác Số đánh giá nguồn và biên tập nội dung chống lừa đảo."/><meta name="twitter:image" content="${SITE}/og.png"/>
<link rel="stylesheet" href="/seo.css"/><link rel="icon" type="image/png" href="/khien-so-logo.png"/>
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebPage","@id":"${SITE}/phuong-phap-kiem-chung/#page","url":"${SITE}/phuong-phap-kiem-chung/","name":"Phương pháp kiểm chứng, nguồn & thuật ngữ","description":"Cách Cảnh Giác Số xếp hạng nguồn, kiểm chứng nội dung và chuẩn hóa thuật ngữ.","dateModified":"${UPDATED_ISO}","inLanguage":"vi-VN","isPartOf":{"@id":"${SITE}/#website"}},{"@type":"Organization","@id":"${SITE}/#organization","name":"Cảnh Giác Số","url":"${SITE}/","logo":{"@type":"ImageObject","url":"${SITE}/khien-so-logo.png"}},{"@type":"WebSite","@id":"${SITE}/#website","url":"${SITE}/","name":"Cảnh Giác Số","inLanguage":"vi-VN"}]}</script>
</head><body>
<header class="seo-header"><div class="seo-shell seo-nav"><a class="seo-brand" href="/"><img src="/khien-so-logo.png" alt="Logo Cảnh Giác Số" width="42" height="42"/><span>Cảnh Giác Số</span></a><nav class="seo-nav-links" aria-label="Điều hướng"><a href="/">Thử thách</a><a href="/kien-thuc/">Cẩm nang</a></nav></div></header>
<main class="seo-article">
<div class="seo-breadcrumb"><a href="/">Cảnh Giác Số</a> › Phương pháp kiểm chứng</div><span class="seo-eyebrow">MINH BẠCH NỘI DUNG</span>
<h1>Phương pháp kiểm chứng, nguồn và thuật ngữ biên tập</h1>
<p class="lead">Cảnh Giác Số là nền tảng giáo dục an toàn số. Nội dung được thiết kế để giúp người đọc nhận diện rủi ro, kiểm tra chéo và chọn hành động an toàn; không dùng một tín hiệu đơn lẻ để kết luận một cá nhân, số điện thoại, tài khoản hay website chắc chắn gian lận hoặc chắc chắn an toàn.</p>
<div class="seo-meta">Rà soát gần nhất: <time datetime="${UPDATED_ISO}">${UPDATED_DISPLAY}</time> · QC Wave 2</div>
<section><h2>1. Thứ bậc nguồn được ưu tiên</h2><ol class="seo-checklist"><li><strong>Cấp 1 — Cơ quan có thẩm quyền:</strong> Bộ Công an, Ngân hàng Nhà nước, Ủy ban Chứng khoán Nhà nước, cơ quan quản lý chuyên ngành và cổng dịch vụ công chính thức.</li><li><strong>Cấp 2 — Chủ thể vận hành dịch vụ / nhà cung cấp công nghệ:</strong> ngân hàng, nền tảng, hãng phần mềm hoặc nhà cung cấp có thể xác nhận trực tiếp cách thức hoạt động và khuyến cáo bảo mật.</li><li><strong>Cấp 3 — Báo chí/tổ chức chuyên môn có danh tính rõ ràng:</strong> dùng để bổ sung bối cảnh, không thay thế nguồn gốc khi có tài liệu cấp 1 hoặc cấp 2.</li><li><strong>Cấp 4 — Cộng đồng, mạng xã hội, phản ánh cá nhân:</strong> chỉ là tín hiệu để kiểm tra thêm. Không dùng làm bằng chứng duy nhất để gắn nhãn một chủ thể là lừa đảo.</li></ol></section>
<section><h2>2. Quy trình kiểm chứng 5 bước</h2><ol class="seo-checklist"><li><strong>Xác định mệnh đề cần kiểm tra:</strong> ai đang liên hệ, họ yêu cầu gì, qua kênh nào và có liên quan tiền/dữ liệu/thiết bị hay không.</li><li><strong>Tìm nguồn gốc:</strong> ưu tiên tài liệu cấp 1; nếu là sản phẩm/dịch vụ, kiểm tra thêm tài liệu chính thức của đơn vị vận hành.</li><li><strong>Kiểm tra chéo:</strong> đối chiếu ít nhất hai nguồn độc lập khi nội dung có thể gây thiệt hại tài chính, mất tài khoản hoặc cài mã độc.</li><li><strong>Tách tín hiệu khỏi kết luận:</strong> số điện thoại lạ, HTTPS, dấu tích xanh, ảnh giấy tờ hoặc tên người nhận khớp chỉ là từng tín hiệu riêng lẻ, không phải bằng chứng tuyệt đối.</li><li><strong>Chọn hành động an toàn:</strong> khi chưa đủ dữ kiện, dừng giao dịch, tự tìm kênh chính thức và xác minh độc lập trước khi tiếp tục.</li></ol></section>
<section><h2>3. Cách diễn đạt mức độ chắc chắn</h2><ul class="seo-checklist"><li><strong>Đã xác nhận:</strong> có nguồn trực tiếp/có thẩm quyền xác nhận sự kiện hoặc thủ đoạn cụ thể.</li><li><strong>Tín hiệu rủi ro:</strong> có dấu hiệu phù hợp với mô típ lừa đảo nhưng chưa đủ căn cứ kết luận chủ thể cụ thể.</li><li><strong>Chưa đủ dữ kiện:</strong> chưa có bằng chứng đáng tin cậy theo cả hai chiều; cần tiếp tục xác minh.</li></ul><p>“Không tìm thấy cảnh báo” chỉ có nghĩa chưa tìm thấy dữ liệu công khai phù hợp tại thời điểm kiểm tra; không đồng nghĩa an toàn.</p></section>
<section><h2>4. Chuẩn thuật ngữ của Cảnh Giác Số</h2><ul class="seo-checklist"><li><strong>Phishing (lừa đảo giả mạo):</strong> giả danh tổ chức/cá nhân để dụ người dùng cung cấp thông tin, mở link hoặc thực hiện hành động có hại.</li><li><strong>Deepfake / DeepVoice (giả mạo bằng AI):</strong> hình ảnh, video hoặc giọng nói tổng hợp/chỉnh sửa nhằm làm người xem tin rằng đó là người thật.</li><li><strong>OTP — mã xác thực dùng một lần:</strong> mã phục vụ đăng nhập hoặc xác nhận giao dịch; không chia sẻ cho người khác.</li><li><strong>Mã QR:</strong> mã hai chiều có thể chứa link hoặc dữ liệu thanh toán; bản thân QR không chứng minh nội dung đích là an toàn.</li><li><strong>APK:</strong> gói cài đặt ứng dụng Android; APK gửi qua chat/link ngoài kho chính thức cần được xem là rủi ro cao.</li><li><strong>Xác thực điện tử (eKYC):</strong> quy trình nhận biết/xác minh khách hàng bằng phương thức điện tử; không đồng nghĩa người dùng phải cài ứng dụng lạ hoặc chia sẻ màn hình.</li><li><strong>SMS Brandname:</strong> tên thương hiệu hiển thị ở luồng SMS. Tên hiển thị không được dùng như bằng chứng duy nhất về danh tính người gửi.</li><li><strong>Cuộc gọi video:</strong> thuật ngữ ưu tiên trong giao diện tiếng Việt; “video call” chỉ dùng khi cần giải thích từ khóa phổ biến.</li></ul></section>
<section><h2>5. Danh mục nguồn nền tảng theo chủ đề</h2><ul class="seo-checklist">
${Object.values(SOURCES).map((source) => `<li><a href="${source.url}" target="_blank" rel="noopener noreferrer">${source.label}</a><br/><span>${source.note}</span></li>`).join("")}
</ul></section>
<section><h2>6. Giảm nội dung lặp và giữ giá trị riêng của từng bài</h2><p>Mỗi bài ưu tiên giải thích đúng mô típ, hành động và nguồn của chủ đề đó. Các nguyên tắc chung như “không chia sẻ OTP”, “không có kết quả không đồng nghĩa an toàn” hoặc giới hạn trách nhiệm được tập trung tại trang phương pháp này và chỉ nhắc lại ở bài khác khi trực tiếp cần cho quyết định của người đọc.</p></section>
<section><h2>7. Sửa sai, cập nhật và giới hạn</h2><p>Khi phát hiện nguồn đã thay đổi, thông tin lỗi thời hoặc diễn đạt có thể gây hiểu nhầm, nội dung liên quan cần được chỉnh sửa và cập nhật ngày rà soát. Nội dung phục vụ giáo dục, không thay thế hướng dẫn của ngân hàng, cơ quan chức năng, luật sư hoặc đơn vị vận hành dịch vụ trong trường hợp cụ thể.</p></section>
<section><h2>8. Quyền riêng tư khi tra cứu</h2><p>Công cụ trên website ưu tiên xử lý cục bộ trên trình duyệt khi có thể và không yêu cầu mật khẩu, OTP, PIN, CVV, mã khôi phục hoặc thông tin đăng nhập ngân hàng. Người dùng không nên nhập dữ liệu nhạy cảm vào ô tra cứu hoặc gửi cho người tự xưng là hỗ trợ viên.</p></section>
<section class="seo-related"><h2>Tiếp tục tra cứu</h2><ul><li><a href="/kien-thuc/tra-cuu-lua-dao/">Tra cứu dấu hiệu lừa đảo</a></li><li><a href="/kien-thuc/kiem-tra-so-dien-thoai-lua-dao/">Kiểm tra số điện thoại lạ</a></li><li><a href="/kien-thuc/tra-cuu-so-tai-khoan-lua-dao/">Tra cứu số tài khoản trước khi chuyển tiền</a></li><li><a href="/kien-thuc/kiem-tra-link-gia-mao/">Kiểm tra link và website giả mạo</a></li></ul></section>
</main><footer class="seo-footer"><div class="seo-shell"><strong>Cảnh Giác Số</strong><p class="seo-safety">Minh bạch nguồn · Phân biệt tín hiệu và kết luận · Rà soát ${UPDATED_DISPLAY}</p></div></footer>
</body></html>`;

const entries = await readdir(knowledgeRoot, { withFileTypes: true });
let patched = 0;
for (const entry of entries) {
  if (!entry.isDirectory() || !topicSources[entry.name]) continue;
  const file = path.join(knowledgeRoot, entry.name, "index.html");
  let html = await readFile(file, "utf8");
  html = normalizeArticle(html, entry.name);
  await writeFile(file, html, "utf8");
  patched += 1;
}

await mkdir(path.join(ROOT, "public", "phuong-phap-kiem-chung"), { recursive: true });
await writeFile(path.join(ROOT, "public", "phuong-phap-kiem-chung", "index.html"), methodology, "utf8");

const sitemapFile = path.join(ROOT, "public", "sitemap.xml");
let sitemap = await readFile(sitemapFile, "utf8");
for (const slug of Object.keys(topicSources)) {
  const escaped = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(<loc>${SITE}\\/kien-thuc\\/${escaped}\\/<\\/loc>[\\s\\S]*?<lastmod>)[^<]+(<\\/lastmod>)`);
  sitemap = sitemap.replace(re, `$1${UPDATED_ISO}$2`);
}
const methodologyLoc = `${SITE}/phuong-phap-kiem-chung/`;
if (sitemap.includes(methodologyLoc)) {
  sitemap = sitemap.replace(/(<loc>https:\/\/canhgiacso\.com\/phuong-phap-kiem-chung\/<\/loc>[\s\S]*?<lastmod>)[^<]+(<\/lastmod>)/, `$1${UPDATED_ISO}$2`);
} else {
  sitemap = sitemap.replace("</urlset>", `  <url><loc>${methodologyLoc}</loc><lastmod>${UPDATED_ISO}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>\n</urlset>`);
}
await writeFile(sitemapFile, sitemap, "utf8");

console.log(`QC Wave 2: patched ${patched} knowledge pages, rebuilt methodology, standardized source governance and terminology.`);
