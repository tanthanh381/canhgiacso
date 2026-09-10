from pathlib import Path

page = Path('app/page.tsx')
text = page.read_text(encoding='utf-8')
old = '''      {view === "knowledge" && (
        <section className="content-page">
          <div className="page-hero"><span className="eyebrow">{siteContent.copy.knowledgeEyebrow}</span><h1>{siteContent.copy.knowledgeTitle}</h1><p>{siteContent.copy.knowledgeIntro}</p></div>
          <article className="dashboard-card phishing-quiz-card">
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
          <div className="knowledge-grid">{knowledgeCards.map((card, index) => <article key={card.title}><span>{String(index + 1).padStart(2, "0")}</span><BadgeIcon>{card.icon}</BadgeIcon><h2>{card.title}</h2><p>{card.text}</p></article>)}</div>
        </section>
      )}
'''
new = '''      {view === "knowledge" && (
        <section className="content-page knowledge-page">
          <div className="page-hero knowledge-hero">
            <div><span className="eyebrow">{siteContent.copy.knowledgeEyebrow}</span><h1>{siteContent.copy.knowledgeTitle}</h1></div>
            <p>{siteContent.copy.knowledgeIntro}</p>
          </div>

          <section className="knowledge-feature" aria-labelledby="phishing-quiz-title">
            <div className="knowledge-feature-copy">
              <span className="eyebrow">THỰC HÀNH TƯƠNG TÁC · JIGSAW / GOOGLE</span>
              <h2 id="phishing-quiz-title">Trắc nghiệm email lừa đảo</h2>
              <p>Thực hành nhận diện email và trang đăng nhập giả mạo ngay trên Cảnh Giác Số. Nội dung được tải trực tiếp từ Jigsaw/Google.</p>
              <div className="knowledge-safety-note"><strong>Lưu ý an toàn</strong><span>Không nhập mật khẩu ngân hàng, OTP, số thẻ hoặc dữ liệu thật trong bài thực hành.</span></div>
            </div>
            <div className="phishing-quiz-shell">
              <div className="phishing-quiz-toolbar"><span><i aria-hidden="true" /> Bài thực hành bên thứ ba</span><a href={PHISHING_QUIZ_URL} target="_blank" rel="noopener noreferrer">Mở tab riêng ↗</a></div>
              <iframe
                src={PHISHING_QUIZ_URL}
                title="Trắc nghiệm email lừa đảo của Jigsaw / Google"
                loading="lazy"
                referrerPolicy="no-referrer"
                sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"
              />
            </div>
            <p className="phishing-quiz-fallback">Nếu trình duyệt hoặc chính sách của Google chặn nội dung nhúng, hãy <a href={PHISHING_QUIZ_URL} target="_blank" rel="noopener noreferrer">mở bài trắc nghiệm trong tab mới ↗</a>.</p>
          </section>

          <div className="knowledge-section-heading">
            <div><span className="eyebrow">NỘI DUNG THAM KHẢO</span><h2>Cẩm nang thực hành</h2></div>
            <p>Các nguyên tắc ngắn gọn để nhận diện, xác minh và xử lý tình huống có dấu hiệu lừa đảo.</p>
          </div>
          <div className="knowledge-grid">{knowledgeCards.map((card, index) => <article key={card.title}><span>{String(index + 1).padStart(2, "0")}</span><BadgeIcon>{card.icon}</BadgeIcon><h2>{card.title}</h2><p>{card.text}</p></article>)}</div>
        </section>
      )}
'''
if old not in text:
    raise SystemExit('knowledge block not found')
page.write_text(text.replace(old, new, 1), encoding='utf-8')

