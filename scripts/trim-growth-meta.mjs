import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const articles = JSON.parse(await readFile(path.join(ROOT, "seo/articles-intent.json"), "utf8"));

function truncate(value, max = 155) {
  if (value.length <= max) return value;
  const clipped = value.slice(0, max + 1);
  const boundary = clipped.lastIndexOf(" ");
  return `${clipped.slice(0, boundary > 120 ? boundary : max).replace(/[,:;\s]+$/u, "")}…`;
}

for (const article of articles) {
  const file = path.join(ROOT, "public", "kien-thuc", article.slug, "index.html");
  let html = await readFile(file, "utf8");
  const short = truncate(article.meta);
  html = html.replace(/<meta name="description" content="[^"]*" \/>/u, `<meta name="description" content="${short}" />`);
  await writeFile(file, html, "utf8");
}

console.log("Normalized high-intent meta descriptions for SERP length.");
