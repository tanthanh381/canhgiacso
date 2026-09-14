"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import "./admin-traffic-analytics.css";

type WindowKey = "24h" | "7d" | "30d" | "90d";
type SeriesPoint = { bucket: string; views: number; visitors: number };
type TopPage = { path: string; views: number; visitors: number };
type TrafficSource = { source: string; visitors: number };
type LivePage = { path: string; active_visitors: number };
type AnalyticsDashboard = {
  generatedAt: string;
  window: WindowKey;
  onlineNow: number;
  pageviewsToday: number;
  uniqueVisitorsToday: number;
  pageviewsWindow: number;
  uniqueVisitorsWindow: number;
  series: SeriesPoint[];
  topPages: TopPage[];
  sources: TrafficSource[];
  livePages: LivePage[];
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

function parseDashboard(value: unknown): AnalyticsDashboard | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const window = item.window === "7d" || item.window === "30d" || item.window === "90d" ? item.window : "24h";
  const rows = (key: string) => Array.isArray(item[key]) ? item[key] as Array<Record<string, unknown>> : [];
  return {
    generatedAt: typeof item.generatedAt === "string" ? item.generatedAt : new Date().toISOString(),
    window,
    onlineNow: number(item.onlineNow),
    pageviewsToday: number(item.pageviewsToday),
    uniqueVisitorsToday: number(item.uniqueVisitorsToday),
    pageviewsWindow: number(item.pageviewsWindow),
    uniqueVisitorsWindow: number(item.uniqueVisitorsWindow),
    series: rows("series").map((row) => ({ bucket: String(row.bucket ?? ""), views: number(row.views), visitors: number(row.visitors) })),
    topPages: rows("topPages").map((row) => ({ path: String(row.path ?? "/"), views: number(row.views), visitors: number(row.visitors) })),
    sources: rows("sources").map((row) => ({ source: String(row.source ?? "Trực tiếp / không xác định"), visitors: number(row.visitors) })),
    livePages: rows("livePages").map((row) => ({ path: String(row.path ?? "/"), active_visitors: number(row.active_visitors) })),
  };
}

