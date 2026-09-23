import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public");
const HOME = path.join(ROOT, "github-pages", "index.html");
const SITE = "https://canhgiacso.com";
const UPDATED = "2026-09-23";
const BRAND = '<span class="seo-brand-logo" aria-hidden="true"></span><span class="seo-brand-divider" aria-hidden="true"></span><span class="seo-product-lockup"><strong>CẢNH GIÁC SỐ</strong><small>IT SECURITY</small></span>';
const THEME_INIT = '<script>try{if(localStorage.getItem("khien-so-theme")==="dark")document.documentElement.dataset.theme="dark"}catch{}</script>';

async function exists(file) {
  try { await readFile(file); return true; } catch { return false; }
}

async function read(relative) {
  return readFile(path.join(PUBLIC, relative), "utf8");
}

async function write(relative, html) {
  const file = path.join(PUBLIC, relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, html, "utf8");
}

function replaceTitle(html, title) {
  return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
}

function replaceDescription(html, description) {
  return html.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, `<meta name="description" content="${description}" />`);
}

function replaceOg(html, property, value) {
  const re = new RegExp(`<meta\\s+property="${property}"\\s+content="[^"]*"\\s*\\/?>`, "i");
  return re.test(html)
    ? html.replace(re, `<meta property="${property}" content="${value}" />`)
    : html;
}

function replaceTwitter(html, name, value) {
  const re = new RegExp(`<meta\\s+name="${name}"\\s+content="[^"]*"\\s*\\/?>`, "i");
  return re.test(html)
    ? html.replace(re, `<meta name="${name}" content="${value}" />`)
    : html;
}

function replaceH1(html, h1) {
  return html.replace(/<h1>[\s\S]*?<\/h1>/i, `<h1>${h1}</h1>`);
}

function insertAnswerBox(html, body) {
  if (html.includes('class="seo-answer-box"')) return html;
  const lead = html.match(/<p class="lead">[\s\S]*?<\/p>/i)?.[0];
  if (!lead) return html;
  return html.replace(lead, `${lead}\n<section class="seo-answer-box" aria-label="Trả lời nhanh"><strong>Trả lời nhanh</strong>${body}</section>`);
}

function updateArticleSchema(html, { headline, description }) {
  return html.replace(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/i,
    (full, raw) => {
      try {
        const schema = JSON.parse(raw);
        const graph = Array.isArray(schema?.["@graph"]) ? schema["@graph"] : [];
        const article = graph.find((node) => node?.["@type"] === "Article");
        if (!article) return full;
        article.headline = headline;
        article.description = description;
        article.dateModified = UPDATED;
        schema["@graph"] = graph;
        return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
      } catch {
        return full;
      }
    },
  );
}

async function patchArticle(slug, config) {
  const relative = `kien-thuc/${slug}/index.html`;
  if (!(await exists(path.join(PUBLIC, relative)))) return;
  let html = await read(relative);
  html = replaceTitle(html, config.title);
  html = replaceDescription(html, config.description);
  html = replaceH1(html, config.h1);
  html = replaceOg(html, "og:title", config.title.replace(" | Cảnh Giác Số", ""));
  html = replaceOg(html, "og:description", config.description);
  html = replaceTwitter(html, "twitter:title", config.title.replace(" | Cảnh Giác Số", ""));
  html = replaceTwitter(html, "twitter:description", config.description);
  html = insertAnswerBox(html, config.answer);
  html = updateArticleSchema(html, { headline: config.h1, description: config.description });
  if (config.extraSection && !html.includes(config.extraMarker)) {
    html = html.replace(/<section class="seo-related">/i, `${config.extraSection}\n<section class="seo-related">`);
  }
  await write(relative, html);
}

