import type { Scenario } from "../../data";
import { BadgeIcon } from "../../shared/ui-primitives";
import type { SessionAccount } from "../auth/model";
import type { AnalyticsUser, DashboardStatus, ScenarioRisk } from "./model";
import type { summarizeAnalytics } from "./model";

const money = new Intl.NumberFormat("vi-VN");

export function DashboardView({
  copy,
  account,
  status,
  users,
  analytics,
  historySummary,
  scenarioRisks,
  scenarioCount,
  onLogin,
  onExport,
}: {
  copy: {
    dashboardEyebrow: string;
    dashboardTitle: string;
    dashboardIntro: string;
  };
  account: SessionAccount | null;
  status: DashboardStatus;
  users: AnalyticsUser[];
  analytics: ReturnType<typeof summarizeAnalytics>;
  historySummary: { runs: number; attempts: number; correct: number; legacyAttempts: number };
  scenarioRisks: Array<Scenario & ScenarioRisk>;
  scenarioCount: number;
  onLogin: () => void;
  onExport: () => void;
}) {
  return (
    <section className="content-page dashboard-page">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">{copy.dashboardEyebrow}</span>
          <h1>{copy.dashboardTitle}</h1>
          <p>{copy.dashboardIntro}</p>
        </div>
        {status === "ready" && (
          <button className="export-button" onClick={onExport} disabled={!users.length}>
            ⇩ Xuất báo cáo CSV
          </button>
        )}
      </div>

      {!account && (
        <div className="dashboard-gate">
          <BadgeIcon>◇</BadgeIcon>
          <h2>Đăng nhập để truy cập Dashboard</h2>
          <p>Dữ liệu tổng hợp chỉ dành cho tài khoản Quản trị đã được IT Security phê duyệt.</p>
          <button className="primary-button" onClick={onLogin}>Đăng nhập</button>
        </div>
      )}
      {account && status === "loading" && <div className="dashboard-gate"><h2>Đang tải dữ liệu báo cáo…</h2></div>}
      {account && status === "error" && <div className="dashboard-gate"><h2>Chưa thể tải Dashboard</h2><p>Vui lòng kiểm tra kết nối và thử lại.</p></div>}
      {account && status === "forbidden" && (
        <div className="dashboard-gate">
          <BadgeIcon>◇</BadgeIcon>
          <h2>Tài khoản chưa có quyền Quản trị</h2>
          <p>Dashboard tổng hợp được bảo vệ bằng phân quyền phía máy chủ. Hãy liên hệ IT Security để được phê duyệt.</p>
        </div>
      )}

      {status === "ready" && (
        <>
          <div className="data-scope-note" role="note">
            <strong>Phạm vi dữ liệu:</strong> {users.length} tài khoản · Chỉ gồm hồ sơ đăng ký và kết quả mô phỏng · Không chứa mật khẩu, OTP hoặc dữ liệu ngân hàng.
          </div>
          <div className="data-scope-note" role="note">
            <strong>Lượt chơi hiện tại:</strong> Các chỉ số và CSV bên dưới phản ánh lượt hiện tại của mỗi tài khoản.{" "}
            <strong>Lịch sử đã lưu:</strong> {historySummary.runs} lượt · {historySummary.attempts} câu trả lời · {historySummary.correct} câu đúng.{" "}
            {historySummary.legacyAttempts > 0 && (
              <span>Có {historySummary.legacyAttempts} kết quả cũ được giữ nguyên, chưa được cơ chế chấm điểm máy chủ mới xác minh.</span>
            )}
          </div>
          <div className="dashboard-handling-note" role="note">
            <strong>Phân loại sử dụng nội bộ:</strong> Chỉ xuất và chia sẻ báo cáo cho người có trách nhiệm; không dùng kết quả mô phỏng làm kết luận duy nhất về rủi ro cá nhân.
          </div>

          <div className="ciso-kpis">
            <article><small>Người dùng đã đăng ký</small><strong>{users.length}</strong><span>{analytics.active} đã tham gia đào tạo</span></article>
            <article><small>Tỷ lệ tham gia</small><strong>{analytics.participation}%</strong><span>{analytics.active}/{users.length || 0} người dùng hoạt động</span></article>
            <article><small>Tỷ lệ xử lý an toàn</small><strong>{analytics.accuracy}%</strong><span>{analytics.correct}/{analytics.attempts} lượt đúng</span></article>
            <article className={analytics.highRisk ? "risk-kpi" : ""}><small>Người dùng rủi ro cao</small><strong>{analytics.highRisk}</strong><span>Cần ưu tiên đào tạo lại</span></article>
            <article><small>Tổn thất mô phỏng</small><strong className="dashboard-money">{money.format(analytics.totalLoss)}đ</strong><span>Tổng tác động từ lựa chọn sai</span></article>
          </div>

          <div className="dashboard-grid">
            <article className="dashboard-card outcome-card">
              <div className="dashboard-card-title">
                <div><small>HIỆU QUẢ ĐÀO TẠO</small><h2>Kết quả xử lý tình huống</h2></div>
                <strong>{analytics.attempts} lượt</strong>
              </div>
              <div className="outcome-chart" aria-label={`${analytics.correct} lượt an toàn, ${Math.max(0, analytics.attempts - analytics.correct)} lượt mắc bẫy`}>
                <div className="outcome-bar"><span style={{ width: `${analytics.accuracy}%` }} /></div>
                <div className="outcome-legend">
                  <span><i className="safe-dot" />An toàn <b>{analytics.correct}</b></span>
                  <span><i className="risk-dot" />Mắc bẫy <b>{Math.max(0, analytics.attempts - analytics.correct)}</b></span>
                </div>
              </div>
            </article>

            <article className="dashboard-card">
              <div className="dashboard-card-title"><div><small>RỦI RO NỔI BẬT</small><h2>Kịch bản dễ mắc bẫy</h2></div></div>
              <div className="risk-ranking">
                {scenarioRisks.map((item, index) => (
                  <div key={item.id}>
                    <span>{index + 1}</span>
                    <div><strong>{item.title}</strong><small>{item.attempts ? `${item.wrong}/${item.attempts} lượt sai` : "Chưa có dữ liệu"}</small></div>
                    <b>{item.rate}%</b>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <article className="dashboard-card user-analysis">
            <div className="dashboard-card-title">
              <div><small>PHÂN TÍCH NGƯỜI DÙNG</small><h2>Danh sách ưu tiên đào tạo</h2></div>
              <span>Sắp xếp theo mức rủi ro</span>
            </div>
            <div className="analytics-table-wrap">
              <table>
                <thead><tr><th>Người dùng</th><th>Tham gia</th><th>Chính xác</th><th>Cảnh giác</th><th>Tổn thất mô phỏng</th><th>Đánh giá</th></tr></thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.username}>
                      <td><strong>{user.displayName}</strong><small>@{user.username} · {new Date(user.createdAt).toLocaleDateString("vi-VN")}</small></td>
                      <td>{user.completed}/{scenarioCount}</td>
                      <td>{user.accuracy}%</td>
                      <td>{user.awareness}%</td>
                      <td>{money.format(user.loss)}đ</td>
                      <td><span className={`risk-label risk-${user.risk === "Cao" ? "high" : user.risk === "Thấp" ? "low" : "medium"}`}>{user.risk}</span></td>
                    </tr>
                  ))}
                  {!users.length && <tr><td colSpan={6} className="empty-table">Chưa có tài khoản để phân tích.</td></tr>}
                </tbody>
              </table>
            </div>
          </article>
        </>
      )}
    </section>
  );
}
