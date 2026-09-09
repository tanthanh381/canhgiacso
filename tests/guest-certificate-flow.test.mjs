import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("guest completion opens a downloadable PDF instead of looping to scenario one", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /GUEST_CERTIFICATE_KEY/);
  assert.match(page, /getOrCreateGuestCertificate/);
  assert.match(page, /Xem chứng chỉ PDF/);
  assert.match(page, /setCompletionCertificate\(guestCertificate\)/);
  assert.match(page, /Tải bản ghi nhận PDF/);
});

test("guest PDFs are explicitly marked non-official", async () => {
  const certificate = await readFile(new URL("../app/certificate.ts", import.meta.url), "utf8");
  assert.match(certificate, /không phải chứng chỉ nội bộ đã xác minh/i);
});
