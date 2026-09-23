(() => {
  const byId = (id) => document.getElementById(id);
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);

  function renderSignals(target, title, signals, nextSteps) {
    if (!target) return;
    const risk = Math.min(100, signals.reduce((sum, item) => sum + item.weight, 0));
    const label = risk >= 65 ? "Rủi ro cao" : risk >= 35 ? "Cần xác minh thêm" : "Chưa thấy tín hiệu mạnh";
    target.innerHTML = `
      <div class="tool-result-head"><strong>${label}</strong><span>${risk}/100 điểm tín hiệu</span></div>
      <div class="tool-meter" aria-label="${escapeHtml(label)}"><span style="width:${risk}%"></span></div>
      <h3>${escapeHtml(title)}</h3>
      ${signals.length ? `<ul>${signals.map((item) => `<li><strong>${escapeHtml(item.label)}</strong> — ${escapeHtml(item.detail)}</li>`).join("")}</ul>` : "<p>Chưa phát hiện tín hiệu rủi ro rõ từ dữ liệu bạn chọn. Điều này không chứng minh tình huống là an toàn.</p>"}
      <h3>Việc nên làm tiếp</h3>
      <ol>${nextSteps.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
      <p class="tool-disclaimer">Kết quả chỉ hỗ trợ sàng lọc rủi ro, không kết luận một cá nhân, số điện thoại hay giao dịch là lừa đảo.</p>
    `;
  }

  const callForm = byId("call-risk-form");
  if (callForm) {
    callForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(callForm);
      const signals = [];
      const add = (key, label, detail, weight) => { if (data.get(key)) signals.push({ label, detail, weight }); };
      add("urgent", "Tạo áp lực khẩn cấp", "Yêu cầu xử lý ngay, không cho thời gian xác minh.", 18);
      add("otp", "Yêu cầu OTP/mật khẩu", "Đây là dữ liệu xác thực không nên cung cấp cho người gọi đến.", 30);
      add("transfer", "Yêu cầu chuyển tiền", "Đặc biệt nguy hiểm nếu chuyển vào tài khoản cá nhân hoặc tài khoản lạ.", 24);
      add("install", "Yêu cầu cài ứng dụng", "Ứng dụng ngoài kho chính thống hoặc app điều khiển từ xa có thể chiếm quyền thiết bị.", 24);
      add("secret", "Yêu cầu giữ bí mật", "Cấm gọi người thân hoặc cơ quan chính thức là dấu hiệu thao túng.", 18);
      add("silent", "Cuộc gọi im lặng", "Có thể là robocall, kiểm tra số hoạt động hoặc thu thập tín hiệu âm thanh; không nên suy đoán chắc chắn mục đích.", 12);
      renderSignals(byId("call-risk-result"), "Đánh giá cuộc gọi lạ", signals, [
        "Ngắt cuộc gọi nếu người gọi tạo áp lực hoặc yêu cầu dữ liệu bí mật.",
        "Tự tìm số hotline từ ứng dụng, thẻ, hóa đơn hoặc website chính thức; không gọi lại số do người lạ cung cấp.",
        "Không đọc OTP, PIN, mật khẩu, mã khôi phục hoặc cài ứng dụng theo hướng dẫn qua điện thoại.",
      ]);
    });
  }

  const incidentForm = byId("incident-rescue-form");
  if (incidentForm) {
    incidentForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(incidentForm);
      const signals = [];
      const steps = ["Dừng tương tác với đối tượng và không chuyển thêm tiền."];
      if (data.get("money")) {
        signals.push({ label: "Đã chuyển tiền", detail: "Cần ưu tiên liên hệ ngân hàng và lưu thông tin giao dịch.", weight: 35 });
        steps.push("Gọi ngân hàng qua kênh chính thức, báo giao dịch nghi lừa đảo và yêu cầu hướng dẫn tra soát.");
      }
      if (data.get("credentials")) {
        signals.push({ label: "Đã nhập mật khẩu/OTP", detail: "Thông tin xác thực có thể đã bị lộ.", weight: 35 });
        steps.push("Đổi mật khẩu từ thiết bị tin cậy, thu hồi phiên đăng nhập và bật xác thực đa yếu tố nếu có.");
      }
      if (data.get("app")) {
        signals.push({ label: "Đã cài app hoặc cấp quyền", detail: "Thiết bị có thể bị giám sát hoặc điều khiển.", weight: 30 });
        steps.push("Ngắt mạng nếu nghi bị điều khiển, gỡ quyền Accessibility/Device Admin không rõ nguồn và kiểm tra ứng dụng đã cài.");
      }
      if (data.get("card")) {
        signals.push({ label: "Đã cung cấp dữ liệu thẻ", detail: "Thông tin thẻ có thể bị lợi dụng cho giao dịch trái phép.", weight: 30 });
        steps.push("Khóa thẻ hoặc liên hệ ngân hàng phát hành ngay.");
      }
      steps.push("Lưu ảnh chụp, số điện thoại, URL, tài khoản nhận tiền, biên lai và mốc thời gian.");
      steps.push("Trình báo cơ quan Công an nơi gần nhất nếu có dấu hiệu chiếm đoạt hoặc thiệt hại.");
      renderSignals(byId("incident-rescue-result"), "Ưu tiên xử lý sự cố", signals, steps);
    });
  }

  const smsForm = byId("sms-check-form");
  if (smsForm) {
    smsForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = String(new FormData(smsForm).get("message") || "").trim();
      const lower = text.toLocaleLowerCase("vi");
      const signals = [];
      const patterns = [
        [/https?:\/\/|www\.|bit\.ly|tinyurl|t\.co/i, "Có đường link", "Không đăng nhập từ link trong tin nhắn; tự mở kênh chính thức.", 18],
        [/otp|mã xác thực|ma xac thuc|pin|mật khẩu|mat khau/i, "Đề cập OTP/mật khẩu", "Không gửi dữ liệu xác thực qua SMS/chat.", 24],
        [/khẩn|khan|ngay lập tức|ngay lap tuc|trong \d+ phút|khóa tài khoản|khoa tai khoan/i, "Tạo áp lực thời gian", "Kẻ gian thường dùng cảm giác khẩn cấp để giảm khả năng kiểm tra.", 16],
        [/chuyển tiền|chuyen tien|thanh toán|thanh toan|nộp phí|nop phi|đặt cọc|dat coc/i, "Yêu cầu thanh toán/chuyển tiền", "Xác minh người nhận và mục đích qua kênh khác.", 22],
        [/công an|cong an|ngân hàng|ngan hang|bhxh|điện lực|dien luc|viettel|vinaphone|mobifone/i, "Tự xưng tổ chức quen thuộc", "Tên thương hiệu trong tin nhắn không đủ chứng minh danh tính.", 10],
      ];
      for (const [re, label, detail, weight] of patterns) if (re.test(lower)) signals.push({ label, detail, weight });
      const result = byId("sms-check-result");
      renderSignals(result, "Phân tích tin nhắn đáng ngờ", signals, [
        "Không bấm link, quét QR hoặc gọi số trong tin nhắn khi chưa xác minh.",
        "Mở ứng dụng/website chính thức bằng bookmark hoặc địa chỉ bạn tự nhập.",
        "Nếu tin nhắn nói về tài khoản, hóa đơn hoặc vi phạm, xác minh trực tiếp với tổ chức qua kênh chính thức.",
      ]);
      if (result) {
        const privacy = document.createElement("p");
        privacy.className = "tool-local-note";
        privacy.textContent = "Nội dung được phân tích ngay trên trình duyệt; công cụ này không gửi tin nhắn bạn nhập lên máy chủ.";
        result.appendChild(privacy);
      }
    });
  }

  const permissionForm = byId("permission-check-form");
  if (permissionForm) {
    permissionForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(permissionForm);
      const signals = [];
      const map = [
        ["accessibility", "Quyền Trợ năng / Accessibility", "Có thể cho phép ứng dụng quan sát thao tác và tự bấm nút.", 30],
        ["deviceadmin", "Device Admin", "Có thể làm ứng dụng khó bị gỡ hoặc thay đổi chính sách thiết bị.", 22],
        ["unknown", "Cài app ngoài kho chính thống", "APK/nguồn không rõ làm tăng rủi ro mã độc.", 24],
        ["screen", "Chia sẻ màn hình", "Người khác có thể nhìn thấy OTP và thông tin nhạy cảm.", 18],
        ["remote", "Điều khiển từ xa", "Cho phép bên kia thao tác trực tiếp trên thiết bị.", 32],
        ["sms", "Đọc SMS/thông báo", "Có thể lộ mã xác thực hoặc nội dung riêng tư.", 24],
      ];
      for (const [key, label, detail, weight] of map) if (data.get(key)) signals.push({ label, detail, weight });
      renderSignals(byId("permission-check-result"), "Đánh giá quyền ứng dụng", signals, [
        "Không cấp quyền nhạy cảm chỉ vì người gọi/chat yêu cầu.",
        "Nếu ứng dụng không rõ nguồn đã có quyền cao, thu hồi quyền trước rồi gỡ ứng dụng.",
        "Nếu nghi thiết bị bị điều khiển, dùng thiết bị khác để đổi mật khẩu và liên hệ ngân hàng/dịch vụ liên quan.",
      ]);
    });
  }

  const transferForm = byId("transfer-check-form");
  if (transferForm) {
    transferForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(transferForm);
      const signals = [];
      const map = [
        ["newaccount", "Tài khoản nhận tiền mới", "Thông tin nhận tiền vừa thay đổi hoặc chưa từng giao dịch.", 18],
        ["urgent", "Thúc giục chuyển ngay", "Áp lực thời gian làm giảm khả năng xác minh.", 18],
        ["thirdparty", "Tài khoản không trùng người/tổ chức", "Chuyển cho bên thứ ba làm tăng rủi ro.", 22],
        ["secret", "Yêu cầu giữ bí mật", "Không cho gọi người khác xác minh là dấu hiệu rủi ro.", 20],
        ["onlychat", "Chỉ xác minh qua cùng một kênh chat", "Tài khoản chat có thể đã bị chiếm quyền.", 18],
      ];
      for (const [key, label, detail, weight] of map) if (data.get(key)) signals.push({ label, detail, weight });
      renderSignals(byId("transfer-check-result"), "Kiểm tra trước khi chuyển tiền", signals, [
        "Xác minh qua một kênh độc lập đã biết từ trước.",
        "Kiểm tra tên người nhận và mục đích giao dịch.",
        "Với thay đổi tài khoản nhận tiền, xác nhận bằng cuộc gọi hoặc quy trình phê duyệt khác.",
        "Nếu chưa đủ căn cứ, trì hoãn giao dịch thay vì chuyển thử một phần.",
      ]);
    });
  }

  const channelForm = byId("official-channel-form");
  if (channelForm) {
    const guide = {
      bank: ["Mở ứng dụng ngân hàng đã cài từ trước hoặc xem số hotline in trên thẻ/hợp đồng.", "Không gọi số hotline xuất hiện trong SMS/link đáng ngờ.", "Nếu có giao dịch lạ, khóa thẻ/tài khoản theo hướng dẫn của ngân hàng."],
      telco: ["Dùng ứng dụng chính thức của nhà mạng hoặc website nhà mạng.", "Kiểm tra thông báo chuẩn hóa thuê bao bằng kênh do nhà mạng công bố.", "Không cài APK hoặc chia sẻ OTP cho người tự xưng nhân viên nhà mạng."],
      bhxh: ["Truy cập trực tiếp cổng BHXH Việt Nam hoặc ứng dụng VssID đã cài từ nguồn chính thống.", "Không nhập CCCD/thẻ BHYT vào website được gửi qua chat nếu chưa xác minh tên miền."],
      utility: ["Mở ứng dụng/hóa đơn điện nước mà bạn vẫn sử dụng hoặc gọi tổng đài trên hóa đơn.", "Không chuyển tiền vào tài khoản cá nhân do người gọi cung cấp."],
      public: ["Tự truy cập cổng dịch vụ công hoặc website cơ quan nhà nước.", "Cơ quan Công an không yêu cầu chuyển tiền vào tài khoản cá nhân để phục vụ điều tra/xác minh."],
    };
    channelForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const key = String(new FormData(channelForm).get("channel") || "public");
      const target = byId("official-channel-result");
      const items = guide[key] || guide.public;
      if (target) target.innerHTML = `<h3>Cách tìm kênh chính thức</h3><ol>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol><p class="tool-disclaimer">Không ưu tiên kết quả quảng cáo hoặc số điện thoại do đối tượng đang liên hệ cung cấp.</p>`;
    });
  }

  const scenarioSearch = byId("scenario-library-search");
  if (scenarioSearch) {
    const cards = Array.from(document.querySelectorAll("[data-scenario-card]"));
    const update = () => {
      const q = scenarioSearch.value.trim().toLocaleLowerCase("vi");
      let visible = 0;
      for (const card of cards) {
        const text = card.textContent.toLocaleLowerCase("vi");
        const show = !q || text.includes(q);
        card.hidden = !show;
        if (show) visible += 1;
      }
      const count = byId("scenario-library-count");
      if (count) count.textContent = `${visible} / ${cards.length} kịch bản`;
    };
    scenarioSearch.addEventListener("input", update);
    update();
  }
})();