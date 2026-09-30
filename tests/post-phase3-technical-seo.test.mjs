import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const SITE = "https://canhgiacso.com";
const PRIORITY_PATHS = [
  "/kien-thuc/lua-dao-cong-tac-vien-viec-nhe-luong-cao/",
  "/kien-thuc/kiem-tra-so-dien-thoai-lua-dao/",
  "/kien-thuc/gia-mao-ngan-hang/",
  "/kien-thuc/kiem-tra-link-gia-mao/",
  "/kien-thuc/xu-ly-khi-bi-lua-dao-chuyen-tien/",
  "/kien-thuc/phishing-la-gi/",
];

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

function scriptJson(html) {
  const match = html.match(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/i);
  assert.ok(match, "missing JSON-LD script");
  return JSON.parse(match[1]);
}

test("Phase 3 priority pages are indexable, canonical and sitemap-covered", async () => {
  const sitemap = await read("public/sitemap.xml");
  for (const urlPath of PRIORITY_PATHS) {
    const html = await read(`public${urlPath}index.html`);
    const canonical = `${SITE}${urlPath}`;
    assert.match(html, new RegExp(`<link rel="canonical" href="${canonical.replace(/\//g, "\\/")}"`));
    assert.match(html, /<meta name="robots" content="index,follow/i);
    assert.doesNotMatch(html, /noindex/i);
    assert.match(sitemap, new RegExp(`<loc>${canonical.replace(/\//g, "\\/")}<\\/loc>`));

    const data = scriptJson(html);
    const graph = Array.isArray(data["@graph"]) ? data["@graph"] : [data];
    const article = graph.find((node) => node["@type"] === "Article");
    assert.ok(article, `${urlPath} missing Article schema`);
    assert.deepEqual(article.author, { "@id": `${SITE}/#organization` });
    assert.deepEqual(article.publisher, { "@id": `${SITE}/#organization` });
    assert.deepEqual(article.reviewedBy, { "@id": `${SITE}/#editorial-team` });
    assert.ok(graph.some((node) => node["@id"] === `${SITE}/#editorial-team`));
    assert.ok(graph.some((node) => node["@type"] === "WebSite"));
  }
});

test("Phase 3 priority pages are reachable within one click from top crawl paths", async () => {
  const home = await read("github-pages/index.html");
  const hub = await read("public/kien-thuc/index.html");
  for (const urlPath of PRIORITY_PATHS) {
    assert.match(home, new RegExp(`href="${urlPath.replace(/\//g, "\\/")}"`));
    assert.match(hub, new RegExp(`href="${urlPath.replace(/\//g, "\\/")}"`));
  }
});
