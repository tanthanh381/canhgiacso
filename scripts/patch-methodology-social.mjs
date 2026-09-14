import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const file = path.join(process.cwd(), "public", "phuong-phap-kiem-chung", "index.html");
let html = await readFile(file, "utf8");
if (!html.includes('property="og:title"')) {
  const meta = '<meta property="og:type" content="website"/><meta property="og:locale" content="vi_VN"/><meta property="og:site_name" content="Cảnh Giác Số"/><meta property="og:title" content="Phương pháp kiểm chứng & nguyên tắc biên tập | Cảnh Giác Số"/><meta property="og:description" content="Cách Cảnh Giác Số kiểm chứng nguồn, đánh giá tín hiệu lừa đảo và bảo vệ dữ liệu người dùng."/><meta property="og:url" content="https://canhgiacso.com/phuong-phap-kiem-chung/"/><meta property="og:image" content="https://canhgiacso.com/og.png"/><meta name="twitter:card" content="summary_large_image"/><meta name="twitter:title" content="Phương pháp kiểm chứng & nguyên tắc biên tập | Cảnh Giác Số"/><meta name="twitter:description" content="Cách Cảnh Giác Số kiểm chứng nguồn, đánh giá tín hiệu lừa đảo và bảo vệ dữ liệu người dùng."/><meta name="twitter:image" content="https://canhgiacso.com/og.png"/>';
  html = html.replace('<link rel="stylesheet" href="/seo.css"/>', `${meta}<link rel="stylesheet" href="/seo.css"/>`);
  await writeFile(file, html, "utf8");
}
console.log("Added Open Graph and Twitter metadata to verification methodology page.");
