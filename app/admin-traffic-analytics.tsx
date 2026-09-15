"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import "./admin-traffic-analytics.css";
import "./admin-google-traffic.css";

type WindowKey = "24h" | "7d" | "30d" | "90d";
type SeriesPoint = { bucket: string; views: number; visitors: number; users: number; legacy_sessions: number };
type TopPage = { path: string; views: number; visitors: number; users: number; legacy_sessions: number };
type TrafficSource = { source: string; visitors: number; sessions: number; users: number; legacy_sessions: number };
type LivePage = { path: string; active_visitors: number; active_users: number; legacy_sessions: number };
type DimensionRow = { name: string; users: number; sessions: number; views: number };
type GoogleTrafficPoint = { bucket: string; views: number; sessions: number; users: number };
type GoogleLandingPage = { path: string; views: number; sessions: number; users: number; legacy_sessions: number };

type AnalyticsDashboard = {
  generatedAt: string;
  window: WindowKey;
  onlineNow: number;
  onlineUsers: number;
  onlineLegacySessions: number;
  pageviewsToday: number;
  uniqueUsersToday: number;
  sessionsToday: number;
  identifiedSessionsToday: number;
  legacySessionsToday: number;
  pageviewsWindow: number;
  uniqueUsersWindow: number;
  sessionsWindow: number;
  identifiedSessionsWindow: number;
  legacySessionsWindow: number;
  identifiedPageviewsWindow: number;
  legacyPageviewsWindow: number;
  newUsersWindow: number;
  returningUsersWindow: number;
  series: SeriesPoint[];
  topPages: TopPage[];
  sources: TrafficSource[];
  livePages: LivePage[];
  browsers: DimensionRow[];
  operatingSystems: DimensionRow[];
  devices: DimensionRow[];
};

type GoogleTrafficDashboard = {
  generatedAt: string;
  window: WindowKey;
  googleUsers: number;
  googleSessions: number;
  googlePageviews: number;
  googleLegacySessions: number;
  googleNewUsers: number;
  googleReturningUsers: number;
  googleSeries: GoogleTrafficPoint[];
  googleLandingPages: GoogleLandingPage[];
  googleBrowsers: DimensionRow[];
  googleOperatingSystems: DimensionRow[];
  googleDevices: DimensionRow[];
};

type LoadState = "loading" | "ready" | "error";

const WINDOW_LABELS: Record<WindowKey, string> = {
  "24h": "24 giờ",
  "7d": "7 ngày",
  "30d": "30 ngày",
  "90d": "90 ngày",
};

function number(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizedWindow(value: unknown): WindowKey {
  return value === "7d" || value === "30d" || value === "90d" ? value : "24h";
}

function parseDashboard(value: unknown): AnalyticsDashboard | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const rows = (key: string) => Array.isArray(item[key]) ? item[key] as Array<Record<string, unknown>> : [];
  const dimensions = (key: string) => rows(key).map((row) => ({
    name: String(row.name ?? "Không xác định"),
    users: number(row.users),
    sessions: number(row.sessions),
    views: number(row.views),
  }));

  return {
    generatedAt: typeof item.generatedAt === "string" ? item.generatedAt : new Date().toISOString(),
    window: normalizedWindow(item.window),
    onlineNow: number(item.onlineNow),
    onlineUsers: number(item.onlineUsers),
    onlineLegacySessions: number(item.onlineLegacySessions),
    pageviewsToday: number(item.pageviewsToday),
    uniqueUsersToday: number(item.uniqueUsersToday),
    sessionsToday: number(item.sessionsToday),
    identifiedSessionsToday: number(item.identifiedSessionsToday),
    legacySessionsToday: number(item.legacySessionsToday),
    pageviewsWindow: number(item.pageviewsWindow),
    uniqueUsersWindow: number(item.uniqueUsersWindow),
    sessionsWindow: number(item.sessionsWindow),
    identifiedSessionsWindow: number(item.identifiedSessionsWindow),
    legacySessionsWindow: number(item.legacySessionsWindow),
    identifiedPageviewsWindow: number(item.identifiedPageviewsWindow),
    legacyPageviewsWindow: number(item.legacyPageviewsWindow),
    newUsersWindow: number(item.newUsersWindow),
    returningUsersWindow: number(item.returningUsersWindow),
    series: rows("series").map((row) => ({
      bucket: String(row.bucket ?? ""),
      views: number(row.views),
      visitors: number(row.visitors),
      users: number(row.users),
      legacy_sessions: number(row.legacy_sessions),
    })),
    topPages: rows("topPages").map((row) => ({
      path: String(row.path ?? "/"),
      views: number(row.views),
      visitors: number(row.visitors),
      users: number(row.users),
      legacy_sessions: number(row.legacy_sessions),
    })),
    sources: rows("sources").map((row) => ({
      source: String(row.source ?? "Trực tiếp / không xác định"),
      visitors: number(row.visitors),
      sessions: number(row.sessions),
      users: number(row.users),
      legacy_sessions: number(row.legacy_sessions),
    })),
    livePages: rows("livePages").map((row) => ({
      path: String(row.path ?? "/"),
      active_visitors: number(row.active_visitors),
      active_users: number(row.active_users),
      legacy_sessions: number(row.legacy_sessions),
    })),
    browsers: dimensions("browsers"),
    operatingSystems: dimensions("operatingSystems"),
    devices: dimensions("devices"),
  };
}

