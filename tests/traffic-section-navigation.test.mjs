import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../app/admin-traffic-analytics.tsx', import.meta.url), 'utf8');

const targets = [
  ['Tổng quan', 'traffic-overview'],
  ['Thu hút', 'traffic-acquisition'],
  ['Nội dung', 'traffic-content'],
  ['Đối tượng', 'traffic-audience'],
  ['Chất lượng dữ liệu', 'traffic-quality'],
];

test('traffic analytics section menu scrolls to five distinct sections', () => {
  for (const [label, id] of targets) {
    assert.ok(source.includes(`document.getElementById("${id}")?.scrollIntoView`), `${label} phải trỏ tới ${id}`);
  }
  assert.doesNotMatch(source, /<a href="#traffic-/);
});
