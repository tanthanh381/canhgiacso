export type ChallengeDifficultyUpgrade = {
  choices: [string, string, string];
};

/**
 * Public wording for the harder challenge pass. Answer keys remain server-side.
 * Each set keeps three plausible actions so the learner must identify the
 * complete, independently verified response rather than the most alarming one.
 */
export const challengeDifficultyUpgrades: Record<number, ChallengeDifficultyUpgrade> = {
  1: { choices: [
    "Kết thúc cuộc gọi, tự gọi cơ quan chức năng qua số công khai và báo người thân",
    "Giữ máy để xin mã hồ sơ rồi tự tra cứu bằng thông tin người gọi cung cấp",
    "Yêu cầu gửi quyết định bằng văn bản trước khi chia sẻ thêm thông tin cá nhân",
  ] },
  2: { choices: [
    "Tự mở ứng dụng chính thức, kiểm tra đơn hàng và báo cáo SMS nếu không có giao dịch tương ứng",
    "Mở link bằng trình duyệt riêng tư, không đăng nhập, rồi hỏi người bán trong chính tin nhắn",
    "Gọi số hỗ trợ nằm trong SMS để xác nhận trước khi mở ứng dụng ngân hàng",
  ] },
  3: { choices: [
    "Ngắt video, gọi lại số quen thuộc và dùng một câu hỏi riêng trước khi cân nhắc chuyển tiền",
    "Yêu cầu người gọi đổi góc máy, đọc thông tin gia đình rồi chuyển một khoản nhỏ để kiểm tra",
    "Đề nghị họ gửi giấy tờ tùy thân qua chính cuộc chat rồi nhờ người quen xem giúp",
  ] },
  4: { choices: [
    "Dừng chuỗi nhiệm vụ, lưu lịch sử giao dịch và xác minh đơn vị tuyển dụng qua kênh độc lập",
    "Chỉ nạp đúng khoản tối thiểu, không rủ người khác và rút ngay khi hệ thống cho phép",
    "Xin hợp đồng trong nhóm chat rồi hoàn thành thêm một nhiệm vụ nhỏ để kiểm chứng",
  ] },
  5: { choices: [
    "Dừng thanh toán, hỏi quầy chính thức và chỉ tiếp tục khi tên người nhận khớp với đơn vị thu tiền",
    "Quét lại bằng ứng dụng ngân hàng khác rồi kiểm tra số tiền trước khi xác nhận",
    "Thanh toán một khoản nhỏ trước, sau đó yêu cầu nhân viên đối soát nếu có sai lệch",
  ] },
  6: { choices: [
    "Hủy file cài đặt, tìm ứng dụng từ kho chính thức và báo tài khoản đã gửi file",
    "Cài trong lúc tắt mạng, kiểm tra quyền rồi gỡ ứng dụng nếu thấy bất thường",
    "Từ chối đọc SMS nhưng cho phép Trợ năng vì cần đồng bộ giấy tờ nhanh",
  ] },
  7: { choices: [
    "Không nạp tiền, kiểm tra pháp nhân và giấy phép bằng nguồn ngoài nhóm trước khi cảnh báo người quen",
    "Nạp số nhỏ bằng ví riêng rồi chỉ tăng vốn sau khi rút được một lần",
    "Yêu cầu quản trị viên cung cấp ảnh giấy phép và tin vào các thành viên đã khoe lợi nhuận",
  ] },
  8: { choices: [
    "Không nhập OTP, gọi bạn qua số quen thuộc và báo rằng tài khoản có thể đã bị chiếm",
    "Nhập OTP nhưng đổi mật khẩu ngay nếu trang vẫn hiển thị đúng tên cuộc thi",
    "Chụp màn hình trang bình chọn rồi gửi OTP qua kênh chat riêng để bạn xác nhận",
  ] },
  9: { choices: [
    "Không di chuyển số tiền, lưu thông tin giao dịch và liên hệ ngân hàng để tra soát chính thức",
    "Hoàn lại đúng số tiền nhưng chỉ sau khi gọi lại người chuyển theo số họ cung cấp",
    "Chuyển khoản vào tài khoản trung gian do người gọi chỉ định rồi giữ lại ảnh xác nhận",
  ] },
  10: { choices: [
    "Tìm tổ chức tiếp nhận độc lập, kiểm tra nguồn gốc hình ảnh và chỉ chuyển qua kênh chính thức",
    "Chia sẻ bài kêu gọi nhưng tắt phần kèm link để không trực tiếp thu tiền",
    "Chuyển một khoản nhỏ trước rồi chờ bình luận của cộng đồng xác nhận tổ chức",
  ] },
  11: { choices: [
    "Dừng nạp tiền, lưu bằng chứng và kiểm tra nền tảng cùng pháp nhân bằng nguồn độc lập",
    "Nộp một phần phí xác minh nếu đối phương cũng góp tiền và hứa hoàn lại khi rút được",
    "Đề nghị đổi sang tài khoản ngân hàng của người quen để giảm rủi ro cho mối quan hệ",
  ] },
  12: { choices: [
    "Ngắt máy, tự kiểm tra trên ứng dụng hoặc tổng đài chính thức và không dùng QR trong cuộc gọi",
    "Đọc mã khách hàng cho người gọi nhưng chỉ thanh toán sau khi họ xác nhận số tiền nợ",
    "Gọi lại số trong tin nhắn của người gọi để hỏi xem mã QR có đúng không",
  ] },
  13: { choices: [
    "Gọi giáo viên, nhà trường và bệnh viện qua số tự tìm; chỉ hành động sau khi xác minh độc lập",
    "Yêu cầu gửi ảnh bệnh án có che thông tin rồi chuyển trước khoản viện phí tối thiểu",
    "Gọi lại số vừa liên hệ bằng máy khác để kiểm tra xem người gọi có thật sự bắt máy không",
  ] },
  14: { choices: [
    "Đóng trang, tự truy cập cổng thuế chính thức và không cung cấp OTP hay video khuôn mặt",
    "Chỉ nhập mã số thuế và số tài khoản, giữ lại OTP để tự xác minh sau",
    "Quay video nhưng không đọc OTP nếu tên miền có chứng chỉ HTTPS và giao diện quen thuộc",
  ] },
  15: { choices: [
    "Đối chiếu số dư và lịch sử giao dịch trên tài khoản của mình trước khi giao hàng",
    "Giữ giấy tờ người mua và giao hàng nếu biên lai có mã giao dịch tra cứu được",
    "Chờ thêm vài phút, gọi ngân hàng theo số trên biên lai rồi giao nếu họ không bắt máy",
  ] },
  16: { choices: [
    "Tự mở ứng dụng, kiểm tra trung tâm hỗ trợ và đổi mật khẩu chỉ khi có dấu hiệu trong tài khoản",
    "Mở link bằng thiết bị phụ, không lưu mật khẩu, rồi chuyển tiếp cho đồng nghiệp kiểm tra",
    "Trả lời email hỏi mã hồ sơ vi phạm trước khi quyết định có đăng nhập hay không",
  ] },
  17: { choices: [
    "Dừng nhiệm vụ, lưu bằng chứng và xác minh chương trình với nhãn hàng qua website chính thức",
    "Chỉ mua một đơn nhỏ bằng tài khoản phụ để kiểm tra việc hoàn tiền trước khi dừng",
    "Xin hợp đồng và giấy tờ của fanpage, sau đó hoàn thành đơn đang dang dở để không mất suất",
  ] },
  18: { choices: [
    "Hủy giao dịch, tự gọi tổ chức tín dụng qua số công khai và không gửi CCCD trong cuộc chat",
    "Xin hóa đơn phí có con dấu rồi chuyển vào tài khoản cá nhân nếu tên người nhận trùng nhân viên",
    "Gửi bản CCCD đã che số để họ kiểm tra hồ sơ trước, chưa cần trả phí ngay",
  ] },
  19: { choices: [
    "Từ chối điều khiển từ xa và tự kiểm tra sinh trắc học trong ứng dụng hoặc tại điểm giao dịch",
    "Cho chia sẻ màn hình nhưng thoát ứng dụng ngân hàng trước khi làm theo hướng dẫn",
    "Chỉ quay khuôn mặt, không đọc OTP, vì sinh trắc học sẽ giúp khóa tài khoản an toàn hơn",
  ] },
  20: { choices: [
    "Không cung cấp OTP, mở ứng dụng ví để kiểm tra giao dịch và liên hệ hỗ trợ trong ứng dụng",
    "Đọc OTP đầu tiên nhưng dừng nếu hệ thống yêu cầu thêm mã hoặc mật khẩu",
    "Gửi ảnh số dư và bốn số cuối thẻ để nhân viên xác định giao dịch đang lỗi",
  ] },
  21: { choices: [
    "Không trả thêm tiền, lưu toàn bộ trao đổi và liên hệ ngân hàng/cơ quan chức năng qua kênh chính thức",
    "Trả một khoản nhỏ để nhận lại giấy tờ rồi mới quyết định có báo cáo hay không",
    "Nhờ một ‘chuyên gia’ khác trong nhóm kiểm tra hồ sơ và thương lượng phí thấp hơn",
  ] },
  22: { choices: [
    "Gọi lại người thân bằng số quen thuộc, xác minh câu hỏi riêng và cảnh báo gia đình về cuộc gọi giả",
    "Yêu cầu giọng nói đọc một câu mới rồi chuyển tiền nếu âm thanh không còn bị ngắt",
    "Gọi cho người đang ở gần người thân nhưng vẫn giữ cuộc gọi mở để đối chiếu khuôn mặt",
  ] },
  23: { choices: [
    "Ngắt liên lạc, gọi người thân qua số quen thuộc và báo cơ quan chức năng nếu có dấu hiệu đòi tiền",
    "Yêu cầu video quay toàn cảnh và chuyển khoản vào tài khoản của người tự nhận là luật sư",
    "Giữ bí mật để tránh kẻ bắt cóc làm hại nạn nhân, chỉ nhờ một người kín đáo xác minh",
  ] },
  24: { choices: [
    "Bỏ qua link, tự kiểm tra thẻ trong ứng dụng hoặc gọi ngân hàng qua kênh công khai",
    "Hỏi chatbot tên nhân viên và bốn số cuối thẻ, không gửi OTP cho đến khi có câu trả lời",
    "Đăng nhập bằng tài khoản phụ để xem chatbot có hiển thị đúng thông tin sản phẩm không",
  ] },
  25: { choices: [
    "Từ chối kết nối/ký, kiểm tra thông báo dự án từ kênh chính thức và rà soát quyền ví nếu đã bấm",
    "Dùng ví phụ có số dư nhỏ để ký trước rồi thu hồi quyền sau khi nhận được airdrop",
    "Kết nối ví chính nhưng không nhập seed phrase vì giao dịch không yêu cầu phí gas",
  ] },
  26: { choices: [
    "Chỉ giao dịch trong nền tảng có bảo vệ, đối chiếu người bán và không chuyển tiền ngoài quy trình",
    "Nhận hàng rồi kiểm tra sản phẩm, chỉ chuyển ngoài sàn nếu người bán gửi đủ thông tin cá nhân",
    "Thanh toán một phần trong sàn, phần còn lại trả khi mở hàng để giảm thiệt hại nếu có tranh chấp",
  ] },
  27: { choices: [
    "Không xác nhận QR, tự mở ứng dụng họp và nhập mã từ nguồn đã kiểm tra",
    "Quét bằng điện thoại cá nhân, kiểm tra tên thiết bị rồi xác nhận nếu email đến từ đồng nghiệp",
    "Yêu cầu người gửi gọi video xác nhận mã trước khi quét để chắc chắn tài khoản không bị giả",
  ] },
  28: { choices: [
    "Dừng hồ sơ, kiểm tra giấy phép và hợp đồng qua cơ quan chức năng trước khi gửi bất kỳ giấy tờ nào",
    "Gửi ảnh hộ chiếu đã che số, chỉ nộp phí sau khi có người quen xác nhận công ty",
    "Đặt cọc nhỏ để giữ suất, đồng thời yêu cầu hoàn phí nếu hồ sơ không được cấp phép",
  ] },
  29: { choices: [
    "Không mở link, tự tìm chương trình trên kênh chính thức và báo cáo tin nhắn đáng ngờ",
    "Gọi số trong SMS nhưng không cung cấp OTP để hỏi điều kiện nhận thưởng",
    "Thanh toán phí nhỏ bằng thẻ phụ rồi theo dõi giao dịch trước khi cung cấp thêm thông tin",
  ] },
  30: { choices: [
    "Rời buổi, kiểm tra chuyên gia và pháp nhân sàn bằng nguồn độc lập trước mọi quyết định tài chính",
    "Nạp mức nhỏ bằng tài khoản riêng vì đã nghe chuyên gia trả lời được nhiều câu hỏi khó",
    "Yêu cầu ban tổ chức gửi giấy phép trong phần bình luận rồi làm theo nếu nhiều người đồng ý",
  ] },
  31: { choices: [
    "Không chuyển tiền, tự liên hệ phòng đào tạo qua website hoặc số điện thoại chính thức của trường",
    "Trả lời email xin thêm giấy tờ xác nhận, nhưng chưa chuyển tiền cho đến khi được phản hồi",
    "Chuyển phí giữ chỗ vào tài khoản trường ghi trong email rồi gọi trường để đối chiếu sau",
  ] },
  32: { choices: [
    "Tạm dừng, tự gọi khách sạn qua website chính thức và xác minh cả fanpage lẫn tài khoản nhận tiền",
    "Chuyển cọc qua cổng thanh toán có tên khách sạn nếu fanpage đã được xác minh",
    "Đề nghị khách sạn gửi video phòng và giấy phép kinh doanh trong chính cuộc chat trước khi cọc",
  ] },
  33: { choices: [
    "Dừng thanh toán, lưu buổi phát/tin nhắn và báo cáo tài khoản qua nền tảng cùng cơ quan chức năng",
    "Yêu cầu trừ thuế trực tiếp vào giải thưởng rồi chỉ trả phần phí còn thiếu",
    "Nhờ người bán gửi hợp đồng chương trình, sau đó thanh toán qua tài khoản trung gian có biên lai",
  ] },
  34: { choices: [
    "Không chuyển tiền, lưu bằng chứng, bảo vệ tài khoản và trình báo ngay qua kênh chính thức",
    "Đề nghị trả một phần để họ xóa bản đăng thử, đồng thời ghi âm cuộc thương lượng",
    "Xóa tài khoản và tin nhắn ngay để giảm khả năng phát tán trước khi báo cáo",
  ] },
  35: { choices: [
    "Không mua, lưu thông tin livestream và kiểm tra độc lập đơn vị bán/định giá trước khi báo cáo",
    "Mua viên nhỏ bằng tài khoản phụ rồi yêu cầu livestream công khai quy trình mua lại",
    "Tin vào bình luận đã nhận tiền nhưng chỉ thanh toán khi người bán gửi giấy kiểm định qua chat",
  ] },
  36: { choices: [
    "Không mở tệp, xác minh với đối tác qua kênh khác và báo IT Security để kiểm tra an toàn",
    "Mở bằng máy cá nhân đã cập nhật, tắt macro và gửi lại nếu tệp không báo lỗi",
    "Bật macro trong môi trường ngoại tuyến rồi quét virus trước khi chuyển tệp cho đồng nghiệp",
  ] },
  37: { choices: [
    "Dừng đăng ký, tự xác minh đơn vị và địa điểm tổ chức qua website/kênh công khai",
    "Gửi giấy khai sinh đã che số, chỉ thanh toán sau khi fanpage cung cấp điều lệ cuộc thi",
    "Làm một nhiệm vụ nhỏ để kiểm tra hoàn tiền rồi gửi thêm thông tin nếu giao dịch thành công",
  ] },
  38: { choices: [
    "Không mở link, kiểm tra đơn trong ứng dụng và báo tài khoản giả cho sàn",
    "Đăng nhập bằng thiết bị phụ, không lưu mật khẩu, rồi đổi mật khẩu sau khi nhận hàng",
    "Gửi OTP để người bán sửa đơn nhưng đổi mật khẩu ngay nếu thấy thông báo bất thường",
  ] },
  39: { choices: [
    "Không cọc trước, xem phòng và xác minh quyền cho thuê qua nguồn độc lập trước khi ký",
    "Chuyển phí xem phòng nhỏ vào tài khoản trùng tên trên giấy tờ rồi hẹn đối chiếu sau",
    "Cọc một phần qua nền tảng trung gian nếu chủ nhà gửi video trực tiếp và ảnh căn cước",
  ] },
  40: { choices: [
    "Từ chối giao tiền, tự liên hệ đơn vị tuyển dụng và kiểm tra thông báo tuyển dụng chính thức",
    "Chỉ gửi CCCD đã che số để môi giới kiểm tra chỉ tiêu trước khi ký hợp đồng",
    "Trả một phần qua tài khoản có tên người quen giới thiệu, giữ tin nhắn làm bằng chứng",
  ] },
  41: { choices: [
    "Ngắt cuộc gọi, báo ngay gia đình/nhà trường/công an và xác minh sinh viên qua kênh độc lập",
    "Giữ video để làm bằng chứng nhưng chỉ nhắn kín cho một người, tránh làm kẻ gian kích động",
    "Làm theo tạm thời nhưng bật chia sẻ vị trí cho người thân để họ có thể tìm thấy sau",
  ] },
  42: { choices: [
    "Không góp thêm, kiểm tra tư cách pháp lý và chỉ giao dịch qua tổ chức có chức năng hợp pháp",
    "Góp khoản nhỏ qua hợp đồng viết tay, tăng vốn dần nếu người quen tiếp tục trả đúng hạn",
    "Yêu cầu ảnh hồ sơ vay và tài sản bảo đảm, rồi chuyển tiền khi giấy tờ có dấu xác nhận",
  ] },
};
