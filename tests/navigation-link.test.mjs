import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');

test('Cẩm nang navigation uses the canonical knowledge hub URL', () => {
  assert.ok(source.includes('window.location.assign("/kien-thuc/")'));
  assert.match(source, />Cẩm nang<\/button>/);
  assert.doesNotMatch(source, /navigateTo\("knowledge"\)>Cẩm nang<\/button>/);
});