css_path = Path('app/globals.css')
css = css_path.read_text(encoding='utf-8')
anchor = '.knowledge-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--line); border: 1px solid var(--line); }.knowledge-grid article { background: var(--surface); padding: 30px; min-height: 245px; position: relative; }.knowledge-grid article > span:first-child { position: absolute; top: 18px; right: 20px; color: var(--line); font: 26px Georgia, serif; }.knowledge-grid .badge-icon { margin-bottom: 45px; }.knowledge-grid h2 { font: 22px Georgia, serif; margin: 0 0 10px; }.knowledge-grid p { color: var(--muted); line-height: 1.6; font-size: 12px; }\n'
addition = '''.knowledge-page { padding-top: clamp(38px, 5vw, 68px); }
.knowledge-hero { max-width: none; display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(320px, .85fr); align-items: end; gap: clamp(30px, 7vw, 90px); margin-bottom: 34px; }
.knowledge-hero h1 { font-size: clamp(42px, 5.4vw, 72px); }
.knowledge-hero p { margin: 0 0 5px; max-width: 600px; }
.knowledge-feature { margin-bottom: 52px; }
.knowledge-feature-copy { display: grid; grid-template-columns: minmax(0, .75fr) minmax(0, 1.25fr); gap: 8px 36px; align-items: end; margin-bottom: 16px; }
.knowledge-feature-copy .eyebrow { grid-column: 1 / -1; margin: 0; }
.knowledge-feature-copy h2 { margin: 0; font-size: clamp(27px, 3.2vw, 40px); line-height: 1.1; }
.knowledge-feature-copy > p { margin: 0; color: var(--muted); font-size: 14px; line-height: 1.6; }
.knowledge-safety-note { grid-column: 1 / -1; display: flex; gap: 10px; align-items: center; margin-top: 8px; padding: 10px 13px; border-left: 3px solid var(--orange); background: color-mix(in srgb, var(--orange) 7%, var(--surface)); border-radius: 0 8px 8px 0; font-size: 12px; }
.knowledge-safety-note strong { flex: 0 0 auto; color: var(--ink); }.knowledge-safety-note span { color: var(--muted); }
.phishing-quiz-shell { overflow: hidden; border: 1px solid var(--line); border-radius: 16px; background: #fff; box-shadow: 0 18px 55px rgba(35, 25, 15, .08); }
.phishing-quiz-toolbar { min-height: 46px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 15px; border-bottom: 1px solid var(--line); background: color-mix(in srgb, var(--paper) 72%, #ffffff); font-size: 11px; }
.phishing-quiz-toolbar span { display: flex; align-items: center; gap: 7px; color: var(--muted); font-weight: 700; }.phishing-quiz-toolbar i { width: 8px; height: 8px; border-radius: 50%; background: #58b980; }
.phishing-quiz-toolbar a, .phishing-quiz-fallback a { color: var(--green); font-weight: 750; text-decoration: none; }.phishing-quiz-toolbar a:hover, .phishing-quiz-fallback a:hover { text-decoration: underline; }
.phishing-quiz-shell iframe { display: block; width: 100%; min-height: 820px; border: 0; background: #fff; }
.phishing-quiz-fallback { margin: 10px 2px 0; color: var(--muted); font-size: 11px; line-height: 1.5; }
.knowledge-section-heading { display: flex; align-items: end; justify-content: space-between; gap: 30px; margin-bottom: 18px; }
.knowledge-section-heading h2 { margin: 0; font-size: clamp(28px, 3vw, 38px); }.knowledge-section-heading p { max-width: 540px; margin: 0; color: var(--muted); font-size: 13px; line-height: 1.55; }
'''
if '.knowledge-feature {' not in css:
    if anchor not in css:
        raise SystemExit('knowledge grid css anchor not found')
    css = css.replace(anchor, addition + anchor, 1)

css = css.replace('  .knowledge-grid { grid-template-columns: 1fr; }.content-page { padding: 45px 18px; }.page-hero h1 { font-size: 49px; }', '  .knowledge-grid { grid-template-columns: 1fr; }.knowledge-hero { grid-template-columns: 1fr; gap: 16px; }.knowledge-feature-copy { grid-template-columns: 1fr; }.knowledge-safety-note { grid-column: auto; align-items: flex-start; flex-direction: column; gap: 4px; }.knowledge-section-heading { align-items: flex-start; flex-direction: column; gap: 8px; }.phishing-quiz-shell iframe { min-height: 760px; }.content-page { padding: 45px 18px; }.page-hero h1 { font-size: 49px; }')
css = css.replace('  .security-awareness-banner { align-items: flex-start; flex-direction: column; gap: 2px; padding: 9px 16px; text-align: left; font-size: 11px; }', '  .security-awareness-banner { align-items: flex-start; flex-direction: column; gap: 2px; padding: 9px 16px; text-align: left; font-size: 11px; }\n  .knowledge-page { padding-top: 32px; }.knowledge-hero { margin-bottom: 26px; }.knowledge-hero h1 { font-size: 42px; }.knowledge-feature { margin-bottom: 38px; }.knowledge-feature-copy h2 { font-size: 28px; }.phishing-quiz-toolbar { align-items: flex-start; flex-direction: column; gap: 5px; padding: 10px 12px; }.phishing-quiz-shell iframe { min-height: 680px; }')
css_path.write_text(css, encoding='utf-8')
print('Knowledge layout refined')
