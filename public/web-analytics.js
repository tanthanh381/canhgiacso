(() => {
  'use strict';

  const PROJECT_URL = 'https://goietwyapiywrtibpkwo.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_ghj-H14bq2n1tSsH4u-adA_LoBtWKO4';
  const RPC_URL = `${PROJECT_URL}/rest/v1/rpc/record_web_analytics_event`;
  const SESSION_KEY = 'canhgiacso-analytics-session';
  const HEARTBEAT_MS = 60_000;
  const ALLOWED_HOSTS = new Set(['canhgiacso.com', 'www.canhgiacso.com']);

  if (!ALLOWED_HOSTS.has(window.location.hostname)) return;
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;

  function sessionId() {
    try {
      let value = window.sessionStorage.getItem(SESSION_KEY);
      if (!value || !/^[0-9a-f-]{36}$/i.test(value)) {
        value = crypto.randomUUID();
        window.sessionStorage.setItem(SESSION_KEY, value);
      }
      return value;
    } catch {
      return crypto.randomUUID();
    }
  }

  const id = sessionId();
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
    const payload = {
      p_session_id: id,
      p_path: normalizedPath(),
      p_referrer_host: externalReferrerHost(),
      p_event_type: eventType,
    };
    try {
      await fetch(RPC_URL, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        keepalive: eventType === 'pageview',
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
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void send('heartbeat');
  });

  pageview(true);
  startHeartbeat();
})();
