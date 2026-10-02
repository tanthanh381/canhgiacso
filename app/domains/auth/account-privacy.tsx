"use client";

import "../../account-privacy.css";
import { useState, type FormEvent } from "react";
import { downloadJsonFile } from "../../shared/browser-download";
import { Icon } from "../../shared/icons";
import { Modal } from "../../shared/ui-primitives";
import { deleteMyAccount, exportMyData } from "./gateway";
import {
  dataExportFileName,
  deletionFailureMessage,
  matchesDeletionConfirmation,
  validateDeletionRequest,
  type SessionAccount,
} from "./model";

type ExportStatus = { tone: "ok" | "error"; text: string } | null;

// Tải dữ liệu tài khoản: RPC export_my_data (chỉ trả dữ liệu của chính người gọi) rồi tạo tệp JSON
// ngay trên trình duyệt. Dữ liệu không được gửi tới bất kỳ nơi nào khác.
function useDataExport() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<ExportStatus>(null);

  async function run() {
    if (busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const result = await exportMyData();
      if (!result.ok) {
        setStatus({
          tone: "error",
          text: result.error.status === 429
            ? "Bạn đã tải dữ liệu quá nhiều lần. Vui lòng chờ vài phút rồi thử lại."
            : "Chưa tải được dữ liệu. Vui lòng thử lại sau ít phút.",
        });
        return;
      }
      downloadJsonFile(dataExportFileName(new Date()), result.data);
      setStatus({ tone: "ok", text: "Đã tạo tệp JSON ngay trên thiết bị của bạn. Tệp không được gửi đi nơi nào khác." });
    } catch {
      setStatus({ tone: "error", text: "Không thể kết nối dịch vụ tài khoản. Vui lòng thử lại." });
    } finally {
      setBusy(false);
    }
  }

  return { busy, status, run };
}

function ExportStatusLine({ status }: { status: ExportStatus }) {
  if (!status) return null;
  return status.tone === "ok"
    ? <p className="auth-notice" role="status">{status.text}</p>
    : <p className="auth-error" role="alert">{status.text}</p>;
}

/** Khối "Dữ liệu và quyền riêng tư" trong hồ sơ: tải dữ liệu và mở màn hình xóa tài khoản. */
export function AccountPrivacyPanel({ onRequestDelete }: { onRequestDelete: () => void }) {
  const exporter = useDataExport();
  return (
    <section className="privacy-panel" aria-labelledby="privacy-panel-title">
      <h3 id="privacy-panel-title">Dữ liệu và quyền riêng tư</h3>
      <p>Bạn có thể tải về bản sao dữ liệu gắn với tài khoản (hồ sơ, lượt chơi, chứng nhận) hoặc xóa tài khoản vĩnh viễn.</p>
      <div className="privacy-actions">
        <button className="admin-secondary" type="button" disabled={exporter.busy} onClick={() => void exporter.run()}>
          <Icon name="download" size={16} /> {exporter.busy ? "Đang tạo tệp…" : "Tải dữ liệu của tôi (JSON)"}
        </button>
        <button className="privacy-danger-link" type="button" onClick={onRequestDelete}>Xóa tài khoản…</button>
      </div>
      <ExportStatusLine status={exporter.status} />
    </section>
  );
}

/**
 * Màn hình xác nhận xóa tài khoản (thay thế nội dung hồ sơ trong cùng hộp thoại, tránh chồng hai hộp thoại).
 * Người dùng nhập lại mật khẩu (máy chủ kiểm tra "đăng nhập gần đây") và gõ tên đăng nhập để xác nhận.
 */
