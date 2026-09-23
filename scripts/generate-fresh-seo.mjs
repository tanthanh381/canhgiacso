import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SITE = "https://canhgiacso.com";
const UPDATED = "2026-09-14";
const fresh = JSON.parse(await readFile(path.join(ROOT, "seo/articles-fresh.json"), "utf8"));
const esc = (value) => String(value).replace(/[&<>"']/g, (ch) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[ch]);

async function write(relativePath, content) {
  const full = path.join(ROOT, relativePath);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, content, "utf8");
}

function schema(a) {
  const url = `${SITE}/kien-thuc/${a.slug}/`;
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {"@type":"Article","@id":`${url}#article`,headline:a.h1,description:a.meta,datePublished:a.published,dateModified:UPDATED,inLanguage:"vi-VN",mainEntityOfPage:{"@type":"WebPage","@id":url},image:{"@type":"ImageObject",url:`${SITE}/seo-images/${a.slug}.svg`,width:1200,height:630},author:{"@id":`${SITE}/#organization`},publisher:{"@id":`${SITE}/#organization`}},
      {"@type":"Organization","@id":`${SITE}/#organization`,name:"Cảnh Giác Số",url:`${SITE}/`,logo:{"@type":"ImageObject",url:`${SITE}/khien-so-logo.png`}},
      {"@type":"WebSite","@id":`${SITE}/#website`,url:`${SITE}/`,name:"Cảnh Giác Số",inLanguage:"vi-VN"},
      {"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"Cảnh Giác Số",item:`${SITE}/`},{"@type":"ListItem",position:2,name:"Cẩm nang",item:`${SITE}/kien-thuc/`},{"@type":"ListItem",position:3,name:a.h1,item:url}]}
    ]
  });
}

function articleHtml(a) {
  const url = `${SITE}/kien-thuc/${a.slug}/`;
  const sections = a.sections.map(([heading, body]) => `<section><h2>${heading}</h2>${body}</section>`).join("\n");
  const related = a.related.map(([label, href]) => `<li><a href="${href}">${label}</a></li>`).join("");
  return `<!doctype html>
<html lang="vi-VN"><head>
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests" />
<meta name="referrer" content="strict-origin-when-cross-origin" /><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${esc(a.title)}</title><meta name="description" content="${esc(a.meta)}" /><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
<link rel="canonical" href="${url}" /><link rel="alternate" hreflang="vi-VN" href="${url}" /><link rel="alternate" hreflang="x-default" href="${url}" /><link rel="stylesheet" href="/seo.css" /><link rel="icon" type="image/png" href="/khien-so-logo.png" /><link rel="apple-touch-icon" href="/khien-so-logo.png" />
<meta property="og:type" content="article" /><meta property="og:locale" content="vi_VN" /><meta property="og:site_name" content="Cảnh Giác Số" /><meta property="og:title" content="${esc(a.title)}" /><meta property="og:description" content="${esc(a.meta)}" /><meta property="og:url" content="${url}" /><meta property="og:image" content="${SITE}/seo-images/${a.slug}.svg" /><meta property="article:published_time" content="${a.published}" /><meta property="article:modified_time" content="${UPDATED}" />
<meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="${esc(a.title)}" /><meta name="twitter:description" content="${esc(a.meta)}" /><meta name="twitter:image" content="${SITE}/seo-images/${a.slug}.svg" /><script type="application/ld+json">${schema(a)}</script>
</head><body>
<header class="seo-header"><div class="seo-shell seo-nav"><a class="seo-brand" href="/"><span class="seo-brand-logo" aria-hidden="true"></span><span class="seo-brand-divider" aria-hidden="true"></span><span class="seo-product-lockup"><strong>CẢNH GIÁC SỐ</strong><small>IT SECURITY</small></span></a><nav class="seo-nav-links" aria-label="Điều hướng"><a href="/">Thử thách</a><a href="/kien-thuc/" aria-current="page">Cẩm nang</a></nav></div></header>
<main class="seo-article"><div class="seo-breadcrumb"><a href="/">Cảnh Giác Số</a> › <a href="/kien-thuc/">Cẩm nang</a> › ${esc(a.eyebrow)}</div><span class="seo-eyebrow">${esc(a.eyebrow)}</span><h1>${esc(a.h1)}</h1><p class="lead">${esc(a.lead)}</p><div class="seo-meta">Cập nhật ngày 14/09/2026 · Cảnh báo và hướng dẫn thực hành an toàn số</div><div class="seo-note"><strong>Nguyên tắc an toàn:</strong><p>Khi yêu cầu liên quan đến tiền, mật khẩu, OTP, cài ứng dụng hoặc dữ liệu nhạy cảm, hãy dừng kênh đang liên hệ và xác minh lại bằng một nguồn độc lập.</p></div>${sections}<section class="seo-related"><h2>Đọc tiếp</h2><ul>${related}<li><a href="/kien-thuc/">Xem toàn bộ Cẩm nang Cảnh Giác Số</a></li></ul></section></main>
<footer class="seo-footer"><div class="seo-shell"><strong>Cảnh Giác Số</strong><p class="seo-safety">Nội dung phục vụ giáo dục và phòng ngừa rủi ro. Không một kết quả tra cứu công khai đơn lẻ nào có thể chứng nhận một chủ thể chắc chắn an toàn.</p></div></footer>
</body></html>`;
}

