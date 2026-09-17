"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

type ManagementRole = "admin" | "editor";
type GateState = "idle" | "checking" | "challenge" | "enroll" | "verified" | "error";
type Enrollment = { factorId: string; qrCode: string; secret: string };

function isAdminRoute() {
  return typeof window !== "undefined" && window.location.hash === "#/admin";
}

export function PrivilegedMfaGate() {
  const [adminRoute, setAdminRoute] = useState(isAdminRoute);
  const [role, setRole] = useState<ManagementRole | null>(null);
  const [state, setState] = useState<GateState>("idle");
  const [factorId, setFactorId] = useState("");
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sync = () => setAdminRoute(isAdminRoute());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const inspect = useCallback(async () => {
    if (!adminRoute) {
      setRole(null);
      setState("idle");
      return;
    }

    setState("checking");
    setError("");
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setRole(null);
      setState("idle");
      return;
    }

    const roleResult = await supabase.rpc("get_content_management_role");
    if (roleResult.error) {
      if (roleResult.error.code === "PGRST202" || roleResult.error.code === "42883") {
        setRole(null);
        setState("idle");
        return;
      }
      setError("Không xác minh được quyền quản trị. Vui lòng tải lại trang.");
      setState("error");
      return;
    }

    const managementRole = roleResult.data === "admin" || roleResult.data === "editor"
      ? roleResult.data as ManagementRole
      : null;
    setRole(managementRole);
    if (!managementRole) {
      setState("idle");
      return;
    }

    const aal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal.error) {
      setError("Không kiểm tra được mức xác thực MFA.");
      setState("error");
      return;
    }
    if (aal.data.currentLevel === "aal2") {
      setState("verified");
      return;
    }

    const factors = await supabase.auth.mfa.listFactors();
    if (factors.error) {
      setError("Không đọc được phương thức MFA của tài khoản.");
      setState("error");
      return;
    }
    const verified = factors.data.totp.find((factor) => factor.status === "verified");
    if (verified) {
      setFactorId(verified.id);
      setState("challenge");
      return;
    }

    for (const pending of factors.data.totp.filter((factor) => factor.status !== "verified")) {
      await supabase.auth.mfa.unenroll({ factorId: pending.id });
    }
    const enrolled = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Cảnh Giác Số ${managementRole}`,
    });
    if (enrolled.error) {
      setError("Không thể khởi tạo MFA. Vui lòng thử lại hoặc đăng nhập lại.");
      setState("error");
      return;
    }
    setFactorId(enrolled.data.id);
    setEnrollment({
      factorId: enrolled.data.id,
      qrCode: enrolled.data.totp.qr_code,
      secret: enrolled.data.totp.secret,
    });
    setState("enroll");
  }, [adminRoute]);

  useEffect(() => {
    const initialCheck = window.setTimeout(() => void inspect(), 0);
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED" || event === "MFA_CHALLENGE_VERIFIED") {
        window.setTimeout(() => void inspect(), 0);
      }
    });
    return () => {
      window.clearTimeout(initialCheck);
      data.subscription.unsubscribe();
    };
  }, [inspect]);

  async function verify(event: FormEvent) {
    event.preventDefault();
    const normalized = code.replace(/\s+/g, "");
    if (!/^\d{6}$/.test(normalized) || !factorId) {
      setError("Nhập mã xác thực gồm 6 chữ số.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;
      const verified = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: normalized,
      });
      if (verified.error) throw verified.error;
      const refreshed = await supabase.auth.refreshSession();
      if (refreshed.error) throw refreshed.error;
      window.location.reload();
    } catch {
      setError("Mã xác thực không hợp lệ hoặc đã hết hạn. Hãy thử mã mới.");
      setBusy(false);
    }
  }

  if (!adminRoute || !role || state === "idle" || state === "verified") return null;

  return (
    <div className="security-mfa-layer" role="presentation">
      <section className="security-mfa-dialog" role="dialog" aria-modal="true" aria-labelledby="security-mfa-title">
        <div className="security-mfa-mark" aria-hidden="true">◉</div>
        <h2 id="security-mfa-title">Xác thực hai lớp</h2>

        {state === "checking" && <p className="security-mfa-status">Đang kiểm tra phiên đăng nhập…</p>}

        {state === "enroll" && enrollment && (
          <div className="security-mfa-enroll">
            <p>Quét mã bằng ứng dụng Authenticator.</p>
            <img className="security-mfa-qr" src={enrollment.qrCode} alt="Mã QR để đăng ký TOTP MFA" />
            <p className="security-mfa-secret-label">Hoặc nhập khóa thủ công:</p>
            <code className="security-mfa-secret">{enrollment.secret}</code>
            <p>Nhập mã 6 số đang hiển thị trong ứng dụng.</p>
          </div>
        )}

        {state === "challenge" && (
          <p className="security-mfa-status">Nhập mã 6 số từ ứng dụng Authenticator để tiếp tục.</p>
        )}

        {(state === "challenge" || state === "enroll") && (
          <form className="security-mfa-form" onSubmit={verify}>
            <label htmlFor="security-mfa-code">Mã xác thực</label>
            <input
              id="security-mfa-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            />
            <button type="submit" disabled={busy || code.length !== 6}>
              {busy ? "Đang xác minh…" : "Xác minh"}
            </button>
          </form>
        )}

        {error && <p className="security-mfa-error" role="alert">{error}</p>}
        {state === "error" && <button className="security-mfa-retry" type="button" onClick={() => void inspect()}>Thử lại</button>}
      </section>
    </div>
  );
}
