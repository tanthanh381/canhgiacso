import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const qcWave2 = await readFile(new URL("../scripts/patch-qc-wave2.mjs", import.meta.url), "utf8");
const terminology = await readFile(new URL("../scripts/patch-qc-terminology.mjs", import.meta.url), "utf8");
const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

const knowledgeSlugs = [
  "phong-chong-lua-dao-truc-tuyen",
  "nhan-dien-lua-dao-truc-tuyen",
  "nhan-dien-email-phishing",
  "an-toan-thong-tin-ca-nhan",
  "xu-ly-khi-bi-lua-dao-chuyen-tien",
  "lua-dao-ma-qr",
  "gia-mao-cong-an-co-quan-nha-nuoc",
  "gia-mao-ngan-hang",
  "lua-dao-shipper-giao-hang",
  "lua-dao-cong-tac-vien-viec-nhe-luong-cao",
  "lua-dao-dau-tu-online",
  "deepfake-gia-giong-nguoi-than",
  "lua-dao-otp-chiem-doat-tai-khoan",
  "kiem-tra-link-gia-mao",
  "tai-khoan-bi-hack-phai-lam-gi",
  "tra-cuu-lua-dao",
  "kiem-tra-so-dien-thoai-lua-dao",
  "tra-cuu-so-tai-khoan-lua-dao",
  "25-kich-ban-lua-dao-2026",
  "lua-dao-vneid-gia-mao",
  "lua-dao-phat-nguoi-qua-sms",
  "lua-dao-hoan-tien-don-hang",
];

test("QC Wave 2 runs after SEO content generation and before downstream QC/analytics", () => {
  assert.match(packageJson.scripts["build:pages"], /patch-google-traffic-wave5\.mjs && node scripts\/patch-qc-wave2\.mjs && node scripts\/patch-qc-wave3\.mjs && node scripts\/patch-seo-authority-wave6\\.mjs && node scripts\\/patch-seo-intent-wave7\\.mjs && node scripts\\/patch-realtime-analytics\\.mjs/);
  assert.match(packageJson.scripts.build, /prepare:content/);
  assert.match(packageJson.scripts.dev, /prepare:content/);
});

test("every public knowledge topic has a topic-specific source mapping", () => {
  for (const slug of knowledgeSlugs) assert.ok(qcWave2.includes(`"${slug}"`), `missing QC source mapping for ${slug}`);
  assert.ok(qcWave2.includes("bocongan.gov.vn"));
  assert.ok(qcWave2.includes("sbv.gov.vn"));
  assert.ok(qcWave2.includes("ssc.gov.vn"));
  assert.ok(qcWave2.includes("support.microsoft.com/vi-vn/security/protect-yourself-from-phishing"));
  assert.ok(qcWave2.includes("safety.google/safety/security-tips/"));
});

test("methodology documents source hierarchy, certainty levels and standard terminology", () => {
  for (const phrase of [
    "Thứ bậc nguồn được ưu tiên",
    "Quy trình kiểm chứng 5 bước",
    "Cách diễn đạt mức độ chắc chắn",
    "Chuẩn thuật ngữ của Cảnh Giác Số",
    "Deepfake / DeepVoice (giả mạo bằng AI)",
    "OTP — mã xác thực dùng một lần",
    "Xác thực điện tử (eKYC)",
    "SMS Brandname",
    "Cuộc gọi video",
  ]) assert.ok(qcWave2.includes(phrase), `missing methodology phrase: ${phrase}`);
});

test("interactive content standardizes labels only at the presentation layer", () => {
  assert.ok(terminology.includes('function scenarioCategoryLabel'));
  assert.ok(terminology.includes('category === "Deepfake"'));
  assert.ok(terminology.includes('"Giả mạo bằng AI (deepfake)"'));
  assert.ok(terminology.includes('"Lừa đảo giả mạo (phishing)"'));
  assert.ok(terminology.includes('"SMS Brandname giả mạo"'));
  assert.ok(terminology.includes('function scenarioChannelLabel'));
  assert.ok(terminology.includes('channel === "Video call"'));
  assert.ok(terminology.includes('"Cuộc gọi video"'));
  assert.ok(terminology.includes('"Nhóm trò chuyện"'));
  assert.ok(terminology.includes('without changing stored content'));

  // `pnpm test` runs `pnpm build` first; the display patch must therefore be
  // visible in page.tsx while Scenario data remains untouched for round trips.
  assert.ok(pageSource.includes('function scenarioCategoryLabel'));
  assert.ok(pageSource.includes('scenarioChannelLabel(item.channel)'));
  assert.ok(pageSource.includes('scenarioCategoryLabel(selected.category)'));
});

test("QC patch removes old generic source boilerplate before adding topic sources", () => {
  assert.ok(qcWave2.includes('data-seo-wave4="sources"'));
  assert.ok(qcWave2.includes('data-qc-wave2="sources"'));
  assert.ok(qcWave2.includes("Hành động an toàn ưu tiên"));
  assert.ok(qcWave2.includes("Cách nội dung được kiểm chứng"));
});
