import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public");
const SITE = "https://canhgiacso.com";
const UPDATED = "2026-09-23";
// Các trang liên hệ, quyền riêng tư và bảo mật được viết lại ngày 2026-10-02.
const PRIVACY_UPDATED = "2026-10-02";
const PRIVACY_EFFECTIVE_LABEL = "02/10/2026";
const GITHUB_REPO = "https://github.com/tanthanh381/canhgiacso";
const GITHUB_SECURITY_POLICY = `${GITHUB_REPO}/security/policy`;
const GITHUB_ISSUES = `${GITHUB_REPO}/issues`;
const OPERATOR = "IT Security Team - HDBank";
const SECURITY_TXT_EXPIRES = "2027-09-30T00:00:00Z";

const escapeHtml = (value) => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

// Kênh liên hệ chính thức do chủ dự án điền trong content/site-config.json; để trống thì không hiển thị gì.
async function loadSiteConfig() {
  let raw = {};
  try {
    raw = JSON.parse(await readFile(path.join(ROOT, "content", "site-config.json"), "utf8"));
  } catch (error) {
    if (error?.code !== "ENOENT") throw new Error(`content/site-config.json is invalid: ${error.message}`);
  }
  const text = (key) => (typeof raw[key] === "string" ? raw[key].trim() : "");
  const contactEmail = text("contactEmail");
  const contactFormUrl = text("contactFormUrl");
  const dataRegion = text("dataRegion");
  if (contactEmail && !/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(contactEmail)) {
    throw new Error("content/site-config.json: contactEmail is not a valid email address");
  }
  if (contactFormUrl && !/^https:\/\/[^\s"'<>]+$/.test(contactFormUrl)) {
    throw new Error("content/site-config.json: contactFormUrl must be an https:// URL");
  }
  if (dataRegion.length > 120) throw new Error("content/site-config.json: dataRegion is too long");
  return { contactEmail, contactFormUrl, dataRegion };
}

const SITE_CONFIG = await loadSiteConfig();
const BRAND = '<span class="seo-brand-logo" aria-hidden="true"></span><span class="seo-brand-divider" aria-hidden="true"></span><span class="seo-product-lockup"><strong>CẢNH GIÁC SỐ</strong><small>IT SECURITY</small></span>';
const THEME_INIT = '<script src="/theme-init.js"></script>';
const TRUST_NAV = '<nav class="seo-footer-links" aria-label="Thông tin website"><a href="/gioi-thieu/">Giới thiệu</a><a href="/chinh-sach-bien-tap/">Biên tập</a><a href="/phuong-phap-kiem-chung/">Kiểm chứng</a><a href="/lien-he/">Liên hệ</a><a href="/quyen-rieng-tu/">Quyền riêng tư</a><a href="/bao-mat/">Bảo mật</a><a href="/sitemap/">Sơ đồ nội dung</a></nav>';

async function write(relative, content) {
  const file = path.join(PUBLIC, relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content, "utf8");
}

function pageShell({ title, description, canonical, type, h1, eyebrow, lead, body, updated = UPDATED, extraHead = "" }) {
  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": type,
        "@id": `${canonical}#page`,
        url: canonical,
        name: h1,
        description,
        inLanguage: "vi-VN",
        dateModified: updated,
        isPartOf: { "@id": `${SITE}/#website` },
        about: { "@id": `${SITE}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${SITE}/#organization`,
        name: "Cảnh Giác Số",
        url: `${SITE}/`,
        description: "Nền tảng giáo dục an toàn số giúp nhận diện lừa đảo trực tuyến, xác minh thông tin và rèn kỹ năng phòng tránh rủi ro.",
        logo: { "@type": "ImageObject", url: `${SITE}/search-logo.svg`, width: 800, height: 800 },
        publishingPrinciples: `${SITE}/phuong-phap-kiem-chung/`,
        ethicsPolicy: `${SITE}/chinh-sach-bien-tap/`,
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "editorial and security contact",
          url: `${SITE}/lien-he/`,
          ...(SITE_CONFIG.contactEmail ? { email: SITE_CONFIG.contactEmail } : {}),
          availableLanguage: ["vi-VN"],
        },
        knowsAbout: ["lừa đảo trực tuyến", "phishing", "an toàn thông tin", "bảo vệ tài khoản", "xác minh thông tin"],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE}/#website`,
        url: `${SITE}/`,
        name: "Cảnh Giác Số",
        inLanguage: "vi-VN",
        publisher: { "@id": `${SITE}/#organization` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Cảnh Giác Số", item: `${SITE}/` },
          { "@type": "ListItem", position: 2, name: h1, item: canonical },
        ],
      },
    ],
  });

  return `<!doctype html>
<html lang="vi-VN">
<head>
  ${THEME_INIT}
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="referrer" content="strict-origin-when-cross-origin" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
  <link rel="canonical" href="${canonical}" />
  <link rel="alternate" hreflang="vi-VN" href="${canonical}" />
  <link rel="alternate" hreflang="x-default" href="${canonical}" />
  <link rel="stylesheet" href="/seo.css" />${extraHead}
  <link rel="icon" type="image/png" sizes="96x96" href="/favicon.png" />
  <link rel="apple-touch-icon" href="/favicon.png" />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="vi_VN" />
  <meta property="og:site_name" content="Cảnh Giác Số" />
  <meta property="og:title" content="${title.replace(" | Cảnh Giác Số", "")}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="${SITE}/og.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title.replace(" | Cảnh Giác Số", "")}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${SITE}/og.png" />
  <script type="application/ld+json">${schema}</script>
</head>
<body>
<header class="seo-header"><div class="seo-shell seo-nav"><a class="seo-brand" href="/">${BRAND}</a><nav class="seo-nav-links" aria-label="Điều hướng"><a href="/">Thử thách</a><a href="/kien-thuc/">Cẩm nang</a></nav></div></header>
<main class="seo-article">
  <div class="seo-breadcrumb"><a href="/">Cảnh Giác Số</a> › ${h1}</div>
  <span class="seo-eyebrow">${eyebrow}</span>
  <h1>${h1}</h1>
  <p class="lead">${lead}</p>
  ${body}
  <section class="seo-related"><h2>Tiếp tục khám phá</h2><ul><li><a href="/kien-thuc/">Cẩm nang chống lừa đảo</a></li><li><a href="/phuong-phap-kiem-chung/">Phương pháp kiểm chứng & nguyên tắc biên tập</a></li><li><a href="/">Thử thách Cảnh Giác Số</a></li></ul></section>
</main>
<footer class="seo-footer"><div class="seo-shell"><strong>Cảnh Giác Số</strong>${TRUST_NAV}<p class="seo-safety">Nội dung phục vụ giáo dục và nâng cao nhận thức an toàn thông tin.</p></div></footer>
</body>
</html>`;
}

