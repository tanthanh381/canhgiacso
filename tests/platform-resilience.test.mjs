import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");
const page = read("app/page.tsx");
const shell = read("app/domains/shell/view.tsx");
const mobileNav = read("app/domains/shell/mobile-nav.tsx");
const managementMenu = read("app/domains/shell/management-menu.tsx");
const seo = read("public/seo.css");
const storage = read("app/shared/browser-storage.ts");

test("public scenario loading always unlocks the built-in fallback library", () => {
  const block = page.match(/loadPublishedSiteContent\(\)[\s\S]*?return \(\) => \{ active = false; \};/)?.[0] ?? "";
  assert.match(block, /const normalized = normalizeSiteContent\(data\)/);
  assert.match(block, /setSiteContent\(normalized\)/);
  assert.match(block, /setContentReady\(true\)/);
  assert.match(block, /setDataStatus\(BUILT_IN_CONTENT_NOTICE\)/);
  assert.match(page, /const BUILT_IN_CONTENT_NOTICE = "[^"]*đang dùng thư viện tích hợp sẵn\.";/);
  assert.match(page, /noticeBeforeScoring === BUILT_IN_CONTENT_NOTICE/, "the notice survives a successful guest answer");
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
  assert.match(mobileNav, /MOBILE_KNOWLEDGE_MENU_ID = "ux-mobile-knowledge-menu"/);
  assert.match(mobileNav, /id=\{MOBILE_KNOWLEDGE_MENU_ID\} className="ux-mobile-knowledge-menu" role="group"/);
  assert.match(managementMenu, /aria-haspopup="true"/);
  assert.doesNotMatch(managementMenu, /aria-controls="ux-utility-popover"/);
  assert.doesNotMatch(shell, />Dashboard<\/button>/);
  assert.doesNotMatch(shell, />Quản lý nội dung<\/button>/);
  // The management menu is driven by the account and its role (React state), not by what the DOM happens to contain.
  assert.match(managementMenu, /data === "admin" \|\| data === "editor"|loadManagementRole/);
  assert.match(shell, /account && managementRole && \(\s*<ManagementMenu/);
  assert.match(managementMenu, /role === "admin" && <button type="button" onClick=\{\(\) => go\("#\/dashboard"\)\}>Dashboard<\/button>/);
  assert.match(managementMenu, /go\(adminHash\("content"\)\)\}>Quản lý nội dung/);
  assert.match(managementMenu, /\["traffic", "users"\] as ManagementTab\[\]/);
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
  assert.match(page, /preferredTheme\(\) === "dark"/);
  assert.match(read("app/shared/theme.ts"), /safeStorageGet\(THEME_KEY\)/);
});
