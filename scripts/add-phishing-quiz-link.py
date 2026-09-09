from pathlib import Path

path = Path('app/page.tsx')
text = path.read_text(encoding='utf-8')

anchor = 'const PUBLIC_SITE_URL = "https://canhgiacso.com/";\n'
replacement = anchor + 'const PHISHING_QUIZ_URL = "https://phishingquiz.withgoogle.com/?hl=vi";\n'
if 'PHISHING_QUIZ_URL' not in text:
    if anchor not in text:
        raise SystemExit('PUBLIC_SITE_URL anchor not found')
    text = text.replace(anchor, replacement, 1)

anchor = '''function progressKey(username: string | null) {
  return `khien-so-progress:${username ?? "guest"}`;
}
'''
replacement = anchor + '''
function openPhishingQuiz() {
  window.open(PHISHING_QUIZ_URL, "_blank", "noopener,noreferrer");
}
'''
if 'function openPhishingQuiz()' not in text:
    if anchor not in text:
        raise SystemExit('progressKey anchor not found')
    text = text.replace(anchor, replacement, 1)

old = '''      {view === "knowledge" && (
        <section className="content-page">
          <div className="page-hero"><span className="eyebrow">{siteContent.copy.knowledgeEyebrow}</span><h1>{siteContent.copy.knowledgeTitle}</h1><p>{siteContent.copy.knowledgeIntro}</p></div>
          <div className="knowledge-grid">{knowledgeCards.map((card, index) => <article key={card.title}><span>{String(index + 1).padStart(2, "0")}</span><BadgeIcon>{card.icon}</BadgeIcon><h2>{card.title}</h2><p>{card.text}</p></article>)}</div>
        </section>
      )}
'''
new = '''      {view === "knowledge" && (
        <section className="content-page">
          <div className="page-hero"><span className="eyebrow">{siteContent.copy.knowledgeEyebrow}</span><h1>{siteContent.copy.knowledgeTitle}</h1><p>{siteContent.copy.knowledgeIntro}</p></div>
          <article className="dashboard-card phishing-quiz-card">
            <div><span className="eyebrow">THỰC HÀNH BỔ SUNG · JIGSAW / GOOGLE</span><h2>Trắc nghiệm email lừa đảo</h2><p>Kiểm tra khả năng nhận diện email và trang đăng nhập giả mạo qua bộ câu hỏi tương tác của Jigsaw. Bài trắc nghiệm mở trên website của Google và không yêu cầu bạn nhập mật khẩu ngân hàng, OTP hoặc dữ liệu thật.</p></div>
            <button className="primary-button" onClick={openPhishingQuiz}>Bắt đầu trắc nghiệm ↗</button>
          </article>
          <div className="knowledge-grid">{knowledgeCards.map((card, index) => <article key={card.title}><span>{String(index + 1).padStart(2, "0")}</span><BadgeIcon>{card.icon}</BadgeIcon><h2>{card.title}</h2><p>{card.text}</p></article>)}</div>
        </section>
      )}
'''
if 'phishing-quiz-card' not in text:
    if old not in text:
        raise SystemExit('knowledge view anchor not found')
    text = text.replace(old, new, 1)

path.write_text(text, encoding='utf-8')

Path('tests/phishing-quiz-link.test.mjs').write_text('''import assert from "node:assert/strict";\nimport { readFile } from "node:fs/promises";\nimport test from "node:test";\n\ntest("Cẩm nang exposes the official Vietnamese Jigsaw phishing quiz safely", async () => {\n  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");\n  assert.match(page, /https:\\/\\/phishingquiz\\.withgoogle\\.com\\/\\?hl=vi/);\n  assert.match(page, /Trắc nghiệm email lừa đảo/);\n  assert.match(page, /Bắt đầu trắc nghiệm/);\n  assert.match(page, /window\\.open\\(PHISHING_QUIZ_URL, "_blank", "noopener,noreferrer"\\)/);\n  assert.doesNotMatch(page, /<iframe[^>]+phishingquiz\\.withgoogle\\.com/);\n});\n''', encoding='utf-8')

print('Phishing quiz integration patch applied')
