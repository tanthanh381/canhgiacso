from pathlib import Path

path = Path('app/page.tsx')
text = path.read_text(encoding='utf-8')

old_fn = '''function openPhishingQuiz() {
  window.open(PHISHING_QUIZ_URL, "_blank", "noopener,noreferrer");
}
'''
text = text.replace(old_fn, '')

old_card = '''          <article className="dashboard-card phishing-quiz-card">
            <div><span className="eyebrow">THỰC HÀNH BỔ SUNG · JIGSAW / GOOGLE</span><h2>Trắc nghiệm email lừa đảo</h2><p>Kiểm tra khả năng nhận diện email và trang đăng nhập giả mạo qua bộ câu hỏi tương tác của Jigsaw. Bài trắc nghiệm mở trên website của Google và không yêu cầu bạn nhập mật khẩu ngân hàng, OTP hoặc dữ liệu thật.</p></div>
            <button className="primary-button" onClick={openPhishingQuiz}>Bắt đầu trắc nghiệm ↗</button>
          </article>
'''
new_card = '''          <article className="dashboard-card phishing-quiz-card">
            <div><span className="eyebrow">THỰC HÀNH BỔ SUNG · JIGSAW / GOOGLE</span><h2>Trắc nghiệm email lừa đảo</h2><p>Thực hành nhận diện email và trang đăng nhập giả mạo ngay trên Cảnh Giác Số. Nội dung bên dưới được tải trực tiếp từ Jigsaw/Google; không nhập mật khẩu ngân hàng, OTP, số thẻ hoặc dữ liệu thật.</p></div>
            <div style={{ marginTop: 18, overflow: "hidden", border: "1px solid var(--line)", borderRadius: 16, background: "#fff" }}>
              <iframe
                src={PHISHING_QUIZ_URL}
                title="Trắc nghiệm email lừa đảo của Jigsaw / Google"
                loading="lazy"
                referrerPolicy="no-referrer"
                sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                style={{ display: "block", width: "100%", minHeight: 920, border: 0, background: "#fff" }}
              />
            </div>
            <p style={{ marginTop: 12, fontSize: 13, color: "var(--muted)" }}>Nếu trình duyệt hoặc chính sách của Google chặn nội dung nhúng, bạn vẫn có thể <a href={PHISHING_QUIZ_URL} target="_blank" rel="noopener noreferrer">mở bài trắc nghiệm trong tab mới ↗</a>.</p>
          </article>
'''
if old_card not in text:
    raise SystemExit('phishing quiz card anchor not found')
text = text.replace(old_card, new_card, 1)

path.write_text(text, encoding='utf-8')

Path('tests/phishing-quiz-link.test.mjs').write_text('''import assert from "node:assert/strict";\nimport { readFile } from "node:fs/promises";\nimport test from "node:test";\n\ntest("Cẩm nang embeds the official Vietnamese Jigsaw phishing quiz", async () => {\n  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");\n  assert.match(page, /https:\\/\\/phishingquiz\\.withgoogle\\.com\\/\\?hl=vi/);\n  assert.match(page, /<iframe/);\n  assert.match(page, /src=\\{PHISHING_QUIZ_URL\\}/);\n  assert.match(page, /sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"/);\n  assert.match(page, /referrerPolicy="no-referrer"/);\n  assert.match(page, /mở bài trắc nghiệm trong tab mới/);\n  assert.doesNotMatch(page, /onClick=\\{openPhishingQuiz\\}/);\n});\n''', encoding='utf-8')

print('Embedded phishing quiz patch applied')
