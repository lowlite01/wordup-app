import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { AppContext, type AppApi } from "./context";
import { STRINGS } from "./i18n";
import type { FlashMode, KeyedWord, Word } from "./types";
import {
  collectWords, progressKey, resetSearchIndex,
} from "./lib/groups";
import {
  clearStatsStorage, loadProgress, loadRecent, loadSettings, loadStats,
  saveProgress, saveRecent, saveSettings, saveStats,
} from "./lib/storage";
import {
  api, getToken, isLoggedIn, progressToEntries, setToken,
  type AuthUser, type Gamification,
} from "./lib/api";
import { awardMastery, loadCrystals, saveCrystals, setProUnlock, unlockTopic as unlockTopicFn } from "./lib/crystals";
import { FREE_IELTS, buy, claimGems, fetchPro, isProActive, loadPro, type ProductId } from "./lib/pro";
import { REFILL_COST, fullHearts, loadHearts, loseOne, regen, saveHearts } from "./lib/hearts";
import { IELTS_TOPICS, ieltsKey } from "./lib/ielts";
const ProScreen = lazy(() => import("./components/ProScreen"));
import HeartsModal from "./components/HeartsModal";
import StreakRescueModal from "./components/StreakRescueModal";
import {
  addCustomList, deleteCustomList as deleteCustomListFn, getCustomLists,
  parseWords, renameCustomList as renameCustomListFn,
} from "./lib/customLists";
import GroupsScreen from "./components/GroupsScreen";
import LevelsScreen from "./components/LevelsScreen";
import IeltsScreen from "./components/IeltsScreen";
import ReviewScreen from "./components/ReviewScreen";
import WordLessonScreen from "./components/WordLessonScreen";
import { clearWordTimes, touchWord } from "./lib/wordTimes";
const PlacementScreen = lazy(() => import("./components/PlacementScreen"));
import LessonScreen from "./components/LessonScreen";
import BasicsLessonScreen from "./components/BasicsLessonScreen";
import PracticeScreen from "./components/PracticeScreen";
import RoadmapPath from "./components/RoadmapPath";
import {
  PATH_VERSION, STEP_REWARD, buildSteps, currentStepIndex, loadPath, migratePath, savePath, type PathState, type Step,
} from "./lib/roadmap";
import Emoji from "./components/Emoji";
import { flyCrystals } from "./lib/crystalFly";
import { askConfirm, haptic, initTelegram, setTelegramBack, setTelegramSettings, showMessage, syncTelegramColors } from "./lib/telegram";
import FlashcardsScreen from "./components/FlashcardsScreen";
import QuizScreen from "./components/QuizScreen";
import WordListScreen from "./components/WordListScreen";
const StatsScreen = lazy(() => import("./components/StatsScreen"));
const GrammarScreen = lazy(() => import("./components/GrammarScreen"));
const PhrasalVerbsScreen = lazy(() => import("./components/PhrasalVerbsScreen"));
const SettingsScreen = lazy(() => import("./components/SettingsScreen"));
const AdminScreen = lazy(() => import("./components/AdminScreen"));
import ContextModal from "./components/ContextModal";
import { loadContent } from "./lib/content";
import { pullState, pushState, startAutoSync } from "./lib/cloudSync";
import {
  FREEZE_COST, MAX_FREEZES, PLAN_BONUS, breakStreak, completeDay, liveStreak, loadPlan, loadStreak, markPlanItem,
  milestoneReward, missedDays, spendFreezes, topUpFreezes,
  savePlan, saveStreak, today,
} from "./lib/dailyPlan";

type Route =
  | { s: "groups" }
  | { s: "levels" }
  | { s: "ielts" }
  | { s: "flash"; mode: FlashMode }
  | { s: "quiz" }
  | { s: "list" }
  | { s: "grammar" }
  | { s: "phrasal" }
  | { s: "stats" }
  | { s: "settings" }
  | { s: "admin" }
  | { s: "placement" }
  | { s: "review" }
  | { s: "wordlesson"; key: string }
  | { s: "path" }
  | { s: "lesson"; id: string }
  | { s: "basics"; id: string }
  | { s: "practice"; id: string }
  | { s: "pro" };

type Origin = "phrasal" | "levels" | "ielts" | "home" | "path" | null;

