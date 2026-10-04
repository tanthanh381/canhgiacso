(() => {
  const root = document.documentElement;
  const toggle = document.querySelector("[data-app-theme-toggle]");
  if (toggle) {
    const sync = () => { toggle.textContent = root.dataset.theme === "dark" ? "☀" : "☾"; };
    toggle.addEventListener("click", () => {
      const next = root.dataset.theme === "dark" ? "light" : "dark";
      if (next === "dark") root.dataset.theme = "dark"; else delete root.dataset.theme;
      try { window.localStorage.setItem("khien-so-theme", next); } catch { /* storage unavailable */ }
      sync();
    });
    sync();
  }

  const guideButton = document.querySelector("[data-app-guide]");
  if (!guideButton) return;
  const steps = [
    ["01", "Dừng tương tác", "Không chuyển thêm tiền, không cài ứng dụng, không chia sẻ màn hình, mật khẩu hoặc OTP."],
    ["02", "Chặn tổn thất", "Nếu đã chuyển tiền hoặc lộ thông tin, tự mở ứng dụng hoặc liên hệ ngân hàng qua kênh chính thức để yêu cầu hỗ trợ, khóa dịch vụ cần thiết."],
    ["03", "Lưu bằng chứng và báo cáo", "Lưu số điện thoại, liên kết, tin nhắn và mã giao dịch; trình báo cơ quan công an gần nhất. Cuộc gọi có dấu hiệu lừa đảo có thể phản ánh tới 156 hoặc 5656."],
  ];
  let dialog = null;
  const build = () => {
    const el = (tag, className, text) => { const n = document.createElement(tag); if (className) n.className = className; if (text) n.textContent = text; return n; };
    const d = el("dialog", "app-guide");
    d.setAttribute("aria-labelledby", "app-guide-title");
    const title = el("h2", "", "Dừng — Khóa — Báo");
    title.id = "app-guide-title";
    const list = el("ol");
    for (const [no, head, body] of steps) {
      const li = el("li");
      const text = el("div");
      text.append(el("strong", "", head), el("p", "", body));
      li.append(el("b", "", no), text);
      list.append(li);
    }
    const close = el("button", "app-guide-close", "Tôi đã hiểu");
    close.type = "button";
    close.addEventListener("click", () => d.close());
    d.addEventListener("click", (event) => { if (event.target === d) d.close(); });
    d.append(el("span", "eyebrow", "HDBANK · IT SECURITY"), title, list, el("p", "guide-disclaimer", "Không tin dịch vụ “thu hồi tiền” yêu cầu nộp phí trước. Hướng dẫn này phục vụ đào tạo và không thay thế quy trình xử lý sự cố của tổ chức."), close);
    document.body.append(d);
    return d;
  };
  guideButton.addEventListener("click", () => {
    dialog = dialog || build();
    if (typeof dialog.showModal === "function") dialog.showModal();
  });
})();
