import { useMemo, useState } from "react";
import {
  LayoutAnimation, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, UIManager, View,
} from "react-native";
import { Colors, LEVEL_COLORS, useTheme } from "./theme";
import { AppContent, keyLabel, keyParts, levelKeys, topicKeys, wordsForKey } from "./api";
import { Progress, RecentEntry, knownCount } from "./storage";
import { Gamification } from "./session";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Mode = "flash" | "quiz";

interface Props {
  content: AppContent;
  progress: Progress;
  recent: RecentEntry[];
  game: Gamification | null;
  onStart: (key: string, mode: Mode) => void;
}

const LEVEL_NAMES: Record<string, string> = {
  A1: "Beginner", A2: "Elementary", B1: "Intermediate",
  B2: "Upper-Intermediate", C1: "Advanced", C2: "Mastery",
};

export default function GroupsScreen({ content, progress, recent, game, onStart }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const levels = levelKeys(content);
  const topics = topicKeys(content);
  const validRecent = recent.filter(r => wordsForKey(content, r.key).length > 0);

  const toggle = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenKey(k => (k === key ? null : key));
  };

  const Row = ({ groupKey, badgeColor, badgeTextColor, letter, title }: {
    groupKey: string; badgeColor: string; badgeTextColor: string; letter: string; title: string;
  }) => {
    const total = wordsForKey(content, groupKey).length;
    const known = knownCount(progress, groupKey);
    const pct = total ? Math.round((known / total) * 100) : 0;
    const isOpen = openKey === groupKey;
    return (
      <View style={[styles.row, isOpen && styles.rowOpen]}>
        <TouchableOpacity style={styles.rowHead} onPress={() => toggle(groupKey)} activeOpacity={0.75}>
          <View style={[styles.badge, { backgroundColor: badgeColor }]}>
            <Text style={[styles.badgeText, { color: badgeTextColor }]}>{letter}</Text>
          </View>
          <View style={styles.rowMid}>
            <Text style={styles.rowTitle}>{title}</Text>
            <Text style={styles.rowSub}>{known} / {total} words{pct ? ` · ${pct}%` : ""}</Text>
          </View>
          <Text style={[styles.chev, isOpen && { color: colors.accent }]}>{isOpen ? "▾" : "›"}</Text>
        </TouchableOpacity>
        {total > 0 && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
        )}
        {isOpen && (
          <View style={styles.modes}>
            <TouchableOpacity style={styles.modeBtn} onPress={() => onStart(groupKey, "flash")}>
              <Text style={styles.modeText}>🗂️  Flashcards</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modeBtn, styles.modeBtnPrimary]} onPress={() => onStart(groupKey, "quiz")}>
              <Text style={[styles.modeText, { color: colors.onAccent }]}>❓  Quiz</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {game ? (
        <View style={styles.statCard}>
          <View style={styles.statTop}>
            <View style={styles.streak}>
              <Text style={styles.streakFlame}>🔥</Text>
              <Text style={styles.streakNum}>{game.streak}</Text>
              <Text style={styles.streakLabel}>day streak</Text>
            </View>
            <Text style={styles.levelPill}>Level {game.level}</Text>
          </View>
          <Text style={styles.xpText}>{game.levelXp} / {game.levelSpan} XP</Text>
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${Math.round((game.levelXp / game.levelSpan) * 100)}%` }]} />
          </View>
        </View>
      ) : null}

      {validRecent.length > 0 && (
        <>
          <Text style={styles.section}>Recently studied</Text>
          <View style={styles.recentRow}>
            {validRecent.map(r => (
              <TouchableOpacity key={r.key} style={styles.recentChip} onPress={() => onStart(r.key, "flash")}>
                <Text style={styles.recentText}>{keyLabel(r.key)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <Text style={styles.section}>Levels</Text>
      {levels.map(key => (
        <Row
          key={key}
          groupKey={key}
          badgeColor={LEVEL_COLORS[key] || colors.accent}
          badgeTextColor="#08120E"
          letter={key}
          title={LEVEL_NAMES[key] || key}
        />
      ))}

      <Text style={styles.section}>Topics</Text>
      {topics.map(key => (
        <Row
          key={key}
          groupKey={key}
          badgeColor={colors.accentSoft}
          badgeTextColor={colors.accentStrong}
          letter={keyParts(key).name[0]}
          title={keyLabel(key)}
        />
      ))}
    </ScrollView>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  statCard: {
    backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 16, padding: 16,
  },
  statTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  streak: { flexDirection: "row", alignItems: "center", gap: 6 },
  streakFlame: { fontSize: 18 },
  streakNum: { color: c.text, fontSize: 20, fontWeight: "800" },
  streakLabel: { color: c.muted, fontSize: 13, marginLeft: 2 },
  levelPill: {
    color: c.accentStrong, backgroundColor: c.accentSoft, borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 4, fontSize: 13, fontWeight: "700", overflow: "hidden",
  },
  xpText: { color: c.muted, fontSize: 13, marginBottom: 6 },
  xpTrack: { height: 8, backgroundColor: c.card2, borderRadius: 999, overflow: "hidden" },
  xpFill: { height: 8, backgroundColor: c.accent, borderRadius: 999 },
  section: {
    fontSize: 12, fontWeight: "700", color: c.muted, textTransform: "uppercase",
    letterSpacing: 1, marginTop: 22, marginBottom: 10,
  },
  recentRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  recentChip: {
    backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 999,
    paddingVertical: 8, paddingHorizontal: 14,
  },
  recentText: { color: c.text, fontWeight: "600", fontSize: 13 },
  row: {
    backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 14,
    marginBottom: 10, overflow: "hidden",
  },
  rowOpen: { borderColor: c.accent, backgroundColor: c.card2 },
  rowHead: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  badge: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  badgeText: { color: "#08120E", fontWeight: "800", fontSize: 15 },
  rowMid: { flex: 1 },
  rowTitle: { color: c.text, fontSize: 16, fontWeight: "700" },
  rowSub: { color: c.muted, fontSize: 13, marginTop: 2 },
  chev: { color: c.muted, fontSize: 20, fontWeight: "700" },
  progressTrack: { height: 3, backgroundColor: c.card2, marginHorizontal: 12, borderRadius: 999, marginBottom: 12 },
  progressFill: { height: 3, backgroundColor: c.accent, borderRadius: 999 },
  modes: { flexDirection: "row", gap: 10, paddingHorizontal: 12, paddingBottom: 12 },
  modeBtn: {
    flex: 1, backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 12,
    paddingVertical: 12, alignItems: "center",
  },
  modeBtnPrimary: { backgroundColor: c.accent, borderColor: c.accent },
  modeText: { color: c.text, fontWeight: "600", fontSize: 14 },
});
