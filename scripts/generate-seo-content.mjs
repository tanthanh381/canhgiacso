import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SITE = "https://canhgiacso.com";
const UPDATED = "2026-09-14";
const core = JSON.parse(await readFile(path.join(ROOT, "seo/articles-core.json"), "utf8"));
const longtail = JSON.parse(await readFile(path.join(ROOT, "seo/articles-longtail.json"), "utf8"));
const articles = [...core, ...longtail];

const esc = (value) => String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
const write = async (relativePath, content) => {
  const fullPath = path.join(ROOT, relativePath);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, content, "utf8");
};

function articleSchema(a) {
  const url = `${SITE}/kien-thuc/${a.slug}/`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline: a.h1,
        description: a.meta,
        datePublished: a.published,
        dateModified: UPDATED,
        inLanguage: "vi-VN",
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        image: { "@type": "ImageObject", url: `${SITE}/seo-images/${a.slug}.svg`, width: 1200, height: 630 },
        author: { "@id": `${SITE}/#organization` },
        publisher: { "@id": `${SITE}/#organization` },
        isPartOf: { "@id": `${SITE}/#website` },
      },
      {
        "@type": "Organization",
        "@id": `${SITE}/#organization`,
        name: "Cảnh Giác Số",
        url: `${SITE}/`,
        logo: { "@type": "ImageObject", url: `${SITE}/khien-so-logo.png` },
      },
      { "@type": "WebSite", "@id": `${SITE}/#website`, url: `${SITE}/`, name: "Cảnh Giác Số", inLanguage: "vi-VN" },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Cảnh Giác Số", item: `${SITE}/` },
          { "@type": "ListItem", position: 2, name: "Kiến thức", item: `${SITE}/kien-thuc/` },
          { "@type": "ListItem", position: 3, name: a.h1, item: url },
        ],
      },
    ],
  };
}

function articleHtml(a) {
  const url = `${SITE}/kien-thuc/${a.slug}/`;
  const sections = a.sections.map(([heading, body]) => `<h2>${heading}</h2>\n${body}`).join("\n");
  const related = a.related.map(([label, href]) => `<li><a href="${href}">${label}</a></li>`).join("");
  const schema = JSON.stringify(articleSchema(a));
  return `<!doctype html>
<html lang="vi-VN">
<head>
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests" />
  <meta name="referrer" content="strict-origin-when-cross-origin" />
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${esc(a.title)}</title>
  <meta name="description" content="${esc(a.meta)}" />
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
  <link rel="canonical" href="${url}" />
  <link rel="alternate" hreflang="vi-VN" href="${url}" />
  <link rel="alternate" hreflang="x-default" href="${url}" />
  <link rel="stylesheet" href="/seo.css" />
  <link rel="icon" type="image/png" href="/khien-so-logo.png" />
  <link rel="apple-touch-icon" href="/khien-so-logo.png" />
  <meta property="og:type" content="article" />
  <meta property="og:locale" content="vi_VN" />
  <meta property="og:site_name" content="Cảnh Giác Số" />
  <meta property="og:title" content="${esc(a.title.replace(" | Cảnh Giác Số", ""))}" />
  <meta property="og:description" content="${esc(a.meta)}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${SITE}/og.png" />
  <meta property="og:image:width" content="1731" />
  <meta property="og:image:height" content="909" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:alt" content="${esc(a.h1)}" />
  <meta property="article:published_time" content="${a.published}" />
  <meta property="article:modified_time" content="${UPDATED}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(a.title.replace(" | Cảnh Giác Số", ""))}" />
  <meta name="twitter:description" content="${esc(a.meta)}" />
  <meta name="twitter:image" content="${SITE}/og.png" />
  <script type="application/ld+json">${schema}</script>
</head>
<body>
<header class="seo-header"><div class="seo-shell seo-nav"><a class="seo-brand" href="/"><span class="seo-brand-logo" aria-hidden="true"></span><span class="seo-brand-divider" aria-hidden="true"></span><span class="seo-product-lockup"><strong>CẢNH GIÁC SỐ</strong><small>IT SECURITY</small></span></a><nav class="seo-nav-links" aria-label="Điều hướng"><a href="/">Thử thách</a><a href="/kien-thuc/">Kiến thức</a></nav></div></header>
<main class="seo-article">
  <div class="seo-breadcrumb"><a href="/">Cảnh Giác Số</a> › <a href="/kien-thuc/">Kiến thức</a> › ${esc(a.eyebrow)}</div>
  <span class="seo-eyebrow">${esc(a.eyebrow)}</span>
  <h1>${esc(a.h1)}</h1>
  <p class="lead">${esc(a.lead)}</p>
  <div class="seo-meta">Cập nhật ngày 14/09/2026 · Nội dung giáo dục an toàn số</div>
  <div class="seo-note"><strong>Nguyên tắc an toàn:</strong><p>Khi bị thúc ép phải chuyển tiền, đăng nhập, quét QR, cung cấp mã xác thực hoặc cài ứng dụng, hãy dừng lại và xác minh bằng một kênh độc lập mà bạn tự tìm từ nguồn chính thức.</p></div>
  ${sections}
  <section class="seo-related"><h2>Đọc tiếp</h2><ul>${related}<li><a href="/kien-thuc/">Xem toàn bộ cẩm nang Cảnh Giác Số</a></li></ul></section>
</main>
<footer class="seo-footer"><div class="seo-shell"><strong>Cảnh Giác Số</strong><p class="seo-safety">Nội dung phục vụ giáo dục và nâng cao nhận thức; không thay thế tư vấn pháp lý, hướng dẫn của ngân hàng hoặc quy trình xử lý sự cố chính thức.</p></div></footer>
</body>
</html>`;
}

