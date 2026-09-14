import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const file = path.join(process.cwd(), "github-pages", "index.html");
let html = await readFile(file, "utf8");

if (!html.includes('href="/feed.xml"')) {
  html = html.replace('<link rel="preload" href="/khien-so-logo.png" as="image" />', '<link rel="preload" href="/khien-so-logo.png" as="image" />\n    <link rel="alternate" type="application/rss+xml" title="Cảnh Giác Số" href="/feed.xml" />');
}

if (!html.includes('id="seo-lookup"')) {
  const block = `\n        <section aria-labelledby="seo-lookup">\n          <h2 id="seo-lookup">Tra cứu lừa đảo trước khi giao dịch</h2>\n          <p>Khi nhận cuộc gọi lạ, được yêu cầu chuyển khoản hoặc nhận một đường link đáng ngờ, hãy kiểm tra chéo trước khi hành động. Cảnh Giác Số có các hướng dẫn riêng cho từng loại thông tin để bạn tự xác minh bằng nhiều nguồn độc lập.</p>\n          <ul>\n            <li><a href="/kien-thuc/tra-cuu-lua-dao/">Tra cứu lừa đảo: số điện thoại, tài khoản và link giả mạo</a></li>\n            <li><a href="/kien-thuc/kiem-tra-so-dien-thoai-lua-dao/">Kiểm tra số điện thoại lừa đảo</a></li>\n            <li><a href="/kien-thuc/tra-cuu-so-tai-khoan-lua-dao/">Tra cứu số tài khoản lừa đảo trước khi chuyển tiền</a></li>\n            <li><a href="/kien-thuc/25-kich-ban-lua-dao-2026/">25 kịch bản lừa đảo năm 2026 cần cảnh giác</a></li>\n          </ul>\n        </section>`;
  html = html.replace('        <section aria-labelledby="seo-purpose">', `${block}\n        <section aria-labelledby="seo-purpose">`);
}

await writeFile(file, html, "utf8");
console.log("Added homepage discovery links for high-intent organic pages.");
