import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors, useTheme } from "./theme";
import { AppContent, keyLabel, levelKeys, topicKeys, wordsForKey } from "./api";
import { Progress, knownCount } from "./storage";

interface Props {
  content: AppContent;
  progress: Progress;
  onOpen: (key: string) => void;
}

export default function GroupsScreen({ content, progress, onOpen }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const levels = levelKeys(content);
  const topics = topicKeys(content);

  const renderGrid = (keys: string[]) => (
    <View style={styles.grid}>
      {keys.map(key => {
        const total = wordsForKey(content, key).length;
        const known = knownCount(progress, key);
        const pct = total ? Math.round((known / total) * 100) : 0;
        return (
          <TouchableOpacity key={key} style={styles.card} onPress={() => onOpen(key)} activeOpacity={0.7}>
            <Text style={styles.cardName}>{keyLabel(key)}</Text>
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
      })}
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

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  section: {
    fontSize: 13, fontWeight: "600", color: c.muted, textTransform: "uppercase",
    letterSpacing: 0.5, marginTop: 18, marginBottom: 10,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 14,
    padding: 16, width: "31%", minWidth: 100, flexGrow: 1, alignItems: "center",
  },
  cardName: { fontSize: 16, fontWeight: "700", color: c.text },
  cardCount: { fontSize: 12, color: c.muted, marginTop: 4 },
  bar: {
    height: 6, backgroundColor: c.accent2Soft, borderRadius: 999, width: "100%",
    marginTop: 8, overflow: "hidden",
  },
  barFill: { height: 6, backgroundColor: c.accent, borderRadius: 999 },
  cardKnown: { fontSize: 11, color: c.accentStrong, marginTop: 4 },
});
