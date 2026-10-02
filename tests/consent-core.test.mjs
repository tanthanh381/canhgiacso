import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

// Giả lập DOM tối thiểu để chạy public/consent.js trong mọi môi trường (kể cả CI không có trình duyệt).
// Test hành vi đầy đủ trong Chromium nằm ở tests/consent.test.mjs.

const source = await readFile(new URL("../public/consent.js", import.meta.url), "utf8");

function matches(node, compound) {
  const tag = compound.match(/^[a-z][a-z0-9]*/i)?.[0];
  if (tag && node.tagName.toLowerCase() !== tag.toLowerCase()) return false;
  for (const [, name] of compound.matchAll(/\.([\w-]+)/g)) if (!node.classList.contains(name)) return false;
  for (const [, name, value] of compound.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)) {
    if (!node.attributes.has(name)) return false;
    if (value !== undefined && node.attributes.get(name) !== value) return false;
  }
  return true;
}

class FakeElement {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.attributes = new Map();
    this.children = [];
    this.parent = null;
    this.listeners = new Map();
    this.hidden = false;
    this.textContent = "";
    const classes = new Set();
    this.classList = {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
    };
    this.style = { setProperty() {}, removeProperty() {} };
    this.offsetHeight = 120;
    this._classes = classes;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === "class") for (const item of String(value).split(/\s+/).filter(Boolean)) this._classes.add(item);
    if (name === "href") this.href = String(value);
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  set src(value) {
    this._src = value;
    this.attributes.set("src", value);
  }

  get src() {
    return this._src;
  }

  append(...items) {
    for (const item of items) {
      if (typeof item === "string") this.textContent += item;
      else this.appendChild(item);
    }
  }

  appendChild(child) {
    child.remove();
    child.parent = this;
    this.children.push(child);
    return child;
  }

  insertBefore(child, reference) {
    child.remove();
    child.parent = this;
    const index = reference ? this.children.indexOf(reference) : -1;
    if (index < 0) this.children.push(child);
    else this.children.splice(index, 0, child);
    return child;
  }

  remove() {
    if (!this.parent) return;
    this.parent.children.splice(this.parent.children.indexOf(this), 1);
    this.parent = null;
  }

  addEventListener(type, listener) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  click() {
    for (const listener of this.listeners.get("click") ?? []) listener({ target: this, button: 0, preventDefault() {}, defaultPrevented: false });
  }

  focus() {
    this.ownerDocument.activeElement = this;
  }

  closest(selector) {
    if (matches(this, selector)) return this;
    return this.parent ? this.parent.closest(selector) : null;
  }

  *descendants() {
    for (const child of this.children) {
      yield child;
      yield* child.descendants();
    }
  }

  querySelectorAll(selector) {
    const parts = selector.trim().split(/\s+/);
    return [...this.descendants()].filter((node) => {
      if (!matches(node, parts[parts.length - 1])) return false;
      let ancestor = node.parent;
      for (let index = parts.length - 2; index >= 0; index -= 1) {
        while (ancestor && !matches(ancestor, parts[index])) ancestor = ancestor.parent;
        if (!ancestor) return false;
      }
      return true;
    });
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }
}

function createEnvironment({ stored, gpc = false, dnt = false, cookies = "", extraStorage = {} } = {}) {
  const store = new Map(Object.entries(extraStorage));
  if (stored) store.set("cgs-consent-v1", JSON.stringify(stored));
  const jar = new Map();
  for (const part of cookies.split(";").map((item) => item.trim()).filter(Boolean)) jar.set(part.split("=")[0], part);
  const document = {
    readyState: "complete",
    activeElement: null,
    listeners: new Map(),
    createElement(tag) {
      return new FakeElement(tag, document);
    },
    addEventListener(type, listener) {
      document.listeners.set(type, [...(document.listeners.get(type) ?? []), listener]);
    },
    contains: () => true,
    get cookie() {
      return [...jar.values()].join("; ");
    },
    set cookie(value) {
      const name = value.split("=")[0];
      if (/expires=Thu, 01 Jan 1970|max-age=0/.test(value)) jar.delete(name);
      else jar.set(name, value.split(";")[0]);
    },
  };
  document.documentElement = new FakeElement("html", document);
  document.head = new FakeElement("head", document);
  document.body = new FakeElement("body", document);
  document.documentElement.append(document.head, document.body);
  // Trình duyệt thật bắn "load" cho <link rel=stylesheet>; banner chỉ hiện sau đó để tránh nhấp nháy chưa có kiểu.
  const appendToHead = document.head.appendChild.bind(document.head);
  document.head.appendChild = (child) => {
    appendToHead(child);
    if (child.tagName === "LINK") for (const listener of child.listeners.get("load") ?? []) listener();
    return child;
  };
  document.querySelector = (selector) => document.documentElement.querySelector(selector);
  // chân trang tĩnh để consent.js gắn liên kết "Cài đặt cookie"
  const footer = new FakeElement("footer", document);
  const nav = new FakeElement("nav", document);
  nav.setAttribute("class", "seo-footer-links");
  footer.appendChild(nav);
  document.body.appendChild(footer);

  const windowListeners = new Map();
  const context = {
    document,
    Element: FakeElement,
    navigator: { globalPrivacyControl: gpc ? true : undefined, doNotTrack: dnt ? "1" : null },
    location: { hostname: "canhgiacso.com" },
    localStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
    },
    sessionStorage: { removeItem() {} },
    setTimeout: () => 0,
    requestAnimationFrame: (callback) => callback(),
    CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
    addEventListener: (type, listener) => windowListeners.set(type, [...(windowListeners.get(type) ?? []), listener]),
    dispatchEvent: () => true,
    console,
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  return { context, document, store, jar, scripts: () => document.head.children.filter((node) => node.tagName === "SCRIPT").map((node) => node.src) };
}

