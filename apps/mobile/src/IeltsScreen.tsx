import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors, useTheme } from "./theme";
import { Progress, knownCount } from "./storage";
import { IELTS_TOPICS, ieltsKey } from "./ielts";
import Emoji from "./Emoji";
import FadeIn from "./FadeIn";

// IELTS tab: exam-focused topic decks (English course only).
export default function IeltsScreen({ progress, onStart }: {
  progress: Progress;
  onStart: (key: string, mode: "flash" | "quiz") => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const total = IELTS_TOPICS.reduce((n, x) => n + x.items.length, 0);
  const known = IELTS_TOPICS.reduce((n, x) => n + knownCount(progress, ieltsKey(x.topic)), 0);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <FadeIn style={styles.hero}>
        <Emoji char="🎓" size={64} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>IELTS</Text>
          <Text style={styles.hint}>
            Exam vocabulary for Writing and Speaking: key topics, Task 1 graph language and linking words.
          </Text>
          <Text style={styles.stat}>{known ? `${known} / ${total}` : total} words</Text>
        </View>
      </FadeIn>

      {IELTS_TOPICS.map((x, i) => {
        const key = ieltsKey(x.topic);
        const k = knownCount(progress, key);
        const pct = Math.round((k / x.items.length) * 100);
        return (
          <FadeIn key={x.topic} index={i + 1}>
            <View style={[styles.card, pct === 100 && { borderColor: colors.success }]}>
              <TouchableOpacity style={styles.cardMain} onPress={() => onStart(key, "flash")} activeOpacity={0.8}>
                <Emoji char={x.emoji} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{x.topic}</Text>
                  <Text style={styles.cardHint}>{x.hint}</Text>
                  <Text style={[styles.cardHint, pct === 100 && { color: colors.success }]}>
                    {pct === 100 ? "✓ " : ""}{k ? `${k} / ${x.items.length}` : x.items.length} words
                  </Text>
                </View>
              </TouchableOpacity>
              <View style={styles.track}><View style={[styles.fill, { width: `${pct}%` }]} /></View>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.btn} onPress={() => onStart(key, "flash")}>
                  <Text style={styles.btnText}>Flashcards</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btn} onPress={() => onStart(key, "quiz")}>
                  <Text style={styles.btnText}>Quiz</Text>
                </TouchableOpacity>
              </View>
            </View>
          </FadeIn>
        );
      })}
    </ScrollView>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  hero: {
    flexDirection: "row", alignItems: "center", gap: 14, padding: 18, marginBottom: 16,
    backgroundColor: c.card, borderColor: "#F59E0B66", borderWidth: 1, borderRadius: 24,
  },
  title: { color: c.text, fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  hint: { color: c.muted, fontSize: 13, lineHeight: 18, marginTop: 2 },
  stat: { color: "#F5A524", fontSize: 13, fontWeight: "800", marginTop: 6 },
  card: {
    backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 20,
    marginBottom: 12, overflow: "hidden",
  },
  cardMain: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
  cardTitle: { color: c.text, fontSize: 17, fontWeight: "800" },
  cardHint: { color: c.muted, fontSize: 12, marginTop: 2 },
  track: { height: 5, backgroundColor: c.card2, marginHorizontal: 16, borderRadius: 999, overflow: "hidden" },
  fill: { height: 5, backgroundColor: "#F59E0B", borderRadius: 999 },
  actions: { flexDirection: "row", gap: 8, padding: 12 },
  btn: {
    flex: 1, backgroundColor: c.card2, borderColor: c.border, borderWidth: 1, borderRadius: 12,
    paddingVertical: 11, alignItems: "center",
  },
  btnText: { color: c.text, fontWeight: "700", fontSize: 14 },
});