const priority = [
  {
    slug: "kiem-tra-so-dien-thoai-lua-dao",
    title: "Kiểm tra số điện thoại lừa đảo: 7 cách tra cứu số lạ",
    description: "Cách kiểm tra số điện thoại lừa đảo hoặc số lạ gọi đến bằng Google, nguồn công khai và xác minh độc lập; tránh kết luận chỉ từ một danh sách số.",
    h1: "Kiểm tra số điện thoại lừa đảo: 7 cách tra cứu số lạ trước khi tin",
    answer: '<p>Không có một danh sách nào chứng minh tuyệt đối một số điện thoại là an toàn hay lừa đảo. Hãy tra cứu số chính xác, đối chiếu nhiều nguồn và tự gọi lại kênh chính thức của tổ chức bị mạo danh.</p>',
  },
  {
    slug: "kiem-tra-link-gia-mao",
    title: "Kiểm tra link lừa đảo: Cách nhận biết website giả trước khi bấm",
    description: "Checklist kiểm tra link lừa đảo và website giả mạo trước khi bấm: đọc tên miền, URL rút gọn, HTTPS, trang đăng nhập, file tải xuống và kênh xác minh.",
    h1: "Kiểm tra link lừa đảo: cách nhận biết website giả trước khi bấm",
    answer: '<p>Hãy đọc tên miền từ phải sang trái, mở rộng URL rút gọn, không xem HTTPS là bằng chứng an toàn và tự mở website chính thức thay vì đăng nhập từ link được gửi qua SMS, email hay chat.</p>',
  },
  {
    slug: "lua-dao-cong-tac-vien-viec-nhe-luong-cao",
    title: "Lừa đảo cộng tác viên online: Dấu hiệu việc nhẹ lương cao",
    description: "Nhận biết lừa đảo cộng tác viên online, làm nhiệm vụ nhận hoa hồng và việc nhẹ lương cao: nạp tiền trước, lợi nhuận ảo, khóa rút tiền và yêu cầu nạp thêm.",
    h1: "Lừa đảo cộng tác viên online, việc nhẹ lương cao: dấu hiệu nhận biết",
    answer: '<p>Dấu hiệu nguy hiểm nhất là phải ứng hoặc nạp tiền để “mở nhiệm vụ”, “nâng cấp đơn” hay “mở khóa rút tiền”. Khi gặp mô hình này, dừng nạp thêm và lưu toàn bộ bằng chứng giao dịch.</p>',
  },
  {
    slug: "gia-mao-ngan-hang",
    title: "Giả mạo ngân hàng: 8 dấu hiệu lừa đảo và cách xử lý",
    description: "Nhận biết giả mạo ngân hàng qua cuộc gọi, SMS, email, link và app giả; bảo vệ OTP, mật khẩu, thẻ và xử lý nhanh nếu đã cung cấp thông tin.",
    h1: "Giả mạo ngân hàng: 8 dấu hiệu lừa đảo và cách xử lý",
    answer: '<p>Ngân hàng thật không cần bạn đọc OTP, mật khẩu hay PIN cho người gọi đến. Khi có yêu cầu khẩn cấp, hãy ngắt liên lạc và tự mở ứng dụng hoặc gọi số chính thức của ngân hàng để kiểm tra.</p>',
  },
  {
    slug: "xu-ly-khi-bi-lua-dao-chuyen-tien",
    title: "Bị lừa chuyển tiền phải làm gì? 7 bước trong 15 phút đầu",
    description: "Bị lừa chuyển tiền phải làm gì: dừng giao dịch, gọi ngân hàng, khóa tài khoản, đổi mật khẩu, lưu bằng chứng và trình báo sớm để giảm thiệt hại.",
    h1: "Bị lừa chuyển tiền phải làm gì? 7 bước trong 15 phút đầu",
    answer: '<p>Ưu tiên 15 phút đầu: ngừng chuyển thêm tiền, gọi ngân hàng qua kênh chính thức để khóa rủi ro và tra soát, đổi thông tin đăng nhập có thể đã lộ, lưu bằng chứng rồi trình báo cơ quan chức năng.</p>',
  },
];

for (const item of priority) await patchArticle(item.slug, item);

