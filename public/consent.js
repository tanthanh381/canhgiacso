/*
 * Cảnh Giác Số — đồng ý cookie và thống kê truy cập.
 *
 * Tệp duy nhất mà các trang nạp trực tiếp: <script src="/consent.js" defer></script>.
 * Trước khi người dùng chấp nhận thì KHÔNG nạp gtag.js, KHÔNG nạp /web-analytics.js,
 * KHÔNG đặt cookie _ga*, KHÔNG ghi mã khách/phiên vào localStorage và KHÔNG gửi
 * request nào tới Google hoặc Supabase analytics.
 *
 * API: window.CGSConsent = { get(), onChange(callback), open() }.
 * Lựa chọn lưu ở localStorage khóa "cgs-consent-v1": { analytics, ts, v }.
 */
(() => {
  'use strict';

  if (window.CGSConsent) return;

  const STORAGE_KEY = 'cgs-consent-v1';
  const CONSENT_VERSION = 1;
  const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000; // hỏi lại sau 12 tháng
  const GA_ID = 'G-HH04Q7FYHM';
  const GA_SCRIPT_URL = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  const GA_INIT_URL = '/google-analytics-init.js';
  const TRACKER_URL = '/web-analytics.js';
  const STYLESHEET_URL = '/consent.css';
  const COOKIE_ANCHOR_URL = '/quyen-rieng-tu/#cookie';
  const THEME_KEY = 'khien-so-theme';
  const ANALYTICS_STORAGE_KEYS = ['canhgiacso-analytics-visitor-v1', 'canhgiacso-analytics-session-v2'];
  const ANALYTICS_COOKIE = /^(?:_ga(?:_[A-Za-z0-9_-]+)?|_gid|_gat(?:_[A-Za-z0-9_-]+)?)$/;
  const DENIED = Object.freeze({
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });

  const TEXT = Object.freeze({
    regionLabel: 'Cài đặt cookie và quyền riêng tư',
    titleFirst: 'Cookie và thống kê truy cập',
    titleSettings: 'Cài đặt cookie',
    body: 'Chúng tôi chỉ bật thống kê truy cập (Google Analytics 4 và thống kê nội bộ) khi bạn đồng ý. Nếu từ chối, không có cookie phân tích nào được đặt và website vẫn dùng đầy đủ. Bạn đổi ý được bất cứ lúc nào qua "Cài đặt cookie" ở cuối trang.',
    more: 'Quyền riêng tư và bảng cookie',
    accept: 'Chấp nhận phân tích',
    reject: 'Từ chối',
    close: 'Đóng',
    footerLink: 'Cài đặt cookie',
    statusOn: 'Lựa chọn hiện tại: đã chấp nhận thống kê truy cập',
    statusOff: 'Lựa chọn hiện tại: đã từ chối thống kê truy cập',
    signalGpc: 'Trình duyệt của bạn đang gửi tín hiệu Global Privacy Control; chúng tôi coi đó là từ chối thống kê cho đến khi bạn tự chọn.',
    signalDnt: 'Trình duyệt của bạn đang gửi tín hiệu Không theo dõi (DNT); chúng tôi coi đó là từ chối thống kê cho đến khi bạn tự chọn.',
    savedOn: 'Đã lưu: chấp nhận thống kê truy cập.',
    savedOff: 'Đã lưu: từ chối thống kê truy cập.',
  });

  // ---------------------------------------------------------------- tín hiệu riêng tư của trình duyệt
  function detectSignal() {
    try {
      if (navigator.globalPrivacyControl === true) return 'gpc';
      if (navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.msDoNotTrack === '1') return 'dnt';
    } catch {
      // Bỏ qua: coi như không có tín hiệu.
    }
    return null;
  }

  // ---------------------------------------------------------------- lưu trữ lựa chọn
  function readStored() {
    let raw = null;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
    if (!raw) return null;
    try {
      const value = JSON.parse(raw);
      const now = Date.now();
      const valid = value
        && typeof value === 'object'
        && value.v === CONSENT_VERSION
        && typeof value.analytics === 'boolean'
        && Number.isFinite(value.ts)
        && value.ts <= now + 24 * 60 * 60 * 1000
        && now - value.ts <= MAX_AGE_MS;
      if (valid) return { analytics: value.analytics, ts: value.ts, v: value.v };
    } catch {
      // JSON hỏng: xử lý như chưa có lựa chọn.
    }
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Không xóa được thì bỏ qua.
    }
    return null;
  }

  function writeStored(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
      // Chế độ lưu trữ bị chặn: lựa chọn chỉ có hiệu lực trong lần xem trang này.
    }
  }

  // ---------------------------------------------------------------- trạng thái
  let stored = readStored();
  const signal = detectSignal();
  const listeners = new Set();
  const analyticsState = { enabled: false, gtagReady: false, gaRequested: false, trackerRunning: false };

  function snapshot() {
    return Object.freeze({
      analytics: Boolean(stored && stored.analytics),
      decided: Boolean(stored),
      explicit: Boolean(stored),
      ts: stored ? stored.ts : null,
      v: CONSENT_VERSION,
      signal,
    });
  }

  function notify() {
    const state = snapshot();
    for (const listener of [...listeners]) {
      try {
        listener(state);
      } catch {
        // Một bên nghe lỗi không được làm hỏng bên khác.
      }
    }
    try {
      window.dispatchEvent(new CustomEvent('cgs-consent-change', { detail: state }));
    } catch {
      // Không có CustomEvent: bỏ qua.
    }
  }

  // ---------------------------------------------------------------- dọn dữ liệu phân tích
  function expireCookie(name, domain) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; path=/${domain ? `; domain=${domain}` : ''}`;
  }

  function cookieDomains() {
    const domains = [''];
    const host = window.location.hostname || '';
    if (!host || host === 'localhost' || host.includes(':') || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return domains;
    const parts = host.split('.');
    for (let index = 0; index <= parts.length - 2; index += 1) {
      const domain = parts.slice(index).join('.');
      domains.push(domain, `.${domain}`);
    }
    return domains;
  }

  function purgeAnalyticsCookies() {
    let names = [];
    try {
      names = document.cookie
        .split(';')
        .map((part) => part.split('=')[0].trim())
        .filter((name) => ANALYTICS_COOKIE.test(name));
    } catch {
      return;
    }
    if (!names.length) return;
    const domains = cookieDomains();
    for (const name of names) {
      for (const domain of domains) expireCookie(name, domain);
    }
  }

  function purgeAnalyticsStorage() {
    for (const key of ANALYTICS_STORAGE_KEYS) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Bỏ qua.
      }
      try {
        window.sessionStorage.removeItem(key);
      } catch {
        // Bỏ qua.
      }
    }
  }

  function purgeAnalyticsData() {
    purgeAnalyticsCookies();
    purgeAnalyticsStorage();
  }

  // ---------------------------------------------------------------- nạp / gỡ phân tích
  function ensureGtag() {
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') {
      window.gtag = function gtag() {
        window.dataLayer.push(arguments); // gtag.js yêu cầu đối tượng arguments.
      };
    }
  }

  function injectScript(src) {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    (document.head || document.documentElement).appendChild(script);
    return script;
  }

  function enableGoogleAnalytics() {
    window[`ga-disable-${GA_ID}`] = false;
    ensureGtag();
    if (!analyticsState.gtagReady) {
      // Consent Mode v2: mặc định từ chối tất cả, chỉ analytics_storage được nâng lên "granted".
      window.gtag('consent', 'default', { ...DENIED });
      analyticsState.gtagReady = true;
    }
    window.gtag('consent', 'update', { analytics_storage: 'granted' });
    if (!analyticsState.gaRequested) {
      analyticsState.gaRequested = true;
      injectScript(GA_SCRIPT_URL);
      injectScript(GA_INIT_URL); // gọi gtag("js") và gtag("config", ID, { ...không quảng cáo }).
    } else {
      // Đổi ý trong cùng một lần xem trang: gtag.js đã có sẵn, chỉ cần bật lại và ghi lượt xem hiện tại.
      window.gtag('event', 'page_view');
    }
  }

  function disableGoogleAnalytics() {
    window[`ga-disable-${GA_ID}`] = true; // cờ chính thức để Google Analytics ngừng ghi nhận.
    if (analyticsState.gtagReady && typeof window.gtag === 'function') {
      window.gtag('consent', 'update', { ...DENIED });
    }
  }

  function enableTracker() {
    if (analyticsState.trackerRunning) return;
    analyticsState.trackerRunning = true;
    injectScript(TRACKER_URL);
  }

  function enableAnalytics() {
    if (analyticsState.enabled) return;
    analyticsState.enabled = true;
    enableGoogleAnalytics();
    enableTracker();
  }

  function disableAnalytics() {
    analyticsState.enabled = false;
    analyticsState.trackerRunning = false; // web-analytics.js tự dừng khi nhận onChange.
    disableGoogleAnalytics();
    purgeAnalyticsData();
    // GA có thể còn một lượt ghi cuối khi đóng trang; dọn lại sau một nhịp ngắn.
    window.setTimeout(purgeAnalyticsData, 500);
  }

  function applyEffective() {
    if (stored && stored.analytics) enableAnalytics();
    else disableAnalytics();
  }

  function choose(analytics) {
    stored = { analytics: Boolean(analytics), ts: Date.now(), v: CONSENT_VERSION };
    writeStored(stored);
    if (analytics) {
      enableAnalytics();
      notify();
    } else {
      notify(); // để web-analytics.js dừng trước khi xóa dữ liệu của nó.
      disableAnalytics();
    }
    refreshUi();
    announce(analytics ? TEXT.savedOn : TEXT.savedOff);
  }

  // ---------------------------------------------------------------- giao diện
  const ui = {
    root: null,
    focusOnReveal: false,
    title: null,
    status: null,
    close: null,
    live: null,
    fab: null,
    mode: 'first',
    visible: false,
    opener: null,
    resizeObserver: null,
    themeObserver: null,
    stylesheet: false,
    styleReady: false,
    styleWaiters: [],
  };

  function el(tag, attributes, children) {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(attributes || {})) node.setAttribute(name, value);
    for (const child of children || []) node.append(child);
    return node;
  }

  function styleReady() {
    if (ui.styleReady) return;
    ui.styleReady = true;
    const waiters = ui.styleWaiters;
    ui.styleWaiters = [];
    for (const callback of waiters) callback();
  }

  function ensureStylesheet() {
    if (ui.stylesheet) return;
    ui.stylesheet = true;
    if (document.querySelector(`link[href="${STYLESHEET_URL}"]`)) {
      ui.styleReady = true;
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = STYLESHEET_URL;
    link.addEventListener('load', styleReady, { once: true });
    link.addEventListener('error', styleReady, { once: true });
    window.setTimeout(styleReady, 2000); // không để banner kẹt ẩn nếu tệp CSS chậm.
    (document.head || document.documentElement).appendChild(link);
  }

  // Chỉ hiện banner khi CSS đã nạp, tránh khung hình đầu tiên chưa có kiểu.
  function whenStyled(callback) {
    ensureStylesheet();
    if (ui.styleReady) callback();
    else ui.styleWaiters.push(callback);
  }

  function siteIsDark() {
    try {
      if (document.documentElement.getAttribute('data-theme') === 'dark') return true;
      const app = document.querySelector('.app');
      if (app) return app.classList.contains('dark');
      return window.localStorage.getItem(THEME_KEY) === 'dark';
    } catch {
      return false;
    }
  }

  function syncTheme() {
    const theme = siteIsDark() ? 'dark' : 'light';
    if (ui.root && ui.root.getAttribute('data-cgs-theme') !== theme) ui.root.setAttribute('data-cgs-theme', theme);
    if (ui.fab && ui.fab.getAttribute('data-cgs-theme') !== theme) ui.fab.setAttribute('data-cgs-theme', theme);
  }

  function measure() {
    if (!ui.root || !ui.visible) return;
    document.documentElement.style.setProperty('--cgs-consent-h', `${ui.root.offsetHeight}px`);
  }

  function formatDate(ts) {
    try {
      return new Date(ts).toLocaleDateString('vi-VN');
    } catch {
      return '';
    }
  }

  function build() {
    if (ui.root) return;
    ensureStylesheet();

    ui.title = el('p', { class: 'cgs-consent__title', id: 'cgs-consent-title' });
    const text = el('p', { class: 'cgs-consent__text' });
    text.append(`${TEXT.body} `);
    text.append(el('a', { class: 'cgs-consent__link', href: COOKIE_ANCHOR_URL }, [TEXT.more]));
    ui.status = el('p', { class: 'cgs-consent__status' });

    const accept = el('button', { type: 'button', class: 'cgs-consent__btn', 'data-cgs-choice': 'accept' }, [TEXT.accept]);
    const reject = el('button', { type: 'button', class: 'cgs-consent__btn', 'data-cgs-choice': 'reject' }, [TEXT.reject]);
    ui.close = el('button', { type: 'button', class: 'cgs-consent__btn cgs-consent__btn--quiet', 'data-cgs-close': '' }, [TEXT.close]);
    ui.close.hidden = true;

    accept.addEventListener('click', () => choose(true));
    reject.addEventListener('click', () => choose(false));
    ui.close.addEventListener('click', () => hide(true));

    ui.root = el('section', {
      class: 'cgs-consent',
      id: 'cgs-consent',
      role: 'region',
      'aria-label': TEXT.regionLabel,
      'data-cgs-theme': 'light',
    }, [
      el('div', { class: 'cgs-consent__inner' }, [
        el('div', { class: 'cgs-consent__copy' }, [ui.title, text, ui.status]),
        el('div', { class: 'cgs-consent__actions' }, [accept, reject, ui.close]),
      ]),
    ]);
    ui.root.hidden = true;
    ui.root.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && ui.mode === 'settings') {
        event.stopPropagation();
        hide(true);
      }
    });

    ui.live = el('div', { class: 'cgs-consent-live', role: 'status', 'aria-live': 'polite' });

    // Đặt ở đầu <body> để người dùng bàn phím tới được ngay; vị trí thật được CSS cố định ở đáy màn hình.
    document.body.insertBefore(ui.root, document.body.firstChild);
    document.body.appendChild(ui.live);
  }

  function announce(message) {
    if (!ui.live) return;
    ui.live.textContent = '';
    window.setTimeout(() => {
      if (ui.live) ui.live.textContent = message;
    }, 50);
  }

  function renderContent() {
    if (!ui.root) return;
    const state = snapshot();
    ui.title.textContent = ui.mode === 'settings' ? TEXT.titleSettings : TEXT.titleFirst;
    let status = '';
    if (ui.mode === 'settings') {
      if (state.decided) {
        const date = formatDate(state.ts);
        status = `${state.analytics ? TEXT.statusOn : TEXT.statusOff}${date ? ` (ngày ${date})` : ''}.`;
      } else if (signal) {
        status = signal === 'gpc' ? TEXT.signalGpc : TEXT.signalDnt;
      }
    }
    ui.status.textContent = status;
    ui.close.hidden = ui.mode !== 'settings';
  }

  function reveal() {
    if (!ui.root || !ui.visible) return;
    ui.root.hidden = false;
    syncTheme();
    measure();
    if (typeof ResizeObserver === 'function' && !ui.resizeObserver) {
      ui.resizeObserver = new ResizeObserver(measure);
      ui.resizeObserver.observe(ui.root);
    }
    if (typeof MutationObserver === 'function' && !ui.themeObserver) {
      let queued = false;
      ui.themeObserver = new MutationObserver(() => {
        if (queued) return;
        queued = true;
        window.requestAnimationFrame(() => {
          queued = false;
          syncTheme();
        });
      });
      ui.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      ui.themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true });
    }
    if (ui.focusOnReveal) {
      ui.focusOnReveal = false;
      const first = ui.root.querySelector('[data-cgs-choice]');
      if (first) first.focus();
    }
  }

  function show(mode, opener, focusFirst) {
    build();
    ui.mode = mode;
    ui.opener = opener || null;
    ui.focusOnReveal = Boolean(focusFirst);
    renderContent();
    ui.visible = true;
    removeFab();
    document.body.classList.add('cgs-consent-open');
    whenStyled(reveal);
  }

  function hide(restoreFocus) {
    if (!ui.root) return;
    ui.visible = false;
    ui.root.hidden = true;
    document.body.classList.remove('cgs-consent-open');
    document.documentElement.style.removeProperty('--cgs-consent-h');
    if (ui.resizeObserver) {
      ui.resizeObserver.disconnect();
      ui.resizeObserver = null;
    }
    if (ui.themeObserver) {
      ui.themeObserver.disconnect();
      ui.themeObserver = null;
    }
    const opener = ui.opener;
    ui.opener = null;
    ensureEntryPoint();
    if (restoreFocus && opener) {
      const target = document.contains(opener) ? opener : document.querySelector('[data-cgs-consent-open]');
      if (target && typeof target.focus === 'function') target.focus();
    }
  }

  function refreshUi() {
    const state = snapshot();
    if (state.decided || signal) {
      if (ui.visible) hide(true);
    }
  }

  // ---------------------------------------------------------------- liên kết "Cài đặt cookie"
  function footerSlot() {
    return document.querySelector('.seo-footer-links')
      || document.querySelector('footer nav[aria-label="Thông tin website"]');
  }

  function makeFooterLink() {
    return el('a', {
      href: COOKIE_ANCHOR_URL,
      'data-cgs-consent-open': '',
      'data-cgs-consent-footer': '',
    }, [TEXT.footerLink]);
  }

  function removeFab() {
    if (ui.fab) {
      ui.fab.remove();
      ui.fab = null;
    }
  }

  function ensureFooterLink() {
    if (document.querySelector('[data-cgs-consent-footer]')) {
      removeFab();
      return true;
    }
    const slot = footerSlot();
    if (!slot) return false;
    slot.appendChild(makeFooterLink());
    removeFab();
    return true;
  }

  function showFab() {
    if (ui.fab || ui.visible || !document.body) return;
    ensureStylesheet();
    ui.fab = el('button', {
      type: 'button',
      class: 'cgs-consent-fab',
      'data-cgs-consent-open': '',
      'data-cgs-theme': siteIsDark() ? 'dark' : 'light',
    }, [TEXT.footerLink]);
    document.body.appendChild(ui.fab);
  }

  // Nếu không có chân trang để gắn liên kết thì dùng nút nổi nhỏ để người dùng vẫn đổi ý được.
  function ensureEntryPoint() {
    if (!ensureFooterLink() && document.readyState === 'complete') showFab();
  }

  function watchFooter() {
    ensureFooterLink();
    if (typeof MutationObserver !== 'function') return;
    let queued = false;
    const observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(() => {
        queued = false;
        if (!document.querySelector('[data-cgs-consent-footer]')) ensureFooterLink();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-cgs-consent-open]') : null;
    if (!target) return;
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    open(target);
  });

  // ---------------------------------------------------------------- API công khai
  function get() {
    return snapshot();
  }

  function onChange(callback) {
    if (typeof callback !== 'function') return () => {};
    listeners.add(callback);
    return () => listeners.delete(callback);
  }

  function open(opener) {
    const active = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
    const from = opener instanceof Element ? opener : active;
    if (ui.visible) {
      const first = ui.root && ui.root.querySelector('[data-cgs-choice]');
      if (first) first.focus();
      return;
    }
    show('settings', from, true);
  }

  window.CGSConsent = Object.freeze({ get, onChange, open });

  // Đồng bộ giữa các tab: tab khác đổi lựa chọn thì tab này cũng áp dụng.
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    const before = snapshot();
    stored = readStored();
    const after = snapshot();
    if (before.analytics === after.analytics && before.decided === after.decided) return;
    if (after.analytics) {
      enableAnalytics();
      notify();
    } else {
      notify();
      disableAnalytics();
    }
    refreshUi();
  });

  // ---------------------------------------------------------------- khởi động
  function start() {
    // Chưa đồng ý (hoặc đã hết hạn / đổi phiên bản) thì xóa mọi dấu vết phân tích từ trước khi có banner.
    applyEffective();
    ensureStylesheet();
    if (!stored && !signal) show('first', null, false);
    watchFooter();
    if (document.readyState === 'complete') ensureEntryPoint();
    else window.addEventListener('load', () => window.setTimeout(ensureEntryPoint, 1500), { once: true });
  }

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