export function DeleteAccountView({
  account,
  onCancel,
  onDeleted,
}: {
  account: SessionAccount;
  onCancel: () => void;
  onDeleted: () => void | Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const exporter = useDataExport();
  const ready = password.length > 0 && matchesDeletionConfirmation(typed, account.username);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const checked = validateDeletionRequest({ password, typed, username: account.username });
    if (!checked.ok) {
      setError(checked.error);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await deleteMyAccount({ email: account.email, password, confirmation: typed.trim() });
      if (!result.ok) {
        setError(deletionFailureMessage(result.failure, result.detail));
        return;
      }
      setPassword("");
      setTyped("");
      await onDeleted();
    } catch {
      setError("Không thể kết nối dịch vụ tài khoản. Tài khoản chưa bị xóa; vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <span className="eyebrow">XÓA TÀI KHOẢN</span>
      <h2 id="profile-title">Xóa tài khoản vĩnh viễn?</h2>
      <p className="account-username">@{account.username} · {account.email}</p>
      <div className="privacy-consequences">
        <strong>Điều gì sẽ xảy ra</strong>
        <ul>
          <li>Hồ sơ, email và mật khẩu của bạn bị xóa khỏi hệ thống.</li>
          <li>Toàn bộ lượt chơi, lịch sử lựa chọn và tiến trình đồng bộ bị xóa.</li>
          <li>Các chứng nhận đã cấp bị xóa; mã chứng nhận sẽ không còn xác minh được. Tệp PDF đã tải về vẫn ở trên thiết bị của bạn nhưng không còn xác minh được.</li>
          <li>Bạn sẽ bị đăng xuất khỏi mọi thiết bị. Hành động này không thể hoàn tác.</li>
          <li>Hệ thống chỉ giữ một bản ghi kiểm toán ẩn danh (mã giả danh và số lượng bản ghi đã xóa, không có email hay tên) để chứng minh việc xóa đã diễn ra.</li>
        </ul>
        <p>Nếu cần giữ lại dữ liệu, hãy tải về trước khi xóa.</p>
        <button className="admin-secondary" type="button" disabled={exporter.busy || busy} onClick={() => void exporter.run()}>
          <Icon name="download" size={16} /> {exporter.busy ? "Đang tạo tệp…" : "Tải dữ liệu của tôi (JSON)"}
        </button>
        <ExportStatusLine status={exporter.status} />
      </div>
      <form className="auth-form privacy-delete-form" onSubmit={(event) => void submit(event)} noValidate>
        <label>
          <span>Mật khẩu hiện tại</span>
          <input type="password" autoComplete="current-password" maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <label>
          <span>Nhập tên đăng nhập <b>{account.username}</b> để xác nhận</span>
          <input autoComplete="off" autoCapitalize="none" spellCheck={false} value={typed} onChange={(event) => setTyped(event.target.value)} placeholder={account.username} />
        </label>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <div className="profile-actions">
          <button className="admin-secondary" type="button" disabled={busy} onClick={onCancel}>Hủy, giữ tài khoản</button>
          <button className="danger-button" type="submit" disabled={busy || !ready}>{busy ? "Đang xóa…" : "Xóa tài khoản vĩnh viễn"}</button>
        </div>
      </form>
    </>
  );
}

/** Thông báo sau khi xóa: người dùng đã bị đăng xuất và quay về chế độ khách. */
export function AccountDeletedNotice({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} labelledBy="account-deleted-title" className="account-deleted-modal">
      <button className="modal-close" aria-label="Đóng thông báo" onClick={onClose}><Icon name="close" size={18} /></button>
      <span className="eyebrow">TÀI KHOẢN ĐÃ ĐƯỢC XÓA</span>
      <h2 id="account-deleted-title">Đã xóa tài khoản</h2>
      <p className="auth-notice" role="status">Tài khoản và dữ liệu gắn với tài khoản đã được xóa, bạn đã được đăng xuất. Bạn vẫn có thể tiếp tục với tư cách khách hoặc đăng ký tài khoản mới bất cứ lúc nào.</p>
      <div className="profile-actions">
        <button className="primary-button" type="button" onClick={onClose}>Đã hiểu</button>
      </div>
    </Modal>
  );
}
