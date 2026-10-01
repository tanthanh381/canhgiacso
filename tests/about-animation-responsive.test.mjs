import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");
const html = await read("public/gioi-thieu/hoat-hinh.html");

test("Giới thiệu animation has a dedicated mobile composition", () => {
  assert.match(html, /<meta name="viewport" content="width=device-width,initial-scale=1">/);
  assert.match(html, /html,body\{margin:0;width:1920px;height:1080px;overflow:hidden/);
  assert.match(html, /@media \(max-width:720px\)\{/);
  assert.match(html, /html,body\{width:100%;height:100dvh;min-height:100dvh;overflow:hidden\}/);
  assert.match(html, /\.grid4\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)/);
  assert.match(html, /\.tools\{[^}]*grid-template-columns:1fr 1fr/);
  assert.match(html, /#m3\{top:345px!important\}/);
});

test("Giới thiệu animation scales on wide frames and can be paused", () => {
  assert.match(html, /@media \(min-width:721px\)\{[^@]*scale\(var\(--fit,1\)\)/);
  assert.match(html, /<meta name="robots" content="noindex,follow">/);
  assert.match(html, /prefers-reduced-motion: reduce/);
  assert.match(html, /e\.origin!==location\.origin/);
  assert.match(html, /<a class="url" id="url" href="\/" target="_top">/);
});

test("Giới thiệu page keeps the site shell and embeds the animation as a hero", async () => {
  const [page, generator, controller] = await Promise.all([
    read("public/gioi-thieu/index.html"),
    read("scripts/patch-seo-authority-wave6.mjs"),
    read("public/about-hero.js"),
  ]);
  assert.match(generator, /await write\("gioi-thieu\/index\.html", about\)/);
  assert.match(page, /class="seo-header"/);
  assert.match(page, /class="seo-footer"/);
  assert.match(page, /<h1>Giới thiệu Cảnh Giác Số<\/h1>/);
  assert.match(page, /<iframe src="\/gioi-thieu\/hoat-hinh\.html" title="[^"]+"/);
  assert.match(page, /<script src="\/about-hero\.js" defer><\/script>/);
  assert.match(controller, /event\.source !== frame\.contentWindow/);
});
