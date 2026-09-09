from pathlib import Path

path = Path("app/page.tsx")
text = path.read_text(encoding="utf-8")
old = 'placeholder="ten@hdbank.com.vn"'
new = 'placeholder="email@example.com"'
if old not in text:
    raise SystemExit("Expected HDBank email placeholder was not found")
path.write_text(text.replace(old, new, 1), encoding="utf-8")
print("Replaced HDBank email placeholder with a neutral example address.")