const about = pageShell({
  title: "Giới thiệu Cảnh Giác Số | Chống lừa đảo & an toàn số",
  description: "Tìm hiểu mục tiêu, phạm vi nội dung, cách Cảnh Giác Số xây dựng cẩm nang chống lừa đảo và nguyên tắc giúp người dùng xác minh thông tin an toàn.",
  canonical: `${SITE}/gioi-thieu/`,
  type: "AboutPage",
  h1: "Giới thiệu Cảnh Giác Số",
  eyebrow: "VỀ CẢNH GIÁC SỐ",
  lead: "Cảnh Giác Số là nền tảng giáo dục an toàn số, tập trung giúp người dùng nhận diện dấu hiệu lừa đảo, xác minh thông tin độc lập và chọn hành động an toàn trước khi chuyển tiền, đăng nhập, cài ứng dụng hoặc chia sẻ dữ liệu.",
  body: `
<section class="about-hero" aria-label="Hoạt hình giới thiệu Cảnh Giác Số"><div class="about-hero-frame"><iframe src="/gioi-thieu/hoat-hinh.html" title="Hoạt hình giới thiệu Cảnh Giác Số: các chiêu lừa đảo thường gặp và 4 nguyên tắc Dừng lại, Kiểm tra, Xác minh, Báo cáo"></iframe></div><div class="about-hero-actions"><a class="about-hero-cta" href="/">Bắt đầu thử thách</a><button type="button" class="about-hero-toggle" data-about-anim-toggle hidden>Tạm dừng</button><small>Hoạt hình tự lặp lại; bạn có thể tạm dừng bất cứ lúc nào.</small></div></section>
<script src="/about-hero.js" defer></script>
<section><h2>Website này giúp bạn làm gì?</h2><p>Nội dung được tổ chức theo các tình huống người dùng thường gặp: cuộc gọi mạo danh, phishing, website giả, lừa đảo ngân hàng, QR, OTP, deepfake, tuyển dụng, đầu tư và yêu cầu chuyển tiền khẩn cấp. Mỗi hướng dẫn ưu tiên các bước có thể thực hiện ngay thay vì chỉ mô tả thủ đoạn.</p></section>
<section><h2>Nguyên tắc cốt lõi: Dừng — Kiểm tra — Xác minh — Báo cáo</h2><p>Khi có dấu hiệu bất thường, người dùng không cần tiếp tục tương tác để “thử xem có lừa đảo hay không”. Hướng dẫn mặc định là dừng thao tác có rủi ro, tự tìm kênh chính thức, xác minh qua nguồn độc lập và báo cáo khi có căn cứ phù hợp.</p></section>
<section><h2>Nội dung được xây dựng và cập nhật như thế nào?</h2><p>Cảnh Giác Số ưu tiên nguồn từ cơ quan có thẩm quyền, tổ chức an ninh mạng, ngân hàng, nhà cung cấp dịch vụ và báo chí có danh tính rõ ràng. Các bài viết được gắn nguồn theo chủ đề, cập nhật khi thủ đoạn thay đổi và phân biệt rõ tín hiệu rủi ro với kết luận. Xem chi tiết tại <a href="/phuong-phap-kiem-chung/">phương pháp kiểm chứng & nguyên tắc biên tập</a>.</p></section>
<section><h2>Phạm vi và giới hạn</h2><p>Cảnh Giác Số phục vụ giáo dục, tra cứu và nâng cao nhận thức. Nội dung không thay thế xác minh trực tiếp từ ngân hàng, cơ quan chức năng hoặc tổ chức có thẩm quyền trong từng vụ việc. Khi đã xảy ra thiệt hại tài chính hoặc mất quyền kiểm soát tài khoản, hãy ưu tiên khóa tài khoản, liên hệ đơn vị liên quan và lưu bằng chứng.</p></section>`,
});

const dataRegionText = SITE_CONFIG.dataRegion ? escapeHtml(SITE_CONFIG.dataRegion) : "theo cấu hình dự án, sẽ công bố";

