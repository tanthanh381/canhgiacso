"use client";

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { defaultSiteContent, Difficulty, normalizeSiteContent, SiteContent } from "./data";
import { NewsArticleView } from './news-article';
import { publicNews, safeImage } from './news-content';
import { supabase } from "./supabase";
import { difficultyOrder, getLevelProgress, getUnlockedDifficulties } from "./progression";
import { downloadTrainingCertificatePdf, TrainingCertificate } from "./certificate";
import { authErrorMessage } from "./auth-error";
import { SECURITY_CHECKLIST_KEY, securityChecklistItemIds } from "./domains/security-awareness/checklist";
import { KnowledgeView } from "./domains/security-awareness/view";
import { validateAuthSubmission, type AuthMode, type SessionAccount } from "./domains/auth/model";
import { mapAnalyticsUsers, mapScenarioRisks, summarizeAnalytics, topScenarioRisks, type AnalyticsUser, type DashboardStatus, type ScenarioRisk } from "./domains/dashboard/model";
import { DashboardView } from "./domains/dashboard/view";
import { bestCorrectStreak, buildDefenseBadges, difficulties, difficultyTone, PHISHING_QUIZ_URL, scenarioCategoryLabel, scenarioChannelLabel } from "./domains/training/presentation";
import { evaluateGuestChoice, type ChoiceOutcome, type GameHistory, type GameState, type PendingChoice, type Result, type StoredProgress } from "./domains/training/model";
import { GUEST_CERTIFICATE_KEY, LEGACY_PROGRESS_KEY, THEME_KEY, progressKey, readStoredProgress, safeStorageGet, safeStorageRemove, safeStorageSet } from "./shared/browser-storage";
import { BadgeIcon, BrandMark, FooterNotice, Modal } from "./shared/ui-primitives";
import { canChangeHash, navigateBrowser, restoreHash, routeFromHash, SIMULATION_BANNER_VIEWS, type View } from "./domains/shell/navigation";

const AdminPage = lazy(() => import("./admin").then((module) => ({ default: module.AdminPage })));

