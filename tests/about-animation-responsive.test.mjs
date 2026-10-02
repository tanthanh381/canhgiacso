import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");
const html = await read("public/gioi-thieu/hoat-hinh.html");
// CSS và JS của hoạt hình nằm trong tệp riêng (trang không còn script/style nội tuyến).
const css = await read("public/gioi-thieu/hoat-hinh.css");
const js = await read("public/gioi-thieu/hoat-hinh.js");

test("Giới thiệu animation has a dedicated mobile composition", () => {
  assert.match(html, /<meta name="viewport" content="width=device-width,initial-scale=1">/);
  assert.match(css, /html,body\{margin:0;width:1920px;height:1080px;overflow:hidden/);
  assert.match(css, /@media \(max-width:720px\)\{/);
  assert.match(css, /html,body\{width:100%;height:100dvh;min-height:100dvh;overflow:hidden\}/);
  assert.match(css, /\.grid4\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)/);
  assert.match(css, /\.tools\{[^}]*grid-template-columns:1fr 1fr/);
  assert.match(css, /#m3\{top:345px!important\}/);
});

test("Giới thiệu animation scales on wide frames and can be paused", () => {
  assert.match(css, /@media \(min-width:721px\)\{[^@]*scale\(var\(--fit,1\)\)/);
  assert.match(html, /<meta name="robots" content="noindex,follow">/);
  assert.match(js, /prefers-reduced-motion: reduce/);
  assert.match(js, /e\.origin!==location\.origin/);
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

test("animation page has no inline script/style and is covered by a strict meta CSP", () => {
  assert.doesNotMatch(html, /<style\b/i);
  assert.doesNotMatch(html, /\sstyle\s*=/i);
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i);
  const inline = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(([, attributes, body]) => !/\bsrc=/i.test(attributes) && body.trim());
  assert.deepEqual(inline, []);
  assert.match(html, /<link rel="stylesheet" href="\/gioi-thieu\/hoat-hinh\.css">/);
  assert.match(html, /<script src="\/gioi-thieu\/hoat-hinh\.js"><\/script>/);

  const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1] ?? "";
  assert.match(csp, /^default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:/);
  assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval/);
  // Nhúng iframe không nạp phân tích để khỏi đếm đôi lượt xem.
  assert.doesNotMatch(html, /consent\.js|web-analytics|google-analytics|googletagmanager/);
  // JS chỉ thao tác CSSOM (style.x = ..., setProperty) vì thuộc tính style nội tuyến bị chặn bởi CSP.
  assert.doesNotMatch(js, /setAttribute\(\s*['"]style|cssText|innerHTML|eval\(|new Function|document\.write/);
  assert.doesNotMatch(js, /fetch\(|XMLHttpRequest|WebSocket|sendBeacon/);
});
