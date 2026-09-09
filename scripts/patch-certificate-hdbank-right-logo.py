from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    if old not in text:
        raise SystemExit(f"Patch anchor not found in {path}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")


certificate = Path("app/certificate.ts")
text = certificate.read_text(encoding="utf-8")

helper_anchor = '''function formatIssuedDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString("vi-VN");
}
'''
helper = '''function formatIssuedDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString("vi-VN");
}

function drawHdbankWordmark(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  context.save();
  context.fillStyle = "rgba(255, 255, 255, 0.96)";
  context.strokeStyle = "rgba(148, 163, 184, 0.36)";
  context.lineWidth = 1.5;
  context.beginPath();
  context.roundRect(x, y, width, height, 16);
  context.fill();
  context.stroke();

  const left = x + 18;
  const baseline = y + Math.round(height * 0.58);
  const logoFontSize = Math.min(54, Math.round(height * 0.46));
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.font = `800 ${logoFontSize}px Arial, Helvetica, sans-serif`;
  context.fillStyle = "#e30613";
  context.fillText("HD", left, baseline);
  const hdWidth = context.measureText("HD").width;

  context.font = `700 ${logoFontSize}px Arial, Helvetica, sans-serif`;
  context.fillStyle = "#374151";
  context.fillText("Bank", left + hdWidth - 2, baseline);
  const bankWidth = context.measureText("Bank").width;

  const leafX = Math.min(x + width - 28, left + hdWidth + bankWidth + 12);
  const leafY = y + Math.round(height * 0.31);
  context.fillStyle = "#f2b705";
  context.beginPath();
  context.ellipse(leafX, leafY, 18, 8, -0.55, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.ellipse(leafX + 4, leafY + 18, 20, 9, 0.5, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#6b7280";
  context.font = "500 12px Arial, Helvetica, sans-serif";
  context.fillText("Cam kết lợi ích cao nhất", left, y + height - 14, width - 36);
  context.restore();
}
'''
if "function drawHdbankWordmark(" not in text:
    if helper_anchor not in text:
        raise SystemExit("formatIssuedDate anchor not found")
    text = text.replace(helper_anchor, helper, 1)

call_anchor = '''  context.fillStyle = "#334155";
  context.font = "700 22px Arial, Helvetica, sans-serif";
  context.fillText(template.departmentName, 410, 184);
'''
call_replacement = '''  context.fillStyle = "#334155";
  context.font = "700 22px Arial, Helvetica, sans-serif";
  context.fillText(template.departmentName, 410, 184, 900);

  // Keep the HDBank brand visible in the exported PDF even when a custom team logo is used on the left.
  drawHdbankWordmark(context, 1390, 82, 250, 118);
'''
if "drawHdbankWordmark(context, 1390, 82, 250, 118);" not in text:
    if call_anchor not in text:
        raise SystemExit("default certificate header anchor not found")
    text = text.replace(call_anchor, call_replacement, 1)

end_anchor = '''    lines.forEach((line,index)=>context.fillText(line,x,e.y+e.height/2+(index-(lines.length-1)/2)*size*1.3,e.width-12));
    context.restore();
  }
}
'''
end_replacement = '''    lines.forEach((line,index)=>context.fillText(line,x,e.y+e.height/2+(index-(lines.length-1)/2)*size*1.3,e.width-12));
    context.restore();
  }

  // The right-side HDBank wordmark is intentionally outside the editable certificate parts
  // so it is always present in the final PDF and cannot be accidentally removed by layout edits.
  drawHdbankWordmark(context, 1390, 82, 250, 118);
}
'''
if text.count("drawHdbankWordmark(context, 1390, 82, 250, 118);") < 2:
    if end_anchor not in text:
        raise SystemExit("designed certificate footer anchor not found")
    text = text.replace(end_anchor, end_replacement, 1)

certificate.write_text(text, encoding="utf-8")

Path("tests/certificate-hdbank-logo.test.mjs").write_text('''import assert from "node:assert/strict";\nimport { readFile } from "node:fs/promises";\nimport test from "node:test";\n\ntest("certificate PDF renderer includes the HDBank wordmark on the right", async () => {\n  const certificate = await readFile(new URL("../app/certificate.ts", import.meta.url), "utf8");\n  assert.match(certificate, /function drawHdbankWordmark/);\n  assert.match(certificate, /fillText\\(\"HD\"/);\n  assert.match(certificate, /fillText\\(\"Bank\"/);\n  assert.match(certificate, /Cam kết lợi ích cao nhất/);\n  const calls = certificate.match(/drawHdbankWordmark\\(context, 1390, 82, 250, 118\\);/g) ?? [];\n  assert.equal(calls.length, 2, "wordmark must be rendered for both default and designed certificates");\n});\n''', encoding="utf-8")

print("HDBank certificate wordmark patch applied")
