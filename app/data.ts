import { newsErrors, type RichNode } from './news-content';
import { defaultCertificateDesign, normalizeCertificateDesign, type CertificateDesign } from "./certificate-design";
export type Difficulty = "Dễ" | "Trung bình" | "Khó" | "Rất khó";

export type Choice = {
  text: string;
  // Answer-only fields are absent from public content and are returned by the
  // scoring RPC only after a choice is committed.
  correct?: boolean;
  moneyDelta?: number;
  awarenessDelta?: number;
  feedback?: string;
};

export type Scenario = {
  id: number;
  title: string;
  category: string;
  difficulty: Difficulty;
  channel: string;
  icon: string;
  story: string;
  redFlags: string[];
  tip: string;
  evidence: string;
  choices: Choice[];
};

const scenarioDefinitions: Scenario[] = [
  {
    id: 1,
    title: "Cuộc gọi ‘điều tra khẩn cấp’",
    category: "Mạo danh",
    difficulty: "Dễ",
    channel: "Điện thoại",
    icon: "☎",
    story: "Một người tự xưng là cán bộ điều tra đọc đúng tên và số CCCD của bạn. Họ nói tài khoản của bạn liên quan đường dây rửa tiền, yêu cầu chuyển toàn bộ tiền vào ‘tài khoản giám sát’ trong 30 phút.",
    redFlags: ["Hối thúc và đe doạ", "Yêu cầu chuyển tiền để xác minh", "Cấm kể cho người thân"],
    tip: "Cơ quan công an không điều tra qua điện thoại và không yêu cầu chuyển tiền vào tài khoản cá nhân.",
    evidence: "Ghi chú số điện thoại mạo danh",
    choices: [
      { text: "Tắt máy, xác minh qua công an địa phương hoặc phản ánh cuộc gọi tới 156" },
      { text: "Chuyển thử 5 triệu để chứng minh mình hợp tác" },
      { text: "Gửi ảnh CCCD và ảnh số dư để họ kiểm tra" },
    ],
  },
  {
    id: 2,
    title: "Đơn hàng hoàn tiền bất thường",
    category: "Mua sắm",
    difficulty: "Trung bình",
    channel: "Tin nhắn",
    icon: "▦",
    story: "Bạn nhận SMS có tên thương hiệu sàn thương mại điện tử, báo đơn hàng bị lỗi và gửi đường link nhận hoàn 1.850.000đ. Trang web giống ứng dụng thật và yêu cầu đăng nhập ngân hàng.",
    redFlags: ["Tên miền lạ", "Yêu cầu đăng nhập ngân hàng từ liên kết", "Khoản hoàn tiền không rõ nguồn"],
    tip: "Không mở link trong SMS. Hãy tự mở ứng dụng chính thức và kiểm tra trung tâm hỗ trợ.",
    evidence: "Ảnh chụp tên miền giả mạo",
    choices: [
      { text: "Mở ứng dụng chính thức và kiểm tra đơn hàng trong đó" },
      { text: "Nhấn link nhưng chỉ xem, không nhập gì" },
      { text: "Đăng nhập để xem tiền hoàn rồi đổi mật khẩu sau" },
    ],
  },
  {
    id: 3,
    title: "Người thân gọi video vay tiền",
    category: "Deepfake",
    difficulty: "Khó",
    channel: "Video call",
    icon: "◉",
    story: "Tài khoản của em trai gọi video, hình và giọng khá giống thật nhưng liên tục bị giật. Người này nói đang cấp cứu ở xa và cần bạn chuyển 25 triệu ngay cho một tài khoản lạ.",
    redFlags: ["Video ngắn và nhiễu", "Tài khoản nhận tiền không chính chủ", "Tình huống khẩn cấp gây hoảng loạn"],
    tip: "Đặt câu hỏi bí mật chỉ người thân biết, rồi gọi lại số điện thoại quen thuộc hoặc một người đang ở gần họ.",
    evidence: "Mẫu câu hỏi xác minh deepfake",
    choices: [
      { text: "Ngắt cuộc gọi và xác minh qua số quen thuộc cùng câu hỏi riêng" },
      { text: "Chuyển một nửa trước vì đã nhìn thấy khuôn mặt" },
      { text: "Yêu cầu họ gửi ảnh CCCD trong cuộc chat" },
    ],
  },
  {
    id: 4,
    title: "Việc nhẹ – hoa hồng tăng dần",
    category: "Việc làm",
    difficulty: "Trung bình",
    channel: "Mạng xã hội",
    icon: "↗",
    story: "Một nhóm tuyển cộng tác viên cho bạn nhận 120.000đ sau nhiệm vụ đầu. Nhiệm vụ tiếp theo yêu cầu nạp 3 triệu để ‘tối ưu đơn’, hứa hoàn lại 4,2 triệu trong 10 phút.",
    redFlags: ["Nạp tiền để được làm việc", "Mồi lợi nhuận nhỏ ban đầu", "Cam kết lợi nhuận nhanh"],
    tip: "Công việc hợp pháp trả lương cho bạn; không yêu cầu bạn chuyển tiền để mở khoá thu nhập.",
    evidence: "Biên nhận khoản mồi ban đầu",
    choices: [
      { text: "Dừng tham gia, lưu bằng chứng và báo cáo nhóm" },
      { text: "Nạp 3 triệu rồi rút cả vốn lẫn lời" },
      { text: "Rủ thêm bạn để chia rủi ro" },
    ],
  },
  {
    id: 5,
    title: "Mã QR thanh toán bị dán đè",
    category: "Thanh toán",
    difficulty: "Khó",
    channel: "Ngoài đời",
    icon: "⌗",
    story: "Tại bãi xe, nhân viên chỉ vào mã QR dán trên bảng. Tên người nhận hiện ra là một cá nhân không liên quan, nhưng người phía sau đang giục bạn thanh toán nhanh.",
    redFlags: ["QR có dấu hiệu dán đè", "Tên người nhận không khớp", "Áp lực từ đám đông"],
    tip: "Luôn đọc lại tên người nhận và số tiền trên màn hình xác nhận trước khi bấm chuyển.",
    evidence: "Ảnh mã QR dán đè",
    choices: [
      { text: "Dừng lại, hỏi quầy chính thức và đối chiếu tên người nhận" },
      { text: "Chuyển vì số tiền gửi xe không đáng kể" },
      { text: "Quét bằng một ứng dụng QR khác cho chắc" },
    ],
  },
  {
    id: 6,
    title: "Ứng dụng dịch vụ công ‘bản mới’",
    category: "Ứng dụng độc hại",
    difficulty: "Rất khó",
    channel: "Zalo",
    icon: "⬡",
    story: "Một tài khoản có ảnh đại diện cơ quan nhà nước gửi file cài đặt, nói bạn phải cập nhật ứng dụng để đồng bộ giấy tờ. Khi mở, ứng dụng xin quyền Trợ năng và đọc SMS.",
    redFlags: ["Cài ứng dụng ngoài kho chính thức", "Xin quyền Trợ năng", "Xin đọc SMS và thông báo"],
    tip: "Không cài file APK từ tin nhắn. Quyền Trợ năng có thể cho phép kẻ gian điều khiển điện thoại và đọc OTP.",
    evidence: "Danh sách quyền nguy hiểm",
    choices: [
      { text: "Huỷ cài đặt và tìm ứng dụng trên kho chính thức" },
      { text: "Cài xong rồi tắt quyền sau" },
      { text: "Cho phép Trợ năng nhưng từ chối vị trí" },
    ],
  },
  {
    id: 7,
    title: "Chuyên gia đầu tư trong phòng kín",
    category: "Đầu tư",
    difficulty: "Rất khó",
    channel: "Nhóm chat",
    icon: "◒",
    story: "Một ‘chuyên gia’ thường xuyên khoe lệnh thắng và mời bạn vào sàn riêng. Những thành viên khác liên tục gửi ảnh rút tiền thành công. Nhân viên hỗ trợ đề nghị nạp USDT để nhận thưởng 20%.",
    redFlags: ["Lợi nhuận được dàn dựng", "Sàn không rõ pháp nhân", "Nạp tiền mã hoá khó truy vết"],
    tip: "Ảnh lãi và lời chứng thực trong nhóm có thể do cùng một đường dây tạo ra. Hãy kiểm tra giấy phép độc lập.",
    evidence: "Sơ đồ nhóm chat dàn dựng",
    choices: [
      { text: "Không nạp, kiểm tra pháp nhân và cảnh báo người quen" },
      { text: "Nạp mức tối thiểu để thử rút" },
      { text: "Tin vì trong nhóm có nhiều người xác nhận" },
    ],
  },
  {
    id: 8,
    title: "Bình chọn nhận mã OTP",
    category: "Chiếm tài khoản",
    difficulty: "Dễ",
    channel: "Messenger",
    icon: "✦",
    story: "Một người bạn nhờ bạn bình chọn cuộc thi. Sau khi bấm link, trang yêu cầu số điện thoại và mã OTP vừa gửi tới để xác nhận mỗi người chỉ bình chọn một lần.",
    redFlags: ["Xin OTP ngoài dịch vụ chính thức", "Tài khoản bạn bè có thể bị chiếm", "Link bình chọn lạ"],
    tip: "OTP là chìa khoá đăng nhập hoặc xác nhận giao dịch. Không đọc cho bất kỳ ai và không nhập vào trang lạ.",
    evidence: "Tin nhắn xin OTP",
    choices: [
      { text: "Không nhập OTP, gọi người bạn qua số điện thoại để báo" },
      { text: "Nhập OTP vì chỉ là bình chọn" },
      { text: "Chụp màn hình OTP gửi cho bạn mình" },
    ],
  },
  {
    id: 9,
    title: "Chuyển nhầm tiền rồi ép hoàn",
    category: "Tài chính",
    difficulty: "Khó",
    channel: "Ngân hàng",
    icon: "⇄",
    story: "Tài khoản bạn bất ngờ nhận 8 triệu với nội dung ‘cho vay 7 ngày’. Một người gọi đến yêu cầu hoàn vào tài khoản khác, nếu không sẽ tính lãi theo ngày và đăng thông tin của bạn lên mạng.",
    redFlags: ["Tài khoản hoàn tiền khác tài khoản gửi", "Gắn nội dung khoản vay", "Đe doạ, ép thời hạn"],
    tip: "Không tự chuyển trả. Hãy báo ngân hàng để họ tra soát và hoàn tiền đúng quy trình.",
    evidence: "Mã tra soát giao dịch",
    choices: [
      { text: "Giữ nguyên tiền và liên hệ ngân hàng để tra soát" },
      { text: "Hoàn ngay vào tài khoản người gọi cung cấp" },
      { text: "Rút tiền mặt và chặn số" },
    ],
  },
  {
    id: 10,
    title: "Quỹ từ thiện giả sau thiên tai",
    category: "Quyên góp",
    difficulty: "Trung bình",
    channel: "Mạng xã hội",
    icon: "♡",
    story: "Một bài đăng lan truyền ảnh trẻ em vùng lũ và số tài khoản cá nhân, kêu gọi chuyển gấp trước nửa đêm. Bài viết tắt bình luận và không nêu đơn vị tổ chức.",
    redFlags: ["Không có đơn vị xác minh", "Tắt bình luận", "Ảnh có thể lấy từ sự kiện cũ"],
    tip: "Ưu tiên quỹ và tổ chức minh bạch, có thông tin pháp lý và báo cáo sử dụng tiền.",
    evidence: "Checklist kiểm tra quỹ từ thiện",
    choices: [
      { text: "Tìm tổ chức uy tín và kiểm tra nguồn gốc hình ảnh" },
      { text: "Chuyển một khoản nhỏ vì mục đích có vẻ tốt" },
      { text: "Chia sẻ bài trước, kiểm tra sau" },
    ],
  },
  {
    id: 11, title: "Tình yêu mạng dẫn tới ‘khoản đầu tư chung’", category: "Lừa đảo tình cảm", difficulty: "Rất khó", channel: "Ứng dụng hẹn hò", icon: "♥",
    story: "Sau nhiều tuần trò chuyện, một người tự nhận đang làm việc ở nước ngoài gửi ảnh cuộc sống thành đạt và rủ bạn cùng đầu tư trên một nền tảng riêng. Tài khoản thử hiển thị có lãi nhưng muốn rút phải nộp thêm ‘thuế xác minh’.",
    redFlags: ["Xây dựng tình cảm trước khi nói về tiền", "Nền tảng do đối phương giới thiệu", "Nộp thêm tiền mới được rút"],
    tip: "Không chuyển tiền hoặc đầu tư theo người chỉ quen trực tuyến. Số dư và lợi nhuận trên nền tảng do kẻ gian kiểm soát có thể hoàn toàn giả.", evidence: "Chuỗi tin nhắn dẫn dụ đầu tư",
    choices: [
      { text: "Dừng nạp tiền, lưu bằng chứng và kiểm tra nền tảng độc lập" },
      { text: "Nộp thuế để rút toàn bộ vốn rồi chấm dứt" },
      { text: "Nhờ người đó ứng trước một nửa phí" },
    ],
  },
  {
    id: 12, title: "Nhân viên điện lực dọa cắt điện trong ngày", category: "Mạo danh dịch vụ", difficulty: "Trung bình", channel: "Điện thoại", icon: "ϟ",
    story: "Người gọi đọc đúng địa chỉ, báo hợp đồng điện đang nợ và sẽ bị cắt sau hai giờ. Họ gửi mã QR cá nhân và yêu cầu thanh toán ngay để ‘hủy lệnh’.",
    redFlags: ["Đe dọa cắt dịch vụ gấp", "QR tài khoản cá nhân", "Không cho thời gian kiểm tra"],
    tip: "Tự mở ứng dụng hoặc gọi số chăm sóc khách hàng công khai của đơn vị điện lực; không dùng số hay mã thanh toán do người gọi cung cấp.", evidence: "Thông tin đối chiếu hợp đồng điện",
    choices: [
      { text: "Ngắt máy và kiểm tra trên ứng dụng hoặc tổng đài chính thức" },
      { text: "Quét QR vì người gọi biết đúng địa chỉ" },
      { text: "Gửi ảnh hóa đơn cũ để họ xác minh" },
    ],
  },
  {
    id: 13, title: "Nhà trường báo con cấp cứu cần đóng viện phí", category: "Mạo danh giáo dục", difficulty: "Khó", channel: "Điện thoại", icon: "✚",
    story: "Một người tự xưng giáo viên gọi báo con bạn gặp tai nạn trong giờ học, đang chờ phẫu thuật và yêu cầu chuyển viện phí vào tài khoản của ‘bác sĩ trực’.",
    redFlags: ["Kích hoạt nỗi sợ về người thân", "Tài khoản nhận tiền cá nhân", "Ngăn gọi lại nhà trường"],
    tip: "Gọi trực tiếp giáo viên chủ nhiệm, nhà trường và bệnh viện bằng số tự tìm; không chuyển tiền khi chưa xác minh được người bệnh.", evidence: "Danh sách số liên hệ khẩn cấp đã xác minh",
    choices: [
      { text: "Gọi giáo viên chủ nhiệm và bệnh viện qua số công khai" },
      { text: "Chuyển trước một phần để giữ lịch phẫu thuật" },
      { text: "Yêu cầu gửi ảnh con rồi mới chuyển" },
    ],
  },
  {
    id: 14, title: "Cổng hoàn thuế yêu cầu quét khuôn mặt", category: "Phishing", difficulty: "Rất khó", channel: "Email", icon: "％",
    story: "Email mang tiêu đề cơ quan thuế thông báo bạn được hoàn 6,8 triệu đồng. Link dẫn tới trang giống cổng dịch vụ công, yêu cầu nhập tài khoản ngân hàng, OTP và quay video khuôn mặt.",
    redFlags: ["Tên miền gần giống nhưng không chính thức", "Thu thập OTP và sinh trắc học", "Hoàn tiền bất ngờ"],
    tip: "Tự nhập địa chỉ cổng thuế chính thức hoặc dùng ứng dụng đã cài từ kho chính thức. Không cung cấp OTP hay video khuôn mặt qua liên kết nhận được.", evidence: "So sánh tên miền giả và tên miền chính thức",
    choices: [
      { text: "Đóng trang và kiểm tra nghĩa vụ thuế bằng cổng chính thức tự truy cập" },
      { text: "Chỉ nhập số tài khoản, không nhập OTP" },
      { text: "Quay video vì hoàn thuế cần xác thực khuôn mặt" },
    ],
  },
  {
    id: 15, title: "Biên lai chuyển khoản thành công bị làm giả", category: "Thanh toán", difficulty: "Dễ", channel: "Tại quầy", icon: "▤",
    story: "Khách mua hàng cho xem ảnh giao dịch thành công và nói ngân hàng đang chậm thông báo. Họ muốn nhận hàng ngay vì đang vội ra sân bay.",
    redFlags: ["Chỉ đưa ảnh chụp biên lai", "Tiền chưa vào tài khoản", "Tạo lý do phải giao hàng gấp"],
    tip: "Chỉ xác nhận thanh toán dựa trên số dư hoặc lịch sử giao dịch trong ứng dụng ngân hàng của chính bạn, không dựa vào ảnh từ người mua.", evidence: "Lịch sử giao dịch đối chiếu",
    choices: [
      { text: "Kiểm tra tài khoản của mình và chỉ giao hàng khi tiền đã ghi có" },
      { text: "Giao hàng vì biên lai có đúng logo ngân hàng" },
      { text: "Giữ lại ảnh CCCD của khách làm tin" },
    ],
  },
  {
    id: 16, title: "Trang đăng nhập mạng xã hội từ link cảnh báo", category: "Chiếm tài khoản", difficulty: "Trung bình", channel: "Email", icon: "◎",
    story: "Bạn nhận email nói tài khoản mạng xã hội vi phạm bản quyền và sẽ bị khóa trong 12 giờ. Nút ‘Kháng nghị’ mở trang đăng nhập giống hệt bản thật.",
    redFlags: ["Đe dọa khóa tài khoản", "Đăng nhập từ liên kết email", "Tên miền có ký tự thay thế"],
    tip: "Tự mở ứng dụng hoặc gõ địa chỉ dịch vụ; kiểm tra thông báo trong trung tâm hỗ trợ và bật xác thực hai lớp.", evidence: "Header email và tên miền phishing",
    choices: [
      { text: "Tự mở ứng dụng và kiểm tra mục hỗ trợ/bảo mật" },
      { text: "Đăng nhập rồi đổi mật khẩu ngay" },
      { text: "Chuyển tiếp email cho đồng nghiệp hỏi ý kiến" },
    ],
  },
  {
    id: 17, title: "Tuyển người mẫu nhí qua thử thách mua hàng", category: "Việc làm", difficulty: "Khó", channel: "Mạng xã hội", icon: "★",
    story: "Một fanpage mời con bạn làm đại sứ nhãn hàng. Để vào vòng quay, phụ huynh phải mua các đơn hàng tăng dần và được hứa hoàn tiền kèm thù lao sau khi hoàn tất đủ chuỗi.",
    redFlags: ["Việc làm yêu cầu mua hàng", "Nhiệm vụ tăng tiền liên tục", "Không có hợp đồng và pháp nhân rõ ràng"],
    tip: "Không trả tiền để được tuyển chọn. Kiểm tra pháp nhân, hợp đồng và liên hệ nhãn hàng qua kênh công khai.", evidence: "Chuỗi nhiệm vụ mua hàng giả",
    choices: [
      { text: "Dừng nhiệm vụ và xác minh trực tiếp với nhãn hàng" },
      { text: "Hoàn thành đơn cuối vì đã nộp nhiều tiền" },
      { text: "Mượn tiền để giữ suất đại sứ" },
    ],
  },
  {
    id: 18, title: "Nhân viên tín dụng thu phí mở hồ sơ vay", category: "Tín dụng", difficulty: "Trung bình", channel: "Zalo", icon: "₫",
    story: "Một tài khoản tự nhận nhân viên ngân hàng duyệt khoản vay 80 triệu không cần chứng minh thu nhập. Trước khi giải ngân, bạn phải chuyển 2,4 triệu phí bảo hiểm vào tài khoản cá nhân.",
    redFlags: ["Cam kết duyệt vay quá dễ", "Thu phí trước giải ngân", "Tài khoản nhận phí là cá nhân"],
    tip: "Chỉ làm hồ sơ qua ứng dụng, website, chi nhánh hoặc số điện thoại chính thức của tổ chức tín dụng; không chuyển phí cho cá nhân.", evidence: "Thông tin tài khoản thu phí giả",
    choices: [
      { text: "Hủy giao dịch và gọi ngân hàng qua số công khai" },
      { text: "Chuyển phí vì khoản vay đã được duyệt" },
      { text: "Gửi CCCD để họ soạn hợp đồng trước" },
    ],
  },
  {
    id: 19, title: "Cập nhật eKYC để tránh khóa tài khoản", category: "Đánh cắp danh tính", difficulty: "Rất khó", channel: "Cuộc gọi video", icon: "◌",
    story: "Người gọi tự xưng bộ phận chống gian lận, nói dữ liệu sinh trắc học của bạn sắp hết hạn. Họ yêu cầu cài ứng dụng hỗ trợ, chia sẻ màn hình và quay khuôn mặt theo hướng dẫn.",
    redFlags: ["Cài ứng dụng điều khiển từ xa", "Chia sẻ màn hình ngân hàng", "Thu video khuôn mặt ngoài ứng dụng chính thức"],
    tip: "Ngân hàng không yêu cầu cài ứng dụng điều khiển từ xa. Chỉ cập nhật sinh trắc học bên trong ứng dụng chính thức hoặc tại quầy.", evidence: "Danh sách ứng dụng điều khiển từ xa",
    choices: [
      { text: "Từ chối và tự kiểm tra trong ứng dụng ngân hàng" },
      { text: "Chia sẻ màn hình nhưng che số dư" },
      { text: "Chỉ quay khuôn mặt, không cung cấp OTP" },
    ],
  },
  {
    id: 20, title: "Ví điện tử báo lỗi nhận tiền và xin OTP", category: "Chiếm tài khoản", difficulty: "Dễ", channel: "Tin nhắn", icon: "◍",
    story: "Người mua nói đã chuyển tiền vào ví của bạn nhưng giao dịch bị treo. Một tài khoản ‘hỗ trợ ví’ nhắn yêu cầu đọc OTP để hoàn tất nhận tiền.",
    redFlags: ["OTP để nhận tiền", "Tài khoản hỗ trợ chủ động nhắn", "Giao dịch không xuất hiện trong ứng dụng"],
    tip: "Nhận tiền không yêu cầu cung cấp OTP. Chỉ kiểm tra giao dịch và liên hệ hỗ trợ bên trong ứng dụng ví chính thức.", evidence: "Tin nhắn giả danh hỗ trợ ví",
    choices: [
      { text: "Không đưa OTP và kiểm tra trực tiếp trong ứng dụng ví" },
      { text: "Đọc OTP vì giao dịch đang chờ" },
      { text: "Gửi ảnh màn hình số dư để hỗ trợ kiểm tra" },
    ],
  },
  {
    id: 21, title: "Dịch vụ lấy lại tiền lừa đảo", category: "Lừa đảo kép", difficulty: "Rất khó", channel: "Quảng cáo tìm kiếm", icon: "↺",
    story: "Sau khi bạn đăng bài kể bị mất tiền, một ‘luật sư công nghệ’ liên hệ, khẳng định đã truy vết được ví nhận và có thể thu hồi 90% nếu đóng phí hồ sơ bằng USDT.",
    redFlags: ["Chủ động tiếp cận nạn nhân", "Cam kết tỷ lệ thu hồi", "Thu phí bằng tiền mã hóa"],
    tip: "Không có dịch vụ nào bảo đảm lấy lại tiền. Hãy làm việc với ngân hàng và cơ quan công an; cảnh giác việc dữ liệu nạn nhân bị bán lại.", evidence: "Hồ sơ giả của dịch vụ thu hồi tiền",
    choices: [
      { text: "Không trả phí, bổ sung bằng chứng cho ngân hàng và công an" },
      { text: "Trả phí vì họ biết đúng số tiền đã mất" },
      { text: "Cho họ truy cập máy tính để kiểm tra giao dịch" },
    ],
  },
  {
    id: 22, title: "Giọng nói người thân xin tiền cấp cứu", category: "Deepfake", difficulty: "Khó", channel: "Cuộc gọi thoại", icon: "♬",
    story: "Bạn nhận cuộc gọi từ số lạ với giọng rất giống chị gái, nói vừa bị tai nạn và nhờ chuyển tiền vào tài khoản của người đang giúp đỡ. Cuộc gọi ngắn, nhiều tiếng ồn và liên tục hối thúc.",
    redFlags: ["Số điện thoại lạ", "Giọng quen nhưng cuộc gọi rất ngắn", "Tài khoản nhận tiền của bên thứ ba"],
    tip: "Giọng nói có thể được tổng hợp từ đoạn âm thanh công khai. Gọi lại số quen thuộc và dùng câu hỏi bí mật trước khi hành động.", evidence: "Câu hỏi xác minh gia đình",
    choices: [
      { text: "Ngắt máy, gọi số quen thuộc và xác minh với người gần chị" },
      { text: "Chuyển ngay vì giọng nói không thể giả" },
      { text: "Yêu cầu đọc số CCCD của chị" },
    ],
  },
  {
    id: 23, title: "Video ‘con đang bị giữ ở nước ngoài’", category: "Deepfake", difficulty: "Rất khó", channel: "Video call", icon: "▣",
    story: "Một tài khoản lạ gọi video, cho thấy hình con bạn trong phòng tối nói đang bị giữ vì vi phạm visa. Người gọi yêu cầu chuyển tiền bảo lãnh trong 20 phút và không được báo đại sứ quán.",
    redFlags: ["Video ngắn, hình ảnh thiếu ổn định", "Cấm liên hệ cơ quan chức năng", "Tiền bảo lãnh vào tài khoản cá nhân"],
    tip: "Liên hệ trực tiếp người thân, bạn đồng hành, cơ quan đại diện ngoại giao và cơ quan chức năng; không tuân theo yêu cầu giữ bí mật.", evidence: "Kế hoạch xác minh khẩn cấp đa đầu mối",
    choices: [
      { text: "Xác minh đồng thời với con, người đi cùng và cơ quan đại diện" },
      { text: "Chuyển tiền vì đã thấy khuôn mặt con" },
      { text: "Giữ bí mật để tránh con bị xử lý nặng" },
    ],
  },
  {
    id: 24, title: "Chatbot ‘trợ lý ngân hàng’ gửi link mở khóa", category: "Phishing", difficulty: "Khó", channel: "Mạng xã hội", icon: "▧",
    story: "Một tài khoản có dấu xác minh giả tự giới thiệu là trợ lý AI của ngân hàng, báo thẻ bị khóa do giao dịch bất thường và gửi biểu mẫu đăng nhập để mở lại ngay.",
    redFlags: ["Hỗ trợ ngân hàng qua tài khoản mạng xã hội lạ", "Link mở khóa yêu cầu mật khẩu", "Dùng nhãn AI để tạo cảm giác hiện đại"],
    tip: "Chatbot không làm thay đổi nguyên tắc bảo mật: chỉ thao tác trong ứng dụng, website hoặc tổng đài chính thức do bạn tự truy cập.", evidence: "Hồ sơ tài khoản chatbot giả",
    choices: [
      { text: "Bỏ qua link và kiểm tra thẻ trong ứng dụng chính thức" },
      { text: "Đăng nhập vì chatbot phản hồi rất tự nhiên" },
      { text: "Gửi bốn số cuối thẻ để chatbot kiểm tra" },
    ],
  },
  {
    id: 25, title: "Airdrop yêu cầu kết nối ví tiền mã hóa", category: "Tài sản số", difficulty: "Rất khó", channel: "Cộng đồng trực tuyến", icon: "⬙",
    story: "Một bài đăng hứa tặng token cho người dùng lâu năm. Website yêu cầu kết nối ví và ký thông điệp ‘xác minh quyền sở hữu’; giao diện ví hiển thị quyền truy cập tài sản không giới hạn.",
    redFlags: ["Quà tặng quá hấp dẫn", "Tên miền mới đăng ký", "Yêu cầu quyền chi tiêu không giới hạn"],
    tip: "Đọc kỹ nội dung chữ ký và quyền hợp đồng thông minh. Không kết nối ví chính với website chưa được xác minh độc lập.", evidence: "Chi tiết quyền phê duyệt hợp đồng",
    choices: [
      { text: "Từ chối ký và kiểm tra thông báo từ kênh dự án chính thức" },
      { text: "Ký vì giao dịch không thu phí" },
      { text: "Kết nối ví chính rồi thu hồi quyền sau" },
    ],
  },
  {
    id: 26, title: "Đơn hàng giao tam giác giá rẻ", category: "Mua sắm", difficulty: "Khó", channel: "Sàn rao vặt", icon: "▰",
    story: "Người bán chào một món điện tử rẻ hơn thị trường, yêu cầu bạn chuyển tiền. Hàng thật được cửa hàng khác giao tới, nhưng vài ngày sau cửa hàng liên hệ vì đơn mua bằng tài khoản hoặc thẻ bị chiếm đoạt.",
    redFlags: ["Giá thấp bất thường", "Người nhận tiền khác người gửi hàng", "Không có hóa đơn từ người bán"],
    tip: "Thanh toán qua nền tảng có bảo vệ người mua, đối chiếu danh tính người bán và nguồn hàng; không chuyển khoản ngoài hệ thống để nhận giá rẻ.", evidence: "Sơ đồ giao dịch tam giác",
    choices: [
      { text: "Chỉ mua qua kênh có bảo vệ và yêu cầu hóa đơn khớp người bán" },
      { text: "Nhận hàng rồi mới chuyển khoản ngoài sàn" },
      { text: "Tin vì được kiểm tra hàng trước" },
    ],
  },
  {
    id: 27, title: "Quét QR để đăng nhập cuộc họp trực tuyến", category: "Chiếm tài khoản", difficulty: "Khó", channel: "Email công việc", icon: "⌘",
    story: "Email mời họp khẩn gửi mã QR để ‘đăng nhập nhanh’. Sau khi quét, điện thoại hiện yêu cầu xác nhận liên kết một thiết bị mới với tài khoản email công việc.",
    redFlags: ["QR che giấu địa chỉ đích", "Cuộc họp khẩn tạo áp lực", "Yêu cầu liên kết thiết bị mới"],
    tip: "QR đăng nhập có thể trao phiên đăng nhập cho kẻ gian. Tự mở ứng dụng họp và nhập mã cuộc họp; đọc kỹ mọi màn hình xác nhận thiết bị.", evidence: "Mã QR đăng nhập phiên giả",
    choices: [
      { text: "Không xác nhận thiết bị, tự mở ứng dụng họp và nhập mã" },
      { text: "Xác nhận vì QR đến từ email công ty" },
      { text: "Quét bằng điện thoại cá nhân thay vì máy công ty" },
    ],
  },
  {
    id: 28, title: "Xuất khẩu lao động ‘việc nhẹ lương cao’", category: "Tuyển dụng", difficulty: "Rất khó", channel: "Nhóm chat", icon: "⚐",
    story: "Một môi giới quảng cáo việc chăm sóc khách hàng ở nước ngoài với lương rất cao, không cần kinh nghiệm. Họ thúc bạn nộp hộ chiếu, phí vé máy bay và đi qua cửa khẩu bằng lịch trình không rõ ràng.",
    redFlags: ["Mức lương phi thực tế", "Giữ hộ chiếu hoặc giấy tờ gốc", "Lộ trình di chuyển không minh bạch"],
    tip: "Xác minh giấy phép doanh nghiệp dịch vụ việc làm, hợp đồng và thị thực. Không giao giấy tờ gốc hoặc đi theo tuyến không chính thức.", evidence: "Checklist xác minh doanh nghiệp tuyển dụng",
    choices: [
      { text: "Dừng hồ sơ và kiểm tra giấy phép cùng hợp đồng qua cơ quan chức năng" },
      { text: "Nộp phí để giữ chỗ vì suất có hạn" },
      { text: "Gửi ảnh hộ chiếu trước, giấy gốc đưa sau" },
    ],
  },
  {
    id: 29, title: "SMS trúng thưởng hiển thị cùng luồng thương hiệu", category: "Brandname giả", difficulty: "Khó", channel: "SMS", icon: "✉",
    story: "Một SMS xuất hiện trong luồng tin nhắn quen thuộc của thương hiệu, báo bạn trúng quà và phải truy cập link, trả phí vận chuyển trong 30 phút. Trang thanh toán yêu cầu thông tin thẻ và OTP.",
    redFlags: ["Brandname không bảo đảm nội dung thật", "Trúng thưởng không tham gia", "Thu phí và OTP qua link"],
    tip: "Tin nhắn có thể bị giả mạo hoặc chèn vào luồng quen thuộc. Xác minh chương trình trên ứng dụng, website hay tổng đài chính thức.", evidence: "SMS brandname và đường dẫn giả",
    choices: [
      { text: "Không mở link, kiểm tra chương trình trên kênh chính thức" },
      { text: "Trả phí nhỏ vì tin nhắn nằm đúng luồng cũ" },
      { text: "Gọi số điện thoại ghi trong SMS để hỏi" },
    ],
  },
  {
    id: 30, title: "Hội thảo đầu tư trực tuyến với chuyên gia giả", category: "Đầu tư", difficulty: "Rất khó", channel: "Họp trực tuyến", icon: "◒",
    story: "Bạn được mời vào hội thảo có người dẫn chương trình và ‘chuyên gia’ giống một nhân vật tài chính nổi tiếng. Người tham dự liên tục khoe lãi; cuối buổi có mã QR mở tài khoản tại sàn riêng và ưu đãi chỉ còn 15 phút.",
    redFlags: ["Danh tính chuyên gia có thể bị giả", "Người tham dự đóng vai chim mồi", "Ưu đãi đầu tư đếm ngược"],
    tip: "Xác minh danh tính diễn giả và giấy phép tổ chức nhận tiền ở nguồn độc lập. Không đầu tư ngay trong buổi phát trực tuyến hoặc qua QR được cung cấp.", evidence: "Checklist xác minh hội thảo đầu tư",
    choices: [
      { text: "Rời buổi, kiểm tra chuyên gia và pháp nhân sàn độc lập" },
      { text: "Nạp mức tối thiểu vì chuyên gia rất giống người thật" },
      { text: "Tin vì nhiều người trong phòng đã rút được tiền" },
    ],
  },
  {
    id: 31, title: "Thông báo nhập học và học bổng giả", category: "Giáo dục", difficulty: "Khó", channel: "Email", icon: "▤",
    story: "Ngay trước ngày nhập học, bạn nhận email có logo, con dấu và chữ ký giống trường đại học. Thư báo được cấp học bổng nhưng phải chuyển gấp ‘phí xác nhận hồ sơ’ và ‘phí đồng phục’ vào tài khoản cá nhân trong ngày.",
    redFlags: ["Email không thuộc tên miền chính thức", "Thu phí vào tài khoản cá nhân", "Học bổng kèm thời hạn chuyển tiền gấp"],
    tip: "Đối chiếu thông báo trên cổng tuyển sinh và gọi phòng đào tạo qua số công khai. Không dùng số điện thoại hoặc tài khoản có trong chính email đáng ngờ.", evidence: "Email và giấy báo nhập học giả",
    choices: [
      { text: "Không chuyển tiền, tự liên hệ phòng đào tạo qua kênh chính thức" },
      { text: "Chuyển phí để giữ học bổng rồi hỏi trường sau" },
      { text: "Trả lời email và xin ảnh thẻ nhân viên của người phụ trách" },
    ],
  },
  {
    id: 32, title: "Fanpage khách sạn tích xanh yêu cầu đặt cọc", category: "Du lịch", difficulty: "Khó", channel: "Mạng xã hội", icon: "⌂",
    story: "Bạn tìm thấy fanpage mang tên một khu nghỉ dưỡng nổi tiếng, có dấu xác minh và nhiều bình luận đặt phòng. Nhân viên báo chỉ còn một phòng giá tốt, yêu cầu chuyển cọc 70% vào tài khoản cá nhân để nhận mã xác nhận.",
    redFlags: ["Dấu xác minh không khớp danh tính pháp nhân", "Tài khoản nhận tiền cá nhân", "Tạo khan hiếm để ép đặt cọc"],
    tip: "Dấu xác minh và lượt theo dõi không thay thế việc kiểm tra. Tự gọi số trên website chính thức để xác nhận fanpage, mã đặt phòng và tài khoản nhận tiền.", evidence: "Hồ sơ fanpage lưu trú giả mạo",
    choices: [
      { text: "Tạm dừng và gọi khách sạn qua số trên website chính thức" },
      { text: "Chuyển cọc vì fanpage đã có tích xanh" },
      { text: "Chỉ chuyển 20% để giảm rủi ro" },
    ],
  },
  {
    id: 33, title: "Livestream vé cào báo trúng giải lớn", category: "Trúng thưởng", difficulty: "Trung bình", channel: "Livestream", icon: "▱",
    story: "Trong một buổi phát trực tiếp, người bán cào vé bạn vừa mua và thông báo trúng điện thoại đắt tiền. Để nhận giải, bạn phải lần lượt nộp phí sàn, thuế thu nhập và phí sửa ‘lỗi xác minh giao dịch’.",
    redFlags: ["Người bán tự kiểm soát kết quả trúng", "Thu nhiều khoản phí nối tiếp", "Yêu cầu chuyển tiền ngoài nền tảng"],
    tip: "Không chuyển tiền để nhận phần thưởng từ livestream chưa được xác minh. Một khoản phí mới sau mỗi lần thanh toán là dấu hiệu điển hình của bẫy phí nối tiếp.", evidence: "Chuỗi yêu cầu phí nhận thưởng",
    choices: [
      { text: "Dừng thanh toán, lưu buổi phát và báo cáo tài khoản" },
      { text: "Nộp thuế vì giải thưởng có giá trị cao hơn nhiều" },
      { text: "Nhờ người bán trừ phí trực tiếp vào giải thưởng" },
    ],
  },
  {
    id: 34, title: "Cuộc gọi nhạy cảm biến thành màn tống tiền", category: "Tống tiền", difficulty: "Rất khó", channel: "Video call", icon: "⊘",
    story: "Một tài khoản mới quen nhanh chóng tỏ ra thân mật và rủ bạn gọi video riêng tư. Sau cuộc gọi, người này gửi đoạn ghi màn hình, đe dọa phát tán cho gia đình và đồng nghiệp nếu bạn không chuyển tiền ngay.",
    redFlags: ["Người lạ thân mật bất thường", "Dụ thực hiện nội dung nhạy cảm", "Đe dọa phát tán để ép chuyển tiền"],
    tip: "Không thực hiện cuộc gọi nhạy cảm với người lạ. Nếu bị đe dọa, không trả tiền; lưu bằng chứng, khóa quyền riêng tư, báo nền tảng và trình báo công an.", evidence: "Tin nhắn đe dọa tống tiền",
    choices: [
      { text: "Không chuyển tiền, lưu bằng chứng và trình báo ngay" },
      { text: "Chuyển một lần để họ xóa video" },
      { text: "Xóa toàn bộ tin nhắn và tài khoản ngay" },
    ],
  },
  {
    id: 35, title: "Livestream ‘đổ thạch’ cam kết mua lại đá quý", category: "Mua sắm", difficulty: "Rất khó", channel: "Livestream", icon: "◈",
    story: "Kênh livestream mời bạn mua một viên đá thô để đập trực tiếp. Người dẫn cam kết nếu bên trong có ruby sẽ mua lại ngay với giá gấp nhiều lần; các tài khoản trong phần bình luận liên tục khoe vừa bán lại thành công.",
    redFlags: ["Người bán kiểm soát cả hàng hóa và kết quả", "Cam kết mua lại lợi nhuận cao", "Bình luận chim mồi tạo hiệu ứng đám đông"],
    tip: "Không tham gia trò may rủi trá hình hoặc mua vật phẩm mà giá trị chỉ do người bán tự tuyên bố. Bình luận và kết quả trên livestream có thể được dàn dựng.", evidence: "Kịch bản livestream đổ thạch dàn dựng",
    choices: [
      { text: "Không mua, rời livestream và báo cáo nội dung đáng ngờ" },
      { text: "Mua một viên nhỏ để thử vận may" },
      { text: "Tin vì có nhiều người bình luận đã nhận tiền" },
    ],
  },
  {
    id: 36, title: "Thiệp chúc mừng kèm tệp cài mã độc", category: "Mã độc", difficulty: "Khó", channel: "Email công việc", icon: "✣",
    story: "Bạn nhận email mang tên một đối tác quen, đính kèm ‘thiệp chúc mừng’ và ‘hóa đơn quà tặng’. Khi mở, tệp yêu cầu bật macro hoặc cài tiện ích để xem đầy đủ nội dung.",
    redFlags: ["Tệp đính kèm bất ngờ", "Yêu cầu bật macro hoặc cài tiện ích", "Tên người gửi quen nhưng địa chỉ email sai khác"],
    tip: "Xác minh với người gửi qua kênh khác và không bật macro, chạy tệp thực thi hay cài tiện ích từ email. Báo bộ phận an toàn thông tin khi dùng thiết bị công việc.", evidence: "Email và tệp đính kèm phát tán mã độc",
    choices: [
      { text: "Không mở tệp, xác minh với đối tác và báo IT Security" },
      { text: "Bật macro vì tệp đến từ đối tác quen" },
      { text: "Chuyển tệp sang máy cá nhân để mở" },
    ],
  },
  {
    id: 37, title: "Đăng ký giải chạy trẻ em qua fanpage giả", category: "Sự kiện", difficulty: "Khó", channel: "Mạng xã hội", icon: "⚑",
    story: "Một fanpage quảng cáo giải chạy dành cho trẻ em với hình ảnh chuyên nghiệp và nhiều phụ huynh bình luận. Sau khi điền thông tin của con, bạn được thêm vào nhóm ‘ban tổ chức’ và yêu cầu chuyển tiền làm nhiệm vụ để kích hoạt hồ sơ, hứa hoàn lại kèm ưu đãi.",
    redFlags: ["Thu thập thông tin trẻ em qua biểu mẫu lạ", "Chuyển tiền để kích hoạt hồ sơ", "Hứa hoàn tiền sau nhiệm vụ"],
    tip: "Xác minh sự kiện qua website, địa điểm tổ chức và đơn vị chủ quản. Không chuyển tiền làm nhiệm vụ hoặc cung cấp giấy tờ của trẻ cho tài khoản chưa xác thực.", evidence: "Fanpage và nhóm đăng ký sự kiện giả",
    choices: [
      { text: "Dừng đăng ký, tự xác minh với đơn vị và địa điểm tổ chức" },
      { text: "Làm nhiệm vụ nhỏ trước để kiểm tra khả năng hoàn tiền" },
      { text: "Gửi ảnh giấy khai sinh nhưng che số định danh" },
    ],
  },
  {
    id: 38, title: "Người bán livestream gửi link xác nhận đơn", category: "Chiếm tài khoản", difficulty: "Rất khó", channel: "Messenger", icon: "▧",
    story: "Sau khi bạn để số điện thoại trong bình luận livestream, một tài khoản giống người bán nhắn rằng đơn bị thiếu thông tin. Link ‘xác nhận giao hàng’ yêu cầu đăng nhập mạng xã hội; ít phút sau, tài khoản của bạn nhắn vay tiền người thân và đưa tài khoản nhận có tên gần giống bạn.",
    redFlags: ["Chủ động liên hệ từ dữ liệu bình luận", "Link yêu cầu đăng nhập lại mạng xã hội", "Tài khoản nhận tiền có tên gây nhầm lẫn"],
    tip: "Không công khai số điện thoại trong livestream và không đăng nhập từ link người bán gửi. Tự mở ứng dụng, xác minh đơn hàng và bật xác thực nhiều lớp.", evidence: "Chuỗi chiếm tài khoản từ livestream",
    choices: [
      { text: "Không mở link, kiểm tra đơn trong ứng dụng và báo tài khoản giả" },
      { text: "Đăng nhập vì tài khoản nhắn đúng sản phẩm đã đặt" },
      { text: "Gửi mã OTP cho người bán để họ sửa đơn" },
    ],
  },
  {
    id: 39, title: "Phòng trọ đẹp giá rẻ yêu cầu giữ chỗ", category: "Nhà ở", difficulty: "Trung bình", channel: "Nhóm cộng đồng", icon: "⌂",
    story: "Bạn thấy bài đăng cho thuê phòng gần nơi làm việc, giá thấp hơn khu vực và ảnh rất đẹp. Người đăng nói đang ở xa, có nhiều người hỏi nên yêu cầu cọc hai tháng để giữ phòng trước khi bạn đến xem.",
    redFlags: ["Không cho xem phòng trực tiếp", "Giá thấp bất thường", "Thúc ép đặt cọc vì có nhiều người hỏi"],
    tip: "Đến xem phòng, đối chiếu người cho thuê với chủ sở hữu hoặc người được ủy quyền và đọc hợp đồng trước khi đặt cọc.", evidence: "Bài đăng phòng trọ không có thật",
    choices: [
      { text: "Không cọc trước, chỉ giao dịch sau khi xem và xác minh quyền cho thuê" },
      { text: "Cọc một tháng vì có ảnh căn cước của chủ nhà" },
      { text: "Chuyển phí xem phòng nhỏ để được ưu tiên" },
    ],
  },
  {
    id: 40, title: "Môi giới hứa ‘chạy việc’ vào cơ quan", category: "Tuyển dụng", difficulty: "Khó", channel: "Người quen", icon: "▥",
    story: "Một người được giới thiệu qua bạn bè khẳng định có quan hệ và có thể giúp bạn vào vị trí tốt mà không cần qua đủ quy trình tuyển dụng. Họ yêu cầu chuyển trước ‘phí quan hệ’, gửi ảnh CCCD và hứa hoàn tiền nếu không thành công.",
    redFlags: ["Hứa bỏ qua quy trình tuyển dụng", "Thu phí quan hệ không có chứng từ", "Yêu cầu giấy tờ định danh qua kênh cá nhân"],
    tip: "Chỉ ứng tuyển qua cơ quan, doanh nghiệp hoặc trung tâm việc làm hợp pháp. Không trả tiền cho lời hứa tác động trái quy trình.", evidence: "Tin nhắn và biên nhận phí chạy việc",
    choices: [
      { text: "Từ chối và liên hệ trực tiếp đơn vị tuyển dụng để kiểm tra" },
      { text: "Trả một nửa vì người này do bạn bè giới thiệu" },
      { text: "Chỉ gửi CCCD để họ kiểm tra chỉ tiêu trước" },
    ],
  },
  {
    id: 41, title: "‘Bắt cóc trực tuyến’ cô lập sinh viên", category: "Thao túng tâm lý", difficulty: "Rất khó", channel: "Cuộc gọi video", icon: "⊞",
    story: "Người tự xưng là công an nói sinh viên liên quan vụ án và phải giữ bí mật để chứng minh vô tội. Họ yêu cầu thuê phòng ở một mình, bật video liên tục, cắt liên lạc với gia đình; sau đó gia đình nhận tin đòi tiền vì tưởng con bị bắt cóc.",
    redFlags: ["Yêu cầu tự cô lập và giữ bí mật", "Giám sát liên tục qua video", "Ngăn liên hệ gia đình và cơ quan chức năng"],
    tip: "Cơ quan công an không điều tra bằng cách buộc người dân tự cô lập qua video. Ngắt liên lạc, báo gia đình, nhà trường và công an địa phương ngay.", evidence: "Kịch bản cô lập nạn nhân trực tuyến",
    choices: [
      { text: "Ngắt cuộc gọi và báo ngay gia đình, nhà trường, công an địa phương" },
      { text: "Làm theo vì họ đã đọc đúng thông tin cá nhân" },
      { text: "Giữ bí mật nhưng nhắn bạn thân biết vị trí" },
    ],
  },
  {
    id: 42, title: "Góp vốn cho vay đáo hạn ngân hàng", category: "Đầu tư", difficulty: "Rất khó", channel: "Người quen", icon: "⇆",
    story: "Một người quen rủ bạn góp vốn cho khách vay đáo hạn ngân hàng trong vài ngày, cam kết lợi nhuận cao và nói tiền luôn được bảo đảm bằng hồ sơ vay. Những lần đầu họ trả đúng hẹn, sau đó đề nghị bạn dồn khoản lớn để nhận mức lãi tốt hơn.",
    redFlags: ["Lợi nhuận cao trong thời gian rất ngắn", "Dùng lần trả đúng hạn để tạo lòng tin", "Hoạt động tài chính không rõ tư cách pháp lý"],
    tip: "Không giao tiền cho cá nhân thực hiện hoạt động tín dụng hoặc đáo hạn không rõ pháp lý. Kiểm tra tổ chức, hợp đồng, tài sản bảo đảm và rủi ro bằng nguồn độc lập.", evidence: "Chuỗi góp vốn đáo hạn và trả lãi mồi",
    choices: [
      { text: "Không góp thêm và chỉ giao dịch qua tổ chức có chức năng hợp pháp" },
      { text: "Góp khoản lớn vì các lần trước đều nhận đủ lãi" },
      { text: "Yêu cầu ảnh hồ sơ vay rồi mới chuyển" },
    ],
  },
];

