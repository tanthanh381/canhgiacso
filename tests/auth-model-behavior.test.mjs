// Behavioural tests for the sign-up / sign-in validation policy
// (app/domains/auth/model.ts). The real validator is executed.
import assert from "node:assert/strict";
import test from "node:test";
import { createTsLoader } from "./helpers/ts-loader.mjs";

const load = createTsLoader();
const { validateAuthSubmission, USERNAME_PATTERN, PASSWORD_PATTERN } = load("app/domains/auth/model.ts");

const register = (overrides = {}) => ({
  mode: "register",
  email: "an.nguyen@example.com",
  username: "an.nguyen",
  displayName: "Nguyễn Văn An",
  password: "Matkhau#2026",
  confirmPassword: "Matkhau#2026",
  ...overrides,
});
const login = (overrides = {}) => ({ ...register({ mode: "login", username: "", displayName: "", confirmPassword: "" }), ...overrides });

test("a valid registration is accepted and normalised (trim + lower-case email/username)", () => {
  const result = validateAuthSubmission(register({
    email: "  An.Nguyen@Example.COM ",
    username: "  An.Nguyen ",
    displayName: "  Nguyễn Văn An  ",
  }));
  assert.deepEqual(result, { ok: true, email: "an.nguyen@example.com", username: "an.nguyen", displayName: "Nguyễn Văn An" });
});

test("emails without a domain, with spaces or empty are rejected before anything else", () => {
  for (const email of ["", "an", "an@", "an@example", "an @example.com", "@example.com"]) {
    const result = validateAuthSubmission(register({ email, username: "!", password: "x" }));
    assert.equal(result.ok, false, `email "${email}" should be rejected`);
    assert.match(result.error, /email/i, "the email error is reported first");
  }
});

test("usernames follow ^[a-z0-9._-]{3,24}$ after trimming and lower-casing", () => {
  for (const username of ["ab", "a".repeat(25), "an nguyen", "an@nguyen", "nguyễn", "an/nguyen", ""]) {
    const result = validateAuthSubmission(register({ username }));
    assert.equal(result.ok, false, `username "${username}" should be rejected`);
    assert.match(result.error, /Tên đăng nhập/);
  }
  for (const username of ["abc", "a".repeat(24), "a.b_c-d9", "AN.Nguyen"]) {
    assert.equal(validateAuthSubmission(register({ username })).ok, true, `username "${username}" should be accepted`);
  }
  assert.equal(USERNAME_PATTERN.test("An"), false, "the raw pattern is lower-case only; the validator lower-cases first");
});

test("passwords need 8-72 chars with upper, lower, digit, symbol and no whitespace", () => {
  const weak = {
    "too short": "Aa1!aaa",
    "no upper-case": "matkhau#2026",
    "no lower-case": "MATKHAU#2026",
    "no digit": "Matkhau#abcd",
    "no symbol": "Matkhau2026",
    "contains space": "Mat khau#2026",
    "73 characters": `Aa1!${"a".repeat(69)}`,
  };
  for (const [label, password] of Object.entries(weak)) {
    const result = validateAuthSubmission(register({ password, confirmPassword: password }));
    assert.equal(result.ok, false, `${label} must be rejected`);
    assert.match(result.error, /Mật khẩu cần 8–72 ký tự/, label);
  }
  const boundary = `Aa1!${"a".repeat(68)}`;
  assert.equal(boundary.length, 72);
  assert.equal(validateAuthSubmission(register({ password: boundary, confirmPassword: boundary })).ok, true);
  assert.equal(PASSWORD_PATTERN.test("Aa1!aaaa"), true, "8 characters is the minimum");
});

test("registration requires a 2-32 character display name", () => {
  for (const displayName of ["", " ", "A", "x".repeat(33)]) {
    const result = validateAuthSubmission(register({ displayName }));
    assert.equal(result.ok, false, `display name of length ${displayName.length}`);
    assert.match(result.error, /Tên hiển thị/);
  }
  assert.equal(validateAuthSubmission(register({ displayName: "An" })).ok, true);
  assert.equal(validateAuthSubmission(register({ displayName: "x".repeat(32) })).ok, true);
});

test("registration rejects a confirmation password that does not match", () => {
  const result = validateAuthSubmission(register({ confirmPassword: "Matkhau#2027" }));
  assert.deepEqual(result, { ok: false, error: "Mật khẩu xác nhận chưa khớp." });
});

test("login does not apply the registration-only rules but still needs 8+ characters", () => {
  assert.equal(validateAuthSubmission(login({ password: "alllowercase" })).ok, true, "legacy passwords can still sign in");
  const short = validateAuthSubmission(login({ password: "short" }));
  assert.deepEqual(short, { ok: false, error: "Mật khẩu cần ít nhất 8 ký tự." });
  const result = validateAuthSubmission(login());
  assert.equal(result.ok, true);
  assert.equal(result.username, "", "login ignores the username field");
});

test("login still validates the email address", () => {
  assert.equal(validateAuthSubmission(login({ email: "not-an-email" })).ok, false);
});