export default function App() {
  const [progress, setProgress] = useState(loadProgress);
  const [stats, setStats] = useState(loadStats);
  const [recent, setRecent] = useState(loadRecent);
  const [settings, setSettings] = useState(loadSettings);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [gamification, setGamification] = useState<Gamification | null>(null);
  const [route, setRoute] = useState<Route>({ s: "groups" });
  const [groupKey, setGroupKey] = useState("");
  const posFilter = "all"; // study screens show every part of speech
  const [ctxWord, setCtxWord] = useState<Word | null>(null);
  const [nonce, setNonce] = useState(0); // remounts flashcards/quiz on demand
  // Which screen a study session was started from, so Back returns there.
  const [studyOrigin, setStudyOrigin] = useState<Origin>(null);
  const [menuOpen, setMenuOpen] = useState(false); // phone side menu
  const [moreOpen, setMoreOpen] = useState(false); // desktop "More" dropdown
  const [reviewDeck, setReviewDeck] = useState<KeyedWord[]>([]); // words picked in the Review tab
  const [contentVersion, setContentVersion] = useState(0); // bumps on content (re)load
  const [crystals, setCrystals] = useState(loadCrystals);
  const [customVersion, setCustomVersion] = useState(0); // bumps when custom lists change

  // Refs so async login can read the latest local data without stale closures.
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const crystalsRef = useRef(crystals);
  crystalsRef.current = crystals;

  // ---- WordUp Pro + hearts ----
  const [pro, setPro] = useState(loadPro);
  const isPro = isProActive(pro);
  setProUnlock(isPro); // Pro opens every topic
  const mult = isPro ? 2 : 1; // Pro: double crystals
  const [hearts, setHearts] = useState(loadHearts);
  const heartsRef = useRef(hearts);
  heartsRef.current = hearts;
  const [heartsModal, setHeartsModal] = useState(false);
  const addGems = (n: number) => {
    const c = { ...crystalsRef.current, crystals: crystalsRef.current.crystals + n };
    crystalsRef.current = c;
    setCrystals(c);
    saveCrystals(c);
  };
  // hearts grow back over time
  useEffect(() => {
    const id = setInterval(() => {
      const r = regen(heartsRef.current);
      if (r !== heartsRef.current) { saveHearts(r); setHearts(r); }
    }, 30000);
    return () => clearInterval(id);
  }, []);

  // Small pop-up message at the bottom (crystals earned, plan finished…).
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const showToast = (text: string) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };

  // Award crystals whenever a group becomes fully mastered, with a toast.
  useEffect(() => {
    const { state, gained } = awardMastery(crystalsRef.current, progress);
    if (gained) {
      const total = gained * mult;
      const next = { ...state, crystals: state.crystals + total - gained };
      setCrystals(next);
      saveCrystals(next);
      showToast(`🎉 +${total} 💎`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, contentVersion]);

  // ---- Crystals counter in the header ----
  // The header shows `shownCrystals`; when crystals are earned, gems fly from
  // the tap point into the counter and it ticks up as each one lands.
  const crystalPillRef = useRef<HTMLButtonElement>(null);
  const [shownCrystals, setShownCrystals] = useState(crystals.crystals);
  const [pillBump, setPillBump] = useState(0);
  const prevCrystals = useRef(crystals.crystals);
  useEffect(() => {
    const prev = prevCrystals.current;
    const now = crystals.crystals;
    prevCrystals.current = now;
    const pill = crystalPillRef.current;
    if (now <= prev || !pill || !pill.offsetParent) { setShownCrystals(now); return; }
    const gained = now - prev;
    const count = Math.max(3, Math.min(10, gained));
    let hits = 0;
    flyCrystals(gained, pill, () => {
      hits++;
      setShownCrystals(Math.round(prev + (gained * hits) / count));
      setPillBump(b => b + 1);
    }, () => setShownCrystals(now));
  }, [crystals.crystals]);

  // ---- Learning path (roadmap) + placement test ----
  const [path, setPath] = useState<PathState>(() => loadPath("en"));
  const updatePath = (next: PathState) => {
    setPath(next);
    savePath("en", next);
  };
  const steps = useMemo(() => buildSteps(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contentVersion]);
  const currentStep = currentStepIndex(steps, progress, path);
  // paths saved before Basics / Practice existed: keep the learner where they were
  useEffect(() => {
    if (contentVersion > 0 && path.v !== PATH_VERSION) updatePath(migratePath(steps, progress, path));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentVersion, path.v]);
  // Finish a lesson / sentence / chest / trophy step and pay its crystals.
  const completeStep = (id: string) => {
    if (path.done.includes(id)) return;
    updatePath({ ...path, done: [...path.done, id] });
    const kind = steps.find(st => st.id === id)?.kind;
    const bonus = ((kind && STEP_REWARD[kind]) || 3) * mult;
    const c = { ...crystalsRef.current, crystals: crystalsRef.current.crystals + bonus };
    setCrystals(c);
    saveCrystals(c);
    haptic("success");
  };

  // ---- Daily plan + streak ----
  const courseLang = "en"; // English is the only course
  const [plan, setPlan] = useState(() => loadPlan(courseLang, progress, crystals));
  const [streak, setStreak] = useState(loadStreak);
  const planRef = useRef(plan);
  planRef.current = plan;
  const streakRef = useRef(streak);
  streakRef.current = streak;

  // Rebuild/validate the plan when content (re)loads or the course changes.
  useEffect(() => {
    setPlan(loadPlan(courseLang, progressRef.current, crystalsRef.current));
  }, [contentVersion, courseLang]);

  // Close the phone side menu with Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // If the tab stays open past midnight, start a new day when the user comes back.
  useEffect(() => {
    const check = () => {
      if (planRef.current.date !== today()) {
        setPlan(loadPlan(courseLang, progressRef.current, crystalsRef.current));
        setStreak(loadStreak());
      }
    };
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [courseLang]);

  const answerPlan = (key: string, word: string) => {
    const prev = planRef.current;
    const next = markPlanItem(prev, key, word);
    if (next === prev) return;
    planRef.current = next;
    setPlan(next);
    savePlan(courseLang, next);
    if (next.completed && !prev.completed) {
      haptic("success");
      // Day done: extend the streak and give a small crystal bonus.
      const s = completeDay(streakRef.current);
      setStreak(s);
      saveStreak(s);
      const milestone = milestoneReward(s.count) * mult;
      addGems(PLAN_BONUS * mult + milestone);
      // finishing the plan also refills the hearts
      const hadAll = heartsRef.current.count >= 5;
      if (!hadAll) { const h = fullHearts(); saveHearts(h); setHearts(h); }
      void pushState();
      showToast(milestone
        ? t.streakMilestone(s.count, milestone + PLAN_BONUS * mult)
        : `🔥 ${s.count} · +${PLAN_BONUS * mult} 💎${hadAll || isPro ? "" : " · ❤️"}`);
    }
  };
  const statsRef = useRef(stats);
  statsRef.current = stats;

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.lang = settings.lang;
    syncTelegramColors(); // Telegram's header follows our theme
  }, [settings.theme, settings.lang]);

  // Telegram: progress lives in the cloud too. A newer copy (another phone,
  // cleared cache) replaces this device's data, then the app reloads with it.
  useEffect(() => {
    pullState().then(pulled => {
      if (pulled) window.location.reload();
      else startAutoSync();
    });
  }, []);

  // Telegram Mini App: start up + "Settings" in the ⋯ menu.
  useEffect(() => {
    initTelegram();
    syncTelegramColors();
    setTelegramSettings(() => setRoute({ s: "settings" }));
  }, []);

  // Load word content for the chosen course language (falls back to bundled
  // data offline). Re-runs when the user switches course.
  useEffect(() => {
    loadContent(() => setContentVersion(v => v + 1));
  }, []);

  // On load: if we have a saved token, pull the authoritative state from the server.
  useEffect(() => {
    if (!getToken()) return;
    (async () => {
      try {
        const u = await api.me();
        setUser(u);
        const [p, s, g] = await Promise.all([api.getProgress(), api.getStats(), api.gamification()]);
        setProgress(p); saveProgress(p);
        setStats(s); saveStats(s);
        setGamification(g);
      } catch {
        setToken(null);
        setUser(null);
      }
    })();
  }, []);

  const t = STRINGS[settings.lang] ?? STRINGS.en;

  // ---- Pro status from the server (Telegram only) + bought crystals ----
  const refreshPro = async (): Promise<{ active: boolean; gems: number }> => {
    try {
      const r = await fetchPro();
      if (!r) return { active: false, gems: 0 };
      setPro(r.status);
      let gems = 0;
      if (r.gemCredit > 0) {
        gems = await claimGems();
        if (gems > 0) addGems(gems);
      }
      return { active: isProActive(r.status), gems };
    } catch {
      return { active: false, gems: 0 };
    }
  };
  useEffect(() => {
    refreshPro().then(r => { if (r.gems) showToast(`+${r.gems} 💎`); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const purchase = async (product: ProductId) => {
    let status: string;
    try {
      status = await buy(product);
    } catch {
      showMessage(t.payError);
      return;
    }
    if (status === "cancelled") return;
    if (status !== "paid" && status !== "pending") { showMessage(t.payFailed); return; }
    haptic("success");
    // Telegram tells our server a moment later — wait for it.
    let gems = 0;
    for (let i = 0; i < 10; i++) {
      await new Promise(res => setTimeout(res, 1500));
      const r = await refreshPro();
      gems += r.gems;
      const done = product.startsWith("gems") ? gems > 0 : r.active && (product !== "pro_month" || gems > 0 || i >= 3);
      if (done) break;
    }
    showToast(product.startsWith("gems") ? `+${gems} 💎` : t.proThanks);
  };

  // Missed a day? Offer to save the streak with a freeze (or buy one) —
  // nothing is spent without asking. Checked on start and when a day begins.
  const [rescue, setRescue] = useState<string[] | null>(null);
  const updateStreak = (s: typeof streak) => { streakRef.current = s; setStreak(s); saveStreak(s); };
  useEffect(() => {
    let s = topUpFreezes(streakRef.current, isPro);
    if (s !== streakRef.current) updateStreak(s);
    const missed = missedDays(s);
    if (!missed.length) { setRescue(null); return; }
    if (missed.length > MAX_FREEZES) {
      // too long a break to save — start again
      s = breakStreak(s);
      updateStreak(s);
      showToast(t.streakLost);
      return;
    }
    setRescue(missed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPro, plan.date]);

  const api2: AppApi = useMemo(() => ({
    progress,
    setWordState: (rawKey, word, state) => {
      const key = progressKey(rawKey); // path parts store progress on their level
      if (state !== "none") touchWord(key, word);
      setProgress(p => {
        const known = new Set(p.known[key] || []);
        const learning = new Set(p.learning[key] || []);
        known.delete(word);
        learning.delete(word);
        if (state === "known") known.add(word);
        if (state === "learning") learning.add(word);
        const next = {
          known: { ...p.known, [key]: [...known] },
          learning: { ...p.learning, [key]: [...learning] },
        };
        saveProgress(next);
        return next;
      });
      if (isLoggedIn()) {
        api.setWordState(key, word, state)
          .then(r => setGamification(r.gamification))
          .catch(() => { /* offline — local copy already saved */ });
      }
    },
    resetKey: rawKey => setProgress(p => {
      const key = progressKey(rawKey);
      const next = { known: { ...p.known }, learning: { ...p.learning } };
      delete next.known[key];
      delete next.learning[key];
      saveProgress(next);
      return next;
    }),
    // "Start from zero": words, path (placement test again), daily plan,
    // streak, crystals and recent groups — everything the learner earned.
    resetAllProgress: () => {
      const next = { known: {}, learning: {} };
      saveProgress(next);
      setProgress(next);
      if (isLoggedIn()) api.clearProgress().then(() => api.gamification()).then(setGamification).catch(() => {});
      const lang = "en";
      const freshPath: PathState = { placed: null, skippedTest: false, done: [], v: PATH_VERSION };
      savePath(lang, freshPath);
      setPath(freshPath);
      const freshCrystals = { crystals: 20, unlocked: [], awarded: [] };
      saveCrystals(freshCrystals);
      prevCrystals.current = 20; // no "earned" animation for the reset itself
      setCrystals(freshCrystals);
      setShownCrystals(20);
      const freshStreak = { count: 0, best: 0, lastDate: null, days: [] };
      saveStreak(freshStreak);
      setStreak(freshStreak);
      localStorage.removeItem(`wordup-plan-v1-${lang}`);
      setPlan(loadPlan(lang, next, freshCrystals));
      saveRecent([]);
      setRecent([]);
      clearWordTimes();
      setRoute({ s: "placement" });
    },
    stats,
    recordQuiz: (word, picked) => {
      setStats(s => {
        const cur = s[word] || { right: 0, wrong: 0, confused: {} };
        const upd = picked === word
          ? { ...cur, right: cur.right + 1 }
          : {
              ...cur,
              wrong: cur.wrong + 1,
              confused: { ...cur.confused, [picked]: (cur.confused[picked] || 0) + 1 },
            };
        const next = { ...s, [word]: upd };
        saveStats(next);
        return next;
      });
      if (isLoggedIn()) api.recordQuiz(word, picked).catch(() => { /* offline */ });
    },
    clearStats: () => {
      clearStatsStorage();
      setStats({});
      if (isLoggedIn()) api.clearStats().catch(() => {});
    },
    recent,
    recordRecent: key => setRecent(r => {
      const next = [{ key, ts: Date.now() }, ...r.filter(x => x.key !== key)].slice(0, 8);
      saveRecent(next);
      return next;
    }),
    settings,
    updateSettings: s => setSettings(prev => {
      const next = { ...prev, ...s };
      saveSettings(next);
      return next;
    }),
    openContext: w => setCtxWord(w),

    user,
    gamification,
    loginWithGoogle: async (credential: string) => {
      const { token, user: u } = await api.loginWithGoogle(credential);
      setToken(token);
      setUser(u);
      // One-time merge of whatever was learned offline, then adopt server state.
      try {
        await api.syncProgress(progressToEntries(progressRef.current));
        await api.syncStats(statsRef.current);
      } catch { /* ignore merge errors, still load below */ }
      const [p, s, g] = await Promise.all([api.getProgress(), api.getStats(), api.gamification()]);
      setProgress(p); saveProgress(p);
      setStats(s); saveStats(s);
      setGamification(g);
    },
    logout: () => {
      setToken(null);
      setUser(null);
      setGamification(null);
    },
    loadLeaderboard: () => api.leaderboard(),
    refreshContent: () => loadContent(() => setContentVersion(v => v + 1)),
    crystals,
    unlockTopic: (topic: string) => {
      const next = unlockTopicFn(crystalsRef.current, topic);
      if (!next) return false;
      setCrystals(next);
      saveCrystals(next);
      return true;
    },

    plan,
    streak,
    answerPlan,

    pro,
    isPro,
    openPro: () => { setMenuOpen(false); setRoute({ s: "pro" }); },
    purchase,
    hearts,
    loseHeart: () => {
      if (isPro) return;
      const h = loseOne(heartsRef.current);
      heartsRef.current = h;
      saveHearts(h);
      setHearts(h);
      if (h.count === 0) setHeartsModal(true);
    },
    refillHearts: () => {
      if (crystalsRef.current.crystals < REFILL_COST) return false;
      addGems(-REFILL_COST);
      const h = fullHearts();
      saveHearts(h);
      setHearts(h);
      showToast(t.heartsRefilled);
      return true;
    },
    buyFreeze: () => {
      const s = streakRef.current;
      if ((s.freezes ?? 0) >= MAX_FREEZES) { showMessage(t.shopFreezeFull); return false; }
      if (crystalsRef.current.crystals < FREEZE_COST) { showMessage(t.notEnoughCrystals(FREEZE_COST)); return false; }
      addGems(-FREEZE_COST);
      const next = { ...s, freezes: (s.freezes ?? 0) + 1 };
      setStreak(next);
      saveStreak(next);
      showToast(t.shopFreezeBought);
      return true;
    },

    customLists: getCustomLists(),
    importCustomList: (name, text) => {
      const words = parseWords(text);
      if (!words.length) return 0;
      addCustomList(name, words);
      resetSearchIndex();
      setCustomVersion(v => v + 1);
      return words.length;
    },
    removeCustomList: id => {
      deleteCustomListFn(id);
      resetSearchIndex();
      setCustomVersion(v => v + 1);
    },
    renameCustomList: (id, name) => {
      renameCustomListFn(id, name);
      setCustomVersion(v => v + 1);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [progress, stats, recent, settings, user, gamification, crystals, customVersion, plan, streak, pro, hearts]);

  const learningCount = useMemo(() => collectWords(progress, "learning").length, [progress]);

  // Journey-path home (and the phrasal tab) start a mode directly for a key.
  const startGroup = (key: string, mode: "flashcards" | "quiz" | "list", origin: Origin = null) => {
    // IELTS: the first topics are free, the rest come with Pro
    if (!isPro && key.startsWith("ielts:")) {
      const idx = IELTS_TOPICS.findIndex(x => ieltsKey(x.topic) === key);
      if (idx >= FREE_IELTS) {
        askConfirm(t.proLockedIelts).then(ok => { if (ok) setRoute({ s: "pro" }); });
        return;
      }
    }
    setStudyOrigin(origin);
    setGroupKey(key);
    setNonce(n => n + 1);
    setRoute(mode === "flashcards" ? { s: "flash", mode: "group" } : { s: mode });
  };
  // Where the Back button of a study screen should land.
  const studyBack = (): Route =>
    studyOrigin === "phrasal" ? { s: "phrasal" }
    : studyOrigin === "levels" ? { s: "levels" }
    : studyOrigin === "ielts" ? { s: "ielts" }
    : studyOrigin === "home" ? { s: "groups" }
    : studyOrigin === "path" ? { s: "path" }
    : { s: "groups" };

  // Open a step of the learning path.
  const openStep = (step: Step, origin: Origin) => {
    setStudyOrigin(origin);
    if (step.kind === "chest" || step.kind === "trophy") {
      // reward steps open right where they are; gems fly into the counter
      if (!path.done.includes(step.id)) {
        completeStep(step.id);
        showToast(step.kind === "trophy" ? t.trophyToast(step.level === "A0" ? t.basicsName : step.level) : t.chestToast);
      }
      return;
    }
    // lessons need at least one heart (Pro: unlimited)
    if (!isPro && regen(heartsRef.current).count === 0) { setHeartsModal(true); return; }
    if (step.kind === "words" && step.key) setRoute({ s: "wordlesson", key: step.key }); // Duolingo-style lesson
    else if (step.kind === "grammar") setRoute({ s: "lesson", id: step.id });
    else if (step.kind === "basics") setRoute({ s: "basics", id: step.id });
    else setRoute({ s: "practice", id: step.id });
  };
  // First visit: offer the placement test once content is ready.
  useEffect(() => {
    if (contentVersion > 0 && !path.placed && !path.skippedTest && route.s === "groups") setRoute({ s: "placement" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentVersion, path.placed, path.skippedTest]);

  const tabs: { id: Route["s"]; label: string; icon: string; badge?: number }[] = [
    { id: "groups", label: t.tabGroups, icon: "🏠" },
    { id: "levels", label: t.tabLevels, icon: "📊" },
    { id: "ielts", label: t.tabIelts, icon: "🎓" },
    { id: "grammar", label: t.tabGrammar, icon: "📚" },
    { id: "phrasal", label: t.tabPhrasal, icon: "🧩" },
    { id: "review", label: t.reviewTitle, icon: "🧠", badge: learningCount },
    { id: "stats", label: t.tabStats, icon: "📈" },
    ...(user?.role === "ADMIN" || pro.admin ? [{ id: "admin" as Route["s"], label: t.tabAdmin, icon: "🛠️" }] : []),
    { id: "pro", label: t.proMenu, icon: "👑" },
  ];
  const groupsFamily = ["groups", "flash", "quiz", "list"];
  const inStudy = groupsFamily.includes(route.s) && !(route.s === "flash" && (route.mode === "learning-mix" || route.mode === "review"));
  const activeTab = inStudy
    ? (route.s !== "groups" && (studyOrigin === "levels" || studyOrigin === "ielts") ? studyOrigin : "groups")
    : route.s === "flash" ? "review" : route.s;
  const go = (s: Route["s"]) => { setMenuOpen(false); setMoreOpen(false); setRoute({ s } as Route); };
  // Desktop tab row: the main sections; the rest sit in a "More" dropdown,
  // Pro has its own button in the header.
  const PRIMARY: Route["s"][] = ["groups", "levels", "ielts", "review"];
  const primaryTabs = tabs.filter(tb => PRIMARY.includes(tb.id));
  const moreTabs = tabs.filter(tb => !PRIMARY.includes(tb.id) && tb.id !== "pro");

  // Where "Back" leads from the current screen — used by Telegram's native
  // Back button (same targets as the on-screen ← buttons).
  const backTarget = (): Route | null => {
    if (route.s === "groups") return null;
    if (route.s === "flash") {
      if (route.mode === "learning-mix" || route.mode === "review") return { s: "review" };
      if (route.mode === "plan") return { s: "groups" };
      return studyBack();
    }
    if (route.s === "quiz" || route.s === "list" || route.s === "lesson" || route.s === "basics" || route.s === "practice" || route.s === "wordlesson") return studyBack();
    return { s: "groups" };
  };
  const backRef = useRef(backTarget);
  backRef.current = backTarget;
  useEffect(() => {
    if (menuOpen) { setTelegramBack(() => setMenuOpen(false)); return; }
    const target = backRef.current();
    setTelegramBack(target ? () => { const t2 = backRef.current(); if (t2) setRoute(t2); } : null);
  }, [route, menuOpen, studyOrigin]);

  return (
    <AppContext.Provider value={api2}>
      <header className="app-header">
        <div className="header-inner">
          {/* phone only: opens the side menu instead of the tab row */}
          <button className="menu-btn" onClick={() => setMenuOpen(true)} aria-label={t.menuTitle}>
            <span /><span /><span />
          </button>
          <button className="logo-btn" onClick={() => go("groups")}>
            <span className="logo-mark">W</span>
            <span>
              <h1 className="logo">WordUp</h1>
              <p className="subtitle">{t.subtitle}</p>
            </span>
          </button>
          <div className="header-right">
            <button className={"pro-btn" + (isPro ? " on" : "")} onClick={() => go("pro")} title={t.proMenu}>
              <Emoji char="👑" />
              <span>Pro</span>
            </button>
            <button
              className={"streak-pill" + (plan.completed ? " lit" : "")}
              onClick={() => setRoute({ s: "groups" })}
              title={t.streakWord}
            >
              <Emoji char="🔥" className="streak-flame" />
              <b>{liveStreak(streak)}</b>
            </button>
            <button
              ref={crystalPillRef}
              className="crystal-pill-h"
              title={t.crystalsCap}
              onClick={() => go("pro")}
            >
              <Emoji char="💎" className="crystal-pill-icon" />
              <b key={pillBump} className={pillBump ? "bump" : ""}>{shownCrystals}</b>
            </button>
            {/* Account lives inside Settings; the gear shows your avatar when signed in */}
            <button
              className={"icon-btn gear" + (route.s === "settings" ? " active" : "")}
              title={t.settingsTooltip}
              onClick={() => setRoute({ s: "settings" })}
            >
              <Emoji char="⚙️" className="gear-icon" />
              {user?.avatarUrl && <img className="gear-avatar" src={user.avatarUrl} alt="" referrerPolicy="no-referrer" />}
            </button>
          </div>
        </div>
        <div className="tab-row">
          <nav className="tab-bar">
            {primaryTabs.map(tb => (
              <button
                key={tb.id}
                className={"tab" + (activeTab === tb.id ? " active" : "")}
                onClick={() => go(tb.id)}
              >
                {tb.label}
                {tb.badge ? <span className="badge" key={tb.badge}>{tb.badge}</span> : null}
              </button>
            ))}
          </nav>
          <div className="tab-more-wrap">
            <button
              className={"tab tab-more" + (moreTabs.some(tb => tb.id === activeTab) ? " active" : "") + (moreOpen ? " open" : "")}
              onClick={() => setMoreOpen(o => !o)}
              aria-expanded={moreOpen}
            >
              {moreTabs.find(tb => tb.id === activeTab)?.label ?? t.tabMore} <span className="tab-more-caret">▾</span>
            </button>
            {moreOpen && (
              <>
                <div className="tab-menu-backdrop" onClick={() => setMoreOpen(false)} />
                <div className="tab-menu" role="menu">
                  {moreTabs.map(tb => (
                    <button key={tb.id} role="menuitem" className={activeTab === tb.id ? "active" : ""} onClick={() => go(tb.id)}>
                      <Emoji char={tb.icon} className="tab-menu-icon" />
                      <span>{tb.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Side menu (phones): same sections as the tab row, with 3D icons */}
      <div className={"drawer-backdrop" + (menuOpen ? " open" : "")} onClick={() => setMenuOpen(false)} />
      <aside className={"drawer" + (menuOpen ? " open" : "")} aria-hidden={!menuOpen}>
        <div className="drawer-head">
          <span className="logo-mark">W</span>
          <b className="logo">WordUp</b>
          <button className="drawer-close" onClick={() => setMenuOpen(false)} aria-label="Close">✕</button>
        </div>
        <nav className="drawer-nav">
          {tabs.map(tb => (
            <button
              key={tb.id}
              className={"drawer-item" + (activeTab === tb.id ? " active" : "")}
              onClick={() => go(tb.id)}
              tabIndex={menuOpen ? 0 : -1}
            >
              <Emoji char={tb.icon} className="drawer-icon" />
              <span>{tb.label}</span>
              {tb.badge ? <span className="badge">{tb.badge}</span> : null}
            </button>
          ))}
          <button
            className={"drawer-item" + (route.s === "settings" ? " active" : "")}
            onClick={() => go("settings")}
            tabIndex={menuOpen ? 0 : -1}
          >
            <Emoji char="⚙️" className="drawer-icon" />
            <span>{t.settingsTitle}</span>
          </button>
        </nav>
      </aside>

      {/* keyed by screen so the slide-in animation replays on every navigation */}
      <main className="app-main" key={route.s}>
        <Suspense fallback={<div className="screen-loading" />}>
        {route.s === "groups" && (
          <GroupsScreen
            onStart={(key, mode) => startGroup(key, mode, "home")}
            roadmap={steps.length > 0 && (
              <div className="roadmap-home">
                <div className="journey-section shelf-head">
                  <span>{t.pathTitle}</span>
                  <button className="shelf-more" onClick={() => setRoute({ s: "path" })}>{t.pathAll} ›</button>
                </div>
                <RoadmapPath steps={steps} path={path} current={currentStep} compact onOpen={st => openStep(st, "home")} />
                {!isPro && (
                  <button className="pro-promo" onClick={() => setRoute({ s: "pro" })}>
                    <Emoji char="👑" className="pro-promo-icon" />
                    <span>
                      <b>{t.proPromoTitle}</b>
                      <small>{pro.introUsed ? t.proPromoSub2 : t.proPromoSub(pro.prices.pro_week)}</small>
                    </span>
                    <span className="pro-promo-go">›</span>
                  </button>
                )}
              </div>
            )}
            onOpenLevels={() => setRoute({ s: "levels" })}
            onOpenIelts={() => setRoute({ s: "ielts" })}
            onStartPlan={() => {
              setNonce(n => n + 1);
              setRoute({ s: "flash", mode: "plan" });
            }}
          />
        )}
        {route.s === "wordlesson" && (
          <WordLessonScreen key={route.key} groupKey={route.key} onBack={() => setRoute(studyBack())} />
        )}
        {route.s === "review" && (
          <ReviewScreen
            onPractice={words => {
              setReviewDeck(words);
              setNonce(n => n + 1);
              setRoute({ s: "flash", mode: "review" });
            }}
          />
        )}
        {route.s === "placement" && (
          <PlacementScreen
            onDone={level => {
              updatePath(level ? { ...path, placed: level, skippedTest: false } : { ...path, skippedTest: true });
              setRoute({ s: "groups" });
            }}
          />
        )}
        {route.s === "path" && (
          <section>
            <button className="back-btn" onClick={() => setRoute({ s: "groups" })}>{t.back}</button>
            <h2 className="screen-title">{t.pathTitle}</h2>
            <p className="muted">{t.pathHint(Math.min(currentStep, steps.length), steps.length)}</p>
            <RoadmapPath steps={steps} path={path} current={currentStep} onOpen={st => openStep(st, "path")} />
            <button className="btn wide" onClick={() => setRoute({ s: "placement" })}>{t.retakeTest}</button>
          </section>
        )}
        {route.s === "lesson" && (() => {
          const st = steps.find(x => x.id === route.id);
          return st?.grammar ? (
            <LessonScreen
              key={st.id}
              topic={st.grammar}
              alreadyDone={path.done.includes(st.id)}
              onComplete={() => completeStep(st.id)}
              onBack={() => setRoute(studyBack())}
            />
          ) : null;
        })()}
        {route.s === "basics" && (() => {
          const st = steps.find(x => x.id === route.id);
          return st?.lesson ? (
            <BasicsLessonScreen
              key={st.id}
              lessonId={st.lesson}
              alreadyDone={path.done.includes(st.id)}
              onComplete={() => completeStep(st.id)}
              onBack={() => setRoute(studyBack())}
            />
          ) : null;
        })()}
        {route.s === "practice" && (() => {
          const st = steps.find(x => x.id === route.id);
          return st?.key ? (
            <PracticeScreen
              key={st.id}
              partKey={st.key}
              prevKey={steps.filter(x => x.kind === "practice" && x.level === st.level && x.key)
                .map(x => x.key!).find((_, i, keys) => keys[i + 1] === st.key)}
              alreadyDone={path.done.includes(st.id)}
              onComplete={() => completeStep(st.id)}
              onBack={() => setRoute(studyBack())}
            />
          ) : null;
        })()}
        {route.s === "levels" && <LevelsScreen onStart={(key, mode) => startGroup(key, mode, "levels")} />}
        {route.s === "ielts" && <IeltsScreen onStart={(key, mode) => startGroup(key, mode, "ielts")} />}
        {route.s === "flash" && (
          <FlashcardsScreen
            key={`${groupKey}|${route.mode}|${nonce}`}
            mode={route.mode}
            groupKey={groupKey}
            posFilter={posFilter}
            onBack={() => {
              if (route.mode === "learning-mix" || route.mode === "review") setRoute({ s: "review" });
              else if (route.mode === "plan") setRoute({ s: "groups" });
              else setRoute(studyBack());
            }}
            customDeck={route.mode === "review" ? reviewDeck : undefined}
            onNextLevel={k => {
              setGroupKey(k);
              setNonce(n => n + 1);
            }}
          />
        )}
        {route.s === "quiz" && (
          <QuizScreen
            key={`${groupKey}|${nonce}`}
            groupKey={groupKey}
            posFilter={posFilter}
            onBack={() => setRoute(studyBack())}
            onRetry={() => setNonce(n => n + 1)}
            onGroups={() => setRoute({ s: "groups" })}
          />
        )}
        {route.s === "list" && (
          <WordListScreen
            groupKey={groupKey}
            posFilter={posFilter}
            onBack={() => setRoute(studyBack())}
          />
        )}
        {route.s === "stats" && <StatsScreen />}
        {route.s === "grammar" && <GrammarScreen />}
        {route.s === "phrasal" && <PhrasalVerbsScreen onStart={(key, mode) => startGroup(key, mode, "phrasal")} />}
        {route.s === "settings" && <SettingsScreen />}
        {route.s === "admin" && <AdminScreen />}
        {route.s === "pro" && <ProScreen onBack={() => setRoute({ s: "groups" })} />}
        </Suspense>
      </main>

      {rescue && route.s === "groups" && (
        <StreakRescueModal
          missed={rescue.length}
          onFreeze={() => { updateStreak(spendFreezes(streakRef.current, rescue)); setRescue(null); haptic("success"); showToast(t.freezeSaved(rescue.length)); }}
          onBuyAndFreeze={cost => {
            if (crystalsRef.current.crystals < cost) return;
            addGems(-cost);
            const s = streakRef.current;
            updateStreak(spendFreezes({ ...s, freezes: Math.max(s.freezes ?? 0, rescue.length) }, rescue));
            setRescue(null); haptic("success"); showToast(t.freezeSaved(rescue.length));
          }}
          onPro={() => setRoute({ s: "pro" })}
          onLetGo={() => { updateStreak(breakStreak(streakRef.current)); setRescue(null); }}
        />
      )}
      {heartsModal && (
        <HeartsModal
          onRefilled={() => setHeartsModal(false)}
          onPro={() => { setHeartsModal(false); setRoute({ s: "pro" }); }}
          onPractice={() => { setHeartsModal(false); setRoute({ s: "review" }); }}
          onClose={() => {
            setHeartsModal(false);
            if (route.s === "wordlesson" || route.s === "lesson" || route.s === "basics" || route.s === "practice") setRoute(studyBack());
          }}
        />
      )}

      {ctxWord && (
        <ContextModal
          word={ctxWord}
          onClose={() => setCtxWord(null)}
        />
      )}

      {toast && <div className="crystal-toast" role="status">{toast}</div>}
    </AppContext.Provider>
  );
}