export const scenarios: Scenario[] = scenarioDefinitions;

export type KnowledgeCard = {
  icon: string;
  title: string;
  text: string;
};

export type NewsArticle = {
  slug?: string;
  status?: "draft" | "published";
  thumbnail?: string;
  thumbnailAlt?: string;
  body?: RichNode;
  seoTitle?: string;
  metaDescription?: string;
  id: string;
  title: string;
  summary: string;
  category: string;
  publishedAt: string;
  sourceName: string;
  sourceUrl: string;
  featured: boolean;
};

export type SiteCopy = {
  productName: string;
  departmentName: string;
  libraryEyebrow: string;
  libraryTitle: string;
  coachEyebrow: string;
  knowledgeEyebrow: string;
  knowledgeTitle: string;
  knowledgeIntro: string;
  newsEyebrow: string;
  newsTitle: string;
  newsIntro: string;
  dashboardEyebrow: string;
  dashboardTitle: string;
  dashboardIntro: string;
  footerTagline: string;
  footerNotice: string;
};

export type CertificateTemplate = {
  design?: CertificateDesign;
  organizationName: string;
  departmentName: string;
  eyebrow: string;
  title: string;
  recipientIntro: string;
  courseName: string;
  description: string;
  ratingLabel: string;
  accountLabel: string;
  codeLabel: string;
  issuedDateLabel: string;
  footerNote: string;
};

