import { pathToFileURL } from "node:url";

// Kiểm tra header bảo mật của một URL đang chạy thật.
// Cách dùng (chủ dự án chạy SAU khi triển khai Cloudflare Worker/Transform Rules, không chạy từ CI mặc định):
//   node scripts/check-security-headers.mjs https://canhgiacso.com/
// Thoát mã 1 nếu thiếu hoặc sai một header bắt buộc.

export const REQUIRED_HEADERS = [
  "content-security-policy",
  "strict-transport-security",
  "x-content-type-options",
  "x-frame-options",
  "referrer-policy",
  "permissions-policy",
  "cross-origin-opener-policy",
];

// Trả về [{ name, present, ok, value, problem }] cho từng header bắt buộc.
export function evaluateSecurityHeaders(headers) {
  const get = (name) => (typeof headers.get === "function" ? headers.get(name) : headers[name]) ?? "";
  const rules = {
    "content-security-policy": (value) => {
      // 'self' chỉ dành cho /gioi-thieu/hoat-hinh.html (iframe cùng nguồn gốc); mọi trang khác phải là 'none'.
      if (!/frame-ancestors\s+('none'|'self')/i.test(value)) return "thiếu frame-ancestors 'none'";
      if (/script-src[^;]*'unsafe-(inline|eval)'/i.test(value)) return "script-src cho phép 'unsafe-inline/unsafe-eval'";
      if (!/form-action\s+'self'/i.test(value)) return "thiếu form-action 'self'";
      return "";
    },
    "strict-transport-security": (value) => {
      const maxAge = Number(value.match(/max-age=(\d+)/i)?.[1] ?? 0);
      return maxAge >= 31536000 ? "" : "max-age phải >= 31536000";
    },
    "x-content-type-options": (value) => (value.toLowerCase() === "nosniff" ? "" : "phải là nosniff"),
    "x-frame-options": (value) => (/^(deny|sameorigin)$/i.test(value) ? "" : "phải là DENY hoặc SAMEORIGIN"),
    "referrer-policy": (value) => (/strict-origin-when-cross-origin|no-referrer|same-origin|strict-origin/i.test(value) ? "" : "giá trị chưa chặt"),
    "permissions-policy": (value) => (/camera=\(\)/.test(value) && /microphone=\(\)/.test(value) && /geolocation=\(\)/.test(value) ? "" : "cần tắt camera, microphone, geolocation"),
    "cross-origin-opener-policy": (value) => (/same-origin/i.test(value) ? "" : "nên là same-origin"),
  };
  return REQUIRED_HEADERS.map((name) => {
    const value = get(name);
    const present = Boolean(value);
    const problem = present ? rules[name](value) : "thiếu header";
    return { name, present, ok: present && !problem, value, problem };
  });
}

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error("Cách dùng: node scripts/check-security-headers.mjs <url>");
    process.exitCode = 2;
    return;
  }
  const url = new URL(target);
  const response = await fetch(url, { redirect: "follow", headers: { "user-agent": "CanhGiacSo-Header-Check/1.0" } });
  const results = evaluateSecurityHeaders(response.headers);
  console.log(`${url.href} -> HTTP ${response.status}`);
  for (const item of results) {
    const mark = item.ok ? "OK     " : item.present ? "SAI    " : "THIẾU  ";
    const detail = item.ok ? truncate(item.value) : item.present ? `${item.problem}: ${truncate(item.value)}` : item.problem;
    console.log(`${mark}${item.name.padEnd(28)} ${detail}`);
  }
  const bad = results.filter((item) => !item.ok);
  console.log(`${results.length - bad.length}/${results.length} header đạt yêu cầu.`);
  if (bad.length) process.exitCode = 1;
}

const truncate = (value) => (value.length > 110 ? `${value.slice(0, 107)}...` : value);

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
