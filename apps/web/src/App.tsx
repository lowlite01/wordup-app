import { useEffect, useMemo, useRef, useState } from "react";
import { AppContext, type AppApi } from "./context";
import { STRINGS } from "./i18n";
import type { FlashMode, Word } from "./types";
import {
  LEVELS, collectWords, isKeyComplete, isKeyUnlocked, keyParts, resetSearchIndex, topicLevelKeys,
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
import Emoji from "./components/Emoji";
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
  | { s: "admin" };

type Origin = "phrasal" | "levels" | "home" | null;

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
  }, [settings.theme, settings.lang]);

  // Load word content for the chosen course language (falls back to bundled
  // data offline). Re-runs when the user switches course.
  useEffect(() => {
    loadContent(settings.courseLang ?? "en").then(() => setContentVersion(v => v + 1));
  }, [settings.courseLang]);

  // Phrasal verbs are English-only; leave the tab if the course changes away.
  useEffect(() => {
    if (settings.courseLang !== "en" && route.s === "phrasal") setRoute({ s: "groups" });
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
    setWordState: (key, word, state) => {
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
    resetKey: key => setProgress(p => {
      const next = { known: { ...p.known }, learning: { ...p.learning } };
      delete next.known[key];
      delete next.learning[key];
      saveProgress(next);
      return next;
    }),
    resetAllProgress: () => {
      const next = { known: {}, learning: {} };
      saveProgress(next);
      setProgress(next);
      if (isLoggedIn()) api.clearProgress().then(() => api.gamification()).then(setGamification).catch(() => {});
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
    : studyOrigin === "home" ? { s: "groups" }
    : { s: "mode" };

  const tabs: { id: Route["s"]; label: string; badge?: number }[] = [
    { id: "groups", label: t.tabGroups },
    { id: "levels", label: t.tabLevels },
    { id: "grammar", label: t.tabGrammar },
    ...(settings.courseLang === "en" ? [{ id: "phrasal" as Route["s"], label: t.tabPhrasal }] : []),
    { id: "learning", label: t.tabLearning, badge: learningCount },
    { id: "known", label: t.tabKnown, badge: knownCount },
    { id: "stats", label: t.tabStats },
    ...(user?.role === "ADMIN" ? [{ id: "admin" as Route["s"], label: t.tabAdmin }] : []),
  ];
  const groupsFamily = ["groups", "mode", "flash", "quiz", "list"];
  const inStudy = groupsFamily.includes(route.s) && !(route.s === "flash" && route.mode === "learning-mix");
  const activeTab = inStudy
    ? (route.s !== "groups" && studyOrigin === "levels" ? "levels" : "groups")
    : route.s === "flash" ? "learning" : route.s;

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
          <button className="logo-btn" onClick={() => setRoute({ s: "groups" })}>
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
              onClick={() => setRoute({ s: tb.id } as Route)}
            >
              {tb.label}
              {tb.badge ? <span className="badge" key={tb.badge}>{tb.badge}</span> : null}
            </button>
          ))}
        </nav>
      </header>

      {/* keyed by screen so the slide-in animation replays on every navigation */}
      <main className="app-main" key={route.s}>
        {route.s === "groups" && (
          <GroupsScreen
            onStart={(key, mode) => startGroup(key, mode, "home")}
            onOpenLevels={() => setRoute({ s: "levels" })}
            onStartPlan={() => {
              setNonce(n => n + 1);
              setRoute({ s: "flash", mode: "plan" });
            }}
          />
        )}
        {route.s === "levels" && <LevelsScreen onStart={(key, mode) => startGroup(key, mode, "levels")} />}
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
