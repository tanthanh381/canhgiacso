import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const contentArchitecture = JSON.parse(await readFile(new URL("../content/content-architecture.json", import.meta.url), "utf8"));
const qcWave2 = await readFile(new URL("../scripts/patch-qc-wave2.mjs", import.meta.url), "utf8");
const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const presentation = await readFile(new URL("../app/domains/training/presentation.ts", import.meta.url), "utf8");

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
  const stages = contentArchitecture.phases.flatMap((phase) => phase.stages);
  assert.ok(stages.indexOf("patch-google-traffic-wave5.mjs") < stages.indexOf("patch-qc-wave2.mjs"));
  assert.ok(stages.indexOf("patch-qc-wave2.mjs") < stages.indexOf("patch-qc-wave3.mjs"));
  assert.ok(stages.indexOf("patch-qc-wave3.mjs") < stages.indexOf("patch-seo-authority-wave6.mjs"));
  assert.ok(stages.indexOf("patch-content-growth-wave9.mjs") < stages.indexOf("instrument-content.mjs"));
  assert.match(packageJson.scripts["build:pages"], /content:compile/);
  assert.doesNotMatch(packageJson.scripts.build, /content:compile|patch-[a-z0-9-]+\\.mjs/);
  assert.doesNotMatch(packageJson.scripts.dev, /content:compile|patch-[a-z0-9-]+\\.mjs/);
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
  assert.ok(presentation.includes('function scenarioCategoryLabel'));
  assert.ok(presentation.includes('category === "Deepfake"'));
  assert.ok(presentation.includes('"Giả mạo bằng AI (deepfake)"'));
  assert.ok(presentation.includes('"Lừa đảo giả mạo (phishing)"'));
  assert.ok(presentation.includes('"SMS Brandname giả mạo"'));
  assert.ok(presentation.includes('function scenarioChannelLabel'));
  assert.ok(presentation.includes('channel === "Video call"'));
  assert.ok(presentation.includes('"Cuộc gọi video"'));
  assert.ok(presentation.includes('"Nhóm trò chuyện"'));

  // Presentation terminology now belongs to the training bounded context,
  // while page.tsx only consumes the stable domain API.
  assert.ok(pageSource.includes('from "./domains/training/presentation"'));
  assert.ok(pageSource.includes('scenarioChannelLabel(item.channel)'));
  assert.ok(pageSource.includes('scenarioCategoryLabel(selected.category)'));
});

test("QC patch removes old generic source boilerplate before adding topic sources", () => {
  assert.ok(qcWave2.includes('data-seo-wave4="sources"'));
  assert.ok(qcWave2.includes('data-qc-wave2="sources"'));
  assert.ok(qcWave2.includes("Hành động an toàn ưu tiên"));
  assert.ok(qcWave2.includes("Cách nội dung được kiểm chứng"));
});
