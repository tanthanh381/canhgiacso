"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type PrimaryView = "Thử thách" | "Cẩm nang" | "Tin tức" | "Thành tích" | "Thực hành";

const PRIMARY_VIEWS: PrimaryView[] = ["Thử thách", "Cẩm nang", "Tin tức", "Thành tích", "Thực hành"];
const BANNER_KEY = "canhgiacso:simulation-banner-dismissed";

function navButton(label: string) {
  if (typeof document === "undefined") return null;
  return Array.from(document.querySelectorAll<HTMLButtonElement>(".topbar nav button"))
    .find((button) => button.textContent?.trim() === label) ?? null;
}

function activate(label: string) {
  navButton(label)?.click();
}

export function UxRefresh() {
  const [active, setActive] = useState<PrimaryView | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return localStorage.getItem(BANNER_KEY) === "1"; } catch { return false; }
  });
  const [guestPromptDismissed, setGuestPromptDismissed] = useState(false);
  const [insightOpen, setInsightOpen] = useState(false);
  const [scenariosOpen, setScenariosOpen] = useState(false);
  const [utilityOpen, setUtilityOpen] = useState(false);
  const [mobileKnowledgeOpen, setMobileKnowledgeOpen] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const root = document.getElementById("root") ?? document.body;
    let pending = false;
    const sync = () => {
      pending = false;
      const label = document.querySelector<HTMLElement>(".topbar nav [aria-current='page']")?.textContent?.trim();
      const mobileLabel = label === "Thực hành tương tác" ? "Thực hành" : label;
      setActive(PRIMARY_VIEWS.includes(mobileLabel as PrimaryView) ? mobileLabel as PrimaryView : null);
      setVersion((value) => value + 1);
    };
    const schedule = () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(sync);
    };
    const closeScenarioDrawer = (event: Event) => {
      const target = event.target;
      if (target instanceof Element && target.closest(".scenario-item")) setScenariosOpen(false);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["aria-current"],
    });
    root.addEventListener("click", closeScenarioDrawer);
    requestAnimationFrame(sync);
    return () => {
      observer.disconnect();
      root.removeEventListener("click", closeScenarioDrawer);
    };
  }, []);

  const domReady = typeof document !== "undefined";
  const app = domReady ? document.querySelector<HTMLElement>(".app") : null;
  const topActions = domReady ? document.querySelector<HTMLElement>(".top-actions") : null;
  const banner = domReady ? document.querySelector<HTMLElement>(".security-awareness-banner") : null;
  const scenarioPanel = domReady ? document.querySelector<HTMLElement>(".scenario-panel") : null;
  const statusGrid = domReady ? document.querySelector<HTMLElement>(".status-grid") : null;
  const stage = domReady ? document.querySelector<HTMLElement>(".stage") : null;
  const feedback = domReady ? document.querySelector<HTMLElement>(".feedback") : null;
  const knowledgeHero = domReady ? document.querySelector<HTMLElement>(".knowledge-hero") : null;
  const signedIn = domReady && Boolean(document.querySelector(".profile-button"));
  const hasAdmin = domReady && Boolean(navButton("Quản trị"));
  const completed = domReady ? document.querySelectorAll(".scenario-number.done, .scenario-number.attempted").length : 0;
  const totalText = domReady ? document.querySelector(".scenario-count")?.textContent ?? "" : "";
  const total = domReady ? Number(totalText.split("/")[1]) || document.querySelectorAll(".scenario-item").length : 0;

  useEffect(() => {
    app?.classList.toggle("ux-insight-open", insightOpen);
    app?.classList.toggle("ux-scenarios-open", scenariosOpen);
    app?.classList.toggle("ux-banner-dismissed", bannerDismissed);
  }, [app, bannerDismissed, insightOpen, scenariosOpen, version]);

  const navigate = (label: string) => {
    setInsightOpen(false);
    setScenariosOpen(false);
    setUtilityOpen(false);
    setMobileKnowledgeOpen(false);
    if (label === "Thực hành") {
      activate("Thực hành tương tác");
      return;
    }
    activate(label);
  };

  const openKnowledgeArticles = () => {
    setMobileKnowledgeOpen(false);
    window.location.assign("/kien-thuc/");
  };

  const openKnowledgeChecklist = () => {
    setMobileKnowledgeOpen(false);
    activate("Cẩm nang");
    window.setTimeout(() => document.getElementById("security-checklist-title")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };
  const dismissBanner = () => {
    setBannerDismissed(true);
    try { localStorage.setItem(BANNER_KEY, "1"); } catch { /* storage can be unavailable */ }
  };
  const restoreBanner = () => {
    setBannerDismissed(false);
    try { localStorage.removeItem(BANNER_KEY); } catch { /* storage can be unavailable */ }
  };
  const openRegistration = () => {
    if (!domReady) return;
    const button = Array.from(document.querySelectorAll<HTMLButtonElement>(".auth-actions button"))
      .find((item) => item.textContent?.trim() === "Đăng ký");
    button?.click();
  };
  const selectDifficulty = (value: string) => {
    if (!domReady) return;
    Array.from(document.querySelectorAll<HTMLButtonElement>(".difficulty-filter button"))
      .find((item) => item.textContent?.replace("🔒", "").trim() === value)?.click();
  };
  const flags = domReady
    ? Array.from(document.querySelectorAll<HTMLElement>(".red-flags div span"))
      .map((item) => (item.textContent ?? "").replace(/^△\s*/, "").trim()).filter(Boolean).slice(0, 3)
    : [];
  const tip = domReady ? document.querySelector<HTMLElement>(".coach-card > p")?.textContent?.trim() : undefined;
  const feedbackDanger = feedback?.classList.contains("danger") ?? false;

  return <>
    {topActions && createPortal(<>
      {bannerDismissed && <button className="ux-simulation-chip" onClick={restoreBanner}><span aria-hidden="true">🛡</span> Mô phỏng</button>}
      {signedIn && <div className="ux-utility-menu"><button className="ux-utility-trigger" aria-expanded={utilityOpen} aria-label="Mở chức năng quản lý" onClick={() => setUtilityOpen((value) => !value)}>•••</button>{utilityOpen && <div className="ux-utility-popover" role="menu"><button role="menuitem" onClick={() => navigate("Dashboard")}>Dashboard</button>{hasAdmin && <button role="menuitem" onClick={() => navigate("Quản trị")}>Quản trị</button>}</div>}</div>}
    </>, topActions)}

    {banner && !bannerDismissed && createPortal(<button className="ux-banner-close" aria-label="Ẩn lưu ý môi trường mô phỏng" onClick={dismissBanner}>×</button>, banner)}

    {scenarioPanel && createPortal(<div className="ux-scenario-tools"><label><span>Lọc độ khó</span><select defaultValue="Tất cả" aria-label="Lọc độ khó" onChange={(event) => selectDifficulty(event.target.value)}><option>Tất cả</option><option>Dễ</option><option>Trung bình</option><option>Khó</option><option>Rất khó</option></select></label><button className="ux-random" onClick={() => domReady && document.querySelector<HTMLButtonElement>(".random-button")?.click()}><span aria-hidden="true">🎲</span><span>Ngẫu nhiên</span></button></div>, scenarioPanel)}

    {statusGrid && createPortal(<div className="ux-status-progress"><span aria-hidden="true">✓</span><span><small>Tiến trình</small><strong>{completed}/{total || "—"}</strong></span></div>, statusGrid)}

    {stage && active === "Thử thách" && createPortal(<><div className="ux-stage-actions"><button className="ux-scenario-trigger" onClick={() => setScenariosOpen(true)}><span aria-hidden="true">☰</span> Danh sách tình huống</button><button className="ux-insight-trigger" onClick={() => setInsightOpen(true)}><span aria-hidden="true">💡</span> Mẹo & tiến trình</button></div>{!signedIn && completed >= 3 && !guestPromptDismissed && <aside className="ux-guest-conversion" role="note"><div><span aria-hidden="true">🎯</span><span><strong>Bạn đã có tiến trình đáng để lưu</strong><small>Tạo tài khoản để giữ kết quả trên nhiều thiết bị và nhận chứng nhận khi hoàn thành.</small></span></div><div><button className="ux-primary" onClick={openRegistration}>Lưu tiến trình</button><button className="ux-text-button" onClick={() => setGuestPromptDismissed(true)}>Tiếp tục với tư cách khách</button></div></aside>}</>, stage)}

    {feedback && createPortal(<div className="ux-learning-moment"><div className="ux-learning-heading"><span aria-hidden="true">{feedbackDanger ? "⚠" : "✓"}</span><strong>{feedbackDanger ? "Dấu hiệu bạn cần ghi nhớ" : "Vì sao cách xử lý này an toàn"}</strong></div>{flags.length > 0 && <ul>{flags.map((flag) => <li key={flag}>{flag}</li>)}</ul>}{tip && <div className="ux-principle"><b>Nguyên tắc áp dụng ngoài đời</b><span>{tip}</span></div>}</div>, feedback)}

    {knowledgeHero && createPortal(<button className="ux-practice-cta" onClick={() => navigate("Thực hành tương tác")}><span aria-hidden="true">▶</span> Luyện nhận diện phishing</button>, knowledgeHero)}

    <nav className="ux-bottom-nav" aria-label="Điều hướng di động">
      {PRIMARY_VIEWS.map((item) => (
        <button
          key={item}
          className={active === item ? "active" : ""}
          aria-current={active === item ? "page" : undefined}
          aria-expanded={item === "Cẩm nang" ? mobileKnowledgeOpen : undefined}
          onClick={() => item === "Cẩm nang" ? setMobileKnowledgeOpen((value) => !value) : navigate(item)}
        >
          <span aria-hidden="true">{{ "Thử thách": "◇", "Cẩm nang": "▤", "Tin tức": "◫", "Thành tích": "★", "Thực hành": "▶" }[item]}</span>
          <small>{item}</small>
        </button>
      ))}
      {mobileKnowledgeOpen && (
        <div className="ux-mobile-knowledge-menu" role="menu" aria-label="Cẩm nang">
          <button type="button" role="menuitem" onClick={openKnowledgeArticles}>
            <strong>Bài viết kiến thức</strong>
            <small>Hướng dẫn, cảnh báo và nội dung tra cứu</small>
          </button>
          <button type="button" role="menuitem" onClick={openKnowledgeChecklist}>
            <strong>Danh sách kiểm tra</strong>
            <small>Tự kiểm tra an toàn số và lưu tiến độ</small>
          </button>
        </div>
      )}
    </nav>

    {scenariosOpen && <><button className="ux-drawer-backdrop" aria-label="Đóng danh sách tình huống" onClick={() => setScenariosOpen(false)} /><button className="ux-drawer-close ux-scenario-close" aria-label="Đóng danh sách tình huống" onClick={() => setScenariosOpen(false)}>×</button></>}
    {insightOpen && <><button className="ux-drawer-backdrop ux-insight-backdrop" aria-label="Đóng bảng mẹo và tiến trình" onClick={() => setInsightOpen(false)} /><button className="ux-drawer-close ux-insight-close" aria-label="Đóng bảng mẹo và tiến trình" onClick={() => setInsightOpen(false)}>×</button></>}
  </>;
}
