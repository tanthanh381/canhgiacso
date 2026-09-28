(() => {
  const make = (tag, text, className) => {
    const el = document.createElement(tag);
    if (text) el.textContent = text;
    if (className) el.className = className;
    return el;
  };

  const googleLink = (query, label) => {
    const link = make("a", label, "seo-tool-action");
    link.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    return link;
  };

  const actions = (...links) => {
    const box = make("div", "", "seo-tool-actions");
    links.forEach((link) => box.append(link));
    return box;
  };

  const phoneForm = document.querySelector("#phone-lookup-form");
  if (phoneForm) {
    const input = document.querySelector("#phone-lookup-input");
    const result = document.querySelector("#phone-lookup-result");

    phoneForm.addEventListener("submit", (event) => {
      event.preventDefault();
      result.replaceChildren();
      const raw = input.value.trim();
      const digits = raw.replace(/\D/g, "");
      if (digits.length < 9 || digits.length > 12) {
        result.append(make("p", "Số điện thoại chưa đúng định dạng thường gặp. Hãy kiểm tra lại trước khi tra cứu.", "seo-tool-error"));
        return;
      }

      let domestic = digits;
      if (digits.startsWith("84") && digits.length >= 11) domestic = `0${digits.slice(2)}`;
      if (!domestic.startsWith("0") && domestic.length === 9) domestic = `0${domestic}`;
      const international = domestic.startsWith("0") ? `+84${domestic.slice(1)}` : `+${digits}`;
      const exact = `"${domestic}"`;
      const exactIntl = `"${international}"`;

      const card = make("div", "", "seo-tool-summary ok");
      card.append(make("strong", "Đã chuẩn hóa số để tra cứu"));
      card.append(make("p", `Dạng trong nước: ${domestic} · Dạng quốc tế: ${international}`));
      result.append(card);
      result.append(actions(
        googleLink(exact, "Tìm chính xác số này"),
        googleLink(`${exact} lừa đảo`, "Tìm số + “lừa đảo”"),
        googleLink(`${exactIntl} spam OR scam`, "Tìm dạng +84 / spam")
      ));
      const caution = make("p", "Không tìm thấy kết quả không có nghĩa số này an toàn. Hãy xác minh nội dung cuộc gọi bằng kênh chính thức nếu liên quan tiền, OTP, cài ứng dụng hoặc dữ liệu cá nhân.", "seo-tool-caution");
      result.append(caution);
    });
  }

  const accountForm = document.querySelector("#account-lookup-form");
  if (accountForm) {
    const accountInput = document.querySelector("#account-lookup-input");
    const bankInput = document.querySelector("#account-bank-input");
    const result = document.querySelector("#account-lookup-result");

    accountForm.addEventListener("submit", (event) => {
      event.preventDefault();
      result.replaceChildren();
      const account = accountInput.value.replace(/\D/g, "");
      const bank = bankInput.value.trim();
      if (account.length < 5 || account.length > 30) {
        result.append(make("p", "Số tài khoản chưa hợp lệ để tạo truy vấn. Hãy kiểm tra lại các chữ số.", "seo-tool-error"));
        return;
      }

      const exact = `"${account}"`;
      const bankPart = bank ? ` ${bank}` : "";
      const card = make("div", "", "seo-tool-summary ok");
      card.append(make("strong", "Đã tạo truy vấn đối chiếu công khai"));
      card.append(make("p", bank ? `Số tài khoản: ${account} · Ngân hàng: ${bank}` : `Số tài khoản: ${account}`));
      result.append(card);
      result.append(actions(
        googleLink(`${exact}${bankPart}`, "Tìm chính xác số tài khoản"),
        googleLink(`${exact}${bankPart} lừa đảo`, "Tìm số + “lừa đảo”"),
        googleLink(`${exact}${bankPart} scam`, "Tìm số + “scam”")
      ));
      result.append(make("p", "Tên người nhận khớp và việc không có cảnh báo công khai đều không phải chứng nhận an toàn. Hãy xác minh người yêu cầu chuyển tiền và mục đích giao dịch trước khi xác nhận.", "seo-tool-caution"));
    });
  }

  const form = document.querySelector("#url-risk-form");
  if (!form) return;

  const input = document.querySelector("#url-risk-input");
  const result = document.querySelector("#url-risk-result");
  const shorteners = new Set(["bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "rebrand.ly", "shorturl.at", "tiny.cc"]);
  const riskyExtensions = /\.(apk|exe|msi|dmg|pkg|scr|bat|cmd|ps1|jar|zip|rar|7z)(?:$|[?#])/i;
  const ipv4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    result.replaceChildren();
    const raw = input.value.trim();
    if (!raw) {
      result.append(make("p", "Hãy nhập một URL hoặc tên miền cần kiểm tra.", "seo-tool-error"));
      return;
    }

    const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw);
    let parsed;
    try {
      parsed = new URL(hasScheme ? raw : `https://${raw}`);
    } catch {
      result.append(make("p", "URL không hợp lệ hoặc không thể phân tích.", "seo-tool-error"));
      return;
    }

    const signals = [];
    const add = (level, title, detail) => signals.push({ level, title, detail });
    const host = parsed.hostname.toLowerCase();
    const labels = host.split(".").filter(Boolean);

    if (!hasScheme) add("info", "Chưa có giao thức", "Công cụ tạm giả định HTTPS để phân tích tên miền. Khi mở thật, hãy kiểm tra địa chỉ bắt đầu bằng https://.");
    if (parsed.protocol !== "https:") add("warn", "Không dùng HTTPS", "Kết nối không phải HTTPS. Không nhập mật khẩu, OTP hoặc thông tin thanh toán trên kết nối không được mã hóa.");
    if (parsed.username || parsed.password) add("high", "URL chứa thông tin trước ký tự @", "Đây là cấu trúc dễ khiến người dùng nhìn nhầm tên miền thật. Hãy kiểm tra kỹ phần hostname sau ký tự @.");
    if (host.startsWith("xn--") || labels.some((label) => label.startsWith("xn--"))) add("warn", "Tên miền dùng Punycode", "Punycode có thể hợp lệ nhưng cũng được dùng để tạo tên miền nhìn gần giống thương hiệu bằng ký tự Unicode.");
    if (ipv4.test(host) || host.includes(":")) add("warn", "Đích là địa chỉ IP", "Các dịch vụ công khai uy tín thường dùng tên miền rõ ràng. Địa chỉ IP trực tiếp cần được xác minh thêm.");
    if (shorteners.has(host)) add("warn", "URL rút gọn", "URL rút gọn che giấu điểm đến cuối cùng. Không mở nếu bạn không xác minh được người gửi và mục đích.");
    if (labels.length > 4) add("info", "Tên miền có nhiều tầng", "Nhiều subdomain không tự động là lừa đảo, nhưng có thể làm người dùng nhầm phần tên miền chính.");
    if (parsed.port && !["80", "443"].includes(parsed.port)) add("warn", "Cổng mạng không thông dụng", `URL sử dụng cổng ${parsed.port}; hãy xác minh dịch vụ trước khi đăng nhập hoặc tải file.`);
    if (riskyExtensions.test(parsed.pathname)) add("high", "Link dẫn tới tệp có khả năng thực thi/nén", "Không tải hoặc chạy file từ nguồn chưa xác minh, đặc biệt APK/EXE/MSI/DMG/PKG hoặc file nén.");
    if (/%40/i.test(raw) || /%2f/i.test(raw)) add("info", "URL chứa ký tự được mã hóa", "Ký tự mã hóa có thể hoàn toàn hợp lệ nhưng làm địa chỉ khó đọc hơn. Hãy kiểm tra hostname sau khi trình duyệt giải mã.");
    if ((host.match(/-/g) || []).length >= 3) add("info", "Tên miền có nhiều dấu gạch nối", "Nhiều dấu gạch nối không tự động là lừa đảo nhưng thường xuất hiện ở các tên miền mô phỏng thương hiệu hoặc chiến dịch tạm thời.");

    const high = signals.some((s) => s.level === "high");
    const warn = signals.some((s) => s.level === "warn");
    const summary = high ? "Có tín hiệu rủi ro cao" : warn ? "Có tín hiệu cần kiểm tra thêm" : "Chưa thấy tín hiệu kỹ thuật rõ ràng";
    const tone = high ? "high" : warn ? "warn" : "ok";

    const card = make("div", "", `seo-tool-summary ${tone}`);
    card.append(make("strong", summary));
    card.append(make("p", `Tên miền được phân tích: ${host || "không xác định"}`));
    result.append(card);

    if (signals.length) {
      const list = make("ul", "", "seo-tool-signals");
      for (const signal of signals) {
        const item = make("li");
        item.append(make("strong", signal.title));
        item.append(document.createTextNode(` — ${signal.detail}`));
        list.append(item);
      }
      result.append(list);
    } else {
      result.append(make("p", "Không phát hiện các tín hiệu kỹ thuật phổ biến trong bộ kiểm tra này. Điều đó không chứng minh website an toàn hoặc thuộc đúng tổ chức mà nó tự nhận.", "seo-tool-caution"));
    }

    result.append(actions(
      googleLink(`"${host}"`, "Tìm chính xác tên miền"),
      googleLink(`"${host}" lừa đảo`, "Tìm tên miền + “lừa đảo”")
    ));

    const next = make("div", "", "seo-note");
    next.append(make("strong", "Bước tiếp theo"));
    next.append(make("p", "Nếu link liên quan ngân hàng, cơ quan nhà nước, giao hàng hoặc thanh toán: đừng đăng nhập từ link này. Hãy tự mở ứng dụng hoặc website chính thức bằng địa chỉ bạn đã biết hoặc tự tìm độc lập."));
    result.append(next);
  });
})();
