import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../public/gioi-thieu/index.html", import.meta.url), "utf8");

test("Giới thiệu animation has a dedicated mobile composition", () => {
  assert.match(html, /html,body\{margin:0;width:1920px;height:1080px;overflow:hidden/);
  assert.match(html, /@media \(max-width:720px\)\{/);
  assert.match(html, /html,body\{width:100%;height:100dvh;min-height:100dvh;overflow:hidden\}/);
  assert.match(html, /\.grid4\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)/);
  assert.match(html, /\.tools\{[^}]*grid-template-columns:1fr 1fr/);
  assert.match(html, /#m3\{top:345px!important\}/);
});
