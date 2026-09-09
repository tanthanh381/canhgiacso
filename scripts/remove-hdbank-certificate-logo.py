from pathlib import Path

certificate_path = Path('app/certificate.ts')
text = certificate_path.read_text(encoding='utf-8')

start = text.find('function drawHdbankWordmark(')
end_marker = '\n\nexport async function renderCertificateCanvas'
end = text.find(end_marker, start)
if start == -1 or end == -1:
    raise SystemExit('drawHdbankWordmark block not found')
text = text[:start] + text[end + 2:]

text = text.replace(
    '  // Keep the HDBank brand visible in the exported PDF even when a custom team logo is used on the left.\n  drawHdbankWordmark(context, 1390, 82, 250, 118);\n\n',
    '',
    1,
)

old = """  for (const key of certificateParts) {
    const e = design.elements[key];
    context.save();
    context.beginPath(); context.rect(e.x, e.y, e.width, e.height); context.clip();
    if (key === 'logo' || key === 'hdbankLogo') {
      const imageSource = key === 'logo' ? design.logo : design.hdbankLogo;
      if (imageSource) {
        const image = new Image();
        image.src = imageSource;
        await image.decode();
        const scale = Math.min(e.width / image.naturalWidth, e.height / image.naturalHeight);
        context.drawImage(image, e.x + (e.width - image.naturalWidth * scale) / 2, e.y + (e.height - image.naturalHeight * scale) / 2, image.naturalWidth * scale, image.naturalHeight * scale);
      } else if (key === 'logo') {
        context.fillStyle=e.color; context.fillRect(e.x,e.y,e.width,e.height);
        context.fillStyle='#ffffff';context.font=`bold ${Math.min(e.fontSize,e.height*.6)}px Georgia`;context.textAlign='center';context.textBaseline='middle';context.fillText('HD',e.x+e.width/2,e.y+e.height/2,e.width);
      } else {
        drawHdbankWordmark(context, e.x, e.y, e.width, e.height);
      }
      context.restore(); continue;
    }
"""
new = """  for (const key of certificateParts) {
    // HDBank branding is intentionally not rendered on certificates.
    // Keep the legacy design field only for backwards-compatible stored templates.
    if (key === 'hdbankLogo') continue;
    const e = design.elements[key];
    context.save();
    context.beginPath(); context.rect(e.x, e.y, e.width, e.height); context.clip();
    if (key === 'logo') {
      if (design.logo) {
        const image = new Image();
        image.src = design.logo;
        await image.decode();
        const scale = Math.min(e.width / image.naturalWidth, e.height / image.naturalHeight);
        context.drawImage(image, e.x + (e.width - image.naturalWidth * scale) / 2, e.y + (e.height - image.naturalHeight * scale) / 2, image.naturalWidth * scale, image.naturalHeight * scale);
      } else {
        context.fillStyle=e.color; context.fillRect(e.x,e.y,e.width,e.height);
        context.fillStyle='#ffffff';context.font=`bold ${Math.min(e.fontSize,e.height*.6)}px Georgia`;context.textAlign='center';context.textBaseline='middle';context.fillText('HD',e.x+e.width/2,e.y+e.height/2,e.width);
      }
      context.restore(); continue;
    }
"""
if old not in text:
    raise SystemExit('designed certificate logo block not found')
text = text.replace(old, new, 1)
certificate_path.write_text(text, encoding='utf-8')

Path('tests/certificate-hdbank-logo.test.mjs').write_text('''import assert from "node:assert/strict";\nimport { readFile } from "node:fs/promises";\nimport test from "node:test";\n\ntest("certificate renderer no longer draws HDBank branding", async () => {\n  const certificate = await readFile(new URL("../app/certificate.ts", import.meta.url), "utf8");\n  assert.doesNotMatch(certificate, /function drawHdbankWordmark/);\n  assert.doesNotMatch(certificate, /Cam kết lợi ích cao nhất/);\n  assert.doesNotMatch(certificate, /drawHdbankWordmark\\(/);\n  assert.match(certificate, /if \\(key === 'hdbankLogo'\\) continue/);\n});\n''', encoding='utf-8')

Path('tests/certificate-admin-hdbank-logo.test.mjs').write_text('''import assert from "node:assert/strict";\nimport { readFile } from "node:fs/promises";\nimport test from "node:test";\n\ntest("admin editor and certificate output do not expose HDBank logo", async () => {\n  const [design, editor, certificate] = await Promise.all([\n    readFile(new URL("../app/certificate-design.ts", import.meta.url), "utf8"),\n    readFile(new URL("../app/certificate-editor.tsx", import.meta.url), "utf8"),\n    readFile(new URL("../app/certificate.ts", import.meta.url), "utf8"),\n  ]);\n  assert.match(design, /hdbankLogo/);\n  assert.match(editor, /editableCertificateParts/);\n  assert.match(editor, /id!==\'hdbankLogo\'/);\n  assert.doesNotMatch(editor, /Logo HDBank \\(bên phải\\)/);\n  assert.doesNotMatch(editor, /Xóa logo HDBank/);\n  assert.match(certificate, /if \\(key === 'hdbankLogo'\\) continue/);\n  assert.doesNotMatch(certificate, /drawHdbankWordmark/);\n});\n\ntest("legacy stored designs remain parse-compatible while HDBank logo is ignored", async () => {\n  const design = await readFile(new URL("../app/certificate-design.ts", import.meta.url), "utf8");\n  assert.match(design, /d\\.hdbankLogo\\?\\?\'\'/);\n});\n''', encoding='utf-8')

print('Removed HDBank branding from certificate renderer and preview.')
