// Cấu hình GA4. Tệp này do /consent.js nạp SAU khi người dùng chấp nhận phân tích
// (cùng gtag.js), và tự thoát nếu chưa có đồng ý nên không bao giờ chạy khi bị nạp trực tiếp.
(() => {
  const consent = window.CGSConsent;
  if (!consent || typeof consent.get !== "function" || !consent.get().analytics) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag("js", new Date());
  window.gtag("config", "G-HH04Q7FYHM", {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_expires: 34128000, // 13 tháng (395 ngày), ngắn hơn mặc định 2 năm của GA4.
  });
})();
