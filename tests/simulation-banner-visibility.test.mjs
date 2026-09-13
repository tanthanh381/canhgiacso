import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("simulation warning is limited to interactive training views", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const match = page.match(/const SIMULATION_BANNER_VIEWS[^=]*= new Set\(\[([^\]]+)]\)/);

  assert.ok(match, "expected an explicit allowlist for the simulation banner");
  const views = [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]);
  assert.deepEqual(views, ["game", "quiz"]);
  assert.match(page, /SIMULATION_BANNER_VIEWS\.has\(view\) && <div className="security-awareness-banner"/);
});

test("static information and SEO pages do not embed the simulation banner", async () => {
  const paths = [
    "public/kien-thuc/index.html",
    "public/kien-thuc/nhan-dien-email-phishing/index.html",
    "public/kien-thuc/nhan-dien-lua-dao-truc-tuyen/index.html",
    "public/kien-thuc/xu-ly-khi-bi-lua-dao-chuyen-tien/index.html",
  ];
  const pages = await Promise.all(paths.map((path) => readFile(new URL(path, root), "utf8")));

  for (const page of pages) {
    assert.doesNotMatch(page, /security-awareness-banner|Môi trường mô phỏng/i);
  }
});
