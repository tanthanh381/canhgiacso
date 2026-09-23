import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("SEO Intent Wave 7 runs after authority normalization and before analytics", async () => {
  const architecture = JSON.parse(await read("content/content-architecture.json"));
  const stages = architecture.phases.flatMap((phase) => phase.stages);
  assert.ok(stages.indexOf("patch-seo-authority-wave6.mjs") < stages.indexOf("patch-seo-intent-wave7.mjs"));
  assert.ok(stages.indexOf("patch-seo-intent-wave7.mjs") < stages.indexOf("patch-realtime-analytics.mjs"));
});

test("Wave 7 separates overlapping search intents instead of duplicating titles", async () => {
  const script = await read("scripts/patch-seo-intent-wave7.mjs");
  for (const phrase of [
    "Bị lừa việc nhẹ lương cao: Cách dừng nạp tiền và xử lý",
    "Bị lừa đảo ngân hàng phải làm gì? 7 bước xử lý ngay",
    "Đã bấm link lạ phải làm gì? Cách xử lý và kiểm tra link",
    "Phân biệt bài này với hướng dẫn nhận diện",
    "Nếu bạn chưa tương tác với đối tượng",
    "Kiểm tra trước khi bấm",
  ]) assert.ok(script.includes(phrase), `missing intent separation: ${phrase}`);
});

test("Wave 7 optimizes high-demand first-party topics with answer-first blocks", async () => {
  const script = await read("scripts/patch-seo-intent-wave7.mjs");
  for (const slug of [
    "kiem-tra-so-dien-thoai-lua-dao",
    "kiem-tra-link-gia-mao",
    "lua-dao-cong-tac-vien-viec-nhe-luong-cao",
    "gia-mao-ngan-hang",
    "xu-ly-khi-bi-lua-dao-chuyen-tien",
  ]) assert.ok(script.includes(`slug: "${slug}"`), `missing priority topic: ${slug}`);
  assert.match(script, /seo-answer-box/);
  assert.match(script, /Trả lời nhanh/);
});

test("Wave 7 fills the generic phishing intent gap with an evidence-backed pillar", async () => {
  const script = await read("scripts/patch-seo-intent-wave7.mjs");
  assert.match(script, /kien-thuc\/phishing-la-gi\/index\.html/);
  assert.match(script, /Phishing là gì\? Dấu hiệu, ví dụ và cách phòng tránh lừa đảo/);
  assert.match(script, /vnnic\.vn/);
  assert.match(script, /bocongan\.gov\.vn/);
  assert.match(script, /microsoft\.com/);
  assert.match(script, /BreadcrumbList/);
  assert.doesNotMatch(script, /FAQPage/);
});

test("Wave 7 strengthens hub and homepage internal linking to search-intent pages", async () => {
  const script = await read("scripts/patch-seo-intent-wave7.mjs");
  assert.match(script, /Tìm nhanh theo nhu cầu/);
  assert.match(script, /Tôi đang cần kiểm tra điều gì\?/);
  assert.match(script, /\/kien-thuc\/phishing-la-gi\//);
  assert.match(script, /\/kien-thuc\/kiem-tra-so-dien-thoai-lua-dao\//);
  assert.match(script, /\/kien-thuc\/kiem-tra-link-gia-mao\//);
  assert.match(script, /\/kien-thuc\/xu-ly-khi-bi-lua-dao-chuyen-tien\//);
});

test("Wave 7 styles remain responsive on mobile", async () => {
  const css = await read("public/seo.css");
  assert.match(css, /\.seo-answer-box/);
  assert.match(css, /\.seo-intent-grid/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.seo-intent-grid \{ grid-template-columns: 1fr 1fr; \}/);
  assert.match(css, /@media \(max-width: 520px\)[\s\S]*?\.seo-intent-grid \{ grid-template-columns: 1fr; \}/);
});
