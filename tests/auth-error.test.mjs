import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = readFileSync(new URL("../app/auth-error.ts", import.meta.url), "utf8");
const exports = {};
new Function("exports", ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText)(exports);

const { authErrorMessage } = exports;

test("rate-limit errors are shown as actionable Vietnamese messages", () => {
  assert.match(authErrorMessage({ code: "over_email_send_rate_limit", status: 429 }, "register"), /giới hạn gửi email xác nhận/i);
  assert.doesNotMatch(authErrorMessage({ code: "over_email_send_rate_limit", message: "email rate limit exceeded" }, "register"), /email rate limit exceeded/i);
  assert.match(authErrorMessage({ code: "over_request_rate_limit", status: 429 }, "register"), /chờ vài phút/i);
});

test("authentication errors do not expose raw service messages", () => {
  assert.equal(authErrorMessage({ code: "invalid_credentials" }, "login"), "Email hoặc mật khẩu không đúng.");
  assert.match(authErrorMessage({ status: 500, message: "internal server detail" }, "register"), /Chưa thể tạo tài khoản/);
});