export type SiteContent = {
  version: 1;
  copy: SiteCopy;
  certificateTemplate: CertificateTemplate;
  scenarios: Scenario[];
  knowledgeCards: KnowledgeCard[];
  newsArticles: NewsArticle[];
};

export const knowledgeCards: KnowledgeCard[] = [
  { icon: "⏱", title: "Quy tắc 30 giây", text: "Dừng lại, hít thở và không hành động khi người lạ tạo cảm giác khẩn cấp." },
  { icon: "⌁", title: "Xác minh đa kênh", text: "Tự tìm số chính thức hoặc gọi người thân qua kênh khác, không dùng thông tin kẻ lạ cung cấp." },
  { icon: "⌾", title: "Giữ bí mật mã xác thực", text: "Mật khẩu, OTP, mã QR đăng nhập và mã khôi phục chỉ dành cho bạn." },
  { icon: "▣", title: "Kiểm tra trước khi chuyển", text: "Đọc lại người nhận, số tiền và nội dung trên màn hình xác nhận cuối cùng." },
  { icon: "⚑", title: "Lưu bằng chứng", text: "Chụp màn hình, lưu số điện thoại, đường link và mã giao dịch trước khi báo cáo." },
  { icon: "☏", title: "Báo cáo đúng kênh", text: "Nếu đã chuyển tiền, liên hệ ngay ngân hàng qua kênh chính thức, lưu bằng chứng và trình báo cơ quan công an gần nhất." },
];

