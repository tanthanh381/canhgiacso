import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const upgrade = await readFile(new URL("../app/domains/training/difficulty-upgrade.ts", import.meta.url), "utf8");
const data = await readFile(new URL("../app/data.ts", import.meta.url), "utf8");
const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

test("every challenge scenario has a harder, three-choice wording pass", () => {
  assert.equal((upgrade.match(/^\s{2}\d+: \{ choices: \[/gm) ?? []).length, 42);
  assert.doesNotMatch(upgrade, /\b(?:correct|moneyDelta|awarenessDelta|feedback)\s*:/);
  assert.match(data, /challengeDifficultyUpgrades/);
  assert.match(page, /Đâu là hành động an toàn nhất đầu tiên\?/);
});
