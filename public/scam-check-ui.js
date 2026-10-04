(() => {
  "use strict";

  const SUPABASE_URL = "https://goietwyapiywrtibpkwo.supabase.co";
  const SUPABASE_KEY = "sb_publishable_ghj-H14bq2n1tSsH4u-adA_LoBtWKO4";
  const SESSION_KEY = "sb-goietwyapiywrtibpkwo-auth-token";

  const root = document.querySelector("[data-scam-check]");
  if (!root || !window.ScamCheck) return;

  const form = root.querySelector("form");
  const input = form.elements.namedItem("q");
  const typeSelect = form.elements.namedItem("type");
  const resultBox = root.querySelector("[data-check-result]");
  const feed = window.ScamCheck.createFeed("/threat-data");
  const KIND_LABELS = { url: "Liên kết", phone: "Số điện thoại", email: "Email", ip: "Địa chỉ IP" };
  let running = 0;

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const list = (items) => {
    const ul = el("ul", "scam-check-list");
    for (const item of items) ul.append(el("li", "", item));
    return ul;
  };

  function readSession() {
    try {
      const raw = window.localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data.access_token || (data.expires_at && data.expires_at * 1000 < Date.now() + 15000)) return null;
      if (data.user && data.user.is_anonymous) return null;
      return data;
    } catch {
      return null;
    }
  }

  function renderResult(result) {
    resultBox.replaceChildren();
    resultBox.hidden = false;
    resultBox.dataset.level = result.invalid ? "none" : result.level;

    const head = el("div", "scam-check-head");
    head.append(el("span", "scam-check-kind", KIND_LABELS[result.kind] || ""), el("span", "scam-check-level", result.label));
    const target = el("p", "scam-check-target", result.normalized || result.input);
    resultBox.append(head, target);

    if (result.findings.length) {
      resultBox.append(el("h3", "", result.invalid ? "Lưu ý" : "Tín hiệu phát hiện"), list(result.findings));
    } else if (!result.invalid) {
      resultBox.append(el("p", "", "Không phát hiện tín hiệu nào theo các quy tắc hiện có."));
    }
    if (result.notes.length) resultBox.append(list(result.notes));

    if (!result.invalid) {
      const feedLine = el("p", "scam-check-feed");
      if (!result.feed.available) feedLine.textContent = "Chưa tải được dữ liệu cảnh báo, kết quả chỉ dựa trên các quy tắc nhận diện.";
      else if (result.feed.matched) feedLine.textContent = "Đối chiếu dữ liệu cảnh báo: có trong dữ liệu.";
      else {
        const when = result.feed.updated ? ` (cập nhật ${new Date(result.feed.updated).toLocaleDateString("vi-VN")})` : "";
        feedLine.textContent = `Đối chiếu dữ liệu cảnh báo: chưa có trong dữ liệu${when}. Điều này không có nghĩa là an toàn.`;
      }
      resultBox.append(feedLine);
      resultBox.append(el("h3", "", "Nên làm gì"), list(result.actions));

      const ai = el("div", "scam-check-ai");
      const button = el("button", "scam-check-ai-button", "Phân tích bằng AI");
      button.type = "button";
      button.addEventListener("click", () => runAi(result, ai, button));
      ai.append(button, el("small", "", "Chế độ AI gửi nội dung bạn nhập đến máy chủ Cảnh Giác Số và nhà cung cấp dịch vụ AI bên thứ ba để phân tích. Cảnh Giác Số không lưu nội dung này. Không nhập thông tin cá nhân nhạy cảm. Cần đăng nhập."));
      resultBox.append(ai);
    }
    resultBox.focus({ preventScroll: false });
  }

  async function runAi(result, container, button) {
    const old = container.querySelector(".scam-check-ai-output");
    if (old) old.remove();
    const output = el("div", "scam-check-ai-output");
    container.append(output);
    const session = readSession();
    if (!session) {
      output.append(el("p", "", "Bạn cần đăng nhập để dùng chế độ AI. "));
      const link = el("a", "", "Mở trang chủ để đăng nhập");
      link.href = "/";
      output.lastChild.append(link, document.createTextNode(", sau đó quay lại trang này."));
      return;
    }
    button.disabled = true;
    output.textContent = "Đang phân tích…";
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/scam-analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_KEY },
        body: JSON.stringify({ kind: result.kind, value: result.input.slice(0, 500), level: result.level, findings: result.findings.slice(0, 8), notes: result.notes.slice(0, 4) }),
      });
      output.replaceChildren();
      if (response.status === 401) { output.append(el("p", "", "Phiên đăng nhập đã hết hạn. Hãy mở trang chủ để đăng nhập lại.")); return; }
      if (response.status === 429) { output.append(el("p", "", "Bạn đã dùng hết lượt phân tích AI hôm nay. Kết quả theo quy tắc ở trên vẫn có hiệu lực.")); return; }
      if (!response.ok) { output.append(el("p", "", "Chế độ AI hiện chưa khả dụng. Kết quả theo quy tắc ở trên vẫn có hiệu lực.")); return; }
      const data = await response.json();
      output.append(el("h3", "", "Phân tích của AI (tham khảo)"), el("p", "", String(data.summary || "")));
      if (Array.isArray(data.risks) && data.risks.length) output.append(el("h4", "", "Rủi ro"), list(data.risks.map(String)));
      if (Array.isArray(data.actions) && data.actions.length) output.append(el("h4", "", "Gợi ý"), list(data.actions.map(String)));
      output.append(el("small", "", "AI có thể sai. Không dùng kết quả này để kết luận ai đó lừa đảo."));
    } catch {
      output.replaceChildren(el("p", "", "Không kết nối được máy chủ AI. Kết quả theo quy tắc ở trên vẫn có hiệu lực."));
    } finally {
      button.disabled = false;
    }
  }

  async function run() {
    const value = input.value.trim();
    if (!value) { input.focus(); return; }
    const ticket = ++running;
    resultBox.hidden = false;
    resultBox.dataset.level = "none";
    resultBox.replaceChildren(el("p", "", "Đang kiểm tra…"));
    const result = await window.ScamCheck.analyze(value, { type: typeSelect.value, feed });
    if (ticket !== running) return;
    renderResult(result);
  }

  form.addEventListener("submit", (event) => { event.preventDefault(); void run(); });

  const params = new URLSearchParams(window.location.search);
  const initial = params.get("q");
  const initialType = params.get("type");
  if (initialType && ["url", "phone", "email", "ip"].includes(initialType)) typeSelect.value = initialType;
  if (initial) { input.value = initial.slice(0, 500); void run(); }
})();
