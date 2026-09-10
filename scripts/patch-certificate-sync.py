from pathlib import Path

page_path = Path("app/page.tsx")
page = page_path.read_text(encoding="utf-8")

old = '''  async function ensureCurrentCertificate() {
    if (!sessionAccount || !runId) return;
    setDataStatus("Đang xác nhận điều kiện cấp chứng nhận…");
    const { data, error } = await supabase.rpc("issue_training_certificate", { expected_run: runId });
    if (error || !data) {
      setDataStatus(error?.code === "22023" ? "Bạn cần hoàn thành toàn bộ tình huống trước khi nhận chứng nhận." : "Chưa thể cấp chứng nhận. Vui lòng thử lại.");
      return;
    }
    await refreshCertificates(runId);
  }
'''

new = '''  async function ensureCurrentCertificate() {
    if (!sessionAccount) return;
    setDataStatus("Đang đồng bộ trạng thái và xác nhận chứng nhận…");

    const [{ data: stateData, error: stateError }, { data: certificateData, error: certificateError }] = await Promise.all([
      supabase.rpc("get_game_state"),
      supabase.rpc("get_my_training_certificates"),
    ]);
    if (stateError || !stateData) {
      setDataStatus("Chưa thể đồng bộ tiến trình. Vui lòng kiểm tra kết nối và thử lại.");
      return;
    }

    const state = stateData as GameState;
    applyGameState(state);
    const serverRunId = state.run_id;
    const serverCertificates = !certificateError && Array.isArray(certificateData)
      ? certificateData as TrainingCertificate[]
      : [];
    setCertificates(serverCertificates);

    const existing = serverCertificates.find((item) => item.runId === serverRunId);
    if (existing) {
      setCompletionCertificate(existing);
      setDataStatus("Đã tìm thấy chứng nhận của lượt chơi hiện tại.");
      return;
    }

    const completed = new Set(state.results.map((item) => item.scenarioId)).size;
    if (completed < scenarios.length) {
      setDataStatus(`Bạn đã hoàn thành ${completed}/${scenarios.length} tình huống. Hoàn thành toàn bộ trước khi nhận chứng nhận.`);
      return;
    }

    const { data: issuedData, error: issueError } = await supabase.rpc("issue_training_certificate", { expected_run: serverRunId });
    if (issueError || !issuedData) {
      const { data: retryData, error: retryError } = await supabase.rpc("get_my_training_certificates");
      if (!retryError && Array.isArray(retryData)) {
        const retryCertificates = retryData as TrainingCertificate[];
        setCertificates(retryCertificates);
        const issued = retryCertificates.find((item) => item.runId === serverRunId);
        if (issued) {
          setCompletionCertificate(issued);
          setDataStatus("Đã đồng bộ và tìm thấy chứng nhận của lượt chơi hiện tại.");
          return;
        }
      }
      setDataStatus(issueError?.code === "22023"
        ? "Lượt chơi vừa thay đổi trên máy chủ. Trạng thái đã được đồng bộ; vui lòng thử lại."
        : "Chưa thể tải chứng nhận. Vui lòng thử lại.");
      return;
    }

    const issued = issuedData as TrainingCertificate;
    setCertificates((current) => [issued, ...current.filter((item) => item.certificateId !== issued.certificateId)]);
    setCompletionCertificate(issued);
    setDataStatus("Đã hoàn thành khóa đào tạo và được cấp chứng nhận.");
  }
'''

if old not in page:
    raise SystemExit("Expected ensureCurrentCertificate block not found")
page = page.replace(old, new, 1)

old_sync = '      if (state.results.length >= scenarios.length) await refreshCertificates(pending.runId);\n'
new_sync = '      if (state.results.length >= scenarios.length) await ensureCurrentCertificate();\n'
if old_sync not in page:
    raise SystemExit("Expected completion refresh call not found")
page = page.replace(old_sync, new_sync, 1)

page_path.write_text(page, encoding="utf-8")

Path("tests/certificate-sync-recovery.test.mjs").write_text('''import assert from "node:assert/strict";\nimport test from "node:test";\nimport fs from "node:fs";\n\nconst page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");\n\ntest("certificate flow re-syncs server state before deciding completion", () => {\n  const start = page.indexOf("async function ensureCurrentCertificate()");\n  const end = page.indexOf("function getOrCreateGuestCertificate", start);\n  assert.ok(start >= 0 && end > start, "ensureCurrentCertificate must exist");\n  const block = page.slice(start, end);\n  assert.match(block, /rpc\\(\"get_game_state\"\\)/);\n  assert.match(block, /rpc\\(\"get_my_training_certificates\"\\)/);\n  assert.match(block, /serverRunId = state\\.run_id/);\n  assert.match(block, /expected_run: serverRunId/);\n  assert.match(block, /setCompletionCertificate\\(existing\\)/);\n  assert.doesNotMatch(block, /Bạn cần hoàn thành toàn bộ tình huống trước khi nhận chứng nhận/);\n});\n\ntest("final verified answer invokes robust certificate recovery", () => {\n  const start = page.indexOf("async function syncChoice");\n  const end = page.indexOf("async function resetProgress", start);\n  assert.ok(start >= 0 && end > start, "syncChoice must exist");\n  const block = page.slice(start, end);\n  assert.match(block, /state\\.results\\.length >= scenarios\\.length\\) await ensureCurrentCertificate\\(\\)/);\n});\n''', encoding="utf-8")
