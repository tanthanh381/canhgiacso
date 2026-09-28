"use client";

import { ReactNode, useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

type BootstrapState = "checking" | "ready" | "retry";

type SessionBootstrapProps = {
  children: ReactNode;
};

function isInvalidSessionError(error: { status?: number; name?: string; message?: string } | null) {
  if (!error) return false;
  if (error.status === 400 || error.status === 401 || error.status === 403) return true;
  const signature = `${error.name ?? ""} ${error.message ?? ""}`.toLowerCase();
  return signature.includes("refresh token")
    || signature.includes("session missing")
    || signature.includes("jwt")
    || signature.includes("token is expired");
}

export function SessionBootstrap({ children }: SessionBootstrapProps) {
  const [state, setState] = useState<BootstrapState>("checking");

  const validateSession = useCallback(async () => {
    setState("checking");

    const sessionResult = await supabase.auth.getSession();
    if (sessionResult.error) {
      setState("retry");
      return;
    }
    if (!sessionResult.data.session) {
      setState("ready");
      return;
    }

    // getSession() reads browser storage. getUser() verifies the access token
    // with Supabase Auth, which prevents stale local sessions from reaching the
    // account-data loader after a security/auth rollout.
    const userResult = await supabase.auth.getUser();
    if (!userResult.error && userResult.data.user) {
      setState("ready");
      return;
    }

    const refreshResult = await supabase.auth.refreshSession();
    if (!refreshResult.error && refreshResult.data.session) {
      setState("ready");
      return;
    }

    if (isInvalidSessionError(userResult.error) || isInvalidSessionError(refreshResult.error)) {
      // Clear only this browser's invalid session. Remote sessions on other
      // devices are intentionally left untouched.
      await supabase.auth.signOut({ scope: "local" });
      setState("ready");
      return;
    }

    // A transient network/service error must not destroy a valid local session.
    setState("retry");
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void validateSession(), 0);
    return () => window.clearTimeout(timer);
  }, [validateSession]);

  if (state === "ready") return <>{children}</>;

  return (
    <main className="session-bootstrap" aria-live="polite">
      <section className="session-bootstrap-card">
        <div className="session-bootstrap-mark" aria-hidden="true">◉</div>
        <h1>{state === "checking" ? "Đang xác minh phiên đăng nhập…" : "Chưa thể xác minh phiên đăng nhập"}</h1>
        <p>
          {state === "checking"
            ? "Cảnh Giác Số đang kiểm tra và tự làm mới phiên bảo mật trước khi tải dữ liệu tài khoản."
            : "Có thể kết nối tới dịch vụ xác thực đang gián đoạn. Dữ liệu tài khoản của bạn không bị xóa."}
        </p>
        {state === "retry" && (
          <button type="button" onClick={() => void validateSession()}>Thử lại</button>
        )}
      </section>
    </main>
  );
}
