import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Cẩm nang exposes the official Vietnamese Jigsaw phishing quiz safely", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /https:\/\/phishingquiz\.withgoogle\.com\/\?hl=vi/);
  assert.match(page, /Trắc nghiệm email lừa đảo/);
  assert.match(page, /Bắt đầu trắc nghiệm/);
  assert.match(page, /window\.open\(PHISHING_QUIZ_URL, "_blank", "noopener,noreferrer"\)/);
  assert.doesNotMatch(page, /<iframe[^>]+phishingquiz\.withgoogle\.com/);
});
