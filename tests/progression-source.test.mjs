import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("challenge levels are progressively unlocked in the UI", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const progression = await readFile(new URL("../app/progression.ts", import.meta.url), "utf8");
  assert.match(page, /getUnlockedDifficulties/);
  assert.match(page, /disabled=\{!unlocked\}/);
  assert.match(page, /Chọn tình huống đã mở ngẫu nhiên/);
  assert.match(progression, /Dễ.*Trung bình.*Khó.*Rất khó/s);
});

test("server-side scoring rejects skipping lower levels", async () => {
  const sql = await readFile(new URL("../supabase/secure_gameplay.sql", import.meta.url), "utf8");
  assert.match(sql, /Complete lower difficulty scenarios first/);
  assert.match(sql, /completed_attempt\.scenario_id/);
});
