import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();

async function patchPublic(relativePath, id, block) {
  const file = path.join(ROOT, "public", relativePath);
  let html = await readFile(file, "utf8");
  if (!html.includes(`id="${id}"`)) {
    html = html.replace('<section class="seo-related">', `${block}<section class="seo-related">`);
    await writeFile(file, html, "utf8");
  }
}

await patchPublic(
  "kien-thuc/phong-chong-lua-dao-truc-tuyen/index.html",
  "search-demand-paths",
  `<section id="search-demand-paths"><h2>Tra cứu nhanh theo tình huống đang gặp</h2><p>Google thường đưa người dùng đến một câu hỏi rất cụ thể. Nếu bạn đang kiểm tra một cuộc gọi, tài khoản nhận tiền, đường link hoặc thông báo đang diễn ra, hãy đi thẳng vào hướng dẫn phù hợp:</p><div class="seo-grid"><a class="seo-card" href="/kien-thuc/tra-cuu-lua-dao/"><small>Tra cứu tổng hợp</small><h3>Tra cứu lừa đảo trước khi giao dịch</h3><p>Kiểm tra chéo số điện thoại, tài khoản và đường link đáng ngờ.</p></a><a class="seo-card" href="/kien-thuc/kiem-tra-so-dien-thoai-lua-dao/"><small>Cuộc gọi / SMS</small><h3>Kiểm tra số điện thoại lừa đảo</h3><p>Đối chiếu số lạ và đánh giá hành vi của người gọi.</p></a><a class="seo-card" href="/kien-thuc/tra-cuu-so-tai-khoan-lua-dao/"><small>Chuyển khoản</small><h3>Tra cứu số tài khoản lừa đảo</h3><p>Kiểm tra người nhận và tín hiệu rủi ro trước khi chuyển tiền.</p></a><a class="seo-card" href="/kien-thuc/kiem-tra-link-gia-mao/"><small>URL / website</small><h3>Kiểm tra link lừa đảo</h3><p>Phân tích URL ngay trên trình duyệt và đọc đúng tên miền.</p></a><a class="seo-card" href="/kien-thuc/lua-dao-vneid-gia-mao/"><small>Cảnh báo 2026</small><h3>Lừa đảo VNeID giả mạo</h3><p>Nhận biết yêu cầu cập nhật dữ liệu, cài app và link giả.</p></a><a class="seo-card" href="/kien-thuc/lua-dao-phat-nguoi-qua-sms/"><small>Cảnh báo 2026</small><h3>Lừa đảo phạt nguội qua SMS</h3><p>Nhận diện tin nhắn và website giả mạo cơ quan chức năng.</p></a><a class="seo-card" href="/kien-thuc/lua-dao-hoan-tien-don-hang/"><small>Hoàn tiền</small><h3>Lừa đảo hoàn tiền đơn hàng</h3><p>Tránh chia sẻ màn hình, quét QR và chuyển thêm phí.</p></a><a class="seo-card" href="/kien-thuc/25-kich-ban-lua-dao-2026/"><small>Tổng hợp 2026</small><h3>25 kịch bản lừa đảo năm 2026</h3><p>Nhìn toàn cảnh các nhóm thủ đoạn và cách phản ứng.</p></a></div></section>`
);

await patchPublic(
  "kien-thuc/an-toan-thong-tin-ca-nhan/index.html",
  "account-safety-paths",
  `<section id="account-safety-paths"><h2>Bảo vệ tài khoản theo nguy cơ cụ thể</h2><div class="seo-grid"><a class="seo-card" href="/kien-thuc/tai-khoan-bi-hack-phai-lam-gi/"><small>Khôi phục</small><h3>Tài khoản bị hack phải làm gì?</h3><p>Ưu tiên khóa truy cập, đổi thông tin xác thực và kiểm tra phiên đăng nhập.</p></a><a class="seo-card" href="/kien-thuc/lua-dao-otp-chiem-doat-tai-khoan/"><small>Xác thực</small><h3>Lừa đảo OTP và chiếm tài khoản</h3><p>Hiểu vì sao OTP, PIN và mã khôi phục phải được giữ bí mật.</p></a><a class="seo-card" href="/kien-thuc/lua-dao-vneid-gia-mao/"><small>Danh tính số</small><h3>Bảo vệ VNeID trước ứng dụng giả</h3><p>Tránh link tải giả, mã độc và quyền điều khiển thiết bị.</p></a><a class="seo-card" href="/kien-thuc/nhan-dien-email-phishing/"><small>Email</small><h3>Nhận diện email phishing</h3><p>Kiểm tra người gửi, tên miền và link đăng nhập trước khi bấm.</p></a><a class="seo-card" href="/kien-thuc/lua-dao-ma-qr/"><small>QR</small><h3>Nhận diện mã QR lừa đảo</h3><p>Kiểm tra link đích và người nhận trước khi quét hoặc thanh toán.</p></a><a class="seo-card" href="/kien-thuc/kiem-tra-link-gia-mao/"><small>Website</small><h3>Kiểm tra link giả mạo</h3><p>Dùng công cụ phân tích URL cục bộ, không gửi dữ liệu lên server.</p></a></div></section>`
);

