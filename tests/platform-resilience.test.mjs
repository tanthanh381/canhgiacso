import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");
const page = read("app/page.tsx");
const shell = read("app/domains/shell/view.tsx");
const ux = read("app/ux-refresh.tsx");
const seo = read("public/seo.css");
const storage = read("app/shared/browser-storage.ts");

test("public scenario loading always unlocks the built-in fallback library", () => {
  const block = page.match(/loadPublishedSiteContent\(\)[\s\S]*?return \(\) => \{ active = false; \};/)?.[0] ?? "";
  assert.match(block, /const normalized = normalizeSiteContent\(data\)/);
  assert.match(block, /setSiteContent\(normalized\)/);
  assert.match(block, /setContentReady\(true\)/);
  assert.match(block, /đang dùng thư viện tích hợp sẵn/);
  assert.ok(block.indexOf("setContentReady(true)") > block.indexOf("if (normalized)"));
});

test("sync feedback and retry action share one visual status container", () => {
  assert.equal((shell.match(/className="sync-status"/g) ?? []).length, 1);
  assert.match(shell, /if \(!message && !hasPendingChoice\) return null/);
  assert.match(shell, /message && <span role="status" aria-live="polite">/);
  assert.match(shell, /hasPendingChoice && <button className="admin-secondary"/);
});

test("loss feedback is shown before completion certificate instead of stacking two modals", () => {
  assert.match(page, /completionCertificate && !lossNotice && <Modal open/);
  assert.match(page, /lossNotice && <Modal open/);
});

test("navigation popovers use native button keyboard semantics instead of incomplete ARIA menu behavior", () => {
  assert.match(shell, /className="knowledge-submenu" role="group"/);
  assert.match(ux, /id="ux-mobile-knowledge-menu" className="ux-mobile-knowledge-menu" role="group"/);
  assert.match(ux, /aria-haspopup="true"/);
  assert.doesNotMatch(ux, /aria-controls="ux-utility-popover"/);
  assert.match(shell, />Quản lý nội dung<\/button>/);
  assert.match(ux, /openAdminTab\("traffic"\)/);
  assert.match(ux, /openAdminTab\("users"\)/);
});

test("SEO pages avoid root overflow scroll containers that can break sticky headers", () => {
  assert.match(seo, /html\s*\{[\s\S]*?overflow-x:\s*clip;/);
  assert.match(seo, /body\s*\{[\s\S]*?overflow-x:\s*clip;/);
  assert.doesNotMatch(seo, /html\s*\{[\s\S]*?overflow-x:\s*hidden;/);
});


test("guest progress tolerates browsers that restrict localStorage", () => {
  assert.match(storage, /function safeStorageGet\(key: string\)/);
  assert.match(storage, /function safeStorageSet\(key: string, value: string\)/);
  assert.match(page, /safeStorageSet\(SECURITY_CHECKLIST_KEY/);
  assert.match(page, /safeStorageSet\(THEME_KEY/);
  assert.match(page, /safeStorageSet\(progressKey\(null\)/);
  assert.match(page, /safeStorageGet\(THEME_KEY\) === "dark"/);
});