function svg(a) {
  const words = a.h1.split(/\s+/); const lines = []; let line = "";
  for (const word of words) { const next = `${line} ${word}`.trim(); if (next.length <= 42) line = next; else { if (line) lines.push(line); line = word; } }
  if (line) lines.push(line);
  const tspans = lines.slice(0,3).map((text, index) => `<tspan x="110" dy="${index === 0 ? 0 : 68}">${esc(text)}</tspan>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img"><rect width="1200" height="630" fill="#fff7f8"/><rect x="60" y="60" width="1080" height="510" rx="34" fill="#fff" stroke="#be1128" stroke-width="6"/><text x="110" y="155" font-family="Arial,sans-serif" font-size="42" font-weight="700" fill="#be1128">CẢNH GIÁC SỐ</text><text x="110" y="300" font-family="Arial,sans-serif" font-size="50" font-weight="700" fill="#1f2937">${tspans}</text><text x="110" y="530" font-family="Arial,sans-serif" font-size="27" fill="#4b5563">Dừng · Kiểm tra · Xác minh độc lập</text></svg>`;
}

async function patchSitemap() {
  const file = path.join(ROOT, "public/sitemap.xml");
  let xml = await readFile(file, "utf8");
  const entries = fresh.map((a) => `  <url>\n    <loc>${SITE}/kien-thuc/${a.slug}/</loc>\n    <lastmod>${UPDATED}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>`).join("\n");
  xml = xml.replace("</urlset>", `${entries}\n</urlset>`);
  await write("public/sitemap.xml", xml);
}

async function patchHub() {
  const file = path.join(ROOT, "public/kien-thuc/index.html");
  let html = await readFile(file, "utf8");
  const cards = fresh.map((a) => `<a class="seo-card" href="/kien-thuc/${a.slug}/"><small>${esc(a.eyebrow)}</small><h3>${esc(a.h1)}</h3><p>${esc(a.lead)}</p></a>`).join("");
  const block = `<section><h2>Cảnh báo đang được quan tâm</h2><p>Các kịch bản dưới đây bám sát những cảnh báo mới trong năm 2026 và các truy vấn người dùng thường tìm khi nhận được cuộc gọi, SMS hoặc yêu cầu hoàn tiền đáng ngờ.</p><div class="seo-grid">${cards}</div></section>`;
  html = html.replace("<section class=\"seo-note\">", `${block}<section class="seo-note">`);
  await write("public/kien-thuc/index.html", html);
}

async function rewriteHtmlSitemap() {
  const names = ["articles-core.json", "articles-longtail.json", "articles-intent.json", "articles-fresh.json"];
  const groups = await Promise.all(names.map((name) => readFile(path.join(ROOT, "seo", name), "utf8").then(JSON.parse)));
  const all = groups.flat();
  const links = all.map((a) => `<li><a href="/kien-thuc/${a.slug}/">${esc(a.h1)}</a></li>`).join("");
  await write("public/sitemap/index.html", `<!doctype html><html lang="vi-VN"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Sơ đồ nội dung Cảnh Giác Số</title><meta name="description" content="Sơ đồ nội dung Cảnh Giác Số về chống lừa đảo, tra cứu lừa đảo, cảnh báo mới và an toàn thông tin."/><meta name="robots" content="index,follow"/><link rel="canonical" href="${SITE}/sitemap/"/><link rel="stylesheet" href="/seo.css"/></head><body><main class="seo-article"><h1>Sơ đồ nội dung Cảnh Giác Số</h1><p class="lead">Danh sách đầy đủ các hướng dẫn chống lừa đảo, tra cứu thông tin đáng ngờ và bảo vệ tài khoản.</p><ul class="seo-checklist"><li><a href="/">Trang chủ</a></li><li><a href="/kien-thuc/">Cẩm nang</a></li>${links}</ul></main></body></html>`);
}

async function rewriteRss() {
  const names = ["articles-core.json", "articles-longtail.json", "articles-intent.json", "articles-fresh.json"];
  const groups = await Promise.all(names.map((name) => readFile(path.join(ROOT, "seo", name), "utf8").then(JSON.parse)));
  const all = groups.flat();
  const items = all.map((a) => `<item><title>${esc(a.title)}</title><link>${SITE}/kien-thuc/${a.slug}/</link><guid>${SITE}/kien-thuc/${a.slug}/</guid><pubDate>Mon, 14 Sep 2026 00:00:00 GMT</pubDate><description>${esc(a.meta)}</description></item>`).join("");
  await write("public/feed.xml", `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Cảnh Giác Số</title><link>${SITE}/</link><description>Cảnh báo, tra cứu và hướng dẫn chống lừa đảo trực tuyến</description><language>vi-VN</language>${items}</channel></rss>`);
}

for (const article of fresh) {
  await write(`public/kien-thuc/${article.slug}/index.html`, articleHtml(article));
  await write(`public/seo-images/${article.slug}.svg`, svg(article));
}
await patchSitemap();
await patchHub();
await rewriteHtmlSitemap();
await rewriteRss();
console.log(`Generated ${fresh.length} fresh-intent SEO pages and refreshed discovery feeds.`);
