import { useEffect, useMemo, useRef, useState } from "react";
import { AppContext, type AppApi } from "./context";
import { STRINGS } from "./i18n";
import type { FlashMode, Word } from "./types";
import {
  LEVELS, collectWords, isKeyComplete, isKeyUnlocked, keyParts, progressKey, resetSearchIndex, topicLevelKeys,
} from "./lib/groups";
import {
  clearStatsStorage, loadProgress, loadRecent, loadSettings, loadStats,
  saveProgress, saveRecent, saveSettings, saveStats,
} from "./lib/storage";
import {
  api, getToken, isLoggedIn, progressToEntries, setToken,
  type AuthUser, type Gamification,
} from "./lib/api";
import { awardMastery, loadCrystals, saveCrystals, unlockTopic as unlockTopicFn } from "./lib/crystals";
import {
  addCustomList, deleteCustomList as deleteCustomListFn, getCustomLists,
  parseWords, renameCustomList as renameCustomListFn,
} from "./lib/customLists";
import GroupsScreen from "./components/GroupsScreen";
import LevelsScreen from "./components/LevelsScreen";
import IeltsScreen from "./components/IeltsScreen";
import PlacementScreen from "./components/PlacementScreen";
import LessonScreen from "./components/LessonScreen";
import SentencesScreen from "./components/SentencesScreen";
import RoadmapPath from "./components/RoadmapPath";
import {
  buildSteps, currentStepIndex, loadPath, savePath, type PathState, type Step,
} from "./lib/roadmap";
import Emoji from "./components/Emoji";
import { flyCrystals } from "./lib/crystalFly";
import { haptic, initTelegram, setTelegramBack, setTelegramSettings, syncTelegramColors } from "./lib/telegram";
import ModeScreen from "./components/ModeScreen";
import FlashcardsScreen from "./components/FlashcardsScreen";
import QuizScreen from "./components/QuizScreen";
import WordListScreen from "./components/WordListScreen";
import LearningScreen from "./components/LearningScreen";
import KnownScreen from "./components/KnownScreen";
import StatsScreen from "./components/StatsScreen";
import GrammarScreen from "./components/GrammarScreen";
import PhrasalVerbsScreen from "./components/PhrasalVerbsScreen";
import SettingsScreen from "./components/SettingsScreen";
import ProfileScreen from "./components/ProfileScreen";
import AdminScreen from "./components/AdminScreen";
import ContextModal from "./components/ContextModal";
import LanguagePicker from "./components/LanguagePicker";
import { loadContent } from "./lib/content";
import {
  PLAN_BONUS, completeDay, liveStreak, loadPlan, loadStreak, markPlanItem, savePlan, saveStreak, today,
} from "./lib/dailyPlan";

type Route =
  | { s: "groups" }
  | { s: "levels" }
  | { s: "ielts" }
  | { s: "mode" }
  | { s: "flash"; mode: FlashMode }
  | { s: "quiz" }
  | { s: "list" }
  | { s: "grammar" }
  | { s: "phrasal" }
  | { s: "learning" }
  | { s: "known" }
  | { s: "stats" }
  | { s: "settings" }
  | { s: "profile" }
  | { s: "admin" }
  | { s: "placement" }
  | { s: "path" }
  | { s: "lesson"; id: string }
  | { s: "sentences"; id: string };

type Origin = "phrasal" | "levels" | "ielts" | "home" | "path" | null;