await patchPublic(
  "kien-thuc/25-kich-ban-lua-dao-2026/index.html",
  "fresh-2026-alerts",
  `<section id="fresh-2026-alerts"><h2>Ba biến thể đang được cảnh báo trong năm 2026</h2><div class="seo-grid"><a class="seo-card" href="/kien-thuc/lua-dao-vneid-gia-mao/"><small>VNeID</small><h3>Ứng dụng và cập nhật VNeID giả mạo</h3><p>Lợi dụng thủ tục thật để dụ cài app, cấp quyền hoặc chuyển tiền.</p></a><a class="seo-card" href="/kien-thuc/lua-dao-phat-nguoi-qua-sms/"><small>SMS phạt nguội</small><h3>Link giả mạo CSGT/Bộ Công an</h3><p>Tin nhắn tạo áp lực nộp phạt và dẫn đến website lấy dữ liệu.</p></a><a class="seo-card" href="/kien-thuc/lua-dao-hoan-tien-don-hang/"><small>Hoàn tiền</small><h3>Hoàn tiền đơn hàng, dịch vụ giả</h3><p>Lợi dụng mong muốn lấy lại tiền để yêu cầu chia sẻ màn hình hoặc nộp thêm phí.</p></a></div></section>`
);

const linkFile = path.join(ROOT, "public", "kien-thuc", "kiem-tra-link-gia-mao", "index.html");
let linkHtml = await readFile(linkFile, "utf8");
if (!linkHtml.includes('href="/seo-tools.css"')) {
  linkHtml = linkHtml.replace('</head>', '<link rel="stylesheet" href="/seo-tools.css" /><script src="/seo-tools.js" defer></script></head>');
}
if (!linkHtml.includes('id="url-risk-tool"')) {
  const tool = `<section class="seo-tool" id="url-risk-tool"><h2>Kiểm tra tín hiệu rủi ro của một đường link</h2><p class="seo-tool-intro">Công cụ phân tích cấu trúc URL ngay trên thiết bị của bạn: HTTPS, tên miền Punycode, IP trực tiếp, URL rút gọn, cổng lạ và tệp có khả năng thực thi. Công cụ <strong>không gửi URL lên máy chủ</strong> và không khẳng định một website chắc chắn an toàn.</p><form class="seo-tool-form" id="url-risk-form"><label for="url-risk-input">URL hoặc tên miền cần kiểm tra</label><input id="url-risk-input" name="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="https://example.com/login" /><button type="submit">Phân tích link</button></form><p class="seo-tool-privacy">Phân tích cục bộ trong trình duyệt · Không lưu URL · Không gọi API bên ngoài.</p><div class="seo-tool-result" id="url-risk-result" aria-live="polite"></div></section>`;
  linkHtml = linkHtml.replace('<section><h2>', `${tool}<section><h2>`);
}
await writeFile(linkFile, linkHtml, "utf8");

const homeFile = path.join(ROOT, "github-pages", "index.html");
let home = await readFile(homeFile, "utf8");
if (!home.includes('/kien-thuc/lua-dao-vneid-gia-mao/')) {
  home = home.replace('<li><a href="/kien-thuc/25-kich-ban-lua-dao-2026/">25 kịch bản lừa đảo năm 2026 cần cảnh giác</a></li>', '<li><a href="/kien-thuc/25-kich-ban-lua-dao-2026/">25 kịch bản lừa đảo năm 2026 cần cảnh giác</a></li>\n            <li><a href="/kien-thuc/lua-dao-vneid-gia-mao/">Lừa đảo VNeID giả mạo: cách nhận biết</a></li>\n            <li><a href="/kien-thuc/lua-dao-phat-nguoi-qua-sms/">Lừa đảo phạt nguội qua SMS</a></li>\n            <li><a href="/kien-thuc/lua-dao-hoan-tien-don-hang/">Lừa đảo hoàn tiền đơn hàng</a></li>');
  await writeFile(homeFile, home, "utf8");
}

console.log("Strengthened priority crawl paths and added local URL risk analyzer.");
