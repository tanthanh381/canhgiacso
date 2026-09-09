import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("certificate PDF renderer includes the HDBank wordmark on the right", async () => {
  const certificate = await readFile(new URL("../app/certificate.ts", import.meta.url), "utf8");
  assert.match(certificate, /function drawHdbankWordmark/);
  assert.match(certificate, /fillText\("HD"/);
  assert.match(certificate, /fillText\("Bank"/);
  assert.match(certificate, /Cam kết lợi ích cao nhất/);
  const calls = certificate.match(/drawHdbankWordmark\(context, 1390, 82, 250, 118\);/g) ?? [];
  assert.equal(calls.length, 2, "wordmark must be rendered for both default and designed certificates");
});
