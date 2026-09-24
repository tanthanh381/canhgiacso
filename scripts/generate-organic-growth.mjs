import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SITE = "https://canhgiacso.com";
const UPDATED = "2026-09-14";
const articles = JSON.parse(await readFile(path.join(ROOT, "seo/articles-intent.json"), "utf8"));
const esc = (value) => String(value).replace(/[&<>"']/g, (ch) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[ch]);

async function write(relativePath, content) {
  const full = path.join(ROOT, relativePath);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, content, "utf8");
}

function schema(a) {
  const url = `${SITE}/kien-thuc/${a.slug}/`;
  return JSON.stringify({
    "@context":"https://schema.org",
    "@graph":[
      {"@type":"Article","@id":`${url}#article`,headline:a.h1,description:a.meta,datePublished:a.published,dateModified:UPDATED,inLanguage:"vi-VN",mainEntityOfPage:{"@type":"WebPage","@id":url},image:{"@type":"ImageObject",url:`${SITE}/seo-images/${a.slug}.svg`,width:1200,height:630},author:{"@id":`${SITE}/#organization`},publisher:{"@id":`${SITE}/#organization`}},
      {"@type":"Organization","@id":`${SITE}/#organization`,name:"Cảnh Giác Số",url:`${SITE}/`,logo:{"@type":"ImageObject",url:`${SITE}/khien-so-logo.png`}},
      {"@type":"WebSite","@id":`${SITE}/#website`,url:`${SITE}/`,name:"Cảnh Giác Số",inLanguage:"vi-VN"},
      {"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"Cảnh Giác Số",item:`${SITE}/`},{"@type":"ListItem",position:2,name:"Kiến thức",item:`${SITE}/kien-thuc/`},{"@type":"ListItem",position:3,name:a.h1,item:url}]}
    ]
  });
}

function articleHtml(a) {
  const url = `${SITE}/kien-thuc/${a.slug}/`;
  const sections = a.sections.map(([h,b]) => `<section><h2>${h}</h2>${b}</section>`).join("\n");
  const related = a.related.map(([label,href]) => `<li><a href="${href}">${label}</a></li>`).join("");
  return `<!doctype html>
<html lang="vi-VN"><head>
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests" />
<meta name="referrer" content="strict-origin-when-cross-origin" /><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${esc(a.title)}</title><meta name="description" content="${esc(a.meta)}" /><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
<link rel="canonical" href="${url}" /><link rel="alternate" hreflang="vi-VN" href="${url}" /><link rel="alternate" hreflang="x-default" href="${url}" /><link rel="stylesheet" href="/seo.css" /><link rel="icon" type="image/png" sizes="96x96" href="/favicon.png" /><link rel="apple-touch-icon" href="/favicon.png" />
<meta property="og:type" content="article" /><meta property="og:locale" content="vi_VN" /><meta property="og:site_name" content="Cảnh Giác Số" /><meta property="og:title" content="${esc(a.title)}" /><meta property="og:description" content="${esc(a.meta)}" /><meta property="og:url" content="${url}" /><meta property="og:image" content="${SITE}/seo-images/${a.slug}.svg" /><meta property="article:published_time" content="${a.published}" /><meta property="article:modified_time" content="${UPDATED}" />
<meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="${esc(a.title)}" /><meta name="twitter:description" content="${esc(a.meta)}" /><meta name="twitter:image" content="${SITE}/seo-images/${a.slug}.svg" /><script type="application/ld+json">${schema(a)}</script>
</head><body>
<header class="seo-header"><div class="seo-shell seo-nav"><a class="seo-brand" href="/"><img src="/khien-so-logo.png" alt="Logo Cảnh Giác Số" width="42" height="42" /><span>Cảnh Giác Số</span></a><nav class="seo-nav-links" aria-label="Điều hướng"><a href="/">Thử thách</a><a href="/kien-thuc/">Kiến thức</a></nav></div></header>
<main class="seo-article"><div class="seo-breadcrumb"><a href="/">Cảnh Giác Số</a> › <a href="/kien-thuc/">Kiến thức</a> › ${esc(a.eyebrow)}</div><span class="seo-eyebrow">${esc(a.eyebrow)}</span><h1>${esc(a.h1)}</h1><p class="lead">${esc(a.lead)}</p><div class="seo-meta">Cập nhật ngày 14/09/2026 · Hướng dẫn thực hành an toàn số</div><div class="seo-note"><strong>Lưu ý quan trọng:</strong><p>Kết quả tra cứu công khai chỉ là tín hiệu hỗ trợ. Không tìm thấy cảnh báo không có nghĩa một số điện thoại, tài khoản hoặc website chắc chắn an toàn.</p></div>${sections}<section class="seo-related"><h2>Đọc tiếp</h2><ul>${related}<li><a href="/kien-thuc/">Xem toàn bộ cẩm nang Cảnh Giác Số</a></li></ul></section></main>
<footer class="seo-footer"><div class="seo-shell"><strong>Cảnh Giác Số</strong><p class="seo-safety">Nội dung phục vụ giáo dục, tra cứu và nâng cao nhận thức; không phải chứng nhận một chủ thể an toàn hay gian lận.</p></div></footer>
</body></html>`;
}

function svg(a) {
  const words = a.h1.split(/\s+/); const lines=[]; let line="";
  for (const word of words) { const next=`${line} ${word}`.trim(); if(next.length<=42) line=next; else { if(line) lines.push(line); line=word; } }
  if(line) lines.push(line);
  const tspans=lines.slice(0,3).map((t,i)=>`<tspan x="110" dy="${i===0?0:68}">${esc(t)}</tspan>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img"><rect width="1200" height="630" fill="#fff7f8"/><rect x="60" y="60" width="1080" height="510" rx="34" fill="#fff" stroke="#be1128" stroke-width="6"/><text x="110" y="155" font-family="Arial,sans-serif" font-size="42" font-weight="700" fill="#be1128">CẢNH GIÁC SỐ</text><text x="110" y="300" font-family="Arial,sans-serif" font-size="50" font-weight="700" fill="#1f2937">${tspans}</text><text x="110" y="530" font-family="Arial,sans-serif" font-size="27" fill="#4b5563">Tra cứu · Kiểm tra chéo · Xác minh độc lập</text></svg>`;
}

async function patchSitemap() {
  const file = path.join(ROOT,"public/sitemap.xml");
  let xml = await readFile(file,"utf8");
  const entries = articles.map(a => `  <url>\n    <loc>${SITE}/kien-thuc/${a.slug}/</loc>\n    <lastmod>${UPDATED}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.9</priority>\n  </url>`).join("\n");
  xml = xml.replace("</urlset>", `${entries}\n</urlset>`);
  await write("public/sitemap.xml", xml);
}

async function patchHub() {
  const file = path.join(ROOT,"public/kien-thuc/index.html");
  let html = await readFile(file,"utf8");
  const cards = articles.map(a => `<a class="seo-card" href="/kien-thuc/${a.slug}/"><small>${esc(a.eyebrow)}</small><h3>${esc(a.h1)}</h3><p>${esc(a.lead)}</p></a>`).join("");
  const section = `<section><h2>Tra cứu & truy vấn người dùng tìm nhiều</h2><p>Nhóm nội dung này trả lời trực tiếp các câu hỏi người dùng thường tìm trước khi chuyển tiền, trả lời cuộc gọi hoặc bấm vào một đường link đáng ngờ.</p><div class="seo-grid">${cards}</div></section>`;
  html = html.replace("<section class=\"seo-note\">", `${section}<section class="seo-note">`);
  await write("public/kien-thuc/index.html", html);
}

async function htmlSitemap() {
  const base = JSON.parse(await readFile(path.join(ROOT,"seo/articles-core.json"),"utf8"));
  const longtail = JSON.parse(await readFile(path.join(ROOT,"seo/articles-longtail.json"),"utf8"));
  const all=[...base,...longtail,...articles];
  const links=all.map(a=>`<li><a href="/kien-thuc/${a.slug}/">${esc(a.h1)}</a></li>`).join("");
  await write("public/sitemap/index.html", `<!doctype html><html lang="vi-VN"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Sơ đồ nội dung Cảnh Giác Số</title><meta name="description" content="Sơ đồ toàn bộ nội dung Cảnh Giác Số về chống lừa đảo, tra cứu lừa đảo và an toàn thông tin."/><meta name="robots" content="index,follow"/><link rel="canonical" href="${SITE}/sitemap/"/><link rel="stylesheet" href="/seo.css"/></head><body><main class="seo-article"><h1>Sơ đồ nội dung Cảnh Giác Số</h1><p class="lead">Danh sách các hướng dẫn chống lừa đảo, tra cứu thông tin đáng ngờ và bảo vệ tài khoản.</p><ul class="seo-checklist"><li><a href="/">Trang chủ</a></li><li><a href="/kien-thuc/">Trung tâm kiến thức</a></li>${links}</ul></main></body></html>`);
}

async function rss() {
  const items=articles.map(a=>`<item><title>${esc(a.title)}</title><link>${SITE}/kien-thuc/${a.slug}/</link><guid>${SITE}/kien-thuc/${a.slug}/</guid><pubDate>Mon, 14 Sep 2026 00:00:00 GMT</pubDate><description>${esc(a.meta)}</description></item>`).join("");
  await write("public/feed.xml", `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Cảnh Giác Số</title><link>${SITE}/</link><description>Cảnh báo, tra cứu và hướng dẫn chống lừa đảo trực tuyến</description><language>vi-VN</language>${items}</channel></rss>`);
}

for (const a of articles) { await write(`public/kien-thuc/${a.slug}/index.html`, articleHtml(a)); await write(`public/seo-images/${a.slug}.svg`, svg(a)); }
await patchSitemap();
await patchHub();
await htmlSitemap();
await rss();
console.log(`Generated ${articles.length} high-intent organic pages, HTML sitemap and RSS feed.`);