const STORAGE_ROWS = [
  { name: "cgs-consent-v1", kind: "localStorage · cần thiết", purpose: "Ghi nhớ bạn đã chấp nhận hay từ chối thống kê truy cập.", ttl: "12 tháng, sau đó hỏi lại (hoặc khi chính sách đổi phiên bản).", provider: "Cảnh Giác Số" },
  { name: "khien-so-theme", kind: "localStorage · chức năng", purpose: "Ghi nhớ chế độ giao diện sáng hoặc tối.", ttl: "Đến khi bạn xóa dữ liệu trình duyệt.", provider: "Cảnh Giác Số" },
  { name: "khien-so-progress:guest (và khien-so-progress bản cũ)", kind: "localStorage · chức năng", purpose: "Lưu tiến trình thử thách của khách trên thiết bị: số dư, điểm cảnh giác, kết quả từng tình huống và tên người chơi nếu bạn nhập.", ttl: "Đến khi bạn xóa dữ liệu trình duyệt.", provider: "Cảnh Giác Số" },
  { name: "canh-giac-so-guest-certificate", kind: "localStorage · chức năng", purpose: "Giữ chứng chỉ khách (tên hiển thị bạn nhập, điểm, mã chứng chỉ) để tải lại.", ttl: "Đến khi bạn làm lại thử thách hoặc xóa dữ liệu trình duyệt.", provider: "Cảnh Giác Số" },
  { name: "khien-so-pending:<mã tài khoản>", kind: "localStorage · cần thiết", purpose: "Giữ tạm câu trả lời chưa đồng bộ được của tài khoản đã đăng nhập.", ttl: "Đến khi đồng bộ thành công.", provider: "Cảnh Giác Số" },
  { name: "canh-giac-so-security-checklist", kind: "localStorage · chức năng", purpose: "Ghi nhớ các mục bạn đã đánh dấu trong danh sách kiểm tra bảo mật.", ttl: "Đến khi bạn xóa dữ liệu trình duyệt.", provider: "Cảnh Giác Số" },
  { name: "canhgiacso:simulation-banner-dismissed", kind: "localStorage · chức năng", purpose: "Ghi nhớ bạn đã đóng thông báo cho biết đây là môi trường mô phỏng.", ttl: "Đến khi bạn khôi phục thông báo hoặc xóa dữ liệu trình duyệt.", provider: "Cảnh Giác Số" },
  { name: "sb-…-auth-token", kind: "localStorage · cần thiết (chỉ khi đăng nhập)", purpose: "Giữ phiên đăng nhập tài khoản.", ttl: "Theo thời hạn phiên và tự làm mới; bị xóa khi bạn đăng xuất.", provider: "Supabase (dịch vụ xác thực)" },
  { name: "canhgiacso-analytics-visitor-v1", kind: "localStorage · phân tích (cần đồng ý)", purpose: "Mã ngẫu nhiên ẩn danh để thống kê nội bộ phân biệt khách mới và khách quay lại.", ttl: "90 ngày kể từ khi tạo.", provider: "Cảnh Giác Số" },
  { name: "canhgiacso-analytics-session-v2", kind: "localStorage · phân tích (cần đồng ý)", purpose: "Mã phiên truy cập và thời điểm hoạt động gần nhất.", ttl: "Phiên hết hiệu lực sau 30 phút không hoạt động.", provider: "Cảnh Giác Số" },
  { name: "_ga", kind: "Cookie · phân tích (cần đồng ý)", purpose: "Google Analytics 4 dùng để phân biệt người dùng ở mức ẩn danh.", ttl: "13 tháng.", provider: "Google" },
  { name: "_ga_HH04Q7FYHM", kind: "Cookie · phân tích (cần đồng ý)", purpose: "Google Analytics 4 dùng để duy trì trạng thái phiên (dạng _ga_<mã đo lường>).", ttl: "13 tháng.", provider: "Google" },
];

const storageTable = `<div class="cgs-table-wrap"><table class="cgs-data-table"><caption>Cookie và dữ liệu lưu cục bộ trên trình duyệt của bạn</caption><thead><tr><th scope="col">Tên</th><th scope="col">Loại</th><th scope="col">Mục đích</th><th scope="col">Thời hạn</th><th scope="col">Bên cung cấp</th></tr></thead><tbody>${STORAGE_ROWS.map((row) => `<tr><th scope="row" data-label="Tên"><code>${escapeHtml(row.name)}</code></th><td data-label="Loại">${escapeHtml(row.kind)}</td><td data-label="Mục đích">${escapeHtml(row.purpose)}</td><td data-label="Thời hạn">${escapeHtml(row.ttl)}</td><td data-label="Bên cung cấp">${escapeHtml(row.provider)}</td></tr>`).join("")}</tbody></table></div>`;

