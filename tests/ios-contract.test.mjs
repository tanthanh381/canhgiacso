import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("iOS client uses only the publishable Supabase boundary", () => {
  const client = read("ios/CanhGiacSoCore/SupabaseClient.swift");
  const config = read("ios/CanhGiacSoCore/AppConfiguration.swift");

  assert.match(config, /sb_publishable_/);
  assert.doesNotMatch(`${client}\n${config}`, /sb_secret_|service[_-]?role/i);
  assert.match(client, /get_public_site_content/);
  assert.match(client, /get_game_state/);
  assert.match(client, /submit_game_choice/);
  assert.match(client, /Bearer \\\(accessToken \?\? configuration\.publishableKey\)/);
});

test("iOS app persists sessions in Keychain instead of user defaults", () => {
  const sessionStore = read("ios/CanhGiacSoApp/SessionStore.swift");

  assert.match(sessionStore, /import Security/);
  assert.match(sessionStore, /kSecClassGenericPassword/);
  assert.match(sessionStore, /kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly/);
  assert.doesNotMatch(sessionStore, /UserDefaults/);
});

test("iOS CI template builds the app and runs Swift checks", () => {
  const workflow = read("ios/Docs/IOS_GITHUB_ACTIONS_TEMPLATE.yml");

  assert.match(workflow, /swift run CanhGiacSoCoreChecks/);
  assert.match(workflow, /swift test/);
  assert.match(workflow, /xcodebuild/);
  assert.match(workflow, /CODE_SIGNING_ALLOWED=NO/);
});

test("iOS release docs cover security, TestFlight and App Store readiness", () => {
  const readiness = read("ios/Docs/APP_STORE_READINESS.md");
  const security = read("ios/Docs/SECURITY_RLS_REVIEW.md");
  const workflowTemplate = read("ios/Docs/IOS_GITHUB_ACTIONS_TEMPLATE.yml");

  assert.match(readiness, /TestFlight/);
  assert.match(readiness, /App Store Connect/);
  assert.match(readiness, /Privacy Nutrition Label/);
  assert.match(readiness, /workflow scope/);
  assert.match(security, /Row Level Security/);
  assert.match(security, /publishable key/);
  assert.match(security, /service_role/);
  assert.match(workflowTemplate, /name: iOS/);
});
