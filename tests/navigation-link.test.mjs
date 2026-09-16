import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');
const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');

test('Cẩm nang exposes both the canonical knowledge hub and the interactive checklist', () => {
  assert.ok(source.includes('className="knowledge-menu"'));
  assert.ok(source.includes('window.location.assign("/kien-thuc/")'));
  assert.ok(source.includes('>Bài viết kiến thức</strong>'));
  assert.ok(source.includes('>Danh sách kiểm tra</strong>'));
  assert.ok(source.includes('navigateTo("knowledge")'));
  assert.ok(source.includes('document.getElementById("security-checklist-title")?.scrollIntoView'));
  assert.ok(source.includes('aria-current={view === "knowledge" ? "page" : undefined}'));
  assert.ok(source.includes('className={view === "knowledge" ? "active" : ""}'));
  assert.ok(css.includes('/* Cẩm nang dropdown navigation */'));
  assert.ok(css.includes('.knowledge-submenu'));
});

test('Cẩm nang dropdown stays compact and visually aligned with the navbar', () => {
  assert.ok(css.includes('.topbar nav{align-items:center}'));
  assert.ok(css.includes('.topbar nav>button,.knowledge-menu>summary{display:flex;align-items:center;justify-content:center'));
  assert.ok(css.includes('height:36px;min-height:36px'));
  assert.ok(css.includes('font-size:14px;font-weight:650'));
  assert.ok(css.includes('.knowledge-menu{position:relative;display:flex;align-items:center;align-self:center'));
  assert.ok(css.includes('width:232px'));
  assert.ok(css.includes('top:calc(100% + 5px)'));
  assert.ok(css.includes('box-shadow:0 12px 30px'));
  assert.ok(css.includes('border-right:1.5px solid currentColor'));
  assert.ok(css.includes('.topbar nav:has(.knowledge-menu[open]){overflow:visible}'));
  assert.ok(css.includes('height:34px;min-height:34px'));
  assert.ok(css.includes('height:32px;min-height:32px'));
  assert.doesNotMatch(css, /bottom:16px/);
  assert.doesNotMatch(css, /max-height:60vh/);
});
