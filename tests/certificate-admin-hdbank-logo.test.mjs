import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("admin can upload and position a separate HDBank certificate logo", async () => {
  const [design, editor, certificate] = await Promise.all([
    readFile(new URL("../app/certificate-design.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/certificate-editor.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/certificate.ts", import.meta.url), "utf8"),
  ]);
  assert.match(design, /hdbankLogo/);
  assert.match(design, /Logo HDBank/);
  assert.match(editor, /Logo HDBank \(bên phải\)/);
  assert.match(editor, /upload\(event\.target\.files\?\.\[0\],'hdbankLogo'\)/);
  assert.match(certificate, /key === 'logo' \|\| key === 'hdbankLogo'/);
  assert.match(certificate, /design\.hdbankLogo/);
  assert.match(certificate, /drawHdbankWordmark\(context, e\.x, e\.y, e\.width, e\.height\)/);
});

test("old certificate designs remain compatible without an HDBank image field", async () => {
  const design = await readFile(new URL("../app/certificate-design.ts", import.meta.url), "utf8");
  assert.match(design, /d\.hdbankLogo\?\?'+'/);
  assert.match(design, /key==='hdbankLogo'\?defaults\.elements\.hdbankLogo/);
});
