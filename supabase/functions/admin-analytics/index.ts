import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

type WindowKey = "24h" | "7d" | "30d" | "90d";

const ALLOWED_ORIGINS = new Set([
  "https://canhgiacso.com",
  "https://www.canhgiacso.com",
]);

function cors(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://canhgiacso.com";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(origin: string | null, status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json; charset=utf-8" },
  });
}

function decodeJwtClaims(authHeader: string) {
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function normalizeWindow(value: unknown): WindowKey {
  return value === "7d" || value === "30d" || value === "90d" ? value : "24h";
}

function publishableKey() {
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}") as Record<string, string>;
    if (keys.default) return keys.default;
  } catch {
    // Fall back to the legacy anon key while the project retains compatibility keys.
  }
  return Deno.env.get("SUPABASE_ANON_KEY") ?? "";
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return json(origin, 405, { error: "method_not_allowed" });
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json(origin, 403, { error: "origin_not_allowed" });

  const startedAt = performance.now();
  const requestId = crypto.randomUUID();
  const authHeader = req.headers.get("authorization") ?? "";
  const claims = decodeJwtClaims(authHeader);
  if (!claims || claims.aal !== "aal2") {
    console.warn(JSON.stringify({ event: "admin_analytics_denied", requestId, reason: "aal2_required" }));
    return json(origin, 403, { error: "aal2_required" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const key = publishableKey();
  if (!supabaseUrl || !key) {
    console.error(JSON.stringify({ event: "admin_analytics_error", requestId, reason: "missing_runtime_config" }));
    return json(origin, 500, { error: "runtime_configuration_error" });
  }

  const userClient = createClient(supabaseUrl, key, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // Empty/invalid JSON uses the default 24h window.
  }
  const windowKey = normalizeWindow(body.window);

  const roleResult = await userClient.rpc("get_content_management_role");
  if (roleResult.error || roleResult.data !== "admin") {
    console.warn(JSON.stringify({
      event: "admin_analytics_denied",
      requestId,
      reason: roleResult.error?.code ?? "admin_required",
    }));
    return json(origin, 403, { error: "admin_required" });
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!serviceRoleKey) {
    console.error(JSON.stringify({ event: "admin_analytics_error", requestId, reason: "missing_service_role" }));
    return json(origin, 500, { error: "runtime_configuration_error" });
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const [dashboard, google, insights, country] = await Promise.all([
    serviceClient.rpc("get_web_analytics_dashboard", { p_window: windowKey }),
    serviceClient.rpc("get_google_traffic_dashboard", { p_window: windowKey }),
    serviceClient.rpc("get_web_analytics_insights", { p_window: windowKey }),
    serviceClient.rpc("get_country_traffic_dashboard", { p_window: windowKey }),
  ]);

  const failures = [
    ["dashboard", dashboard.error],
    ["google", google.error],
    ["insights", insights.error],
    ["country", country.error],
  ].filter(([, error]) => Boolean(error));

  if (failures.length) {
    console.error(JSON.stringify({
      event: "admin_analytics_error",
      requestId,
      failures: failures.map(([name, error]) => ({ name, code: (error as { code?: string })?.code ?? "unknown" })),
      durationMs: Math.round(performance.now() - startedAt),
    }));
    return json(origin, 502, { error: "analytics_backend_error", requestId });
  }

  console.log(JSON.stringify({
    event: "admin_analytics_success",
    requestId,
    window: windowKey,
    durationMs: Math.round(performance.now() - startedAt),
    region: Deno.env.get("SB_REGION") ?? "unknown",
  }));

  return json(origin, 200, {
    apiVersion: "2026-09-23",
    generatedAt: new Date().toISOString(),
    window: windowKey,
    dashboard: dashboard.data,
    google: google.data,
    insights: insights.data,
    country: country.data,
  });
});
