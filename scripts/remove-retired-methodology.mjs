import { readdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public");
const HOME = path.join(ROOT, "github-pages", "index.html");
const RETIRED_PATH = "/phuong-phap-kiem-chung/";
const RETIRED_URL = "https://canhgiacso.com" + RETIRED_PATH;

async function htmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await htmlFiles(full));
    else if (entry.name === "index.html") out.push(full);
  }
  return out;
}

function removeRetiredReferences(html) {
  return html
    .replace(/<section[^>]+id=["']lookup-methodology-link["'][^>]*>[\s\S]*?<\/section>/gi, "")
    .replace(/\s*(?:Xem|Xem thêm|Xem chi tiết tại)\s*<a\s+href=["'](?:https:\/\/canhgiacso\.com)?\/phuong-phap-kiem-chung\/["'][^>]*>[\s\S]*?<\/a>/gi, "")
    .replace(/<a\s+href=["'](?:https:\/\/canhgiacso\.com)?\/phuong-phap-kiem-chung\/["'][^>]*>[\s\S]*?<\/a>/gi, "")
    .replace(/,?\s*"publishingPrinciples"\s*:\s*"https:\/\/canhgiacso\.com\/phuong-phap-kiem-chung\/"\s*,?/gi, "")
    .replace(/\s{2,}/g, " ");
}

const files = [HOME, ...(await htmlFiles(PUBLIC))];
let cleaned = 0;
for (const file of files) {
  let html;
  try {
    html = await readFile(file, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") continue;
    throw error;
  }
  const next = removeRetiredReferences(html);
  if (next !== html) {
    await writeFile(file, next, "utf8");
    cleaned += 1;
  }
}

const sitemapPath = path.join(PUBLIC, "sitemap.xml");
let sitemap = await readFile(sitemapPath, "utf8");
const escapedUrl = RETIRED_URL.replaceAll("/", "\\/").replaceAll(".", "\\.");
const entry = new RegExp("\\s*<url>[\\s\\S]*?<loc>" + escapedUrl + "<\\/loc>[\\s\\S]*?<\\/url>", "g");
sitemap = sitemap.replace(entry, "");
await writeFile(sitemapPath, sitemap, "utf8");

const retiredFile = path.join(PUBLIC, RETIRED_PATH.slice(1), "index.html");
try {
  await unlink(retiredFile);
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

console.log("Retired methodology page: removed " + RETIRED_PATH + ", cleaned " + cleaned + " HTML artifacts, and removed its sitemap entry.");
