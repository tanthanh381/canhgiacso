import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public");
const HOME = path.join(ROOT, "github-pages", "index.html");
const SITE = "https://canhgiacso.com";
const UPDATED = "2026-09-23";
const UPDATED_LABEL = "23/09/2026";

async function exists(file) {
  try {
    await readFile(file);
    return true;
  } catch {
    return false;
  }
}

async function read(relative) {
  return readFile(path.join(PUBLIC, relative), "utf8");
}

async function write(relative, html) {
  await writeFile(path.join(PUBLIC, relative), html, "utf8");
}

function replaceTag(html, pattern, replacement) {
  return pattern.test(html) ? html.replace(pattern, replacement) : html;
}

function syncHead(html, config) {
  html = replaceTag(html, /<title>[\s\S]*?<\/title>/i, `<title>${config.title}</title>`);
  html = replaceTag(
    html,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${config.description}" />`,
  );
  html = replaceTag(
    html,
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${config.title}" />`,
  );
  html = replaceTag(
    html,
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${config.description}" />`,
  );
  html = replaceTag(
    html,
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${config.title}" />`,
  );
  html = replaceTag(
    html,
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${config.description}" />`,
  );
  if (!/name="author"/i.test(html)) {
    html = html.replace("</head>", '  <meta name="author" content="Cảnh Giác Số" />\n</head>');
  }
  if (!/property="article:modified_time"/i.test(html)) {
    html = html.replace(
      "</head>",
      `  <meta property="article:modified_time" content="${UPDATED}T00:00:00+07:00" />\n</head>`,
    );
  } else {
    html = html.replace(
      /<meta\s+property="article:modified_time"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="article:modified_time" content="${UPDATED}T00:00:00+07:00" />`,
    );
  }
  return html;
}

function syncBody(html, config) {
  html = replaceTag(html, /<h1>[\s\S]*?<\/h1>/i, `<h1>${config.h1}</h1>`);

  const answer = `<section class="seo-answer-box" aria-label="Trả lời nhanh"><strong>Trả lời nhanh</strong><p>${config.answer}</p></section>`;
  if (/<section class="seo-answer-box"[\s\S]*?<\/section>/i.test(html)) {
    html = html.replace(/<section class="seo-answer-box"[\s\S]*?<\/section>/i, answer);
  } else {
    const lead = html.match(/<p class="lead">[\s\S]*?<\/p>/i)?.[0];
    if (lead) html = html.replace(lead, `${lead}\n${answer}`);
  }

  const meta = `<div class="seo-meta">Cập nhật: <time datetime="${UPDATED}">${UPDATED_LABEL}</time> · ${config.metaNote}</div>`;
  if (/<div class="seo-meta">[\s\S]*?<\/div>/i.test(html)) {
    html = html.replace(/<div class="seo-meta">[\s\S]*?<\/div>/i, meta);
  } else {
    html = html.replace(answer, `${answer}\n${meta}`);
  }

  if (!html.includes(`data-seo-wave8="${config.slug}"`)) {
    const related = `<section class="seo-search-cluster" data-seo-wave8="${config.slug}"><h2>${config.clusterTitle}</h2><p>${config.clusterIntro}</p><ul>${config.links.map((item) => `<li><a href="${item.href}">${item.label}</a></li>`).join("")}</ul></section>`;
    html = html.replace(/<section class="seo-related">/i, `${related}\n<section class="seo-related">`);
  }

  return html;
}

function syncSchema(html, config) {
  return html.replace(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/i,
    (full, raw) => {
      try {
        const schema = JSON.parse(raw);
        const graph = Array.isArray(schema?.["@graph"]) ? schema["@graph"] : [];
        const article = graph.find((node) => node?.["@type"] === "Article");
        if (!article) return full;
        article.headline = config.h1;
        article.description = config.description;
        article.dateModified = UPDATED;
        article.author = { "@id": `${SITE}/#organization` };
        article.publisher = { "@id": `${SITE}/#organization` };
        schema["@graph"] = graph;
        return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
      } catch {
        return full;
      }
    },
  );
}