export default function App() {
  const [progress, setProgress] = useState(loadProgress);
  const [stats, setStats] = useState(loadStats);
  const [recent, setRecent] = useState(loadRecent);
  const [settings, setSettings] = useState(loadSettings);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [gamification, setGamification] = useState<Gamification | null>(null);
  const [route, setRoute] = useState<Route>({ s: "groups" });
  const [topic, setTopic] = useState("");
  const [groupKey, setGroupKey] = useState("");
  const [posFilter, setPosFilter] = useState("all");
  const [ctxWord, setCtxWord] = useState<Word | null>(null);
  const [nonce, setNonce] = useState(0); // remounts flashcards/quiz on demand
  // Which screen a study session was started from, so Back returns there.
  const [studyOrigin, setStudyOrigin] = useState<Origin>(null);
  const [menuOpen, setMenuOpen] = useState(false); // phone side menu
  const [contentVersion, setContentVersion] = useState(0); // bumps on content (re)load
  const [crystals, setCrystals] = useState(loadCrystals);
  const [customVersion, setCustomVersion] = useState(0); // bumps when custom lists change

  // Refs so async login can read the latest local data without stale closures.
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const crystalsRef = useRef(crystals);
  crystalsRef.current = crystals;

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
      setCrystals(state);
      saveCrystals(state);
      showToast(`🎉 +${gained} 💎`);
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
  const [path, setPath] = useState<PathState>(() => loadPath(settings.courseLang ?? "en"));
  useEffect(() => { setPath(loadPath(settings.courseLang ?? "en")); }, [settings.courseLang]);
  const updatePath = (next: PathState) => {
    setPath(next);
    savePath(settings.courseLang ?? "en", next);
  };
  const steps = useMemo(() => buildSteps(settings.courseLang !== "de"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contentVersion, settings.courseLang]);
  const currentStep = currentStepIndex(steps, progress, path);
  const PATH_STEP_BONUS = 3; // crystals for a finished grammar / sentence step
  const completeStep = (id: string) => {
    if (path.done.includes(id)) return;
    updatePath({ ...path, done: [...path.done, id] });
    const c = { ...crystalsRef.current, crystals: crystalsRef.current.crystals + PATH_STEP_BONUS };
    setCrystals(c);
    saveCrystals(c);
    haptic("success");
  };

  // ---- Daily plan + streak ----
  const courseLang = settings.courseLang ?? "en";
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
      const c = { ...crystalsRef.current, crystals: crystalsRef.current.crystals + PLAN_BONUS };
      setCrystals(c);
      saveCrystals(c);
      showToast(`🔥 ${s.count} · +${PLAN_BONUS} 💎`);
    }
  };
  const statsRef = useRef(stats);
  statsRef.current = stats;

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.lang = settings.lang;
    syncTelegramColors(); // Telegram's header follows our theme
  }, [settings.theme, settings.lang]);

  // Telegram Mini App: start up + "Settings" in the ⋯ menu.
  useEffect(() => {
    initTelegram();
    syncTelegramColors();
    setTelegramSettings(() => setRoute({ s: "settings" }));
  }, []);

  // Load word content for the chosen course language (falls back to bundled
  // data offline). Re-runs when the user switches course.
  useEffect(() => {
    loadContent(settings.courseLang ?? "en").then(() => setContentVersion(v => v + 1));
  }, [settings.courseLang]);

  // Phrasal verbs are English-only; leave the tab if the course changes away.
  useEffect(() => {
    if (settings.courseLang !== "en" && (route.s === "phrasal" || route.s === "ielts")) setRoute({ s: "groups" });
  }, [settings.courseLang, route.s]);

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

  const api2: AppApi = useMemo(() => ({
    progress,
    setWordState: (rawKey, word, state) => {
      const key = progressKey(rawKey); // path parts store progress on their level
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
      const lang = settings.courseLang ?? "en";
      const freshPath: PathState = { placed: null, skippedTest: false, done: [] };
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
    refreshContent: () => loadContent().then(() => setContentVersion(v => v + 1)),
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
  }), [progress, stats, recent, settings, user, gamification, crystals, customVersion, plan, streak]);

  const learningCount = useMemo(() => collectWords(progress, "learning").length, [progress]);
  const knownCount = useMemo(() => collectWords(progress, "known").length, [progress]);

  const openGroup = (name: string, preferredKey?: string) => {
    setStudyOrigin(null);
    setTopic(name);
    const keys = LEVELS.includes(name) ? [name] : topicLevelKeys(name);
    const key = preferredKey ||
      keys.find(k => isKeyUnlocked(progress, k) && !isKeyComplete(progress, k)) ||
      keys[keys.length - 1];
    setGroupKey(key);
    if (!preferredKey) setPosFilter("all");
    setRoute({ s: "mode" });
  };

  // Journey-path home (and the phrasal tab) start a mode directly for a key.
  const startGroup = (key: string, mode: "flashcards" | "quiz" | "list", origin: Origin = null) => {
    setStudyOrigin(origin);
    setTopic(keyParts(key).name);
    setGroupKey(key);
    setPosFilter("all");
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
    : { s: "mode" };

  // Open a step of the learning path.
  const openStep = (step: Step, origin: Origin) => {
    setStudyOrigin(origin);
    if (step.kind === "words" && step.key) startGroup(step.key, "flashcards", origin);
    else if (step.kind === "grammar") setRoute({ s: "lesson", id: step.id });
    else setRoute({ s: "sentences", id: step.id });
  };
  // First visit: offer the placement test once content is ready.
  useEffect(() => {
    if (contentVersion > 0 && !path.placed && !path.skippedTest && route.s === "groups") setRoute({ s: "placement" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentVersion, path.placed, path.skippedTest]);

  const isEn = settings.courseLang === "en";
  const tabs: { id: Route["s"]; label: string; icon: string; badge?: number }[] = [
    { id: "groups", label: t.tabGroups, icon: "🏠" },
    { id: "levels", label: t.tabLevels, icon: "📊" },
    ...(isEn ? [{ id: "ielts" as Route["s"], label: t.tabIelts, icon: "🎓" }] : []),
    { id: "grammar", label: t.tabGrammar, icon: "📚" },
    ...(isEn ? [{ id: "phrasal" as Route["s"], label: t.tabPhrasal, icon: "🧩" }] : []),
    { id: "learning", label: t.tabLearning, icon: "🧠", badge: learningCount },
    { id: "known", label: t.tabKnown, icon: "✅", badge: knownCount },
    { id: "stats", label: t.tabStats, icon: "📈" },
    ...(user?.role === "ADMIN" ? [{ id: "admin" as Route["s"], label: t.tabAdmin, icon: "🛠️" }] : []),
  ];
  const groupsFamily = ["groups", "mode", "flash", "quiz", "list"];
  const inStudy = groupsFamily.includes(route.s) && !(route.s === "flash" && route.mode === "learning-mix");
  const activeTab = inStudy
    ? (route.s !== "groups" && (studyOrigin === "levels" || studyOrigin === "ielts") ? studyOrigin : "groups")
    : route.s === "flash" ? "learning" : route.s;
  const go = (s: Route["s"]) => { setMenuOpen(false); setRoute({ s } as Route); };

  // Where "Back" leads from the current screen — used by Telegram's native
  // Back button (same targets as the on-screen ← buttons).
  const backTarget = (): Route | null => {
    if (route.s === "groups") return null;
    if (route.s === "flash") {
      if (route.mode === "learning-mix") return { s: "learning" };
      if (route.mode === "plan") return { s: "groups" };
      return studyBack();
    }
    if (route.s === "quiz" || route.s === "list" || route.s === "lesson" || route.s === "sentences") return studyBack();
    return { s: "groups" };
  };
  const backRef = useRef(backTarget);
  backRef.current = backTarget;
  useEffect(() => {
    if (menuOpen) { setTelegramBack(() => setMenuOpen(false)); return; }
    const target = backRef.current();
    setTelegramBack(target ? () => { const t2 = backRef.current(); if (t2) setRoute(t2); } : null);
  }, [route, menuOpen, studyOrigin]);

  // First launch: no course chosen yet — show the language picker full-screen.
  if (!settings.courseLang) {
    return (
      <AppContext.Provider value={api2}>
        <LanguagePicker onPick={l => api2.updateSettings({ courseLang: l })} />
      </AppContext.Provider>
    );
  }

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
              <p className="subtitle">{settings.courseLang === "de" ? t.subtitleDe : t.subtitle}</p>
            </span>
          </button>
          <div className="header-right">
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
              onClick={() => go("levels")}
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
        <nav className="tab-bar">
          {tabs.map(tb => (
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
        {route.s === "placement" && (
          <PlacementScreen
            withGrammar={settings.courseLang !== "de"}
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
        {route.s === "sentences" && (() => {
          const st = steps.find(x => x.id === route.id);
          return st?.sourceKeys ? (
            <SentencesScreen
              key={st.id}
              sourceKeys={st.sourceKeys}
              alreadyDone={path.done.includes(st.id)}
              onComplete={() => completeStep(st.id)}
              onBack={() => setRoute(studyBack())}
            />
          ) : null;
        })()}
        {route.s === "levels" && <LevelsScreen onStart={(key, mode) => startGroup(key, mode, "levels")} />}
        {route.s === "ielts" && <IeltsScreen onStart={(key, mode) => startGroup(key, mode, "ielts")} />}
        {route.s === "mode" && (
          <ModeScreen
            topic={topic}
            groupKey={groupKey}
            setGroupKey={setGroupKey}
            posFilter={posFilter}
            setPosFilter={setPosFilter}
            onBack={() => setRoute({ s: "groups" })}
            onStart={m => {
              setNonce(n => n + 1);
              setRoute(m === "flashcards" ? { s: "flash", mode: "group" } : { s: m });
            }}
          />
        )}
        {route.s === "flash" && (
          <FlashcardsScreen
            key={`${groupKey}|${route.mode}|${nonce}`}
            mode={route.mode}
            groupKey={groupKey}
            posFilter={posFilter}
            onBack={() => {
              if (route.mode === "learning-mix") setRoute({ s: "learning" });
              else if (route.mode === "plan") setRoute({ s: "groups" });
              else setRoute(studyBack());
            }}
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
        {route.s === "learning" && (
          <LearningScreen
            onPractice={() => {
              setNonce(n => n + 1);
              setRoute({ s: "flash", mode: "learning-mix" });
            }}
            onOpenGroup={openGroup}
          />
        )}
        {route.s === "known" && <KnownScreen />}
        {route.s === "stats" && <StatsScreen />}
        {route.s === "grammar" && <GrammarScreen />}
        {route.s === "phrasal" && <PhrasalVerbsScreen onStart={(key, mode) => startGroup(key, mode, "phrasal")} />}
        {route.s === "settings" && <SettingsScreen />}
        {route.s === "profile" && <ProfileScreen />}
        {route.s === "admin" && <AdminScreen />}
      </main>

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
