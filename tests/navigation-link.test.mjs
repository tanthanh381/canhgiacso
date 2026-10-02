import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { declOf, readAppStyles } from './helpers/styles.mjs';
import { primaryNavLabels } from './helpers/shell.mjs';

const source = await readFile(new URL('../app/domains/shell/view.tsx', import.meta.url), 'utf8');
const page = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');
const css = readAppStyles();
const navigation = await readFile(new URL('../app/domains/shell/navigation.ts', import.meta.url), 'utf8');
const ux = css;
const finalizer = await readFile(new URL('../scripts/finalize-content-architecture.mjs', import.meta.url), 'utf8');


test('Cẩm nang exposes both the canonical knowledge hub and the interactive checklist', async () => {
  assert.ok(source.includes('className="knowledge-menu"'));
  assert.match(navigation, /KNOWLEDGE_ARTICLES_PATH = "\/kien-thuc\/"/);
  assert.ok(source.includes('window.location.assign(KNOWLEDGE_ARTICLES_PATH)'));
  assert.ok(source.includes('>Bài viết kiến thức</strong>'));
  assert.ok(source.includes('>Danh sách kiểm tra</strong>'));
  assert.ok(source.includes('const openChecklist = () => { navigate("knowledge"); scrollToChecklist(); };'));
  assert.match(navigation, /CHECKLIST_TITLE_ID = "security-checklist-title"/);
  assert.ok(navigation.includes('document.getElementById(CHECKLIST_TITLE_ID)?.scrollIntoView'));
  const knowledgeView = await readFile(new URL('../app/domains/security-awareness/view.tsx', import.meta.url), 'utf8');
  assert.ok(knowledgeView.includes('id="security-checklist-title"'), 'the scroll target exists');
  // The current page is derived from the view; the summary of the open/closed menu keeps it too.
  assert.ok(source.includes('const active = isNavItemActive(item.view, view);'));
  assert.ok(source.includes('aria-current={current}'));
  assert.ok(declOf(css, '.knowledge-submenu', 'position'), 'the Cẩm nang dropdown panel has its own styles');
});

test('homepage navigation links to the Giới thiệu page', () => {
  assert.match(navigation, /ABOUT_PATH = "\/gioi-thieu\/"/);
  assert.ok(source.includes('window.location.assign(ABOUT_PATH)'));
  assert.ok(source.includes('>Giới thiệu</button>'));
  // The static page comes last, after every destination of the single-page app.
  assert.ok(source.indexOf('>Giới thiệu</button>') > source.indexOf('PRIMARY_NAV.map'));
  assert.deepEqual(primaryNavLabels(), ['Thử thách', 'Cẩm nang', 'Tin tức', 'Thực hành', 'Thành tích']);
});

test('Cẩm nang dropdown stays compact and visually aligned with the navbar', () => {
  assert.equal(declOf(css, '.knowledge-submenu', 'width'), '232px');
  assert.equal(declOf(css, '.knowledge-submenu', 'top'), 'calc(100% + 5px)');
  assert.match(declOf(css, '.knowledge-submenu', 'box-shadow'), /^0 12px 30px/);
  assert.equal(declOf(css, '.knowledge-menu > summary::after', 'border-right'), '1.5px solid currentColor');
  assert.equal(declOf(css, '.knowledge-submenu', 'bottom'), undefined);
  assert.equal(declOf(css, '.knowledge-submenu', 'max-height'), undefined);
});

test('all top-level navigation controls share the same vertical rhythm', () => {
  assert.equal(declOf(css, '.topbar nav', 'align-items'), 'center');
  assert.equal(declOf(css, '.topbar nav > button', 'display'), 'inline-flex');
  assert.equal(declOf(css, '.topbar nav > button', 'align-items'), 'center');
  const height = declOf(css, '.topbar nav > button', 'height');
  assert.equal(height, '42px');
  assert.equal(declOf(css, '.knowledge-menu', 'height'), height);
  assert.equal(declOf(css, '.knowledge-menu > summary', 'height'), height);
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
  assert.ok(page.includes('if (route.view === "game" && window.location.hash !== "#/admin") setView("game");'));
  assert.ok(!page.includes('window.location.hash !== "#/admin" && !window.location.hash.startsWith("#/news")'));
});
