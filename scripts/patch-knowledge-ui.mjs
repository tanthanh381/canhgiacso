import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const KNOWLEDGE_DIR = path.join(ROOT, "public", "kien-thuc");

async function htmlFiles(dir) {
  const entries = await readdir(dir);
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const info = await stat(full);
    if (info.isDirectory()) files.push(...await htmlFiles(full));
    else if (entry.endsWith(".html")) files.push(full);
  }
  return files;
}

const files = await htmlFiles(KNOWLEDGE_DIR);
let changed = 0;
for (const file of files) {
  let html = await readFile(file, "utf8");
  const before = html;

  html = html
    .replaceAll(
      '<img src="/khien-so-logo.png" alt="Logo Cảnh Giác Số" width="42" height="42" /><span>Cảnh Giác Số</span>',
      '<span class="seo-brand-logo" aria-hidden="true"></span><span class="seo-brand-lockup">Cảnh Giác Số</span>',
    )
    .replaceAll(
      '<img src="/khien-so-logo.png" alt="Logo Cảnh Giác Số" width="54" height="54" /><span>Cảnh Giác Số</span>',
      '<span class="seo-brand-logo" aria-hidden="true"></span><span class="seo-brand-lockup">Cảnh Giác Số</span>',
    )
    .replaceAll(
      '<img src="/canh-giac-so-mark.svg" alt="Logo Cảnh Giác Số" width="42" height="42" /><span>Cảnh Giác Số</span>',
      '<span class="seo-brand-logo" aria-hidden="true"></span><span class="seo-brand-lockup">Cảnh Giác Số</span>',
    )
    .replaceAll(
      '<img src="/canh-giac-so-mark.svg" alt="Logo Cảnh Giác Số" width="54" height="54" /><span>Cảnh Giác Số</span>',
      '<span class="seo-brand-logo" aria-hidden="true"></span><span class="seo-brand-lockup">Cảnh Giác Số</span>',
    )
    .replaceAll('<a href="/kien-thuc/">Kiến thức</a></nav>', '<a href="/kien-thuc/" aria-current="page">Cẩm nang</a></nav>')
    .replaceAll('› <a href="/kien-thuc/">Kiến thức</a> ›', '› <a href="/kien-thuc/">Cẩm nang</a> ›');

  if (html !== before) {
    await writeFile(file, html, "utf8");
    changed += 1;
  }
}

console.log(`Normalized homepage BrandMark shell for ${changed}/${files.length} knowledge pages.`);
