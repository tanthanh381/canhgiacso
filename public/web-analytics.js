(() => {
  'use strict';

  const PROJECT_URL = 'https://goietwyapiywrtibpkwo.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_ghj-H14bq2n1tSsH4u-adA_LoBtWKO4';
  const RPC_URL = `${PROJECT_URL}/rest/v1/rpc/record_web_analytics_event_v4`;
  const SESSION_KEY = 'canhgiacso-analytics-session-v2';
  const VISITOR_KEY = 'canhgiacso-analytics-visitor-v1';
  const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
  const VISITOR_TTL_MS = 90 * 24 * 60 * 60 * 1000;
  const HEARTBEAT_MS = 60_000;
  const ALLOWED_HOSTS = new Set(['canhgiacso.com', 'www.canhgiacso.com']);

  const TIMEZONE_COUNTRY = new Map([
    ['Asia/Ho_Chi_Minh', 'VN'], ['Asia/Saigon', 'VN'],
    ['Asia/Bangkok', 'TH'], ['Asia/Singapore', 'SG'], ['Asia/Kuala_Lumpur', 'MY'],
    ['Asia/Jakarta', 'ID'], ['Asia/Makassar', 'ID'], ['Asia/Jayapura', 'ID'], ['Asia/Pontianak', 'ID'],
    ['Asia/Manila', 'PH'], ['Asia/Tokyo', 'JP'], ['Asia/Seoul', 'KR'],
    ['Asia/Shanghai', 'CN'], ['Asia/Hong_Kong', 'HK'], ['Asia/Taipei', 'TW'],
    ['Asia/Kolkata', 'IN'], ['Asia/Calcutta', 'IN'], ['Asia/Dubai', 'AE'],
    ['Europe/London', 'GB'], ['Europe/Paris', 'FR'], ['Europe/Berlin', 'DE'],
    ['Europe/Madrid', 'ES'], ['Europe/Rome', 'IT'], ['Europe/Amsterdam', 'NL'],
    ['Europe/Brussels', 'BE'], ['Europe/Zurich', 'CH'], ['Europe/Moscow', 'RU'],
    ['America/New_York', 'US'], ['America/Chicago', 'US'], ['America/Denver', 'US'],
    ['America/Los_Angeles', 'US'], ['America/Phoenix', 'US'], ['America/Anchorage', 'US'],
    ['Pacific/Honolulu', 'US'], ['America/Toronto', 'CA'], ['America/Vancouver', 'CA'],
    ['America/Mexico_City', 'MX'], ['America/Sao_Paulo', 'BR'],
    ['Pacific/Auckland', 'NZ'], ['Africa/Johannesburg', 'ZA'], ['Africa/Cairo', 'EG'],
  ]);

  if (!ALLOWED_HOSTS.has(window.location.hostname)) return;
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;

  function validUuid(value) {
    return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

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

  function cleanCampaignValue(value, maxLength) {
    if (!value) return null;
    const cleaned = Array.from(String(value), (character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127 ? '' : character;
    }).join('').trim().slice(0, maxLength);
    return cleaned || null;
  }

  function campaignParams() {
    try {
      const params = new URLSearchParams(window.location.search);
      return {
        utmSource: cleanCampaignValue(params.get('utm_source'), 80)?.toLowerCase() || null,
        utmMedium: cleanCampaignValue(params.get('utm_medium'), 80)?.toLowerCase() || null,
        utmCampaign: cleanCampaignValue(params.get('utm_campaign'), 120),
      };
    } catch {
      return { utmSource: null, utmMedium: null, utmCampaign: null };
    }
  }

  function currentAcquisition() {
    return { referrerHost: externalReferrerHost(), ...campaignParams() };
  }

  function normalizedAcquisition(value) {
    const item = value && typeof value === 'object' ? value : {};
    return {
      referrerHost: typeof item.referrerHost === 'string' ? item.referrerHost.slice(0, 255) : null,
      utmSource: typeof item.utmSource === 'string' ? item.utmSource.slice(0, 80) : null,
      utmMedium: typeof item.utmMedium === 'string' ? item.utmMedium.slice(0, 80) : null,
      utmCampaign: typeof item.utmCampaign === 'string' ? item.utmCampaign.slice(0, 120) : null,
    };
  }

  function writeSharedSession(id, lastActivity, acquisition) {
    try {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify({ id, lastActivity, acquisition }));
    } catch {
      // Storage can be blocked. In that case the in-memory fallback below is used.
    }
  }

  let fallbackSession = { id: crypto.randomUUID(), lastActivity: Date.now(), acquisition: currentAcquisition() };

  function activeSession() {
    const now = Date.now();
    try {
      const raw = window.localStorage.getItem(SESSION_KEY);
      if (raw) {
        const stored = JSON.parse(raw);
        if (validUuid(stored?.id) && Number.isFinite(stored?.lastActivity) && now - stored.lastActivity < SESSION_TIMEOUT_MS) {
          const acquisition = stored?.acquisition ? normalizedAcquisition(stored.acquisition) : currentAcquisition();
          writeSharedSession(stored.id, now, acquisition);
          fallbackSession = { id: stored.id, lastActivity: now, acquisition };
          return { id: stored.id, isNew: false, acquisition };
        }
      }
      const id = crypto.randomUUID();
      const acquisition = currentAcquisition();
      writeSharedSession(id, now, acquisition);
      fallbackSession = { id, lastActivity: now, acquisition };
      return { id, isNew: true, acquisition };
    } catch {
      if (now - fallbackSession.lastActivity >= SESSION_TIMEOUT_MS) {
        fallbackSession = { id: crypto.randomUUID(), lastActivity: now, acquisition: currentAcquisition() };
        return { id: fallbackSession.id, isNew: true, acquisition: fallbackSession.acquisition };
      }
      fallbackSession.lastActivity = now;
      return { id: fallbackSession.id, isNew: false, acquisition: fallbackSession.acquisition };
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

  function estimatedCountryCode() {
    let timezone = '';
    try {
      timezone = String(Intl.DateTimeFormat().resolvedOptions().timeZone || '');
    } catch {
      timezone = '';
    }

    if (TIMEZONE_COUNTRY.has(timezone)) return TIMEZONE_COUNTRY.get(timezone);
    if (timezone.startsWith('Australia/')) return 'AU';
    if (timezone.startsWith('America/Argentina/')) return 'AR';
    if (timezone.startsWith('America/Indiana/') || timezone.startsWith('America/Kentucky/')) return 'US';

    const languages = Array.isArray(navigator.languages) && navigator.languages.length
      ? navigator.languages
      : [navigator.language];

    for (const language of languages) {
      if (!language) continue;
      try {
        const region = new Intl.Locale(String(language)).region;
        if (region && /^[A-Z]{2}$/.test(region)) return region;
      } catch {
        const match = String(language).match(/[-_]([A-Za-z]{2})(?:$|[-_])/);
        if (match) return match[1].toUpperCase();
      }
    }
    return null;
  }

  const visitor = visitorId();
  const dimensions = clientDimensions();
  const countryCode = estimatedCountryCode();
  let lastPath = '';
  let heartbeatTimer = 0;

  async function send(eventType) {
    if (document.visibilityState === 'hidden' && eventType === 'heartbeat') return;
    const session = activeSession();
    const effectiveEventType = eventType === 'heartbeat' && session.isNew ? 'pageview' : eventType;
    const payload = {
      p_session_id: session.id,
      p_visitor_id: visitor,
      p_path: normalizedPath(),
      p_referrer_host: session.acquisition.referrerHost,
      p_browser: dimensions.browser,
      p_operating_system: dimensions.operatingSystem,
      p_device_type: dimensions.deviceType,
      p_country_code: countryCode,
      p_utm_source: session.acquisition.utmSource,
      p_utm_medium: session.acquisition.utmMedium,
      p_utm_campaign: session.acquisition.utmCampaign,
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