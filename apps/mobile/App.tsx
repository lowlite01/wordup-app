import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, SafeAreaView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Colors, ThemeProvider, useTheme } from "./src/theme";
import { AppContent, fetchContent } from "./src/api";
import { Progress, loadProgress, saveProgress } from "./src/storage";
import GroupsScreen from "./src/GroupsScreen";
import ModeScreen from "./src/ModeScreen";
import FlashcardsScreen from "./src/FlashcardsScreen";
import QuizScreen from "./src/QuizScreen";
import SettingsScreen from "./src/SettingsScreen";

type Screen =
  | { name: "groups" }
  | { name: "mode"; key: string }
  | { name: "flash"; key: string }
  | { name: "quiz"; key: string }
  | { name: "settings" };

function Main() {
  const { colors, name: themeName } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [content, setContent] = useState<AppContent | null>(null);
  const [progress, setProgress] = useState<Progress>({ known: {}, learning: {} });
  const [screen, setScreen] = useState<Screen>({ name: "groups" });
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError(false);
    fetchContent()
      .then(c => { setContent(c); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  };

  useEffect(() => {
    loadProgress().then(setProgress);
    load();
  }, []);

  const updateProgress = (p: Progress) => {
    setProgress(p);
    saveProgress(p);
  };

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
        <SettingsScreen onBack={() => setScreen({ name: "groups" })} />
      )}

      {content && !loading && screen.name === "groups" && (
        <GroupsScreen
          content={content}
          progress={progress}
          onOpen={key => setScreen({ name: "mode", key })}
        />
      )}

      {content && !loading && screen.name === "mode" && (
        <ModeScreen
          content={content}
          groupKey={screen.key}
          progress={progress}
          onFlashcards={() => setScreen({ name: "flash", key: screen.key })}
          onQuiz={() => setScreen({ name: "quiz", key: screen.key })}
          onBack={() => setScreen({ name: "groups" })}
        />
      )}

      {content && !loading && screen.name === "flash" && (
        <FlashcardsScreen
          content={content}
          groupKey={screen.key}
          progress={progress}
          onChangeProgress={updateProgress}
          onBack={() => setScreen({ name: "mode", key: screen.key })}
        />
      )}

      {content && !loading && screen.name === "quiz" && (
        <QuizScreen
          content={content}
          groupKey={screen.key}
          progress={progress}
          onChangeProgress={updateProgress}
          onBack={() => setScreen({ name: "mode", key: screen.key })}
        />
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
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  muted: { color: c.muted, marginTop: 12, fontSize: 15, textAlign: "center" },
  hint: { color: c.muted, marginTop: 4, fontSize: 12, textAlign: "center" },
  retry: {
    marginTop: 16, backgroundColor: c.accent, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24,
  },
  retryText: { color: c.onAccent, fontWeight: "700" },
});
