import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator, SafeAreaView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { Colors, ThemeProvider, useTheme } from "./src/theme";
import { AppContent, fetchContent } from "./src/api";
import LanguagePicker, { CourseLang } from "./src/LanguagePicker";
import {
  Progress, QuizStats, RecentEntry, loadProgress, loadRecent, loadStats,
  pushRecent, recordQuiz, saveProgress,
} from "./src/storage";
import {
  AuthUser, Gamification, getGamification, getServerProgress, getToken, loadToken,
  login as doLogin, logout as doLogout, me, progressToEntries, pushQuiz, syncProgress,
} from "./src/session";
import {
  CrystalState, awardMastery, emptyCrystals, loadCrystals, saveCrystals, unlockTopic as unlockTopicFn,
} from "./src/crystals";
import {
  CustomList, addCustomList, deleteCustomList, getCustomLists, loadCustomLists, parseWords,
} from "./src/customLists";
import {
  DailyPlan, PLAN_BONUS, Streak, completeDay, liveStreak, loadPlan, loadStreak,
  markPlanItem, planDeck, savePlan, saveStreak, today,
} from "./src/dailyPlan";
import ImportListModal from "./src/ImportListModal";
import CrystalToast from "./src/CrystalToast";
import GroupsScreen from "./src/GroupsScreen";
import LevelsScreen from "./src/LevelsScreen";
import IeltsScreen from "./src/IeltsScreen";
import FlashcardsScreen from "./src/FlashcardsScreen";
import QuizScreen from "./src/QuizScreen";
import SearchScreen from "./src/SearchScreen";
import GrammarScreen from "./src/GrammarScreen";
import PhrasalVerbsScreen from "./src/PhrasalVerbsScreen";
import ProgressScreen from "./src/ProgressScreen";
import SettingsScreen from "./src/SettingsScreen";
import WordContextModal, { WordLite } from "./src/WordContextModal";
import Emoji from "./src/Emoji";
import FadeIn from "./src/FadeIn";

type Tab = "groups" | "levels" | "ielts" | "grammar" | "progress";
type Origin = "groups" | "levels" | "ielts" | "phrasal";
type Screen =
  | { name: Tab }
  | { name: "search" }
  | { name: "phrasal" }
  | { name: "flash"; key: string }
  | { name: "plan" }
  | { name: "quiz"; key: string }
  | { name: "settings" };

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: "groups", icon: "🏠", label: "Home" },
  { id: "levels", icon: "📊", label: "Levels" },
  { id: "ielts", icon: "🎓", label: "IELTS" },
  { id: "grammar", icon: "📚", label: "Grammar" },
  { id: "progress", icon: "📈", label: "Progress" },
];