const privacy = pageShell({
  title: "Quyền riêng tư & dữ liệu người dùng | Cảnh Giác Số",
  description: "Cảnh Giác Số thu thập dữ liệu gì, dùng để làm gì, lưu bao lâu, đặt cookie nào và cách bạn thực hiện quyền của mình; thống kê chỉ bật khi bạn đồng ý.",
  canonical: `${SITE}/quyen-rieng-tu/`,
  type: "WebPage",
  h1: "Quyền riêng tư & dữ liệu người dùng",
  eyebrow: "MINH BẠCH DỮ LIỆU",
  updated: PRIVACY_UPDATED,
  extraHead: '\n  <link rel="stylesheet" href="/consent.css" />',
  lead: "Cảnh Giác Số được thiết kế để giảm lượng dữ liệu cần thu thập và không yêu cầu bạn nhập OTP, PIN, CVV, mã khôi phục hoặc mật khẩu ngân hàng vào các công cụ tra cứu hay bài thực hành.",
  body: `
<p class="seo-note"><strong>Ngày hiệu lực: ${PRIVACY_EFFECTIVE_LABEL}.</strong> Trang này mô tả cách website hoạt động về mặt kỹ thuật: dữ liệu nào được xử lý, vì sao, lưu bao lâu và bạn có thể làm gì. Thống kê truy cập (Google Analytics 4 và thống kê nội bộ) chỉ chạy sau khi bạn chấp nhận trong banner cookie.</p>
<section id="don-vi-van-hanh"><h2>Đơn vị vận hành</h2><p>Website được quản lý và vận hành bởi ${OPERATOR}. Đây là đơn vị quyết định mục đích sử dụng dữ liệu được mô tả trong trang này và tiếp nhận yêu cầu của bạn qua các kênh tại trang <a href="/lien-he/">Liên hệ</a>.</p></section>
<section id="muc-dich-co-so"><h2>Mục đích và cơ sở xử lý</h2>
<ul>
<li><strong>Thống kê truy cập</strong> (đo lượt xem, nguồn truy cập, thiết bị để cải thiện nội dung): dựa trên <strong>sự đồng ý của bạn</strong>. Bạn có thể từ chối ngay ở banner hoặc rút lại bất cứ lúc nào; từ chối không làm mất tính năng nào của website.</li>
<li><strong>Cung cấp tài khoản và tiến trình học</strong> (đăng nhập, lưu kết quả, cấp chứng chỉ): cần thiết để cung cấp tính năng mà bạn chủ động sử dụng khi đăng ký tài khoản.</li>
<li><strong>Bảo vệ hệ thống khỏi lạm dụng</strong> (giới hạn tốc độ yêu cầu): cần thiết để giữ dịch vụ ổn định và an toàn cho mọi người.</li>
</ul></section>
<section id="du-lieu-xu-ly"><h2>Dữ liệu được xử lý</h2>
<h3>Khách truy cập (không đăng nhập)</h3>
<p>Bạn dùng được thử thách, cẩm nang và công cụ tra cứu mà không cần tài khoản. Tiến trình, tên người chơi (nếu bạn nhập) và chứng chỉ khách được lưu <strong>ngay trên thiết bị của bạn</strong> (xem bảng bên dưới). Khi bạn chọn đáp án trong thử thách, trình duyệt gửi mã tình huống và lựa chọn tới máy chủ để chấm điểm; yêu cầu này không kèm tên hay email.</p>
<h3>Tài khoản và tiến trình</h3>
<p>Nếu đăng ký, hệ thống lưu email, tên đăng nhập, tên hiển thị, kết quả từng tình huống, điểm, lượt chơi và chứng chỉ đã cấp (tên hiển thị, mã chứng chỉ, điểm, xếp loại, ngày cấp). Mật khẩu do dịch vụ xác thực Supabase xử lý và không được lưu dưới dạng đọc được. Dữ liệu này tách khỏi thống kê truy cập và được kiểm soát bằng cơ chế phân quyền của hệ thống.</p>
<h3>Thống kê nội bộ (chỉ sau khi bạn đồng ý)</h3>
<p>Gồm mã khách và mã phiên ngẫu nhiên ẩn danh, đường dẫn trang, tên miền nguồn giới thiệu, nhãn trình duyệt, hệ điều hành, loại thiết bị, mã quốc gia ước tính từ múi giờ và ngôn ngữ (không dùng GPS hay tra cứu địa chỉ IP), các tham số UTM được cho phép (nguồn, phương tiện, chiến dịch) và loại sự kiện (lượt xem trang, nhịp hoạt động mỗi 60 giây). Không lưu user-agent thô, email hay mã tài khoản trong dữ liệu thống kê. Trước khi bạn đồng ý, mã khách và mã phiên không được tạo và không có yêu cầu thống kê nào được gửi đi.</p>
<h3>Google Analytics 4 (chỉ sau khi bạn đồng ý)</h3>
<p>Khi bạn chấp nhận, website nạp Google Analytics 4 theo Consent Mode v2: chỉ <code>analytics_storage</code> được bật, còn các quyền quảng cáo (<code>ad_storage</code>, <code>ad_user_data</code>, <code>ad_personalization</code>) luôn bị từ chối; tín hiệu Google và cá nhân hóa quảng cáo được tắt. Google xử lý dữ liệu kỹ thuật theo chính sách của Google. Trước khi bạn đồng ý, trình duyệt không tải mã Google và không đặt cookie <code>_ga</code>. Dashboard Quản trị nội bộ dùng dữ liệu thống kê nội bộ làm nguồn chính và không đọc trực tiếp Google Analytics Data API.</p>
<h3>Giới hạn tốc độ và an ninh</h3>
<p>Mỗi yêu cầu tới máy chủ dữ liệu được kiểm soát tần suất để chống lạm dụng. Địa chỉ IP được băm có muối và chỉ giữ tối đa 24 giờ, chỉ để phục vụ việc giới hạn tốc độ này.</p>
<h3>Công cụ tra cứu</h3>
<p>Các công cụ kiểm tra URL, tin nhắn và hướng dẫn tra cứu ưu tiên xử lý cục bộ trên trình duyệt. Không nhập mật khẩu, OTP, PIN, CVV, mã khôi phục hoặc thông tin đăng nhập ngân hàng vào ô tra cứu.</p>
<h3>Giới hạn của dữ liệu thống kê</h3>
<p>Referrer có thể bị trình duyệt, ứng dụng hoặc cơ chế riêng tư lược bỏ; dữ liệu quốc gia chỉ là ước tính kỹ thuật từ múi giờ và ngôn ngữ, không phải vị trí chính xác. Các số liệu nguồn truy cập và vị trí không nên được hiểu là dữ liệu định danh.</p>
</section>
<section id="cookie"><h2>Cookie và lưu trữ cục bộ</h2>
<p>Cảnh Giác Số chỉ đặt hai cookie (<code>_ga</code> và <code>_ga_HH04Q7FYHM</code>) và chỉ sau khi bạn chấp nhận thống kê truy cập. Phần còn lại là dữ liệu lưu trong bộ nhớ cục bộ của trình duyệt (localStorage) và không tự gửi đi theo mỗi yêu cầu như cookie.</p>
${storageTable}
<p><a href="#cookie" data-cgs-consent-open>Mở Cài đặt cookie</a> để chấp nhận, từ chối hoặc rút lại thống kê truy cập bất cứ lúc nào; liên kết "Cài đặt cookie" cũng có ở cuối mỗi trang. Khi rút lại, cookie <code>_ga*</code> và hai khóa thống kê nội bộ trên thiết bị này bị xóa và bộ đếm dừng ngay. Nếu trình duyệt gửi tín hiệu Global Privacy Control hoặc Không theo dõi (DNT), chúng tôi coi đó là từ chối cho đến khi bạn tự chọn khác. Bạn cũng có thể xóa dữ liệu trang web trong phần cài đặt của trình duyệt.</p>
</section>
<section id="thoi-han-luu"><h2>Thời hạn lưu</h2>
<ul>
<li><strong>Thống kê nội bộ:</strong> 13 tháng.</li>
<li><strong>Tài khoản và tiến trình:</strong> đến khi tài khoản bị xóa.</li>
<li><strong>Dữ liệu giới hạn tốc độ (IP băm có muối):</strong> tối đa 24 giờ.</li>
<li><strong>Google Analytics 4:</strong> theo thiết lập thời hạn lưu giữ dữ liệu của thuộc tính Google Analytics mà dự án cấu hình; cookie của Google có thời hạn 13 tháng như bảng trên.</li>
<li><strong>Dữ liệu trên thiết bị của bạn:</strong> theo cột "Thời hạn" trong bảng cookie và lưu trữ cục bộ.</li>
</ul></section>
<section id="quyen-cua-ban"><h2>Quyền của bạn và cách thực hiện</h2>
<p>Bạn có quyền truy cập, chỉnh sửa, xóa dữ liệu cá nhân của mình, rút lại sự đồng ý và phản đối việc xử lý.</p>
<ul>
<li><strong>Rút lại đồng ý thống kê:</strong> thực hiện ngay bằng "Cài đặt cookie" ở cuối trang.</li>
<li><strong>Xóa dữ liệu trên thiết bị:</strong> xóa dữ liệu trang web trong cài đặt trình duyệt.</li>
<li><strong>Truy cập, chỉnh sửa, xóa dữ liệu tài khoản và phản đối xử lý:</strong> gửi yêu cầu qua các kênh tại trang <a href="/lien-he/">Liên hệ</a>, nêu rõ tên đăng nhập hoặc email của tài khoản. Chúng tôi có thể cần xác minh danh tính hợp lý trước khi xử lý. Vui lòng không đăng thông tin cá nhân vào kênh công khai.</li>
</ul></section>
<section id="chuyen-du-lieu"><h2>Chuyển dữ liệu ra nước ngoài và bên xử lý</h2>
<ul>
<li><strong>Google (Google Analytics 4):</strong> chỉ khi bạn đồng ý; Google có thể xử lý dữ liệu tại các trung tâm dữ liệu ngoài Việt Nam.</li>
<li><strong>Supabase (cơ sở dữ liệu và xác thực):</strong> lưu dữ liệu tài khoản, tiến trình, chứng chỉ và thống kê nội bộ. Vùng đặt dữ liệu: ${dataRegionText}.</li>
<li><strong>GitHub Pages (lưu trữ trang tĩnh):</strong> như mọi dịch vụ lưu trữ web, đơn vị lưu trữ tiếp nhận địa chỉ IP của bạn khi bạn tải trang theo chính sách của họ.</li>
</ul></section>
<section id="tre-em"><h2>Trẻ em</h2><p>Website nhằm giáo dục cộng đồng và không chủ ý thu thập dữ liệu của trẻ em. Trẻ em nên dùng website cùng cha mẹ hoặc người giám hộ. Nếu bạn là cha mẹ hoặc người giám hộ và biết con đã tạo tài khoản, hãy liên hệ để yêu cầu xóa.</p></section>
<section id="thay-doi"><h2>Thay đổi chính sách</h2><p>Khi thay đổi đáng kể (ví dụ thêm loại cookie hoặc mục đích mới), chúng tôi cập nhật trang này và đổi ngày hiệu lực ở đầu trang; với thay đổi liên quan đến thống kê, banner cookie sẽ hỏi lại bạn. Ngày hiệu lực hiện tại: ${PRIVACY_EFFECTIVE_LABEL}.</p></section>
<section id="lien-he-du-lieu"><h2>Liên hệ về dữ liệu cá nhân</h2><p>Mọi câu hỏi hoặc yêu cầu về dữ liệu cá nhân gửi tới ${OPERATOR} qua các kênh tại trang <a href="/lien-he/">Liên hệ</a>.${SITE_CONFIG.contactEmail ? ` Email: <a href="mailto:${escapeHtml(SITE_CONFIG.contactEmail)}">${escapeHtml(SITE_CONFIG.contactEmail)}</a>.` : ""}</p></section>`,
});