export const newsArticles: NewsArticle[] = [
  {
    id: "25-kich-ban-lua-dao-2026",
    title: "Cảnh giác trước 25 kịch bản lừa đảo trên không gian mạng năm 2026",
    summary: "Các thủ đoạn được chia thành 5 nhóm, nổi bật với giả mạo cơ quan, chiếm đoạt tài khoản và sử dụng AI, deepfake, deepvoice để tạo lòng tin. Không truy cập liên kết lạ, quét QR không rõ nguồn hoặc cung cấp OTP.",
    category: "Cảnh báo lừa đảo",
    publishedAt: "2026-09-08",
    sourceName: "Bộ Công an",
    sourceUrl: "https://www.bocongan.gov.vn/bai-viet/nang-cao-canh-giac-truoc-25-kich-ban-lua-dao-tren-khong-gian-mang-nam-2026-1788865614",
    featured: true,
  },
  {
    id: "cat-ghep-hinh-anh-cuong-doat",
    title: "Cảnh báo thủ đoạn cắt ghép hình ảnh nhạy cảm để cưỡng đoạt tài sản",
    summary: "Đối tượng thu thập ảnh và thông tin công khai, tạo hình ảnh giả rồi đe dọa phát tán để ép chuyển tiền. Người dùng nên hạn chế công khai dữ liệu cá nhân, lưu lại bằng chứng và trình báo cơ quan công an.",
    category: "Cảnh báo lừa đảo",
    publishedAt: "2026-09-07",
    sourceName: "Bộ Công an",
    sourceUrl: "https://www.bocongan.gov.vn/bai-viet/canh-bao-tinh-trang-quay-tro-lai-thu-doan-cat-ghep-hinh-anh-nhay-cam-nham-cuong-doat-tai-san-1788770637",
    featured: false,
  },
  {
    id: "lua-dao-mua-tuu-truong",
    title: "Nhận diện lừa đảo nhắm vào học sinh, tân sinh viên mùa tựu trường",
    summary: "Cần đề phòng tin cho thuê trọ giá rẻ yêu cầu đặt cọc gấp và thông báo giả mạo nhà trường về học phí, học bổng. Luôn xác minh qua website, số điện thoại hoặc đơn vị chức năng chính thức của trường.",
    category: "Cảnh báo lừa đảo",
    publishedAt: "2026-08-25",
    sourceName: "Bộ Công an",
    sourceUrl: "https://bocongan.gov.vn/bai-viet/catp-hai-phong-canh-bao-cac-thu-doan-lua-dao-bua-vay-hoc-sinh-tan-sinh-vien-mua-tuu-truong-1787629964",
    featured: false,
  },
  {
    id: "lua-dao-hop-dong-ky-nghi",
    title: "Khoảng 2.500 đơn tố giác liên quan lừa đảo hợp đồng kỳ nghỉ",
    summary: "Cơ quan chức năng cảnh báo các lời mời sở hữu kỳ nghỉ, ưu đãi du lịch và cam kết sinh lời thiếu minh bạch. Hãy đọc kỹ điều khoản, kiểm tra pháp nhân và không chuyển tiền khi bị thúc ép ký nhanh.",
    category: "Cảnh báo lừa đảo",
    publishedAt: "2026-07-04",
    sourceName: "Bộ Công an",
    sourceUrl: "https://bocongan.gov.vn/bai-viet/lua-dao-hop-dong-ky-nghi-tiep-nhan-2-500-don-to-giac-so-tien-chiem-doat-khoang-2-600-ty-dong-1783146602",
    featured: false,
  },
  {
    id: "viec-nhe-luong-cao-xuat-canh",
    title: "Tránh bẫy “việc nhẹ lương cao” và dịch vụ xuất cảnh nhanh",
    summary: "Các tài khoản ẩn danh quảng cáo việc làm thu nhập cao, làm visa nhanh rồi yêu cầu chuyển tiền qua tài khoản trung gian. Chỉ làm việc với tổ chức được cấp phép và tự kiểm tra thông tin qua kênh chính thống.",
    category: "An toàn số",
    publishedAt: "2026-06-19",
    sourceName: "Bộ Công an",
    sourceUrl: "https://bocongan.gov.vn/chinh-sach-phap-luat/bai-viet/tranh-tro-thanh-nan-nhan-cua-hoat-dong-to-chuc-cho-nguoi-khac-xuat-nhap-canh-di-cu-trai-phep-1781854747",
    featured: false,
  },
  {
    id: "bao-ve-du-lieu-ca-nhan",
    title: "Cảnh báo nguy cơ lộ, lọt dữ liệu cá nhân trên không gian mạng",
    summary: "Dữ liệu cá nhân có thể bị thu thập, trao đổi trong các nhóm kín và dùng cho lừa đảo. Nên hạn chế cấp quyền cho ứng dụng lạ, dùng mật khẩu mạnh, bật xác thực đa yếu tố và cập nhật phần mềm thường xuyên.",
    category: "Bảo vệ dữ liệu",
    publishedAt: "2026-06-10",
    sourceName: "Bộ Công an",
    sourceUrl: "https://www.bocongan.gov.vn/bai-viet/canh-bao-nguy-co-lo-lot-du-lieu-ca-nhan-tren-khong-gian-mang-1781085500",
    featured: false,
  },
  {
    id: "bao-cao-an-ninh-mang-2025",
    title: "Báo cáo an ninh mạng 2025: tổ chức, doanh nghiệp tiếp tục là mục tiêu lớn",
    summary: "Báo cáo ghi nhận khoảng 552.000 cuộc tấn công, 52,30% tổ chức bị ảnh hưởng và 47,72% đơn vị chưa có nhân sự chuyên trách. Năng lực con người, quản trị dữ liệu và ứng phó với AI là các ưu tiên cần củng cố.",
    category: "An toàn thông tin",
    publishedAt: "2026-01-20",
    sourceName: "Hiệp hội An ninh mạng Quốc gia",
    sourceUrl: "https://www.nca.org.vn/news/detail/bao-cao-tong-ket-an-ninh-mang-nam-2025-khu-vuc-to-chuc-doanh-nghiep--1769392766125?l=vi",
    featured: false,
  },
];

