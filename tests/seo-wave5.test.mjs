import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("SEO wave 5 targets high-intent Google queries without creating new URLs", async () => {
  const patch = await read("scripts/patch-google-traffic-wave5.mjs");
  assert.match(patch, /kiem-tra-so-dien-thoai-lua-dao/);
  assert.match(patch, /tra-cuu-so-tai-khoan-lua-dao/);
  assert.match(patch, /tra-cuu-lua-dao/);
  assert.match(patch, /kiem-tra-link-gia-mao/);
  assert.match(patch, /Cách kiểm tra số điện thoại lừa đảo nhanh và an toàn/);
  assert.match(patch, /Cách tra cứu số tài khoản lừa đảo trước khi chuyển tiền/);
  assert.match(patch, /Tra cứu lừa đảo nên kiểm tra những dữ kiện nào/);
  assert.match(patch, /Kiểm tra link lừa đảo trong 30 giây/);
  assert.match(patch, /google-discovery-wave5/);
  assert.match(patch, /google-priority-tools/);
  assert.match(patch, /Không có kết quả cảnh báo không đồng nghĩa an toàn/);
  assert.doesNotMatch(patch, /<url>\s*<loc>https:\/\/canhgiacso\.com\/kien-thuc\/[^$]/);
});

test("Pages build runs SEO wave 5 after indexation enrichment", async () => {
  const pkg = JSON.parse(await read("package.json"));
  const build = pkg.scripts["build:pages"];
  assert.match(build, /patch-indexation-wave4\.mjs/);
  assert.match(build, /patch-google-traffic-wave5\.mjs/);
  assert.ok(build.indexOf("patch-indexation-wave4.mjs") < build.indexOf("patch-google-traffic-wave5.mjs"));
  assert.ok(build.indexOf("patch-google-traffic-wave5.mjs") < build.indexOf("patch-realtime-analytics.mjs"));
});
