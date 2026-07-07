import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as Speech from "expo-speech";
import { Colors, useTheme } from "./theme";
import { AppContent, KeyedWord, allWords, keyLabel } from "./api";
import { Progress } from "./storage";

interface Props {
  content: AppContent;
  progress: Progress;
}

export default function ProgressScreen({ content, progress }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [tab, setTab] = useState<"learning" | "known">("learning");

  const { learning, known } = useMemo(() => {
    const learn: KeyedWord[] = [];
    const kn: KeyedWord[] = [];
    for (const w of allWords(content)) {
      if ((progress.known[w.key] || []).includes(w.word)) kn.push(w);
      else if ((progress.learning[w.key] || []).includes(w.word)) learn.push(w);
    }
    return { learning: learn, known: kn };
  }, [content, progress]);

  const list = tab === "learning" ? learning : known;

  return (
    <View style={styles.container}>
      <View style={styles.segment}>
        <TouchableOpacity
          style={[styles.segBtn, tab === "learning" && styles.segActive]}
          onPress={() => setTab("learning")}
        >
          <Text style={[styles.segText, tab === "learning" && styles.segTextActive]}>Learning ({learning.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segBtn, tab === "known" && styles.segActive]}
          onPress={() => setTab("known")}
        >
          <Text style={[styles.segText, tab === "known" && styles.segTextActive]}>Known ({known.length})</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {list.length === 0 && (
          <Text style={styles.muted}>
            {tab === "learning"
              ? "Mark words as “Still learning” in flashcards and they'll collect here."
              : "Words you mark as known will appear here."}
          </Text>
        )}
        {list.map(w => (
          <View key={w.key + w.word} style={styles.row}>
            <View style={styles.rowTop}>
              <Text style={styles.word}>{w.word}</Text>
              <Text style={styles.pos}>{w.pos}</Text>
              <Text style={styles.tag}>{keyLabel(w.key)}</Text>
            </View>
            <Text style={styles.def}>{w.def}</Text>
            <TouchableOpacity
              style={styles.speak}
              onPress={() => { Speech.stop(); Speech.speak(w.word, { language: "en-US", rate: 0.9 }); }}
            >
              <Text style={styles.speakText}>🔊</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { flex: 1, padding: 16 },
  segment: { flexDirection: "row", gap: 8, marginBottom: 8 },
  segBtn: {
    flex: 1, borderColor: c.border, borderWidth: 1, borderRadius: 999, paddingVertical: 10,
    alignItems: "center", backgroundColor: c.card,
  },
  segActive: { backgroundColor: c.accent, borderColor: c.accent },
  segText: { color: c.muted, fontWeight: "600", fontSize: 14 },
  segTextActive: { color: c.onAccent },
  list: { paddingVertical: 12, paddingBottom: 40 },
  muted: { color: c.muted, fontSize: 14, marginTop: 8, lineHeight: 20 },
  row: {
    backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 12,
    padding: 14, marginBottom: 10,
  },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  word: { fontSize: 16, fontWeight: "700", color: c.text },
  pos: { fontSize: 12, color: c.accent2Strong, textTransform: "uppercase" },
  tag: {
    marginLeft: "auto", backgroundColor: c.accentSoft, color: c.accentStrong,
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, fontSize: 12, overflow: "hidden",
  },
  def: { color: c.text, fontSize: 14, marginTop: 6 },
  speak: {
    alignSelf: "flex-start", marginTop: 8, backgroundColor: c.card2, borderColor: c.border,
    borderWidth: 1, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12,
  },
  speakText: { fontSize: 14 },
});
