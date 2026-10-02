import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { REQUIRED_HEADERS, evaluateSecurityHeaders } from "../scripts/check-security-headers.mjs";
import worker, {
  ANIMATION_CSP_DIRECTIVES,
  ANIMATION_PATH,
  CSP_DIRECTIVES,
  SECURITY_HEADERS,
  applySecurityHeaders,
  handleRequest,
  securityHeadersFor,
} from "../deploy/cloudflare-edge/worker.js";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

const originResponse = () => new Response("<!doctype html><title>x</title>", {
  status: 200,
  headers: {
    "content-type": "text/html; charset=utf-8",
    etag: '"abc123"',
    "cache-control": "max-age=600",
    "last-modified": "Fri, 02 Oct 2026 00:00:00 GMT",
    server: "GitHub.com",
  },
});

test("worker sets every required security header with the agreed values", () => {
  const response = applySecurityHeaders(originResponse(), "/");
  assert.equal(response.headers.get("strict-transport-security"), "max-age=31536000; includeSubDomains");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
  assert.equal(response.headers.get("permissions-policy"), "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  assert.equal(response.headers.get("cross-origin-opener-policy"), "same-origin");
  const csp = response.headers.get("content-security-policy");
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /form-action 'self'/);
  assert.match(csp, /object-src 'none'/);
  assert.doesNotMatch(csp.match(/script-src[^;]*/)[0], /unsafe-inline|unsafe-eval/);
  for (const name of REQUIRED_HEADERS) assert.ok(response.headers.get(name), `${name} missing`);
});

test("worker keeps body, status, ETag and caching headers untouched", async () => {
  const response = applySecurityHeaders(originResponse(), "/kien-thuc/");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("etag"), '"abc123"');
  assert.equal(response.headers.get("cache-control"), "max-age=600");
  assert.equal(response.headers.get("last-modified"), "Fri, 02 Oct 2026 00:00:00 GMT");
  assert.equal(response.headers.get("content-type"), "text/html; charset=utf-8");
  assert.equal(await response.text(), "<!doctype html><title>x</title>");

  const notModified = applySecurityHeaders(new Response(null, { status: 304, headers: { etag: '"abc123"' } }), "/");
  assert.equal(notModified.status, 304);
  assert.equal(notModified.headers.get("etag"), '"abc123"');
  assert.equal(notModified.headers.get("x-frame-options"), "DENY");
});

test("handleRequest proxies through fetch, redirects /.well-known/security.txt and rejects write methods", async () => {
  const calls = [];
  const fakeFetch = async (request) => {
    calls.push(request.url);
    return originResponse();
  };

  const page = await handleRequest(new Request("https://canhgiacso.com/quyen-rieng-tu/"), {}, fakeFetch);
  assert.equal(page.status, 200);
  assert.equal(page.headers.get("x-frame-options"), "DENY");
  assert.deepEqual(calls, ["https://canhgiacso.com/quyen-rieng-tu/"]);

  const wellKnown = await handleRequest(new Request("https://canhgiacso.com/.well-known/security.txt"), {}, fakeFetch);
  assert.equal(wellKnown.status, 301);
  assert.equal(wellKnown.headers.get("location"), "https://canhgiacso.com/security.txt");
  assert.equal(calls.length, 1, "redirect must not reach the origin");

  const post = await handleRequest(new Request("https://canhgiacso.com/", { method: "POST", body: "x" }), {}, fakeFetch);
  assert.equal(post.status, 405);
  assert.equal(post.headers.get("allow"), "GET, HEAD");

  const insecure = await handleRequest(new Request("http://canhgiacso.com/kien-thuc/?a=1"), {}, fakeFetch);
  assert.equal(insecure.status, 301);
  assert.equal(insecure.headers.get("location"), "https://canhgiacso.com/kien-thuc/?a=1");
});

test("ORIGIN rewrites the upstream host but never loops onto the serving host", async () => {
  const seen = [];
  const fakeFetch = async (request) => {
    seen.push([request.url, request.redirect]);
    return originResponse();
  };
  await handleRequest(new Request("https://edge.example.dev/cong-cu/?x=1"), { ORIGIN: "https://tanthanh381.github.io" }, fakeFetch);
  await handleRequest(new Request("https://canhgiacso.com/cong-cu/"), { ORIGIN: "https://canhgiacso.com" }, fakeFetch);
  await handleRequest(new Request("https://canhgiacso.com/cong-cu/"), { ORIGIN: "" }, fakeFetch);
  assert.deepEqual(seen[0], ["https://tanthanh381.github.io/cong-cu/?x=1", "manual"]);
  assert.equal(seen[1][0], "https://canhgiacso.com/cong-cu/");
  assert.equal(seen[2][0], "https://canhgiacso.com/cong-cu/");
});

