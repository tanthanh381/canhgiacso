import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const bootstrap = readFileSync('app/session-bootstrap.tsx', 'utf8');
const entry = readFileSync('github-pages/main.tsx', 'utf8');
const root = readFileSync('app/bootstrap.tsx', 'utf8');
const layout = readFileSync('app/layout.tsx', 'utf8');

test('startup verifies browser session against Supabase Auth before rendering account UI', () => {
  assert.match(bootstrap, /auth\.getSession\(\)/);
  assert.match(bootstrap, /auth\.getUser\(\)/);
  assert.match(bootstrap, /auth\.refreshSession\(\)/);
  assert.match(bootstrap, /signOut\(\{ scope: "local" \}\)/);
  // Both entry points render the application inside AppRoot; the static build verifies the session, the server-rendered build cannot (its HTML must contain the page).
  assert.match(entry, /<AppRoot>[\s\S]*?<App \/>/);
  assert.match(root, /verifySession \? <SessionBootstrap>/);
  assert.match(layout, /<AppRoot verifySession=\{false\}>\{children\}<\/AppRoot>/);
});

test('transient verification failures preserve the local session and expose retry', () => {
  assert.match(bootstrap, /setState\("retry"\)/);
  assert.match(bootstrap, /Thử lại/);
  assert.match(bootstrap, /Dữ liệu tài khoản của bạn không bị xóa/);
});
