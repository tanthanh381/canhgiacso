import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("phishing quiz is a standalone primary navigation function", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /type View = .*"quiz"/);
  assert.match(page, /navigateTo\("quiz"\).*Thực hành tương tác/);
  assert.match(page, /view === "quiz"/);
  const knowledgeStart = page.indexOf('view === "knowledge"');
  const quizStart = page.indexOf('view === "quiz"');
  assert.ok(knowledgeStart >= 0 && quizStart >= 0);
  const knowledgeSection = page.slice(knowledgeStart, quizStart);
  assert.doesNotMatch(knowledgeSection, /phishing-quiz-shell/);
  assert.match(page, /src=\{PHISHING_QUIZ_URL\}/);
});
