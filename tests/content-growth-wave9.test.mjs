import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("Content Growth Wave 9 runs after CTR optimization and before analytics", async () => {
  const architecture = JSON.parse(await read("content/content-architecture.json"));
  const stages = architecture.phases.flatMap((phase) => phase.stages);
  assert.ok(stages.indexOf("patch-seo-ctr-wave8.mjs") < stages.indexOf("patch-content-growth-wave9.mjs"));
  assert.ok(stages.indexOf("patch-content-growth-wave9.mjs") < stages.indexOf("instrument-content.mjs"));
});

test("Wave 9 covers the recommended high-growth scam topics", async () => {
  const script = await read("scripts/patch-content-growth-wave9.mjs");
  for (const slug of [
    "bien-lai-chuyen-khoan-gia",
    "cuoc-goi-im-lang-lua-dao",
    "lua-dao-khoa-sim-chuan-hoa-thue-bao",
    "app-quyen-tro-nang-lua-dao",
    "app-dieu-khien-dien-thoai-tu-xa",
    "lua-dao-hoan-thue-gia-mao",
    "gia-danh-giao-vien-bao-con-tai-nan",
    "gia-danh-benh-vien-bao-nguoi-than-cap-cuu",
    "sms-brandname-gia-mao",
    "nguoi-mua-gui-link-nhan-tien-lua-dao",
    "dat-coc-mua-hang-online-lua-dao",
    "trung-thuong-nhan-qua-dong-phi-lua-dao",
    "romance-scam-lua-dao-tinh-cam",
    "lua-dao-dau-tu-telegram-zalo",
    "bat-coc-online",
    "ai-ghep-anh-video-tong-tien",
    "gia-mao-lanh-dao-yeu-cau-chuyen-tien-bec",
  ]) assert.ok(script.includes(`slug:"${slug}"`), `missing growth topic: ${slug}`);
});

test("Wave 9 upgrades existing high-demand pages instead of creating duplicates", async () => {
  const script = await read("scripts/patch-content-growth-wave9.mjs");
  for (const slug of [
    "lua-dao-tien-dien-gia-mao-evn",
    "lua-dao-bao-hiem-xa-hoi-vssid",
    "lua-dao-tuyen-dung-online",
    "lua-dao-dau-tu-online",
  ]) assert.ok(script.includes(`slug:"${slug}"`), `missing existing-page upgrade: ${slug}`);
  assert.match(script, /Điện lực gọi báo nợ tiền điện có phải lừa đảo không/);
  assert.match(script, /BHXH gọi yêu cầu cập nhật VssID có phải lừa đảo không/);
  assert.match(script, /Tuyển dụng yêu cầu đóng phí có lừa đảo không/);
});

test("Wave 9 ships the alert hub, question-intent hub and scam dictionary", async () => {
  const script = await read("scripts/patch-content-growth-wave9.mjs");
  assert.match(script, /canh-bao-lua-dao-hom-nay\/index\.html/);
  assert.match(script, /co-phai-lua-dao-khong\/index\.html/);
  assert.match(script, /tu-dien-lua-dao\/index\.html/);
  for (const term of ["Phishing","Smishing","Vishing","Quishing","Pharming","Spoofing","Social engineering","Romance scam","Pig butchering","BEC / CEO Fraud","SIM swapping","Credential stuffing","RAT / remote access","Infostealer","Deepfake / DeepVoice"]) {
    assert.ok(script.includes(term), `missing scam dictionary term: ${term}`);
  }
});

test("Wave 9 provides the complete anti-scam tool center", async () => {
  const script = await read("scripts/patch-content-growth-wave9.mjs");
  for (const slug of [
    "kiem-tra-cuoc-goi-la",
    "xu-ly-khi-bi-lua",
    "kiem-tra-bien-lai-chuyen-khoan",
    "kiem-tra-tin-nhan-dang-ngo",
    "kiem-tra-quyen-ung-dung-android",
    "kiem-tra-truoc-khi-chuyen-tien",
    "tra-cuu-kenh-chinh-thuc",
    "thu-vien-kich-ban-lua-dao",
  ]) assert.ok(script.includes(`slug:"${slug}"`) || script.includes(`cong-cu/${slug}/index.html`), `missing tool: ${slug}`);
  const engine = await read("public/scam-tools.js");
  for (const tool of ["call-triage","incident-response","receipt-check","sms-check","permission-check","transfer-check","official-channels","scenario-library"]) {
    assert.ok(engine.includes(tool), `missing tool engine: ${tool}`);
  }
  assert.doesNotMatch(engine, /fetch\(|XMLHttpRequest|sendBeacon|supabase/i);
});

test("Wave 9 uses official sources and preserves uncertainty where evidence is limited", async () => {
  const script = await read("scripts/patch-content-growth-wave9.mjs");
  for (const domain of ["bocongan.gov.vn","hvannd.bocongan.gov.vn","evn.com.vn","baohiemxahoi.gov.vn"]) {
    assert.ok(script.includes(domain), `missing official source domain: ${domain}`);
  }
  assert.match(script, /không đủ để kết luận đó là lừa đảo/i);
  assert.match(script, /không nên coi giả thuyết đó là kết luận mặc định/i);
});

test("SEO audit requires all Wave 9 indexable URLs and tool scripts", async () => {
  const audit = await read("scripts/seo-audit.mjs");
  assert.match(audit, /growthWave9Required/);
  assert.match(audit, /interactiveToolPaths/);
  assert.match(audit, /Growth Wave 9 URL missing from sitemap/);
  assert.match(audit, /missing client-side anti-scam tool script/);
  assert.match(audit, /missing CSP-safe theme initializer/);
  assert.match(audit, /missing Content Security Policy/);
  assert.match(audit, /CSP does not allow same-origin tool scripts/);
  assert.match(audit, /CSP does not block plugin objects/);
});


test("Wave 9 pages carry a production-equivalent CSP", async () => {
  const script = await read("scripts/patch-content-growth-wave9.mjs");
  assert.match(script, /const CSP_META/);
  assert.match(script, /default-src/);
  assert.match(script, /script-src/);
  assert.match(script, /connect-src/);
  assert.match(script, /object-src/);
  assert.match(script, /upgrade-insecure-requests/);
});