function compact(value: number) {
  return new Intl.NumberFormat("vi-VN", { notation: value >= 10_000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);
}

function bucketLabel(bucket: string, window: WindowKey) {
  if (window === "24h") {
    const hour = bucket.split(" ")[1];
    return hour ?? bucket;
  }
  const parts = bucket.split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : bucket;
}

function pathLabel(path: string) {
  if (path === "/") return "Trang chủ";
  return decodeURIComponent(path).replace(/^\//, "").replace(/\/$/, "") || "Trang chủ";
}

export function AdminTrafficAnalytics() {
  const [windowKey, setWindowKey] = useState<WindowKey>("24h");
  const [data, setData] = useState<AnalyticsDashboard | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const result = await supabase.rpc("get_web_analytics_dashboard", { p_window: windowKey });
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
  }, [windowKey]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 10_000);
    const onVisibility = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);

  const chartMax = useMemo(() => Math.max(1, ...(data?.series.map((point) => point.views) ?? [1])), [data]);
  const sourceMax = useMemo(() => Math.max(1, ...(data?.sources.map((source) => source.visitors) ?? [1])), [data]);

  return <div className="traffic-admin">
    <div className="traffic-admin-head">
      <div>
        <span className="eyebrow">THỐNG KÊ TRUY CẬP · GẦN THỜI GIAN THỰC</span>
        <h2>Lượt truy cập website</h2>
        <p>Tự động cập nhật mỗi 10 giây. “Đang online” là phiên có hoạt động trong 5 phút gần nhất.</p>
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
        <article className="traffic-kpi live"><span>Đang online</span><strong>{compact(data.onlineNow)}</strong><small>hoạt động ≤ 5 phút</small></article>
        <article className="traffic-kpi"><span>Lượt xem hôm nay</span><strong>{compact(data.pageviewsToday)}</strong><small>pageviews</small></article>
        <article className="traffic-kpi"><span>Phiên hôm nay</span><strong>{compact(data.uniqueVisitorsToday)}</strong><small>session duy nhất</small></article>
        <article className="traffic-kpi"><span>Lượt xem · {WINDOW_LABELS[windowKey]}</span><strong>{compact(data.pageviewsWindow)}</strong><small>{compact(data.uniqueVisitorsWindow)} phiên</small></article>
      </div>

      <section className="traffic-panel traffic-chart-panel">
        <div className="traffic-panel-title"><div><h3>Xu hướng truy cập</h3><p>Lượt xem và phiên theo {windowKey === "24h" ? "giờ" : "ngày"}.</p></div></div>
        {data.series.length ? <div className="traffic-chart" role="img" aria-label="Biểu đồ lượt xem theo thời gian">
          {data.series.map((point) => <div className="traffic-bar-column" key={point.bucket} title={`${point.bucket}: ${point.views} lượt xem · ${point.visitors} phiên`}>
            <div className="traffic-bar-value">{point.views}</div>
            <div className="traffic-bar-track"><span style={{ height: `${Math.max(5, point.views / chartMax * 100)}%` }} /></div>
            <small>{bucketLabel(point.bucket, windowKey)}</small>
          </div>)}
        </div> : <div className="traffic-empty compact">Chưa có lượt xem trong khoảng thời gian này.</div>}
      </section>

      <div className="traffic-two-column">
        <section className="traffic-panel">
          <div className="traffic-panel-title"><div><h3>Trang được xem nhiều</h3><p>Top URL trong {WINDOW_LABELS[windowKey]}.</p></div></div>
          {data.topPages.length ? <div className="traffic-table-wrap"><table><thead><tr><th>Trang</th><th>Lượt xem</th><th>Phiên</th></tr></thead><tbody>{data.topPages.map((page) => <tr key={page.path}><td title={page.path}><strong>{pathLabel(page.path)}</strong><small>{page.path}</small></td><td>{compact(page.views)}</td><td>{compact(page.visitors)}</td></tr>)}</tbody></table></div> : <div className="traffic-empty compact">Chưa có dữ liệu trang.</div>}
        </section>

        <section className="traffic-panel">
          <div className="traffic-panel-title"><div><h3>Đang được xem</h3><p>Phiên hoạt động trong 5 phút gần nhất.</p></div></div>
          {data.livePages.length ? <div className="traffic-live-pages">{data.livePages.map((page) => <div key={page.path}><span className="traffic-live-dot" /><span><strong>{pathLabel(page.path)}</strong><small>{page.path}</small></span><b>{page.active_visitors}</b></div>)}</div> : <div className="traffic-empty compact">Hiện chưa ghi nhận phiên đang hoạt động.</div>}
        </section>
      </div>

      <section className="traffic-panel">
        <div className="traffic-panel-title"><div><h3>Nguồn truy cập</h3><p>Chỉ lưu hostname nguồn giới thiệu; không lưu URL đầy đủ hay query string.</p></div></div>
        {data.sources.length ? <div className="traffic-sources">{data.sources.map((source) => <div key={source.source}><span className="traffic-source-name">{source.source}</span><span className="traffic-source-track"><i style={{ width: `${Math.max(3, source.visitors / sourceMax * 100)}%` }} /></span><strong>{compact(source.visitors)}</strong></div>)}</div> : <div className="traffic-empty compact">Chưa có dữ liệu nguồn truy cập.</div>}
      </section>

      <div className="traffic-privacy-note"><strong>Riêng tư theo thiết kế</strong><span>Không lưu IP, user-agent, email, tài khoản, query string hay dữ liệu biểu mẫu. Số “Phiên” là session trình duyệt, không phải định danh một con người.</span></div>
    </>}
  </div>;
}
