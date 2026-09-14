import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const knowledgeRoot = path.join(ROOT, "public", "kien-thuc");
const entries = await readdir(knowledgeRoot, { withFileTypes: true });
let patched = 0;

for (const entry of entries) {
  if (!entry.isDirectory()) continue;
  const file = path.join(knowledgeRoot, entry.name, "index.html");
  let html;
  try {
    html = await readFile(file, "utf8");
  } catch {
    continue;
  }
  if (html.includes('/phuong-phap-kiem-chung/')) continue;
  const trust = '<p class="seo-safety"><a href="/phuong-phap-kiem-chung/">Phương pháp kiểm chứng & nguyên tắc biên tập</a> · Cách Cảnh Giác Số chọn nguồn, đánh giá tín hiệu và bảo vệ dữ liệu người dùng.</p>';
  if (html.includes('</div></footer>')) {
    html = html.replace('</div></footer>', `${trust}</div></footer>`);
    await writeFile(file, html, "utf8");
    patched += 1;
  }
}

const hubFile = path.join(knowledgeRoot, "index.html");
let hub = await readFile(hubFile, "utf8");
if (!hub.includes('/phuong-phap-kiem-chung/')) {
  hub = hub.replace('</div></footer>', '<p class="seo-safety"><a href="/phuong-phap-kiem-chung/">Phương pháp kiểm chứng & nguyên tắc biên tập</a> · Minh bạch nguồn và giới hạn của công cụ tra cứu.</p></div></footer>');
  await writeFile(hubFile, hub, "utf8");
}

const sitemapHtmlFile = path.join(ROOT, "public", "sitemap", "index.html");
let sitemapHtml = await readFile(sitemapHtmlFile, "utf8");
if (!sitemapHtml.includes('/phuong-phap-kiem-chung/')) {
  sitemapHtml = sitemapHtml.replace('<li><a href="/kien-thuc/">Trung tâm kiến thức</a></li>', '<li><a href="/kien-thuc/">Trung tâm kiến thức</a></li><li><a href="/phuong-phap-kiem-chung/">Phương pháp kiểm chứng & nguyên tắc biên tập</a></li>');
  await writeFile(sitemapHtmlFile, sitemapHtml, "utf8");
}

console.log(`Linked verification methodology from ${patched} knowledge pages plus hub/sitemap.`);
