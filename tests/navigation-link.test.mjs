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
  assert.ok(css.includes('/* Cẩm nang dropdown navigation */'));
  assert.ok(css.includes('.knowledge-submenu'));
});