const targets = [
  {
    slug: "kiem-tra-so-dien-thoai-lua-dao",
    title: "Kiểm tra số điện thoại lừa đảo: 7 cách tra cứu số lạ",
    description: "Kiểm tra số điện thoại lừa đảo hoặc số lạ bằng Google, nguồn công khai và xác minh độc lập. 7 cách tra cứu trước khi nghe theo yêu cầu chuyển tiền.",
    h1: "Kiểm tra số điện thoại lừa đảo: 7 cách tra cứu số lạ trước khi tin",
    answer: "Không có một danh sách nào chứng minh tuyệt đối một số điện thoại là an toàn. Hãy tra cứu số chính xác, đối chiếu nhiều nguồn và tự gọi lại kênh chính thức của tổ chức bị mạo danh.",
    metaNote: "Hướng dẫn tra cứu đa nguồn, không gắn nhãn chỉ từ một tín hiệu",
    clusterTitle: "Xác minh theo kiểu cuộc gọi",
    clusterIntro: "Sau khi tra cứu số, hãy đối chiếu tiếp theo danh tính mà người gọi tự nhận.",
    links: [
      { href: "/kien-thuc/gia-mao-cong-an-co-quan-nha-nuoc/", label: "Cuộc gọi tự xưng công an hoặc cơ quan nhà nước" },
      { href: "/kien-thuc/gia-mao-ngan-hang/", label: "Cuộc gọi hoặc tin nhắn tự xưng ngân hàng" },
      { href: "/kien-thuc/lua-dao-shipper-giao-hang/", label: "Cuộc gọi tự xưng shipper, đơn vị giao hàng" },
    ],
  },
  {
    slug: "kiem-tra-link-gia-mao",
    title: "Kiểm tra link lừa đảo: 6 dấu hiệu trước khi bấm",
    description: "Kiểm tra link lừa đảo và website giả mạo trước khi bấm: 6 dấu hiệu về tên miền, URL rút gọn, HTTPS, đăng nhập, file tải xuống và kênh xác minh.",
    h1: "Kiểm tra link lừa đảo: 6 dấu hiệu cần xem trước khi bấm",
    answer: "Đọc tên miền thật, mở rộng URL rút gọn, không xem HTTPS là bằng chứng an toàn và tự mở website chính thức thay vì đăng nhập từ link được gửi qua SMS, email hoặc chat.",
    metaNote: "Checklist 6 tín hiệu trước khi mở hoặc đăng nhập",
    clusterTitle: "Nếu link thuộc một kịch bản giả mạo cụ thể",
    clusterIntro: "Tên miền chỉ là một lớp kiểm tra; hãy đối chiếu thêm bối cảnh và yêu cầu đi kèm.",
    links: [
      { href: "/kien-thuc/phishing-la-gi/", label: "Phishing là gì và vì sao link giả có thể rất giống thật?" },
      { href: "/kien-thuc/nhan-dien-email-phishing/", label: "Nhận diện email phishing và link đăng nhập giả" },
      { href: "/kien-thuc/lua-dao-vneid-gia-mao/", label: "Link và ứng dụng giả mạo VNeID" },
    ],
  },
  {
    slug: "lua-dao-cong-tac-vien-viec-nhe-luong-cao",
    title: "Lừa đảo cộng tác viên online: Dấu hiệu cần dừng ngay",
    description: "Nhận biết lừa đảo cộng tác viên online, làm nhiệm vụ nhận hoa hồng và việc nhẹ lương cao: nạp tiền trước, lợi nhuận ảo, khóa rút tiền và yêu cầu nạp thêm.",
    h1: "Lừa đảo cộng tác viên online: dấu hiệu việc nhẹ lương cao cần dừng ngay",
    answer: "Dấu hiệu nguy hiểm nhất là phải nạp tiền để mở nhiệm vụ, nâng cấp đơn hoặc mở khóa rút tiền. Khi gặp mô hình này, dừng nạp thêm và lưu toàn bộ bằng chứng giao dịch.",
    metaNote: "Nhận diện trước khi nạp tiền hoặc làm nhiệm vụ",
    clusterTitle: "Bạn đang ở giai đoạn nào?",
    clusterIntro: "Nếu đã nạp tiền hoặc không rút được tiền, ưu tiên xử lý sự cố thay vì tiếp tục làm nhiệm vụ.",
    links: [
      { href: "/kien-thuc/lua-dao-viec-nhe-luong-cao/", label: "Đã nạp tiền vào việc nhẹ lương cao: cách dừng và xử lý" },
      { href: "/kien-thuc/lua-dao-tuyen-dung-online/", label: "Kiểm tra tin tuyển dụng online trước khi nộp phí" },
      { href: "/kien-thuc/xu-ly-khi-bi-lua-dao-chuyen-tien/", label: "Đã chuyển tiền cho đối tượng lừa đảo: các bước cần làm ngay" },
    ],
  },
  {
    slug: "gia-mao-ngan-hang",
    title: "Giả mạo ngân hàng: 6 dấu hiệu và cách xử lý an toàn",
    description: "Nhận biết giả mạo ngân hàng qua cuộc gọi, SMS, email, link và app giả. 6 dấu hiệu cần dừng lại, cách xác minh và xử lý nếu đã lộ thông tin.",
    h1: "Giả mạo ngân hàng: 6 dấu hiệu và cách xử lý an toàn",
    answer: "Ngân hàng thật không cần bạn đọc OTP, mật khẩu hay PIN cho người gọi đến. Khi có yêu cầu khẩn cấp, ngắt liên lạc và tự mở ứng dụng hoặc gọi số chính thức của ngân hàng để kiểm tra.",
    metaNote: "6 dấu hiệu mạo danh và quy trình xác minh độc lập",
    clusterTitle: "Nếu đã cung cấp thông tin hoặc chuyển tiền",
    clusterIntro: "Khi sự cố đã xảy ra, tốc độ khóa rủi ro và lưu bằng chứng quan trọng hơn việc tiếp tục tranh luận với người liên hệ.",
    links: [
      { href: "/kien-thuc/lua-dao-ngan-hang/", label: "Đã lộ OTP, mật khẩu hoặc nghi tài khoản ngân hàng bị chiếm" },
      { href: "/kien-thuc/xu-ly-khi-bi-lua-dao-chuyen-tien/", label: "Đã chuyển tiền: 5 bước cần làm ngay" },
      { href: "/kien-thuc/kiem-tra-link-gia-mao/", label: "Kiểm tra link đăng nhập hoặc website ngân hàng giả" },
    ],
  },
  {
    slug: "xu-ly-khi-bi-lua-dao-chuyen-tien",
    title: "Bị lừa chuyển tiền phải làm gì? 5 bước cần làm ngay",
    description: "Bị lừa chuyển tiền phải làm gì: 5 bước ưu tiên gồm dừng chuyển thêm, gọi ngân hàng, bảo vệ tài khoản, lưu bằng chứng và trình báo càng sớm càng tốt.",
    h1: "Bị lừa chuyển tiền phải làm gì? 5 bước cần làm ngay",
    answer: "Dừng chuyển thêm tiền, gọi ngân hàng qua kênh chính thức để báo giao dịch, bảo vệ tài khoản có thể đã lộ, lưu toàn bộ chứng cứ và trình báo càng sớm càng tốt.",
    metaNote: "Thứ tự ưu tiên sau khi phát hiện giao dịch bị lừa",
    clusterTitle: "Xử lý theo loại rủi ro đã xảy ra",
    clusterIntro: "Ngoài giao dịch tiền, hãy kiểm tra xem mật khẩu, OTP, thiết bị hoặc thông tin cá nhân có bị lộ hay không.",
    links: [
      { href: "/kien-thuc/lua-dao-ngan-hang/", label: "Nghi tài khoản ngân hàng hoặc OTP đã bị lộ" },
      { href: "/kien-thuc/tai-khoan-bi-hack-phai-lam-gi/", label: "Tài khoản online bị chiếm quyền kiểm soát" },
      { href: "/kien-thuc/tra-cuu-so-tai-khoan-lua-dao/", label: "Tra cứu thông tin tài khoản nhận tiền và lưu bằng chứng" },
    ],
  },
  {
    slug: "phishing-la-gi",
    title: "Phishing là gì? 8 dấu hiệu và cách phòng tránh",
    description: "Phishing là gì, hoạt động thế nào và 8 dấu hiệu nhận biết email, SMS, website giả mạo. Cách xử lý an toàn nếu đã bấm link hoặc nhập mật khẩu, OTP.",
    h1: "Phishing là gì? 8 dấu hiệu nhận biết và cách phòng tránh",
    answer: "Phishing là hình thức giả mạo nguồn đáng tin cậy để dụ bạn cung cấp thông tin, bấm link hoặc cài phần mềm. Email, SMS, cuộc gọi, mã QR và website giả đều có thể là kênh phishing.",
    metaNote: "Định nghĩa, 8 dấu hiệu và hướng xử lý theo tình huống",
    clusterTitle: "Đi sâu theo kênh phishing",
    clusterIntro: "Sau khi hiểu khái niệm, hãy chuyển sang checklist phù hợp với kênh mà bạn đang gặp.",
    links: [
      { href: "/kien-thuc/nhan-dien-email-phishing/", label: "Phishing qua email và trang đăng nhập giả" },
      { href: "/kien-thuc/kiem-tra-link-gia-mao/", label: "Kiểm tra link lừa đảo trước khi bấm" },
      { href: "/kien-thuc/lua-dao-otp-chiem-doat-tai-khoan/", label: "Phishing kết hợp đánh cắp OTP và chiếm tài khoản" },
    ],
  },
];

