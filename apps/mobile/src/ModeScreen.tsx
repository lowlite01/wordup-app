import { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors, useTheme } from "./theme";
import { AppContent, keyLabel, wordsForKey } from "./api";
import { Progress, knownCount } from "./storage";

interface Props {
  content: AppContent;
  groupKey: string;
  progress: Progress;
  onFlashcards: () => void;
  onQuiz: () => void;
  onBack: () => void;
}

export default function ModeScreen({ content, groupKey, progress, onFlashcards, onQuiz, onBack }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const total = wordsForKey(content, groupKey).length;
  const known = knownCount(progress, groupKey);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.back}>‹ Groups</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{keyLabel(groupKey)}</Text>
      <Text style={styles.sub}>{total} words · {known} known</Text>

      <TouchableOpacity style={styles.mode} onPress={onFlashcards} activeOpacity={0.8}>
        <Text style={styles.modeIcon}>🗂️</Text>
        <Text style={styles.modeText}>Flashcards</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.mode} onPress={onQuiz} activeOpacity={0.8}>
        <Text style={styles.modeIcon}>❓</Text>
        <Text style={styles.modeText}>Quiz</Text>
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { flex: 1, padding: 16 },
  back: { color: c.muted, fontSize: 15, marginBottom: 6 },
  title: { fontSize: 22, fontWeight: "700", color: c.text },
  sub: { color: c.muted, fontSize: 14, marginTop: 2, marginBottom: 24 },
  mode: {
    backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 16,
    paddingVertical: 28, alignItems: "center", marginBottom: 14, flexDirection: "row",
    justifyContent: "center", gap: 12,
  },
  modeIcon: { fontSize: 26 },
  modeText: { fontSize: 18, fontWeight: "600", color: c.text },
});
