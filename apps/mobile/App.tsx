import { useEffect, useState } from "react";
import {
  ActivityIndicator, SafeAreaView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors } from "./src/theme";
import { AppContent, fetchContent } from "./src/api";
import { Progress, loadProgress, saveProgress } from "./src/storage";
import GroupsScreen from "./src/GroupsScreen";
import FlashcardsScreen from "./src/FlashcardsScreen";

type Screen = { name: "groups" } | { name: "flash"; key: string };

export default function App() {
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
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.logo}>WordUp</Text>
        <Text style={styles.subtitle}>Learn English by level & topic</Text>
      </View>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.muted}>Loading words…</Text>
          <Text style={styles.hint}>(the free server may take ~30s to wake up)</Text>
        </View>
      )}

      {error && !loading && (
        <View style={styles.center}>
          <Text style={styles.muted}>Couldn't reach the server.</Text>
          <TouchableOpacity style={styles.retry} onPress={load}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}

      {content && !loading && screen.name === "groups" && (
        <GroupsScreen
          content={content}
          progress={progress}
          onOpen={key => setScreen({ name: "flash", key })}
        />
      )}

      {content && !loading && screen.name === "flash" && (
        <FlashcardsScreen
          content={content}
          groupKey={screen.key}
          progress={progress}
          onChangeProgress={updateProgress}
          onBack={() => setScreen({ name: "groups" })}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 },
  logo: { fontSize: 26, fontWeight: "700", color: colors.accent },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  muted: { color: colors.muted, marginTop: 12, fontSize: 15 },
  hint: { color: colors.muted, marginTop: 4, fontSize: 12 },
  retry: {
    marginTop: 16,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryText: { color: colors.onAccent, fontWeight: "700" },
});
