import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("admin editor and certificate output do not expose HDBank logo", async () => {
  const [design, editor, certificate] = await Promise.all([
    readFile(new URL("../app/certificate-design.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/certificate-editor.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/certificate.ts", import.meta.url), "utf8"),
  ]);
  assert.match(design, /hdbankLogo/);
  assert.match(editor, /editableCertificateParts/);
  assert.match(editor, /id!=='hdbankLogo'/);
  assert.doesNotMatch(editor, /Logo HDBank \(bên phải\)/);
  assert.doesNotMatch(editor, /Xóa logo HDBank/);
  assert.match(certificate, /if \(key === 'hdbankLogo'\) continue/);
  assert.doesNotMatch(certificate, /drawHdbankWordmark/);
});

test("legacy stored designs remain parse-compatible while HDBank logo is ignored", async () => {
  const design = await readFile(new URL("../app/certificate-design.ts", import.meta.url), "utf8");
  assert.match(design, /d\.hdbankLogo\?\?''/);
});