const editorial = pageShell({
  title: "Chính sách biên tập | Cảnh Giác Số",
  description: "Nguyên tắc biên tập, rà soát nguồn, sửa sai và tách biệt tín hiệu rủi ro với kết luận khi Cảnh Giác Số viết về lừa đảo trực tuyến.",
  canonical: `${SITE}/chinh-sach-bien-tap/`,
  type: "WebPage",
  h1: "Chính sách biên tập",
  eyebrow: "EDITORIAL POLICY",
  lead: "Cảnh Giác Số biên tập nội dung chống lừa đảo theo hướng thực hành, minh bạch nguồn và thận trọng với mọi kết luận có thể ảnh hưởng đến cá nhân hoặc tổ chức cụ thể.",
  body: `
<section><h2>Ưu tiên nguồn chính thức</h2><p>Khi viết về thủ đoạn, quy trình xử lý hoặc cảnh báo mới, nội dung ưu tiên nguồn từ cơ quan nhà nước, cơ quan công an, tổ chức an ninh mạng, ngân hàng, nhà cung cấp dịch vụ và báo chí có danh tính rõ ràng.</p></section>
<section><h2>Không biến tín hiệu thành kết luận tuyệt đối</h2><p>Một số điện thoại, tài khoản, website hoặc mẫu tin nhắn có thể mang nhiều tín hiệu rủi ro, nhưng Cảnh Giác Số tránh kết luận chắc chắn về một chủ thể nếu chưa có căn cứ phù hợp. Các công cụ và bài viết hướng người dùng tới hành động an toàn và xác minh độc lập.</p></section>
<section><h2>Sửa sai và cập nhật</h2><p>Khi nguồn thay đổi, liên kết hỏng hoặc thông tin không còn phù hợp, nội dung cần được rà soát và cập nhật. Những thay đổi quan trọng về hướng dẫn an toàn được ưu tiên hơn chỉnh sửa câu chữ nhỏ.</p></section>
<section><h2>Tác giả và người rà soát</h2><p>Nội dung công khai được ghi nhận dưới thực thể biên tập Cảnh Giác Số / IT Security. Với bài viết nhạy cảm, structured data dùng Organization làm author/publisher để tránh gán thẩm quyền cá nhân không cần thiết và giữ trách nhiệm ở cấp hệ thống biên tập.</p></section>`,
});

