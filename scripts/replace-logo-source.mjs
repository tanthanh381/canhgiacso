import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public");

async function walk(dir) {
  const entries = await readdir(dir);
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const info = await stat(full);
    if (info.isDirectory()) files.push(...await walk(full));
    else if (entry === "index.html") files.push(full);
  }
  return files;
}

for (const file of await walk(path.join(PUBLIC, "kien-thuc"))) {
  let html = await readFile(file, "utf8");
  html = html.replaceAll('src="/khien-so-logo.png" alt="Logo Cảnh Giác Số"', 'src="/canh-giac-so-mark.svg" alt="Logo Cảnh Giác Số"');
  await writeFile(file, html, "utf8");
}

console.log("Knowledge-page header logo switched to vector mark.");