function parseGoogleDashboard(value: unknown): GoogleTrafficDashboard | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const rows = (key: string) => Array.isArray(item[key]) ? item[key] as Array<Record<string, unknown>> : [];
  const dimensions = (key: string) => rows(key).map((row) => ({
    name: String(row.name ?? "Không xác định"),
    users: number(row.users),
    sessions: number(row.sessions),
    views: number(row.views),
  }));

  return {
    generatedAt: typeof item.generatedAt === "string" ? item.generatedAt : new Date().toISOString(),
    window: normalizedWindow(item.window),
    googleUsers: number(item.googleUsers),
    googleSessions: number(item.googleSessions),
    googlePageviews: number(item.googlePageviews),
    googleLegacySessions: number(item.googleLegacySessions),
    googleNewUsers: number(item.googleNewUsers),
    googleReturningUsers: number(item.googleReturningUsers),
    googleSeries: rows("googleSeries").map((row) => ({
      bucket: String(row.bucket ?? ""),
      views: number(row.views),
      sessions: number(row.sessions),
      users: number(row.users),
    })),
    googleLandingPages: rows("googleLandingPages").map((row) => ({
      path: String(row.path ?? "/"),
      views: number(row.views),
      sessions: number(row.sessions),
      users: number(row.users),
      legacy_sessions: number(row.legacy_sessions),
    })),
    googleBrowsers: dimensions("googleBrowsers"),
    googleOperatingSystems: dimensions("googleOperatingSystems"),
    googleDevices: dimensions("googleDevices"),
  };
}

