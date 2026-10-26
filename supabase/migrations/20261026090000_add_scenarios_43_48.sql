-- Add six 2026 scam-awareness challenges and keep the operation idempotent.
with new_scenarios(payload) as (
  values ($scenarios$
[
  {
    "id": 43,
    "title": "Cuộc gọi thu hồi sản phẩm và hoàn tiền",
    "category": "Mua sắm",
    "difficulty": "Khó",
    "channel": "Điện thoại · Zalo",
    "icon": "↩",
    "isNew": true,
    "story": "Sau một đơn hàng online, người gọi đọc đúng tên sản phẩm, ngày mua và địa chỉ nhận. Họ nói lô hàng có lỗi cần thu hồi, rồi đề nghị kết bạn Zalo và quét mã QR hoặc cài ứng dụng để nhận hoàn tiền.",
    "redFlags": [
      "Biết chi tiết đơn hàng nhưng yêu cầu chuyển sang kênh riêng",
      "Hoàn tiền nhưng đòi đăng nhập, OTP hoặc cài ứng dụng",
      "Tạo áp lực phải xử lý ngay để không mất quyền lợi"
    ],
    "tip": "Tự mở ứng dụng hoặc website chính thức của sàn để kiểm tra đơn hàng. Chỉ liên hệ bộ phận hỗ trợ qua thông tin công khai chính thức.",
    "evidence": "Cuộc gọi và tin nhắn thu hồi sản phẩm giả",
    "choices": [
      {
        "text": "Tiếp tục trao đổi trên Zalo nhưng chỉ cung cấp mã đơn hàng",
        "correct": false,
        "moneyDelta": 0,
        "awarenessDelta": -12,
        "feedback": "Thông tin đơn hàng có thể được ghép với dữ liệu đã lộ để tạo kịch bản thuyết phục hơn. Hãy dừng trao đổi trên kênh do người gọi chỉ định."
      },
      {
        "text": "Dừng cuộc gọi, tự mở ứng dụng chính thức và liên hệ bộ phận hỗ trợ của sàn",
        "correct": true,
        "moneyDelta": 0,
        "awarenessDelta": 9,
        "feedback": "Đúng. Tự mở kênh chính thức giúp loại bỏ đường link, mã QR và tài khoản hỗ trợ giả."
      },
      {
        "text": "Quét mã QR để xem quy trình hoàn tiền rồi quyết định sau",
        "correct": false,
        "moneyDelta": -25000000,
        "awarenessDelta": -28,
        "feedback": "Mã QR có thể dẫn tới trang đăng nhập giả hoặc tệp cài đặt độc hại. Việc chỉ mở để xem vẫn tạo rủi ro mất tài khoản và thiết bị."
      }
    ]
  },
  {
    "id": 44,
    "title": "Bưu phẩm tri ân kèm mã QR nhận quà",
    "category": "Quà tặng",
    "difficulty": "Khó",
    "channel": "Bưu phẩm",
    "icon": "▣",
    "isNew": true,
    "story": "Bạn bất ngờ nhận một bưu phẩm có logo thương hiệu quen thuộc, bên trong là quà nhỏ và thiệp tri ân. Thiệp yêu cầu quét mã QR để nhận voucher hoặc tiền thưởng, sau đó đăng nhập và cài ứng dụng.",
    "redFlags": [
      "Quà đến ngoài chương trình đã đăng ký",
      "Mã QR dẫn sang trang hoặc ứng dụng không xác định",
      "Yêu cầu đăng nhập, nộp phí hoặc cấp quyền thiết bị"
    ],
    "tip": "Không quét mã từ bưu phẩm không rõ nguồn gốc. Tự tìm kênh chính thức của thương hiệu để kiểm tra chương trình.",
    "evidence": "Bưu phẩm và mã QR nhận quà giả",
    "choices": [
      {
        "text": "Gọi số điện thoại in trên thiệp và cung cấp thông tin đơn hàng để xác minh",
        "correct": false,
        "moneyDelta": 0,
        "awarenessDelta": -10,
        "feedback": "Số điện thoại trên bưu phẩm là một phần của kịch bản. Hãy tự tìm số hỗ trợ trên website hoặc ứng dụng chính thức."
      },
      {
        "text": "Quét mã bằng điện thoại phụ không có ứng dụng ngân hàng",
        "correct": false,
        "moneyDelta": -18000000,
        "awarenessDelta": -24,
        "feedback": "Thiết bị phụ vẫn có thể bị chiếm quyền hoặc dùng để lấy tài khoản mạng xã hội, email và danh bạ."
      },
      {
        "text": "Không quét mã, kiểm tra chương trình qua kênh chính thức và lưu bằng chứng để phản ánh",
        "correct": true,
        "moneyDelta": 0,
        "awarenessDelta": 9,
        "feedback": "Đúng. Tách việc xác minh khỏi mọi thông tin trên bưu phẩm là cách an toàn nhất."
      }
    ]
  },
  {
    "id": 45,
    "title": "Tin nhắn phạt nguội kèm đường link nộp phạt",
    "category": "Mạo danh",
    "difficulty": "Trung bình",
    "channel": "SMS",
    "icon": "⚠",
    "isNew": true,
    "story": "Bạn nhận SMS thông báo xe có lỗi phạt nguội, yêu cầu truy cập đường link để xem hình ảnh và nộp phạt trong ngày nhằm tránh tăng mức xử phạt.",
    "redFlags": [
      "Thông báo xử phạt kèm đường link lạ",
      "Hối thúc nộp tiền trong thời gian rất ngắn",
      "Trang thanh toán yêu cầu thông tin ngân hàng hoặc OTP"
    ],
    "tip": "Tự tra cứu qua cổng thông tin hoặc ứng dụng chính thức của cơ quan chức năng. Không truy cập đường link trong tin nhắn không xác thực.",
    "evidence": "SMS phạt nguội giả mạo",
    "choices": [
      {
        "text": "Không bấm link, tự tra cứu trên kênh chính thức của cơ quan chức năng",
        "correct": true,
        "moneyDelta": 0,
        "awarenessDelta": 8,
        "feedback": "Đúng. Chủ động nhập địa chỉ kênh chính thức giúp tránh website thanh toán giả."
      },
      {
        "text": "Mở link để xem ảnh vi phạm nhưng không nhập thông tin thanh toán",
        "correct": false,
        "moneyDelta": 0,
        "awarenessDelta": -12,
        "feedback": "Trang giả có thể thu thập thông tin thiết bị, dẫn dụ tải tệp hoặc tiếp tục gây áp lực. Không nên mở đường link."
      },
      {
        "text": "Nhập thông tin ngân hàng để nộp sớm, tránh bị tăng tiền phạt",
        "correct": false,
        "moneyDelta": -20000000,
        "awarenessDelta": -27,
        "feedback": "Cơ quan chức năng không xử lý phạt nguội bằng đường link thanh toán bất ngờ trong SMS. Dữ liệu ngân hàng và OTP có thể bị đánh cắp."
      }
    ]
  },
  {
    "id": 46,
    "title": "Cuộc gọi ngắn thu thập mẫu giọng nói",
    "category": "Deepfake",
    "difficulty": "Rất khó",
    "channel": "Điện thoại",
    "icon": "◌",
    "isNew": true,
    "story": "Một số lạ tự xưng là nhân viên giao hàng hoặc khảo sát, liên tục hỏi các câu buộc bạn nói rõ họ tên, xác nhận “đồng ý” và đọc vài câu ngắn. Người này gọi lại từ nhiều số khác nhau nhưng không đưa được mã đơn hoặc thông tin đơn vị.",
    "redFlags": [
      "Cố kéo dài hội thoại để bạn nói nhiều câu rõ tiếng",
      "Yêu cầu đọc lại họ tên hoặc câu xác nhận",
      "Không chứng minh được đơn vị, đơn hàng hay mục đích cuộc gọi"
    ],
    "tip": "Kết thúc cuộc gọi, tự xác minh qua số chính thức và cảnh báo người thân về nguy cơ giả giọng. Không gửi thêm tin nhắn thoại cho số lạ.",
    "evidence": "Chuỗi cuộc gọi thu thập mẫu giọng nói",
    "choices": [
      {
        "text": "Tiếp tục nghe máy nhưng chỉ trả lời có hoặc không",
        "correct": false,
        "moneyDelta": 0,
        "awarenessDelta": -14,
        "feedback": "Các đoạn trả lời ngắn vẫn có thể bị cắt ghép hoặc dùng làm mẫu giọng. Hãy kết thúc cuộc gọi khi không xác minh được danh tính."
      },
      {
        "text": "Kết thúc cuộc gọi, xác minh qua số chính thức và cảnh báo người thân về giả giọng",
        "correct": true,
        "moneyDelta": 0,
        "awarenessDelta": 10,
        "feedback": "Đúng. Việc xác minh độc lập và báo trước cho người thân làm giảm hiệu quả của cuộc gọi giả giọng tiếp theo."
      },
      {
        "text": "Gửi tin nhắn thoại để chứng minh mình đúng là người nhận hàng",
        "correct": false,
        "moneyDelta": -30000000,
        "awarenessDelta": -29,
        "feedback": "Tin nhắn thoại cung cấp mẫu giọng rõ hơn và có thể được dùng cho deepfake nhằm vay tiền người thân."
      }
    ]
  },
  {
    "id": 47,
    "title": "Đơn đặt hàng số lượng lớn từ trường học giả",
    "category": "Giao dịch doanh nghiệp",
    "difficulty": "Rất khó",
    "channel": "Email · Điện thoại",
    "icon": "▥",
    "isNew": true,
    "story": "Một người tự xưng đại diện trường học gửi đơn mua số lượng lớn, sau đó nhờ bạn đặt thêm mặt hàng chuyên dụng từ “nhà cung cấp quen”. Họ yêu cầu bạn thanh toán trước cho bên thứ ba và hứa hoàn lại cùng đơn hàng chính.",
    "redFlags": [
      "Đơn hàng lớn xuất hiện đột ngột và cần xử lý gấp",
      "Giới thiệu nhà cung cấp thứ ba rồi yêu cầu ứng tiền",
      "Chỉ xác minh qua số điện thoại hoặc email do chính người đặt hàng cung cấp"
    ],
    "tip": "Xác minh độc lập đơn vị, người có thẩm quyền, hợp đồng và tài khoản thanh toán. Không ứng tiền cho nhà cung cấp do bên đặt hàng chỉ định.",
    "evidence": "Đơn đặt hàng và nhà cung cấp liên kết giả",
    "choices": [
      {
        "text": "Nhận đơn sau khi họ gửi ảnh công văn có dấu đỏ",
        "correct": false,
        "moneyDelta": -80000000,
        "awarenessDelta": -27,
        "feedback": "Hình ảnh công văn và con dấu có thể bị làm giả. Cần xác minh người có thẩm quyền và quy trình mua sắm qua kênh độc lập."
      },
      {
        "text": "Gọi số trong email xác nhận rồi chuyển trước một nửa cho nhà cung cấp",
        "correct": false,
        "moneyDelta": -40000000,
        "awarenessDelta": -23,
        "feedback": "Số điện thoại trong email do đối tượng kiểm soát. Chuyển một phần vẫn là ứng tiền cho mắt xích giả."
      },
      {
        "text": "Tự xác minh đơn vị và thẩm quyền qua kênh độc lập, không ứng tiền cho bên thứ ba",
        "correct": true,
        "moneyDelta": 0,
        "awarenessDelta": 10,
        "feedback": "Đúng. Xác minh độc lập và từ chối ứng tiền sẽ phá vỡ mô hình lừa đảo đơn hàng liên kết."
      }
    ]
  },
  {
    "id": 48,
    "title": "Việc làm lương cao dẫn sang nước ngoài trái phép",
    "category": "Tuyển dụng",
    "difficulty": "Rất khó",
    "channel": "Mạng xã hội",
    "icon": "⚑",
    "isNew": true,
    "story": "Một tài khoản mạng xã hội mời bạn làm việc lương rất cao ở nước ngoài, không cần kinh nghiệm. Họ yêu cầu gửi hộ chiếu, đặt cọc, đi theo đường không chính thức và giữ bí mật lịch trình; công việc thực tế có thể là cưỡng ép tham gia lừa đảo.",
    "redFlags": [
      "Lương cao bất thường nhưng không có mô tả công việc rõ ràng",
      "Yêu cầu đặt cọc, giữ giấy tờ hoặc xuất cảnh không chính thức",
      "Dặn giữ bí mật và né xác minh với gia đình, cơ quan chức năng"
    ],
    "tip": "Chỉ làm việc qua doanh nghiệp được cấp phép, hợp đồng và thị thực hợp lệ. Nếu có dấu hiệu bị đe dọa hoặc mua bán người, liên hệ cơ quan chức năng hoặc Tổng đài 111.",
    "evidence": "Tin tuyển dụng và lịch trình xuất cảnh đáng ngờ",
    "choices": [
      {
        "text": "Dừng liên hệ, xác minh doanh nghiệp, hợp đồng và thị thực qua kênh chính thức",
        "correct": true,
        "moneyDelta": 0,
        "awarenessDelta": 10,
        "feedback": "Đúng. Tuyển dụng hợp pháp phải có doanh nghiệp, hợp đồng, thị thực và lộ trình xuất cảnh minh bạch."
      },
      {
        "text": "Gửi ảnh hộ chiếu và đặt cọc để giữ chỗ trước",
        "correct": false,
        "moneyDelta": -35000000,
        "awarenessDelta": -30,
        "feedback": "Giấy tờ và tiền đặt cọc có thể bị chiếm đoạt; thông tin hộ chiếu còn có thể bị dùng cho mục đích phạm pháp."
      },
      {
        "text": "Đi theo lịch trình để xem nơi làm việc rồi mới quyết định",
        "correct": false,
        "moneyDelta": -100000000,
        "awarenessDelta": -38,
        "feedback": "Khi đã xuất cảnh trái phép hoặc giao giấy tờ, nạn nhân có thể bị kiểm soát, cưỡng ép lao động và rất khó cầu cứu."
      }
    ]
  }
]
$scenarios$::jsonb)
),
rebuilt as (
  select
    content_row.slug,
    (
      select jsonb_agg(item order by (item->>'id')::integer)
      from (
        select existing.item
        from jsonb_array_elements(content_row.content->'scenarios') as existing(item)
        where (existing.item->>'id')::integer not between 43 and 48
        union all
        select incoming.item
        from new_scenarios,
             jsonb_array_elements(new_scenarios.payload) as incoming(item)
      ) merged
    ) as scenarios
  from public.site_content as content_row
  where content_row.slug in ('main', 'main-draft')
)
update public.site_content as content_row
set
  content = jsonb_set(content_row.content, '{scenarios}', rebuilt.scenarios, true),
  updated_at = clock_timestamp()
from rebuilt
where content_row.slug = rebuilt.slug;
