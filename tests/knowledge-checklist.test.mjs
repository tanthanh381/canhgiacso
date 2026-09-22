import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Cẩm nang includes an interactive security checklist", async () => {
  const [page, styles] = await Promise.all([read("../app/page.tsx"), read("../app/globals.css")]);
  const checklist = page.slice(page.indexOf("const securityChecklistGroups"), page.indexOf("const securityChecklistItemIds"));
  const groupIds = [...checklist.matchAll(/^ {4}id: "([a-z-]+)",$/gm)].map((match) => match[1]);
  const itemIds = [...checklist.matchAll(/^ {6}\{ id: "([a-z]+-[a-z-]+)"/gm)].map((match) => match[1]);

  assert.equal(groupIds.length, 12);
  assert.equal(new Set(groupIds).size, 12);
  assert.equal(itemIds.length, 48);
  assert.equal(new Set(itemIds).size, 48);
  assert.equal((checklist.match(/priority: "/g) ?? []).length, 48);
  assert.match(page, /Danh sách kiểm tra/);
  assert.doesNotMatch(page, /Personal Security Checklist/);
  assert.match(page, /role="progressbar"/);
  assert.match(page, /type="checkbox"/);
  assert.match(page, /SECURITY_CHECKLIST_KEY/);
  assert.match(page, /safeStorageSet\(SECURITY_CHECKLIST_KEY/);
  assert.match(styles, /\.checklist-items/);
  assert.match(styles, /\.checklist-priority/);
  assert.match(styles, /@media \(max-width: 820px\)/);
});
