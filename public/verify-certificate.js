/*
 * Cảnh Giác Số — trang xác minh chứng nhận (/xac-minh-chung-chi/).
 *
 * Gọi RPC công khai public.verify_training_certificate (quyền anon) bằng khóa publishable của
 * Supabase — cùng khóa trình duyệt đã dùng trong ứng dụng, an toàn để công khai vì quyền được
 * kiểm soát ở cơ sở dữ liệu. Kết quả tối thiểu: hợp lệ hay không, tên đã che, ngày cấp, xếp loại.
 *
 * Tệp ngoài, không có script/style nội tuyến: tuân thủ CSP (script-src 'self'). Kết quả chỉ được
 * dựng bằng textContent (dữ liệu máy chủ không bao giờ được diễn giải thành HTML). Mã chứng nhận không được ghi vào analytics:
 * /web-analytics.js chỉ gửi đường dẫn và UTM, còn GA4 dùng page_location đã làm sạch.
 */
(function () {
  "use strict";

  var SUPABASE_URL = "https://goietwyapiywrtibpkwo.supabase.co";
  var SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ghj-H14bq2n1tSsH4u-adA_LoBtWKO4";
  var ENDPOINT = SUPABASE_URL + "/rest/v1/rpc/verify_training_certificate";
  var TIMEOUT_MS = 15000;
  var CODE_PATTERN = /^CGS-(?:GUEST-[0-9A-Z]{4,32}|[0-9]{4}-[0-9A-F]{10,32})$/;

  // Giống bước chuẩn hóa của máy chủ: bỏ mọi khoảng trắng (copy từ PDF hay bị chèn) và viết hoa.
  function normalizeCode(raw) {
    return String(raw == null ? "" : raw).replace(/\s+/g, "").toUpperCase();
  }

  function classifyCode(normalized) {
    if (!normalized) return "empty";
    if (normalized.length > 64 || !CODE_PATTERN.test(normalized)) return "format";
    if (normalized.indexOf("CGS-GUEST-") === 0) return "guest";
    return "candidate";
  }

  function formatDate(iso) {
    var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
    return match ? match[3] + "/" + match[2] + "/" + match[1] : "";
  }

  // Chuyển phản hồi của máy chủ thành mô hình hiển thị; bất kỳ trường lạ nào đều bị bỏ qua.
  function interpretResponse(status, body) {
    if (status === 429) return { state: "rate-limited" };
    if (status < 200 || status >= 300 || !body || typeof body !== "object") return { state: "error" };
    if (body.valid === true) {
      return {
        state: "valid",
        name: typeof body.name === "string" ? body.name : "",
        issuedOn: formatDate(body.issuedOn),
        rating: typeof body.rating === "string" ? body.rating : "",
        accuracy: Number.isFinite(body.accuracy) ? Math.round(body.accuracy) : null,
        completed: Number.isFinite(body.completed) ? body.completed : null,
        scenarioTotal: Number.isFinite(body.scenarioTotal) ? body.scenarioTotal : null
      };
    }
    return { state: body.kind === "guest" ? "guest" : "invalid" };
  }

  var exported = { normalizeCode: normalizeCode, classifyCode: classifyCode, formatDate: formatDate, interpretResponse: interpretResponse };
  if (typeof module !== "undefined" && module.exports) module.exports = exported;
  if (typeof document === "undefined") return;

  var form = document.getElementById("verify-form");
  var input = document.getElementById("verify-code");
  var result = document.getElementById("verify-result");
  if (!form || !input || !result) return;
  var button = form.querySelector("button[type=submit]");

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function row(list, label, value) {
    if (!value) return;
    var wrapper = el("div", "verify-row");
    wrapper.appendChild(el("dt", null, label));
    wrapper.appendChild(el("dd", null, value));
    list.appendChild(wrapper);
  }

  function show(kind, title, paragraphs, details) {
    result.hidden = false;
    result.className = "verify-result verify-" + kind;
    result.textContent = "";
    result.appendChild(el("h2", "verify-title", title));
    paragraphs.forEach(function (text) { result.appendChild(el("p", null, text)); });
    if (details) result.appendChild(details);
    result.focus();
  }

  function render(model) {
    switch (model.state) {
      case "valid": {
        var list = el("dl", "verify-details");
        row(list, "Họ tên (đã che)", model.name);
        row(list, "Ngày cấp", model.issuedOn);
        row(list, "Xếp loại", model.rating);
        if (model.accuracy !== null) row(list, "Tỷ lệ trả lời đúng", model.accuracy + "%");
        if (model.completed !== null && model.scenarioTotal !== null) {
          row(list, "Số tình huống hoàn thành", model.completed + "/" + model.scenarioTotal);
        }
        show("ok", "Chứng nhận hợp lệ", [
          "Mã này tương ứng với một chứng nhận do Cảnh Giác Số cấp. Để bảo vệ người được cấp, trang này chỉ hiển thị thông tin tối thiểu và che tên; hãy đối chiếu với người trình chứng nhận."
        ], list);
        break;
      }
      case "guest":
        show("warn", "Bản ghi nhận chế độ khách", [
          "Mã bắt đầu bằng CGS-GUEST là bản ghi nhận được tạo và lưu ngay trên thiết bị của người chơi khi không đăng nhập. Loại mã này không được máy chủ cấp nên không thể xác minh."
        ]);
        break;
      case "invalid":
        show("bad", "Không tìm thấy chứng nhận", [
          "Không có chứng nhận nào khớp với mã này. Hãy kiểm tra lại từng ký tự (số 0 và chữ O, số 1 và chữ I dễ nhầm). Chứng nhận của tài khoản đã bị xóa cũng không còn xác minh được."
        ]);
        break;
      case "format":
        show("warn", "Mã chưa đúng định dạng", [
          "Mã hợp lệ có dạng CGS-năm-ký tự (ví dụ CGS-2026-0123456789ABCDEF), gồm chữ số 0–9 và chữ A–F."
        ]);
        break;
      case "empty":
        show("warn", "Chưa nhập mã", ["Hãy nhập mã in trên chứng nhận rồi bấm Xác minh."]);
        break;
      case "rate-limited":
        show("warn", "Tra cứu quá nhiều lần", ["Bạn đã tra cứu quá nhiều lần trong thời gian ngắn. Vui lòng chờ vài phút rồi thử lại."]);
        break;
      default:
        show("warn", "Chưa kiểm tra được", ["Không kết nối được dịch vụ xác minh. Vui lòng kiểm tra mạng và thử lại sau ít phút."]);
    }
  }

  var pending = false;

  function setBusy(busy) {
    pending = busy;
    if (button) {
      button.disabled = busy;
      button.textContent = busy ? "Đang kiểm tra…" : "Xác minh";
    }
    form.setAttribute("aria-busy", busy ? "true" : "false");
  }

  async function verify(raw) {
    if (pending) return;
    var normalized = normalizeCode(raw);
    var kind = classifyCode(normalized);
    if (kind === "empty" || kind === "format") {
      render({ state: kind });
      return;
    }
    if (kind === "guest") {
      render({ state: "guest" });
      return;
    }

    setBusy(true);
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timer = controller ? window.setTimeout(function () { controller.abort(); }, TIMEOUT_MS) : 0;
    try {
      var response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: "Bearer " + SUPABASE_PUBLISHABLE_KEY
        },
        body: JSON.stringify({ code: normalized }),
        credentials: "omit",
        cache: "no-store",
        referrerPolicy: "no-referrer",
        signal: controller ? controller.signal : undefined
      });
      var body = null;
      try { body = await response.json(); } catch { body = null; }
      render(interpretResponse(response.status, body));
    } catch {
      render({ state: "error" });
    } finally {
      if (timer) window.clearTimeout(timer);
      setBusy(false);
    }
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    void verify(input.value);
  });

  // Liên kết/QR in trên chứng nhận có dạng /xac-minh-chung-chi/?code=CGS-…: tự điền và tra cứu.
  try {
    var initial = new URLSearchParams(window.location.search).get("code");
    if (initial) {
      input.value = normalizeCode(initial).slice(0, 64);
      void verify(initial);
    }
  } catch {
    // Không đọc được query: người dùng vẫn nhập tay được.
  }
})();