const plain = (value) => JSON.parse(JSON.stringify(value));
const banner = (document) => document.querySelector("section.cgs-consent");
const button = (document, choice) => document.querySelector(`[data-cgs-choice="${choice}"]`);
const ANALYTICS = ["canhgiacso-analytics-visitor-v1", "canhgiacso-analytics-session-v2"];

test("no consent yet: banner is created but nothing analytics-related is loaded or stored", () => {
  const env = createEnvironment({ cookies: "_ga=GA1.1.1.1; _ga_HH04Q7FYHM=GS2.1; theme=dark", extraStorage: { [ANALYTICS[0]]: "legacy", [ANALYTICS[1]]: "legacy" } });
  assert.ok(banner(env.document), "banner element exists");
  assert.equal(banner(env.document).getAttribute("role"), "region");
  assert.ok(button(env.document, "accept") && button(env.document, "reject"));
  assert.deepEqual(env.scripts().filter((src) => /googletagmanager|web-analytics|google-analytics-init/.test(src)), []);
  assert.equal(env.context.window.gtag, undefined);
  assert.equal(env.jar.has("_ga"), false, "legacy _ga cookie is removed");
  assert.equal(env.jar.has("_ga_HH04Q7FYHM"), false);
  assert.equal(env.jar.has("theme"), true, "unrelated cookies are untouched");
  for (const key of ANALYTICS) assert.equal(env.store.has(key), false);
  assert.equal(env.context.window.CGSConsent.get().analytics, false);
  assert.ok(env.document.querySelector("[data-cgs-consent-footer]"), "footer link inserted");
});

test("accept loads Google tag with Consent Mode v2 then the init file and the tracker, in that order", () => {
  const env = createEnvironment();
  button(env.document, "accept").click();
  assert.deepEqual(env.scripts(), [
    "https://www.googletagmanager.com/gtag/js?id=G-HH04Q7FYHM",
    "/google-analytics-init.js",
    "/web-analytics.js",
  ]);
  const layer = plain(Array.from(env.context.window.dataLayer, (entry) => Array.from(entry)));
  assert.deepEqual(layer, [
    ["consent", "default", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" }],
    ["consent", "update", { analytics_storage: "granted" }],
  ]);
  const record = JSON.parse(env.store.get("cgs-consent-v1"));
  assert.equal(record.analytics, true);
  assert.equal(record.v, 1);
  assert.equal(env.context.window.CGSConsent.get().analytics, true);
});

test("reject stores the choice and loads nothing", () => {
  const env = createEnvironment();
  button(env.document, "reject").click();
  assert.equal(JSON.parse(env.store.get("cgs-consent-v1")).analytics, false);
  assert.deepEqual(env.scripts().filter((src) => /googletagmanager|web-analytics|google-analytics-init/.test(src)), []);
  assert.equal(banner(env.document).hidden, true);
});

test("withdrawal notifies listeners first, then purges cookies and identifiers", () => {
  const env = createEnvironment({ stored: { analytics: true, ts: Date.now(), v: 1 }, cookies: "_ga=GA1.1.1.1; _ga_HH04Q7FYHM=GS2.1" });
  env.store.set(ANALYTICS[0], "visitor");
  env.store.set(ANALYTICS[1], "session");
  assert.equal(env.scripts().length, 3, "returning consenting visitor loads analytics immediately");
  const events = [];
  env.context.window.CGSConsent.onChange((state) => events.push(["change", state.analytics, env.store.has(ANALYTICS[0])]));
  env.context.window.CGSConsent.open();
  assert.equal(banner(env.document).hidden, false);
  button(env.document, "reject").click();
  assert.deepEqual(events, [["change", false, true]], "listeners (the tracker) run before the data is purged");
  assert.equal(env.jar.has("_ga"), false);
  assert.equal(env.jar.has("_ga_HH04Q7FYHM"), false);
  for (const key of ANALYTICS) assert.equal(env.store.has(key), false);
  assert.equal(env.context.window["ga-disable-G-HH04Q7FYHM"], true);
  const layer = plain(Array.from(env.context.window.dataLayer, (entry) => Array.from(entry)));
  assert.deepEqual(layer.at(-1), ["consent", "update", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" }]);
});

test("GPC and DNT count as refusal without a banner; an explicit opt-in still works", () => {
  for (const options of [{ gpc: true }, { dnt: true }]) {
    const env = createEnvironment(options);
    assert.equal(env.document.querySelector("section.cgs-consent")?.hidden ?? true, true, "no visible banner");
    assert.deepEqual(env.scripts(), []);
    const state = env.context.window.CGSConsent.get();
    assert.equal(state.analytics, false);
    assert.equal(state.decided, false);
    assert.equal(state.signal, options.gpc ? "gpc" : "dnt");
    env.context.window.CGSConsent.open();
    button(env.document, "accept").click();
    assert.equal(env.scripts().length, 3);
  }
});

test("expired or outdated stored consent is ignored", () => {
  for (const stored of [
    { analytics: true, ts: Date.now() - 400 * 24 * 60 * 60 * 1000, v: 1 },
    { analytics: true, ts: Date.now(), v: 99 },
    { analytics: "yes", ts: Date.now(), v: 1 },
  ]) {
    const env = createEnvironment({ stored });
    assert.equal(env.context.window.CGSConsent.get().analytics, false);
    assert.equal(env.context.window.CGSConsent.get().decided, false);
    assert.deepEqual(env.scripts(), []);
    assert.equal(banner(env.document).hidden === true, false, "banner is asked again");
  }
});
