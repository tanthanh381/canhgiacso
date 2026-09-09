from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file_path = Path(path)
    text = file_path.read_text(encoding="utf-8")
    if old not in text:
        raise SystemExit(f"Expected patch anchor not found in {path}: {old[:100]!r}")
    file_path.write_text(text.replace(old, new, 1), encoding="utf-8")


replace_once(
    "app/page.tsx",
    'import { difficultyOrder, getLevelProgress, getUnlockedDifficulties } from "./progression";\n',
    'import { difficultyOrder, getLevelProgress, getUnlockedDifficulties } from "./progression";\nimport { downloadTrainingCertificatePdf, TrainingCertificate } from "./certificate";\n',
)

replace_once(
    "app/page.tsx",
    '''  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);
  const [pendingChoice, setPendingChoice] = useState<PendingChoice | null>(null);
  const [savingChoice, setSavingChoice] = useState(false);
''',
    '''  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);
  const [certificates, setCertificates] = useState<TrainingCertificate[]>([]);
  const [completionCertificate, setCompletionCertificate] = useState<TrainingCertificate | null>(null);
  const [certificateDownloading, setCertificateDownloading] = useState(false);
  const [pendingChoice, setPendingChoice] = useState<PendingChoice | null>(null);
  const [savingChoice, setSavingChoice] = useState(false);
''',
)

replace_once(
    "app/page.tsx",
    '''    setRunId(null);
    setGameHistory([]);
    setPendingChoice(null);
''',
    '''    setRunId(null);
    setGameHistory([]);
    setCertificates([]);
    setCompletionCertificate(null);
    setPendingChoice(null);
''',
)

replace_once(
    "app/page.tsx",
    '''    const [profileResult, progressResult] = await Promise.all([
      supabase.from("profiles").select("username, display_name, created_at").eq("id", userId).single(),
      supabase.rpc("get_game_state"),
    ]);
''',
    '''    const [profileResult, progressResult, certificateResult] = await Promise.all([
      supabase.from("profiles").select("username, display_name, created_at").eq("id", userId).single(),
      supabase.rpc("get_game_state"),
      supabase.rpc("get_my_training_certificates"),
    ]);
''',
)

replace_once(
    "app/page.tsx",
    '''    applyProgress(progress, profile.display_name);
    applyGameState(state);
    setHydrated(true);
''',
    '''    applyProgress(progress, profile.display_name);
    applyGameState(state);
    setCertificates(!certificateResult.error && Array.isArray(certificateResult.data) ? certificateResult.data as TrainingCertificate[] : []);
    setCompletionCertificate(null);
    setHydrated(true);
''',
)

replace_once(
    "app/page.tsx",
    '''      localStorage.removeItem(`khien-so-pending:${pending.userId}`);
      setPendingChoice(null);
      setDataStatus("Đã xác nhận và lưu kết quả.");
''',
    '''      localStorage.removeItem(`khien-so-pending:${pending.userId}`);
      setPendingChoice(null);
      if (state.results.length >= scenarios.length) await refreshCertificates(pending.runId);
      else setDataStatus("Đã xác nhận và lưu kết quả.");
''',
)

replace_once(
    "app/page.tsx",
    '''  async function logout() {
    await supabase.auth.signOut({ scope: "local" });
    setSessionAccount(null);
    loadGuestProgress();
    setProfileOpen(false);
  }

  function nextScenario() {
''',
    '''  async function logout() {
    await supabase.auth.signOut({ scope: "local" });
    setSessionAccount(null);
    setCertificates([]);
    setCompletionCertificate(null);
    loadGuestProgress();
    setProfileOpen(false);
  }

  async function refreshCertificates(celebrateRunId?: string) {
    if (!sessionAccount) return;
    const { data, error } = await supabase.rpc("get_my_training_certificates");
    if (error || !Array.isArray(data)) {
      setDataStatus("Đã hoàn thành khóa đào tạo nhưng chưa tải được thông tin chứng chỉ. Vui lòng thử lại.");
      return;
    }
    const nextCertificates = data as TrainingCertificate[];
    setCertificates(nextCertificates);
    if (celebrateRunId) {
      const issued = nextCertificates.find((item) => item.runId === celebrateRunId);
      if (issued) {
        setCompletionCertificate(issued);
        setDataStatus("Đã hoàn thành khóa đào tạo và được cấp chứng chỉ.");
        return;
      }
    }
    setDataStatus("Đã cập nhật thông tin chứng chỉ.");
  }

  async function ensureCurrentCertificate() {
    if (!sessionAccount || !runId) return;
    setDataStatus("Đang xác nhận điều kiện cấp chứng chỉ…");
    const { data, error } = await supabase.rpc("issue_training_certificate", { expected_run: runId });
    if (error || !data) {
      setDataStatus(error?.code === "22023" ? "Bạn cần hoàn thành toàn bộ tình huống trước khi nhận chứng chỉ." : "Chưa thể cấp chứng chỉ. Vui lòng thử lại.");
      return;
    }
    await refreshCertificates(runId);
  }

  async function downloadCertificate(certificate: TrainingCertificate) {
    if (certificateDownloading) return;
    setCertificateDownloading(true);
    try {
      await downloadTrainingCertificatePdf(certificate);
      setDataStatus("Đã tạo chứng chỉ PDF trên thiết bị của bạn.");
    } catch {
      setDataStatus("Không thể tạo file PDF trên trình duyệt này. Vui lòng thử lại.");
    } finally {
      setCertificateDownloading(false);
    }
  }

  function nextScenario() {
''',
)

