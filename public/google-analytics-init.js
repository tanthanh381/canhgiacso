// Cấu hình GA4. Tệp này do /consent.js nạp SAU khi người dùng chấp nhận phân tích
// (cùng gtag.js), và tự thoát nếu chưa có đồng ý nên không bao giờ chạy khi bị nạp trực tiếp.
(() => {
  const consent = window.CGSConsent;
  if (!consent || typeof consent.get !== "function" || !consent.get().analytics) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };

  // Mặc định GA4 gửi nguyên URL hiện tại. URL có thể chứa token đăng nhập/khôi phục mật khẩu trong
  // hash (#access_token=…), mã lỗi xác thực hoặc mã chứng nhận trong query (?code=CGS-…). Chỉ gửi
  // nguồn gốc + đường dẫn + tham số UTM; hash chỉ giữ khi là tuyến đường của ứng dụng (#/game).
  const UTM_KEYS = /^utm_(?:source|medium|campaign|term|content)$/;
  const SENSITIVE_HASH = /(?:^#|[&?])(?:access_token|refresh_token|provider_token|token|token_hash|code|error|error_code|error_description|type)=/i;

  const safeLocation = () => {
    try {
      const url = new URL(window.location.href);
      const kept = new URLSearchParams();
      for (const [key, value] of url.searchParams) {
        if (UTM_KEYS.test(key)) kept.append(key, value.slice(0, 120));
      }
      const query = kept.toString();
      const hash = url.hash && !SENSITIVE_HASH.test(url.hash) ? url.hash : "";
      return `${url.origin}${url.pathname}${query ? `?${query}` : ""}${hash}`;
    } catch {
      return window.location.origin + window.location.pathname;
    }
  };

  // Trang trước cùng nguồn gốc có thể mang query nhạy cảm (ví dụ trang xác minh chứng nhận).
  const safeReferrer = () => {
    if (!document.referrer) return undefined;
    try {
      const url = new URL(document.referrer);
      return `${url.origin}${url.pathname}`;
    } catch {
      return undefined;
    }
  };

  // Chỉ ghi đè khi URL thật khác bản đã làm sạch; trang bình thường giữ nguyên hành vi mặc định của GA4.
  const overrides = {};
  const pageLocation = safeLocation();
  if (pageLocation !== window.location.href) overrides.page_location = pageLocation;
  const referrer = safeReferrer();
  if (referrer !== undefined && referrer !== document.referrer) overrides.page_referrer = referrer;

  window.gtag("js", new Date());
  window.gtag("config", "G-HH04Q7FYHM", {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_expires: 34128000, // 13 tháng (395 ngày), ngắn hơn mặc định 2 năm của GA4.
    ...overrides,
  });
})();
