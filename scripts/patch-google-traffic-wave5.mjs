import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public");
const SITE = "https://canhgiacso.com";
const UPDATED = "2026-09-15";

const QUICK_LINKS = `<section id="google-discovery-wave5" class="seo-note" data-seo-wave5="crawl-priority"><strong>Tra cứu nhanh trước khi tương tác</strong><p>Nếu bạn đang kiểm tra một người gọi, tài khoản nhận tiền hoặc đường link lạ, hãy dùng đúng công cụ theo dữ kiện đang có. Không có kết quả cảnh báo không đồng nghĩa an toàn; luôn xác minh thêm bằng kênh chính thức.</p><ul class="seo-checklist"><li><a href="/kien-thuc/kiem-tra-so-dien-thoai-lua-dao/"><strong>Kiểm tra số điện thoại lừa đảo</strong></a> — chuẩn hóa số, tra exact-match và đối chiếu dấu hiệu cuộc gọi giả mạo.</li><li><a href="/kien-thuc/tra-cuu-so-tai-khoan-lua-dao/"><strong>Tra cứu số tài khoản lừa đảo</strong></a> — kiểm tra trước khi chuyển tiền và đối chiếu tên người nhận.</li><li><a href="/kien-thuc/kiem-tra-link-gia-mao/"><strong>Kiểm tra link lừa đảo</strong></a> — phân tích URL, tên miền, HTTPS, Punycode, link rút gọn và file tải xuống.</li><li><a href="/kien-thuc/tra-cuu-lua-dao/"><strong>Tra cứu lừa đảo tổng hợp</strong></a> — kết hợp số điện thoại, số tài khoản, link và bối cảnh giao dịch.</li></ul></section>`;