replace_once(
    "app/page.tsx",
    '''  const previousResult = results.find((result) => result.scenarioId === selected.id);
  const selectedAnswer = answer ?? previousResult?.choiceIndex ?? null;
''',
    '''  const currentCertificate = runId ? certificates.find((item) => item.runId === runId) ?? null : null;
  const latestCertificate = currentCertificate ?? certificates[0] ?? null;
  const previousResult = results.find((result) => result.scenarioId === selected.id);
  const selectedAnswer = answer ?? previousResult?.choiceIndex ?? null;
''',
)

replace_once(
    "app/page.tsx",
    '''          <div className="stats-overview"><article><small>Kịch bản đã thử</small><strong>{results.length}</strong><span>/ {scenarios.length}</span></article><article><small>Xử lý an toàn</small><strong>{safeIds.size}</strong><span>{results.length ? Math.round((safeIds.size / results.length) * 100) : 0}% chính xác</span></article><article><small>Điểm phòng vệ</small><strong>{score}</strong><span>cấp {Math.floor(score / 500) + 1}</span></article><article><small>Tài sản còn lại</small><strong className="money-stat">{money.format(balance)}đ</strong><span>bảo toàn {Math.round((balance / 300_000_000) * 100)}%</span></article></div>
          <div className="achievement-section">
''',
    '''          <div className="stats-overview"><article><small>Kịch bản đã thử</small><strong>{results.length}</strong><span>/ {scenarios.length}</span></article><article><small>Xử lý an toàn</small><strong>{safeIds.size}</strong><span>{results.length ? Math.round((safeIds.size / results.length) * 100) : 0}% chính xác</span></article><article><small>Điểm phòng vệ</small><strong>{score}</strong><span>cấp {Math.floor(score / 500) + 1}</span></article><article><small>Tài sản còn lại</small><strong className="money-stat">{money.format(balance)}đ</strong><span>bảo toàn {Math.round((balance / 300_000_000) * 100)}%</span></article></div>
          {sessionAccount ? (
            latestCertificate ? (
              <article className="training-certificate-card issued">
                <span className="certificate-card-mark" aria-hidden="true">HD</span>
                <div className="certificate-card-copy">
                  <span className="eyebrow">{currentCertificate ? "CHỨNG CHỈ LƯỢT HIỆN TẠI" : "CHỨNG CHỈ GẦN NHẤT"}</span>
                  <h2>Chứng nhận hoàn thành Cảnh Giác Số</h2>
                  <p>{latestCertificate.displayName} · Xếp loại <strong>{latestCertificate.rating}</strong> · Tỷ lệ đúng {latestCertificate.accuracy}%</p>
                  <small>Mã chứng chỉ {latestCertificate.certificateCode} · Cấp ngày {new Date(latestCertificate.issuedAt).toLocaleDateString("vi-VN")}</small>
                </div>
                <button className="primary-button certificate-download" disabled={certificateDownloading} onClick={() => void downloadCertificate(latestCertificate)}>{certificateDownloading ? "Đang tạo PDF…" : "⇩ Tải chứng chỉ PDF"}</button>
              </article>
            ) : (
              <article className={`training-certificate-card ${results.length >= scenarios.length ? "ready" : "locked"}`}>
                <span className="certificate-card-mark" aria-hidden="true">{results.length >= scenarios.length ? "✓" : "◇"}</span>
                <div className="certificate-card-copy"><span className="eyebrow">CHỨNG CHỈ HOÀN THÀNH</span><h2>{results.length >= scenarios.length ? "Khóa đào tạo đã hoàn thành" : "Hoàn thành khóa để mở chứng chỉ"}</h2><p>{results.length >= scenarios.length ? "Kết quả đã đủ điều kiện. Xác nhận với máy chủ để cấp chứng chỉ PDF." : `Tiến độ hiện tại ${results.length}/${scenarios.length} tình huống.`}</p></div>
                {results.length >= scenarios.length && <button className="primary-button certificate-download" onClick={() => void ensureCurrentCertificate()}>Cấp chứng chỉ</button>}
              </article>
            )
          ) : (
            <article className={`training-certificate-card ${results.length >= scenarios.length ? "ready" : "locked"}`}>
              <span className="certificate-card-mark" aria-hidden="true">{results.length >= scenarios.length ? "✓" : "◇"}</span>
              <div className="certificate-card-copy"><span className="eyebrow">CHỨNG CHỈ HOÀN THÀNH</span><h2>{results.length >= scenarios.length ? "Đăng nhập để nhận chứng chỉ chính thức" : "Chứng chỉ sẽ mở khi hoàn thành khóa"}</h2><p>{results.length >= scenarios.length ? "Chế độ khách không cấp chứng chỉ định danh. Đăng nhập và hoàn thành lượt đào tạo đồng bộ để nhận PDF." : `Tiến độ hiện tại ${results.length}/${scenarios.length} tình huống.`}</p></div>
              {results.length >= scenarios.length && <button className="primary-button certificate-download" onClick={() => openAuth("login")}>Đăng nhập</button>}
            </article>
          )}
          <div className="achievement-section">
''',
)