await patchArticle("lua-dao-viec-nhe-luong-cao", {
  title: "Bị lừa việc nhẹ lương cao: Cách dừng nạp tiền và xử lý",
  description: "Đã nạp tiền vào việc nhẹ lương cao hoặc nhiệm vụ cộng tác viên nhưng không rút được? Cách dừng nạp thêm, lưu bằng chứng, liên hệ ngân hàng và trình báo.",
  h1: "Bị lừa việc nhẹ lương cao: cách dừng nạp tiền và xử lý",
  answer: '<p>Nếu hệ thống yêu cầu nạp thêm để rút tiền, đừng cố “gỡ” bằng một khoản nạp mới. Hãy dừng ngay, chụp lại hội thoại và giao dịch, liên hệ ngân hàng nếu đã chuyển tiền và chuẩn bị bằng chứng để trình báo.</p>',
  extraMarker: "Phân biệt bài này với hướng dẫn nhận diện",
  extraSection: '<section><h2>Phân biệt bài này với hướng dẫn nhận diện</h2><p>Bài này dành cho người <strong>đã tham gia hoặc đã nạp tiền</strong>. Nếu bạn mới nhận lời mời và muốn kiểm tra trước khi tham gia, xem <a href="/kien-thuc/lua-dao-cong-tac-vien-viec-nhe-luong-cao/">dấu hiệu lừa đảo cộng tác viên online, việc nhẹ lương cao</a>.</p></section>',
});

await patchArticle("lua-dao-ngan-hang", {
  title: "Bị lừa đảo ngân hàng phải làm gì? 7 bước xử lý ngay",
  description: "Nghi bị lừa đảo ngân hàng, lộ OTP, mật khẩu hoặc vừa chuyển tiền? 7 bước xử lý ngay: khóa rủi ro, gọi ngân hàng, đổi mật khẩu, lưu bằng chứng và tra soát.",
  h1: "Bị lừa đảo ngân hàng phải làm gì? 7 bước xử lý ngay",
  answer: '<p>Nếu đã lộ OTP, mật khẩu hoặc vừa chuyển tiền, ưu tiên khóa thẻ/tài khoản qua kênh chính thức, đổi thông tin đăng nhập, kiểm tra giao dịch và yêu cầu ngân hàng hỗ trợ tra soát càng sớm càng tốt.</p>',
  extraMarker: "Nếu bạn chưa tương tác với đối tượng",
  extraSection: '<section><h2>Nếu bạn chưa tương tác với đối tượng</h2><p>Nếu mới nhận cuộc gọi, SMS hoặc link tự xưng ngân hàng và chưa cung cấp thông tin, hãy xem <a href="/kien-thuc/gia-mao-ngan-hang/">8 dấu hiệu giả mạo ngân hàng và cách xác minh an toàn</a>.</p></section>',
});

await patchArticle("cach-kiem-tra-link-lua-dao", {
  title: "Đã bấm link lạ phải làm gì? Cách xử lý và kiểm tra link",
  description: "Đã bấm link lạ hoặc nghi link lừa đảo? Cách xử lý ngay nếu chưa nhập gì, đã nhập mật khẩu, tải file hoặc cung cấp OTP; kèm checklist kiểm tra URL an toàn.",
  h1: "Đã bấm link lạ phải làm gì? Cách xử lý và kiểm tra link",
  answer: '<p>Nếu chỉ mở link nhưng chưa nhập dữ liệu hay tải file, đóng trang và kiểm tra lại URL. Nếu đã nhập mật khẩu, OTP hoặc cài file/app, hãy đổi thông tin đăng nhập, thu hồi phiên, kiểm tra thiết bị và liên hệ đơn vị liên quan ngay.</p>',
  extraMarker: "Kiểm tra trước khi bấm",
  extraSection: '<section><h2>Kiểm tra trước khi bấm</h2><p>Nếu bạn chưa mở link và muốn đánh giá tên miền, HTTPS, URL rút gọn hoặc trang đăng nhập, dùng hướng dẫn <a href="/kien-thuc/kiem-tra-link-gia-mao/">kiểm tra link lừa đảo và website giả mạo trước khi bấm</a>.</p></section>',
});