for (const config of targets) {
  const relative = `kien-thuc/${config.slug}/index.html`;
  const file = path.join(PUBLIC, relative);
  if (!(await exists(file))) continue;
  let html = await read(relative);
  html = syncHead(html, config);
  html = syncBody(html, config);
  html = syncSchema(html, config);
  await write(relative, html);
}

if (await exists(HOME)) {
  let home = await readFile(HOME, "utf8");
  const anchors = [
    ["Giả mạo ngân hàng và cách bảo vệ tài khoản", "Giả mạo ngân hàng: 6 dấu hiệu và cách xử lý an toàn"],
    ["Cách kiểm tra link và website giả mạo", "Kiểm tra link lừa đảo: 6 dấu hiệu trước khi bấm"],
    ["Bị lừa chuyển tiền phải làm gì ngay?", "Bị lừa chuyển tiền: 5 bước cần làm ngay"],
    ["Kiểm tra số điện thoại lừa đảo", "Kiểm tra số điện thoại lừa đảo: 7 cách tra cứu số lạ"],
  ];
  for (const [before, after] of anchors) home = home.replace(before, after);
  if (!home.includes("/kien-thuc/lua-dao-cong-tac-vien-viec-nhe-luong-cao/")) {
    home = home.replace(
      '<li><a href="/kien-thuc/deepfake-gia-giong-nguoi-than/">Deepfake giả giọng người thân</a></li>',
      '<li><a href="/kien-thuc/deepfake-gia-giong-nguoi-than/">Deepfake giả giọng người thân</a></li><li><a href="/kien-thuc/lua-dao-cong-tac-vien-viec-nhe-luong-cao/">Lừa đảo cộng tác viên online, việc nhẹ lương cao</a></li>',
    );
  }
  await writeFile(HOME, home, "utf8");
}

let sitemap = await read("sitemap.xml");
for (const config of targets) {
  const loc = `<loc>${SITE}/kien-thuc/${config.slug}/</loc>`;
  const locIndex = sitemap.indexOf(loc);
  if (locIndex < 0) continue;
  const start = sitemap.indexOf("<lastmod>", locIndex);
  const end = sitemap.indexOf("</lastmod>", start);
  if (start < 0 || end < 0) continue;
  sitemap = sitemap.slice(0, start + "<lastmod>".length) + UPDATED + sitemap.slice(end);
}
await write("sitemap.xml", sitemap);

console.log(`SEO CTR Wave 8: optimized ${targets.length} priority SERP snippets, corrected count-to-content mismatches and strengthened contextual internal links.`);
