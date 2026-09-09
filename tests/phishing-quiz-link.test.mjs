import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Cẩm nang embeds the official Vietnamese Jigsaw phishing quiz", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /https:\/\/phishingquiz\.withgoogle\.com\/\?hl=vi/);
  assert.match(page, /<iframe/);
  assert.match(page, /src=\{PHISHING_QUIZ_URL\}/);
  assert.match(page, /sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"/);
  assert.match(page, /referrerPolicy="no-referrer"/);
  assert.match(page, /mở bài trắc nghiệm trong tab mới/);
  assert.doesNotMatch(page, /onClick=\{openPhishingQuiz\}/);
});