const phishingCanonical = `${SITE}/kien-thuc/phishing-la-gi/`;
const phishingSchema = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": `${phishingCanonical}#article`,
      headline: "Phishing là gì? Dấu hiệu, ví dụ và cách phòng tránh lừa đảo",
      description: "Phishing là hình thức giả mạo nguồn tin cậy để dụ người dùng tiết lộ thông tin, đăng nhập website giả, mở link độc hại hoặc cài phần mềm nguy hiểm.",
      datePublished: UPDATED,
      dateModified: UPDATED,
      inLanguage: "vi-VN",
      mainEntityOfPage: { "@type": "WebPage", "@id": phishingCanonical },
      image: { "@type": "ImageObject", url: `${SITE}/og.png`, width: 1731, height: 909 },
      author: { "@id": `${SITE}/#organization` },
      publisher: { "@id": `${SITE}/#organization` },
    },
    {
      "@type": "Organization",
      "@id": `${SITE}/#organization`,
      name: "Cảnh Giác Số",
      url: `${SITE}/`,
      logo: { "@type": "ImageObject", url: `${SITE}/search-logo.svg`, width: 800, height: 800 },
      publishingPrinciples: `${SITE}/phuong-phap-kiem-chung/`,
    },
    { "@type": "WebSite", "@id": `${SITE}/#website`, url: `${SITE}/`, name: "Cảnh Giác Số", inLanguage: "vi-VN" },
    {
      "@type": "BreadcrumbList",
      "@id": `${phishingCanonical}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Cảnh Giác Số", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: "Kiến thức", item: `${SITE}/kien-thuc/` },
        { "@type": "ListItem", position: 3, name: "Phishing là gì?", item: phishingCanonical },
      ],
    },
  ],
});

const phishing = `<!doctype html>
<html lang="vi-VN">
<head>
  ${THEME_INIT}
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="referrer" content="strict-origin-when-cross-origin" />
  <title>Phishing là gì? Dấu hiệu, ví dụ và cách phòng tránh lừa đảo</title>
  <meta name="description" content="Phishing là gì, hoạt động thế nào và cách nhận biết email, SMS, website giả mạo; hướng dẫn xử lý nếu đã bấm link hoặc nhập mật khẩu, OTP." />
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
  <link rel="canonical" href="${phishingCanonical}" />
  <link rel="alternate" hreflang="vi-VN" href="${phishingCanonical}" />
  <link rel="alternate" hreflang="x-default" href="${phishingCanonical}" />
  <link rel="stylesheet" href="/seo.css" />
  <link rel="icon" type="image/png" href="/khien-so-logo.png" />
  <link rel="apple-touch-icon" href="/khien-so-logo.png" />
  <meta property="og:type" content="article" />
  <meta property="og:locale" content="vi_VN" />
  <meta property="og:site_name" content="Cảnh Giác Số" />
  <meta property="og:title" content="Phishing là gì? Dấu hiệu, ví dụ và cách phòng tránh lừa đảo" />
  <meta property="og:description" content="Nhận biết phishing qua email, SMS, website giả và cách xử lý nếu đã bấm link hoặc cung cấp thông tin." />
  <meta property="og:url" content="${phishingCanonical}" />
  <meta property="og:image" content="${SITE}/og.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Phishing là gì? Dấu hiệu, ví dụ và cách phòng tránh lừa đảo" />
  <meta name="twitter:description" content="Nhận biết phishing qua email, SMS, website giả và cách xử lý nếu đã bấm link hoặc cung cấp thông tin." />
  <meta name="twitter:image" content="${SITE}/og.png" />
  <script type="application/ld+json">${phishingSchema}</script>
</head>
<body>
<header class="seo-header"><div class="seo-shell seo-nav"><a class="seo-brand" href="/">${BRAND}</a><nav class="seo-nav-links" aria-label="Điều hướng"><a href="/">Thử thách</a><a href="/kien-thuc/" aria-current="page">Cẩm nang</a></nav></div></header>
<main class="seo-article">
  <div class="seo-breadcrumb"><a href="/">Cảnh Giác Số</a> › <a href="/kien-thuc/">Kiến thức</a> › Phishing là gì?</div>
  <span class="seo-eyebrow">PHISHING · LỪA ĐẢO GIẢ MẠO</span>
  <h1>Phishing là gì? Dấu hiệu, ví dụ và cách phòng tránh lừa đảo</h1>
  <p class="lead">Phishing là hình thức giả mạo một nguồn đáng tin cậy để dụ người dùng tiết lộ mật khẩu, thông tin tài chính hoặc thực hiện hành động có hại như bấm link, đăng nhập website giả hay cài phần mềm độc hại.</p>
  <section class="seo-answer-box" aria-label="Trả lời nhanh"><strong>Trả lời nhanh</strong><p>Phishing không chỉ là email giả. Kẻ gian có thể dùng SMS, mạng xã hội, cuộc gọi, mã QR hoặc website giống thật. Dấu hiệu quan trọng là yêu cầu khẩn cấp, tên miền lạ, đăng nhập lại, cung cấp OTP/mật khẩu hoặc tải file/app từ nguồn không chính thức.</p></section>
  <div class="seo-meta">Cập nhật: <time datetime="${UPDATED}">23/09/2026</time> · Kiểm chứng theo nguồn VNNIC, Bộ Công an và Microsoft Security</div>

  <section><h2>Phishing hoạt động như thế nào?</h2><p>Kẻ gian tạo một thông điệp hoặc trang giả có vẻ đến từ ngân hàng, cơ quan nhà nước, dịch vụ giao hàng, mạng xã hội hoặc người quen. Mục tiêu là khiến bạn hành động trước khi kịp xác minh: đăng nhập, nhập thông tin thẻ, cung cấp OTP, tải file hoặc chuyển tiền.</p></section>

  <section><h2>8 dấu hiệu phishing thường gặp</h2><ol class="seo-checklist"><li>Thông báo khẩn cấp: khóa tài khoản, phạt, hoàn tiền hoặc xác minh ngay.</li><li>Tên miền gần giống thương hiệu thật nhưng thêm bớt ký tự.</li><li>Link rút gọn hoặc đường dẫn không cho thấy điểm đến rõ ràng.</li><li>Trang yêu cầu đăng nhập lại dù bạn vừa đăng nhập trước đó.</li><li>Yêu cầu OTP, mật khẩu, PIN, CVV hoặc mã khôi phục.</li><li>File đính kèm hoặc ứng dụng APK gửi qua chat/SMS.</li><li>Nội dung cấm bạn gọi lại kênh chính thức hoặc hỏi người khác.</li><li>Giao diện rất giống thật nhưng thông tin liên hệ, pháp nhân hoặc tên miền không khớp.</li></ol></section>

  <section><h2>Phishing khác spam và giả mạo thông thường thế nào?</h2><p>Spam là nội dung không mong muốn; phishing có mục tiêu lừa bạn tiết lộ dữ liệu hoặc thực hiện hành động gây hại. Một nội dung phishing có thể dùng thương hiệu thật, logo thật hoặc HTTPS nhưng vẫn dẫn tới tên miền do kẻ gian kiểm soát.</p></section>

  <section><h2>Nếu nhận được link nghi phishing</h2><ol class="seo-checklist"><li>Không đăng nhập từ link được gửi trực tiếp.</li><li>Tự mở ứng dụng hoặc gõ địa chỉ chính thức của tổ chức.</li><li>Kiểm tra tên miền, URL rút gọn và trang đăng nhập trước khi tương tác.</li><li>Nếu đã bấm link, xác định bạn chỉ mở trang hay đã nhập dữ liệu/tải file.</li><li>Nếu đã lộ mật khẩu hoặc OTP, đổi thông tin đăng nhập, thu hồi phiên và liên hệ đơn vị liên quan ngay.</li></ol><p>Xem thêm: <a href="/kien-thuc/kiem-tra-link-gia-mao/">cách kiểm tra link lừa đảo trước khi bấm</a> và <a href="/kien-thuc/nhan-dien-email-phishing/">cách nhận diện email phishing</a>.</p></section>

  <section><h2>Ví dụ phishing phổ biến tại Việt Nam</h2><ul class="seo-checklist"><li>Giả mạo ngân hàng gửi link “xác minh” hoặc “hoàn tiền”.</li><li>Giả danh cơ quan chức năng gửi thông báo phạt nguội kèm link.</li><li>Giả mạo VNeID hoặc dịch vụ công để dụ cài ứng dụng.</li><li>Giả mạo đơn vị giao hàng yêu cầu thanh toán hoặc xác nhận đơn.</li><li>Trang đăng nhập mạng xã hội giả để chiếm tài khoản.</li></ul></section>

  <section><h2>Nguồn kiểm chứng</h2><ul class="seo-checklist"><li><a href="https://www.vnnic.vn/vi/thu-vien-kien-thuc/bai-viet-chuyen-mon/dnsdnssec/toan-dns" target="_blank" rel="noopener noreferrer">VNNIC — An toàn DNS, định nghĩa phishing và pharming</a></li><li><a href="https://www.bocongan.gov.vn/bai-viet/nang-cao-canh-giac-truoc-25-kich-ban-lua-dao-tren-khong-gian-mang-nam-2026-1788865614" target="_blank" rel="noopener noreferrer">Bộ Công an — 25 kịch bản lừa đảo trên không gian mạng năm 2026</a></li><li><a href="https://www.microsoft.com/vi-vn/security/business/security-101/what-is-phishing" target="_blank" rel="noopener noreferrer">Microsoft Security — Phishing là gì và cách nhận dạng</a></li></ul></section>

  <section class="seo-related"><h2>Đọc tiếp theo nhu cầu</h2><ul><li><a href="/kien-thuc/kiem-tra-link-gia-mao/">Kiểm tra link lừa đảo, website giả mạo</a></li><li><a href="/kien-thuc/nhan-dien-email-phishing/">Nhận diện email phishing</a></li><li><a href="/kien-thuc/gia-mao-ngan-hang/">Giả mạo ngân hàng</a></li><li><a href="/kien-thuc/lua-dao-otp-chiem-doat-tai-khoan/">Lừa đảo OTP và chiếm đoạt tài khoản</a></li></ul></section>
</main>
<footer class="seo-footer"><div class="seo-shell"><strong>Cảnh Giác Số</strong><nav class="seo-footer-links" aria-label="Thông tin website"><a href="/gioi-thieu/">Giới thiệu</a><a href="/phuong-phap-kiem-chung/">Phương pháp kiểm chứng</a><a href="/quyen-rieng-tu/">Quyền riêng tư</a><a href="/sitemap/">Sơ đồ nội dung</a></nav><p class="seo-safety">Nội dung phục vụ giáo dục và nâng cao nhận thức an toàn thông tin.</p></div></footer>
</body>
</html>`;

await write("kien-thuc/phishing-la-gi/index.html", phishing);

let hub = await read("kien-thuc/index.html");
if (!hub.includes("Tìm nhanh theo nhu cầu")) {
  const quick = `<section class="seo-quick-intents"><div class="seo-shell"><span class="seo-eyebrow">TÌM NHANH THEO NHU CẦU</span><h2>Tôi đang cần kiểm tra điều gì?</h2><div class="seo-intent-grid"><a href="/kien-thuc/kiem-tra-so-dien-thoai-lua-dao/"><strong>Số điện thoại lạ</strong><span>7 cách tra cứu trước khi tin</span></a><a href="/kien-thuc/kiem-tra-link-gia-mao/"><strong>Link hoặc website</strong><span>Kiểm tra trước khi bấm</span></a><a href="/kien-thuc/tra-cuu-lua-dao/"><strong>Thông tin đáng ngờ</strong><span>Quy trình tra cứu độc lập</span></a><a href="/kien-thuc/xu-ly-khi-bi-lua-dao-chuyen-tien/"><strong>Đã chuyển tiền</strong><span>7 bước xử lý trong 15 phút đầu</span></a><a href="/kien-thuc/lua-dao-cong-tac-vien-viec-nhe-luong-cao/"><strong>Việc nhẹ lương cao</strong><span>Nhận diện bẫy cộng tác viên</span></a><a href="/kien-thuc/phishing-la-gi/"><strong>Phishing là gì?</strong><span>Hiểu và nhận biết lừa đảo giả mạo</span></a></div></div></section>`;
  hub = hub.replace(/(<section class="seo-grid">)/, `${quick}$1`);
}
if (!hub.includes('/kien-thuc/phishing-la-gi/')) {
  hub = hub.replace('</main>', '<section class="seo-related"><h2>Kiến thức nền tảng</h2><ul><li><a href="/kien-thuc/phishing-la-gi/">Phishing là gì? Dấu hiệu và cách phòng tránh</a></li></ul></section></main>');
}
await write("kien-thuc/index.html", hub);

const crossLinks = [
  ["kien-thuc/nhan-dien-email-phishing/index.html", '<li><a href="/kien-thuc/phishing-la-gi/">Phishing là gì? Dấu hiệu, ví dụ và cách phòng tránh</a></li>'],
  ["kien-thuc/kiem-tra-link-gia-mao/index.html", '<li><a href="/kien-thuc/phishing-la-gi/">Phishing là gì? Hiểu cách website giả đánh cắp thông tin</a></li>'],
  ["kien-thuc/gia-mao-ngan-hang/index.html", '<li><a href="/kien-thuc/phishing-la-gi/">Phishing là gì và vì sao link ngân hàng giả rất nguy hiểm?</a></li>'],
  ["kien-thuc/lua-dao-otp-chiem-doat-tai-khoan/index.html", '<li><a href="/kien-thuc/phishing-la-gi/">Phishing là gì? Mối liên hệ giữa link giả và đánh cắp OTP</a></li>'],
];
for (const [relative, link] of crossLinks) {
  if (!(await exists(path.join(PUBLIC, relative)))) continue;
  let html = await read(relative);
  if (!html.includes('/kien-thuc/phishing-la-gi/')) {
    html = html.replace(/(<section class="seo-related">[\s\S]*?<ul>)/i, `$1${link}`);
    await write(relative, html);
  }
}

let sitemap = await read("sitemap.xml");
const phishingUrl = `${SITE}/kien-thuc/phishing-la-gi/`;
if (!sitemap.includes(`<loc>${phishingUrl}</loc>`)) {
  sitemap = sitemap.replace("</urlset>", `  <url>\n    <loc>${phishingUrl}</loc>\n    <lastmod>${UPDATED}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.9</priority>\n  </url>\n</urlset>`);
}
await write("sitemap.xml", sitemap);

const sitemapPage = path.join(PUBLIC, "sitemap", "index.html");
if (await exists(sitemapPage)) {
  let html = await readFile(sitemapPage, "utf8");
  if (!html.includes('/kien-thuc/phishing-la-gi/')) {
    html = html.replace('</ul></main>', '<li><a href="/kien-thuc/phishing-la-gi/">Phishing là gì? Dấu hiệu, ví dụ và cách phòng tránh lừa đảo</a></li></ul></main>');
  }
  await writeFile(sitemapPage, html, "utf8");
}

if (await exists(HOME)) {
  let home = await readFile(HOME, "utf8");
  if (!home.includes('/kien-thuc/phishing-la-gi/')) {
    home = home.replace(
      /(<a href="\/kien-thuc\/nhan-dien-email-phishing\/"[^>]*>)/,
      '<a href="/kien-thuc/phishing-la-gi/" class="home-growth-link">Phishing là gì?</a>$1',
    );
  }
  await writeFile(HOME, home, "utf8");
}

console.log("SEO Intent Wave 7: optimized priority intents, separated overlapping pages, added phishing pillar and strengthened internal links.");