replace_once(
    "app/page.tsx",
    '''      {lossNotice && <Modal open onClose={() => setLossNotice(null)} labelledBy="loss-notice-title" className="loss-modal">
''',
    '''      {completionCertificate && <Modal open onClose={() => setCompletionCertificate(null)} labelledBy="certificate-complete-title" className="certificate-complete-modal">
        <button className="modal-close" aria-label="Đóng thông báo chứng chỉ" onClick={() => setCompletionCertificate(null)}>×</button>
        <span className="certificate-complete-symbol" aria-hidden="true">✓</span>
        <span className="eyebrow">HOÀN THÀNH KHÓA ĐÀO TẠO</span>
        <h2 id="certificate-complete-title">Chúc mừng, chứng chỉ của bạn đã được cấp</h2>
        <p>Bạn đã hoàn thành {completionCertificate.completed}/{completionCertificate.scenarioTotal} tình huống với tỷ lệ đúng <strong>{completionCertificate.accuracy}%</strong> và xếp loại <strong>{completionCertificate.rating}</strong>.</p>
        <div className="certificate-complete-code"><small>Mã chứng chỉ</small><strong>{completionCertificate.certificateCode}</strong></div>
        <div className="certificate-complete-actions"><button className="primary-button" disabled={certificateDownloading} onClick={() => void downloadCertificate(completionCertificate)}>{certificateDownloading ? "Đang tạo PDF…" : "⇩ Tải chứng chỉ PDF"}</button><button className="admin-secondary" onClick={() => { setCompletionCertificate(null); setView("stats"); }}>Xem thành tích</button></div>
      </Modal>}

      {lossNotice && <Modal open onClose={() => setLossNotice(null)} labelledBy="loss-notice-title" className="loss-modal">
''',
)

css_path = Path("app/globals.css")
css = css_path.read_text(encoding="utf-8")
if ".training-certificate-card" not in css:
    css += '''\n\n/* Training certificate */
.training-certificate-card { margin: 22px 0; display: grid; grid-template-columns: 64px minmax(0,1fr) auto; gap: 18px; align-items: center; padding: 22px; border-radius: 18px; border: 1px solid var(--line); background: linear-gradient(135deg, color-mix(in srgb, var(--surface) 94%, #fff4d6), color-mix(in srgb, var(--surface) 94%, #e9f2ff)); box-shadow: 0 14px 34px rgba(15,23,42,.08); }
.training-certificate-card.issued { border-color: color-mix(in srgb, #c50000 38%, var(--line)); }
.training-certificate-card.ready { border-color: color-mix(in srgb, var(--mint) 55%, var(--line)); }
.training-certificate-card.locked { opacity: .82; }
.certificate-card-mark { width: 58px; height: 58px; border-radius: 14px; display: grid; place-items: center; background: #d90000; color: #fff; font: 800 21px Georgia, serif; box-shadow: 0 8px 20px rgba(185,0,0,.22); }
.training-certificate-card.locked .certificate-card-mark { background: var(--line); color: var(--muted); box-shadow: none; }
.training-certificate-card.ready .certificate-card-mark { background: var(--mint); color: #17372d; }
.certificate-card-copy { min-width: 0; }
.certificate-card-copy h2 { margin: 4px 0 6px; font-size: clamp(19px, 2vw, 27px); }
.certificate-card-copy p { margin: 0 0 5px; color: var(--text); }
.certificate-card-copy small { color: var(--muted); }
.certificate-download { white-space: nowrap; }
.certificate-complete-modal { max-width: 610px; text-align: center; }
.certificate-complete-symbol { width: 72px; height: 72px; margin: 0 auto 14px; border-radius: 22px; display: grid; place-items: center; background: var(--mint); color: #17372d; font-size: 38px; font-weight: 900; }
.certificate-complete-code { margin: 20px auto; max-width: 360px; padding: 14px 18px; border: 1px dashed color-mix(in srgb, #d97706 65%, var(--line)); border-radius: 13px; background: color-mix(in srgb, #f5e3bf 55%, var(--surface)); }
.certificate-complete-code small { display: block; color: var(--muted); margin-bottom: 4px; }
.certificate-complete-code strong { font-size: 18px; letter-spacing: .06em; }
.certificate-complete-actions { display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; }
@media (max-width: 760px) { .training-certificate-card { grid-template-columns: 52px minmax(0,1fr); } .certificate-card-mark { width: 50px; height: 50px; } .certificate-download { grid-column: 1 / -1; width: 100%; } }
'''
    css_path.write_text(css, encoding="utf-8")

print("Certificate UI patch applied.")
