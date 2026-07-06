import { useEffect, useMemo, useRef, useState } from "react";
import { AppContext, type AppApi } from "./context";
import { STRINGS } from "./i18n";
import type { FlashMode, Word } from "./types";
import {
  LEVELS, collectWords, isKeyComplete, isKeyUnlocked, topicLevelKeys,
} from "./lib/groups";
import {
  clearStatsStorage, loadProgress, loadRecent, loadSettings, loadStats,
  saveProgress, saveRecent, saveSettings, saveStats,
} from "./lib/storage";
import {
  api, getToken, isLoggedIn, progressToEntries, setToken,
  type AuthUser, type Gamification,
} from "./lib/api";
import GroupsScreen from "./components/GroupsScreen";
import ModeScreen from "./components/ModeScreen";
import FlashcardsScreen from "./components/FlashcardsScreen";
import QuizScreen from "./components/QuizScreen";
import WordListScreen from "./components/WordListScreen";
import LearningScreen from "./components/LearningScreen";
import KnownScreen from "./components/KnownScreen";
import StatsScreen from "./components/StatsScreen";
import GrammarScreen from "./components/GrammarScreen";
import SettingsScreen from "./components/SettingsScreen";
import ProfileScreen from "./components/ProfileScreen";
import ContextModal from "./components/ContextModal";

type Route =
  | { s: "groups" }
  | { s: "mode" }
  | { s: "flash"; mode: FlashMode }
  | { s: "quiz" }
  | { s: "list" }
  | { s: "grammar" }
  | { s: "learning" }
  | { s: "known" }
  | { s: "stats" }
  | { s: "settings" }
  | { s: "profile" };

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

  // Refs so async login can read the latest local data without stale closures.
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const statsRef = useRef(stats);
  statsRef.current = stats;

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.lang = settings.lang;
  }, [settings.theme, settings.lang]);

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
      if (isLoggedIn()) api.syncStats({}).catch(() => {});
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
  }), [progress, stats, recent, settings, user, gamification]);

  const learningCount = useMemo(() => collectWords(progress, "learning").length, [progress]);
  const knownCount = useMemo(() => collectWords(progress, "known").length, [progress]);

  const openGroup = (name: string, preferredKey?: string) => {
    setTopic(name);
    const keys = LEVELS.includes(name) ? [name] : topicLevelKeys(name);
    const key = preferredKey ||
      keys.find(k => isKeyUnlocked(progress, k) && !isKeyComplete(progress, k)) ||
      keys[keys.length - 1];
    setGroupKey(key);
    if (!preferredKey) setPosFilter("all");
    setRoute({ s: "mode" });
  };

  const tabs: { id: Route["s"]; label: string; badge?: number }[] = [
    { id: "groups", label: t.tabGroups },
    { id: "grammar", label: t.tabGrammar },
    { id: "learning", label: t.tabLearning, badge: learningCount },
    { id: "known", label: t.tabKnown, badge: knownCount },
    { id: "stats", label: t.tabStats },
  ];
  const groupsFamily = ["groups", "mode", "flash", "quiz", "list"];
  const activeTab = groupsFamily.includes(route.s) && !(route.s === "flash" && route.mode === "learning-mix")
    ? "groups"
    : route.s === "flash" ? "learning" : route.s;

  return (
    <AppContext.Provider value={api2}>
      <header className="app-header">
        <div className="header-inner">
          <div>
            <h1 className="logo">WordUp</h1>
            <p className="subtitle">{t.subtitle}</p>
          </div>
          <div className="header-right">
            {gamification && (
              <button className="xp-pill" onClick={() => setRoute({ s: "profile" })} title={t.profileTitle}>
                <span className="xp-flame">🔥 {gamification.streak}</span>
                <span className="xp-lvl">{t.levelShort} {gamification.level}</span>
              </button>
            )}
            <button
              className={"avatar-btn" + (route.s === "profile" ? " active" : "")}
              title={t.profileTitle}
              onClick={() => setRoute({ s: "profile" })}
            >
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" />
                : <span>👤</span>}
            </button>
            <button
              className={"icon-btn gear" + (route.s === "settings" ? " active" : "")}
              title={t.settingsTooltip}
              onClick={() => setRoute({ s: "settings" })}
            >⚙️</button>
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
              {tb.badge ? <span className="badge">{tb.badge}</span> : null}
            </button>
          ))}
        </nav>
      </header>

      <main className="app-main">
        {route.s === "groups" && <GroupsScreen onOpenGroup={openGroup} />}
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
              else setRoute({ s: "mode" });
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
            onBack={() => setRoute({ s: "mode" })}
            onRetry={() => setNonce(n => n + 1)}
            onGroups={() => setRoute({ s: "groups" })}
          />
        )}
        {route.s === "list" && (
          <WordListScreen
            groupKey={groupKey}
            posFilter={posFilter}
            onBack={() => setRoute({ s: "mode" })}
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
        {route.s === "settings" && <SettingsScreen />}
        {route.s === "profile" && <ProfileScreen />}
      </main>

      {ctxWord && (
        <ContextModal
          word={ctxWord}
          onClose={() => setCtxWord(null)}
        />
      )}
    </AppContext.Provider>
  );
}