export const defaultSiteContent: SiteContent = {
  version: 1,
  copy: {
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
    newsIntro: "Thông tin được tóm tắt từ các nguồn chính thống để giúp bạn nhận diện sớm rủi ro an toàn thông tin và lừa đảo trên không gian mạng.",
    dashboardEyebrow: "HDBANK · IT SECURITY",
    dashboardTitle: "Dashboard rủi ro nhận thức",
    dashboardIntro: "Tổng hợp mức độ tham gia, kết quả mô phỏng và nhóm cần ưu tiên đào tạo lại để hỗ trợ báo cáo an toàn thông tin.",
    footerTagline: "Cảnh Giác Số · Đào tạo nhận thức an toàn thông tin",
    footerNotice: "**Website được quản lý và vận hành bởi: IT Security Team - HDBank.**\nĐược xây dựng với mục tiêu nâng cao nhận thức cộng đồng về phòng chống tội phạm lừa đảo trực tuyến.\nLưu ý: Nội dung và số tiền trên website chỉ là mô phỏng đào tạo.",
  },
  certificateTemplate: {
    design: defaultCertificateDesign(),
    organizationName: "CẢNH GIÁC SỐ",
    departmentName: "IT SECURITY",
    eyebrow: "HOÀN THÀNH ĐÀO TẠO NHẬN THỨC\nAN TOÀN THÔNG TIN",
    title: "CHỨNG NHẬN",
    recipientIntro: "Trân trọng trao tặng",
    courseName: "Cảnh Giác Số",
    description: "Đã hoàn thành Bộ {scenarioTotal} tình huống “{courseName}”\nvới {correct} tình huống nhận thức đúng.",
    ratingLabel: "XẾP LOẠI NĂNG LỰC",
    accountLabel: "Tài khoản",
    codeLabel: "Mã chứng nhận",
    issuedDateLabel: "Cấp ngày",
    footerNote: "Chứng nhận hoàn thành nội dung đào tạo mô phỏng; không xác nhận chức danh, quan hệ lao động hoặc chứng nhận hành nghề.",
  },
  scenarios,
  knowledgeCards,
  newsArticles,
};

