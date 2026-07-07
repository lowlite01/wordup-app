import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "./theme";
import {
  AppContent, keyLabel, levelKeys, topicKeys, wordsForKey,
} from "./api";
import { Progress, knownCount } from "./storage";

interface Props {
  content: AppContent;
  progress: Progress;
  onOpen: (key: string) => void;
}

function GroupCard({ label, total, known, onPress }: {
  label: string; total: number; known: number; onPress: () => void;
}) {
  const pct = total ? Math.round((known / total) * 100) : 0;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.cardName}>{label}</Text>
      <Text style={styles.cardCount}>{total} words</Text>
      {known > 0 && (
        <>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.cardKnown}>{known} known</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export default function GroupsScreen({ content, progress, onOpen }: Props) {
  const levels = levelKeys(content);
  const topics = topicKeys(content);

  const renderGrid = (keys: string[]) => (
    <View style={styles.grid}>
      {keys.map(key => (
        <GroupCard
          key={key}
          label={keyLabel(key)}
          total={wordsForKey(content, key).length}
          known={knownCount(progress, key)}
          onPress={() => onOpen(key)}
        />
      ))}
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.section}>By CEFR level</Text>
      {renderGrid(levels)}
      <Text style={styles.section}>By topic</Text>
      {renderGrid(topics)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  section: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 18,
    marginBottom: 10,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    width: "31%",
    minWidth: 100,
    flexGrow: 1,
    alignItems: "center",
  },
  cardName: { fontSize: 16, fontWeight: "700", color: colors.text },
  cardCount: { fontSize: 12, color: colors.muted, marginTop: 4 },
  bar: {
    height: 6,
    backgroundColor: colors.accent2Soft,
    borderRadius: 999,
    width: "100%",
    marginTop: 8,
    overflow: "hidden",
  },
  barFill: { height: 6, backgroundColor: colors.accent, borderRadius: 999 },
  cardKnown: { fontSize: 11, color: colors.accentStrong, marginTop: 4 },
});
