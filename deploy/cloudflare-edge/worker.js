// Cloudflare Worker đặt header bảo mật cho canhgiacso.com.
//
// GitHub Pages không cho đặt header HTTP, nên mọi bảo vệ chỉ nằm ở thẻ <meta> (CSP trong meta không hỗ trợ
// frame-ancestors, không có HSTS/nosniff/X-Frame-Options...). Worker này đứng trước GitHub Pages và bổ sung chúng.
//
// Chế độ chạy:
//  - Route (khuyến nghị): bản ghi DNS của canhgiacso.com đã bật proxy (đám mây cam) trỏ tới GitHub Pages, Worker gắn vào
//    route canhgiacso.com/* và www.canhgiacso.com/*. Để ORIGIN rỗng: Worker gọi fetch(request) và Cloudflare chuyển
//    yêu cầu tới origin trong DNS với nguyên Host.
//  - Proxy: đặt biến ORIGIN (ví dụ https://<tài-khoản>.github.io) khi Worker chạy ở hostname khác. Lưu ý GitHub Pages
//    chuyển hướng host *.github.io về tên miền tùy chỉnh nếu repo đã gắn CNAME; xem README.

// CSP đồng bộ với thẻ <meta> do scripts/instrument-content.mjs sinh ra (test tests/edge-headers.test.mjs kiểm tra).
const SUPABASE = "goietwyapiywrtibpkwo.supabase.co";

export const CSP_DIRECTIVES = {
  "default-src": ["'self'"],
  "script-src": ["'self'", "https://www.googletagmanager.com"],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "data:", "blob:", "https://www.google-analytics.com", "https://www.googletagmanager.com"],
  "font-src": ["'self'", "data:"],
  "connect-src": [
    "'self'",
    `https://${SUPABASE}`,
    `wss://${SUPABASE}`,
    "https://www.google-analytics.com",
    "https://analytics.google.com",
    "https://region1.google-analytics.com",
    "https://www.googletagmanager.com",
    "https://www.google.com",
  ],
  // 'self' cho iframe hoạt hình trong /gioi-thieu/, phishingquiz cho bài quiz của Google trong ứng dụng.
  "frame-src": ["'self'", "https://phishingquiz.withgoogle.com"],
  "media-src": ["'none'"],
  "worker-src": ["'none'"],
  "object-src": ["'none'"],
  "manifest-src": ["'self'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "frame-ancestors": ["'none'"],
  "upgrade-insecure-requests": [],
};

// Trang hoạt hình nhúng iframe tự chứa script/style inline và ảnh data:. Nó chỉ được nhúng bởi chính site.
// Nên chuyển script/style ra tệp riêng để bỏ ngoại lệ này (xem README).
export const ANIMATION_PATH = "/gioi-thieu/hoat-hinh.html";
export const ANIMATION_CSP_DIRECTIVES = {
  "default-src": ["'none'"],
  "script-src": ["'unsafe-inline'"],
  "style-src": ["'unsafe-inline'"],
  "img-src": ["'self'", "data:"],
  "font-src": ["'self'", "data:"],
  "base-uri": ["'none'"],
  "form-action": ["'none'"],
  "frame-ancestors": ["'self'"],
};

export const serializeCsp = (directives) => Object.entries(directives)
  .map(([name, values]) => [name, ...values].join(" "))
  .join("; ");

export const SECURITY_HEADERS = Object.freeze({
  "Content-Security-Policy": serializeCsp(CSP_DIRECTIVES),
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Cross-Origin-Opener-Policy": "same-origin",
});

export function securityHeadersFor(pathname) {
  if (pathname === ANIMATION_PATH) {
    return {
      ...SECURITY_HEADERS,
      "Content-Security-Policy": serializeCsp(ANIMATION_CSP_DIRECTIVES),
      "X-Frame-Options": "SAMEORIGIN",
    };
  }
  return SECURITY_HEADERS;
}

// Giữ nguyên status, body, ETag, Cache-Control, Content-Type...; chỉ ghi đè/thêm header bảo mật.
export function applySecurityHeaders(response, pathname) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(securityHeadersFor(pathname))) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function originUrlFor(url, origin) {
  if (!origin) return null;
  let base;
  try {
    base = new URL(origin);
  } catch {
    return null;
  }
  if (base.hostname === url.hostname) return null; // tránh vòng lặp khi ORIGIN trùng host đang phục vụ.
  return new URL(`${url.pathname}${url.search}`, base);
}

export async function handleRequest(request, env = {}, fetchImpl = fetch) {
  const url = new URL(request.url);

  if (url.protocol === "http:") {
    url.protocol = "https:";
    return new Response(null, { status: 301, headers: { Location: url.toString(), ...SECURITY_HEADERS } });
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD", "Content-Type": "text/plain; charset=utf-8", ...SECURITY_HEADERS },
    });
  }

  // upload-pages-artifact loại thư mục ẩn nên /.well-known/ không được triển khai; tệp thật nằm ở /security.txt.
  if (url.pathname === "/.well-known/security.txt") {
    return new Response(null, {
      status: 301,
      headers: { Location: new URL("/security.txt", url).toString(), ...SECURITY_HEADERS },
    });
  }

  const target = originUrlFor(url, env.ORIGIN);
  const upstream = target
    ? await fetchImpl(new Request(target, { method: request.method, headers: request.headers, redirect: "manual" }))
    : await fetchImpl(request);
  return applySecurityHeaders(upstream, url.pathname);
}

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  },
};
