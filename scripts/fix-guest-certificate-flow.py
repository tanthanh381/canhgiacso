from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    if old not in text:
        raise SystemExit(f"Patch anchor not found in {path}: {old[:140]!r}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")


replace_once(
    "app/page.tsx",
    'const THEME_KEY = "khien-so-theme";\n',
    'const THEME_KEY = "khien-so-theme";\nconst GUEST_CERTIFICATE_KEY = "canh-giac-so-guest-certificate";\n',
)

replace_once(
    "app/page.tsx",
    '''    const choice = selected.choices[index];
    const nextBalance = Math.max(0, balance + choice.moneyDelta);
    const nextAwareness = Math.max(0, Math.min(100, awareness + choice.awarenessDelta));
    setAnswer(index);
    setBalance(nextBalance);
    setAwareness(nextAwareness);
    setResults((value) => [...value, { scenarioId: selected.id, correct: choice.correct, choiceIndex: index }]);
    if (!choice.correct) {
''',
    '''    const choice = selected.choices[index];
    const nextBalance = Math.max(0, balance + choice.moneyDelta);
    const nextAwareness = Math.max(0, Math.min(100, awareness + choice.awarenessDelta));
    const nextResults = [...results, { scenarioId: selected.id, correct: choice.correct, choiceIndex: index }];
    setAnswer(index);
    setBalance(nextBalance);
    setAwareness(nextAwareness);
    setResults(nextResults);
    if (nextResults.length >= scenarios.length) {
      const guestCertificate = getOrCreateGuestCertificate(nextResults);
      setCompletionCertificate(guestCertificate);
      setDataStatus("Bạn đã hoàn thành khóa đào tạo. Bản ghi nhận PDF đã sẵn sàng.");
    }
    if (!choice.correct) {
''',
)

anchor = '''  async function downloadCertificate(certificate: TrainingCertificate) {
'''
helper = '''  function getOrCreateGuestCertificate(sourceResults: Result[] = results): TrainingCertificate {
    const scenarioIds = new Set(scenarios.map((scenario) => scenario.id));
    const validResults = sourceResults.filter((result) => scenarioIds.has(result.scenarioId));
    const completed = new Set(validResults.map((result) => result.scenarioId)).size;
    const correct = new Set(validResults.filter((result) => result.correct).map((result) => result.scenarioId)).size;
    const accuracy = scenarios.length ? Math.round((correct / scenarios.length) * 100) : 0;
    const guestScore = validResults.reduce((total, result) => total + (result.correct ? 120 : 20), 0);
    const rating: TrainingCertificate["rating"] = accuracy >= 90 ? "XUẤT SẮC" : accuracy >= 80 ? "TỐT" : accuracy >= 70 ? "ĐẠT" : "ĐẠT CƠ BẢN";

    try {
      const stored = localStorage.getItem(GUEST_CERTIFICATE_KEY);
      if (stored) {
        const existing = JSON.parse(stored) as TrainingCertificate;
        if (existing?.certificateCode?.startsWith("CGS-GUEST-")
          && existing.scenarioTotal === scenarios.length
          && existing.completed === completed
          && existing.correct === correct
          && existing.displayName === (playerName.trim() || "Người chơi ẩn danh")) return existing;
      }
    } catch { /* create a new local certificate below */ }

    const certificateId = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const certificate: TrainingCertificate = {
      certificateId,
      certificateCode: `CGS-GUEST-${certificateId.replaceAll("-", "").slice(0, 10).toUpperCase()}`,
      runId: "guest-local",
      issuedAt: new Date().toISOString(),
      displayName: playerName.trim() || "Người chơi ẩn danh",
      username: "khach",
      scenarioTotal: scenarios.length,
      completed,
      correct,
      accuracy,
      score: guestScore,
      rating,
    };
    try { localStorage.setItem(GUEST_CERTIFICATE_KEY, JSON.stringify(certificate)); } catch { /* download still works */ }
    return certificate;
  }

'''
replace_once("app/page.tsx", anchor, helper + anchor)

