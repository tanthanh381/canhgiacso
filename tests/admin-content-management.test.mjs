import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("trang Quản trị có trung tâm quản lý nội dung bài viết", async () => {
  const source = await readFile(new URL("../app/admin.tsx", import.meta.url), "utf8");
  assert.match(source, /type AdminTab = "content"/);
  assert.match(source, />Quản lý nội dung<\/button>/);
  assert.match(source, /<h2>Quản lý nội dung bài viết<\/h2>/);
  assert.match(source, /Mở quản lý bài viết/);
  assert.match(source, /save_managed_site_content/);
});
