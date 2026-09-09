import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("certificate feature is server-issued and downloadable as PDF", async () => {
  const [page, certificate, sql] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/certificate.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/training_certificates.sql", import.meta.url), "utf8"),
  ]);
  assert.match(page, /get_my_training_certificates/);
  assert.match(page, /issue_training_certificate/);
  assert.match(page, /Tải chứng chỉ PDF/);
  assert.match(certificate, /%PDF-1\.4/);
  assert.match(certificate, /application\/pdf/);
  assert.match(certificate, /Chứng nhận hoàn thành nội dung đào tạo mô phỏng/);
  assert.match(sql, /private\.training_certificates/);
  assert.match(sql, /server_verified/);
  assert.match(sql, /auth\.sessions/);
  assert.match(sql, /perform private\.ensure_training_certificate/);
});

test("certificate is not issued for guest-only local progress", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /Chế độ khách không cấp chứng chỉ định danh/);
  assert.match(page, /if \(!sessionAccount \|\| !runId\) return/);
});