const money = new Intl.NumberFormat("vi-VN");
export default function Home() {
  const [view, setView] = useState<View>("game");
  const [siteContent, setSiteContent] = useState<SiteContent>(defaultSiteContent);
  const [contentReady, setContentReady] = useState(false);
  const [selectedId, setSelectedId] = useState(1);
  const [difficulty, setDifficulty] = useState<"Tất cả" | Difficulty>("Tất cả");
  const [query, setQuery] = useState("");
  const [newsQuery, setNewsQuery] = useState("");
  const [newsCategory, setNewsCategory] = useState("Tất cả");
  const [balance, setBalance] = useState(300_000_000);
  const [awareness, setAwareness] = useState(100);
  const [results, setResults] = useState<Result[]>([]);
  const [answer, setAnswer] = useState<number | null>(null);
  const [answerOutcome, setAnswerOutcome] = useState<ChoiceOutcome | null>(null);
  const [dark, setDark] = useState(false);
  const [guide, setGuide] = useState(false);
  const [completedChecklistIds, setCompletedChecklistIds] = useState<string[]>([]);
  const [checklistReady, setChecklistReady] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [guestLimitOpen, setGuestLimitOpen] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authDisplayName, setAuthDisplayName] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authConfirmPassword, setAuthConfirmPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [lossNotice, setLossNotice] = useState<LossNotice | null>(null);
  const [sessionAccount, setSessionAccount] = useState<SessionAccount | null>(null);
  const [dataStatus, setDataStatus] = useState("");
  const [analyticsUsers, setAnalyticsUsers] = useState<AnalyticsUser[]>([]);
  const [dashboardStatus, setDashboardStatus] = useState<DashboardStatus>("idle");
  const [dashboardScenarioRisks, setDashboardScenarioRisks] = useState<ScenarioRisk[]>([]);
  const [historySummary, setHistorySummary] = useState({ runs: 0, attempts: 0, correct: 0, legacyAttempts: 0 });
  const [playerName, setPlayerName] = useState("Người chơi ẩn danh");
  const [hydrated, setHydrated] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);
  const [certificates, setCertificates] = useState<TrainingCertificate[]>([]);
  const [completionCertificate, setCompletionCertificate] = useState<TrainingCertificate | null>(null);
  const [certificateDownloading, setCertificateDownloading] = useState(false);
  const [pendingChoice, setPendingChoice] = useState<PendingChoice | null>(null);
  const [savingChoice, setSavingChoice] = useState(false);
  const saveLock = useRef(false);
  const accountEpoch = useRef(0);
  const activeUser = useRef<string | null>(null);
  const scenarios = siteContent.scenarios;
  const knowledgeCards = siteContent.knowledgeCards;
  const newsArticles = useMemo(() => publicNews(siteContent.newsArticles), [siteContent.newsArticles]);
  const [newsSlug, setNewsSlug] = useState('');
  const readingArticle = newsArticles.find(article => (article.slug || article.id) === newsSlug);
  useEffect(() => {
    if (!readingArticle) return;
    const oldTitle = document.title;
    const meta = document.querySelector('meta[name="description"]');
    const oldDescription = meta?.getAttribute('content') ?? '';
    document.title = readingArticle.seoTitle || readingArticle.title;
    meta?.setAttribute('content', readingArticle.metaDescription || readingArticle.summary);
    return () => { document.title = oldTitle; meta?.setAttribute('content', oldDescription); };
  }, [readingArticle]);

  useEffect(() => {
    if (dataStatus !== "Đã xác nhận và lưu kết quả.") return;
    const timer = window.setTimeout(() => setDataStatus(""), 2400);
    return () => window.clearTimeout(timer);
  }, [dataStatus]);

  useEffect(() => {
    const loadFrame = window.requestAnimationFrame(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(SECURITY_CHECKLIST_KEY) ?? "[]");
        if (Array.isArray(saved)) {
          const validIds = saved.filter((id): id is string => typeof id === "string" && securityChecklistItemIds.has(id));
          setCompletedChecklistIds([...new Set(validIds)]);
        }
      } catch {
        setCompletedChecklistIds([]);
      } finally {
        setChecklistReady(true);
      }
    });
    return () => window.cancelAnimationFrame(loadFrame);
  }, []);

  useEffect(() => {
    if (!checklistReady) return;
    safeStorageSet(SECURITY_CHECKLIST_KEY, JSON.stringify(completedChecklistIds));
  }, [checklistReady, completedChecklistIds]);

  useEffect(() => {
    let previousHash = window.location.hash;
    const syncHash = () => {
      const nextHash = window.location.hash;
      if (!canChangeHash(previousHash, nextHash)) {
        restoreHash(previousHash);
        return;
      }
      previousHash = nextHash;
      const route = routeFromHash(nextHash);
      setNewsSlug(route.newsSlug);
      setView(route.view);
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data, error } = await supabase.rpc("get_public_site_content");
      if (!active) return;
      const normalized = normalizeSiteContent(data);
      if (normalized) {
        setSiteContent(normalized);
      } else if (error) {
        setDataStatus("Không tải được nội dung cập nhật; đang dùng thư viện tích hợp sẵn.");
      }
      setContentReady(true);
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session?.user) await loadRemoteAccount(data.session.user.id, data.session.user.email ?? "");
      else loadGuestProgress();
      if (active) setHydrated(true);
    };
    void load();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "SIGNED_OUT") {
        setSessionAccount(null);
        loadGuestProgress();
        return;
      }
      if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session?.user) {
        if (activeUser.current !== session.user.id || event === "USER_UPDATED") {
          activeUser.current = session.user.id;
          window.setTimeout(() => { if (active && activeUser.current === session.user.id) void loadRemoteAccount(session.user.id, session.user.email ?? ""); }, 0);
        }
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  // Supabase is a singleton and these loader functions intentionally read the
  // latest browser state when auth emits an event.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    safeStorageSet(THEME_KEY, dark ? "dark" : "light");
    if (!sessionAccount && !activeUser.current) safeStorageSet(progressKey(null), JSON.stringify({ balance, awareness, results, dark, playerName }));
  }, [balance, awareness, results, dark, playerName, hydrated, sessionAccount]);

  useEffect(() => {
    if (view !== "dashboard") return;
    if (!sessionAccount) return;
    let active = true;
    void (async () => {
      await Promise.resolve();
      if (!active) return;
      setDashboardStatus("loading");
      const [{ data, error }, historical] = await Promise.all([
        supabase.rpc("get_ciso_dashboard"), supabase.rpc("get_training_history_summary"),
      ]);
      if (!active) return;
      if (error?.code === "42501") {
        setDashboardStatus("forbidden");
        return;
      }
      if (error || historical.error || !data || typeof data !== "object") {
        setDashboardStatus("error");
        return;
      }
      const payload = data as { users?: Array<Record<string, unknown>>; scenarios?: Array<Record<string, unknown>> };
      setHistorySummary(historical.data);
      setAnalyticsUsers(mapAnalyticsUsers(payload.users ?? []));
      setDashboardScenarioRisks(mapScenarioRisks(payload.scenarios ?? []));
      setDashboardStatus("ready");
    })();
    return () => { active = false; };
  }, [view, sessionAccount]);

  const completedIds = useMemo(
    () => new Set(results.map((result) => result.scenarioId)),
    [results],
  );
  const safeIds = useMemo(
    () => new Set(results.filter((result) => result.correct).map((result) => result.scenarioId)),
    [results],
  );
  const unlockedDifficulties = getUnlockedDifficulties(scenarios, completedIds);
  const availableScenarios = scenarios.filter((item) => unlockedDifficulties.has(item.difficulty));
  const selectedCandidate = scenarios.find((item) => item.id === selectedId);
  const selected = selectedCandidate && unlockedDifficulties.has(selectedCandidate.difficulty)
    ? selectedCandidate
    : availableScenarios[0] ?? scenarios[0];
  const levelProgress = getLevelProgress(scenarios, completedIds, unlockedDifficulties);
  const incompleteUnlockedScenarios = availableScenarios.filter((item) => !completedIds.has(item.id));
  const randomCandidates = incompleteUnlockedScenarios.length ? incompleteUnlockedScenarios : availableScenarios;
  const evidence = scenarios.filter((item) => safeIds.has(item.id));
  const score = results.reduce((total, result) => total + (result.correct ? 120 : 20), 0);
  const analytics = useMemo(() => summarizeAnalytics(analyticsUsers), [analyticsUsers]);
  const scenarioRisks = useMemo(
    () => topScenarioRisks(scenarios, dashboardScenarioRisks),
    [dashboardScenarioRisks, scenarios],
  );

  const filtered = useMemo(() => scenarios.filter((item) => {
    const matchesDifficulty = difficulty === "Tất cả" || item.difficulty === difficulty;
    const needle = query.trim().toLowerCase();
    const matchesQuery = !needle || `${item.title} ${item.category} ${item.channel}`.toLowerCase().includes(needle);
    return matchesDifficulty && matchesQuery;
  }), [difficulty, query, scenarios]);

  const newsCategories = useMemo(() => ["Tất cả", ...Array.from(new Set(newsArticles.map((article) => article.category)))], [newsArticles]);
  const visibleNews = useMemo(() => {
    const needle = newsQuery.trim().toLocaleLowerCase("vi");
    return [...newsArticles]
      .filter((article) => (newsCategory === "Tất cả" || article.category === newsCategory)
        && (!needle || `${article.title} ${article.summary} ${article.sourceName}`.toLocaleLowerCase("vi").includes(needle)))
      .sort((a, b) => Number(b.featured) - Number(a.featured) || b.publishedAt.localeCompare(a.publishedAt));
  }, [newsArticles, newsCategory, newsQuery]);

  const streak = useMemo(() => bestCorrectStreak(results), [results]);
  const defenseBadges = useMemo(
    () => buildDefenseBadges(safeIds, results.length, streak, scenarios.length),
    [results.length, safeIds, scenarios.length, streak],
  );
  const unlockedBadgeCount = defenseBadges.filter((badge) => badge.unlocked).length;
  const badgePreview = defenseBadges.some((badge) => !badge.unlocked)
    ? defenseBadges.filter((badge) => !badge.unlocked).sort((a, b) => b.progress - a.progress || a.target - b.target).slice(0, 4)
    : defenseBadges.slice(-4);

  function applyProgress(progress: StoredProgress, displayName = progress.playerName) {
    setBalance(progress.balance);
    setAwareness(progress.awareness);
    setResults(progress.results);
    setDark(safeStorageGet(THEME_KEY) === "dark" || progress.dark);
    setPlayerName(displayName || "Người chơi ẩn danh");
    setAnswer(null);
    setAnswerOutcome(null);
    setLossNotice(null);
    setSelectedId(1);
    setDifficulty("Tất cả");
    setQuery("");
    if (window.location.hash !== "#/admin" && !window.location.hash.startsWith("#/news")) setView("game");
  }

  function loadGuestProgress() {
    accountEpoch.current += 1;
    activeUser.current = null;
    setRunId(null);
    setGameHistory([]);
    setCertificates([]);
    setCompletionCertificate(null);
    setPendingChoice(null);
    setDataStatus("");
    setHydrated(true);
    const saved = readStoredProgress(progressKey(null)) ?? readStoredProgress(LEGACY_PROGRESS_KEY) ?? {
      balance: 300_000_000,
      awareness: 100,
      results: [],
      dark: safeStorageGet(THEME_KEY) === "dark",
      playerName: "Người chơi ẩn danh",
    };
    setSessionAccount(null);
    applyProgress(saved);
  }

  function applyGameState(state: GameState) {
    setRunId(state.run_id);
    setBalance(state.balance);
    setAwareness(state.awareness);
    setResults(state.results);
    setGameHistory(state.history);
  }

  async function loadRemoteAccount(userId: string, email: string) {
    const epoch = ++accountEpoch.current;
    activeUser.current = userId;
    setHydrated(false);
    setSessionAccount(null);
    setResults([]);
    setBalance(300_000_000);
    setAwareness(100);
    setGameHistory([]);
    setRunId(null);
    setPendingChoice(null);
    setDataStatus("Đang đồng bộ dữ liệu…");
    const [profileResult, progressResult, certificateResult] = await Promise.all([
      supabase.from("profiles").select("username, display_name, created_at").eq("id", userId).single(),
      supabase.rpc("get_game_state"),
      supabase.rpc("get_my_training_certificates"),
    ]);
    if (epoch !== accountEpoch.current) return;
    if (profileResult.error || progressResult.error || !progressResult.data) {
      setDataStatus("Không thể tải dữ liệu tài khoản. Vui lòng đăng nhập lại.");
      return;
    }
    const profile = profileResult.data;
    const state = progressResult.data as GameState;
    const progress: StoredProgress = {
      balance: state.balance,
      awareness: state.awareness,
      results: state.results,
      dark: safeStorageGet(THEME_KEY) === "dark",
      playerName: profile.display_name,
    };

    setSessionAccount({
      id: userId,
      email,
      username: profile.username,
      displayName: profile.display_name,
      createdAt: profile.created_at,
    });
    applyProgress(progress, profile.display_name);
    applyGameState(state);
    setCertificates(!certificateResult.error && Array.isArray(certificateResult.data) ? certificateResult.data as TrainingCertificate[] : []);
    setCompletionCertificate(null);
    setHydrated(true);
    try {
      const saved = localStorage.getItem(`khien-so-pending:${userId}`);
      const pending = saved ? JSON.parse(saved) as PendingChoice : null;
      if (pending?.userId === userId && pending.runId === state.run_id && pending.scenario && Number.isInteger(pending.index)) {
        setPendingChoice(pending);
        setDataStatus("Có câu trả lời đang chờ xác nhận. Chọn Thử lưu lại để đồng bộ.");
      } else setDataStatus("");
    } catch { setDataStatus(""); }
  }

  function chooseScenario(id: number) {
    const target = scenarios.find((item) => item.id === id);
    if (!target) return;
    if (!unlockedDifficulties.has(target.difficulty)) {
      const targetIndex = difficultyOrder.indexOf(target.difficulty);
      const blockingDifficulty = difficultyOrder.slice(0, targetIndex).find((level) =>
        scenarios.some((item) => item.difficulty === level && !completedIds.has(item.id)),
      ) ?? difficultyOrder[Math.max(0, targetIndex - 1)];
      const blockingScenarios = scenarios.filter((item) => item.difficulty === blockingDifficulty);
      const blockingCompleted = blockingScenarios.filter((item) => completedIds.has(item.id)).length;
      setDataStatus(`Cấp ${target.difficulty} đang khóa. Hoàn thành ${blockingCompleted}/${blockingScenarios.length} thử thách ${blockingDifficulty} để mở khóa.`);
      window.setTimeout(() => setDataStatus(""), 3200);
      return;
    }
    setSelectedId(id);
    setAnswer(null);
    setAnswerOutcome(null);
    navigateTo("game");
    if (window.innerWidth < 1050) document.querySelector(".stage")?.scrollIntoView({ behavior: "smooth" });
  }

  function navigateTo(nextView: View) {
    if (!navigateBrowser(view, nextView)) return;
    setNewsSlug("");
    setView(nextView);
  }

  function toggleChecklistItem(id: string) {
    setCompletedChecklistIds((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]);
  }

  async function submitChoice(index: number) {
    if (!hydrated || !contentReady || resetBusy || saveLock.current || pendingChoice || answer !== null || completedIds.has(selected.id)) return;
    if (activeUser.current) {
      if (!sessionAccount || !runId) { setDataStatus("Vui lòng chờ tải xong dữ liệu tài khoản."); return; }
      const pending = { userId: sessionAccount.id, runId, scenario: selected, index };
      try { localStorage.setItem(`khien-so-pending:${sessionAccount.id}`, JSON.stringify(pending)); }
      catch { setDataStatus("Không thể lưu tạm câu trả lời trên thiết bị. Hãy cho phép lưu trữ và thử lại."); return; }
      setPendingChoice(pending);
      await syncChoice(pending);
      return;
    }
    // Guest gameplay is intentionally local. The published scenario payload
    // already contains the scoring deltas used to render the exercise, so an
    // anonymous learner should not depend on a network RPC just to select an
    // answer. Authenticated attempts continue to use submit_game_choice so
    // server-side progress and certificates remain authoritative.
    const outcome = evaluateGuestChoice(selected, index);
    if (!outcome) {
      setDataStatus("Không tìm thấy lựa chọn này. Vui lòng tải lại trang và thử lại.");
      return;
    }
    const nextBalance = Math.max(0, balance + outcome.moneyDelta);
    const nextAwareness = Math.max(0, Math.min(100, awareness + outcome.awarenessDelta));
    const nextResults = [...results, { scenarioId: selected.id, correct: outcome.correct, choiceIndex: index }];
    setAnswer(index);
    setAnswerOutcome(outcome);
    setBalance(nextBalance);
    setAwareness(nextAwareness);
    setResults(nextResults);
    if (nextResults.length >= scenarios.length) {
      const guestCertificate = getOrCreateGuestCertificate(nextResults);
      setCompletionCertificate(guestCertificate);
      setDataStatus("Bạn đã hoàn thành khóa đào tạo. Bản ghi nhận PDF đã sẵn sàng.");
    }
    if (!outcome.correct) {
      setLossNotice({
        scenarioTitle: selected.title,
        amountLost: Math.max(0, -outcome.moneyDelta),
        awarenessLost: Math.max(0, -outcome.awarenessDelta),
        balanceAfter: nextBalance,
      });
    }
  }

  async function syncChoice(pending: PendingChoice) {
    if (saveLock.current || activeUser.current !== pending.userId) return;
    saveLock.current = true;
    setSavingChoice(true);
    const epoch = accountEpoch.current;
    setDataStatus("Đang xác nhận và lưu kết quả…");
    try {
      const { data, error } = await supabase.rpc("submit_game_choice", {
        expected_run: pending.runId, scenario_id: pending.scenario.id,
        choice_index: pending.index,
      });
      if (epoch !== accountEpoch.current) return;
      if (error || !data) {
        if (error?.code === "22023") {
          safeStorageRemove(`khien-so-pending:${pending.userId}`);
          setPendingChoice(null);
          setDataStatus("Nội dung hoặc lượt chơi đã thay đổi. Vui lòng tải lại trang trước khi trả lời.");
        } else setDataStatus("Chưa xác nhận được kết quả. Câu trả lời đã được giữ trên thiết bị; hãy thử lưu lại khi có mạng.");
        return;
      }
      const state = data as GameState;
      const result = state.results.find((item) => item.scenarioId === pending.scenario.id);
      applyGameState(state);
      setSelectedId(pending.scenario.id);
      setAnswer(result?.choiceIndex ?? null);
      setAnswerOutcome(state.outcome ?? null);
      if (result && !result.correct) setLossNotice({ scenarioTitle: pending.scenario.title,
        amountLost: Math.max(0, -(state.outcome?.moneyDelta ?? 0)), awarenessLost: Math.max(0, -(state.outcome?.awarenessDelta ?? 0)), balanceAfter: state.balance });
      safeStorageRemove(`khien-so-pending:${pending.userId}`);
      setPendingChoice(null);
      if (state.results.length >= scenarios.length) await refreshCertificates(pending.runId);
      else setDataStatus("Đã xác nhận và lưu kết quả.");
    } catch { if (epoch === accountEpoch.current) setDataStatus("Chưa xác nhận được kết quả. Vui lòng thử lưu lại khi có mạng."); }
    finally { saveLock.current = false; setSavingChoice(false); }
  }

  async function resetProgress() {
    if (resetBusy || saveLock.current || pendingChoice) return;
    setResetBusy(true);
    if (sessionAccount) {
      const epoch = accountEpoch.current;
      const { data, error } = await supabase.rpc("restart_game", { expected_run: runId });
      if (epoch !== accountEpoch.current) { setResetBusy(false); return; }
      if (error || !data) {
        setDataStatus("Chưa xác nhận được lượt chơi mới. Vui lòng thử lại để tải trạng thái chính xác.");
        setResetBusy(false);
        setResetConfirmOpen(false);
        return;
      }
      applyGameState(data as GameState);
      setAnswer(null); setAnswerOutcome(null); setLossNotice(null); setSelectedId(scenarios[0].id); setView("game");
      setResetBusy(false); setResetConfirmOpen(false);
      setDataStatus("Đã mở lượt chơi mới. Lịch sử lượt trước được giữ lại.");
      return;
    }
    setBalance(300_000_000);
    setAwareness(100);
    setResults([]);
    setCompletionCertificate(null);
    try { localStorage.removeItem(GUEST_CERTIFICATE_KEY); } catch { /* ignore storage restrictions */ }
    setAnswer(null);
    setAnswerOutcome(null);
    setLossNotice(null);
    setSelectedId(1);
    setView("game");
    setResetBusy(false);
    setResetConfirmOpen(false);
  }

  function resetAuthForm() {
    setAuthEmail("");
    setAuthUsername("");
    setAuthDisplayName("");
    setAuthPassword("");
    setAuthConfirmPassword("");
    setAuthError("");
    setAuthNotice("");
    setAuthBusy(false);
  }

  function closeAuth() {
    resetAuthForm();
    setAuthOpen(false);
  }

  function openAuth(mode: AuthMode) {
    resetAuthForm();
    setAuthMode(mode);
    setAuthOpen(true);
  }

  function dismissGuestLimitNotice() {
    setGuestLimitOpen(false);
  }

  function openAuthFromGuestNotice(mode: AuthMode) {
    dismissGuestLimitNotice();
    openAuth(mode);
  }

  function switchAuthMode(mode: AuthMode) {
    resetAuthForm();
    setAuthMode(mode);
  }

  async function continueAsGuest() {
    await supabase.auth.signOut({ scope: "local" });
    setSessionAccount(null);
    loadGuestProgress();
    dismissGuestLimitNotice();
    closeAuth();
  }

  async function submitAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    setAuthNotice("");

    const validation = validateAuthSubmission({
      mode: authMode,
      email: authEmail,
      username: authUsername,
      displayName: authDisplayName,
      password: authPassword,
      confirmPassword: authConfirmPassword,
    });
    if (!validation.ok) {
      setAuthError(validation.error);
      return;
    }

    const { email, username, displayName } = validation;
    setAuthBusy(true);
    try {
      if (authMode === "register") {
        await supabase.auth.signOut({ scope: "local" });
        const { data, error } = await supabase.auth.signUp({
          email,
          password: authPassword,
          options: {
            data: { username, display_name: displayName },
          },
        });
        if (error) {
          setAuthError(authErrorMessage(error, "register"));
          return;
        }
        if (data.session && data.user) {
          await loadRemoteAccount(data.user.id, data.user.email ?? email);
          closeAuth();
        } else {
          setAuthPassword("");
          setAuthConfirmPassword("");
          setAuthNotice("Tài khoản đã được tạo. Bạn có thể đăng nhập ngay mà không cần xác nhận email.");
        }
      } else {
        await supabase.auth.signOut({ scope: "local" });
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: authPassword });
        if (error || !data.user) {
          setAuthError(authErrorMessage(error ?? {}, "login"));
          return;
        }
        await loadRemoteAccount(data.user.id, data.user.email ?? email);
        closeAuth();
      }
    } catch {
      setAuthError("Không thể kết nối dịch vụ tài khoản. Vui lòng thử lại.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function closeProfile() {
    const displayName = playerName.trim() || "Người chơi ẩn danh";
    setPlayerName(displayName);
    if (sessionAccount) {
      const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("id", sessionAccount.id);
      if (error) setDataStatus("Không thể lưu tên hiển thị.");
      else setSessionAccount({ ...sessionAccount, displayName });
    }
    setProfileOpen(false);
  }

  async function logout() {
    if (view === "admin" && !window.dispatchEvent(new Event("admin-before-leave", { cancelable: true }))) return;
    await supabase.auth.signOut({ scope: "local" });
    setSessionAccount(null);
    setCertificates([]);
    setCompletionCertificate(null);
    loadGuestProgress();
    setProfileOpen(false);
  }

  async function refreshCertificates(celebrateRunId?: string) {
    if (!sessionAccount) return;
    const { data, error } = await supabase.rpc("get_my_training_certificates");
    if (error || !Array.isArray(data)) {
      setDataStatus("Đã hoàn thành khóa đào tạo nhưng chưa tải được thông tin chứng nhận. Vui lòng thử lại.");
      return;
    }
    const nextCertificates = data as TrainingCertificate[];
    setCertificates(nextCertificates);
    if (celebrateRunId) {
      const issued = nextCertificates.find((item) => item.runId === celebrateRunId);
      if (issued) {
        setCompletionCertificate(issued);
        setDataStatus("Đã hoàn thành khóa đào tạo và được cấp chứng nhận.");
        return;
      }
    }
    setDataStatus("Đã cập nhật thông tin chứng nhận.");
  }

  async function ensureCurrentCertificate() {
    if (!sessionAccount || !runId) return;
    setDataStatus("Đang xác nhận điều kiện cấp chứng nhận…");
    const { data, error } = await supabase.rpc("issue_training_certificate", { expected_run: runId });
    if (error || !data) {
      setDataStatus(error?.code === "22023" ? "Bạn cần hoàn thành toàn bộ tình huống trước khi nhận chứng nhận." : "Chưa thể cấp chứng nhận. Vui lòng thử lại.");
      return;
    }
    await refreshCertificates(runId);
  }

  function getOrCreateGuestCertificate(sourceResults: Result[] = results): TrainingCertificate {
    const scenarioIds = new Set(scenarios.map((scenario) => scenario.id));
    const validResults = sourceResults.filter((result) => scenarioIds.has(result.scenarioId));
    const completed = new Set(validResults.map((result) => result.scenarioId)).size;
    const correct = new Set(validResults.filter((result) => result.correct).map((result) => result.scenarioId)).size;
    const accuracy = scenarios.length ? Math.round((correct / scenarios.length) * 100) : 0;
    const guestScore = validResults.reduce((total, result) => total + (result.correct ? 120 : 20), 0);
    const rating: TrainingCertificate["rating"] = accuracy >= 90 ? "XUẤT SẮC" : accuracy >= 80 ? "TỐT" : accuracy >= 70 ? "ĐẠT" : "ĐẠT CƠ BẢN";

    try {
      const stored = localStorage.getItem(GUEST_CERTIFICATE_KEY);
      if (stored) {
        const existing = JSON.parse(stored) as TrainingCertificate;
        if (existing?.certificateCode?.startsWith("CGS-GUEST-")
          && existing.scenarioTotal === scenarios.length
          && existing.completed === completed
          && existing.correct === correct
          && existing.displayName === (playerName.trim() || "Người chơi ẩn danh")) return existing;
      }
    } catch { /* create a new local certificate below */ }

    const certificateId = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const certificate: TrainingCertificate = {
      certificateId,
      certificateCode: `CGS-GUEST-${certificateId.replaceAll("-", "").slice(0, 10).toUpperCase()}`,
      runId: "guest-local",
      issuedAt: new Date().toISOString(),
      displayName: playerName.trim() || "Người chơi ẩn danh",
      username: "khach",
      scenarioTotal: scenarios.length,
      completed,
      correct,
      accuracy,
      score: guestScore,
      rating,
    };
    try { localStorage.setItem(GUEST_CERTIFICATE_KEY, JSON.stringify(certificate)); } catch { /* download still works */ }
    return certificate;
  }

  async function downloadCertificate(certificate: TrainingCertificate) {
    if (certificateDownloading) return;
    setCertificateDownloading(true);
    try {
      await downloadTrainingCertificatePdf(certificate, siteContent.certificateTemplate);
      setDataStatus("Đã tạo chứng nhận PDF trên thiết bị của bạn.");
    } catch {
      setDataStatus("Không thể tạo file PDF trên trình duyệt này. Vui lòng thử lại.");
    } finally {
      setCertificateDownloading(false);
    }
  }

  function nextScenario() {
    if (results.length >= scenarios.length) {
      if (sessionAccount) {
        const issued = runId ? certificates.find((item) => item.runId === runId) : null;
        if (issued) setCompletionCertificate(issued);
        else void ensureCurrentCertificate();
      } else {
        setCompletionCertificate(getOrCreateGuestCertificate());
      }
      return;
    }
    const remaining = availableScenarios.find((item) => !completedIds.has(item.id));
    const fallback = availableScenarios[0] ?? scenarios[0];
    if (remaining || fallback) chooseScenario((remaining ?? fallback).id);
  }

  function exportCisoReport() {
    const header = ["Tên hiển thị", "Tên đăng nhập", "Ngày đăng ký", "Đã hoàn thành", "Chính xác (%)", "Cảnh giác (%)", "Tổn thất (VND)", "Mức rủi ro"];
    const escapeCell = (value: string | number) => {
      const text = String(value);
      const safe = typeof value === "string" && /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
      return `"${safe.replaceAll('"', '""')}"`;
    };
    const rows = analyticsUsers.map((user) => [
      user.displayName,
      user.username,
      new Date(user.createdAt).toLocaleDateString("vi-VN"),
      user.completed,
      user.accuracy,
      user.awareness,
      user.loss,
      user.risk,
    ]);
    const csv = `\uFEFF${[header, ...rows].map((row) => row.map(escapeCell).join(",")).join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `bao-cao-canh-giac-so-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const currentCertificate = runId ? certificates.find((item) => item.runId === runId) ?? null : null;
  const latestCertificate = currentCertificate ?? certificates[0] ?? null;
  const previousResult = results.find((result) => result.scenarioId === selected.id);
  const selectedAnswer = answer ?? previousResult?.choiceIndex ?? null;
  const selectedOutcome = selectedAnswer === null ? null
    : answerOutcome?.scenarioId === selected.id && answerOutcome.choiceIndex === selectedAnswer
      ? answerOutcome
      : previousResult
        ? { scenarioId: selected.id, choiceIndex: previousResult.choiceIndex, correct: previousResult.correct, moneyDelta: 0, awarenessDelta: 0,
            feedback: previousResult.correct ? "Lựa chọn này đã được máy chủ xác nhận là an toàn." : "Lựa chọn này đã được máy chủ xác nhận là có rủi ro." }
        : null;
  const visibleDashboardStatus: DashboardStatus = sessionAccount ? dashboardStatus : "forbidden";
  const showGuestLimitNotice = guestLimitOpen && hydrated && !sessionAccount && !authOpen;

  return (
    <main className={dark ? "app dark" : "app"}>
      <header className="topbar">
        <button className="brand" onClick={() => navigateTo("game")} aria-label="Cảnh Giác Số — về màn chơi">
          <BrandMark />
          <span className="brand-divider" aria-hidden="true" />
          <span className="product-lockup"><strong>{siteContent.copy.productName}</strong><small>{siteContent.copy.departmentName}</small></span>
        </button>
        <nav aria-label="Điều hướng chính">
          <button aria-current={view === "game" ? "page" : undefined} className={view === "game" ? "active" : ""} onClick={() => navigateTo("game")}>Thử thách</button>
          <details className="knowledge-menu">
            <summary aria-label="Mở menu Cẩm nang" aria-current={view === "knowledge" ? "page" : undefined} className={view === "knowledge" ? "active" : ""}>Cẩm nang</summary>
            <div className="knowledge-submenu" role="group" aria-label="Cẩm nang">
              <button type="button" onClick={() => window.location.assign("/kien-thuc/")}><strong>Bài viết kiến thức</strong><small>Hướng dẫn, cảnh báo và nội dung tra cứu</small></button>
              <button type="button" onClick={() => { document.querySelector<HTMLDetailsElement>(".knowledge-menu")?.removeAttribute("open"); navigateTo("knowledge"); window.setTimeout(() => document.getElementById("security-checklist-title")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80); }}><strong>Danh sách kiểm tra</strong><small>Tự kiểm tra an toàn số và lưu tiến độ</small></button>
            </div>
          </details>
          <button aria-current={view === "news" ? "page" : undefined} className={view === "news" ? "active" : ""} onClick={() => navigateTo("news")}>Tin tức</button>
          <button aria-current={view === "quiz" ? "page" : undefined} className={view === "quiz" ? "active" : ""} onClick={() => navigateTo("quiz")}>Thực hành tương tác</button>
          <button aria-current={view === "stats" ? "page" : undefined} className={view === "stats" ? "active" : ""} onClick={() => navigateTo("stats")}>Thành tích</button>
          <button aria-current={view === "dashboard" ? "page" : undefined} className={view === "dashboard" ? "active" : ""} onClick={() => navigateTo("dashboard")}>Dashboard</button>
          {sessionAccount && <button aria-current={view === "admin" ? "page" : undefined} className={view === "admin" ? "active" : ""} onClick={() => navigateTo("admin")}>Quản trị</button>}
        </nav>
        <div className="top-actions">
          <button className="icon-button" aria-pressed={dark} onClick={() => setDark((value) => !value)} aria-label="Đổi chế độ sáng tối">{dark ? "☀" : "☾"}</button>
          {sessionAccount ? (
            <button className="profile-button" onClick={() => setProfileOpen(true)} aria-label={`Mở tài khoản của ${playerName}`}><span>{playerName.trim().slice(0, 1).toUpperCase() || "N"}</span>{playerName}</button>
          ) : (
            <div className="auth-actions">
              <button className="guest-badge guest-badge-button" type="button" onClick={() => setGuestLimitOpen(true)}>Khách</button>
              <button className="login-button" onClick={() => openAuth("login")}>Đăng nhập</button>
              <button className="signup-button" onClick={() => openAuth("register")}>Đăng ký</button>
            </div>
          )}
        </div>
      </header>
      {SIMULATION_BANNER_VIEWS.has(view) && <div className="security-awareness-banner" role="note">
        <strong>Môi trường mô phỏng</strong>
        <span>Không nhập mật khẩu ngân hàng, OTP, số thẻ hoặc dữ liệu thật. Mọi số tiền chỉ dùng cho đào tạo.</span>
      </div>}
      {(dataStatus || pendingChoice) && <div className="sync-status">
        {dataStatus && <span role="status" aria-live="polite">{dataStatus}</span>}
        {pendingChoice && <button className="admin-secondary" disabled={savingChoice} onClick={() => void syncChoice(pendingChoice)}>{savingChoice ? "Đang lưu…" : "Thử lưu lại"}</button>}
      </div>}

      {view === "game" && (
        <div className="game-shell">
          <aside className="scenario-panel">
            <div className="panel-heading">
              <div><span className="eyebrow">{siteContent.copy.libraryEyebrow}</span><h1>{siteContent.copy.libraryTitle}</h1></div>
              <span className="scenario-count">{safeIds.size}/{scenarios.length}</span>
            </div>
            <div className="search-box"><span>⌕</span><input aria-label="Tìm kịch bản" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tên, kênh..." /></div>
            <div className="difficulty-filter" aria-label="Lọc độ khó">
              {difficulties.map((item) => {
                const locked = item !== "Tất cả" && !unlockedDifficulties.has(item);
                return <button key={item} aria-pressed={difficulty === item} className={difficulty === item ? "active" : ""} disabled={locked} title={locked ? `Hoàn thành cấp thấp hơn để mở ${item}` : undefined} onClick={() => setDifficulty(item)}>{locked ? "🔒 " : ""}{item}</button>;
              })}
            </div>
            <div className="unlock-progress" role="status" aria-live="polite">
              <div><span aria-hidden="true">{levelProgress.nextDifficulty ? "🔓" : "🏆"}</span><strong>Cấp đang mở: {levelProgress.currentDifficulty}</strong></div>
              <small>{levelProgress.nextDifficulty
                ? `Hoàn thành ${levelProgress.completed}/${levelProgress.total} thử thách ${levelProgress.currentDifficulty} để mở ${levelProgress.nextDifficulty}.`
                : "Bạn đã mở khóa toàn bộ cấp độ."}</small>
              <div className="unlock-progress-bar"><i style={{ width: `${levelProgress.total ? Math.round((levelProgress.completed / levelProgress.total) * 100) : 100}%` }} /></div>
            </div>
            <div className="scenario-list">
              {filtered.map((item) => {
                const unlocked = unlockedDifficulties.has(item.difficulty);
                const completed = completedIds.has(item.id);
                const correct = safeIds.has(item.id);
                return (
                  <button key={item.id} aria-pressed={selected.id === item.id} aria-disabled={!unlocked} disabled={!unlocked} onClick={() => chooseScenario(item.id)} className={`scenario-item ${selected.id === item.id ? "selected" : ""} ${!unlocked ? "locked" : ""}`}>
                    <span className={`scenario-number ${correct ? "done" : completed ? "attempted" : !unlocked ? "locked" : ""}`}>{correct ? "✓" : completed ? "•" : !unlocked ? "🔒" : String(item.id).padStart(2, "0")}</span>
                    <span className="scenario-copy"><strong>{item.title}</strong><small>{unlocked ? `${scenarioChannelLabel(item.channel)} · ${scenarioCategoryLabel(item.category)}` : `Cấp ${item.difficulty} · Hoàn thành cấp thấp hơn để mở khóa`}</small></span>
                    <span className={`difficulty-dot ${difficultyTone[item.difficulty]}`} title={unlocked ? item.difficulty : `${item.difficulty} · Đang khóa`}></span>
                  </button>
                );
              })}
              {!filtered.length && <p className="empty-state">Không tìm thấy tình huống phù hợp.</p>}
            </div>
            <button className="random-button" disabled={!randomCandidates.length} onClick={() => {
              const item = randomCandidates[Math.floor(Math.random() * randomCandidates.length)];
              if (item) chooseScenario(item.id);
            }}>⤨ Chọn tình huống đã mở ngẫu nhiên</button>
          </aside>

          <section className="stage">
            {!sessionAccount && <div className="guest-mode-note" role="note"><span><b>Đang tham gia với tư cách khách</b><small>Không cần tài khoản · Kết quả chỉ lưu trên thiết bị này</small></span><button onClick={() => openAuth("register")}>Đăng ký để lưu lượt chơi mới</button></div>}
            <div className="status-grid">
              <div className="status-card"><BadgeIcon>₫</BadgeIcon><span><small>Tài sản an toàn</small><strong>{money.format(balance)}đ</strong></span></div>
              <div className="status-card"><BadgeIcon>⌁</BadgeIcon><span className="status-value"><small>Mức cảnh giác</small><strong>{awareness}%</strong><span className="meter" aria-hidden="true"><i style={{ width: `${awareness}%` }} /></span></span></div>
              <div className="status-card compact"><BadgeIcon>◆</BadgeIcon><span><small>Điểm phòng vệ</small><strong>{score}</strong></span></div>
              <button className="status-card compact evidence-link" onClick={() => setView("evidence")}><BadgeIcon>▤</BadgeIcon><span><small>Chứng cứ</small><strong>{evidence.length}</strong></span></button>
            </div>

            {(balance === 0 || awareness === 0) ? (
              <section className="game-over card-surface">
                <span className="giant-icon">!</span><span className="eyebrow">PHÒNG TUYẾN ĐÃ VỠ</span>
                <h2>Bạn đã để kẻ gian chiếm ưu thế</h2><p>Không sao — mỗi lần nhận ra một dấu hiệu là thêm một lớp bảo vệ ngoài đời thật.</p>
                <button className="primary-button" onClick={() => setResetConfirmOpen(true)}>Bắt đầu hành trình mới</button>
              </section>
            ) : (
              <section className="scenario-stage card-surface">
                <div className="scenario-meta"><span className={`level-pill ${difficultyTone[selected.difficulty]}`}>{selected.difficulty}</span><span>{scenarioChannelLabel(selected.channel)}</span><span>{scenarioCategoryLabel(selected.category)}</span></div>
                <div className="scenario-title-row"><span className="scenario-hero-icon">{selected.icon}</span><div><span className="eyebrow">TÌNH HUỐNG {String(selected.id).padStart(2, "0")}</span><h2>{selected.title}</h2></div></div>
                <div className="story-box"><span className="quote-mark">“</span><p>{selected.story}</p></div>
                <div className="red-flags"><strong>Dấu hiệu cần quan sát</strong><div>{selected.redFlags.map((flag) => <span key={flag}>△ {flag}</span>)}</div></div>
                <h3 className="decision-title">Bạn sẽ xử lý thế nào?</h3>
                <div className="choice-list">
                  {selected.choices.map((choice, index) => {
                    const isChosen = selectedAnswer === index;
                    const state = selectedAnswer === null ? "" : isChosen ? (selectedOutcome?.correct ? "correct" : "wrong") : "disabled";
                    return <button key={choice.text} className={`choice ${state}`} onClick={() => submitChoice(index)} disabled={!hydrated || !contentReady || savingChoice || !!pendingChoice || resetBusy || selectedAnswer !== null}>
                      <span className="choice-letter">{String.fromCharCode(65 + index)}</span><span>{choice.text}</span>{isChosen && <b>{selectedOutcome?.correct ? "✓" : "×"}</b>}
                    </button>;
                  })}
                </div>
                {selectedAnswer !== null && selectedOutcome && (
                  <div role="status" aria-live="polite" className={`feedback ${selectedOutcome.correct ? "success" : "danger"}`}>
                    <div><strong>Dấu hiệu cần lưu ý</strong><p>{selectedOutcome.feedback}</p><small>{selectedOutcome.correct ? "Lựa chọn an toàn." : "Lựa chọn có rủi ro."} Mẹo ghi nhớ: {selected.tip}</small></div>
                    <button onClick={nextScenario}>{results.length >= scenarios.length ? "Xem chứng nhận PDF →" : "Kịch bản tiếp theo →"}</button>
                  </div>
                )}
              </section>
            )}
          </section>

          <aside className="insight-panel">
            <div className="coach-card">
              <span className="eyebrow">{siteContent.copy.coachEyebrow}</span><h3>Ghi nhớ trong tình huống này</h3><p>{selected.tip}</p>
              <button onClick={() => setGuide(true)}>Xem quy tắc 3 bước</button>
            </div>
            <div className="progress-card">
              <div className="section-title"><span><small>TIẾN TRÌNH</small><strong>{Math.round((safeIds.size / scenarios.length) * 100)}%</strong></span></div>
              <div className="ring" style={{ "--progress": `${(safeIds.size / scenarios.length) * 360}deg` } as React.CSSProperties}><span>{safeIds.size}<small>an toàn</small></span></div>
              <div className="mini-stats"><span><strong>{streak}</strong> chuỗi tốt nhất</span><span><strong>{unlockedBadgeCount}</strong> / {defenseBadges.length} huy hiệu</span></div>
            </div>
            <div className="badge-card">
              <div className="section-title"><h3>Huy hiệu gần nhất</h3><button onClick={() => setView("stats")}>Xem tất cả</button></div>
              <div className="badge-preview">{badgePreview.map((badge) => <span className={badge.unlocked ? "unlocked" : ""} key={badge.name} title={`${badge.name} · ${badge.current}/${badge.target}`} style={{ "--badge-progress": `${badge.progress * 3.6}deg` } as React.CSSProperties}><i>{badge.icon}</i></span>)}</div>
            </div>
            <button className="emergency-card" onClick={() => setGuide(true)}><span>!</span><div><strong>Đã lỡ chuyển tiền?</strong><small>Mở hướng dẫn xử lý khẩn cấp</small></div><b>→</b></button>
          </aside>
        </div>
      )}

      {view === "knowledge" && (
        <KnowledgeView
          copy={siteContent.copy}
          knowledgeCards={knowledgeCards}
          completedChecklistIds={completedChecklistIds}
          onToggleChecklistItem={toggleChecklistItem}
        />
      )}

      {view === "news" && (
        <section className="content-page news-page">
          <div className="page-hero news-hero">
            <div><span className="eyebrow">{siteContent.copy.newsEyebrow}</span><h1>{siteContent.copy.newsTitle}</h1></div>
            <p>{siteContent.copy.newsIntro}</p>
          </div>
          {newsSlug ? <><button className="admin-secondary" onClick={() => { window.location.hash = '/news'; setNewsSlug(''); }}>← Tất cả tin tức</button>{readingArticle ? <NewsArticleView article={readingArticle} /> : <p>Không tìm thấy bài viết hoặc bài chưa được xuất bản.</p>}</> : <>
          <div className="news-tools" aria-label="Tìm và lọc tin tức">
            <label className="news-search"><span aria-hidden="true">⌕</span><input value={newsQuery} onChange={(event) => setNewsQuery(event.target.value)} placeholder="Tìm theo tiêu đề, nội dung, nguồn…" aria-label="Tìm tin tức" /></label>
            <div className="news-filters" aria-label="Lọc theo chủ đề">{newsCategories.map((category) => <button key={category} className={newsCategory === category ? "active" : ""} aria-pressed={newsCategory === category} onClick={() => setNewsCategory(category)}>{category}</button>)}</div>
          </div>
          <div className="news-grid">
            {visibleNews.map((article, index) => (
              <article key={article.id} className={article.featured && index === 0 ? "news-card featured" : "news-card"}>
                {article.thumbnail && safeImage(article.thumbnail) && <img className="news-card-thumbnail" src={article.thumbnail} alt={article.thumbnailAlt || ''} loading="lazy" />}
                <div className="news-meta"><span>{article.category}</span><time dateTime={article.publishedAt}>{new Date(`${article.publishedAt}T00:00:00Z`).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" })}</time></div>
                <h2><a href={`#/news/${article.slug || article.id}`}>{article.title}</a></h2>
                <p>{article.summary}</p>
                <div className="news-source"><a href={`#/news/${article.slug || article.id}`}>Đọc bài</a>{article.sourceUrl && <><span>Nguồn: <strong>{article.sourceName}</strong></span><a href={article.sourceUrl} target="_blank" rel="noopener noreferrer">Đọc tại nguồn <span aria-hidden="true">↗</span></a></>}</div>
              </article>
            ))}
          </div>
          {!visibleNews.length && <div className="news-empty"><strong>Không tìm thấy tin phù hợp.</strong><button onClick={() => { setNewsQuery(""); setNewsCategory("Tất cả"); }}>Xóa bộ lọc</button></div>}
          <p className="news-disclaimer">Cảnh Giác Số chỉ tóm tắt nội dung nhằm mục đích nâng cao nhận thức. Thông tin đầy đủ và cập nhật nhất nằm tại liên kết nguồn của từng bài.</p></>}
        </section>
      )}


      {view === "quiz" && (
        <section className="content-page quiz-page">
          <div className="page-hero quiz-hero">
            <span className="eyebrow">THỰC HÀNH TƯƠNG TÁC · JIGSAW / GOOGLE</span>
            <h1>Trắc nghiệm email lừa đảo</h1>
            <p>Kiểm tra khả năng nhận diện email và trang đăng nhập giả mạo ngay trên Cảnh Giác Số. Bài thực hành được tải trực tiếp từ Jigsaw/Google.</p>
          </div>
          <div className="knowledge-safety-note quiz-safety-note"><strong>Lưu ý an toàn</strong><span>Không nhập mật khẩu ngân hàng, OTP, số thẻ hoặc dữ liệu thật trong bài thực hành.</span></div>
          <div className="phishing-quiz-shell quiz-standalone-shell">
            <div className="phishing-quiz-toolbar"><span><i aria-hidden="true" /> Bài thực hành bên thứ ba</span><a href={PHISHING_QUIZ_URL} target="_blank" rel="noopener noreferrer">Mở tab riêng ↗</a></div>
            <iframe
              src={PHISHING_QUIZ_URL}
              title="Trắc nghiệm email lừa đảo của Jigsaw / Google"
              loading="lazy"
              referrerPolicy="no-referrer"
              sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            />
          </div>
          <p className="phishing-quiz-fallback">Nếu trình duyệt hoặc chính sách của Google chặn nội dung nhúng, hãy <a href={PHISHING_QUIZ_URL} target="_blank" rel="noopener noreferrer">mở bài trắc nghiệm trong tab mới ↗</a>.</p>
        </section>
      )}

      {view === "stats" && (
        <section className="content-page stats-page">
          <div className="page-hero"><span className="eyebrow">HỒ SƠ PHÒNG VỆ</span><h1>{playerName}</h1><p>{sessionAccount ? "Tiến bộ của bạn được đồng bộ an toàn giữa các thiết bị." : "Đăng nhập để đồng bộ tiến bộ giữa các thiết bị."}</p></div>
          <div className="stats-overview"><article><small>Kịch bản đã thử</small><strong>{results.length}</strong><span>/ {scenarios.length}</span></article><article><small>Xử lý an toàn</small><strong>{safeIds.size}</strong><span>{results.length ? Math.round((safeIds.size / results.length) * 100) : 0}% chính xác</span></article><article><small>Điểm phòng vệ</small><strong>{score}</strong><span>cấp {Math.floor(score / 500) + 1}</span></article><article><small>Tài sản còn lại</small><strong className="money-stat">{money.format(balance)}đ</strong><span>bảo toàn {Math.round((balance / 300_000_000) * 100)}%</span></article></div>
          {sessionAccount ? (
            latestCertificate ? (
              <article className="training-certificate-card issued">
                <span className="certificate-card-mark" aria-hidden="true">HD</span>
                <div className="certificate-card-copy">
                  <span className="eyebrow">{currentCertificate ? "CHỨNG CHỈ LƯỢT HIỆN TẠI" : "CHỨNG CHỈ GẦN NHẤT"}</span>
                  <h2>Chứng nhận hoàn thành Cảnh Giác Số</h2>
                  <p>{latestCertificate.displayName} · Xếp loại <strong>{latestCertificate.rating}</strong> · Tỷ lệ đúng {latestCertificate.accuracy}%</p>
                  <small>Mã chứng nhận {latestCertificate.certificateCode} · Cấp ngày {new Date(latestCertificate.issuedAt).toLocaleDateString("vi-VN")}</small>
                </div>
                <button className="primary-button certificate-download" disabled={certificateDownloading} onClick={() => void downloadCertificate(latestCertificate)}>{certificateDownloading ? "Đang tạo PDF…" : "⇩ Tải chứng nhận PDF"}</button>
              </article>
            ) : (
              <article className={`training-certificate-card ${results.length >= scenarios.length ? "ready" : "locked"}`}>
                <span className="certificate-card-mark" aria-hidden="true">{results.length >= scenarios.length ? "✓" : "◇"}</span>
                <div className="certificate-card-copy"><span className="eyebrow">CHỨNG CHỈ HOÀN THÀNH</span><h2>{results.length >= scenarios.length ? "Khóa đào tạo đã hoàn thành" : "Hoàn thành khóa để mở chứng nhận"}</h2><p>{results.length >= scenarios.length ? "Kết quả đã đủ điều kiện. Xác nhận với máy chủ để cấp chứng nhận PDF." : `Tiến độ hiện tại ${results.length}/${scenarios.length} tình huống.`}</p></div>
                {results.length >= scenarios.length && <button className="primary-button certificate-download" onClick={() => void ensureCurrentCertificate()}>Cấp chứng nhận</button>}
              </article>
            )
          ) : (
            <article className={`training-certificate-card ${results.length >= scenarios.length ? "ready" : "locked"}`}>
              <span className="certificate-card-mark" aria-hidden="true">{results.length >= scenarios.length ? "✓" : "◇"}</span>
              <div className="certificate-card-copy"><span className="eyebrow">BẢN GHI NHẬN HOÀN THÀNH</span><h2>{results.length >= scenarios.length ? "Khóa đào tạo đã hoàn thành" : "Bản ghi nhận sẽ mở khi hoàn thành khóa"}</h2><p>{results.length >= scenarios.length ? "Bạn có thể tải PDF ngay ở chế độ khách. Bản này lưu cục bộ và không thay thế chứng nhận nội bộ đã xác minh của tài khoản đăng nhập." : `Tiến độ hiện tại ${results.length}/${scenarios.length} tình huống.`}</p></div>
              {results.length >= scenarios.length && <button className="primary-button certificate-download" disabled={certificateDownloading} onClick={() => void downloadCertificate(getOrCreateGuestCertificate())}>{certificateDownloading ? "Đang tạo PDF…" : "⇩ Tải bản ghi nhận PDF"}</button>}
            </article>
          )}
          <div className="achievement-section">
            <div className="achievement-heading"><div><span className="eyebrow">BỘ SƯU TẬP CHUYÊN MÔN</span><h2>Huy hiệu phòng vệ</h2><p>Mỗi huy hiệu phản ánh một kỹ năng hoặc cột mốc có thể kiểm chứng từ kết quả của bạn.</p></div><div className="achievement-summary"><strong>{unlockedBadgeCount}/{defenseBadges.length}</strong><span>đã mở khoá</span></div></div>
            <div className="achievement-grid">{defenseBadges.map((badge) => <article className={`${badge.unlocked ? "unlocked" : ""} tone-${badge.tone}`} key={badge.name} aria-label={`${badge.name}: ${badge.unlocked ? "đã mở khoá" : `${badge.current} trên ${badge.target}`}`}><span className="achievement-icon">{badge.icon}</span><div className="achievement-copy"><div className="achievement-name"><strong>{badge.name}</strong><em>{badge.tier}</em></div><p>{badge.description}</p><div className="achievement-progress"><i style={{ width: `${badge.progress}%` }} /><span>{badge.unlocked ? "Đã mở khoá" : `${badge.current}/${badge.target}`}</span></div></div></article>)}</div>
          </div>
          <button className="reset-button" disabled={savingChoice || !!pendingChoice || resetBusy} onClick={() => setResetConfirmOpen(true)}>{sessionAccount ? "Bắt đầu lượt chơi mới" : "Đặt lại tiến trình khách"}</button>
          {sessionAccount && <article className="dashboard-card"><h2>Lịch sử lượt chơi</h2><p>Hiển thị tối đa 50 lượt gần nhất. Tiến trình khách được giữ riêng trên thiết bị.</p>{gameHistory.length ? <div className="analytics-table-wrap"><table><thead><tr><th>Kết thúc</th><th>Đã trả lời</th><th>Đúng</th><th>Tài sản còn lại</th></tr></thead><tbody>{gameHistory.map((run) => <tr key={run.runId}><td>{new Date(run.finishedAt).toLocaleString("vi-VN")}</td><td>{run.completed}</td><td>{run.correct}</td><td>{money.format(run.balance)}đ</td></tr>)}</tbody></table></div> : <p>Chưa có lượt chơi đã lưu trữ.</p>}</article>}
        </section>
      )}

      {view === "evidence" && (
        <section className="content-page">
          <button className="back-button" onClick={() => setView("game")}>← Quay lại màn chơi</button>
          <div className="page-hero"><span className="eyebrow">HỘP CHỨNG CỨ</span><h1>Dấu vết bạn đã thu thập</h1><p>Mỗi kịch bản xử lý đúng mở khoá một chứng cứ và một bài học có thể áp dụng ngoài đời.</p></div>
          <div className="evidence-grid">{scenarios.map((item) => <article className={safeIds.has(item.id) ? "unlocked" : ""} key={item.id}><span className="evidence-icon">{safeIds.has(item.id) ? item.icon : "?"}</span><div><small>CHỨNG CỨ {String(item.id).padStart(2, "0")}</small><h2>{safeIds.has(item.id) ? item.evidence : "Chưa xác định"}</h2><p>{safeIds.has(item.id) ? item.tip : "Xử lý an toàn kịch bản này để mở khoá."}</p></div></article>)}</div>
        </section>
      )}

      {view === "dashboard" && (
        <DashboardView
          copy={siteContent.copy}
          account={sessionAccount}
          status={visibleDashboardStatus}
          users={analyticsUsers}
          analytics={analytics}
          historySummary={historySummary}
          scenarioRisks={scenarioRisks}
          scenarioCount={scenarios.length}
          onLogin={() => openAuth("login")}
          onExport={exportCisoReport}
        />
      )}

      {view === "admin" && <Suspense fallback={<section className="content-page admin-page"><div className="dashboard-gate"><h1>Đang mở trang quản trị…</h1><p>Vui lòng chờ trong giây lát.</p></div></section>}><AdminPage
          account={sessionAccount}
          publishedContent={siteContent}
          onLogin={() => openAuth("login")}
          onPublished={(content) => {
            setSiteContent(content);
            setContentReady(true);
            setDataStatus("Nội dung website đã được xuất bản.");
            window.setTimeout(() => setDataStatus(""), 2600);
          }}
        /></Suspense>}

      <footer><div className="footer-brand" aria-label="Cảnh Giác Số"><BrandMark /><span><b>{siteContent.copy.departmentName}</b><small>{siteContent.copy.footerTagline}</small></span></div><FooterNotice notice={siteContent.copy.footerNotice}/><div className="footer-actions"><nav aria-label="Thông tin website"><a href="/gioi-thieu/">Giới thiệu</a><a href="/phuong-phap-kiem-chung/">Kiểm chứng</a><a href="/quyen-rieng-tu/">Quyền riêng tư</a></nav><button onClick={() => setGuide(true)}>Hướng dẫn & trợ giúp</button></div></footer>

      {completionCertificate && !lossNotice && <Modal open onClose={() => setCompletionCertificate(null)} labelledBy="certificate-complete-title" className="certificate-complete-modal">
        <button className="modal-close" aria-label="Đóng thông báo chứng nhận" onClick={() => setCompletionCertificate(null)}>×</button>
        <span className="certificate-complete-symbol" aria-hidden="true">✓</span>
        <span className="eyebrow">HOÀN THÀNH KHÓA ĐÀO TẠO</span>
        <h2 id="certificate-complete-title">{completionCertificate.certificateCode.startsWith("CGS-GUEST-") ? "Chúc mừng, bạn đã hoàn thành khóa đào tạo" : "Chúc mừng, chứng nhận của bạn đã được cấp"}</h2>
        <p>Bạn đã hoàn thành {completionCertificate.completed}/{completionCertificate.scenarioTotal} tình huống với tỷ lệ đúng <strong>{completionCertificate.accuracy}%</strong> và xếp loại <strong>{completionCertificate.rating}</strong>. {completionCertificate.certificateCode.startsWith("CGS-GUEST-") && <span>Bản PDF chế độ khách chỉ là bản ghi nhận trên thiết bị, không phải chứng nhận nội bộ đã xác minh.</span>}</p>
        <div className="certificate-complete-code"><small>{completionCertificate.certificateCode.startsWith("CGS-GUEST-") ? "Mã bản ghi nhận" : "Mã chứng nhận"}</small><strong>{completionCertificate.certificateCode}</strong></div>
        <div className="certificate-complete-actions"><button className="primary-button" disabled={certificateDownloading} onClick={() => void downloadCertificate(completionCertificate)}>{certificateDownloading ? "Đang tạo PDF…" : completionCertificate.certificateCode.startsWith("CGS-GUEST-") ? "⇩ Tải bản ghi nhận PDF" : "⇩ Tải chứng nhận PDF"}</button><button className="admin-secondary" onClick={() => { setCompletionCertificate(null); setView("stats"); }}>Xem thành tích</button></div>
      </Modal>}

      {lossNotice && <Modal open onClose={() => setLossNotice(null)} labelledBy="loss-notice-title" className="loss-modal">
        <button className="modal-close" aria-label="Đóng cảnh báo tổn thất" onClick={() => setLossNotice(null)}>×</button>
        <span className="loss-symbol" aria-hidden="true">!</span>
        <span className="eyebrow">CẢNH BÁO TỪ CẢNH GIÁC SỐ</span>
        <h2 id="loss-notice-title">{lossNotice.amountLost > 0 ? "Tài sản vừa bị tổn thất" : "Mức cảnh giác vừa giảm"}</h2>
        <p className="loss-context">Lựa chọn trong tình huống “{lossNotice.scenarioTitle}” đã tạo hậu quả:</p>
        <div className="loss-summary">
          <div className={lossNotice.amountLost > 0 ? "has-loss" : ""}><small>Tài sản bị trừ</small><strong>{lossNotice.amountLost > 0 ? `−${money.format(lossNotice.amountLost)}đ` : "0đ"}</strong></div>
          <div className={lossNotice.awarenessLost > 0 ? "has-loss" : ""}><small>Cảnh giác giảm</small><strong>{lossNotice.awarenessLost > 0 ? `−${lossNotice.awarenessLost}%` : "0%"}</strong></div>
        </div>
        <div className="remaining-balance"><span>Tài sản còn lại</span><strong>{money.format(lossNotice.balanceAfter)}đ</strong></div>
        <p className="loss-reminder">Dừng lại, kiểm tra bằng kênh độc lập và không tiếp tục chuyển tiền khi đang bị thúc ép.</p>
        <button className="primary-button loss-confirm" onClick={() => setLossNotice(null)}>Đã hiểu hậu quả</button>
      </Modal>}

      <Modal open={guide} onClose={() => setGuide(false)} labelledBy="guide-title" className="response-guide-modal"><button className="modal-close" aria-label="Đóng hướng dẫn" onClick={() => setGuide(false)}>×</button><span className="modal-symbol">H</span><span className="eyebrow">HDBANK · IT SECURITY</span><h2 id="guide-title">Dừng — Khóa — Báo</h2><ol><li><b>01</b><div><strong>Dừng tương tác</strong><p>Không chuyển thêm tiền, không cài ứng dụng, không chia sẻ màn hình, mật khẩu hoặc OTP.</p></div></li><li><b>02</b><div><strong>Chặn tổn thất</strong><p>Nếu đã chuyển tiền hoặc lộ thông tin, tự mở ứng dụng hoặc liên hệ ngân hàng qua kênh chính thức để yêu cầu hỗ trợ, khóa dịch vụ cần thiết.</p></div></li><li><b>03</b><div><strong>Lưu bằng chứng và báo cáo</strong><p>Lưu số điện thoại, liên kết, tin nhắn và mã giao dịch; trình báo cơ quan công an gần nhất. Cuộc gọi có dấu hiệu lừa đảo có thể phản ánh tới 156 hoặc 5656.</p></div></li></ol><p className="guide-disclaimer">Không tin dịch vụ “thu hồi tiền” yêu cầu nộp phí trước. Hướng dẫn này phục vụ đào tạo và không thay thế quy trình xử lý sự cố của tổ chức.</p><button className="primary-button" onClick={() => setGuide(false)}>Tôi đã hiểu</button></Modal>

      <Modal open={showGuestLimitNotice} onClose={dismissGuestLimitNotice} labelledBy="guest-limit-title" className="guest-limit-modal">
        <button className="modal-close" aria-label="Đóng thông báo chế độ khách" onClick={dismissGuestLimitNotice}>×</button>
        <span className="modal-symbol">K</span>
        <span className="eyebrow">CHẾ ĐỘ KHÁCH</span>
        <h2 id="guest-limit-title">Bạn đang sử dụng với tính năng giới hạn</h2>
        <p className="guest-limit-intro">Bạn vẫn có thể làm thử thách ngay, nhưng kết quả chỉ lưu trên thiết bị hiện tại và có thể mất khi xóa dữ liệu trình duyệt.</p>
        <div className="guest-limit-grid" aria-label="So sánh chế độ khách và tài khoản">
          <article><strong>Khách</strong><span>Lưu tiến trình cục bộ, nhận bản ghi nhận PDF cục bộ và không đồng bộ giữa các thiết bị.</span></article>
          <article><strong>Tài khoản</strong><span>Đồng bộ tiến trình, lưu lịch sử lượt chơi, dùng chứng nhận đã xác minh và mở đầy đủ tính năng theo quyền được cấp.</span></article>
        </div>
        <div className="guest-limit-actions">
          <button className="primary-button" onClick={() => openAuthFromGuestNotice("register")}>Tạo tài khoản</button>
          <button className="admin-secondary" onClick={() => openAuthFromGuestNotice("login")}>Đăng nhập</button>
          <button className="guest-continue" type="button" onClick={dismissGuestLimitNotice}>Tiếp tục với tư cách khách</button>
        </div>
      </Modal>

      <Modal open={authOpen} onClose={closeAuth} labelledBy="auth-title" className="auth-modal">
        <button className="modal-close" aria-label="Đóng đăng nhập" onClick={closeAuth}>×</button>
        <span className="modal-symbol">H</span>
        <span className="eyebrow">CẢNH GIÁC SỐ · TÀI KHOẢN ĐỒNG BỘ</span>
        <div className="auth-tabs" aria-label="Chọn hình thức tài khoản">
          <button type="button" aria-pressed={authMode === "login"} className={authMode === "login" ? "active" : ""} onClick={() => switchAuthMode("login")}>Đăng nhập</button>
          <button type="button" aria-pressed={authMode === "register"} className={authMode === "register" ? "active" : ""} onClick={() => switchAuthMode("register")}>Đăng ký</button>
        </div>
        <h2 id="auth-title">{authMode === "login" ? "Chào mừng trở lại" : "Tạo hồ sơ phòng vệ"}</h2>
        <p className="auth-intro">Đăng nhập để lưu kết quả và tiếp tục trên thiết bị khác. Tài khoản mới được sử dụng ngay, không cần xác nhận email. Tiến trình khách được giữ riêng trên thiết bị và không tự chuyển vào tài khoản. Không sử dụng mật khẩu ngân hàng thật.</p>
        <form className="auth-form" onSubmit={submitAuth}>
          {authMode === "register" && <label><span>Tên hiển thị</span><input autoComplete="name" value={authDisplayName} maxLength={32} onChange={(event) => setAuthDisplayName(event.target.value)} placeholder="Ví dụ: Minh An" /></label>}
          {authMode === "register" && <label><span>Tên đăng nhập</span><input autoComplete="username" value={authUsername} minLength={3} maxLength={24} onChange={(event) => setAuthUsername(event.target.value)} placeholder="tanthanh381" autoCapitalize="none" spellCheck={false} /></label>}
          <label><span>Email</span><input type="email" autoComplete="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="email@example.com" autoCapitalize="none" spellCheck={false} /></label>
          <label><span>Mật khẩu</span><input type="password" autoComplete={authMode === "login" ? "current-password" : "new-password"} value={authPassword} minLength={8} maxLength={72} onChange={(event) => setAuthPassword(event.target.value)} placeholder={authMode === "register" ? "Hoa, thường, số và ký tự đặc biệt" : "Ít nhất 8 ký tự"} /></label>
          {authMode === "register" && <label><span>Xác nhận mật khẩu</span><input type="password" autoComplete="new-password" value={authConfirmPassword} onChange={(event) => setAuthConfirmPassword(event.target.value)} placeholder="Nhập lại mật khẩu" /></label>}
          {authError && <p className="auth-error" role="alert">{authError}</p>}
          {authNotice && <p className="auth-notice" role="status">{authNotice}</p>}
          <button className="primary-button auth-submit" type="submit" disabled={authBusy}>{authBusy ? "Đang bảo vệ tài khoản…" : authMode === "login" ? "Đăng nhập" : "Tạo tài khoản"}</button>
          <div className="auth-or" aria-hidden="true"><span>hoặc</span></div>
          <button className="guest-continue" type="button" onClick={continueAsGuest}>Tiếp tục với tư cách khách</button>
        </form>
      </Modal>

      <Modal open={profileOpen} onClose={closeProfile} labelledBy="profile-title" className="profile-modal"><button className="modal-close" aria-label="Đóng hồ sơ" onClick={closeProfile}>×</button><span className="eyebrow">TÀI KHOẢN ĐÃ ĐĂNG NHẬP</span><h2 id="profile-title">Hồ sơ của bạn</h2><p className="account-username">@{sessionAccount?.username} · {sessionAccount?.email}</p><label className="profile-name-field"><span>Tên hiển thị</span><input aria-label="Tên hiển thị" value={playerName} maxLength={32} onChange={(event) => setPlayerName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void closeProfile(); }} /></label><div className="profile-actions"><button className="primary-button" onClick={closeProfile}>Lưu thay đổi</button><button className="logout-button" onClick={logout}>Đăng xuất</button></div><p className="profile-note">Tiến trình được đồng bộ an toàn và phiên cũ trên trình duyệt được xoá khi đổi tài khoản.</p></Modal>

      <Modal open={resetConfirmOpen} onClose={() => { if (!resetBusy) setResetConfirmOpen(false); }} labelledBy="reset-confirm-title" className="reset-confirm-modal">
        <button className="modal-close" aria-label="Đóng xác nhận đặt lại" disabled={resetBusy} onClick={() => setResetConfirmOpen(false)}>×</button>
        <span className="loss-symbol" aria-hidden="true">!</span>
        <span className="eyebrow">XÁC NHẬN CHƠI LẠI</span>
        <h2 id="reset-confirm-title">Bắt đầu lại từ đầu?</h2>
        <p>{sessionAccount ? "Lượt hiện tại sẽ được lưu vào lịch sử. Lượt mới bắt đầu với tài sản, huy hiệu và chứng cứ ban đầu; kết quả cũ vẫn được giữ để theo dõi quá trình học." : "Toàn bộ kết quả, huy hiệu, chứng cứ và tài sản mô phỏng của khách trên thiết bị này sẽ được đặt lại."}</p>
        {!sessionAccount && <p className="reset-warning">Thao tác này không thể hoàn tác.</p>}
        <div className="reset-confirm-actions">
          <button className="admin-secondary" disabled={resetBusy} onClick={() => setResetConfirmOpen(false)}>Giữ tiến trình</button>
          <button className="danger-button" disabled={resetBusy || savingChoice || !!pendingChoice} onClick={() => void resetProgress()}>{resetBusy ? "Đang đặt lại…" : sessionAccount ? "Lưu lịch sử và chơi lại" : "Xóa và bắt đầu lại"}</button>
        </div>
      </Modal>
    </main>
  );
}
