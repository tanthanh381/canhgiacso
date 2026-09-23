const BASE_URL = process.env.HEALTH_BASE_URL || "https://canhgiacso.com";
const TIMEOUT_MS = Number(process.env.HEALTH_TIMEOUT_MS || 12000);

const checks = [
  { path: "/", expect: /Cảnh Giác Số|CẢNH GIÁC SỐ/i, contentType: /text\/html/i },
  { path: "/kien-thuc/", expect: /Cẩm nang|Kiến thức/i, contentType: /text\/html/i },
  { path: "/cong-cu/", expect: /Công cụ|kiểm tra lừa đảo/i, contentType: /text\/html/i },
  { path: "/sitemap.xml", expect: /<urlset[\s>]/i, contentType: /xml/i },
  { path: "/robots.txt", expect: /Sitemap:\s*https:\/\/canhgiacso\.com\/sitemap\.xml/i, contentType: /text\/plain/i },
];

async function check({ path, expect, contentType }) {
  const url = new URL(path, BASE_URL);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = performance.now();
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "user-agent": "CanhGiacSo-Production-Health/1.0" },
    });
    const body = await response.text();
    const elapsedMs = Math.round(performance.now() - started);
    const type = response.headers.get("content-type") || "";
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (contentType && !contentType.test(type)) throw new Error(`unexpected content-type: ${type}`);
    if (!expect.test(body)) throw new Error("expected content marker missing");
    return { path, status: response.status, elapsedMs };
  } finally {
    clearTimeout(timer);
  }
}

const results = [];
let failed = false;
for (const item of checks) {
  try {
    const result = await check(item);
    results.push({ ...result, ok: true });
    console.log(`OK   ${result.path.padEnd(18)} ${result.status} ${result.elapsedMs}ms`);
  } catch (error) {
    failed = true;
    results.push({ path: item.path, ok: false, error: error instanceof Error ? error.message : String(error) });
    console.error(`FAIL ${item.path.padEnd(18)} ${error instanceof Error ? error.message : error}`);
  }
}

const maxLatency = Math.max(...results.filter((item) => item.ok).map((item) => item.elapsedMs || 0), 0);
console.log(`Production health: ${results.filter((item) => item.ok).length}/${checks.length} checks passed; max latency ${maxLatency}ms.`);
if (failed) process.exitCode = 1;
