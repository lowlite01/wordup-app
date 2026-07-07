import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator, SafeAreaView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Colors, ThemeProvider, useTheme } from "./src/theme";
import { AppContent, fetchContent } from "./src/api";
import { Progress, loadProgress, saveProgress } from "./src/storage";
import {
  AuthUser, getServerProgress, getToken, loadToken, login as doLogin,
  logout as doLogout, me, progressToEntries, syncProgress,
} from "./src/session";
import GroupsScreen from "./src/GroupsScreen";
import ModeScreen from "./src/ModeScreen";
import FlashcardsScreen from "./src/FlashcardsScreen";
import QuizScreen from "./src/QuizScreen";
import SearchScreen from "./src/SearchScreen";
import GrammarScreen from "./src/GrammarScreen";
import ProgressScreen from "./src/ProgressScreen";
import SettingsScreen from "./src/SettingsScreen";

type Tab = "groups" | "search" | "grammar" | "progress";
type Screen =
  | { name: Tab }
  | { name: "mode"; key: string }
  | { name: "flash"; key: string }
  | { name: "quiz"; key: string }
  | { name: "settings" };

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: "groups", icon: "🗂️", label: "Groups" },
  { id: "search", icon: "🔍", label: "Search" },
  { id: "grammar", icon: "📖", label: "Grammar" },
  { id: "progress", icon: "📊", label: "Progress" },
];

function Main() {
  const { colors, name: themeName } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [content, setContent] = useState<AppContent | null>(null);
  const [progress, setProgress] = useState<Progress>({ known: {}, learning: {} });
  const [user, setUser] = useState<AuthUser | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: "groups" });
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const progressRef = useRef(progress);
  progressRef.current = progress;

  const load = () => {
    setLoading(true);
    setError(false);
    fetchContent()
      .then(c => { setContent(c); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  };

  useEffect(() => {
    load();
    loadProgress().then(setProgress);
    loadToken().then(t => {
      if (!t) return;
      me().then(setUser).catch(() => {});
      getServerProgress().then(p => { setProgress(p); saveProgress(p); }).catch(() => {});
    });
  }, []);

  const updateProgress = (p: Progress) => {
    setProgress(p);
    saveProgress(p);
    if (getToken()) syncProgress(progressToEntries(p)).catch(() => {});
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
    } catch { /* keep local */ }
  };

  const onLogout = async () => {
    await doLogout();
    setUser(null);
  };

  const isTab = ["groups", "search", "grammar", "progress"].includes(screen.name);
  const contentReady = content && !loading;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style={themeName === "dark" ? "light" : "dark"} />
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>WordUp</Text>
          <Text style={styles.subtitle}>Learn English by level & topic</Text>
        </View>
        <TouchableOpacity style={styles.gear} onPress={() => setScreen({ name: "settings" })}>
          <Text style={styles.gearIcon}>⚙️</Text>
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
            <TouchableOpacity style={styles.retry} onPress={load}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {screen.name === "settings" && (
          <SettingsScreen user={user} onLogin={onLogin} onLogout={onLogout} onBack={() => setScreen({ name: "groups" })} />
        )}

        {contentReady && screen.name === "groups" && (
          <GroupsScreen content={content} progress={progress} onOpen={key => setScreen({ name: "mode", key })} />
        )}
        {contentReady && screen.name === "search" && <SearchScreen content={content} />}
        {contentReady && screen.name === "grammar" && <GrammarScreen />}
        {contentReady && screen.name === "progress" && <ProgressScreen content={content} progress={progress} />}

        {contentReady && screen.name === "mode" && (
          <ModeScreen
            content={content}
            groupKey={screen.key}
            progress={progress}
            onFlashcards={() => setScreen({ name: "flash", key: screen.key })}
            onQuiz={() => setScreen({ name: "quiz", key: screen.key })}
            onBack={() => setScreen({ name: "groups" })}
          />
        )}
        {contentReady && screen.name === "flash" && (
          <FlashcardsScreen
            content={content}
            groupKey={screen.key}
            progress={progress}
            onChangeProgress={updateProgress}
            onBack={() => setScreen({ name: "mode", key: screen.key })}
          />
        )}
        {contentReady && screen.name === "quiz" && (
          <QuizScreen
            content={content}
            groupKey={screen.key}
            progress={progress}
            onChangeProgress={updateProgress}
            onBack={() => setScreen({ name: "mode", key: screen.key })}
          />
        )}
      </View>

      {isTab && (
        <View style={styles.tabBar}>
          {TABS.map(t => {
            const active = screen.name === t.id;
            return (
              <TouchableOpacity key={t.id} style={styles.tab} onPress={() => setScreen({ name: t.id })}>
                <Text style={[styles.tabIcon, { opacity: active ? 1 : 0.5 }]}>{t.icon}</Text>
                <Text style={[styles.tabLabel, { color: active ? colors.accent : colors.muted }]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
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
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  logo: { fontSize: 26, fontWeight: "700", color: c.accent },
  subtitle: { fontSize: 13, color: c.muted, marginTop: 2 },
  gear: {
    width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: c.border,
    backgroundColor: c.card, alignItems: "center", justifyContent: "center",
  },
  gearIcon: { fontSize: 18 },
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
  tab: { flex: 1, alignItems: "center", paddingVertical: 6 },
  tabIcon: { fontSize: 20 },
  tabLabel: { fontSize: 11, marginTop: 2, fontWeight: "600" },
});