const difficultyValues: Difficulty[] = ["Dễ", "Trung bình", "Khó", "Rất khó"];

function isText(value: unknown, maxLength = 5000): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

export function normalizeSiteContent(value: unknown, requireAnswerKeys = false): SiteContent | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<SiteContent>;
  if (!candidate.copy || typeof candidate.copy !== "object") return null;
  const copy = candidate.copy as Partial<SiteCopy>;
  const copyKeys: Array<keyof SiteCopy> = [
    "productName", "departmentName", "libraryEyebrow", "libraryTitle", "coachEyebrow",
    "knowledgeEyebrow", "knowledgeTitle", "knowledgeIntro", "dashboardEyebrow",
    "dashboardTitle", "dashboardIntro", "footerTagline", "footerNotice",
  ];
  if (copyKeys.some((key) => !isText(copy[key], key.endsWith("Intro") || key === "footerNotice" ? 1000 : 180))) return null;
  const certificateTemplateCandidate = candidate.certificateTemplate && typeof candidate.certificateTemplate === "object"
    ? candidate.certificateTemplate as Partial<CertificateTemplate>
    : defaultSiteContent.certificateTemplate;
  const certificateKeys: Array<keyof CertificateTemplate> = [
    "organizationName", "departmentName", "eyebrow", "title", "recipientIntro", "courseName",
    "description", "ratingLabel", "accountLabel", "codeLabel", "issuedDateLabel", "footerNote",
  ];
  if (certificateKeys.some((key) => !isText(
    certificateTemplateCandidate[key],
    key === "description" || key === "footerNote" ? 1200 : key === "organizationName" || key === "departmentName" || key === "title" ? 240 : 160,
  ))) return null;
  const normalizedCertificateTemplate = { ...certificateTemplateCandidate } as CertificateTemplate;
  if (certificateTemplateCandidate.design !== undefined) {
    const design = normalizeCertificateDesign(certificateTemplateCandidate.design);
    if (!design) return null;
    normalizedCertificateTemplate.design = design;
  }
  if (!Array.isArray(candidate.scenarios) || candidate.scenarios.length < 1 || candidate.scenarios.length > 100) return null;
  const ids = new Set<number>();
  const validScenarios = candidate.scenarios.every((scenario) => {
    if (!scenario || typeof scenario !== "object") return false;
    if (!Number.isInteger(scenario.id) || scenario.id < 1 || scenario.id > 100 || ids.has(scenario.id)) return false;
    ids.add(scenario.id);
    return isText(scenario.title, 160)
      && isText(scenario.category, 80)
      && difficultyValues.includes(scenario.difficulty)
      && isText(scenario.channel, 80)
      && isText(scenario.icon, 12)
      && isText(scenario.story, 3000)
      && Array.isArray(scenario.redFlags) && scenario.redFlags.length >= 1 && scenario.redFlags.length <= 8
      && scenario.redFlags.every((flag) => isText(flag, 220))
      && isText(scenario.tip, 1000)
      && isText(scenario.evidence, 300)
      && Array.isArray(scenario.choices) && scenario.choices.length === 3
      && scenario.choices.every((choice) => {
        if (!isText(choice.text, 500)) return false;
        const hasAnswerKey = choice.correct !== undefined || choice.moneyDelta !== undefined
          || choice.awarenessDelta !== undefined || choice.feedback !== undefined;
        if (!hasAnswerKey) return !requireAnswerKeys;
        return typeof choice.correct === "boolean"
          && Number.isInteger(choice.moneyDelta) && Math.abs(choice.moneyDelta ?? 0) <= 300_000_000
          && Number.isInteger(choice.awarenessDelta) && Math.abs(choice.awarenessDelta ?? 0) <= 100
          && isText(choice.feedback, 1200);
      })
      && (!requireAnswerKeys || scenario.choices.filter((choice) => choice.correct === true).length === 1);
  });
  if (!validScenarios) return null;
  if (!Array.isArray(candidate.knowledgeCards) || candidate.knowledgeCards.length < 1 || candidate.knowledgeCards.length > 24) return null;
  if (!candidate.knowledgeCards.every((card) => isText(card.icon, 12) && isText(card.title, 160) && isText(card.text, 1200))) return null;
  const normalizedCopy = { ...copy } as SiteCopy;
  normalizedCopy.newsEyebrow = isText(copy.newsEyebrow, 180) ? copy.newsEyebrow : defaultSiteContent.copy.newsEyebrow;
  normalizedCopy.newsTitle = isText(copy.newsTitle, 180) ? copy.newsTitle : defaultSiteContent.copy.newsTitle;
  normalizedCopy.newsIntro = isText(copy.newsIntro, 1000) ? copy.newsIntro : defaultSiteContent.copy.newsIntro;
  if (normalizedCopy.dashboardTitle === "Dashboard nhận thức an toàn") {
    normalizedCopy.dashboardTitle = "Dashboard rủi ro nhận thức";
  }
  if (normalizedCopy.dashboardIntro === "Góc nhìn tổng hợp phục vụ báo cáo CISO trên dữ liệu tập trung của toàn bộ người dùng.") {
    normalizedCopy.dashboardIntro = "Tổng hợp mức độ tham gia, kết quả mô phỏng và nhóm cần ưu tiên đào tạo lại để hỗ trợ báo cáo an toàn thông tin.";
  }
  const normalizedScenarios = (candidate.scenarios as Scenario[]).map((scenario) => ({
    ...scenario,
    choices: scenario.choices.map((choice) => choice.text === "Tắt máy, gọi 113 hoặc công an địa phương qua số chính thức"
      ? { ...choice, text: "Tắt máy, xác minh qua công an địa phương hoặc phản ánh cuộc gọi tới 156" }
      : choice),
  }));
  const normalizedKnowledgeCards = (candidate.knowledgeCards as KnowledgeCard[]).map((card) => card.title === "Kênh trợ giúp"
    ? { ...card, title: "Báo cáo đúng kênh", text: "Nếu đã chuyển tiền, liên hệ ngay ngân hàng qua kênh chính thức, lưu bằng chứng và trình báo cơ quan công an gần nhất." }
    : card);
  const candidateNews = candidate.newsArticles === undefined ? defaultSiteContent.newsArticles : candidate.newsArticles;
  if (!Array.isArray(candidateNews) || candidateNews.length > 60) return null;
  const newsIds = new Set<string>();
  const validNews = candidateNews.every((article) => {
    if (!article || typeof article !== "object") return false;
    if (!isText(article.id, 100) || !/^[a-z0-9-]+$/.test(article.id) || newsIds.has(article.id)) return false;
    newsIds.add(article.id);
    return typeof article.title === 'string' && typeof article.summary === 'string'
      && typeof article.category === 'string' && typeof article.sourceName === 'string'
      && typeof article.sourceUrl === 'string' && typeof article.featured === 'boolean'
      && [article.slug, article.thumbnail, article.thumbnailAlt, article.seoTitle, article.metaDescription].every(value => value === undefined || typeof value === 'string')
      && newsErrors(article as NewsArticle, candidateNews as NewsArticle[]).length === 0;
  });
  if (!validNews) return null;
  return {
    version: 1,
    copy: normalizedCopy,
    certificateTemplate: normalizedCertificateTemplate,
    scenarios: normalizedScenarios,
    knowledgeCards: normalizedKnowledgeCards,
    newsArticles: candidateNews as NewsArticle[],
  };
}

export function normalizeManagedSiteContent(value: unknown): SiteContent | null {
  return normalizeSiteContent(value, true);
}
