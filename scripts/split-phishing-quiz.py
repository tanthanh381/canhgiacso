from pathlib import Path

page = Path('app/page.tsx')
text = page.read_text(encoding='utf-8')
text = text.replace('type View = "game" | "knowledge" | "stats" | "evidence" | "dashboard" | "admin";', 'type View = "game" | "knowledge" | "quiz" | "stats" | "evidence" | "dashboard" | "admin";')

nav_old = '''          <button aria-current={view === "knowledge" ? "page" : undefined} className={view === "knowledge" ? "active" : ""} onClick={() => navigateTo("knowledge")}>Cẩm nang</button>\n          <button aria-current={view === "stats" ? "page" : undefined} className={view === "stats" ? "active" : ""} onClick={() => navigateTo("stats")}>Thành tích</button>'''
nav_new = '''          <button aria-current={view === "knowledge" ? "page" : undefined} className={view === "knowledge" ? "active" : ""} onClick={() => navigateTo("knowledge")}>Cẩm nang</button>\n          <button aria-current={view === "quiz" ? "page" : undefined} className={view === "quiz" ? "active" : ""} onClick={() => navigateTo("quiz")}>Trắc nghiệm</button>\n          <button aria-current={view === "stats" ? "page" : undefined} className={view === "stats" ? "active" : ""} onClick={() => navigateTo("stats")}>Thành tích</button>'''
if nav_old not in text:
    raise SystemExit('nav anchor not found')
text = text.replace(nav_old, nav_new, 1)

feature_start = text.find('          <section className="knowledge-feature" aria-labelledby="phishing-quiz-title">')
feature_end_anchor = '          <div className="knowledge-section-heading">'
feature_end = text.find(feature_end_anchor, feature_start)
if feature_start < 0 or feature_end < 0:
    raise SystemExit('knowledge quiz block not found')
text = text[:feature_start] + text[feature_end:]

quiz_block = '''\n      {view === "quiz" && (\n        <section className="content-page quiz-page">\n          <div className="page-hero quiz-hero">\n            <span className="eyebrow">THỰC HÀNH TƯƠNG TÁC · JIGSAW / GOOGLE</span>\n            <h1>Trắc nghiệm email lừa đảo</h1>\n            <p>Kiểm tra khả năng nhận diện email và trang đăng nhập giả mạo ngay trên Cảnh Giác Số. Bài thực hành được tải trực tiếp từ Jigsaw/Google.</p>\n          </div>\n          <div className="knowledge-safety-note quiz-safety-note"><strong>Lưu ý an toàn</strong><span>Không nhập mật khẩu ngân hàng, OTP, số thẻ hoặc dữ liệu thật trong bài thực hành.</span></div>\n          <div className="phishing-quiz-shell quiz-standalone-shell">\n            <div className="phishing-quiz-toolbar"><span><i aria-hidden="true" /> Bài thực hành bên thứ ba</span><a href={PHISHING_QUIZ_URL} target="_blank" rel="noopener noreferrer">Mở tab riêng ↗</a></div>\n            <iframe\n              src={PHISHING_QUIZ_URL}\n              title="Trắc nghiệm email lừa đảo của Jigsaw / Google"\n              loading="lazy"\n              referrerPolicy="no-referrer"\n              sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"\n            />\n          </div>\n          <p className="phishing-quiz-fallback">Nếu trình duyệt hoặc chính sách của Google chặn nội dung nhúng, hãy <a href={PHISHING_QUIZ_URL} target="_blank" rel="noopener noreferrer">mở bài trắc nghiệm trong tab mới ↗</a>.</p>\n        </section>\n      )}\n'''
anchor = '      {view === "stats" && ('
if anchor not in text:
    raise SystemExit('stats view anchor not found')
text = text.replace(anchor, quiz_block + '\n' + anchor, 1)
page.write_text(text, encoding='utf-8')

css_path = Path('app/globals.css')
css = css_path.read_text(encoding='utf-8')
addition = '''\n.quiz-page { max-width: 1500px; margin: 0 auto; padding-top: clamp(38px, 5vw, 68px); }\n.quiz-hero { max-width: 880px; margin-bottom: 24px; }\n.quiz-hero h1 { font-size: clamp(42px, 5.4vw, 72px); }\n.quiz-hero p { max-width: 760px; margin-top: 18px; }\n.quiz-safety-note { margin-bottom: 16px; }\n.quiz-standalone-shell iframe { min-height: 860px; }\n'''
if '.quiz-page {' not in css:
    marker = '.phishing-quiz-fallback { margin: 10px 2px 0; color: var(--muted); font-size: 11px; line-height: 1.5; }\n'
    if marker not in css:
        raise SystemExit('quiz css marker not found')
    css = css.replace(marker, marker + addition, 1)

css = css.replace('.topbar nav { grid-column: 1 / -1; grid-row: 2; margin-top: 10px; justify-content: stretch; }.topbar nav button { flex: 1; padding: 8px; }', '.topbar nav { grid-column: 1 / -1; grid-row: 2; margin-top: 10px; justify-content: flex-start; overflow-x: auto; scrollbar-width: none; }.topbar nav button { flex: 0 0 auto; padding: 8px 12px; }')
css = css.replace('.knowledge-page { padding-top: 32px; }.knowledge-hero { margin-bottom: 26px; }', '.knowledge-page { padding-top: 32px; }.quiz-page { padding-top: 32px; }.quiz-hero { margin-bottom: 20px; }.quiz-standalone-shell iframe { min-height: 680px; }.knowledge-hero { margin-bottom: 26px; }')
css_path.write_text(css, encoding='utf-8')

Path('tests/phishing-quiz-standalone.test.mjs').write_text('''import assert from "node:assert/strict";\nimport { readFile } from "node:fs/promises";\nimport test from "node:test";\n\ntest("phishing quiz is a standalone primary navigation function", async () => {\n  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");\n  assert.match(page, /type View = .*"quiz"/);\n  assert.match(page, /navigateTo\\("quiz"\\).*Trắc nghiệm/);\n  assert.match(page, /view === "quiz"/);\n  const knowledgeStart = page.indexOf('view === "knowledge"');\n  const quizStart = page.indexOf('view === "quiz"');\n  assert.ok(knowledgeStart >= 0 && quizStart >= 0);\n  const knowledgeSection = page.slice(knowledgeStart, quizStart);\n  assert.doesNotMatch(knowledgeSection, /phishing-quiz-shell/);\n  assert.match(page, /src=\\{PHISHING_QUIZ_URL\\}/);\n});\n''', encoding='utf-8')
print('Standalone phishing quiz patch applied')