function Main() {
  const { colors, name: themeName } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [content, setContent] = useState<AppContent | null>(null);
  const [progress, setProgress] = useState<Progress>({ known: {}, learning: {} });
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const [stats, setStats] = useState<QuizStats>({});
  const [user, setUser] = useState<AuthUser | null>(null);
  const [game, setGame] = useState<Gamification | null>(null);
  const [ctxWord, setCtxWord] = useState<WordLite | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: "groups" });
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [crystals, setCrystals] = useState<CrystalState>(emptyCrystals);
  const [courseLang, setCourseLangState] = useState<CourseLang | null>(null);
  const [langLoaded, setLangLoaded] = useState(false);
  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [studyOrigin, setStudyOrigin] = useState<Origin>("groups");
  const [toast, setToast] = useState<string | null>(null);
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [streak, setStreak] = useState<Streak>({ count: 0, best: 0, lastDate: null, days: [] });
  const [planNonce, setPlanNonce] = useState(0);

  const COURSE_KEY = "wordup-course-lang";
  const setCourseLang = (l: CourseLang) => {
    setCourseLangState(l);
    AsyncStorage.setItem(COURSE_KEY, l);
  };

  const progressRef = useRef(progress);
  progressRef.current = progress;
  const crystalsRef = useRef(crystals);
  crystalsRef.current = crystals;
  const planRef = useRef(plan);
  planRef.current = plan;
  const streakRef = useRef(streak);
  streakRef.current = streak;

  const load = (lang: CourseLang) => {
    setLoading(true);
    setError(false);
    fetchContent(lang)
      .then(c => { setContent(c); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  };

  useEffect(() => {
    loadProgress().then(p => { setProgress(p); setProgressLoaded(true); });
    loadRecent().then(setRecent);
    loadStats().then(setStats);
    loadCrystals().then(setCrystals);
    loadCustomLists().then(setCustomLists);
    loadStreak().then(setStreak);
    AsyncStorage.getItem(COURSE_KEY).then(v => {
      setCourseLangState(v === "de" ? "de" : v === "en" ? "en" : null);
      setLangLoaded(true);
    });
    loadToken().then(t => {
      if (!t) return;
      me().then(setUser).catch(() => {});
      getServerProgress().then(p => { setProgress(p); saveProgress(p); }).catch(() => {});
      refreshGame();
    });
  }, []);

  // (Re)load word content whenever the chosen course changes.
  useEffect(() => {
    if (courseLang) load(courseLang);
  }, [courseLang]);

  // Today's plan, once both the words and the saved progress are available.
  useEffect(() => {
    if (!content || !courseLang || !progressLoaded) return;
    loadPlan(courseLang, content, progressRef.current, crystalsRef.current).then(setPlan);
  }, [content, courseLang, progressLoaded]);

  // Phrasal verbs and IELTS are English-only; leave them if the course changes.
  useEffect(() => {
    if (courseLang !== "en" && (screen.name === "phrasal" || screen.name === "ielts")) setScreen({ name: "groups" });
  }, [courseLang, screen.name]);

  const refreshGame = () => {
    if (getToken()) getGamification().then(setGame).catch(() => {});
  };

  // Keep the home XP fresh, and start a new day's plan after midnight.
  useEffect(() => {
    if (screen.name !== "groups") return;
    refreshGame();
    if (content && courseLang && planRef.current && planRef.current.date !== today()) {
      loadPlan(courseLang, content, progressRef.current, crystalsRef.current).then(setPlan);
      loadStreak().then(setStreak);
    }
  }, [screen.name]);

  // Award crystals whenever a group becomes fully mastered, with a toast.
  useEffect(() => {
    if (!content) return;
    const { state, gained } = awardMastery(crystalsRef.current, content, progress);
    if (gained) { setCrystals(state); saveCrystals(state); setToast(`🎉 +${gained} 💎`); }
  }, [progress, content]);

  const onUnlock = (topic: string): boolean => {
    const next = unlockTopicFn(crystalsRef.current, topic);
    if (!next) return false;
    setCrystals(next);
    saveCrystals(next);
    return true;
  };

  // A plan card was answered. Finishing the whole plan extends the streak.
  const answerPlan = (key: string, word: string) => {
    const prev = planRef.current;
    if (!prev || !courseLang) return;
    const next = markPlanItem(prev, key, word);
    if (next === prev) return;
    planRef.current = next;
    setPlan(next);
    savePlan(courseLang, next);
    if (next.completed && !prev.completed) {
      const s = completeDay(streakRef.current);
      setStreak(s);
      saveStreak(s);
      const c = { ...crystalsRef.current, crystals: crystalsRef.current.crystals + PLAN_BONUS };
      setCrystals(c);
      saveCrystals(c);
      setToast(`🔥 ${s.count} · +${PLAN_BONUS} 💎`);
    }
  };

  const importList = (name: string, text: string): number => {
    const words = parseWords(text);
    if (!words.length) return 0;
    addCustomList(name, words);
    setCustomLists([...getCustomLists()]);
    return words.length;
  };
  const removeList = (id: string) => {
    deleteCustomList(id);
    setCustomLists([...getCustomLists()]);
  };

  const updateProgress = (p: Progress) => {
    setProgress(p);
    saveProgress(p);
    if (getToken()) syncProgress(progressToEntries(p)).catch(() => {});
  };

  const onStart = (key: string, mode: "flash" | "quiz", origin: Origin = "groups") => {
    setStudyOrigin(origin);
    setRecent(r => pushRecent(r, key));
    setScreen(mode === "flash" ? { name: "flash", key } : { name: "quiz", key });
  };
  const studyBack = () => setScreen(studyOrigin === "phrasal" ? { name: "phrasal" } : { name: studyOrigin });

  const onQuiz = (word: string, picked: string) => {
    setStats(s => recordQuiz(s, word, picked));
    if (getToken()) pushQuiz(word, picked).catch(() => {});
  };

  const onLogin = async () => {
    const u = await doLogin();
    if (!u) return;
    setUser(u);
    try {
      await syncProgress(progressToEntries(progressRef.current));
      const p = await getServerProgress();
      setProgress(p);
      saveProgress(p);
      refreshGame();
    } catch { /* keep local */ }
  };

  const onLogout = async () => {
    await doLogout();
    setUser(null);
    setGame(null);
  };

  const visibleTabs = TABS.filter(t => t.id !== "ielts" || courseLang === "en");
  const isTab = visibleTabs.some(t => t.id === screen.name);
  // Highlight the tab a study session was started from.
  const activeTab = isTab ? screen.name
    : screen.name === "flash" || screen.name === "quiz" ? (studyOrigin === "phrasal" ? "groups" : studyOrigin)
    : screen.name === "plan" ? "groups" : null;
  const showTabBar = isTab || screen.name === "phrasal" || screen.name === "search";
  const contentReady = content && !loading;
  const darkTheme = themeName === "dark" || themeName === "midnight";
  const n = liveStreak(streak);

  if (!langLoaded) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}><ActivityIndicator size="large" color={colors.accent} /></View>
      </SafeAreaView>
    );
  }
  if (!courseLang) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar style={darkTheme ? "light" : "dark"} />
        <LanguagePicker onPick={setCourseLang} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style={darkTheme ? "light" : "dark"} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.logoBtn} onPress={() => setScreen({ name: "groups" })} activeOpacity={0.8}>
          <View style={styles.logoMark}><Text style={styles.logoMarkText}>W</Text></View>
          <Text style={styles.logo}>WordUp</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.streakPill, plan?.completed && styles.streakPillLit]}
          onPress={() => setScreen({ name: "groups" })}
        >
          <View style={{ opacity: plan?.completed ? 1 : 0.45 }}><Emoji char="🔥" size={18} /></View>
          <Text style={styles.streakText}>{n}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setScreen({ name: "search" })}>
          <Text style={styles.searchIcon}>⌕</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setScreen({ name: "settings" })}>
          <Emoji char="⚙️" size={22} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        {loading && screen.name !== "settings" && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.muted}>Loading words…</Text>
            <Text style={styles.hint}>(the free server may take ~30s to wake up)</Text>
          </View>
        )}

        {error && !loading && screen.name !== "settings" && (
          <View style={styles.center}>
            <Text style={styles.muted}>Couldn't reach the server.</Text>
            <TouchableOpacity style={styles.retry} onPress={() => load(courseLang)}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* keyed by screen so every screen slides in (hidden while words load) */}
        {(screen.name === "settings" || (!loading && !error)) && (
        <FadeIn key={screen.name + ("key" in screen ? screen.key : "") + planNonce} style={styles.body} from={18}>
          {screen.name === "settings" && (
            <SettingsScreen
              user={user}
              onLogin={onLogin}
              onLogout={onLogout}
              onBack={() => setScreen({ name: "groups" })}
              courseLang={courseLang}
              onSetCourseLang={setCourseLang}
            />
          )}

          {contentReady && screen.name === "groups" && (
            <GroupsScreen
              content={content}
              courseLang={courseLang}
              progress={progress}
              recent={recent}
              game={game}
              crystals={crystals}
              plan={plan}
              streak={streak}
              onStartPlan={() => { setPlanNonce(x => x + 1); setScreen({ name: "plan" }); }}
              onUnlock={onUnlock}
              onStart={(key, mode) => onStart(key, mode, "groups")}
              onOpenLevels={() => setScreen({ name: "levels" })}
              onOpenIelts={() => setScreen({ name: "ielts" })}
              onOpenPhrasal={() => setScreen({ name: "phrasal" })}
              customLists={customLists}
              onImportList={() => setShowImport(true)}
              onDeleteList={removeList}
            />
          )}
          {contentReady && screen.name === "levels" && (
            <LevelsScreen
              content={content}
              progress={progress}
              crystals={crystals}
              onUnlock={onUnlock}
              onStart={(key, mode) => onStart(key, mode, "levels")}
            />
          )}
          {screen.name === "ielts" && (
            <IeltsScreen progress={progress} onStart={(key, mode) => onStart(key, mode, "ielts")} />
          )}
          {contentReady && screen.name === "search" && (
            <SearchScreen content={content} onOpenWord={setCtxWord} />
          )}
          {contentReady && screen.name === "grammar" && <GrammarScreen courseLang={courseLang} />}
          {screen.name === "phrasal" && (
            <PhrasalVerbsScreen progress={progress} onStart={(key, mode) => onStart(key, mode, "phrasal")} />
          )}
          {contentReady && screen.name === "progress" && (
            <ProgressScreen content={content} progress={progress} stats={stats} onOpenWord={setCtxWord} />
          )}

          {contentReady && screen.name === "flash" && (
            <FlashcardsScreen
              content={content}
              groupKey={screen.key}
              progress={progress}
              onChangeProgress={updateProgress}
              onBack={studyBack}
            />
          )}
          {contentReady && screen.name === "plan" && plan && (
            <FlashcardsScreen
              content={content}
              groupKey=""
              progress={progress}
              onChangeProgress={updateProgress}
              onBack={() => setScreen({ name: "groups" })}
              plan={{
                deck: planDeck(content, plan),
                done: plan.done.length,
                total: plan.items.length,
                completed: plan.completed,
                streak: n,
                onAnswer: answerPlan,
              }}
            />
          )}
          {contentReady && screen.name === "quiz" && (
            <QuizScreen
              content={content}
              groupKey={screen.key}
              progress={progress}
              onChangeProgress={updateProgress}
              onQuiz={onQuiz}
              onBack={studyBack}
            />
          )}
        </FadeIn>
        )}
      </View>

      {showTabBar && (
        <View style={styles.tabBar}>
          {visibleTabs.map(t => {
            const active = activeTab === t.id;
            return (
              <TouchableOpacity key={t.id} style={styles.tab} onPress={() => setScreen({ name: t.id })}>
                <View style={[styles.tabIconWrap, active && styles.tabIconActive]}>
                  <View style={{ opacity: active ? 1 : 0.55 }}><Emoji char={t.icon} size={24} /></View>
                </View>
                <Text style={[styles.tabLabel, { color: active ? colors.accent : colors.muted }]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <WordContextModal word={ctxWord} onClose={() => setCtxWord(null)} onPickWord={setCtxWord} />
      <ImportListModal visible={showImport} onClose={() => setShowImport(false)} onImport={importList} />
      {toast && <CrystalToast amount={0} text={toast} onDone={() => setToast(null)} />}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Main />
    </ThemeProvider>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  header: {
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8,
    flexDirection: "row", alignItems: "center", gap: 8,
  },
  logoBtn: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  logoMark: {
    width: 36, height: 36, borderRadius: 11, backgroundColor: c.accent,
    alignItems: "center", justifyContent: "center", transform: [{ rotate: "-6deg" }],
  },
  logoMarkText: { color: c.onAccent, fontWeight: "900", fontSize: 17 },
  logo: { fontSize: 22, fontWeight: "900", color: c.accent, letterSpacing: -0.5 },
  streakPill: {
    flexDirection: "row", alignItems: "center", gap: 5, height: 38, paddingHorizontal: 12,
    borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: c.card,
  },
  streakPillLit: { borderColor: "#FF8A4C" },
  streakText: { color: c.text, fontWeight: "900", fontSize: 15 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: c.border,
    backgroundColor: c.card, alignItems: "center", justifyContent: "center",
  },
  searchIcon: { color: c.text, fontSize: 20, fontWeight: "700", marginTop: -2 },
  body: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  muted: { color: c.muted, marginTop: 12, fontSize: 15, textAlign: "center" },
  hint: { color: c.muted, marginTop: 4, fontSize: 12, textAlign: "center" },
  retry: { marginTop: 16, backgroundColor: c.accent, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  retryText: { color: c.onAccent, fontWeight: "700" },
  tabBar: {
    flexDirection: "row", borderTopColor: c.border, borderTopWidth: 1, backgroundColor: c.card,
    paddingTop: 6, paddingBottom: 6,
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 2 },
  tabIconWrap: { width: 48, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  tabIconActive: { backgroundColor: c.accentSoft },
  tabLabel: { fontSize: 11, marginTop: 2, fontWeight: "700" },
});
