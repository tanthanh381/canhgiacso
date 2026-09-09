from pathlib import Path

path = Path("app/certificate.ts")
text = path.read_text(encoding="utf-8")

text = text.replace(
    "    ...template, logo: 'HD', recipient: certificate.displayName.toLocaleUpperCase('vi-VN'),",
    "    ...template, logo: 'HD', hdbankLogo: '', recipient: certificate.displayName.toLocaleUpperCase('vi-VN'),",
    1,
)

old = '''    if (key === 'logo') {
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
'''
new = '''    if (key === 'logo' || key === 'hdbankLogo') {
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
'''
if old not in text:
    raise SystemExit("Designed logo renderer anchor not found")
text = text.replace(old, new, 1)

old_tail = '''
  // The right-side HDBank wordmark is intentionally outside the editable certificate parts
  // so it is always present in the final PDF and cannot be accidentally removed by layout edits.
  drawHdbankWordmark(context, 1390, 82, 250, 118);
}'''
if old_tail not in text:
    raise SystemExit("Fixed HDBank logo tail anchor not found")
text = text.replace(old_tail, "\n}", 1)
path.write_text(text, encoding="utf-8")

Path("tests/certificate-admin-hdbank-logo.test.mjs").write_text('''import assert from "node:assert/strict";\nimport { readFile } from "node:fs/promises";\nimport test from "node:test";\n\ntest("admin can upload and position a separate HDBank certificate logo", async () => {\n  const [design, editor, certificate] = await Promise.all([\n    readFile(new URL("../app/certificate-design.ts", import.meta.url), "utf8"),\n    readFile(new URL("../app/certificate-editor.tsx", import.meta.url), "utf8"),\n    readFile(new URL("../app/certificate.ts", import.meta.url), "utf8"),\n  ]);\n  assert.match(design, /hdbankLogo/);\n  assert.match(design, /Logo HDBank/);\n  assert.match(editor, /Logo HDBank \(bên phải\)/);\n  assert.match(editor, /upload\(event\.target\.files\?\.\[0\],'hdbankLogo'\)/);\n  assert.match(certificate, /key === 'logo' \|\| key === 'hdbankLogo'/);\n  assert.match(certificate, /design\.hdbankLogo/);\n  assert.match(certificate, /drawHdbankWordmark\(context, e\.x, e\.y, e\.width, e\.height\)/);\n});\n\ntest("old certificate designs remain compatible without an HDBank image field", async () => {\n  const design = await readFile(new URL("../app/certificate-design.ts", import.meta.url), "utf8");\n  assert.match(design, /d\.hdbankLogo\?\?'+'/);\n  assert.match(design, /key==='hdbankLogo'\?defaults\.elements\.hdbankLogo/);\n});\n''', encoding="utf-8")

print("Admin HDBank logo renderer patch applied")