replace_once(
    "app/page.tsx",
    '''  function nextScenario() {
    const remaining = availableScenarios.find((item) => !completedIds.has(item.id));
    const fallback = availableScenarios[0] ?? scenarios[0];
    if (remaining || fallback) chooseScenario((remaining ?? fallback).id);
  }
''',
    '''  function nextScenario() {
    if (results.length >= scenarios.length) {
      if (sessionAccount) {
        const issued = runId ? certificates.find((item) => item.runId === runId) : null;
        if (issued) setCompletionCertificate(issued);
        else void ensureCurrentCertificate();
      } else {
        setCompletionCertificate(getOrCreateGuestCertificate());
      }
      return;
    }
    const remaining = availableScenarios.find((item) => !completedIds.has(item.id));
    const fallback = availableScenarios[0] ?? scenarios[0];
    if (remaining || fallback) chooseScenario((remaining ?? fallback).id);
  }
''',
)

replace_once(
    "app/page.tsx",
    '''                    <button onClick={nextScenario}>Kịch bản tiếp theo →</button>
''',
    '''                    <button onClick={nextScenario}>{results.length >= scenarios.length ? "Xem chứng chỉ PDF →" : "Kịch bản tiếp theo →"}</button>
''',
)

replace_once(
    "app/page.tsx",
    '''          ) : (
            <article className={`training-certificate-card ${results.length >= scenarios.length ? "ready" : "locked"}`}>
              <span className="certificate-card-mark" aria-hidden="true">{results.length >= scenarios.length ? "✓" : "◇"}</span>
              <div className="certificate-card-copy"><span className="eyebrow">CHỨNG CHỈ HOÀN THÀNH</span><h2>{results.length >= scenarios.length ? "Đăng nhập để nhận chứng chỉ chính thức" : "Chứng chỉ sẽ mở khi hoàn thành khóa"}</h2><p>{results.length >= scenarios.length ? "Chế độ khách không cấp chứng chỉ định danh. Đăng nhập và hoàn thành lượt đào tạo đồng bộ để nhận PDF." : `Tiến độ hiện tại ${results.length}/${scenarios.length} tình huống.`}</p></div>
              {results.length >= scenarios.length && <button className="primary-button certificate-download" onClick={() => openAuth("login")}>Đăng nhập</button>}
            </article>
          )}
''',
    '''          ) : (
            <article className={`training-certificate-card ${results.length >= scenarios.length ? "ready" : "locked"}`}>
              <span className="certificate-card-mark" aria-hidden="true">{results.length >= scenarios.length ? "✓" : "◇"}</span>
              <div className="certificate-card-copy"><span className="eyebrow">BẢN GHI NHẬN HOÀN THÀNH</span><h2>{results.length >= scenarios.length ? "Khóa đào tạo đã hoàn thành" : "Bản ghi nhận sẽ mở khi hoàn thành khóa"}</h2><p>{results.length >= scenarios.length ? "Bạn có thể tải PDF ngay ở chế độ khách. Bản này lưu cục bộ và không thay thế chứng chỉ nội bộ đã xác minh của tài khoản đăng nhập." : `Tiến độ hiện tại ${results.length}/${scenarios.length} tình huống.`}</p></div>
              {results.length >= scenarios.length && <button className="primary-button certificate-download" disabled={certificateDownloading} onClick={() => void downloadCertificate(getOrCreateGuestCertificate())}>{certificateDownloading ? "Đang tạo PDF…" : "⇩ Tải bản ghi nhận PDF"}</button>}
            </article>
          )}
''',
)

