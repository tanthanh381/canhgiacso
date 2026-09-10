from pathlib import Path

paths = [Path('app/page.tsx'), Path('app/admin.tsx'), Path('app/certificate.ts'), Path('app/data.ts')]
changed = []
for path in paths:
    if not path.exists():
        continue
    text = path.read_text(encoding='utf-8')
    new = text.replace('Chứng chỉ', 'Chứng nhận').replace('chứng chỉ', 'chứng nhận')
    if new != text:
        path.write_text(new, encoding='utf-8')
        changed.append(str(path))
print('Updated:', ', '.join(changed))
