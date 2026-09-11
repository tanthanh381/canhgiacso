import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("certificate template is customizable from admin and used by PDF renderer", async () => {
  const [data, admin, certificate, page] = await Promise.all([
    readFile(new URL("../app/data.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/admin.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/certificate.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(data, /export type CertificateTemplate/);
  assert.match(data, /certificateTemplate: CertificateTemplate/);
  assert.match(admin, /tab === "certificate"/);
  assert.match(admin, /Tùy chỉnh nội dung chứng nhận/);
  assert.match(admin, /Biến hỗ trợ/);
  assert.match(certificate, /applyCertificateTemplate/);
  assert.match(certificate, /template\.organizationName/);
  assert.match(page, /siteContent\.certificateTemplate/);
});

test("legacy published content receives the default certificate template", async () => {
  const data = await readFile(new URL("../app/data.ts", import.meta.url), "utf8");
  assert.match(data, /: defaultSiteContent\.certificateTemplate/);
});
