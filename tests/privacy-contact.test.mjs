import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const ROOT = new URL("../", import.meta.url).pathname;
const read = (file) => readFile(path.join(ROOT, file), "utf8");

async function htmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir)) {
    const full = path.join(dir, entry);
    if ((await stat(full)).isDirectory()) out.push(...await htmlFiles(full));
    else if (entry.endsWith(".html")) out.push(full);
  }
  return out;
}

test("privacy page covers operator, purposes, data, cookie table, retention, rights, transfers, children and changes", async () => {
  const html = await read("public/quyen-rieng-tu/index.html");
  for (const id of ["don-vi-van-hanh", "muc-dich-co-so", "du-lieu-xu-ly", "cookie", "thoi-han-luu", "quyen-cua-ban", "chuyen-du-lieu", "tre-em", "thay-doi", "lien-he-du-lieu"]) {
    assert.ok(html.includes(`id="${id}"`), `missing section #${id}`);
  }
  assert.match(html, /Website được quản lý và vận hành bởi IT Security Team - HDBank\./);
  for (const name of [
    "_ga", "_ga_HH04Q7FYHM", "cgs-consent-v1", "khien-so-theme", "khien-so-progress:guest",
    "canhgiacso-analytics-visitor-v1", "canhgiacso-analytics-session-v2", "canh-giac-so-security-checklist",
    "canh-giac-so-guest-certificate", "khien-so-pending:", "sb-…-auth-token",
  ]) {
    assert.ok(html.includes(`<code>${name}`), `cookie table must list ${name}`);
  }
  assert.match(html, /13 tháng/);
  assert.match(html, /tối đa 24 giờ/);
  assert.match(html, /Consent Mode v2/);
  assert.match(html, /theo cấu hình dự án, sẽ công bố/);
  assert.match(html, /href="\/consent\.css"/);
  assert.doesNotMatch(html, /đã có tính năng tự xóa tài khoản|tự xóa tài khoản trong ứng dụng/);
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(match[1]);
});

test("every storage key the application writes is documented in the privacy table", async () => {
  const [html, storage, checklist, banner] = await Promise.all([
    read("public/quyen-rieng-tu/index.html"),
    read("app/shared/browser-storage.ts"),
    read("app/domains/security-awareness/checklist.ts"),
    read("app/domains/shell/simulation-banner.tsx"),
  ]);
  const keys = [
    storage.match(/THEME_KEY = "([^"]+)"/)?.[1],
    storage.match(/GUEST_CERTIFICATE_KEY = "([^"]+)"/)?.[1],
    storage.match(/LEGACY_PROGRESS_KEY = "([^"]+)"/)?.[1],
    checklist.match(/SECURITY_CHECKLIST_KEY = "([^"]+)"/)?.[1],
    banner.match(/SIMULATION_BANNER_KEY = "([^"]+)"/)?.[1],
  ];
  for (const key of keys) {
    assert.ok(key, "storage key constant could not be read");
    assert.ok(html.includes(key), `privacy table must document ${key}`);
  }
});

test("contact page offers GitHub channels and never shows empty or 'coming soon' placeholders", async () => {
  const [html, config] = await Promise.all([read("public/lien-he/index.html"), read("content/site-config.json")]);
  assert.deepEqual(Object.keys(JSON.parse(config)).sort(), ["contactEmail", "contactFormUrl", "dataRegion"]);
  assert.match(html, /https:\/\/github\.com\/tanthanh381\/canhgiacso\/security\/policy/);
  assert.match(html, /https:\/\/github\.com\/tanthanh381\/canhgiacso\/issues/);
  if (!JSON.parse(config).contactEmail) assert.doesNotMatch(html, /mailto:/);
  assert.doesNotMatch(html, /sắp có|đang cập nhật|coming soon|Email:\s*<\/|Email:\s*(?:<[^>]+>\s*)*<\/li>/i);
  const security = await read("public/bao-mat/index.html");
  assert.match(security, /security\/policy/);
});

