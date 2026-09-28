"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

type WindowKey = "24h" | "7d" | "30d" | "90d";
type CountryRow = { code: string; users: number; sessions: number; views: number; legacy_sessions: number };
type CountryDashboard = {
  generatedAt: string;
  window: WindowKey;
  totalSessions: number;
  knownCountrySessions: number;
  knownCountryUsers: number;
  countries: CountryRow[];
  googleCountries: CountryRow[];
};

const WINDOW_LABELS: Record<WindowKey, string> = {
  "24h": "24 giờ",
  "7d": "7 ngày",
  "30d": "30 ngày",
  "90d": "90 ngày",
};

function number(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function compact(value: number) {
  return new Intl.NumberFormat("vi-VN", { notation: value >= 10_000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);
}

function percent(part: number, total: number) {
  return total > 0 ? `${Math.round(part / total * 100)}%` : "0%";
}

function parseRows(value: unknown): CountryRow[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      code: String(row.code ?? "ZZ").toUpperCase(),
      users: number(row.users),
      sessions: number(row.sessions),
      views: number(row.views),
      legacy_sessions: number(row.legacy_sessions),
    };
  });
}

function parseDashboard(value: unknown): CountryDashboard | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const window = item.window === "7d" || item.window === "30d" || item.window === "90d" ? item.window : "24h";
  return {
    generatedAt: typeof item.generatedAt === "string" ? item.generatedAt : new Date().toISOString(),
    window,
    totalSessions: number(item.totalSessions),
    knownCountrySessions: number(item.knownCountrySessions),
    knownCountryUsers: number(item.knownCountryUsers),
    countries: parseRows(item.countries),
    googleCountries: parseRows(item.googleCountries),
  };
}

function countryFlag(code: string) {
  if (!/^[A-Z]{2}$/.test(code) || code === "ZZ") return "🌐";
  return String.fromCodePoint(...[...code].map((char) => 127397 + char.charCodeAt(0)));
}

function countryName(code: string) {
  if (code === "ZZ") return "Không xác định";
  try {
    const names = new Intl.DisplayNames(["vi"], { type: "region" });
    return names.of(code) ?? code;
  } catch {
    return code;
  }
}

function CountryTable({ rows, empty }: { rows: CountryRow[]; empty: string }) {
  if (!rows.length) return <div className="traffic-empty compact">{empty}</div>;
  return <div className="traffic-table-wrap"><table>
    <thead><tr><th>Quốc gia</th><th>Người dùng</th><th>Phiên</th><th>Lượt xem</th></tr></thead>
    <tbody>{rows.map((row) => <tr key={row.code}>
      <td><strong>{countryFlag(row.code)} {countryName(row.code)}</strong><small>{row.code === "ZZ" ? "Dữ liệu cũ/chưa xác định" : row.code}</small></td>
      <td>{compact(row.users)}</td>
      <td>{compact(row.sessions)}</td>
      <td>{compact(row.views)}</td>
    </tr>)}</tbody>
  </table></div>;
}

export function AdminCountryAnalytics({ windowKey }: { windowKey: WindowKey }) {
  const [data, setData] = useState<CountryDashboard | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const result = await supabase.rpc("get_country_traffic_dashboard", { p_window: windowKey });
    if (result.error) {
      setMessage(result.error.code === "42501" ? "Chỉ Quản trị viên được xem dữ liệu quốc gia." : "Không thể tải thống kê quốc gia.");
      return;
    }
    const parsed = parseDashboard(result.data);
    if (!parsed) {
      setMessage("Dữ liệu quốc gia trả về chưa đúng định dạng.");
      return;
    }
    setData(parsed);
    setMessage("");
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

  const knownCountries = useMemo(() => data?.countries.filter((row) => row.code !== "ZZ" && row.sessions > 0).length ?? 0, [data]);
  const knownGoogleCountries = useMemo(() => data?.googleCountries.filter((row) => row.code !== "ZZ" && row.sessions > 0).length ?? 0, [data]);

  return <section className="traffic-panel traffic-user-panel">
    <div className="traffic-panel-title"><div>
      <h3>Quốc gia người dùng (ước tính)</h3>
      <p>Ước tính cục bộ từ timezone và locale của trình duyệt; không dùng IP geolocation và không gửi IP cho bên thứ ba.</p>
    </div></div>

    {message && <div className="traffic-error compact" role="alert">{message}</div>}

    {data && <>
      <div className="traffic-user-metrics">
        <div><span>Người dùng có quốc gia</span><strong>{compact(data.knownCountryUsers)}</strong><small>{WINDOW_LABELS[windowKey]}</small></div>
        <div><span>Phiên có quốc gia</span><strong>{compact(data.knownCountrySessions)}</strong><small>{compact(data.totalSessions)} tổng phiên</small></div>
        <div><span>Độ phủ quốc gia</span><strong>{percent(data.knownCountrySessions, data.totalSessions)}</strong><small>tính theo phiên</small></div>
        <div><span>Số quốc gia ghi nhận</span><strong>{compact(knownCountries)}</strong><small>{knownGoogleCountries} quốc gia từ Google</small></div>
      </div>

      <div className="traffic-two-column" style={{ marginTop: 18 }}>
        <div>
          <div className="traffic-panel-title"><div><h3>Tất cả quốc gia</h3><p>Người dùng, phiên và lượt xem theo quốc gia ước tính.</p></div></div>
          <CountryTable rows={data.countries} empty="Chưa có dữ liệu quốc gia trong khoảng thời gian này." />
        </div>
        <div>
          <div className="traffic-panel-title"><div><h3>Quốc gia · Traffic từ Google</h3><p>Chỉ các phiên có referrer được nhận diện là Google.</p></div></div>
          <CountryTable rows={data.googleCountries} empty="Chưa có traffic Google có thông tin quốc gia." />
        </div>
      </div>

      <p className="traffic-data-note">“Quốc gia” là ước tính kỹ thuật, không phải vị trí GPS. VPN, timezone thủ công hoặc ngôn ngữ hệ điều hành có thể làm sai lệch kết quả. Dữ liệu trước collector v3 được giữ là “Không xác định” và không backfill suy đoán.</p>
    </>}
  </section>;
}
