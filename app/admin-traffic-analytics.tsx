"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import "./admin-traffic-analytics.css";
import "./admin-google-traffic.css";
import { AdminCountryAnalytics } from "./admin-country-analytics";

type WindowKey = "24h" | "7d" | "30d" | "90d";
type SeriesPoint = { bucket: string; views: number; visitors: number; users: number; legacy_sessions: number };
type TopPage = { path: string; views: number; visitors: number; users: number; legacy_sessions: number };
type TrafficSource = { source: string; visitors: number; sessions: number; users: number; legacy_sessions: number };
type LivePage = { path: string; active_visitors: number; active_users: number; legacy_sessions: number };
type DimensionRow = { name: string; users: number; sessions: number; views: number };
type GoogleTrafficPoint = { bucket: string; views: number; sessions: number; users: number };
type GoogleLandingPage = { path: string; views: number; sessions: number; users: number; legacy_sessions: number };
type BehaviorMetrics = { pagesPerSession: number; avgSessionDurationSeconds: number; engagedSessions: number; engagementRate: number; bounceRate: number; sessions: number };
type PreviousPeriod = { users: number; sessions: number; pageviews: number; pagesPerSession: number; avgSessionDurationSeconds: number; engagedSessions: number; engagementRate: number };
type LandingInsight = { path: string; sessions: number; users: number; views: number; engaged_sessions: number; avg_duration_seconds: number };
type ExitInsight = { path: string; sessions: number; users: number };
type ChannelInsight = { name: string; sessions: number; users: number; views: number };
type CampaignInsight = { campaign: string; source: string; medium: string; sessions: number; users: number; views: number };
type DurationBucket = { bucket: string; sessions: number };

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

type AnalyticsInsights = {
  generatedAt: string;
  window: WindowKey;
  behavior: BehaviorMetrics;
  previousPeriod: PreviousPeriod;
  landingPages: LandingInsight[];
  exitPages: ExitInsight[];
  channels: ChannelInsight[];
  campaigns: CampaignInsight[];
  durationBuckets: DurationBucket[];
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

function parseInsights(value: unknown): AnalyticsInsights | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const object = (key: string) => item[key] && typeof item[key] === "object" ? item[key] as Record<string, unknown> : {};
  const rows = (key: string) => Array.isArray(item[key]) ? item[key] as Array<Record<string, unknown>> : [];
  const behavior = object("behavior");
  const previous = object("previousPeriod");
  return {
    generatedAt: typeof item.generatedAt === "string" ? item.generatedAt : new Date().toISOString(),
    window: normalizedWindow(item.window),
    behavior: {
      pagesPerSession: number(behavior.pagesPerSession),
      avgSessionDurationSeconds: number(behavior.avgSessionDurationSeconds),
      engagedSessions: number(behavior.engagedSessions),
      engagementRate: number(behavior.engagementRate),
      bounceRate: number(behavior.bounceRate),
      sessions: number(behavior.sessions),
    },
    previousPeriod: {
      users: number(previous.users),
      sessions: number(previous.sessions),
      pageviews: number(previous.pageviews),
      pagesPerSession: number(previous.pagesPerSession),
      avgSessionDurationSeconds: number(previous.avgSessionDurationSeconds),
      engagedSessions: number(previous.engagedSessions),
      engagementRate: number(previous.engagementRate),
    },
    landingPages: rows("landingPages").map((row) => ({
      path: String(row.path ?? "/"), sessions: number(row.sessions), users: number(row.users), views: number(row.views),
      engaged_sessions: number(row.engaged_sessions), avg_duration_seconds: number(row.avg_duration_seconds),
    })),
    exitPages: rows("exitPages").map((row) => ({ path: String(row.path ?? "/"), sessions: number(row.sessions), users: number(row.users) })),
    channels: rows("channels").map((row) => ({ name: String(row.name ?? "Khác"), sessions: number(row.sessions), users: number(row.users), views: number(row.views) })),
    campaigns: rows("campaigns").map((row) => ({
      campaign: String(row.campaign ?? "(not set)"), source: String(row.source ?? "(not set)"), medium: String(row.medium ?? "(not set)"),
      sessions: number(row.sessions), users: number(row.users), views: number(row.views),
    })),
    durationBuckets: rows("durationBuckets").map((row) => ({ bucket: String(row.bucket ?? ""), sessions: number(row.sessions) })),
  };
}