test("security.txt points to the file that is actually served and expires within a year", async () => {
  const text = await read("public/security.txt");
  assert.match(text, /^Canonical: https:\/\/canhgiacso\.com\/security\.txt$/m);
  assert.match(text, /^Contact: https:\/\/github\.com\/tanthanh381\/canhgiacso\/security\/policy$/m);
  const expires = new Date(text.match(/^Expires: (.+)$/m)?.[1] ?? "");
  const today = new Date("2026-10-02T00:00:00Z");
  assert.ok(expires > today && expires - today <= 366 * 24 * 60 * 60 * 1000, "Expires must be in the future and at most one year away");
  assert.doesNotMatch(text, /\.well-known/);
});

test("site-config drives mailto/form/data region and rejects invalid values", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "cgs-site-config-"));
  try {
    await cp(path.join(ROOT, "public"), path.join(dir, "public"), { recursive: true });
    await cp(path.join(ROOT, "content"), path.join(dir, "content"), { recursive: true });
    const run = () => spawnSync(process.execPath, [path.join(ROOT, "scripts/patch-seo-authority-wave6.mjs")], { cwd: dir, encoding: "utf8" });

    await writeFile(path.join(dir, "content/site-config.json"), JSON.stringify({
      contactEmail: "security@example.org",
      contactFormUrl: "https://example.org/lien-he",
      dataRegion: "Singapore (ap-southeast-1)",
    }));
    const ok = run();
    assert.equal(ok.status, 0, ok.stderr);
    const contact = await readFile(path.join(dir, "public/lien-he/index.html"), "utf8");
    assert.match(contact, /href="mailto:security@example\.org"/);
    assert.match(contact, /href="https:\/\/example\.org\/lien-he"/);
    const privacy = await readFile(path.join(dir, "public/quyen-rieng-tu/index.html"), "utf8");
    assert.match(privacy, /Vùng đặt dữ liệu: Singapore \(ap-southeast-1\)/);
    assert.doesNotMatch(privacy, /sẽ công bố/);
    assert.match(await readFile(path.join(dir, "public/security.txt"), "utf8"), /^Contact: mailto:security@example\.org$/m);

    await writeFile(path.join(dir, "content/site-config.json"), JSON.stringify({ contactEmail: "<script>", contactFormUrl: "", dataRegion: "" }));
    assert.notEqual(run().status, 0, "invalid email must fail the stage");
    await writeFile(path.join(dir, "content/site-config.json"), JSON.stringify({ contactEmail: "", contactFormUrl: "http://insecure.example", dataRegion: "" }));
    assert.notEqual(run().status, 0, "non-https form URL must fail the stage");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("every static page footer names the operator once", async () => {
  const files = (await htmlFiles(path.join(ROOT, "public"))).filter((file) => !file.endsWith(path.join("gioi-thieu", "hoat-hinh.html")));
  assert.ok(files.length >= 83);
  for (const file of files) {
    const html = await readFile(file, "utf8");
    const footer = html.match(/<footer class="seo-footer">([\s\S]*?)<\/footer>/)?.[1] ?? "";
    const count = footer.split("Website được quản lý và vận hành bởi IT Security Team - HDBank.").length - 1;
    assert.equal(count, 1, `${path.relative(ROOT, file)}: operator line count`);
    assert.match(footer, /<p class="seo-safety">Website được quản lý và vận hành bởi IT Security Team - HDBank\.<\/p>/);
  }
});

test("sitemap has a deterministic lastmod for every URL and the two long titles are shortened", async () => {
  const sitemap = await read("public/sitemap.xml");
  const entries = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => match[1]);
  assert.ok(entries.length >= 83);
  for (const entry of entries) assert.match(entry, /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/, entry);
  const finalizer = await read("scripts/finalize-content-architecture.mjs");
  assert.doesNotMatch(finalizer, /Date\.now\(|new Date\(\)|statSync|mtimeMs/);
  for (const page of ["cong-cu/kiem-tra-tin-nhan-dang-ngo", "kien-thuc/sms-brandname-gia-mao"]) {
    const title = (await read(`public/${page}/index.html`)).match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
    assert.ok(title.length > 0 && title.length <= 60, `${page}: title length ${title.length}`);
  }
  assert.match(await read("public/gioi-thieu/hoat-hinh.html"), /<meta name="description" content="[^"]{50,}"/);
});
