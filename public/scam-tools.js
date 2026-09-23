(() => {
  "use strict";

  const byId = (id) => document.getElementById(id);
  const text = (el, value) => { if (el) el.textContent = value; };
  const show = (el) => { if (el) el.hidden = false; };
  const clear = (el) => { if (el) el.replaceChildren(); };
  const addList = (el, items) => {
    if (!el) return;
    clear(el);
    for (const item of items) {
      const li = document.createElement("li");
      li.textContent = item;
      el.append(li);
    }
  };
  const setLevel = (root, level, label) => {
    if (!root) return;
    root.dataset.level = level;
    const badge = root.querySelector("[data-result-level]");
    text(badge, label);
  };

  function setupCallTriage(root) {
    const form = root.querySelector("form");
    const result = root.querySelector("[data-tool-result]");
    if (!form || !result) return;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const claim = form.elements.namedItem("claim")?.value || "";
      const request = form.elements.namedItem("request")?.value || "";
      const secrecy = form.elements.namedItem("secrecy")?.checked;
      const urgency = form.elements.namedItem("urgency")?.checked;
      let score = 0;
      if (["otp", "password", "install", "transfer", "screen"].includes(request)) score += 3;
      if (["police", "bank", "school", "hospital", "electricity", "insurance"].includes(claim)) score += 1;
      if (secrecy) score += 2;
      if (urgency) score += 1;
      const level = score >= 5 ? "high" : score >= 3 ? "medium" : "low";
      const labels = { high: "Rủi ro cao", medium: "Cần xác minh", low: "Chưa đủ dữ kiện" };
      setLevel(result, level, labels[level]);
      const summary = level === "high"
        ? "Có nhiều tín hiệu thường gặp trong kịch bản mạo danh. Không tiếp tục làm theo hướng dẫn của người gọi."
        : level === "medium"
          ? "Tình huống có tín hiệu cần xác minh độc lập trước khi cung cấp thông tin hoặc giao dịch."
          : "Chưa đủ dữ kiện để kết luận. Hãy xác minh qua kênh chính thức trước khi hành động.";
      text(result.querySelector("[data-result-summary]"), summary);
      const steps = [
        "Ngắt cuộc gọi hoặc kết thúc cuộc chat nếu bạn đang bị thúc ép.",
        "Tự tìm website, ứng dụng hoặc số liên hệ chính thức; không dùng số/link do người gọi cung cấp.",
        "Không đọc OTP, mật khẩu, PIN, CVV hoặc mã khôi phục cho bất kỳ ai.",
        "Không cài APK, phần mềm điều khiển từ xa hoặc bật quyền Trợ năng theo hướng dẫn qua điện thoại.",
      ];
      if (request === "transfer") steps.unshift("Không chuyển tiền để 'xác minh', 'bảo chứng', 'mở khóa' hoặc 'xử lý hồ sơ'.");
      if (claim === "school" || claim === "hospital") steps.unshift("Gọi trực tiếp nhà trường/bệnh viện/người thân qua số bạn đã biết từ trước.");
      addList(result.querySelector("[data-result-list]"), steps);
      show(result);
    });
  }

  function setupIncidentResponse(root) {
    const form = root.querySelector("form");
    const result = root.querySelector("[data-tool-result]");
    if (!form || !result) return;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const selected = [...form.querySelectorAll('input[name="incident"]:checked')].map((el) => el.value);
      const steps = [];
      let level = "medium";
      if (!selected.length) {
        steps.push("Nếu bạn chưa cung cấp thông tin hay chuyển tiền, dừng tương tác và xác minh qua kênh chính thức.");
        steps.push("Chụp lại nội dung đáng ngờ nếu cần đối chiếu hoặc báo cáo.");
        level = "low";
      }
      if (selected.includes("money")) {
        steps.push("Gọi ngay ngân hàng qua kênh chính thức để báo giao dịch, yêu cầu khóa rủi ro và hướng dẫn tra soát.");
        steps.push("Lưu biên lai, số tài khoản nhận, nội dung chuyển tiền, thời gian giao dịch và toàn bộ hội thoại.");
        level = "high";
      }
      if (selected.includes("password")) {
        steps.push("Đổi mật khẩu từ thiết bị tin cậy; ưu tiên email, ngân hàng và tài khoản có khả năng dùng chung mật khẩu.");
        steps.push("Đăng xuất các phiên lạ và bật xác thực đa yếu tố nếu dịch vụ hỗ trợ.");
        level = "high";
      }
      if (selected.includes("otp")) {
        steps.push("Liên hệ ngay dịch vụ/ngân hàng liên quan vì OTP có thể đã xác nhận đăng nhập, liên kết thiết bị hoặc giao dịch.");
        level = "high";
      }
      if (selected.includes("app")) {
        steps.push("Ngắt Internet nếu nghi thiết bị đang bị điều khiển; không tiếp tục mở ứng dụng ngân hàng trên thiết bị đó.");
        steps.push("Gỡ ứng dụng lạ sau khi đã ghi lại tên ứng dụng/quyền được cấp; cân nhắc kiểm tra thiết bị từ nguồn hỗ trợ tin cậy.");
        level = "high";
      }
      if (selected.includes("screen")) {
        steps.push("Dừng chia sẻ màn hình/điều khiển từ xa và thu hồi quyền Trợ năng, Device Admin hoặc quyền ghi màn hình nếu đã cấp.");
        level = "high";
      }
      if (selected.includes("account")) {
        steps.push("Thực hiện quy trình khôi phục tài khoản chính thức và kiểm tra email/số điện thoại khôi phục có bị thay đổi hay không.");
        level = "high";
      }
      setLevel(result, level, level === "high" ? "Cần xử lý ngay" : level === "medium" ? "Cần kiểm tra" : "Phòng ngừa");
      text(result.querySelector("[data-result-summary]"), selected.length
        ? "Ưu tiên xử lý theo thứ tự dưới đây; không chuyển thêm tiền để 'gỡ' hoặc 'mở khóa'."
        : "Bạn chưa chọn dấu hiệu sự cố. Nếu chưa hành động theo đối tượng, hãy dừng và xác minh.");
      addList(result.querySelector("[data-result-list]"), [...new Set(steps)]);
      show(result);
    });
  }

  function setupReceiptCheck(root) {
    const form = root.querySelector("form");
    const result = root.querySelector("[data-tool-result]");
    if (!form || !result) return;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const credited = form.elements.namedItem("credited")?.value || "";
      const evidence = form.elements.namedItem("evidence")?.value || "";
      const pressure = form.elements.namedItem("pressure")?.checked;
      let level = "medium";
      const steps = [];
      if (credited === "yes") {
        level = "low";
        steps.push("Đối chiếu đúng số tiền, nội dung và tài khoản nhận trong lịch sử giao dịch của chính bạn.");
      } else {
        level = "high";
        steps.push("Không giao hàng, hoàn tiền hoặc chuyển khoản ngược chỉ dựa trên ảnh biên lai.");
        steps.push("Mở ứng dụng/ngân hàng điện tử của chính bạn để kiểm tra số dư và lịch sử giao dịch.");
      }
      if (evidence === "image") {
        level = "high";
        steps.push("Ảnh chụp hoặc PDF có thể bị chỉnh sửa; chỉ trạng thái giao dịch phía ngân hàng nhận mới là căn cứ thực tế.");
      }
      if (pressure) {
        level = "high";
        steps.push("Yêu cầu 'hoàn lại phần dư' hoặc xử lý gấp là tín hiệu cần dừng và kiểm tra kỹ.");
      }
      setLevel(result, level, level === "high" ? "Chưa nên giao hàng/chuyển tiền" : "Đã có tín hiệu xác nhận");
      text(result.querySelector("[data-result-summary]"), level === "high"
        ? "Biên lai không chứng minh tiền đã vào tài khoản. Hãy xác minh trên kênh ngân hàng của chính bạn."
        : "Tiền đã được ghi nhận phía tài khoản nhận; vẫn nên đối chiếu đúng giao dịch trước khi hoàn tất đơn hàng.");
      addList(result.querySelector("[data-result-list]"), steps);
      show(result);
    });
  }

  function setupSmsCheck(root) {
    const input = root.querySelector("textarea");
    const button = root.querySelector("[data-analyze]");
    const result = root.querySelector("[data-tool-result]");
    if (!input || !button || !result) return;
    button.addEventListener("click", () => {
      const value = input.value.trim();
      const rules = [
        { re: /https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|top|xyz|shop|click|live|vip|cc)\b/i, label: "Có đường link hoặc tên miền trong tin nhắn", weight: 2 },
        { re: /otp|mã xác thực|mật khẩu|password|pin|cvv|mã khôi phục/i, label: "Yêu cầu/thảo luận dữ liệu xác thực nhạy cảm", weight: 3 },
        { re: /khẩn|ngay lập tức|trong hôm nay|khóa tài khoản|khóa sim|cắt điện|phạt|điều tra/i, label: "Tạo áp lực hoặc đe dọa hậu quả", weight: 2 },
        { re: /chuyển khoản|nộp tiền|đóng phí|quét qr|hoàn tiền|nhận tiền/i, label: "Yêu cầu liên quan thanh toán/chuyển tiền", weight: 2 },
        { re: /cài.*(app|ứng dụng|apk)|tải.*apk|quyền trợ năng|chia sẻ màn hình/i, label: "Yêu cầu cài ứng dụng hoặc cấp quyền nguy hiểm", weight: 4 },
        { re: /công an|tòa án|viện kiểm sát|ngân hàng|điện lực|bảo hiểm xã hội|vneid|nhà trường|bệnh viện/i, label: "Tự xưng cơ quan/tổ chức có độ tin cậy cao", weight: 1 },
      ];
      const matches = rules.filter((rule) => rule.re.test(value));
      const score = matches.reduce((sum, rule) => sum + rule.weight, 0);
      const level = score >= 6 ? "high" : score >= 3 ? "medium" : "low";
      setLevel(result, level, level === "high" ? "Nhiều tín hiệu rủi ro" : level === "medium" ? "Cần xác minh" : "Ít tín hiệu trong checklist");
      text(result.querySelector("[data-result-summary]"), !value
        ? "Hãy dán nội dung tin nhắn cần kiểm tra. Công cụ xử lý cục bộ trên trình duyệt."
        : level === "high"
          ? "Không bấm link hoặc làm theo hướng dẫn trong tin nhắn trước khi xác minh qua kênh chính thức."
          : "Kết quả này không chứng minh tin nhắn an toàn; tiếp tục xác minh người gửi và kênh liên hệ.");
      addList(result.querySelector("[data-result-list]"), matches.length ? matches.map((m) => m.label) : [
        "Không phát hiện từ khóa rủi ro phổ biến trong checklist.",
        "Kiểm tra tên người gửi, domain, số tiền và bối cảnh bằng nguồn độc lập trước khi hành động.",
      ]);
      show(result);
    });
  }

  function setupPermissionCheck(root) {
    const form = root.querySelector("form");
    const result = root.querySelector("[data-tool-result]");
    if (!form || !result) return;
    const map = {
      accessibility: ["Quyền Trợ năng có thể cho phép ứng dụng đọc/điều khiển giao diện; chỉ cấp cho ứng dụng bạn hiểu rõ và tin cậy.", 4],
      admin: ["Device Admin có thể tăng quyền kiểm soát thiết bị và gây khó khi gỡ ứng dụng.", 3],
      sms: ["Đọc SMS có thể làm lộ mã xác thực hoặc nội dung nhạy cảm.", 3],
      notifications: ["Đọc thông báo có thể làm lộ OTP và nội dung từ ứng dụng ngân hàng.", 2],
      screen: ["Chia sẻ/ghi màn hình có thể làm lộ thao tác và thông tin hiển thị.", 3],
      install: ["Cài ứng dụng từ nguồn ngoài cửa hàng chính thức làm tăng rủi ro phần mềm độc hại.", 3],
      contacts: ["Danh bạ có thể bị dùng để mở rộng lừa đảo sang người quen.", 1],
    };
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const selected = [...form.querySelectorAll('input[name="permission"]:checked')].map((el) => el.value);
      const findings = selected.map((key) => map[key]).filter(Boolean);
      const score = findings.reduce((sum, item) => sum + item[1], 0);
      const level = score >= 7 ? "high" : score >= 3 ? "medium" : "low";
      setLevel(result, level, level === "high" ? "Quyền rủi ro cao" : level === "medium" ? "Cần xem xét kỹ" : "Chưa thấy quyền nguy hiểm");
      text(result.querySelector("[data-result-summary]"), selected.length
        ? "Không phải mọi ứng dụng yêu cầu quyền đều độc hại, nhưng tổ hợp quyền dưới đây cần được giải thích rõ trước khi cấp."
        : "Bạn chưa chọn quyền nào. Hãy kiểm tra danh sách quyền ứng dụng đang yêu cầu.");
      addList(result.querySelector("[data-result-list]"), findings.length ? findings.map((item) => item[0]) : [
        "Không cấp quyền chỉ vì người gọi hướng dẫn qua điện thoại/chat.",
        "Nếu ứng dụng đến từ file APK/link lạ, dừng cài đặt và tìm ứng dụng chính thức trên kho ứng dụng.",
      ]);
      show(result);
    });
  }

  function setupTransferCheck(root) {
    const form = root.querySelector("form");
    const result = root.querySelector("[data-tool-result]");
    if (!form || !result) return;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const known = form.elements.namedItem("known")?.value;
      const verified = form.elements.namedItem("verified")?.value;
      const changed = form.elements.namedItem("changed")?.checked;
      const urgent = form.elements.namedItem("urgent")?.checked;
      const fee = form.elements.namedItem("fee")?.checked;
      let score = 0;
      if (known === "no") score += 2;
      if (verified === "no") score += 3;
      if (changed) score += 2;
      if (urgent) score += 1;
      if (fee) score += 2;
      const level = score >= 5 ? "high" : score >= 2 ? "medium" : "low";
      setLevel(result, level, level === "high" ? "Nên dừng giao dịch" : level === "medium" ? "Xác minh thêm trước khi chuyển" : "Rủi ro thấp hơn");
      const steps = [
        "Đối chiếu tên người nhận và mục đích giao dịch.",
        "Xác minh lại bằng một kênh độc lập mà bạn tự tìm hoặc đã biết từ trước.",
        "Không chuyển 'phí mở khóa', 'phí xác minh', 'tiền bảo chứng' nếu chưa xác minh căn cứ.",
      ];
      if (changed) steps.unshift("Tài khoản nhận tiền vừa thay đổi: gọi lại đối tác/người thân bằng kênh cũ trước khi chuyển.");
      addList(result.querySelector("[data-result-list]"), steps);
      text(result.querySelector("[data-result-summary]"), level === "high"
        ? "Có nhiều tín hiệu làm tăng rủi ro chuyển nhầm cho đối tượng giả mạo."
        : "Checklist không thể bảo đảm người nhận an toàn; hãy hoàn tất xác minh độc lập trước khi chuyển.");
      show(result);
    });
  }

  function setupFilter(root, cardSelector) {
    const input = root.querySelector("[data-filter-input]");
    const select = root.querySelector("[data-filter-category]");
    const cards = [...root.querySelectorAll(cardSelector)];
    const apply = () => {
      const q = (input?.value || "").trim().toLocaleLowerCase("vi");
      const category = select?.value || "";
      for (const card of cards) {
        const haystack = (card.textContent || "").toLocaleLowerCase("vi");
        const matchesText = !q || haystack.includes(q);
        const matchesCategory = !category || card.dataset.category === category;
        card.hidden = !(matchesText && matchesCategory);
      }
    };
    input?.addEventListener("input", apply);
    select?.addEventListener("change", apply);
  }

  document.querySelectorAll("[data-scam-tool]").forEach((root) => {
    switch (root.dataset.scamTool) {
      case "call-triage": setupCallTriage(root); break;
      case "incident-response": setupIncidentResponse(root); break;
      case "receipt-check": setupReceiptCheck(root); break;
      case "sms-check": setupSmsCheck(root); break;
      case "permission-check": setupPermissionCheck(root); break;
      case "transfer-check": setupTransferCheck(root); break;
      case "official-channels": setupFilter(root, "[data-channel-card]"); break;
      case "scenario-library": setupFilter(root, "[data-scenario-card]"); break;
      default: break;
    }
  });
})();