// Behavioural tests for app/certificate.ts: the PDF container builder and the
// certificate renderer/downloader, executed against a recording fake canvas
// and fake DOM (no browser needed).
import assert from "node:assert/strict";
import test from "node:test";
import { createTsLoader } from "./helpers/ts-loader.mjs";

// ---- fakes -----------------------------------------------------------------

function fakeBrowser() {
  const drawn = [];            // every string passed to fillText
  const downloads = [];        // { href, download, clicked }
  const revoked = [];
  const timers = [];
  const createdBlobs = [];

  const context = new Proxy({}, {
    get(target, prop) {
      if (prop === "measureText") return (text) => ({ width: String(text).length * 12 });
      if (prop === "fillText") return (text) => { drawn.push(String(text)); };
      if (prop in target) return target[prop];
      return () => ({ addColorStop() {} });
    },
    set(target, prop, value) { target[prop] = value; return true; },
  });

  const makeCanvas = () => ({
    width: 0,
    height: 0,
    getContext: () => context,
    toBlob(callback, type) { callback(new Blob([Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 0xff, 0xd9])], { type })); },
  });

  const document = {
    fonts: { ready: Promise.resolve() },
    body: { appendChild() {} },
    createElement(tag) {
      if (tag === "canvas") return makeCanvas();
      const link = { href: "", download: "", clicked: false, click() { link.clicked = true; }, remove() {} };
      downloads.push(link);
      return link;
    },
  };
  class FakeImage {
    naturalWidth = 800;
    naturalHeight = 800;
    set src(value) { this._src = value; }
    decode() { return Promise.resolve(); }
  }
  const URLShim = {
    createObjectURL(blob) { createdBlobs.push(blob); return `blob:fake/${createdBlobs.length}`; },
    revokeObjectURL(url) { revoked.push(url); },
  };
  const window = { setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; } };
  return { drawn, downloads, revoked, timers, createdBlobs, globals: { document, window, URL: URLShim, Image: FakeImage } };
}

const certificate = (overrides = {}) => ({
  certificateId: "id-1",
  certificateCode: "CGS-2026-ABC123",
  runId: "run-1",
  issuedAt: "2026-09-30T08:00:00.000Z",
  displayName: "Nguyễn Văn An",
  username: "an.nguyen",
  scenarioTotal: 42,
  completed: 42,
  correct: 40,
  accuracy: 95,
  score: 4920,
  rating: "XUẤT SẮC",
  ...overrides,
});

const text = (bytes) => Buffer.from(bytes).toString("latin1");

// ---- buildSinglePageJpegPdf ------------------------------------------------

const { buildSinglePageJpegPdf } = createTsLoader({ globals: {} })("app/certificate.ts");

test("buildSinglePageJpegPdf wraps the JPEG bytes unchanged in a PDF 1.4 container", () => {
  const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 9, 8, 7, 0xff, 0xd9]);
  const pdf = buildSinglePageJpegPdf(jpeg, 1754, 1240);
  const body = text(pdf);
  assert.ok(body.startsWith("%PDF-1.4\n"));
  assert.ok(body.endsWith("%%EOF"));
  assert.ok(body.includes("/Width 1754 /Height 1240"));
  assert.ok(body.includes("/Filter /DCTDecode"));
  assert.ok(body.includes(`/Length ${jpeg.length}`));
  assert.ok(Buffer.from(pdf).includes(Buffer.from(jpeg)), "the original JPEG is embedded byte-for-byte");
});

test("buildSinglePageJpegPdf produces a page of A4 landscape size", () => {
  const body = text(buildSinglePageJpegPdf(Uint8Array.from([1, 2, 3]), 10, 10));
  assert.ok(body.includes("/MediaBox [0 0 841.89 595.28]"));
  assert.ok(body.includes("841.89 0 0 595.28 0 0 cm"));
  assert.ok(body.includes("/Type /Pages /Kids [3 0 R] /Count 1"));
});

test("buildSinglePageJpegPdf cross-reference offsets point at the real objects", () => {
  const pdf = buildSinglePageJpegPdf(Uint8Array.from([0xff, 0xd8, 1, 2, 3, 4, 5, 0xff, 0xd9]), 100, 50);
  const body = text(pdf);
  const startxref = Number(/startxref\n(\d+)\n%%EOF$/.exec(body)[1]);
  assert.equal(body.slice(startxref, startxref + 4), "xref", "startxref points at the xref table");
  const entries = [...body.slice(startxref).matchAll(/^(\d{10}) 00000 n $/gm)].map((match) => Number(match[1]));
  assert.equal(entries.length, 5, "five indirect objects");
  entries.forEach((offset, index) => {
    assert.ok(body.slice(offset).startsWith(`${index + 1} 0 obj\n`), `object ${index + 1} starts at its recorded offset`);
  });
  assert.ok(body.includes("trailer\n<< /Size 6 /Root 1 0 R >>"));
});

// ---- renderCertificateCanvas / downloadTrainingCertificatePdf ----------------

async function load() {
  const env = fakeBrowser();
  const { defaultSiteContent } = createTsLoader({ globals: env.globals })("app/data.ts");
  const api = createTsLoader({ globals: env.globals })("app/certificate.ts");
  const classic = { ...defaultSiteContent.certificateTemplate };
  delete classic.design;
  return { env, api, designed: defaultSiteContent.certificateTemplate, classic };
}

