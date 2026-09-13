import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Cẩm nang includes an interactive security checklist", async () => {
  const [page, styles] = await Promise.all([read("../app/page.tsx"), read("../app/globals.css")]);
  const checklist = page.slice(page.indexOf("const securityChecklistGroups"), page.indexOf("const securityChecklistItemIds"));
  const itemIds = [...checklist.matchAll(/id: "([a-z]+-[a-z-]+)"/g)].map((match) => match[1]);

  assert.equal((checklist.match(/title: "/g) ?? []).length, 30);
  assert.equal(itemIds.length, 24);
  assert.equal(new Set(itemIds).size, 24);
  assert.match(page, /Danh sách kiểm tra/);
  assert.match(page, /role="progressbar"/);
  assert.match(page, /type="checkbox"/);
  assert.match(page, /SECURITY_CHECKLIST_KEY/);
  assert.match(page, /localStorage\.setItem\(SECURITY_CHECKLIST_KEY/);
  assert.match(styles, /\.checklist-items/);
  assert.match(styles, /@media \(max-width: 820px\)/);
});
