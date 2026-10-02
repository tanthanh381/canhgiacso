"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { PrivilegedMfaGate } from "./security-hardening";
import { SessionBootstrap } from "./session-bootstrap";
import { StatusCard } from "./shared/status-card";
import { applyTheme, preferredTheme } from "./shared/theme";

/**
 * Everything both entry points have in common: github-pages/main.tsx (static build) and app/layout.tsx (vinext).
 * Static pages outside the app get the same pieces from public/consent.js, public/theme-init.js and public/seo.css.
 */

/** Applies the saved or system theme before the first React render, so a dark theme does not flash light. */
export function initTheme() {
  applyTheme(preferredTheme());
}

/** A rendering error must not leave a blank page: show a short message and let people reload. Saved progress is not touched. */
class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Cảnh Giác Số: lỗi hiển thị", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <StatusCard alert title="Trang gặp lỗi khi hiển thị">
        <p>Tiến trình đã lưu của bạn không bị xóa. Hãy tải lại trang; nếu lỗi lặp lại, vui lòng báo cho IT Security Team - HDBank.</p>
        <button type="button" onClick={() => window.location.reload()}>Tải lại trang</button>
      </StatusCard>
    );
  }
}

/**
 * Wraps the application: error boundary, optional session check and the MFA gate for privileged accounts.
 * The session check replaces the page with a status card until the stored session is verified, so it is only used by the
 * static build, which renders on the client. The vinext build server-renders the whole page (tests/rendered-html.test.mjs).
 */
export function AppRoot({ children, verifySession = true }: { children: ReactNode; verifySession?: boolean }) {
  const app = <>{children}<PrivilegedMfaGate /></>;
  return <AppErrorBoundary>{verifySession ? <SessionBootstrap>{app}</SessionBootstrap> : app}</AppErrorBoundary>;
}