const ANSWERS = {
  "kiem-tra-so-dien-thoai-lua-dao": `<section id="search-answer-phone" data-seo-wave5="answer-first"><h2>Cách kiểm tra số điện thoại lừa đảo nhanh và an toàn</h2><p><strong>Không nên kết luận một số điện thoại là an toàn chỉ vì chưa có báo cáo.</strong> Cách kiểm tra hiệu quả là tra chính xác số ở cả định dạng 0xxx và +84, đọc các báo cáo có nguồn, đối chiếu nội dung cuộc gọi và tự xác minh lại qua kênh chính thức của tổ chức mà người gọi tự xưng.</p><ol class="seo-checklist"><li>Tra exact-match số điện thoại trên công cụ ở trang này và trên công cụ/cơ sở dữ liệu uy tín.</li><li>So sánh số ở định dạng <code>0xxx</code> và <code>+84xxx</code> để tránh bỏ sót kết quả.</li><li>Nếu người gọi tự xưng ngân hàng, Công an, nhà mạng hoặc đơn vị giao hàng, kết thúc cuộc gọi và tự tìm hotline chính thức để gọi lại.</li><li>Không cung cấp OTP, mật khẩu, PIN, CVV, mã khôi phục; không cài APK hay chia sẻ màn hình theo hướng dẫn từ cuộc gọi bất ngờ.</li></ol><p>Truy vấn mục tiêu: <strong>kiểm tra số điện thoại lừa đảo</strong>, <strong>tra số điện thoại lạ</strong>, <strong>số điện thoại này có lừa đảo không</strong>.</p></section>`,
  "tra-cuu-so-tai-khoan-lua-dao": `<section id="search-answer-account" data-seo-wave5="answer-first"><h2>Cách tra cứu số tài khoản lừa đảo trước khi chuyển tiền</h2><p><strong>Tra cứu số tài khoản chỉ là một bước sàng lọc, không phải chứng nhận an toàn.</strong> Hãy tìm chính xác số tài khoản kèm tên ngân hàng, kiểm tra tên người nhận hiển thị trước khi xác nhận và xác minh người yêu cầu chuyển tiền bằng một kênh độc lập.</p><ol class="seo-checklist"><li>Tra exact-match số tài khoản và thêm tên ngân hàng vào truy vấn.</li><li>Đọc nguồn, ngày đăng và bối cảnh của cảnh báo; không chỉ dựa vào một ảnh chụp hoặc bình luận ẩn danh.</li><li>Đối chiếu tên người nhận trên màn hình chuyển khoản với cá nhân/tổ chức bạn thực sự đang giao dịch.</li><li>Nếu người nhận đổi tài khoản phút cuối, thúc ép chuyển ngay hoặc yêu cầu thêm “phí hoàn tiền”, hãy dừng giao dịch và xác minh lại.</li></ol><p>Truy vấn mục tiêu: <strong>tra cứu số tài khoản lừa đảo</strong>, <strong>kiểm tra tài khoản ngân hàng lừa đảo</strong>, <strong>số tài khoản này có lừa đảo không</strong>.</p></section>`,
  "tra-cuu-lua-dao": `<section id="search-answer-lookup" data-seo-wave5="answer-first"><h2>Tra cứu lừa đảo nên kiểm tra những dữ kiện nào?</h2><p>Khi nghi ngờ một giao dịch, hãy kiểm tra đồng thời <strong>số điện thoại, số tài khoản, đường link/tên miền và bối cảnh yêu cầu</strong>. Kẻ gian có thể thay đổi một dữ kiện rất nhanh, vì vậy kết quả “không tìm thấy cảnh báo” ở một nguồn không đủ để kết luận an toàn.</p><ul class="seo-checklist"><li><strong>Số điện thoại:</strong> tra cả 0xxx và +84, xem nội dung phản ánh và tự gọi lại kênh chính thức.</li><li><strong>Số tài khoản:</strong> đối chiếu ngân hàng, tên người nhận và dấu vết cảnh báo công khai.</li><li><strong>Link/website:</strong> đọc tên miền thật, kiểm tra link rút gọn, Punycode, HTTPS và yêu cầu tải file.</li><li><strong>Bối cảnh:</strong> cảnh giác khi bị thúc ép chuyển tiền, giữ bí mật, cung cấp OTP hoặc cài ứng dụng.</li></ul></section>`,
  "kiem-tra-link-gia-mao": `<section id="search-answer-link" data-seo-wave5="answer-first"><h2>Kiểm tra link lừa đảo trong 30 giây: nhìn gì trước khi bấm?</h2><p>Ưu tiên đọc <strong>tên miền đăng ký thật</strong>, không chỉ nhìn chữ thương hiệu xuất hiện trong URL. HTTPS và biểu tượng ổ khóa không chứng minh website hợp pháp. Với link yêu cầu đăng nhập, chuyển tiền, cài APK hoặc cấp quyền thiết bị, hãy tự mở ứng dụng/website chính thức thay vì tiếp tục từ link được gửi.</p><ol class="seo-checklist"><li>Dán URL vào công cụ phân tích trên trang này mà không mở trang đích.</li><li>Kiểm tra tên miền, Punycode, địa chỉ IP, cổng lạ, link rút gọn và đuôi file tải xuống.</li><li>Tìm exact-match hostname trên Google để đối chiếu cảnh báo và nguồn chính thức.</li><li>Nếu còn nghi ngờ, không đăng nhập hoặc thanh toán qua link đó.</li></ol></section>`,
};

function insertAfterLead(html, block) {
  const match = html.match(/<p class="lead">[\s\S]*?<\/p>/);
  if (!match) return html;
  return html.replace(match[0], `${match[0]}\n  ${block}`);
}

async function patchArticle(slug, { answer = true, quickLinks = false } = {}) {
  const file = path.join(PUBLIC, "kien-thuc", slug, "index.html");
  let html = await readFile(file, "utf8");
  const before = html;

  if (answer && ANSWERS[slug] && !html.includes(`id="${slug === "kiem-tra-so-dien-thoai-lua-dao" ? "search-answer-phone" : slug === "tra-cuu-so-tai-khoan-lua-dao" ? "search-answer-account" : slug === "tra-cuu-lua-dao" ? "search-answer-lookup" : "search-answer-link"}"`)) {
    html = insertAfterLead(html, ANSWERS[slug]);
  }

  if (quickLinks && !html.includes('id="google-discovery-wave5"')) {
    const related = '<section class="seo-related">';
    if (html.includes(related)) html = html.replace(related, `${QUICK_LINKS}\n${related}`);
    else html = html.replace('</main>', `${QUICK_LINKS}\n</main>`);
  }

  html = html.replace(/<meta property="article:modified_time" content="[^"]+" \/>/, `<meta property="article:modified_time" content="${UPDATED}" />`);
  html = html.replace(/"dateModified":"\d{4}-\d{2}-\d{2}"/g, `"dateModified":"${UPDATED}"`);

  if (html !== before) await writeFile(file, html, "utf8");
}

