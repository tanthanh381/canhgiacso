import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const bootstrap = readFileSync('app/session-bootstrap.tsx', 'utf8');
const entry = readFileSync('github-pages/main.tsx', 'utf8');

test('startup verifies browser session against Supabase Auth before rendering account UI', () => {
  assert.match(bootstrap, /auth\.getSession\(\)/);
  assert.match(bootstrap, /auth\.getUser\(\)/);
  assert.match(bootstrap, /auth\.refreshSession\(\)/);
  assert.match(bootstrap, /signOut\(\{ scope: "local" \}\)/);
  assert.match(entry, /<SessionBootstrap>[\s\S]*?<App \/>/);
});

test('transient verification failures preserve the local session and expose retry', () => {
  assert.match(bootstrap, /setState\("retry"\)/);
  assert.match(bootstrap, /Thử lại/);
  assert.match(bootstrap, /Dữ liệu tài khoản của bạn không bị xóa/);
});
