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
  assert.match(page, /Tải chứng nhận PDF/);
  assert.match(certificate, /new Uint8Array\(\[37, 80, 68, 70, 45, 49, 46, 52/);
  assert.match(certificate, /application\/pdf/);
  assert.match(certificate, /template\.footerNote/);
  assert.match(sql, /private\.training_certificates/);
  assert.match(sql, /server_verified/);
  assert.match(sql, /auth\.sessions/);
  assert.match(sql, /perform private\.ensure_training_certificate/);
});

test("guest completion receives a local non-official downloadable PDF", async () => {
  const [page, certificate] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/certificate.ts", import.meta.url), "utf8"),
  ]);
  assert.match(page, /BẢN GHI NHẬN HOÀN THÀNH/);
  assert.match(page, /Tải bản ghi nhận PDF/);
  assert.match(page, /không thay thế chứng nhận nội bộ đã xác minh/);
  assert.match(page, /if \(!sessionAccount \|\| !runId\) return/);
  assert.match(certificate, /không phải chứng nhận nội bộ đã xác minh/i);
});
