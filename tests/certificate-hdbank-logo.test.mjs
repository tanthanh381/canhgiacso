import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("certificate PDF renderer keeps a default HDBank wordmark and supports an editable designed logo", async () => {
  const certificate = await readFile(new URL("../app/certificate.ts", import.meta.url), "utf8");
  assert.match(certificate, /function drawHdbankWordmark/);
  assert.match(certificate, /fillText\("HD"/);
  assert.match(certificate, /fillText\("Bank"/);
  assert.match(certificate, /Cam kết lợi ích cao nhất/);
  const fixedCalls = certificate.match(/drawHdbankWordmark\(context, 1390, 82, 250, 118\);/g) ?? [];
  assert.equal(fixedCalls.length, 1, "default certificate should retain the standard right-side wordmark");
  assert.match(certificate, /drawHdbankWordmark\(context, e\.x, e\.y, e\.width, e\.height\)/);
  assert.match(certificate, /design\.hdbankLogo/);
});
