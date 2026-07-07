import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors, useTheme } from "./theme";
import { AppContent, KeyedWord, allWords, keyLabel } from "./api";
import { Progress, QuizStats } from "./storage";
import { pronounce } from "./dict";
import { WordLite } from "./WordContextModal";

interface Props {
  content: AppContent;
  progress: Progress;
  stats: QuizStats;
  onOpenWord: (w: WordLite) => void;
}

type Tab = "learning" | "known" | "mistakes";

export default function ProgressScreen({ content, progress, stats, onOpenWord }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [tab, setTab] = useState<Tab>("learning");

  const { learning, known } = useMemo(() => {
    const learn: KeyedWord[] = [];
    const kn: KeyedWord[] = [];
    for (const w of allWords(content)) {
      if ((progress.known[w.key] || []).includes(w.word)) kn.push(w);
      else if ((progress.learning[w.key] || []).includes(w.word)) learn.push(w);
    }
    return { learning: learn, known: kn };
  }, [content, progress]);

  const mistakes = useMemo(() =>
    Object.entries(stats)
      .filter(([, s]) => s.wrong > 0)
      .sort((a, b) => b[1].wrong - a[1].wrong || a[1].right - b[1].right),
    [stats]);

  const seg = (id: Tab, label: string) => (
    <TouchableOpacity style={[styles.segBtn, tab === id && styles.segActive]} onPress={() => setTab(id)}>
      <Text style={[styles.segText, tab === id && styles.segTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const list = tab === "learning" ? learning : known;

  return (
    <View style={styles.container}>
      <View style={styles.segment}>
        {seg("learning", `Learning ${learning.length}`)}
        {seg("known", `Known ${known.length}`)}
        {seg("mistakes", `Mistakes ${mistakes.length}`)}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {tab === "mistakes" ? (
          mistakes.length === 0 ? (
            <Text style={styles.muted}>Take a quiz — the words you miss will collect here.</Text>
          ) : mistakes.map(([word, s]) => {
            const total = s.right + s.wrong;
            const confused = Object.entries(s.confused).sort((a, b) => b[1] - a[1]).slice(0, 3)
              .map(([w, n]) => `“${w}”${n > 1 ? ` ×${n}` : ""}`).join(", ");
            return (
              <TouchableOpacity key={word} style={styles.row} onPress={() => onOpenWord({ word })}>
                <View style={styles.rowTop}>
                  <Text style={styles.word}>{word}</Text>
                  <Text style={styles.wrong}>✗ {s.wrong}</Text>
                  <Text style={styles.right}>✓ {s.right}</Text>
                  <Text style={styles.tag}>{Math.round((s.right / total) * 100)}%</Text>
                </View>
                {confused ? <Text style={styles.def}>You picked instead: {confused}</Text> : null}
              </TouchableOpacity>
            );
          })
        ) : list.length === 0 ? (
          <Text style={styles.muted}>
            {tab === "learning"
              ? "Mark words as “Still learning” in flashcards and they'll collect here."
              : "Words you mark as known will appear here."}
          </Text>
        ) : list.map(w => (
          <View key={w.key + w.word} style={styles.row}>
            <View style={styles.rowTop}>
              <TouchableOpacity onPress={() => onOpenWord(w)}>
                <Text style={styles.wordLink}>{w.word}</Text>
              </TouchableOpacity>
              <Text style={styles.pos}>{w.pos}</Text>
              <Text style={styles.tag}>{keyLabel(w.key)}</Text>
            </View>
            <Text style={styles.def}>{w.def}</Text>
            <TouchableOpacity style={styles.speak} onPress={() => pronounce(w.word)}>
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
  segment: { flexDirection: "row", gap: 6, marginBottom: 8 },
  segBtn: {
    flex: 1, borderColor: c.border, borderWidth: 1, borderRadius: 999, paddingVertical: 9,
    alignItems: "center", backgroundColor: c.card,
  },
  segActive: { backgroundColor: c.accent, borderColor: c.accent },
  segText: { color: c.muted, fontWeight: "600", fontSize: 12 },
  segTextActive: { color: c.onAccent },
  list: { paddingVertical: 12, paddingBottom: 40 },
  muted: { color: c.muted, fontSize: 14, marginTop: 8, lineHeight: 20 },
  row: {
    backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 12,
    padding: 14, marginBottom: 10,
  },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  word: { fontSize: 16, fontWeight: "700", color: c.text },
  wordLink: { fontSize: 16, fontWeight: "700", color: c.text, textDecorationLine: "underline" },
  pos: { fontSize: 12, color: c.accent2Strong, textTransform: "uppercase" },
  wrong: { color: c.danger, fontSize: 13 },
  right: { color: c.success, fontSize: 13 },
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