test("the animation page has no CSP exception: same strict CSP as every page, framed only by this site", () => {
  const animation = securityHeadersFor(ANIMATION_PATH);
  const csp = animation["Content-Security-Policy"];
  assert.equal(animation["X-Frame-Options"], "SAMEORIGIN");
  assert.match(csp, /frame-ancestors 'self'/);
  assert.doesNotMatch(csp.match(/script-src[^;]*/)[0], /unsafe-/);
  assert.match(csp, /default-src 'self'/);
  // Chỉ frame-ancestors khác CSP chung: không còn ngoại lệ script/style/img nào cho riêng trang này.
  assert.deepEqual({ ...ANIMATION_CSP_DIRECTIVES, "frame-ancestors": CSP_DIRECTIVES["frame-ancestors"] }, CSP_DIRECTIVES);
  assert.equal(securityHeadersFor("/gioi-thieu/"), SECURITY_HEADERS);
  assert.equal(securityHeadersFor("/")["X-Frame-Options"], "DENY");
  assert.match(SECURITY_HEADERS["Content-Security-Policy"], /frame-ancestors 'none'/);
});

test("the header checker accepts the animation page headers (no relaxed CSP left to special-case)", () => {
  const results = evaluateSecurityHeaders(Object.fromEntries(
    Object.entries(securityHeadersFor(ANIMATION_PATH)).map(([name, value]) => [name.toLowerCase(), value]),
  ));
  assert.deepEqual(results.filter((item) => !item.ok), []);
});

test("worker CSP covers every origin the pages' own CSP needs, so Google Analytics after consent and Supabase keep working", async () => {
  const [home, privacy] = await Promise.all([read("github-pages/index.html"), read("public/quyen-rieng-tu/index.html")]);
  for (const html of [home, privacy]) {
    const meta = html.match(/Content-Security-Policy" content="([^"]*)"/)[1];
    for (const directive of meta.split(";").map((part) => part.trim()).filter(Boolean)) {
      const [name, ...values] = directive.split(/\s+/);
      if (["base-uri", "upgrade-insecure-requests"].includes(name)) continue;
      const edge = CSP_DIRECTIVES[name];
      assert.ok(edge, `worker CSP lacks directive ${name}`);
      for (const value of values) assert.ok(edge.includes(value), `worker CSP ${name} is missing ${value}`);
    }
  }
  assert.ok(CSP_DIRECTIVES["connect-src"].includes("https://goietwyapiywrtibpkwo.supabase.co"));
  assert.ok(CSP_DIRECTIVES["script-src"].includes("https://www.googletagmanager.com"));
});

test("default export is a fetch handler and wrangler.toml wires the worker", async () => {
  assert.equal(typeof worker.fetch, "function");
  const toml = await read("deploy/cloudflare-edge/wrangler.toml");
  assert.match(toml, /main = "worker\.js"/);
  assert.match(toml, /ORIGIN = ""/);
});

test("check-security-headers flags missing and weak headers and passes the worker's headers", () => {
  const good = evaluateSecurityHeaders(new Headers(SECURITY_HEADERS));
  assert.ok(good.every((item) => item.ok), JSON.stringify(good.filter((item) => !item.ok)));

  const missing = evaluateSecurityHeaders(new Headers({ "content-type": "text/html" }));
  assert.equal(missing.filter((item) => !item.present).length, REQUIRED_HEADERS.length);

  const weak = evaluateSecurityHeaders(new Headers({
    ...SECURITY_HEADERS,
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'",
    "Strict-Transport-Security": "max-age=60",
  }));
  assert.equal(weak.find((item) => item.name === "content-security-policy").ok, false);
  assert.equal(weak.find((item) => item.name === "strict-transport-security").ok, false);
});

test("production health reports security headers as warnings only", async () => {
  const health = await read("scripts/production-health.mjs");
  const checker = await read("scripts/check-security-headers.mjs");
  assert.match(health, /evaluateSecurityHeaders/);
  assert.match(health, /console\.warn\(`WARN security headers/);
  assert.doesNotMatch(health.split("headerWarnings")[1].split("\n")[0], /throw/);
  assert.match(checker, /process\.exitCode = 1/);
});

test("the Transform Rules table in the README stays identical to the worker headers", async () => {
  const readme = await read("deploy/cloudflare-edge/README.md");
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    assert.ok(readme.includes(`| \`${name}\` | \`${value}\` |`), `README table is out of sync for ${name}`);
  }
  const animation = securityHeadersFor(ANIMATION_PATH);
  assert.ok(readme.includes(`| \`Content-Security-Policy\` | \`${animation["Content-Security-Policy"]}\` |`));
  assert.ok(readme.includes("/.well-known/security.txt"));
});