function svgForArticle(a) {
  const words = a.h1.split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = `${line} ${word}`.trim();
    if (next.length <= 45) line = next;
    else { if (line) lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  const tspans = lines.slice(0, 3).map((text, index) => `<tspan x="110" dy="${index === 0 ? 0 : 68}">${esc(text)}</tspan>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc"><title id="title">${esc(a.h1)}</title><desc id="desc">Cảnh Giác Số - kiến thức chống lừa đảo và an toàn thông tin</desc><rect width="1200" height="630" rx="40" fill="#fff7f8"/><rect x="60" y="60" width="1080" height="510" rx="34" fill="#fff" stroke="#be1128" stroke-width="6"/><circle cx="170" cy="175" r="62" fill="#be1128"/><path d="M170 128l40 18v34c0 31-18 57-40 68-22-11-40-37-40-68v-34z" fill="#fff"/><text x="260" y="160" font-family="Arial,Helvetica,sans-serif" font-size="44" font-weight="700" fill="#be1128">CẢNH GIÁC SỐ</text><text x="110" y="305" font-family="Arial,Helvetica,sans-serif" font-size="50" font-weight="700" fill="#1f2937">${tspans}</text><text x="110" y="520" font-family="Arial,Helvetica,sans-serif" font-size="28" fill="#4b5563">Dừng · Kiểm tra · Xác minh · Báo cáo</text></svg>`;
}

function hubHtml() {
  const groups = [
    ["Bắt đầu từ đây", ["phong-chong-lua-dao-truc-tuyen", "nhan-dien-lua-dao-truc-tuyen", "an-toan-thong-tin-ca-nhan", "nhan-dien-email-phishing", "xu-ly-khi-bi-lua-dao-chuyen-tien"]],
    ["Các thủ đoạn cần cảnh giác", ["lua-dao-ma-qr", "gia-mao-cong-an-co-quan-nha-nuoc", "gia-mao-ngan-hang", "lua-dao-shipper-giao-hang", "lua-dao-cong-tac-vien-viec-nhe-luong-cao", "lua-dao-dau-tu-online", "deepfake-gia-giong-nguoi-than"]],
    ["Bảo vệ tài khoản & dữ liệu", ["lua-dao-otp-chiem-doat-tai-khoan", "kiem-tra-link-gia-mao", "tai-khoan-bi-hack-phai-lam-gi"]],
  ];
  const bySlug = Object.fromEntries(articles.map((a) => [a.slug, a]));
  const sections = groups.map(([name, slugs]) => `<section><h2>${name}</h2><div class="seo-grid">${slugs.map((slug) => { const a = bySlug[slug]; return `<a class="seo-card" href="/kien-thuc/${a.slug}/"><small>${a.eyebrow}</small><h3>${a.h1}</h3><p>${a.lead}</p></a>`; }).join("")}</div></section>`).join("\n");
  const itemList = articles.map((a, index) => ({ "@type": "ListItem", position: index + 1, url: `${SITE}/kien-thuc/${a.slug}/`, name: a.h1 }));
  const schema = JSON.stringify({ "@context": "https://schema.org", "@graph": [
    { "@type": "CollectionPage", "@id": `${SITE}/kien-thuc/#collection`, name: "Phòng chống lừa đảo và an toàn thông tin", description: "Cẩm nang thực hành giúp nhận diện, phòng chống lừa đảo trực tuyến và bảo vệ an toàn thông tin cá nhân.", url: `${SITE}/kien-thuc/`, inLanguage: "vi-VN", isPartOf: { "@id": `${SITE}/#website` } },
    { "@type": "ItemList", name: "Cẩm nang Cảnh Giác Số", itemListElement: itemList },
    { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Cảnh Giác Số", item: `${SITE}/` }, { "@type": "ListItem", position: 2, name: "Kiến thức", item: `${SITE}/kien-thuc/` }] },
  ] });
  return `<!doctype html><html lang="vi-VN"><head><meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests" /><meta name="referrer" content="strict-origin-when-cross-origin" /><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>Phòng chống lừa đảo & An toàn thông tin | Cảnh Giác Số</title><meta name="description" content="Cẩm nang chống lừa đảo và an toàn thông tin: phishing, QR, deepfake, giả mạo ngân hàng, OTP, bảo vệ tài khoản và xử lý khi bị lừa." /><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" /><link rel="canonical" href="${SITE}/kien-thuc/" /><link rel="alternate" hreflang="vi-VN" href="${SITE}/kien-thuc/" /><link rel="alternate" hreflang="x-default" href="${SITE}/kien-thuc/" /><link rel="stylesheet" href="/seo.css" /><link rel="icon" type="image/png" href="/khien-so-logo.png" /><link rel="apple-touch-icon" href="/khien-so-logo.png" /><meta property="og:type" content="website" /><meta property="og:locale" content="vi_VN" /><meta property="og:site_name" content="Cảnh Giác Số" /><meta property="og:title" content="Phòng chống lừa đảo & An toàn thông tin | Cảnh Giác Số" /><meta property="og:description" content="Cẩm nang thực hành về chống lừa đảo, cảnh giác lừa đảo và bảo vệ an toàn thông tin." /><meta property="og:url" content="${SITE}/kien-thuc/" /><meta property="og:image" content="${SITE}/og.png" /><meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="Phòng chống lừa đảo & An toàn thông tin | Cảnh Giác Số" /><meta name="twitter:description" content="Cẩm nang thực hành chống lừa đảo và bảo vệ an toàn thông tin." /><meta name="twitter:image" content="${SITE}/og.png" /><script type="application/ld+json">${schema}</script></head><body><header class="seo-header"><div class="seo-shell seo-nav"><a class="seo-brand" href="/"><span class="seo-brand-logo" aria-hidden="true"></span><span class="seo-brand-divider" aria-hidden="true"></span><span class="seo-product-lockup"><strong>CẢNH GIÁC SỐ</strong><small>IT SECURITY</small></span></a><nav class="seo-nav-links" aria-label="Điều hướng"><a href="/">Thử thách</a><a href="/kien-thuc/" aria-current="page">Kiến thức</a></nav></div></header><main class="seo-shell"><div class="seo-breadcrumb"><a href="/">Cảnh Giác Số</a> › Kiến thức</div><section class="seo-hero"><span class="seo-eyebrow">Cẩm nang cảnh giác & an toàn số</span><h1>Phòng chống lừa đảo trực tuyến và an toàn thông tin</h1><p>Cảnh Giác Số tổng hợp các hướng dẫn thực hành giúp bạn nhận biết thủ đoạn lừa đảo, kiểm tra thông tin trước khi tin, bảo vệ tài khoản và xử lý khi đã xảy ra sự cố. Nội dung được chia theo từng tình huống cụ thể để bạn có thể tìm đúng hướng dẫn khi gặp email phishing, QR đáng ngờ, cuộc gọi mạo danh, yêu cầu chuyển tiền, ứng dụng lạ hoặc tài khoản bị chiếm quyền.</p><p>Hãy ưu tiên nguyên tắc <strong>Dừng — Kiểm tra — Xác minh — Báo cáo</strong>. Không cần chứng minh chắc chắn người kia là kẻ lừa đảo trước khi từ chối giao dịch; chỉ cần có dấu hiệu bất thường là đủ để dừng và xác minh qua kênh độc lập.</p></section>${sections}<section class="seo-note"><strong>Học để phản xạ đúng khi gặp tình huống thật.</strong><p>Sau khi đọc cẩm nang, hãy quay lại <a href="/">Thử thách Cảnh Giác Số</a> để luyện cách ra quyết định trước các tình huống giả mạo, phishing và lừa đảo trực tuyến.</p></section></main><footer class="seo-footer"><div class="seo-shell"><strong>Cảnh Giác Số</strong><p class="seo-safety">Nội dung phục vụ giáo dục và nâng cao nhận thức an toàn thông tin.</p></div></footer></body></html>`;
}

function sitemapXml() {
  const entries = [
    { url: `${SITE}/`, priority: "1.0", changefreq: "weekly" },
    { url: `${SITE}/kien-thuc/`, priority: "0.9", changefreq: "weekly" },
    ...articles.map((a) => ({ url: `${SITE}/kien-thuc/${a.slug}/`, priority: "0.8", changefreq: "monthly" })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map((e) => `  <url>\n    <loc>${e.url}</loc>\n    <lastmod>${UPDATED}</lastmod>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`).join("\n")}\n</urlset>\n`;
}

for (const article of articles) {
  await write(`public/kien-thuc/${article.slug}/index.html`, articleHtml(article));
  await write(`public/seo-images/${article.slug}.svg`, svgForArticle(article));
}
await write("public/kien-thuc/index.html", hubHtml());
await write("public/sitemap.xml", sitemapXml());
console.log(`Generated ${articles.length} SEO articles, hub, sitemap and article images.`);