test("legacy renderer prints the learner in upper case, their account and the certificate code", async () => {
  const { env, api, classic } = await load();
  const canvas = await api.renderCertificateCanvas(certificate(), classic);
  assert.equal(canvas.width, 1754);
  assert.equal(canvas.height, 1240);
  assert.ok(env.drawn.includes("NGUYỄN VĂN AN"), "recipient is upper-cased with the vi-VN locale");
  assert.ok(env.drawn.some((line) => line.includes("@an.nguyen") && line.includes("CGS-2026-ABC123")));
  assert.ok(env.drawn.includes(classic.footerNote), "regular certificates show the template footer");
});

test("guest certificates are clearly marked as not verified", async () => {
  const { env, api, classic } = await load();
  await api.renderCertificateCanvas(certificate({ certificateCode: "CGS-GUEST-XYZ" }), classic);
  const guestNote = "Bản ghi nhận chế độ khách - không phải chứng nhận nội bộ đã xác minh.";
  assert.ok(env.drawn.includes(guestNote));
  assert.ok(!env.drawn.includes(classic.footerNote), "the verified-certificate footer is replaced, not appended");
});

test("template placeholders in the description are filled from the certificate", async () => {
  const { env, api, classic } = await load();
  classic.description = "{displayName} (@{username}) đạt {correct}/{completed} câu, {accuracy}%, {score} điểm, xếp loại {rating} - {courseName}";
  await api.renderCertificateCanvas(certificate(), classic);
  const rendered = env.drawn.join(" ");
  assert.ok(rendered.includes("Nguyễn Văn An (@an.nguyen) đạt 40/42"), rendered);
  assert.ok(rendered.includes("95%"));
  assert.ok(rendered.includes("4920 điểm"));
  assert.ok(rendered.includes("xếp loại XUẤT SẮC"));
  assert.ok(!rendered.includes("{"), "no unresolved placeholders remain");
});

test("the designed (cyber) renderer shows rating, score, issue date and a guest notice", async () => {
  const { env, api, designed } = await load();
  await api.renderCertificateCanvas(certificate({ certificateCode: "CGS-GUEST-1" }), designed);
  const rendered = env.drawn.join("\n");
  assert.ok(rendered.includes("XUẤT SẮC"));
  assert.ok(rendered.includes("4920 PTS · 95% đúng"));
  assert.ok(rendered.includes("CGS-GUEST-1"));
  assert.ok(rendered.includes("không phải chứng nhận nội bộ đã xác minh"));
});

test("the designed renderer never draws HDBank branding on certificates", async () => {
  const { env, api, designed } = await load();
  designed.design.hdbankLogo = "data:image/png;base64,aGVsbG8=";
  await api.renderCertificateCanvas(certificate(), designed);
  assert.ok(!env.drawn.some((line) => /hdbank/i.test(line)));
});

test("downloadTrainingCertificatePdf builds a PDF and downloads it with an ASCII file name", async () => {
  const { env, api, classic } = await load();
  await api.downloadTrainingCertificatePdf(certificate(), classic);
  assert.equal(env.downloads.length, 1);
  assert.equal(env.downloads[0].download, "Chung-nhan-Canh-Giac-So-Nguyen-Van-An.pdf", "diacritics are stripped from the file name");
  assert.equal(env.downloads[0].clicked, true);
  assert.match(env.downloads[0].href, /^blob:fake\//);
  const [pdfBlob] = env.createdBlobs;
  assert.equal(pdfBlob.type, "application/pdf");
  const bytes = new Uint8Array(await pdfBlob.arrayBuffer());
  assert.ok(text(bytes).startsWith("%PDF-1.4"));
  assert.ok(text(bytes).includes("/Width 1754 /Height 1240"));
});

test("the object URL is revoked after the download starts, not before", async () => {
  const { env, api, classic } = await load();
  await api.downloadTrainingCertificatePdf(certificate(), classic);
  assert.deepEqual(env.revoked, [], "not revoked synchronously");
  assert.equal(env.timers.length, 1);
  assert.equal(env.timers[0].ms, 1000);
  env.timers[0].fn();
  assert.deepEqual(env.revoked, [env.downloads[0].href]);
});

test("the download file name falls back to the username, and is capped at 48 characters", async () => {
  const symbolsOnly = await load();
  await symbolsOnly.api.downloadTrainingCertificatePdf(certificate({ displayName: "★★★", username: "an.nguyen" }), symbolsOnly.classic);
  assert.equal(symbolsOnly.env.downloads[0].download, "Chung-nhan-Canh-Giac-So-an.nguyen.pdf");

  const long = await load();
  await long.api.downloadTrainingCertificatePdf(certificate({ displayName: "Nguyễn ".repeat(30).trim() }), long.classic);
  const name = long.env.downloads[0].download.replace(/^Chung-nhan-Canh-Giac-So-/, "").replace(/\.pdf$/, "");
  assert.ok(name.length <= 48, `file-name stem "${name}" must be at most 48 characters`);
  assert.match(name, /^[A-Za-z0-9-]+$/, "only URL/file-safe characters remain");
});