const contactChannels = [
  SITE_CONFIG.contactEmail ? `<li><strong>Email:</strong> <a href="mailto:${escapeHtml(SITE_CONFIG.contactEmail)}">${escapeHtml(SITE_CONFIG.contactEmail)}</a></li>` : "",
  SITE_CONFIG.contactFormUrl ? `<li><strong>Biểu mẫu liên hệ:</strong> <a href="${escapeHtml(SITE_CONFIG.contactFormUrl)}" rel="noopener noreferrer">Mở biểu mẫu</a></li>` : "",
].filter(Boolean);
const directContact = contactChannels.length
  ? `\n<section id="lien-he-truc-tiep"><h2>Liên hệ trực tiếp ${OPERATOR}</h2><ul>${contactChannels.join("")}</ul><p>Hãy nêu rõ chủ đề (góp ý nội dung, lỗi kỹ thuật hoặc yêu cầu về dữ liệu cá nhân) và không kèm mật khẩu, OTP hay dữ liệu ngân hàng thật.</p></section>`
  : "";

const contact = pageShell({
  title: "Liên hệ | Cảnh Giác Số",
  description: "Cách liên hệ Cảnh Giác Số về góp ý nội dung, báo lỗi kỹ thuật, yêu cầu sửa thông tin hoặc vấn đề bảo mật của website.",
  canonical: `${SITE}/lien-he/`,
  type: "ContactPage",
  h1: "Liên hệ Cảnh Giác Số",
  eyebrow: "CONTACT",
  updated: PRIVACY_UPDATED,
  lead: "Nếu cần góp ý nội dung, báo lỗi kỹ thuật hoặc phản ánh vấn đề bảo mật của website, hãy chuẩn bị đường dẫn trang, mô tả ngắn và bằng chứng có thể đối chiếu.",
  body: `${directContact}
<section id="gop-y-noi-dung"><h2>Góp ý nội dung</h2><p>Với yêu cầu chỉnh sửa, bổ sung nguồn hoặc báo nội dung đã lỗi thời, hãy nêu rõ URL, đoạn cần kiểm tra và nguồn mới nếu có. Cảnh Giác Số ưu tiên các phản hồi có thể xác minh độc lập. Bạn có thể mở một <a href="${GITHUB_ISSUES}" rel="noopener noreferrer">Issue trên GitHub</a>.</p></section>
<section id="bao-loi-bao-mat"><h2>Báo lỗi kỹ thuật hoặc bảo mật</h2><p>Không gửi mật khẩu, OTP, mã khôi phục, số thẻ hoặc dữ liệu ngân hàng thật. Với lỗi bảo mật, vui lòng mô tả tác động, bước tái hiện ở mức cần thiết và tránh khai thác vượt quá phạm vi chứng minh.</p>
<ul>
<li><strong>Lỗ hổng bảo mật:</strong> báo riêng tư qua <a href="${GITHUB_SECURITY_POLICY}" rel="noopener noreferrer">chính sách bảo mật và Security Advisory trên GitHub</a>. Không đăng công khai chi tiết có thể bị khai thác trước khi lỗi được khắc phục. Thông tin kỹ thuật có tại <a href="/security.txt">security.txt</a>.</li>
<li><strong>Lỗi hiển thị, nội dung sai hoặc sự cố không nhạy cảm:</strong> mở <a href="${GITHUB_ISSUES}" rel="noopener noreferrer">Issue trên GitHub</a>. Issue là công khai, vì vậy đừng kèm thông tin cá nhân, thông tin đăng nhập hay dữ liệu tài khoản.</li>
</ul></section>
<section id="du-lieu-ca-nhan"><h2>Yêu cầu về dữ liệu cá nhân</h2><p>Quyền truy cập, chỉnh sửa, xóa dữ liệu và phản đối xử lý được mô tả tại <a href="/quyen-rieng-tu/#quyen-cua-ban">quyền riêng tư và dữ liệu người dùng</a>. Hãy ghi rõ tên đăng nhập hoặc email của tài khoản và không đăng thông tin cá nhân vào kênh công khai. Riêng việc rút lại đồng ý thống kê, bạn tự thực hiện ngay bằng liên kết "Cài đặt cookie" ở cuối trang.</p></section>
<section id="nan-nhan"><h2>Khi bạn đang là nạn nhân</h2><p>Nếu đã chuyển tiền, mất tài khoản hoặc bị đe dọa, hãy ưu tiên liên hệ ngân hàng/nền tảng/cơ quan chức năng qua kênh chính thức. Cảnh Giác Số không thay thế quy trình tiếp nhận tố giác hoặc hỗ trợ khẩn cấp của các đơn vị đó.</p></section>`,
});

const security = pageShell({
  title: "Bảo mật website | Cảnh Giác Số",
  description: "Tín hiệu bảo mật, giới hạn thu thập dữ liệu, nguyên tắc báo lỗi và cách Cảnh Giác Số giảm rủi ro khi cung cấp công cụ chống lừa đảo.",
  canonical: `${SITE}/bao-mat/`,
  type: "WebPage",
  h1: "Bảo mật website",
  eyebrow: "SECURITY",
  updated: PRIVACY_UPDATED,
  lead: "Cảnh Giác Số xử lý chủ đề chống lừa đảo nên ưu tiên giảm dữ liệu nhạy cảm, minh bạch về analytics và tách công cụ tra cứu khỏi yêu cầu nhập bí mật cá nhân.",
  body: `
<section><h2>Không yêu cầu bí mật đăng nhập</h2><p>Website không yêu cầu nhập OTP, PIN, CVV, mật khẩu ngân hàng hoặc mã khôi phục vào nội dung công cụ tra cứu. Nếu một trang yêu cầu các dữ liệu này, hãy rời khỏi trang và tự mở kênh chính thức của tổ chức liên quan.</p></section>
<section><h2>Analytics và quyền riêng tư</h2><p>Thống kê truy cập (first-party và Google Analytics 4) chỉ chạy sau khi bạn chấp nhận trong banner cookie và chỉ phục vụ thống kê ở cấp tổng hợp như đường dẫn, referrer host, thiết bị và UTM allowlist. Bạn có thể từ chối hoặc rút lại bất cứ lúc nào. Xem thêm <a href="/quyen-rieng-tu/">quyền riêng tư & dữ liệu người dùng</a>.</p></section>
<section id="bao-cao-lo-hong"><h2>Báo cáo lỗ hổng</h2><p>Khi phát hiện lỗi bảo mật, hãy báo cáo theo nguyên tắc tối thiểu hóa dữ liệu: không truy cập, tải xuống hoặc chia sẻ dữ liệu không thuộc về bạn; chỉ cung cấp thông tin đủ để đội vận hành xác minh và khắc phục. Gửi báo cáo riêng tư qua <a href="${GITHUB_SECURITY_POLICY}" rel="noopener noreferrer">chính sách bảo mật và Security Advisory trên GitHub</a>; các kênh khác có tại trang <a href="/lien-he/">Liên hệ</a>.</p></section>
<section><h2>Tài nguyên bảo mật công khai</h2><p>Website có tệp <a href="/security.txt">security.txt</a> (theo RFC 9116) nêu kênh báo cáo kỹ thuật và chính sách tiếp nhận.</p></section>`,
});

