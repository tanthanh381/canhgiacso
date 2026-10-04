(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ScamCheck = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const LEVELS = {
    high: "Rủi ro cao",
    medium: "Cần thận trọng",
    low: "Có tín hiệu nhẹ",
    none: "Chưa phát hiện dấu hiệu",
  };

  const BRANDS = [
    { name: "HDBank", keywords: ["hdbank"], legit: ["hdbank.com.vn", "hdbank.vn", "hdbank.com"] },
    { name: "Vietcombank", keywords: ["vietcombank"], legit: ["vietcombank.com.vn"] },
    { name: "VietinBank", keywords: ["vietinbank"], legit: ["vietinbank.vn"] },
    { name: "BIDV", keywords: ["bidv"], legit: ["bidv.com.vn", "bidv.vn"] },
    { name: "Techcombank", keywords: ["techcombank"], legit: ["techcombank.com.vn", "techcombank.com"] },
    { name: "MB Bank", keywords: ["mbbank"], legit: ["mbbank.com.vn"] },
    { name: "Agribank", keywords: ["agribank"], legit: ["agribank.com.vn"] },
    { name: "Sacombank", keywords: ["sacombank"], legit: ["sacombank.com.vn", "sacombank.com"] },
    { name: "VPBank", keywords: ["vpbank"], legit: ["vpbank.com.vn"] },
    { name: "TPBank", keywords: ["tpbank"], legit: ["tpb.vn", "tpbank.com.vn"] },
    { name: "MoMo", keywords: ["momo"], legit: ["momo.vn"] },
    { name: "ZaloPay", keywords: ["zalopay"], legit: ["zalopay.vn"] },
    { name: "Viettel", keywords: ["viettel"], legit: ["viettel.vn", "viettel.com.vn"] },
    { name: "Shopee", keywords: ["shopee"], legit: ["shopee.vn", "shopee.com"] },
  ];

  const GOV_KEYWORDS = ["bocongan", "congan", "dichvucong", "vneid", "thuequocgia", "baohiemxahoi", "bhxh", "toaan", "vienkiemsat"];
  const MULTI_PART_SLD = new Set(["com", "net", "org", "gov", "edu", "ac", "co", "or", "ne"]);
  const SUSPICIOUS_TLDS = new Set(["top", "xyz", "click", "icu", "vip", "cc", "site", "online", "shop", "live", "buzz", "cfd", "sbs", "rest", "monster", "work", "loan", "zip", "mov", "gq", "cf", "tk", "ml", "ga", "support", "help"]);
  const SHORTENERS = new Set(["bit.ly", "tinyurl.com", "t.co", "goo.gl", "is.gd", "cutt.ly", "rb.gy", "ow.ly", "shorturl.at", "s.id", "t.ly", "rebrand.ly", "tiny.cc", "bom.so", "qr.ae"]);
  const BAIT_WORDS = ["login", "signin", "verify", "xacminh", "xac-minh", "otp", "nhanqua", "nhan-qua", "trungthuong", "trung-thuong", "khuyenmai", "hoantien", "hoan-tien", "capnhat", "cap-nhat", "dangnhap", "dang-nhap", "secure", "update", "account", "wallet", "mokhoa", "mo-khoa", "ctv", "kiemtien"];
  const DISPOSABLE_EMAIL = new Set(["mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com", "temp-mail.org", "yopmail.com", "sharklasers.com", "trashmail.com", "getnada.com", "dispostable.com", "maildrop.cc", "throwawaymail.com", "fakeinbox.com"]);
  const FREE_MAIL = new Set(["gmail.com", "yahoo.com", "yahoo.com.vn", "outlook.com", "hotmail.com", "icloud.com", "proton.me", "protonmail.com", "live.com"]);
  const ROLE_WORDS = ["support", "hotro", "cskh", "admin", "security", "baomat", "ketoan", "caresoft", "service"];

  function levelFromScore(score) {
    if (score >= 60) return "high";
    if (score >= 30) return "medium";
    if (score > 0) return "low";
    return "none";
  }

  function newResult(kind, input) {
    return { kind, input, normalized: input, score: 0, findings: [], notes: [], feedKeys: null };
  }

  function add(result, points, text) {
    result.score += points;
    result.findings.push(text);
  }

  function finalize(result, feedHit) {
    if (feedHit && feedHit.matched) {
      result.score = Math.max(result.score, 100);
      result.findings.unshift(feedHit.text);
    }
    result.level = levelFromScore(result.score);
    result.label = LEVELS[result.level];
    return result;
  }

  function detectType(raw) {
    const value = String(raw || "").trim();
    if (!value) return "url";
    if (/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(value)) return "email";
    if (/^\d{1,3}(\.\d{1,3}){3}(:\d{1,5})?$/.test(value)) return "ip";
    if (/^\[?[0-9a-f:]{2,39}\]?$/i.test(value) && (value.match(/:/g) || []).length >= 2) return "ip";
    if (/^\+?[\d\s().-]{8,20}$/.test(value) && (value.match(/\d/g) || []).length >= 8) return "phone";
    return "url";
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      let diagonal = prev[0];
      prev[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const temp = prev[j];
        prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
        diagonal = temp;
      }
    }
    return prev[b.length];
  }

  function registrableDomain(host) {
    const labels = host.split(".");
    if (labels.length <= 2) return host;
    const last = labels[labels.length - 1];
    const second = labels[labels.length - 2];
    if (last.length === 2 && MULTI_PART_SLD.has(second)) return labels.slice(-3).join(".");
    return labels.slice(-2).join(".");
  }

  function isIpv4(host) {
    return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) && host.split(".").every((part) => Number(part) <= 255);
  }

  function brandChecks(host, result) {
    const domain = registrableDomain(host);
    const tokens = host.split(/[.\-_]/).filter(Boolean);
    let brandFlagged = false;
    for (const brand of BRANDS) {
      if (brand.legit.includes(domain)) continue;
      const keywordHit = brand.keywords.some((keyword) => host.includes(keyword));
      const typo = brand.keywords.some((keyword) => keyword.length >= 5 && tokens.some((token) => token.length >= 5 && token !== keyword && levenshtein(token, keyword) === 1));
      if (keywordHit) {
        add(result, 45, `Tên miền chứa tên “${brand.name}” nhưng không phải tên miền chính thức đã biết của tổ chức này.`);
        brandFlagged = true;
        break;
      }
      if (typo) {
        add(result, 45, `Tên miền gần giống tên “${brand.name}” (có thể là giả mạo bằng cách đổi một ký tự).`);
        brandFlagged = true;
        break;
      }
    }
    if (!brandFlagged) {
      const govHit = GOV_KEYWORDS.find((keyword) => host.includes(keyword));
      if (govHit && !host.endsWith(".gov.vn")) {
        add(result, 40, "Tên miền nhắc đến cơ quan nhà nước nhưng không kết thúc bằng .gov.vn.");
        brandFlagged = true;
      }
    }
    if (!brandFlagged && BRANDS.some((brand) => brand.legit.includes(domain))) {
      result.notes.push("Tên miền trùng với tên miền chính thức đã biết. Vẫn cần kiểm tra bạn nhận đường dẫn này từ đâu.");
    }
    return brandFlagged;
  }

  function hostChecks(host, result) {
    if (host.startsWith("xn--") || host.includes(".xn--")) add(result, 25, "Tên miền dùng ký tự quốc tế hóa (punycode), thường bị lợi dụng để giả mạo chữ cái.");
    const tld = host.split(".").pop();
    if (SUSPICIOUS_TLDS.has(tld)) add(result, 20, `Đuôi tên miền “.${tld}” thường gặp trong các trang lừa đảo giá rẻ.`);
    if (SHORTENERS.has(host)) add(result, 20, "Đây là link rút gọn, không nhìn được đích đến thật trước khi bấm.");
    if (host.split(".").length >= 5) add(result, 10, "Tên miền có quá nhiều cấp con, có thể nhằm che tên miền thật.");
    if ((host.match(/-/g) || []).length >= 3) add(result, 10, "Tên miền có nhiều dấu gạch ngang, kiểu thường dùng để ghép từ khóa đánh lừa.");
  }

  function normalizeUrlInput(raw) {
    const value = String(raw || "").trim();
    if (!value) return null;
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value) && !value.includes(".")) return null;
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
    try {
      const url = new URL(withScheme);
      if (!/^https?:$/.test(url.protocol)) return null;
      if (!url.hostname) return null;
      return url;
    } catch {
      return null;
    }
  }

  function feedUrlKey(url) {
    const defaultPort = url.protocol === "http:" ? "80" : "443";
    const port = url.port && url.port !== defaultPort ? `:${url.port}` : "";
    const path = url.pathname === "/" ? "" : url.pathname;
    return `${url.protocol}//${url.hostname.toLowerCase()}${port}${path}${url.search}`;
  }

  function analyzeUrl(raw) {
    const result = newResult("url", String(raw || "").trim());
    const url = normalizeUrlInput(raw);
    if (!url) {
      result.invalid = true;
      result.level = "none";
      result.label = "Không đọc được liên kết";
      result.findings.push("Nội dung nhập không phải là liên kết hợp lệ. Hãy dán đầy đủ đường dẫn, ví dụ https://ten-mien.vn/duong-dan.");
      return result;
    }
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    result.normalized = feedUrlKey(url);
    result.host = host;
    result.feedKeys = { host, parent: isIpv4(host) ? "" : registrableDomain(host), url: result.normalized };

    if (isIpv4(host) || host.startsWith("[")) add(result, 30, "Liên kết dùng địa chỉ IP thay cho tên miền, hiếm khi xuất hiện ở dịch vụ chính thống.");
    else hostChecks(host, result);
    brandChecks(host, result);
    if (url.username || url.password) add(result, 30, "Liên kết chứa ký tự @ hoặc thông tin đăng nhập trong địa chỉ, thủ thuật phổ biến để đánh lừa phần tên miền thật.");
    if (/\P{ASCII}/u.test(result.input)) add(result, 15, "Liên kết có ký tự không phải ASCII, có thể là chữ giống hệt chữ Latinh.");
    if (url.protocol === "http:") add(result, 10, "Liên kết không dùng HTTPS.");
    if (url.port && !["80", "443"].includes(url.port)) add(result, 10, `Liên kết dùng cổng không chuẩn (${url.port}).`);
    if (result.input.length > 120) add(result, 10, "Liên kết rất dài, thường dùng để giấu phần quan trọng.");
    if (/\.(apk|ipa|exe|msi|scr|bat|jar)(\?|$)/i.test(url.pathname)) add(result, 35, "Liên kết tải về tệp cài đặt. Không cài ứng dụng ngoài kho chính thức theo hướng dẫn của người lạ.");
    const bait = BAIT_WORDS.find((word) => (host + url.pathname).toLowerCase().includes(word));
    if (bait) add(result, 15, `Địa chỉ có từ khóa gây áp lực hoặc dụ nhập thông tin (“${bait}”).`);
    return result;
  }

  function normalizePhone(raw) {
    const trimmed = String(raw || "").trim();
    const international = trimmed.startsWith("+") || trimmed.startsWith("00");
    let digits = trimmed.replace(/\D/g, "");
    if (trimmed.startsWith("+")) digits = trimmed.slice(1).replace(/\D/g, "");
    else if (digits.startsWith("00")) digits = digits.slice(2);
    if (international || (digits.startsWith("84") && digits.length === 11)) {
      if (digits.startsWith("84")) {
        const rest = digits.slice(2);
        if (/^[1-9]\d{8,9}$/.test(rest)) return { national: `0${rest}`, foreign: false };
        return { national: digits, foreign: false, invalid: true };
      }
      return { national: digits, foreign: true };
    }
    return { national: digits, foreign: false };
  }

  function analyzePhone(raw) {
    const result = newResult("phone", String(raw || "").trim());
    const phone = normalizePhone(raw);
    result.normalized = phone.foreign ? `+${phone.national}` : phone.national;
    result.feedKeys = { phone: phone.national };
    const n = phone.national;
    if (phone.foreign) {
      add(result, 30, "Số quốc tế. Cuộc gọi tự xưng là cơ quan, ngân hàng trong nước nhưng gọi từ số nước ngoài rất đáng ngờ.");
    } else if (phone.invalid || !/^0\d{9,10}$/.test(n)) {
      add(result, 30, "Số không đúng định dạng điện thoại Việt Nam (10–11 chữ số bắt đầu bằng 0).");
    } else if (/^0(3[2-9]|5[2689]|7[06-9]|8[1-9]|9\d)\d{7}$/.test(n)) {
      result.notes.push("Số di động đúng định dạng Việt Nam. Số điện thoại có thể bị giả mạo hiển thị nên đây không phải bằng chứng về người gọi.");
    } else if (/^02\d{9}$/.test(n)) {
      result.notes.push("Số cố định. Nếu người gọi tự xưng ngân hàng hay cơ quan, hãy tự tra số chính thức rồi gọi lại.");
    } else if (/^(1900|1800)\d{4,6}$/.test(n)) {
      result.notes.push("Đầu số dịch vụ 1900/1800. Chỉ tin khi số này khớp với số công bố trên website hoặc ứng dụng chính thức của tổ chức.");
    } else {
      add(result, 30, "Đầu số không thuộc nhóm di động hoặc cố định phổ biến tại Việt Nam.");
    }
    return result;
  }

  function analyzeEmail(raw) {
    const result = newResult("email", String(raw || "").trim());
    const value = result.input.toLowerCase();
    const at = value.lastIndexOf("@");
    if (at < 1 || at === value.length - 1) {
      result.invalid = true;
      result.level = "none";
      result.label = "Không đọc được email";
      result.findings.push("Địa chỉ email không hợp lệ.");
      return result;
    }
    const local = value.slice(0, at);
    const domain = value.slice(at + 1);
    result.normalized = value;
    result.feedKeys = { email: value, host: domain, parent: registrableDomain(domain) };
    if (!/^[a-z0-9.-]+\.[a-z0-9-]{2,}$/.test(domain) && !domain.startsWith("xn--")) {
      add(result, 30, "Phần tên miền của email có định dạng bất thường.");
      return result;
    }
    if (DISPOSABLE_EMAIL.has(domain)) add(result, 30, "Email thuộc dịch vụ hộp thư dùng một lần, thường dùng để ẩn danh.");
    hostChecks(domain, result);
    const brandDomainFlag = brandChecks(domain, result);
    if (FREE_MAIL.has(domain)) {
      const brand = BRANDS.find((item) => item.keywords.some((keyword) => local.includes(keyword)));
      if (brand) add(result, 40, `Email miễn phí nhưng tên có “${brand.name}”. Tổ chức thật không liên hệ khách hàng qua hộp thư miễn phí.`);
      else if (ROLE_WORDS.some((word) => local.includes(word))) add(result, 15, "Email miễn phí mang tên bộ phận hỗ trợ hoặc bảo mật. Tổ chức thật thường dùng tên miền riêng.");
    } else if (!brandDomainFlag && BRANDS.some((item) => item.legit.includes(registrableDomain(domain)))) {
      result.notes.push("Tên miền email trùng tên miền chính thức đã biết. Địa chỉ người gửi vẫn có thể bị giả mạo, hãy kiểm tra nội dung yêu cầu.");
    }
    return result;
  }

  function parseIpv4(ip) {
    const parts = ip.split(".").map(Number);
    return parts.length === 4 && parts.every((p) => Number.isInteger(p) && p >= 0 && p <= 255) ? parts : null;
  }

  function ipv4ToInt(parts) {
    return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
  }

  function ipv4InCidr(ip, cidr) {
    const [base, bitsText] = cidr.split("/");
    const baseParts = parseIpv4(base);
    const ipParts = parseIpv4(ip);
    const bits = Number(bitsText);
    if (!baseParts || !ipParts || !(bits >= 0 && bits <= 32)) return false;
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (ipv4ToInt(baseParts) & mask) >>> 0 === (ipv4ToInt(ipParts) & mask) >>> 0;
  }

  function analyzeIp(raw) {
    const result = newResult("ip", String(raw || "").trim());
    let value = result.input.replace(/^\[|\](:\d+)?$/g, "");
    if (/^\d{1,3}(\.\d{1,3}){3}:\d{1,5}$/.test(value)) value = value.split(":")[0];
    result.normalized = value.toLowerCase();
    result.feedKeys = { ip: result.normalized, host: result.normalized };
    const v4 = parseIpv4(value);
    if (v4) {
      const [a, b] = v4;
      if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 100 && b >= 64 && b <= 127) || a >= 224) {
        result.local = true;
        result.notes.push("Đây là địa chỉ nội bộ hoặc đặc biệt, không phải IP công cộng trên Internet nên không thể tra cứu cảnh báo.");
      } else {
        result.notes.push("Địa chỉ IP một mình không cho biết nó có phải lừa đảo hay không. Nhiều trang giả dùng IP trần nhưng nhiều dịch vụ hợp pháp cũng dùng chung IP.");
      }
      return result;
    }
    if (/^[0-9a-f:]+$/i.test(value) && (value.match(/:/g) || []).length >= 2 && value.length <= 39) {
      const lower = value.toLowerCase();
      if (lower === "::1" || lower.startsWith("fe80:") || /^f[cd]/.test(lower)) {
        result.local = true;
        result.notes.push("Đây là địa chỉ IPv6 nội bộ hoặc đặc biệt, không tra cứu được cảnh báo.");
      } else {
        result.notes.push("Địa chỉ IP một mình không cho biết nó có phải lừa đảo hay không.");
      }
      return result;
    }
    result.invalid = true;
    result.level = "none";
    result.label = "Không đọc được địa chỉ IP";
    result.findings.push("Địa chỉ IP không hợp lệ.");
    return result;
  }

  async function sha256Hex(text) {
    const data = new TextEncoder().encode(text);
    const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  async function feedKey(text) {
    return (await sha256Hex(text)).slice(0, 16);
  }

  const SOURCE_NAMES = { uh: "URLhaus (abuse.ch)", fe: "Feodo Tracker (abuse.ch)", in: "danh sách nội bộ Cảnh Giác Số" };

  function createFeed(baseUrl, fetchImpl) {
    const base = baseUrl || "/threat-data";
    const doFetch = fetchImpl || ((...args) => globalThis.fetch(...args));
    const cache = new Map();
    async function load(path) {
      if (!cache.has(path)) {
        cache.set(path, doFetch(`${base}/${path}`, { cache: "force-cache" }).then((response) => {
          if (!response.ok) throw new Error(`feed ${response.status}`);
          return response.json();
        }));
      }
      return cache.get(path);
    }
    async function meta() {
      try { return await load("meta.json"); } catch { return null; }
    }
    async function lookup(result) {
      const keys = result.feedKeys;
      if (!keys) return { available: true, matched: false };
      let info;
      try { info = await load("meta.json"); } catch { return { available: false, matched: false }; }
      try {
        const matches = [];
        const shardLookups = [];
        if (keys.url) shardLookups.push(["u", keys.url]);
        if (keys.host) shardLookups.push(["h", keys.host]);
        if (keys.parent && keys.parent !== keys.host) shardLookups.push(["h", keys.parent]);
        for (const [type, value] of shardLookups) {
          const key = await feedKey(`${type}:${value}`);
          const shard = await load(`s/${key.slice(0, 2)}.json`);
          const source = shard[type] && shard[type][key];
          if (source) matches.push({ type, source });
        }
        if (keys.ip) {
          const ips = await load("ip.json");
          if ((ips.ips || []).some((entry) => entry[0] === keys.ip) || (ips.cidrs || []).some((entry) => ipv4InCidr(keys.ip, entry[0]))) {
            const entry = (ips.ips || []).find((e) => e[0] === keys.ip) || (ips.cidrs || []).find((e) => ipv4InCidr(keys.ip, e[0]));
            matches.push({ type: "ip", source: entry[1] });
          }
        }
        if (keys.phone || keys.email) {
          const internal = await load("internal.json");
          const type = keys.phone ? "p" : "e";
          const key = await feedKey(`${type}:${keys.phone || keys.email}`);
          if (internal[type] && internal[type][key]) matches.push({ type: "internal", source: "in" });
        }
        if (!matches.length) return { available: true, matched: false, updated: info.generatedAt };
        const best = matches.find((m) => m.type === "u") || matches[0];
        const name = SOURCE_NAMES[best.source] || best.source;
        const text = best.type === "u"
          ? `Liên kết này có trong dữ liệu cảnh báo của ${name}.`
          : best.type === "internal"
            ? `Dữ liệu này có trong ${name}.`
            : `Tên miền hoặc địa chỉ này từng xuất hiện trong dữ liệu cảnh báo của ${name}.`;
        return { available: true, matched: true, text, source: best.source, updated: info.generatedAt };
      } catch {
        return { available: false, matched: false };
      }
    }
    return { lookup, meta };
  }

  const ANALYZERS = { url: analyzeUrl, phone: analyzePhone, email: analyzeEmail, ip: analyzeIp };

  const ACTIONS = {
    high: [
      "Không bấm liên kết, không gọi lại, không cung cấp OTP, mật khẩu hoặc cài ứng dụng theo yêu cầu.",
      "Tự mở ứng dụng hoặc website chính thức của tổ chức để kiểm tra, không dùng thông tin do người lạ gửi.",
      "Nếu đã chuyển tiền hoặc lộ thông tin, liên hệ ngân hàng qua kênh chính thức ngay và lưu lại bằng chứng.",
    ],
    medium: [
      "Tạm dừng, chưa thao tác theo yêu cầu cho tới khi xác minh qua kênh chính thức.",
      "Tự tìm số hotline hoặc website của tổ chức rồi đối chiếu, không dùng liên hệ trong tin nhắn.",
    ],
    low: ["Xác minh nguồn gửi trước khi thao tác. Tín hiệu nhẹ chưa đủ để kết luận."],
    none: ["Chưa phát hiện dấu hiệu không có nghĩa là an toàn. Hãy luôn xác minh nếu bị yêu cầu chuyển tiền, đọc OTP hoặc cài ứng dụng."],
  };

  async function analyze(raw, options) {
    const opts = options || {};
    const kind = opts.type && opts.type !== "auto" ? opts.type : detectType(raw);
    const result = ANALYZERS[kind](raw);
    let feed = { available: true, matched: false };
    if (!result.invalid && opts.feed) feed = await opts.feed.lookup(result);
    result.feed = feed;
    if (!result.invalid) finalize(result, feed);
    else result.score = 0;
    result.actions = result.invalid ? [] : ACTIONS[result.level];
    return result;
  }

  return { analyze, detectType, analyzeUrl, analyzePhone, analyzeEmail, analyzeIp, createFeed, feedKey, feedUrlKey, normalizePhone, normalizeUrlInput, registrableDomain, ipv4InCidr, levenshtein, LEVELS, SOURCE_NAMES };
});