function compact(value: number) {
  return new Intl.NumberFormat("vi-VN", { notation: value >= 10_000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);
}

function percent(part: number, total: number) {
  return total > 0 ? `${Math.round(part / total * 100)}%` : "0%";
}

function bucketLabel(bucket: string, window: WindowKey) {
  if (window === "24h") return bucket.split(" ")[1] ?? bucket;
  const parts = bucket.split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : bucket;
}

function pathLabel(path: string) {
  if (path === "/") return "Trang chủ";
  return decodeURIComponent(path).replace(/^\//, "").replace(/\/$/, "") || "Trang chủ";
}

function DimensionPanel({ title, description, rows }: { title: string; description: string; rows: DimensionRow[] }) {
  const max = Math.max(1, ...rows.map((row) => row.users));
  return <section className="traffic-panel traffic-dimension-panel">
    <div className="traffic-panel-title"><div><h3>{title}</h3><p>{description}</p></div></div>
    {rows.length ? <div className="traffic-dimensions">{rows.map((row) => <div key={row.name}>
      <div className="traffic-dimension-head"><strong>{row.name}</strong><span>{compact(row.users)} người dùng</span></div>
      <div className="traffic-dimension-track"><i style={{ width: `${Math.max(3, row.users / max * 100)}%` }} /></div>
      <small>{compact(row.sessions)} phiên · {compact(row.views)} lượt xem</small>
    </div>)}</div> : <div className="traffic-empty compact">Chưa có dữ liệu đã nhận diện cho chiều thống kê này.</div>}
  </section>;
}

export function AdminTrafficAnalytics() {
  const [windowKey, setWindowKey] = useState<WindowKey>("24h");
  const [data, setData] = useState<AnalyticsDashboard | null>(null);
  const [googleData, setGoogleData] = useState<GoogleTrafficDashboard | null>(null);
  const [googleMessage, setGoogleMessage] = useState("");
  const [state, setState] = useState<LoadState>("loading");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const [result, googleResult] = await Promise.all([
      supabase.rpc("get_web_analytics_dashboard", { p_window: windowKey }),
      supabase.rpc("get_google_traffic_dashboard", { p_window: windowKey }),
    ]);

    if (result.error) {
      setState("error");
      setMessage(result.error.code === "42501" ? "Chỉ Quản trị viên được xem số liệu truy cập." : "Không thể tải thống kê truy cập. Hãy thử lại sau.");
      return;
    }

    const parsed = parseDashboard(result.data);
    if (!parsed) {
      setState("error");
      setMessage("Dữ liệu thống kê trả về chưa đúng định dạng.");
      return;
    }

    setData(parsed);
    setState("ready");
    setMessage("");

    if (googleResult.error) {
      setGoogleData(null);
      setGoogleMessage("Không thể tải thống kê Google ở thời điểm này.");
    } else {
      const parsedGoogle = parseGoogleDashboard(googleResult.data);
      setGoogleData(parsedGoogle);
      setGoogleMessage(parsedGoogle ? "" : "Dữ liệu Google trả về chưa đúng định dạng.");
    }
  }, [windowKey]);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 10_000);
    const onVisibility = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);

  const chartMax = useMemo(() => Math.max(1, ...(data?.series.map((point) => point.views) ?? [1])), [data]);
  const sourceMax = useMemo(() => Math.max(1, ...(data?.sources.map((source) => source.sessions) ?? [1])), [data]);
  const googleChartMax = useMemo(() => Math.max(1, ...(googleData?.googleSeries.map((point) => point.views) ?? [1])), [googleData]);

  return <div className="traffic-admin">
    <div className="traffic-admin-head">
      <div>
        <span className="eyebrow">THỐNG KÊ TRUY CẬP · GẦN THỜI GIAN THỰC</span>
        <h2>Lượt truy cập website</h2>
        <p>Session dùng chung giữa các tab và tự tạo mới sau 30 phút không hoạt động. Người dùng chỉ được tính khi có visitor ID ẩn danh.</p>
      </div>
      <div className="traffic-window" role="group" aria-label="Khoảng thời gian thống kê">
        {(Object.keys(WINDOW_LABELS) as WindowKey[]).map((key) => <button key={key} type="button" className={windowKey === key ? "active" : ""} onClick={() => setWindowKey(key)}>{WINDOW_LABELS[key]}</button>)}
      </div>
    </div>

    {state === "loading" && !data && <div className="traffic-empty">Đang tải thống kê truy cập…</div>}
    {state === "error" && <div className="traffic-error" role="alert">{message}<button type="button" onClick={() => void load()}>Thử lại</button></div>}

    {data && <>
      <div className="traffic-live-line"><span className="traffic-live-dot" aria-hidden="true" /> Đang cập nhật tự động <span>·</span> Lần cuối: {new Date(data.generatedAt).toLocaleTimeString("vi-VN")}</div>

      <div className="traffic-kpis">
        <article className="traffic-kpi live"><span>Đang online</span><strong>{compact(data.onlineUsers)}</strong><small>{compact(data.onlineNow)} phiên · {compact(data.onlineLegacySessions)} legacy</small></article>
        <article className="traffic-kpi"><span>Người dùng đã nhận diện hôm nay</span><strong>{compact(data.uniqueUsersToday)}</strong><small>{compact(data.identifiedSessionsToday)} phiên có visitor ID</small></article>
        <article className="traffic-kpi"><span>Phiên hôm nay</span><strong>{compact(data.sessionsToday)}</strong><small>{compact(data.legacySessionsToday)} phiên legacy</small></article>
        <article className="traffic-kpi"><span>Lượt xem hôm nay</span><strong>{compact(data.pageviewsToday)}</strong><small>pageviews đã kiểm tra nhất quán</small></article>
        <article className="traffic-kpi"><span>Người dùng · {WINDOW_LABELS[windowKey]}</span><strong>{compact(data.uniqueUsersWindow)}</strong><small>không quy đổi session legacy thành user</small></article>
        <article className="traffic-kpi"><span>Lượt xem · {WINDOW_LABELS[windowKey]}</span><strong>{compact(data.pageviewsWindow)}</strong><small>{compact(data.sessionsWindow)} phiên</small></article>
      </div>

      <section className="traffic-panel traffic-user-panel">
        <div className="traffic-panel-title"><div><h3>Độ tin cậy dữ liệu người dùng</h3><p>Dữ liệu trước collector v2 được giữ lại nhưng không được suy đoán thành người dùng.</p></div></div>
        <div className="traffic-user-metrics">
          <div><span>Người dùng đã nhận diện</span><strong>{compact(data.uniqueUsersWindow)}</strong><small>{WINDOW_LABELS[windowKey]}</small></div>
          <div><span>Độ phủ pageview</span><strong>{percent(data.identifiedPageviewsWindow, data.pageviewsWindow)}</strong><small>{compact(data.identifiedPageviewsWindow)}/{compact(data.pageviewsWindow)} lượt xem</small></div>
          <div><span>Phiên đã nhận diện</span><strong>{compact(data.identifiedSessionsWindow)}</strong><small>{percent(data.identifiedSessionsWindow, data.sessionsWindow)} tổng phiên</small></div>
          <div><span>Phiên legacy</span><strong>{compact(data.legacySessionsWindow)}</strong><small>không dùng để tính người dùng</small></div>
        </div>
        <p className="traffic-data-note">Khi dữ liệu legacy ra khỏi cửa sổ thời gian đã chọn, độ phủ sẽ tiến dần về 100%. Chỉ số “Người dùng” hiện là số visitor ID thực sự ghi nhận, không còn fallback từ session ID.</p>
      </section>

      <section className="traffic-panel traffic-user-panel">
        <div className="traffic-panel-title"><div><h3>Người dùng đã nhận diện</h3><p>Visitor UUID first-party tự xoay vòng sau 90 ngày; không phải tài khoản đăng nhập.</p></div></div>
        <div className="traffic-user-metrics">
          <div><span>Tổng người dùng</span><strong>{compact(data.uniqueUsersWindow)}</strong><small>{WINDOW_LABELS[windowKey]}</small></div>
          <div><span>Người dùng mới</span><strong>{compact(data.newUsersWindow)}</strong><small>{percent(data.newUsersWindow, data.uniqueUsersWindow)} user đã nhận diện</small></div>
          <div><span>Quay lại</span><strong>{compact(data.returningUsersWindow)}</strong><small>{percent(data.returningUsersWindow, data.uniqueUsersWindow)} user đã nhận diện</small></div>
          <div><span>Phiên/người dùng</span><strong>{data.uniqueUsersWindow ? (data.identifiedSessionsWindow / data.uniqueUsersWindow).toFixed(1) : "0"}</strong><small>chỉ tính phiên có visitor ID</small></div>
        </div>
      </section>

      <section className="traffic-panel traffic-google-panel">
        <div className="traffic-google-heading">
          <div><span className="traffic-google-badge">GOOGLE REFERRER</span><h3>Traffic từ Google</h3><p>Nhận diện phiên có referrer từ các hostname Google như google.com, google.com.vn, google.co.uk…</p></div>
          <small>{WINDOW_LABELS[windowKey]}</small>
        </div>

        {googleMessage && <div className="traffic-error compact" role="alert">{googleMessage}</div>}

        {googleData && <>
          <div className="traffic-user-metrics traffic-google-metrics">
            <div><span>Người dùng từ Google</span><strong>{compact(googleData.googleUsers)}</strong><small>{compact(googleData.googleNewUsers)} mới · {compact(googleData.googleReturningUsers)} quay lại</small></div>
            <div><span>Phiên từ Google</span><strong>{compact(googleData.googleSessions)}</strong><small>{compact(googleData.googleLegacySessions)} phiên legacy</small></div>
            <div><span>Lượt xem từ Google</span><strong>{compact(googleData.googlePageviews)}</strong><small>{googleData.googleSessions ? (googleData.googlePageviews / googleData.googleSessions).toFixed(1) : "0"} lượt/phiên Google</small></div>
            <div><span>Tỷ trọng Google</span><strong>{percent(googleData.googleSessions, data.sessionsWindow)}</strong><small>{compact(googleData.googleSessions)}/{compact(data.sessionsWindow)} tổng phiên</small></div>
          </div>

          <div className="traffic-google-grid">
            <div className="traffic-google-subpanel">
              <h4>Xu hướng Google traffic</h4>
              <p>Lượt xem từ phiên có nguồn Google theo {windowKey === "24h" ? "giờ" : "ngày"}.</p>
              {googleData.googleSeries.length ? <div className="traffic-chart traffic-google-chart" role="img" aria-label="Biểu đồ traffic từ Google">
                {googleData.googleSeries.map((point) => <div className="traffic-bar-column" key={point.bucket} title={`${point.bucket}: ${point.views} lượt xem · ${point.sessions} phiên · ${point.users} người dùng`}>
                  <div className="traffic-bar-value">{point.views}</div>
                  <div className="traffic-bar-track"><span style={{ height: `${Math.max(5, point.views / googleChartMax * 100)}%` }} /></div>
                  <small>{bucketLabel(point.bucket, windowKey)}</small>
                </div>)}
              </div> : <div className="traffic-empty compact">Chưa ghi nhận traffic có referrer Google trong khoảng thời gian này.</div>}
            </div>

            <div className="traffic-google-subpanel">
              <h4>Landing page từ Google</h4>
              <p>Trang đầu tiên của các phiên được Google giới thiệu.</p>
              {googleData.googleLandingPages.length ? <div className="traffic-table-wrap"><table><thead><tr><th>Landing page</th><th>View</th><th>User</th><th>Phiên</th></tr></thead><tbody>{googleData.googleLandingPages.map((page) => <tr key={page.path}><td title={page.path}><strong>{pathLabel(page.path)}</strong><small>{page.path}</small></td><td>{compact(page.views)}</td><td>{compact(page.users)}</td><td>{compact(page.sessions)}</td></tr>)}</tbody></table></div> : <div className="traffic-empty compact">Chưa có landing page từ Google.</div>}
            </div>
          </div>

          <p className="traffic-google-note">Google thường không gửi từ khóa tìm kiếm trong HTTP referrer. Block này đo hành vi sau khi người dùng vào website; truy vấn tìm kiếm, impression, CTR và vị trí vẫn được đo bằng Google Search Console.</p>
        </>}
      </section>

      {googleData && <div className="traffic-dimension-grid traffic-google-dimensions">
        <DimensionPanel title="Google · Trình duyệt" description="Người dùng đã nhận diện đến từ Google." rows={googleData.googleBrowsers} />
        <DimensionPanel title="Google · Hệ điều hành" description="Hệ điều hành của nhóm traffic Google." rows={googleData.googleOperatingSystems} />
        <DimensionPanel title="Google · Thiết bị" description="Desktop, Mobile hoặc Tablet của traffic Google." rows={googleData.googleDevices} />
      </div>}

      <section className="traffic-panel traffic-chart-panel">
        <div className="traffic-panel-title"><div><h3>Xu hướng truy cập</h3><p>Lượt xem, phiên và người dùng đã nhận diện theo {windowKey === "24h" ? "giờ" : "ngày"}.</p></div></div>
        {data.series.length ? <div className="traffic-chart" role="img" aria-label="Biểu đồ lượt xem theo thời gian">
          {data.series.map((point) => <div className="traffic-bar-column" key={point.bucket} title={`${point.bucket}: ${point.views} lượt xem · ${point.visitors} phiên · ${point.users} người dùng · ${point.legacy_sessions} phiên legacy`}>
            <div className="traffic-bar-value">{point.views}</div>
            <div className="traffic-bar-track"><span style={{ height: `${Math.max(5, point.views / chartMax * 100)}%` }} /></div>
            <small>{bucketLabel(point.bucket, windowKey)}</small>
          </div>)}
        </div> : <div className="traffic-empty compact">Chưa có lượt xem trong khoảng thời gian này.</div>}
      </section>

      <div className="traffic-dimension-grid">
        <DimensionPanel title="Trình duyệt" description="Chỉ thống kê phiên có visitor ID; không gửi raw user-agent." rows={data.browsers} />
        <DimensionPanel title="Hệ điều hành" description="Windows, macOS, iOS, Android, Linux…" rows={data.operatingSystems} />
        <DimensionPanel title="Thiết bị" description="Desktop, Mobile hoặc Tablet." rows={data.devices} />
      </div>

      <div className="traffic-two-column">
        <section className="traffic-panel">
          <div className="traffic-panel-title"><div><h3>Trang được xem nhiều</h3><p>Top URL trong {WINDOW_LABELS[windowKey]}.</p></div></div>
          {data.topPages.length ? <div className="traffic-table-wrap"><table><thead><tr><th>Trang</th><th>Lượt xem</th><th>User</th><th>Phiên</th><th>Legacy</th></tr></thead><tbody>{data.topPages.map((page) => <tr key={page.path}><td title={page.path}><strong>{pathLabel(page.path)}</strong><small>{page.path}</small></td><td>{compact(page.views)}</td><td>{compact(page.users)}</td><td>{compact(page.visitors)}</td><td>{compact(page.legacy_sessions)}</td></tr>)}</tbody></table></div> : <div className="traffic-empty compact">Chưa có dữ liệu trang.</div>}
        </section>

        <section className="traffic-panel">
          <div className="traffic-panel-title"><div><h3>Đang được xem</h3><p>Hoạt động trong 5 phút gần nhất.</p></div></div>
          {data.livePages.length ? <div className="traffic-live-pages">{data.livePages.map((page) => <div key={page.path}><span className="traffic-live-dot" /><span><strong>{pathLabel(page.path)}</strong><small>{page.path}</small></span><b>{page.active_users}<small>{page.active_visitors} phiên{page.legacy_sessions ? ` · ${page.legacy_sessions} legacy` : ""}</small></b></div>)}</div> : <div className="traffic-empty compact">Hiện chưa ghi nhận phiên đang hoạt động.</div>}
        </section>
      </div>

      <section className="traffic-panel">
        <div className="traffic-panel-title"><div><h3>Nguồn truy cập</h3><p>Thanh tỷ lệ theo số phiên; user chỉ tính visitor ID thực sự.</p></div></div>
        {data.sources.length ? <div className="traffic-sources">{data.sources.map((source) => <div key={source.source}><span className="traffic-source-name">{source.source}</span><span className="traffic-source-track"><i style={{ width: `${Math.max(3, source.sessions / sourceMax * 100)}%` }} /></span><strong>{compact(source.users)} user</strong><small>{compact(source.sessions)} phiên{source.legacy_sessions ? ` · ${compact(source.legacy_sessions)} legacy` : ""}</small></div>)}</div> : <div className="traffic-empty compact">Chưa có dữ liệu nguồn truy cập.</div>}
      </section>

      <div className="traffic-privacy-note"><strong>Định nghĩa chuẩn hóa</strong><span>Session dùng chung giữa các tab và hết hạn sau 30 phút không hoạt động. Visitor ID ẩn danh lưu first-party tối đa 90 ngày. Không lưu IP, raw user-agent, email, account ID, query string hay dữ liệu biểu mẫu.</span></div>
    </>}
  </div>;
}
