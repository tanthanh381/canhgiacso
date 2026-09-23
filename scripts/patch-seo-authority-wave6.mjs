import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public");
const SITE = "https://canhgiacso.com";
const UPDATED = "2026-09-23";
const BRAND = '<span class="seo-brand-logo" aria-hidden="true"></span><span class="seo-brand-divider" aria-hidden="true"></span><span class="seo-product-lockup"><strong>CẢNH GIÁC SỐ</strong><small>IT SECURITY</small></span>';
const TRUST_NAV = '<nav class="seo-footer-links" aria-label="Thông tin website"><a href="/gioi-thieu/">Giới thiệu</a><a href="/phuong-phap-kiem-chung/">Phương pháp kiểm chứng</a><a href="/quyen-rieng-tu/">Quyền riêng tư</a><a href="/sitemap/">Sơ đồ nội dung</a></nav>';

async function write(relative, content) {
  const file = path.join(PUBLIC, relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content, "utf8");
}

function pageShell({ title, description, canonical, type, h1, eyebrow, lead, body }) {
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
        dateModified: UPDATED,
        isPartOf: { "@id": `${SITE}/#website` },
        about: { "@id": `${SITE}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${SITE}/#organization`,
        name: "Cảnh Giác Số",
        url: `${SITE}/`,
        description: "Nền tảng giáo dục an toàn số giúp nhận diện lừa đảo trực tuyến, xác minh thông tin và rèn kỹ năng phòng tránh rủi ro.",
        logo: { "@type": "ImageObject", url: `${SITE}/khien-so-logo.png`, width: 800, height: 800 },
        publishingPrinciples: `${SITE}/phuong-phap-kiem-chung/`,
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
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
  <link rel="canonical" href="${canonical}" />
  <link rel="alternate" hreflang="vi-VN" href="${canonical}" />
  <link rel="alternate" hreflang="x-default" href="${canonical}" />
  <link rel="stylesheet" href="/seo.css" />
  <link rel="icon" type="image/png" href="/khien-so-logo.png" />
  <link rel="apple-touch-icon" href="/khien-so-logo.png" />
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
<header class="seo-header"><div class="seo-shell seo-nav"><a class="seo-brand" href="/">${BRAND}</a><nav class="seo-nav-links" aria-label="Điều hướng"><a href="/">Thử thách</a><a href="/kien-thuc/">Kiến thức</a></nav></div></header>
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
<section><h2>Website này giúp bạn làm gì?</h2><p>Nội dung được tổ chức theo các tình huống người dùng thường gặp: cuộc gọi mạo danh, phishing, website giả, lừa đảo ngân hàng, QR, OTP, deepfake, tuyển dụng, đầu tư và yêu cầu chuyển tiền khẩn cấp. Mỗi hướng dẫn ưu tiên các bước có thể thực hiện ngay thay vì chỉ mô tả thủ đoạn.</p></section>
<section><h2>Nguyên tắc cốt lõi: Dừng — Kiểm tra — Xác minh — Báo cáo</h2><p>Khi có dấu hiệu bất thường, người dùng không cần tiếp tục tương tác để “thử xem có lừa đảo hay không”. Hướng dẫn mặc định là dừng thao tác có rủi ro, tự tìm kênh chính thức, xác minh qua nguồn độc lập và báo cáo khi có căn cứ phù hợp.</p></section>
<section><h2>Nội dung được xây dựng và cập nhật như thế nào?</h2><p>Cảnh Giác Số ưu tiên nguồn từ cơ quan có thẩm quyền, tổ chức an ninh mạng, ngân hàng, nhà cung cấp dịch vụ và báo chí có danh tính rõ ràng. Các bài viết được gắn nguồn theo chủ đề, cập nhật khi thủ đoạn thay đổi và phân biệt rõ tín hiệu rủi ro với kết luận. Xem chi tiết tại <a href="/phuong-phap-kiem-chung/">phương pháp kiểm chứng & nguyên tắc biên tập</a>.</p></section>
<section><h2>Phạm vi và giới hạn</h2><p>Cảnh Giác Số phục vụ giáo dục, tra cứu và nâng cao nhận thức. Nội dung không thay thế xác minh trực tiếp từ ngân hàng, cơ quan chức năng hoặc tổ chức có thẩm quyền trong từng vụ việc. Khi đã xảy ra thiệt hại tài chính hoặc mất quyền kiểm soát tài khoản, hãy ưu tiên khóa tài khoản, liên hệ đơn vị liên quan và lưu bằng chứng.</p></section>`,
});

const privacy = pageShell({
  title: "Quyền riêng tư & dữ liệu người dùng | Cảnh Giác Số",
  description: "Cách Cảnh Giác Số xử lý dữ liệu khi truy cập, đăng nhập, dùng công cụ tra cứu và thống kê truy cập; phân biệt analytics first-party và Google Analytics.",
  canonical: `${SITE}/quyen-rieng-tu/`,
  type: "WebPage",
  h1: "Quyền riêng tư & dữ liệu người dùng",
  eyebrow: "MINH BẠCH DỮ LIỆU",
  lead: "Cảnh Giác Số được thiết kế để giảm lượng dữ liệu cần thu thập và không yêu cầu người dùng nhập OTP, PIN, CVV, mã khôi phục hoặc mật khẩu ngân hàng vào các công cụ tra cứu hay bài thực hành.",
  body: `
<section><h2>Dữ liệu khi truy cập website</h2><p>Hệ thống analytics first-party ghi nhận các chỉ số kỹ thuật phục vụ thống kê như visitor/session UUID ẩn danh, đường dẫn trang, hostname referrer, nhãn trình duyệt, hệ điều hành, loại thiết bị, mã quốc gia ước tính và các tham số UTM được cho phép. Collector first-party không lưu raw user-agent, email hay account ID trong dữ liệu analytics.</p></section>
<section><h2>Google Analytics</h2><p>Website có chạy Google Analytics 4 song song để đối chiếu traffic ở cấp tổng hợp. Khi trình duyệt tải Google Analytics, dữ liệu kỹ thuật có thể được Google xử lý theo chính sách và điều khoản của Google. Dashboard Quản trị nội bộ của Cảnh Giác Số hiện sử dụng dữ liệu first-party Supabase làm nguồn chính và không đọc trực tiếp Google Analytics Data API.</p></section>
<section><h2>Tài khoản và tiến trình học</h2><p>Nếu người dùng đăng ký hoặc đăng nhập, hệ thống có thể lưu thông tin tài khoản cần thiết cho xác thực và tiến trình tương tác. Dữ liệu này được tách khỏi analytics truy cập và được kiểm soát bằng cơ chế phân quyền của hệ thống.</p></section>
<section><h2>Công cụ tra cứu</h2><p>Các công cụ kiểm tra URL và hướng dẫn tra cứu được thiết kế ưu tiên xử lý cục bộ trên trình duyệt khi có thể. Không nhập mật khẩu, OTP, PIN, CVV, mã khôi phục hoặc thông tin đăng nhập ngân hàng vào ô tra cứu.</p></section>
<section><h2>Giới hạn của dữ liệu thống kê</h2><p>Referrer có thể bị trình duyệt, ứng dụng hoặc cơ chế riêng tư lược bỏ; dữ liệu quốc gia chỉ là ước tính kỹ thuật từ timezone/locale và không phải GPS. Vì vậy các số liệu nguồn truy cập và vị trí không nên được hiểu là dữ liệu định danh chính xác.</p></section>`,
});

await write("gioi-thieu/index.html", about);
await write("quyen-rieng-tu/index.html", privacy);

async function htmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await htmlFiles(full));
    else if (entry.name === "index.html") out.push(full);
  }
  return out;
}

let patched = 0;
const knowledgeDir = path.join(PUBLIC, "kien-thuc");
for (const file of await htmlFiles(knowledgeDir)) {
  let html = await readFile(file, "utf8");
  if (!html.includes("seo-footer-links")) {
    html = html.replace(/(<footer class="seo-footer"><div class="seo-shell"><strong>[^<]+<\/strong>)/, `$1${TRUST_NAV}`);
  }
  if (!html.includes('/gioi-thieu/')) {
    html = html.replace('<section class="seo-related">', `<section class="seo-trust-note seo-note"><strong>Vì sao có thể tin nội dung này?</strong><p>Xem <a href="/gioi-thieu/">Giới thiệu Cảnh Giác Số</a>, <a href="/phuong-phap-kiem-chung/">phương pháp kiểm chứng</a> và <a href="/quyen-rieng-tu/">nguyên tắc quyền riêng tư</a>.</p></section><section class="seo-related">`);
  }
  await writeFile(file, html, "utf8");
  patched += 1;
}

for (const relative of ["phuong-phap-kiem-chung/index.html", "sitemap/index.html"]) {
  const file = path.join(PUBLIC, relative);
  try {
    let html = await readFile(file, "utf8");
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

ensureUrl(`${SITE}/gioi-thieu/`, "0.7");
ensureUrl(`${SITE}/quyen-rieng-tu/`, "0.6");
ensureUrl(`${SITE}/phuong-phap-kiem-chung/`, "0.8");

for (const file of await htmlFiles(knowledgeDir)) {
  const relative = path.relative(knowledgeDir, path.dirname(file)).split(path.sep).join("/");
  if (!relative || relative === ".") continue;
  ensureUrl(`${SITE}/kien-thuc/${relative}/`, "0.8");
}

await writeFile(sitemapFile, sitemap, "utf8");

console.log(`SEO Authority Wave 6: generated trust pages, patched ${patched} knowledge pages and reconciled sitemap coverage.`);