function compact(value: number) {
  return new Intl.NumberFormat("vi-VN", { notation: value >= 10_000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);
}

function percent(part: number, total: number) {
  return total > 0 ? `${Math.round(part / total * 100)}%` : "0%";
}

function durationLabel(seconds: number) {
  if (!seconds || seconds < 1) return "0 giây";
  if (seconds < 60) return `${Math.round(seconds)} giây`;
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.round(seconds % 60);
  return `${minutes}p ${remaining.toString().padStart(2, "0")}s`;
}

function trend(current: number, previous: number, suffix = "%") {
  if (previous <= 0) return current > 0 ? { text: "Mới", tone: "up" } : { text: "—", tone: "neutral" };
  const change = ((current - previous) / previous) * 100;
  const rounded = Math.round(Math.abs(change));
  return { text: `${change > 0 ? "↑" : change < 0 ? "↓" : "→"} ${rounded}${suffix}`, tone: change > 0 ? "up" : change < 0 ? "down" : "neutral" };
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

function TrendBadge({ current, previous }: { current: number; previous: number }) {
  const item = trend(current, previous);
  return <span className={`traffic-trend ${item.tone}`}>{item.text} so với kỳ trước</span>;
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

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="traffic-section-heading"><span>{eyebrow}</span><h3>{title}</h3><p>{description}</p></div>;
}

export function AdminTrafficAnalytics() {
  const [windowKey, setWindowKey] = useState<WindowKey>("24h");
  const [data, setData] = useState<AnalyticsDashboard | null>(null);
  const [googleData, setGoogleData] = useState<GoogleTrafficDashboard | null>(null);
  const [insights, setInsights] = useState<AnalyticsInsights | null>(null);
  const [googleMessage, setGoogleMessage] = useState("");
  const [insightsMessage, setInsightsMessage] = useState("");
  const [state, setState] = useState<LoadState>("loading");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const [result, googleResult, insightsResult] = await Promise.all([
      supabase.rpc("get_web_analytics_dashboard", { p_window: windowKey }),
      supabase.rpc("get_google_traffic_dashboard", { p_window: windowKey }),
      supabase.rpc("get_web_analytics_insights", { p_window: windowKey }),
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

    if (insightsResult.error) {
      setInsights(null);
      setInsightsMessage("Không thể tải chỉ số hành vi nâng cao ở thời điểm này.");
    } else {
      const parsedInsights = parseInsights(insightsResult.data);
      setInsights(parsedInsights);
      setInsightsMessage(parsedInsights ? "" : "Dữ liệu hành vi nâng cao chưa đúng định dạng.");
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
  const channelMax = useMemo(() => Math.max(1, ...(insights?.channels.map((row) => row.sessions) ?? [1])), [insights]);
  const durationMax = useMemo(() => Math.max(1, ...(insights?.durationBuckets.map((row) => row.sessions) ?? [1])), [insights]);

  return <div className="traffic-admin">
    <div className="traffic-admin-head">
      <div>
        <span className="eyebrow">ANALYTICS CONSOLE · GẦN THỜI GIAN THỰC</span>
        <h2>Thống kê truy cập</h2>
        <p>Theo dõi người dùng, phiên, nguồn truy cập, hành vi, nội dung, quốc gia và thiết bị trên cùng một dashboard.</p>
      </div>
      <div className="traffic-window" role="group" aria-label="Khoảng thời gian thống kê">
        {(Object.keys(WINDOW_LABELS) as WindowKey[]).map((key) => <button key={key} type="button" className={windowKey === key ? "active" : ""} onClick={() => setWindowKey(key)}>{WINDOW_LABELS[key]}</button>)}
      </div>
    </div>

    <nav className="traffic-section-nav" aria-label="Các nhóm thống kê">
      <button type="button" onClick={() => document.getElementById("traffic-overview")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Tổng quan</button>
      <button type="button" onClick={() => document.getElementById("traffic-acquisition")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Thu hút</button>
      <button type="button" onClick={() => document.getElementById("traffic-content")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Nội dung</button>
      <button type="button" onClick={() => document.getElementById("traffic-audience")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Đối tượng</button>
      <button type="button" onClick={() => document.getElementById("traffic-quality")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Chất lượng dữ liệu</button>
    </nav>

    {state === "loading" && !data && <div className="traffic-empty">Đang tải thống kê truy cập…</div>}
    {state === "error" && <div className="traffic-error" role="alert">{message}<button type="button" onClick={() => void load()}>Thử lại</button></div>}

    {data && <>
      <div className="traffic-live-line"><span className="traffic-live-dot" aria-hidden="true" /> Đang cập nhật tự động mỗi 10 giây <span>·</span> Lần cuối: {new Date(data.generatedAt).toLocaleTimeString("vi-VN")}</div>

      <section id="traffic-overview" className="traffic-section-block">
        <SectionHeading eyebrow="01 · TỔNG QUAN" title="Sức khỏe traffic" description={`Các KPI chính trong ${WINDOW_LABELS[windowKey]}, kèm so sánh với kỳ liền trước có cùng độ dài.`} />
        <div className="traffic-kpis pro">
          <article className="traffic-kpi live"><span>Đang online</span><strong>{compact(data.onlineUsers)}</strong><small>{compact(data.onlineNow)} phiên hoạt động trong 5 phút</small></article>
          <article className="traffic-kpi"><span>Người dùng</span><strong>{compact(data.uniqueUsersWindow)}</strong>{insights && <TrendBadge current={data.uniqueUsersWindow} previous={insights.previousPeriod.users} />}<small>visitor ID đã nhận diện</small></article>
          <article className="traffic-kpi"><span>Phiên</span><strong>{compact(data.sessionsWindow)}</strong>{insights && <TrendBadge current={data.sessionsWindow} previous={insights.previousPeriod.sessions} />}<small>30 phút không hoạt động = phiên mới</small></article>
          <article className="traffic-kpi"><span>Lượt xem</span><strong>{compact(data.pageviewsWindow)}</strong>{insights && <TrendBadge current={data.pageviewsWindow} previous={insights.previousPeriod.pageviews} />}<small>pageview đã khử trùng lặp 2 giây</small></article>
          <article className="traffic-kpi"><span>Trang / phiên</span><strong>{insights ? insights.behavior.pagesPerSession.toFixed(2) : "—"}</strong>{insights && <TrendBadge current={insights.behavior.pagesPerSession} previous={insights.previousPeriod.pagesPerSession} />}<small>tính trên phiên bắt đầu trong kỳ</small></article>
          <article className="traffic-kpi"><span>Thời lượng phiên TB</span><strong>{insights ? durationLabel(insights.behavior.avgSessionDurationSeconds) : "—"}</strong>{insights && <TrendBadge current={insights.behavior.avgSessionDurationSeconds} previous={insights.previousPeriod.avgSessionDurationSeconds} />}<small>xấp xỉ từ heartbeat 60 giây</small></article>
          <article className="traffic-kpi"><span>Tỷ lệ tương tác</span><strong>{insights ? `${insights.behavior.engagementRate.toFixed(1)}%` : "—"}</strong>{insights && <TrendBadge current={insights.behavior.engagementRate} previous={insights.previousPeriod.engagementRate} />}<small>≥10 giây hoặc ≥2 pageview</small></article>
          <article className="traffic-kpi"><span>Tỷ trọng Google</span><strong>{googleData ? percent(googleData.googleSessions, data.sessionsWindow) : "—"}</strong><small>{googleData ? `${compact(googleData.googleSessions)} phiên từ Google` : "đang tải"}</small></article>
        </div>

        <div className="traffic-today-strip">
          <div><span>Hôm nay · Người dùng</span><strong>{compact(data.uniqueUsersToday)}</strong></div>
          <div><span>Hôm nay · Phiên</span><strong>{compact(data.sessionsToday)}</strong></div>
          <div><span>Hôm nay · Lượt xem</span><strong>{compact(data.pageviewsToday)}</strong></div>
          <div><span>Phiên có visitor ID</span><strong>{compact(data.identifiedSessionsToday)}</strong></div>
        </div>

        {insightsMessage && <div className="traffic-error compact" role="alert">{insightsMessage}</div>}

        <div className="traffic-two-column equal">
          <section className="traffic-panel traffic-chart-panel">
            <div className="traffic-panel-title"><div><h3>Xu hướng truy cập</h3><p>Lượt xem, phiên và người dùng theo {windowKey === "24h" ? "giờ" : "ngày"}.</p></div></div>
            {data.series.length ? <div className="traffic-chart" role="img" aria-label="Biểu đồ lượt xem theo thời gian">
              {data.series.map((point) => <div className="traffic-bar-column" key={point.bucket} title={`${point.bucket}: ${point.views} lượt xem · ${point.visitors} phiên · ${point.users} người dùng · ${point.legacy_sessions} phiên legacy`}>
                <div className="traffic-bar-value">{point.views}</div><div className="traffic-bar-track"><span style={{ height: `${Math.max(5, point.views / chartMax * 100)}%` }} /></div><small>{bucketLabel(point.bucket, windowKey)}</small>
              </div>)}
            </div> : <div className="traffic-empty compact">Chưa có lượt xem trong khoảng thời gian này.</div>}
          </section>

          <section className="traffic-panel">
            <div className="traffic-panel-title"><div><h3>Phân bố thời lượng phiên</h3><p>Giúp phân biệt lượt thoát nhanh với phiên có tương tác thực.</p></div></div>
            {insights?.durationBuckets.length ? <div className="traffic-duration-list">{insights.durationBuckets.map((row) => <div key={row.bucket}><span>{row.bucket}</span><i><b style={{ width: `${Math.max(3, row.sessions / durationMax * 100)}%` }} /></i><strong>{compact(row.sessions)}</strong></div>)}</div> : <div className="traffic-empty compact">Chưa đủ dữ liệu thời lượng phiên.</div>}
            {insights && <div className="traffic-behavior-summary"><span><b>{compact(insights.behavior.engagedSessions)}</b> phiên tương tác</span><span><b>{insights.behavior.bounceRate.toFixed(1)}%</b> thoát nhanh ước tính</span></div>}
          </section>
        </div>
      </section>

      <section id="traffic-acquisition" className="traffic-section-block">
        <SectionHeading eyebrow="02 · THU HÚT" title="Người dùng đến từ đâu?" description="Kết hợp channel group, referrer, Google organic và campaign UTM để đọc đúng nguồn traffic." />

        <section className="traffic-panel traffic-google-panel">
          <div className="traffic-google-heading">
            <div><span className="traffic-google-badge">FIRST-PARTY · GOOGLE REFERRER</span><h3>Traffic từ Google (referrer)</h3><p>Chỉ tính phiên có HTTP referrer thuộc Google. Đây không phải số liệu GA4.</p></div><small>{WINDOW_LABELS[windowKey]}</small>
          </div>
          {googleMessage && <div className="traffic-error compact" role="alert">{googleMessage}</div>}
          {googleData && <>
            <div className="traffic-user-metrics traffic-google-metrics">
              <div><span>Người dùng từ Google</span><strong>{compact(googleData.googleUsers)}</strong><small>{compact(googleData.googleNewUsers)} mới · {compact(googleData.googleReturningUsers)} quay lại</small></div>
              <div><span>Phiên từ Google</span><strong>{compact(googleData.googleSessions)}</strong><small>{compact(googleData.googleLegacySessions)} phiên legacy</small></div>
              <div><span>Lượt xem từ Google</span><strong>{compact(googleData.googlePageviews)}</strong><small>{googleData.googleSessions ? (googleData.googlePageviews / googleData.googleSessions).toFixed(1) : "0"} lượt/phiên</small></div>
              <div><span>Tỷ trọng Google</span><strong>{percent(googleData.googleSessions, data.sessionsWindow)}</strong><small>{compact(googleData.googleSessions)}/{compact(data.sessionsWindow)} tổng phiên</small></div>
            </div>
            <div className="traffic-google-grid">
              <div className="traffic-google-subpanel"><h4>Xu hướng Google traffic</h4><p>Lượt xem theo {windowKey === "24h" ? "giờ" : "ngày"}.</p>
                {googleData.googleSeries.length ? <div className="traffic-chart traffic-google-chart" role="img" aria-label="Biểu đồ traffic từ Google">{googleData.googleSeries.map((point) => <div className="traffic-bar-column" key={point.bucket} title={`${point.bucket}: ${point.views} lượt xem · ${point.sessions} phiên · ${point.users} người dùng`}><div className="traffic-bar-value">{point.views}</div><div className="traffic-bar-track"><span style={{ height: `${Math.max(5, point.views / googleChartMax * 100)}%` }} /></div><small>{bucketLabel(point.bucket, windowKey)}</small></div>)}</div> : <div className="traffic-empty compact">Không ghi nhận phiên có referrer Google trong {WINDOW_LABELS[windowKey]}. Hãy thử 30/90 ngày để xem lịch sử.</div>}
              </div>
              <div className="traffic-google-subpanel"><h4>Landing page từ Google</h4><p>Trang đầu tiên của phiên có nguồn Google.</p>
                {googleData.googleLandingPages.length ? <div className="traffic-table-wrap"><table><thead><tr><th>Landing page</th><th>View</th><th>User</th><th>Phiên</th></tr></thead><tbody>{googleData.googleLandingPages.map((page) => <tr key={page.path}><td title={page.path}><strong>{pathLabel(page.path)}</strong><small>{page.path}</small></td><td>{compact(page.views)}</td><td>{compact(page.users)}</td><td>{compact(page.sessions)}</td></tr>)}</tbody></table></div> : <div className="traffic-empty compact">Chưa có landing page từ Google.</div>}
              </div>
            </div>
            <p className="traffic-google-note"><strong>Lưu ý nguồn dữ liệu:</strong> Khối này dùng collector first-party và HTTP referrer, không đọc Google Analytics Data API. GA4 vẫn chạy song song trên website để đối chiếu bên ngoài. Từ khóa, impression, CTR và vị trí tìm kiếm phải đọc từ Google Search Console.</p>
          </>}
        </section>

        <div className="traffic-two-column equal">
          <section className="traffic-panel"><div className="traffic-panel-title"><div><h3>Channel group</h3><p>Phân nhóm Direct, Organic Search, Social, Referral, Email và Campaign.</p></div></div>
            {insights?.channels.length ? <div className="traffic-sources channels">{insights.channels.map((row) => <div key={row.name}><span className="traffic-source-name">{row.name}</span><span className="traffic-source-track"><i style={{ width: `${Math.max(3, row.sessions / channelMax * 100)}%` }} /></span><strong>{compact(row.sessions)}</strong><small>{compact(row.users)} user · {compact(row.views)} view</small></div>)}</div> : <div className="traffic-empty compact">Chưa có dữ liệu channel.</div>}
          </section>
          <section className="traffic-panel"><div className="traffic-panel-title"><div><h3>Nguồn / Referrer</h3><p>Hostname thực tế dẫn người dùng tới website.</p></div></div>
            {data.sources.length ? <div className="traffic-sources">{data.sources.map((source) => <div key={source.source}><span className="traffic-source-name">{source.source}</span><span className="traffic-source-track"><i style={{ width: `${Math.max(3, source.sessions / sourceMax * 100)}%` }} /></span><strong>{compact(source.sessions)}</strong><small>{compact(source.users)} user{source.legacy_sessions ? ` · ${compact(source.legacy_sessions)} legacy` : ""}</small></div>)}</div> : <div className="traffic-empty compact">Chưa có dữ liệu nguồn truy cập.</div>}
          </section>
        </div>

        <section className="traffic-panel"><div className="traffic-panel-title"><div><h3>Campaign UTM</h3><p>Chỉ lưu allowlist utm_source / utm_medium / utm_campaign; không lưu toàn bộ query string.</p></div></div>
          {insights?.campaigns.length ? <div className="traffic-table-wrap"><table><thead><tr><th>Campaign</th><th>Source / Medium</th><th>User</th><th>Phiên</th><th>View</th></tr></thead><tbody>{insights.campaigns.map((row, index) => <tr key={`${row.campaign}-${row.source}-${row.medium}-${index}`}><td><strong>{row.campaign}</strong></td><td>{row.source} / {row.medium}</td><td>{compact(row.users)}</td><td>{compact(row.sessions)}</td><td>{compact(row.views)}</td></tr>)}</tbody></table></div> : <div className="traffic-empty compact">Chưa ghi nhận campaign có UTM trong kỳ. Các link mới có UTM sẽ tự động xuất hiện tại đây.</div>}
        </section>
      </section>

      <section id="traffic-content" className="traffic-section-block">
        <SectionHeading eyebrow="03 · NỘI DUNG" title="Người dùng xem gì?" description="Top content, landing page, exit page và các trang đang được xem giúp đánh giá hiệu quả nội dung end-to-end." />
        <div className="traffic-two-column">
          <section className="traffic-panel"><div className="traffic-panel-title"><div><h3>Trang được xem nhiều</h3><p>Top URL theo lượt xem trong {WINDOW_LABELS[windowKey]}.</p></div></div>
            {data.topPages.length ? <div className="traffic-table-wrap"><table><thead><tr><th>Trang</th><th>Lượt xem</th><th>User</th><th>Phiên</th></tr></thead><tbody>{data.topPages.map((page) => <tr key={page.path}><td title={page.path}><strong>{pathLabel(page.path)}</strong><small>{page.path}</small></td><td>{compact(page.views)}</td><td>{compact(page.users)}</td><td>{compact(page.visitors)}</td></tr>)}</tbody></table></div> : <div className="traffic-empty compact">Chưa có dữ liệu trang.</div>}
          </section>
          <section className="traffic-panel"><div className="traffic-panel-title"><div><h3>Đang được xem</h3><p>Hoạt động trong 5 phút gần nhất.</p></div></div>
            {data.livePages.length ? <div className="traffic-live-pages">{data.livePages.map((page) => <div key={page.path}><span className="traffic-live-dot" /><span><strong>{pathLabel(page.path)}</strong><small>{page.path}</small></span><b>{page.active_users}<small>{page.active_visitors} phiên{page.legacy_sessions ? ` · ${page.legacy_sessions} legacy` : ""}</small></b></div>)}</div> : <div className="traffic-empty compact">Hiện chưa ghi nhận phiên đang hoạt động.</div>}
          </section>
        </div>

        <div className="traffic-two-column equal">
          <section className="traffic-panel"><div className="traffic-panel-title"><div><h3>Landing page</h3><p>Trang bắt đầu phiên và chất lượng tương tác của phiên đó.</p></div></div>
            {insights?.landingPages.length ? <div className="traffic-table-wrap"><table><thead><tr><th>Landing page</th><th>Phiên</th><th>Tương tác</th><th>TB</th></tr></thead><tbody>{insights.landingPages.map((row) => <tr key={row.path}><td title={row.path}><strong>{pathLabel(row.path)}</strong><small>{row.path}</small></td><td>{compact(row.sessions)}</td><td>{percent(row.engaged_sessions, row.sessions)}</td><td>{durationLabel(row.avg_duration_seconds)}</td></tr>)}</tbody></table></div> : <div className="traffic-empty compact">Chưa có dữ liệu landing page.</div>}
          </section>
          <section className="traffic-panel"><div className="traffic-panel-title"><div><h3>Exit page</h3><p>Trang cuối cùng được ghi nhận trong phiên.</p></div></div>
            {insights?.exitPages.length ? <div className="traffic-table-wrap"><table><thead><tr><th>Exit page</th><th>User</th><th>Phiên</th></tr></thead><tbody>{insights.exitPages.map((row) => <tr key={row.path}><td title={row.path}><strong>{pathLabel(row.path)}</strong><small>{row.path}</small></td><td>{compact(row.users)}</td><td>{compact(row.sessions)}</td></tr>)}</tbody></table></div> : <div className="traffic-empty compact">Chưa có dữ liệu exit page.</div>}
          </section>
        </div>
      </section>

      <section id="traffic-audience" className="traffic-section-block">
        <SectionHeading eyebrow="04 · ĐỐI TƯỢNG" title="Ai đang truy cập?" description="Người dùng mới/quay lại, quốc gia ước tính, trình duyệt, hệ điều hành và loại thiết bị." />
        <section className="traffic-panel traffic-user-panel">
          <div className="traffic-panel-title"><div><h3>Người dùng đã nhận diện</h3><p>Visitor UUID first-party tự xoay vòng sau 90 ngày; không phải tài khoản đăng nhập.</p></div></div>
          <div className="traffic-user-metrics">
            <div><span>Tổng người dùng</span><strong>{compact(data.uniqueUsersWindow)}</strong><small>{WINDOW_LABELS[windowKey]}</small></div>
            <div><span>Người dùng mới</span><strong>{compact(data.newUsersWindow)}</strong><small>{percent(data.newUsersWindow, data.uniqueUsersWindow)} user đã nhận diện</small></div>
            <div><span>Quay lại</span><strong>{compact(data.returningUsersWindow)}</strong><small>{percent(data.returningUsersWindow, data.uniqueUsersWindow)} user đã nhận diện</small></div>
            <div><span>Phiên / người dùng</span><strong>{data.uniqueUsersWindow ? (data.identifiedSessionsWindow / data.uniqueUsersWindow).toFixed(2) : "0"}</strong><small>chỉ tính phiên có visitor ID</small></div>
          </div>
        </section>

        <AdminCountryAnalytics windowKey={windowKey} />

        <div className="traffic-dimension-grid">
          <DimensionPanel title="Trình duyệt" description="Không lưu raw user-agent; chỉ lưu nhãn trình duyệt." rows={data.browsers} />
          <DimensionPanel title="Hệ điều hành" description="Windows, macOS, iOS, Android, Linux…" rows={data.operatingSystems} />
          <DimensionPanel title="Thiết bị" description="Desktop, Mobile hoặc Tablet." rows={data.devices} />
        </div>

        {googleData && <div className="traffic-dimension-grid traffic-google-dimensions">
          <DimensionPanel title="Google · Trình duyệt" description="Người dùng đã nhận diện đến từ Google." rows={googleData.googleBrowsers} />
          <DimensionPanel title="Google · Hệ điều hành" description="Hệ điều hành của nhóm traffic Google." rows={googleData.googleOperatingSystems} />
          <DimensionPanel title="Google · Thiết bị" description="Thiết bị của nhóm traffic Google." rows={googleData.googleDevices} />
        </div>}
      </section>

      <section id="traffic-quality" className="traffic-section-block">
        <SectionHeading eyebrow="05 · CHẤT LƯỢNG DỮ LIỆU" title="Mức độ tin cậy & cách hiểu số liệu" description="Tách dữ liệu legacy khỏi visitor đã nhận diện để tránh overcount và công khai rõ các chỉ số mang tính ước tính." />
        <section className="traffic-panel traffic-user-panel">
          <div className="traffic-user-metrics">
            <div><span>Độ phủ pageview</span><strong>{percent(data.identifiedPageviewsWindow, data.pageviewsWindow)}</strong><small>{compact(data.identifiedPageviewsWindow)}/{compact(data.pageviewsWindow)} lượt xem</small></div>
            <div><span>Phiên đã nhận diện</span><strong>{compact(data.identifiedSessionsWindow)}</strong><small>{percent(data.identifiedSessionsWindow, data.sessionsWindow)} tổng phiên</small></div>
            <div><span>Phiên legacy</span><strong>{compact(data.legacySessionsWindow)}</strong><small>không quy đổi thành người dùng</small></div>
            <div><span>Legacy pageview</span><strong>{compact(data.legacyPageviewsWindow)}</strong><small>dữ liệu trước collector visitor ID</small></div>
          </div>
          <p className="traffic-data-note">Dữ liệu legacy được giữ để bảo toàn lịch sử nhưng không được dùng để suy đoán số người dùng. Khi legacy ra khỏi cửa sổ thời gian, độ phủ visitor ID sẽ tiến dần về 100%.</p>
        </section>

        <div className="traffic-method-grid">
          <article><strong>Người dùng</strong><span>Visitor UUID first-party, tối đa 90 ngày. Không phải tài khoản đăng nhập.</span></article>
          <article><strong>Phiên</strong><span>Dùng chung giữa các tab; phiên mới sau 30 phút không hoạt động.</span></article>
          <article><strong>Phiên tương tác</strong><span>Ước tính: thời lượng ≥10 giây hoặc có ≥2 pageview.</span></article>
          <article><strong>Quốc gia</strong><span>Ước tính từ timezone + locale; không dùng IP/GPS.</span></article>
          <article><strong>UTM</strong><span>Chỉ lưu source/medium/campaign; không lưu toàn bộ query string.</span></article>
          <article><strong>Riêng tư</strong><span>Không lưu IP, raw user-agent, email, account ID, cookie nội dung hay dữ liệu biểu mẫu.</span></article>
        </div>

        <div className="traffic-privacy-note"><strong>Nguồn dữ liệu</strong><span>First-party Supabase Analytics là nguồn chính của dashboard này. Khối “Google” chỉ lọc phiên có Google referrer; dashboard hiện chưa kết nối GA4 Data API. GA4 chạy song song để đối chiếu bên ngoài; Google Search Console dùng cho query, impression, CTR và ranking.</span></div>
      </section>
    </>}
  </div>;
}
