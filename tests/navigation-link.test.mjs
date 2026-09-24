import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../app/domains/shell/view.tsx', import.meta.url), 'utf8');
const page = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');
const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
const navigation = await readFile(new URL('../app/domains/shell/navigation.ts', import.meta.url), 'utf8');
const ux = await readFile(new URL('../app/ux-refresh.css', import.meta.url), 'utf8');
const finalizer = await readFile(new URL('../scripts/finalize-content-architecture.mjs', import.meta.url), 'utf8');


test('Cẩm nang exposes both the canonical knowledge hub and the interactive checklist', () => {
  assert.ok(source.includes('className="knowledge-menu"'));
  assert.ok(source.includes('window.location.assign("/kien-thuc/")'));
  assert.ok(source.includes('>Bài viết kiến thức</strong>'));
  assert.ok(source.includes('>Danh sách kiểm tra</strong>'));
  assert.ok(source.includes('onNavigate("knowledge")'));
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

test('primary navigation stays complete and consistent across app and static pages', () => {
  assert.doesNotMatch(ux, /topbar nav button:nth-child\(4\)/);
  for (const label of ['Thử thách', 'Cẩm nang', 'Tin tức', 'Thực hành', 'Thành tích']) {
    assert.ok(finalizer.includes(label), `static navigation missing ${label}`);
  }
  assert.ok(finalizer.includes('link("/#/game", "Thử thách"'));
  assert.ok(finalizer.includes('link("/#/quiz", "Thực hành"'));
  assert.ok(finalizer.includes('link("/#/stats", "Thành tích"'));
  assert.ok(navigation.includes('hash === "#/game"'));
  assert.ok(navigation.includes('hashByView'));
  assert.ok(navigation.includes('if (hash === "#/quiz")'));
  assert.ok(navigation.includes('if (hash === "#/stats")'));
});


test('deep-link routes are not reset to the challenge page during progress hydration', () => {
  assert.ok(page.includes('const route = routeFromHash(window.location.hash);'));
  assert.ok(page.includes('if (route.view === "game") setView("game");'));
  assert.doesNotMatch(page, /window\\.location\\.hash !== "#\\/admin".*setView\\("game"\\)/s);
});
