import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Hai luồng CSS độc lập (app/styles cho SPA, public/*.css cho trang tĩnh) từng làm vỡ nhau khi đổi tên token
// (--green, --seo-accent-dark, --red). Test này khoá hợp đồng: mọi var(--x) không có giá trị dự phòng phải
// được định nghĩa, và CSS của trang tĩnh chỉ được dùng token do chính CSS tĩnh định nghĩa.

const walk = (dir, ext, out = []) => {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, ext, out);
    else if (name.endsWith(ext)) out.push(path);
  }
  return out;
};
const read = (path) => readFileSync(path, "utf8");
const definitions = (css) => new Set([...css.matchAll(/(--[a-zA-Z0-9_-]+)\s*:/g)].map((match) => match[1]));
const bareUses = (css) => new Set([...css.matchAll(/var\(\s*(--[a-zA-Z0-9_-]+)\s*\)/g)].map((match) => match[1]));

const appCss = walk("app", ".css");
const publicCss = readdirSync("public").filter((name) => name.endsWith(".css")).map((name) => join("public", name));
const scripts = [...walk("app", ".ts"), ...walk("app", ".tsx"), ...walk("public", ".js")].map(read).join("\n");
const scriptTokens = new Set([...scripts.matchAll(/(--[a-zA-Z0-9_-]+)/g)].map((match) => match[1]));

test("every var(--token) without a fallback is defined somewhere", () => {
  const defined = new Set(scriptTokens);
  for (const file of [...appCss, ...publicCss]) for (const name of definitions(read(file))) defined.add(name);
  const missing = [];
  for (const file of [...appCss, ...publicCss]) {
    for (const name of bareUses(read(file))) if (!defined.has(name)) missing.push(`${file}: ${name}`);
  }
  assert.deepEqual(missing, [], "undefined CSS custom properties render as invalid values (e.g. an invisible button)");
});

test("static-page stylesheets only use tokens defined by static-page stylesheets", () => {
  const defined = new Set();
  for (const file of publicCss) for (const name of definitions(read(file))) defined.add(name);
  const missing = [];
  for (const file of publicCss) {
    for (const name of bareUses(read(file))) if (!defined.has(name)) missing.push(`${file}: ${name}`);
  }
  assert.deepEqual(missing, [], "public/*.css is loaded without app/styles tokens");
});