for (const slug of [
  "kiem-tra-so-dien-thoai-lua-dao",
  "tra-cuu-so-tai-khoan-lua-dao",
  "tra-cuu-lua-dao",
  "kiem-tra-link-gia-mao",
]) {
  await patchArticle(slug, { answer: true, quickLinks: true });
}

for (const slug of [
  "phong-chong-lua-dao-truc-tuyen",
  "an-toan-thong-tin-ca-nhan",
  "lua-dao-phat-nguoi-qua-sms",
  "lua-dao-hoan-tien-don-hang",
]) {
  await patchArticle(slug, { answer: false, quickLinks: true });
}

async function patchHub() {
  const file = path.join(PUBLIC, "kien-thuc", "index.html");
  let html = await readFile(file, "utf8");
  const before = html;
  if (!html.includes('id="google-priority-tools"')) {
    const block = `<section id="google-priority-tools" data-seo-wave5="hub-priority"><h2>Công cụ kiểm chứng được tìm nhiều</h2><p>Chọn đúng loại dữ kiện bạn đang có để kiểm tra trước khi gọi lại, chuyển tiền hoặc mở đường link. Các công cụ Cảnh Giác Số không tuyên bố một chủ thể an toàn chỉ vì chưa có cảnh báo.</p><div class="seo-grid"><a class="seo-card" href="/kien-thuc/kiem-tra-so-dien-thoai-lua-dao/"><small>TRA CỨU SỐ LẠ</small><h3>Kiểm tra số điện thoại lừa đảo</h3><p>Chuẩn hóa số, tạo truy vấn exact-match và kiểm tra dấu hiệu giả mạo.</p></a><a class="seo-card" href="/kien-thuc/tra-cuu-so-tai-khoan-lua-dao/"><small>TRƯỚC KHI CHUYỂN TIỀN</small><h3>Tra cứu số tài khoản lừa đảo</h3><p>Đối chiếu số tài khoản, ngân hàng, người nhận và dấu vết cảnh báo.</p></a><a class="seo-card" href="/kien-thuc/kiem-tra-link-gia-mao/"><small>TRƯỚC KHI BẤM</small><h3>Kiểm tra link lừa đảo</h3><p>Phân tích tên miền và các tín hiệu kỹ thuật mà không truy cập trang đích.</p></a><a class="seo-card" href="/kien-thuc/tra-cuu-lua-dao/"><small>KIỂM TRA TỔNG HỢP</small><h3>Tra cứu lừa đảo</h3><p>Kết hợp số điện thoại, tài khoản, link và bối cảnh giao dịch.</p></a></div></section>`;
    const firstSection = '<section>';
    if (html.includes(firstSection)) html = html.replace(firstSection, `${block}\n${firstSection}`);
    else html = html.replace('</main>', `${block}\n</main>`);
  }
  if (html !== before) await writeFile(file, html, "utf8");
}

await patchHub();

async function patchSitemap() {
  const file = path.join(PUBLIC, "sitemap.xml");
  let xml = await readFile(file, "utf8");
  const targets = [
    `${SITE}/kien-thuc/`,
    `${SITE}/kien-thuc/tra-cuu-lua-dao/`,
    `${SITE}/kien-thuc/kiem-tra-so-dien-thoai-lua-dao/`,
    `${SITE}/kien-thuc/tra-cuu-so-tai-khoan-lua-dao/`,
    `${SITE}/kien-thuc/kiem-tra-link-gia-mao/`,
  ];
  for (const url of targets) {
    const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const withLastmod = new RegExp(`(<loc>${escaped}<\\/loc>\\s*<lastmod>)[^<]+(<\\/lastmod>)`, "g");
    if (withLastmod.test(xml)) xml = xml.replace(withLastmod, `$1${UPDATED}$2`);
  }
  await writeFile(file, xml, "utf8");
}

await patchSitemap();
console.log("SEO Wave 5: strengthened priority Google search intents and crawl paths without adding new URLs.");