replace_once(
    "app/page.tsx",
    '''        <h2 id="certificate-complete-title">Chúc mừng, chứng chỉ của bạn đã được cấp</h2>
        <p>Bạn đã hoàn thành {completionCertificate.completed}/{completionCertificate.scenarioTotal} tình huống với tỷ lệ đúng <strong>{completionCertificate.accuracy}%</strong> và xếp loại <strong>{completionCertificate.rating}</strong>.</p>
        <div className="certificate-complete-code"><small>Mã chứng chỉ</small><strong>{completionCertificate.certificateCode}</strong></div>
        <div className="certificate-complete-actions"><button className="primary-button" disabled={certificateDownloading} onClick={() => void downloadCertificate(completionCertificate)}>{certificateDownloading ? "Đang tạo PDF…" : "⇩ Tải chứng chỉ PDF"}</button><button className="admin-secondary" onClick={() => { setCompletionCertificate(null); setView("stats"); }}>Xem thành tích</button></div>
''',
    '''        <h2 id="certificate-complete-title">{completionCertificate.certificateCode.startsWith("CGS-GUEST-") ? "Chúc mừng, bạn đã hoàn thành khóa đào tạo" : "Chúc mừng, chứng chỉ của bạn đã được cấp"}</h2>
        <p>Bạn đã hoàn thành {completionCertificate.completed}/{completionCertificate.scenarioTotal} tình huống với tỷ lệ đúng <strong>{completionCertificate.accuracy}%</strong> và xếp loại <strong>{completionCertificate.rating}</strong>. {completionCertificate.certificateCode.startsWith("CGS-GUEST-") && <span>Bản PDF chế độ khách chỉ là bản ghi nhận trên thiết bị, không phải chứng chỉ nội bộ đã xác minh.</span>}</p>
        <div className="certificate-complete-code"><small>{completionCertificate.certificateCode.startsWith("CGS-GUEST-") ? "Mã bản ghi nhận" : "Mã chứng chỉ"}</small><strong>{completionCertificate.certificateCode}</strong></div>
        <div className="certificate-complete-actions"><button className="primary-button" disabled={certificateDownloading} onClick={() => void downloadCertificate(completionCertificate)}>{certificateDownloading ? "Đang tạo PDF…" : completionCertificate.certificateCode.startsWith("CGS-GUEST-") ? "⇩ Tải bản ghi nhận PDF" : "⇩ Tải chứng chỉ PDF"}</button><button className="admin-secondary" onClick={() => { setCompletionCertificate(null); setView("stats"); }}>Xem thành tích</button></div>
''',
)

replace_once(
    "app/page.tsx",
    '''    setBalance(300_000_000);
    setAwareness(100);
    setResults([]);
    setAnswer(null);
''',
    '''    setBalance(300_000_000);
    setAwareness(100);
    setResults([]);
    setCompletionCertificate(null);
    try { localStorage.removeItem(GUEST_CERTIFICATE_KEY); } catch { /* ignore storage restrictions */ }
    setAnswer(null);
''',
)

replace_once(
    "app/certificate.ts",
    '''  context.fillStyle = "#64748b";
  context.font = "15px Arial, Helvetica, sans-serif";
  context.fillText(template.footerNote, 877, 1150);
  return canvas;
''',
    '''  context.fillStyle = "#64748b";
  context.font = "15px Arial, Helvetica, sans-serif";
  context.fillText(certificate.certificateCode.startsWith("CGS-GUEST-")
    ? "Bản ghi nhận chế độ khách - không phải chứng chỉ nội bộ đã xác minh."
    : template.footerNote, 877, 1150);
  return canvas;
''',
)

Path("tests/guest-certificate-flow.test.mjs").write_text('''import assert from "node:assert/strict";\nimport { readFile } from "node:fs/promises";\nimport test from "node:test";\n\ntest("guest completion opens a downloadable PDF instead of looping to scenario one", async () => {\n  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");\n  assert.match(page, /GUEST_CERTIFICATE_KEY/);\n  assert.match(page, /getOrCreateGuestCertificate/);\n  assert.match(page, /Xem chứng chỉ PDF/);\n  assert.match(page, /setCompletionCertificate\(guestCertificate\)/);\n  assert.match(page, /Tải bản ghi nhận PDF/);\n});\n\ntest("guest PDFs are explicitly marked non-official", async () => {\n  const certificate = await readFile(new URL("../app/certificate.ts", import.meta.url), "utf8");\n  assert.match(certificate, /không phải chứng chỉ nội bộ đã xác minh/i);\n});\n''', encoding="utf-8")

print("Guest completion certificate flow patched.")
