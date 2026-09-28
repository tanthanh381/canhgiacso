'use client';

export function AccessibilityEnhancements() {
  return (
    <>
      {/* Skip to main content link for keyboard users */}
      <a href="#main-content" className="skip-link">
        Nhảy đến nội dung chính
      </a>

      {/* Accessibility notice */}
      <div
        role="region"
        aria-label="Thông báo trợ cập"
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        Trang web này được thiết kế với khả năng truy cập.
        Sử dụng Tab để điều hướng, Enter để kích hoạt nút, và Escape để đóng các hộp thoại.
      </div>
    </>
  );
}
