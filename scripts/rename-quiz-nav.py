from pathlib import Path

page = Path('app/page.tsx')
text = page.read_text(encoding='utf-8')
old = '>Trắc nghiệm</button>'
new = '>Thực hành tương tác</button>'
if old not in text:
    raise SystemExit('navigation label not found')
page.write_text(text.replace(old, new, 1), encoding='utf-8')
print('Renamed quiz navigation label')
