// The content pipeline (scripts/content-compiler.mjs) rewrites public/** and
// github-pages/index.html IN PLACE. Every stage must therefore be idempotent:
// running it a second time must not change a single byte. A past regression
// appended the same phrase on each run ("7 cách tra cứu số lạ: 7 cách tra cứu
// số lạ: ..."), so this test also fails on repeated phrases in titles, links
// and headings. It runs on a temporary copy and never touches the working tree.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { collectHeadingTexts, findRepeatedPhrase, findRepeatedPhrasesInHtml } from "../scripts/lib/repeated-phrase.mjs";

const repo = fileURLToPath(new URL("..", import.meta.url));
const COPIED = ["content", "scripts", "seo", "public", "github-pages", "app", "package.json"];

function* files(directory) {
  for (const name of readdirSync(directory).sort()) {
    const full = join(directory, name);
    if (statSync(full).isDirectory()) yield* files(full);
    else yield full;
  }
}

function snapshot(root) {
  const entries = new Map();
  for (const file of files(root)) {
    entries.set(relative(root, file), createHash("sha256").update(readFileSync(file)).digest("hex"));
  }
  return entries;
}

function diff(before, after) {
  const changed = [];
  for (const [file, hash] of after) {
    if (!before.has(file)) changed.push(`added: ${file}`);
    else if (before.get(file) !== hash) changed.push(`modified: ${file}`);
  }
  for (const file of before.keys()) if (!after.has(file)) changed.push(`removed: ${file}`);
  return changed;
}

function compile(cwd) {
  return execFileSync(process.execPath, ["scripts/content-compiler.mjs"], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

// ---- one shared temporary workspace for the three pipeline assertions -------

const workspace = mkdtempSync(join(tmpdir(), "cgs-content-pipeline-"));
for (const entry of COPIED) cpSync(join(repo, entry), join(workspace, entry), { recursive: true });
test.after(() => rmSync(workspace, { recursive: true, force: true }));

let afterFirstRun;
let afterSecondRun;

test("content:compile succeeds on a clean copy of the repository", () => {
  const output = compile(workspace);
  assert.match(output, /compiled \d+ deterministic stages/);
  afterFirstRun = snapshot(workspace);
  assert.ok(existsSync(join(workspace, "public", "sitemap.xml")), "the finalizer writes public/sitemap.xml");
  assert.ok((readFileSync(join(workspace, "public", "sitemap.xml"), "utf8").match(/<loc>/g) ?? []).length >= 15);
});

test("running content:compile a second time changes no file (idempotent)", () => {
  assert.ok(afterFirstRun, "the first run must have completed");
  compile(workspace);
  afterSecondRun = snapshot(workspace);
  const changed = diff(afterFirstRun, afterSecondRun);
  assert.deepEqual(changed, [], `second run changed ${changed.length} file(s):\n${changed.slice(0, 15).join("\n")}`);
});

test("compiled pages contain no title, link or h1-h3 with a phrase repeated 3+ times in a row", () => {
  assert.ok(afterSecondRun, "the previous runs must have completed");
  const pages = [...afterSecondRun.keys()].filter((file) => file.endsWith(".html") && /^(public|github-pages)[\\/]/.test(file));
  assert.ok(pages.length > 50, `expected the full site to be present, found ${pages.length} HTML files`);
  const defects = [];
  for (const page of pages) {
    const html = readFileSync(join(workspace, page), "utf8");
    for (const problem of findRepeatedPhrasesInHtml(html)) {
      defects.push(`${page}: <${problem.kind}> "${problem.phrase}" x${problem.repeats}: ${problem.text.slice(0, 100)}`);
    }
  }
  assert.deepEqual(defects, [], defects.slice(0, 10).join("\n"));
});

// ---- the detector itself ------------------------------------------------------

test("findRepeatedPhrase flags the historical '7 cách tra cứu số lạ' regression", () => {
  const broken = "Cảnh giác lừa đảo: 7 cách tra cứu số lạ: 7 cách tra cứu số lạ: 7 cách tra cứu số lạ";
  assert.deepEqual(findRepeatedPhrase(broken), { phrase: "7 cách tra cứu số lạ", repeats: 3 });
});

test("findRepeatedPhrase ignores case and punctuation between repeats", () => {
  assert.deepEqual(findRepeatedPhrase("Chặn số! chặn số, CHẶN SỐ."), { phrase: "chặn số", repeats: 3 });
});

test("findRepeatedPhrase catches a long sentence duplicated only twice", () => {
  const found = findRepeatedPhrase("Bảo vệ tài khoản ngân hàng khỏi lừa đảo Bảo vệ tài khoản ngân hàng khỏi lừa đảo");
  assert.equal(found?.repeats, 2);
});

test("findRepeatedPhrase does not flag natural repetition", () => {
  for (const text of [
    "Lừa đảo đầu tư: lừa đảo đầu tư online và cách phòng tránh", // label + title (2x, short)
    "An toàn thông tin An toàn thông tin cá nhân",
    "Kiểm tra link, kiểm tra số điện thoại, kiểm tra tài khoản", // not back-to-back
    "",
    "một",
  ]) {
    assert.equal(findRepeatedPhrase(text), null, text);
  }
});

test("collectHeadingTexts reads title, links and h1-h3 only, with entities and tags resolved", () => {
  const html = `<title>A &amp; B</title><h1>Một <em>hai</em></h1><h2>Ba</h2><h3>Bốn</h3><h4>Năm</h4><p>Sáu</p><a href="/x"><span>Bảy</span></a>`;
  assert.deepEqual(collectHeadingTexts(html).map((item) => `${item.kind}:${item.text}`), ["title:A & B", "h1:Một hai", "h2:Ba", "h3:Bốn", "a:Bảy"]);
});

test("findRepeatedPhrasesInHtml reports the offending element kind and text", () => {
  const html = "<title>OK</title><a href='/'>Bấm vào đây Bấm vào đây Bấm vào đây</a>";
  const [problem] = findRepeatedPhrasesInHtml(html);
  assert.equal(problem.kind, "a");
  assert.equal(problem.phrase, "bấm vào đây");
});