await write("gioi-thieu/index.html", about);
await write("quyen-rieng-tu/index.html", privacy);
await write("chinh-sach-bien-tap/index.html", editorial);
await write("lien-he/index.html", contact);
await write("bao-mat/index.html", security);

// security.txt (RFC 9116) được sinh từ cấu hình để Contact mailto: chỉ xuất hiện khi chủ dự án đã điền email.
const securityTxt = [
  `Contact: ${GITHUB_SECURITY_POLICY}`,
  ...(SITE_CONFIG.contactEmail ? [`Contact: mailto:${SITE_CONFIG.contactEmail}`] : []),
  `Expires: ${SECURITY_TXT_EXPIRES}`,
  "Preferred-Languages: vi, en",
  `Canonical: ${SITE}/security.txt`,
  `Policy: ${GITHUB_SECURITY_POLICY}`,
  "",
].join("\n");
await writeFile(path.join(PUBLIC, "security.txt"), securityTxt, "utf8");

async function htmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await htmlFiles(full));
    else if (entry.name === "index.html") out.push(full);
  }
  return out;
}

function ensureLegacyArticleSeo(html, slug) {
  const canonical = `${SITE}/kien-thuc/${slug}/`;
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
  const description = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1]?.trim() ?? "";
  const ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/i)?.[1]?.trim() || title;
  const ogDescription = html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i)?.[1]?.trim() || description;
  const ogImage = html.match(/<meta\s+property="og:image"\s+content="([^"]*)"/i)?.[1]?.trim() || `${SITE}/og.png`;

  if (!/hreflang="vi-VN"/i.test(html)) {
    html = html.replace(
      /(<link rel="canonical" href="[^"]+"\s*\/>)/i,
      `$1\n  <link rel="alternate" hreflang="vi-VN" href="${canonical}" />`,
    );
  }
  if (!/hreflang="x-default"/i.test(html)) {
    const vi = `<link rel="alternate" hreflang="vi-VN" href="${canonical}" />`;
    html = html.replace(vi, `${vi}\n  <link rel="alternate" hreflang="x-default" href="${canonical}" />`);
  }
  if (!/property="og:site_name"/i.test(html)) {
    html = html.replace(
      /(<meta property="og:locale" content="[^"]*"\s*\/>)/i,
      `$1\n  <meta property="og:site_name" content="Cảnh Giác Số" />`,
    );
  }
  if (!/name="twitter:card"/i.test(html)) {
    const twitter = `  <meta name="twitter:card" content="summary_large_image" />\n  <meta name="twitter:title" content="${ogTitle.replaceAll('"', "&quot;")}" />\n  <meta name="twitter:description" content="${ogDescription.replaceAll('"', "&quot;")}" />\n  <meta name="twitter:image" content="${ogImage}" />\n`;
    html = html.replace(/(<script type="application\/ld\+json">)/i, `${twitter}$1`);
  }

  html = html.replace(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/i,
    (full, raw) => {
      try {
        const schema = JSON.parse(raw);
        const graph = Array.isArray(schema?.["@graph"]) ? schema["@graph"] : [];
        const article = graph.find((node) => node?.["@type"] === "Article");
        if (!article) return full;

        article["@id"] ||= `${canonical}#article`;
        article.mainEntityOfPage = { "@type": "WebPage", "@id": canonical };
        article.image ||= { "@type": "ImageObject", url: ogImage, width: 1731, height: 909 };
        article.author = { "@id": `${SITE}/#organization` };
        article.publisher = { "@id": `${SITE}/#organization` };

        const organization = graph.find((node) => node?.["@type"] === "Organization");
        if (organization) {
          organization["@id"] ||= `${SITE}/#organization`;
          organization.url ||= `${SITE}/`;
          organization.logo = { "@type": "ImageObject", url: `${SITE}/search-logo.svg`, width: 800, height: 800 };
          organization.publishingPrinciples ||= `${SITE}/phuong-phap-kiem-chung/`;
        } else {
          graph.push({
            "@type": "Organization",
            "@id": `${SITE}/#organization`,
            name: "Cảnh Giác Số",
            url: `${SITE}/`,
            logo: { "@type": "ImageObject", url: `${SITE}/search-logo.svg`, width: 800, height: 800 },
            publishingPrinciples: `${SITE}/phuong-phap-kiem-chung/`,
          });
        }

        if (!graph.some((node) => node?.["@type"] === "WebSite")) {
          graph.push({ "@type": "WebSite", "@id": `${SITE}/#website`, url: `${SITE}/`, name: "Cảnh Giác Số", inLanguage: "vi-VN" });
        }
        if (!graph.some((node) => node?.["@type"] === "BreadcrumbList")) {
          graph.push({
            "@type": "BreadcrumbList",
            "@id": `${canonical}#breadcrumb`,
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Cảnh Giác Số", item: `${SITE}/` },
              { "@type": "ListItem", position: 2, name: "Kiến thức", item: `${SITE}/kien-thuc/` },
              { "@type": "ListItem", position: 3, name: title, item: canonical },
            ],
          });
        }
        schema["@graph"] = graph;
        return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
      } catch {
        return full;
      }
    },
  );

  return html.replaceAll(`${SITE}/khien-so-logo.png`, `${SITE}/search-logo.svg`);
}

