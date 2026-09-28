import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("certificate renderer no longer draws HDBank branding", async () => {
  const certificate = await readFile(new URL("../app/certificate.ts", import.meta.url), "utf8");
  assert.doesNotMatch(certificate, /function drawHdbankWordmark/);
  assert.doesNotMatch(certificate, /Cam kết lợi ích cao nhất/);
  assert.doesNotMatch(certificate, /drawHdbankWordmark\(/);
  assert.match(certificate, /if \(key === 'hdbankLogo'\) continue/);
});
