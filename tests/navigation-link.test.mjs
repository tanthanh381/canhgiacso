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
  assert.ok(css.includes('/* Cẩm nang dropdown navigation */'));
  assert.ok(css.includes('.knowledge-submenu'));
});

test('Cẩm nang dropdown stays compact and visually aligned with the navbar', () => {
  assert.ok(css.includes('width:232px'));
  assert.ok(css.includes('top:calc(100% + 5px)'));
  assert.ok(css.includes('box-shadow:0 12px 30px'));
  assert.ok(css.includes('border-right:1.5px solid currentColor'));
  assert.ok(css.includes('.topbar nav:has(.knowledge-menu[open]){overflow:visible}'));
  assert.doesNotMatch(css, /bottom:16px/);
  assert.doesNotMatch(css, /max-height:60vh/);
});

test('all top-level navigation controls share the same vertical rhythm', () => {
  assert.ok(css.includes('.topbar nav{align-items:center}'));
  assert.ok(css.includes('.topbar nav>button{display:inline-flex;align-items:center;justify-content:center;height:42px'));
  assert.ok(css.includes('.knowledge-menu{position:relative;flex:0 0 auto;align-self:center;display:flex;align-items:center;height:42px}'));
  assert.ok(css.includes('.knowledge-menu>summary{display:inline-flex;align-items:center;justify-content:center;height:42px'));
  assert.ok(css.includes('.topbar nav>button,.knowledge-menu>summary{height:40px;padding:0 12px}'));
  assert.ok(css.includes('.topbar nav>button,.knowledge-menu>summary{height:38px;padding:0 6px;font-size:12px}'));
});