let patched = 0;
const knowledgeDir = path.join(PUBLIC, "kien-thuc");
for (const file of await htmlFiles(knowledgeDir)) {
  let html = await readFile(file, "utf8");
  const slug = path.basename(path.dirname(file));
  if (slug !== "kien-thuc") html = ensureLegacyArticleSeo(html, slug);
  if (!html.includes("seo-footer-links")) {
    html = html.replace(/(<footer class="seo-footer"><div class="seo-shell"><strong>[^<]+<\/strong>)/, `$1${TRUST_NAV}`);
  }
  if (!html.includes('/gioi-thieu/')) {
    html = html.replace('<section class="seo-related">', `<section class="seo-trust-note seo-note"><strong>Vì sao có thể tin nội dung này?</strong><p>Xem <a href="/gioi-thieu/">Giới thiệu Cảnh Giác Số</a>, <a href="/chinh-sach-bien-tap/">chính sách biên tập</a>, <a href="/phuong-phap-kiem-chung/">phương pháp kiểm chứng</a>, <a href="/quyen-rieng-tu/">quyền riêng tư</a> và <a href="/bao-mat/">bảo mật website</a>.</p></section><section class="seo-related">`);
  }
  await writeFile(file, html, "utf8");
  patched += 1;
}

for (const relative of ["phuong-phap-kiem-chung/index.html", "sitemap/index.html"]) {
  const file = path.join(PUBLIC, relative);
  try {
    let html = await readFile(file, "utf8");
    if (!/khien-so-theme|theme-init\.js/.test(html)) html = html.replace("<head>", `<head>\n  ${THEME_INIT}`);
    if (!html.includes('name="referrer"')) html = html.replace(/(<meta name="viewport"[^>]*>)/i, '$1\n  <meta name="referrer" content="strict-origin-when-cross-origin" />');

    if (relative.startsWith("phuong-phap-kiem-chung")) {
      html = html
        .replace(
          /<a class="seo-brand" href="\/"><img[^>]+><span>Cảnh Giác Số<\/span><\/a>/,
          `<a class="seo-brand" href="/">${BRAND}</a>`,
        )
        .replaceAll(`${SITE}/khien-so-logo.png`, `${SITE}/search-logo.svg`);
    }

    if (relative.startsWith("sitemap") && !html.includes('class="seo-header"')) {
      html = html
        .replace(
          "<body>",
          `<body><header class="seo-header"><div class="seo-shell seo-nav"><a class="seo-brand" href="/">${BRAND}</a><nav class="seo-nav-links" aria-label="Điều hướng"><a href="/">Thử thách</a><a href="/kien-thuc/">Cẩm nang</a></nav></div></header>`,
        )
        .replace(
          '<main class="seo-article"><h1>',
          '<main class="seo-article"><div class="seo-breadcrumb"><a href="/">Cảnh Giác Số</a> › Sơ đồ nội dung</div><span class="seo-eyebrow">ĐIỀU HƯỚNG NỘI DUNG</span><h1>',
        )
        .replace(
          "</main>",
          `</main><footer class="seo-footer"><div class="seo-shell"><strong>Cảnh Giác Số</strong>${TRUST_NAV}<p class="seo-safety">Tất cả nội dung công khai của Cảnh Giác Số theo nhóm chủ đề.</p></div></footer>`,
        );
    }

    if (!html.includes("seo-footer-links")) {
      if (html.includes('<footer class="seo-footer">')) {
        html = html.replace(/(<footer class="seo-footer"><div class="seo-shell"><strong>[^<]+<\/strong>)/, `$1${TRUST_NAV}`);
      } else {
        html = html.replace("</main>", `<section class="seo-resources"><div class="seo-resources-inner"><strong>Thông tin website</strong>${TRUST_NAV}</div></section></main>`);
      }
    }
    await writeFile(file, html, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

const sitemapFile = path.join(PUBLIC, "sitemap.xml");
let sitemap = await readFile(sitemapFile, "utf8");

const ensureUrl = (url, priority, changefreq = "monthly") => {
  if (sitemap.includes(`<loc>${url}</loc>`)) return;
  sitemap = sitemap.replace("</urlset>", `  <url>\n    <loc>${url}</loc>\n    <lastmod>${UPDATED}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>\n</urlset>`);
};

const refreshLastmod = (url) => {
  const loc = `<loc>${url}</loc>`;
  const locIndex = sitemap.indexOf(loc);
  if (locIndex < 0) return;
  const start = sitemap.indexOf("<lastmod>", locIndex);
  const end = sitemap.indexOf("</lastmod>", start);
  if (start < 0 || end < 0) return;
  sitemap = sitemap.slice(0, start + "<lastmod>".length) + UPDATED + sitemap.slice(end);
};

ensureUrl(`${SITE}/gioi-thieu/`, "0.7");
ensureUrl(`${SITE}/chinh-sach-bien-tap/`, "0.7");
ensureUrl(`${SITE}/lien-he/`, "0.6");
ensureUrl(`${SITE}/quyen-rieng-tu/`, "0.6");
ensureUrl(`${SITE}/bao-mat/`, "0.6");
ensureUrl(`${SITE}/phuong-phap-kiem-chung/`, "0.8");
refreshLastmod(`${SITE}/`);
refreshLastmod(`${SITE}/kien-thuc/`);
refreshLastmod(`${SITE}/gioi-thieu/`);
refreshLastmod(`${SITE}/chinh-sach-bien-tap/`);
refreshLastmod(`${SITE}/lien-he/`);
refreshLastmod(`${SITE}/quyen-rieng-tu/`);
refreshLastmod(`${SITE}/bao-mat/`);
refreshLastmod(`${SITE}/phuong-phap-kiem-chung/`);

for (const file of await htmlFiles(knowledgeDir)) {
  const relative = path.relative(knowledgeDir, path.dirname(file)).split(path.sep).join("/");
  if (!relative || relative === ".") continue;
  const articleUrl = `${SITE}/kien-thuc/${relative}/`;
  ensureUrl(articleUrl, "0.8");
  refreshLastmod(articleUrl);
}

await writeFile(sitemapFile, sitemap, "utf8");

console.log(`SEO Authority Wave 6: generated trust pages, patched ${patched} knowledge pages and reconciled sitemap coverage.`);
