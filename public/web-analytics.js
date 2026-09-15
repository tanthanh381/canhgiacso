(() => {
  'use strict';

  const PROJECT_URL = 'https://goietwyapiywrtibpkwo.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_ghj-H14bq2n1tSsH4u-adA_LoBtWKO4';
  const RPC_URL = `${PROJECT_URL}/rest/v1/rpc/record_web_analytics_event_v2`;
  const SESSION_KEY = 'canhgiacso-analytics-session-v2';
  const VISITOR_KEY = 'canhgiacso-analytics-visitor-v1';
  const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
  const VISITOR_TTL_MS = 90 * 24 * 60 * 60 * 1000;
  const HEARTBEAT_MS = 60_000;
  const ALLOWED_HOSTS = new Set(['canhgiacso.com', 'www.canhgiacso.com']);

  if (!ALLOWED_HOSTS.has(window.location.hostname)) return;
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;

  function validUuid(value) {
    return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  function writeSharedSession(id, lastActivity) {
    try {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify({ id, lastActivity }));
    } catch {
      // Storage can be blocked. In that case the in-memory fallback below is used.
    }
  }

  let fallbackSession = { id: crypto.randomUUID(), lastActivity: Date.now() };

  function activeSession() {
    const now = Date.now();
    try {
      const raw = window.localStorage.getItem(SESSION_KEY);
      if (raw) {
        const stored = JSON.parse(raw);
        if (validUuid(stored?.id) && Number.isFinite(stored?.lastActivity) && now - stored.lastActivity < SESSION_TIMEOUT_MS) {
          writeSharedSession(stored.id, now);
          fallbackSession = { id: stored.id, lastActivity: now };
          return { id: stored.id, isNew: false };
        }
      }
      const id = crypto.randomUUID();
      writeSharedSession(id, now);
      fallbackSession = { id, lastActivity: now };
      return { id, isNew: true };
    } catch {
      if (now - fallbackSession.lastActivity >= SESSION_TIMEOUT_MS) {
        fallbackSession = { id: crypto.randomUUID(), lastActivity: now };
        return { id: fallbackSession.id, isNew: true };
      }
      fallbackSession.lastActivity = now;
      return { id: fallbackSession.id, isNew: false };
    }
  }

  function visitorId() {
    const now = Date.now();
    try {
      const raw = window.localStorage.getItem(VISITOR_KEY);
      if (raw) {
        const stored = JSON.parse(raw);
        if (validUuid(stored?.id) && Number.isFinite(stored?.createdAt) && now - stored.createdAt < VISITOR_TTL_MS) {
          return stored.id;
        }
      }
      const id = crypto.randomUUID();
      window.localStorage.setItem(VISITOR_KEY, JSON.stringify({ id, createdAt: now }));
      return id;
    } catch {
      return crypto.randomUUID();
    }
  }

  function clientDimensions() {
    const nav = navigator;
    const hints = nav['userAgentData'];
    const brands = Array.isArray(hints?.brands) ? hints.brands.map((item) => String(item?.brand || '')) : [];
    const platform = String(hints?.platform || nav.platform || '');
    const hasBrand = (text) => brands.some((brand) => brand.toLowerCase().includes(text.toLowerCase()));

    let browser = 'Không xác định';
    if (nav.brave) browser = 'Brave';
    else if (hasBrand('Microsoft Edge')) browser = 'Edge';
    else if (hasBrand('Samsung Internet')) browser = 'Samsung Internet';
    else if (hasBrand('Opera')) browser = 'Opera';
    else if (hasBrand('Google Chrome')) browser = 'Chrome';
    else if (hasBrand('Chromium')) browser = 'Chromium';
    else if (nav.vendor === 'Apple Computer, Inc.') browser = 'Safari';
    else if (typeof window.InstallTrigger !== 'undefined') browser = 'Firefox';
    else if (window.chrome) browser = 'Chromium';

    let operatingSystem = 'Không xác định';
    if (/android/i.test(platform)) operatingSystem = 'Android';
    else if (/iphone|ipad|ipod/i.test(platform)) operatingSystem = 'iOS';
    else if (/mac/i.test(platform)) operatingSystem = nav.maxTouchPoints > 1 ? 'iOS' : 'macOS';
    else if (/win/i.test(platform)) operatingSystem = 'Windows';
    else if (/cros/i.test(platform)) operatingSystem = 'ChromeOS';
    else if (/linux/i.test(platform)) operatingSystem = 'Linux';

    const shortestSide = Math.min(window.screen?.width || 0, window.screen?.height || 0);
    const touchTablet = nav.maxTouchPoints > 1 && shortestSide >= 600;
    let deviceType = 'Desktop';
    if (touchTablet) deviceType = 'Tablet';
    else if (hints?.mobile === true || (nav.maxTouchPoints > 0 && shortestSide > 0 && shortestSide < 600)) deviceType = 'Mobile';

    return { browser, operatingSystem, deviceType };
  }

  const visitor = visitorId();
  const dimensions = clientDimensions();
  let lastPath = '';
  let heartbeatTimer = 0;

  function normalizedPath() {
    const path = window.location.pathname || '/';
    return path.startsWith('/') ? path.slice(0, 512) : '/';
  }

  function externalReferrerHost() {
    if (!document.referrer) return null;
    try {
      const host = new URL(document.referrer).hostname.toLowerCase();
      return ALLOWED_HOSTS.has(host) ? null : host.slice(0, 255);
    } catch {
      return null;
    }
  }

  async function send(eventType) {
    if (document.visibilityState === 'hidden' && eventType === 'heartbeat') return;
    const session = activeSession();
    const effectiveEventType = eventType === 'heartbeat' && session.isNew ? 'pageview' : eventType;
    const payload = {
      p_session_id: session.id,
      p_visitor_id: visitor,
      p_path: normalizedPath(),
      p_referrer_host: externalReferrerHost(),
      p_browser: dimensions.browser,
      p_operating_system: dimensions.operatingSystem,
      p_device_type: dimensions.deviceType,
      p_event_type: effectiveEventType,
    };
    try {
      await fetch(RPC_URL, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        keepalive: effectiveEventType === 'pageview',
        headers: {
          apikey: PUBLISHABLE_KEY,
          Authorization: `Bearer ${PUBLISHABLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch {
      // Analytics must never affect the website experience.
    }
  }

  function pageview(force = false) {
    const path = normalizedPath();
    if (!force && path === lastPath) return;
    lastPath = path;
    void send('pageview');
  }

  function startHeartbeat() {
    if (heartbeatTimer) window.clearInterval(heartbeatTimer);
    heartbeatTimer = window.setInterval(() => void send('heartbeat'), HEARTBEAT_MS);
  }

  const originalPushState = history.pushState.bind(history);
  const originalReplaceState = history.replaceState.bind(history);
  history.pushState = (...args) => {
    originalPushState(...args);
    queueMicrotask(() => pageview());
  };
  history.replaceState = (...args) => {
    originalReplaceState(...args);
    queueMicrotask(() => pageview());
  };
  window.addEventListener('popstate', () => pageview());
  window.addEventListener('storage', (event) => {
    if (event.key === SESSION_KEY && document.visibilityState === 'visible') void send('heartbeat');
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void send('heartbeat');
  });

  pageview(true);
  startHeartbeat();
})();
