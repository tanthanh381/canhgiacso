import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("admin editor does not expose HDBank certificate logo controls", async () => {
  const [design, editor, certificate] = await Promise.all([
    readFile(new URL("../app/certificate-design.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/certificate-editor.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/certificate.ts", import.meta.url), "utf8"),
  ]);
  assert.match(design, /hdbankLogo/);
  assert.match(certificate, /design\.hdbankLogo/);
  assert.match(editor, /editableCertificateParts/);
  assert.match(editor, /id!=='hdbankLogo'/);
  assert.doesNotMatch(editor, /Logo HDBank \(bên phải\)/);
  assert.doesNotMatch(editor, /upload\(event\.target\.files\?\.\[0\],'hdbankLogo'\)/);
  assert.doesNotMatch(editor, /Xóa logo HDBank/);
});

test("existing certificate designs remain compatible with the HDBank image field", async () => {
  const design = await readFile(new URL("../app/certificate-design.ts", import.meta.url), "utf8");
  assert.match(design, /d\.hdbankLogo\?\?'+'/);
  assert.match(design, /key==='hdbankLogo'\?defaults\.elements\.hdbankLogo/);
});
