import Foundation

public enum BundledContent {
    public static let siteContent = SiteContent(
        version: 1,
        copy: SiteCopy(
            productName: "CẢNH GIÁC SỐ",
            departmentName: "IT SECURITY",
            libraryEyebrow: "THƯ VIỆN TÌNH HUỐNG",
            libraryTitle: "Chọn một thử thách",
            coachEyebrow: "HDBANK · IT SECURITY",
            knowledgeEyebrow: "HDBANK · IT SECURITY",
            knowledgeTitle: "Sáu thói quen nhỏ, một lớp giáp lớn.",
            knowledgeIntro: "Cẩm nang an toàn số giúp bạn nhận ra áp lực, kiểm tra danh tính và giữ quyền kiểm soát trước mọi giao dịch.",
            newsEyebrow: "CẬP NHẬT AN TOÀN SỐ",
            newsTitle: "Tin tức và cảnh báo mới nhất.",
            newsIntro: "Thông tin được tóm tắt từ các nguồn chính thống để giúp bạn nhận diện sớm rủi ro.",
            dashboardEyebrow: "HDBANK · IT SECURITY",
            dashboardTitle: "Dashboard rủi ro nhận thức",
            dashboardIntro: "Tổng hợp mức độ tham gia, kết quả mô phỏng và nhóm cần ưu tiên đào tạo lại.",
            footerTagline: "Cảnh Giác Số · Đào tạo nhận thức an toàn thông tin",
            footerNotice: "Nội dung và số tiền trong ứng dụng chỉ là mô phỏng đào tạo."
        ),
        scenarios: [
            Scenario(
                id: 1,
                title: "Cuộc gọi 'điều tra khẩn cấp'",
                category: "Mạo danh",
                difficulty: .easy,
                channel: "Điện thoại",
                icon: "phone",
                story: "Một người tự xưng là cán bộ điều tra đọc đúng tên và số CCCD của bạn. Họ nói tài khoản của bạn liên quan đường dây rửa tiền, yêu cầu chuyển toàn bộ tiền vào tài khoản giám sát trong 30 phút.",
                redFlags: ["Hối thúc và đe dọa", "Yêu cầu chuyển tiền để xác minh", "Cấm kể cho người thân"],
                tip: "Cơ quan công an không điều tra qua điện thoại và không yêu cầu chuyển tiền vào tài khoản cá nhân.",
                evidence: "Ghi chú số điện thoại mạo danh",
                choices: [
                    Choice(text: "Tắt máy, xác minh qua công an địa phương hoặc phản ánh cuộc gọi tới 156"),
                    Choice(text: "Chuyển thử 5 triệu để chứng minh mình hợp tác"),
                    Choice(text: "Gửi ảnh CCCD và ảnh số dư để họ kiểm tra")
                ]
            ),
            Scenario(
                id: 2,
                title: "Đơn hàng hoàn tiền bất thường",
                category: "Mua sắm",
                difficulty: .medium,
                channel: "Tin nhắn",
                icon: "message",
                story: "Bạn nhận SMS có tên thương hiệu sàn thương mại điện tử, báo đơn hàng bị lỗi và gửi đường link nhận hoàn tiền. Trang web giống ứng dụng thật và yêu cầu đăng nhập ngân hàng.",
                redFlags: ["Tên miền lạ", "Yêu cầu đăng nhập ngân hàng từ liên kết", "Khoản hoàn tiền không rõ nguồn"],
                tip: "Không mở link trong SMS. Hãy tự mở ứng dụng chính thức và kiểm tra trung tâm hỗ trợ.",
                evidence: "Ảnh chụp tên miền giả mạo",
                choices: [
                    Choice(text: "Mở ứng dụng chính thức và kiểm tra đơn hàng trong đó"),
                    Choice(text: "Nhấn link nhưng chỉ xem, không nhập gì"),
                    Choice(text: "Đăng nhập để xem tiền hoàn rồi đổi mật khẩu sau")
                ]
            )
        ],
        knowledgeCards: [
            KnowledgeCard(icon: "timer", title: "Quy tắc 30 giây", text: "Dừng lại, hít thở và không hành động khi người lạ tạo cảm giác khẩn cấp."),
            KnowledgeCard(icon: "shield", title: "Xác minh đa kênh", text: "Tự tìm số chính thức hoặc gọi người thân qua kênh khác, không dùng thông tin kẻ lạ cung cấp."),
            KnowledgeCard(icon: "key", title: "Giữ bí mật mã xác thực", text: "Mật khẩu, OTP, mã QR đăng nhập và mã khôi phục chỉ dành cho bạn.")
        ],
        newsArticles: [
            NewsArticle(
                id: "25-kich-ban-lua-dao-2026",
                title: "Cảnh giác trước 25 kịch bản lừa đảo trên không gian mạng năm 2026",
                summary: "Các thủ đoạn nổi bật gồm giả mạo cơ quan, chiếm đoạt tài khoản và sử dụng AI, deepfake, deepvoice để tạo lòng tin.",
                category: "Cảnh báo lừa đảo",
                publishedAt: "2026-09-08",
                sourceName: "Bộ Công an",
                sourceUrl: "https://www.bocongan.gov.vn/bai-viet/nang-cao-canh-giac-truoc-25-kich-ban-lua-dao-tren-khong-gian-mang-nam-2026-1788865614",
                featured: true
            )
        ]
    )
}
