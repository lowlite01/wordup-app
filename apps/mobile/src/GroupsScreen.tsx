import { useMemo, useState } from "react";
import {
  LayoutAnimation, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, UIManager, View,
} from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { Colors, LEVEL_COLORS, useTheme } from "./theme";
import {
  AppContent, keyLabel, levelAllKeys, levelKeys, topicLevelKeys, topicsForLevel, wordsForKey,
} from "./api";
import { Progress, RecentEntry, knownCount } from "./storage";
import { Gamification } from "./session";
import { topicIcon } from "./topicIcons";

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
  const [openLevel, setOpenLevel] = useState<string | null>(null);

  const levels = levelKeys(content);
  const validRecent = recent.filter(r => wordsForKey(content, r.key).length > 0);

  const toggle = (level: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenLevel(l => (l === level ? null : level));
  };

  const SubRow = ({ groupKey, label, Icon, letter }: {
    groupKey: string; label: string; Icon?: LucideIcon; letter?: string;
  }) => {
    const total = wordsForKey(content, groupKey).length;
    const known = knownCount(progress, groupKey);
    const pct = total ? Math.round((known / total) * 100) : 0;
    return (
      <View style={styles.sub}>
        <TouchableOpacity style={styles.subMain} onPress={() => onStart(groupKey, "flash")} activeOpacity={0.7}>
          <View style={styles.subBadge}>
            {Icon ? <Icon size={17} color={colors.accentStrong} strokeWidth={2} />
              : <Text style={styles.subBadgeText}>{letter}</Text>}
          </View>
          <View style={styles.subMid}>
            <Text style={styles.subTitle}>{label}</Text>
            <Text style={styles.subSum}>{known} / {total}{pct ? ` · ${pct}%` : ""}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quizBtn} onPress={() => onStart(groupKey, "quiz")}>
          <Text style={styles.quizBtnText}>❓</Text>
        </TouchableOpacity>
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

      <Text style={styles.section}>Your path</Text>
      {levels.map(level => {
        const allKeys = levelAllKeys(content, level);
        const total = allKeys.reduce((n, k) => n + wordsForKey(content, k).length, 0);
        const known = allKeys.reduce((n, k) => n + knownCount(progress, k), 0);
        const pct = total ? Math.round((known / total) * 100) : 0;
        const isOpen = openLevel === level;
        const badgeColor = LEVEL_COLORS[level] || colors.accent;
        return (
          <View key={level} style={[styles.row, isOpen && styles.rowOpen]}>
            <TouchableOpacity style={styles.rowHead} onPress={() => toggle(level)} activeOpacity={0.75}>
              <View style={[styles.badge, { backgroundColor: badgeColor }]}>
                <Text style={styles.badgeText}>{level}</Text>
              </View>
              <View style={styles.rowMid}>
                <Text style={styles.rowTitle}>{LEVEL_NAMES[level] || level}</Text>
                <Text style={styles.rowSub}>{known} / {total} words{pct ? ` · ${pct}%` : ""}</Text>
              </View>
              <Text style={[styles.chev, isOpen && { color: colors.accent }]}>{isOpen ? "▾" : "›"}</Text>
            </TouchableOpacity>
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${pct}%` }]} /></View>
            {isOpen && (
              <View style={styles.subList}>
                <SubRow groupKey={level} label="Core vocabulary" letter={level} />
                {topicsForLevel(content, level).flatMap(t => topicLevelKeys(content, t)).map(key => (
                  <SubRow key={key} groupKey={key} label={keyLabel(key)} Icon={topicIcon(key.split("@")[0])} />
                ))}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  statCard: { backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 16, padding: 16 },
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
  badge: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  badgeText: { color: "#08120E", fontWeight: "800", fontSize: 15 },
  rowMid: { flex: 1 },
  rowTitle: { color: c.text, fontSize: 16, fontWeight: "700" },
  rowSub: { color: c.muted, fontSize: 13, marginTop: 2 },
  chev: { color: c.muted, fontSize: 20, fontWeight: "700" },
  progressTrack: { height: 3, backgroundColor: c.card2, marginHorizontal: 12, borderRadius: 999, marginBottom: 12 },
  progressFill: { height: 3, backgroundColor: c.accent, borderRadius: 999 },
  subList: { paddingHorizontal: 10, paddingBottom: 10, gap: 6 },
  sub: {
    flexDirection: "row", alignItems: "center", backgroundColor: c.card,
    borderColor: c.border, borderWidth: 1, borderRadius: 10, paddingRight: 8,
  },
  subMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, padding: 10 },
  subBadge: {
    width: 30, height: 30, borderRadius: 8, backgroundColor: c.accentSoft,
    alignItems: "center", justifyContent: "center",
  },
  subBadgeText: { color: c.accentStrong, fontWeight: "800", fontSize: 12 },
  subMid: { flex: 1 },
  subTitle: { color: c.text, fontSize: 14, fontWeight: "600" },
  subSum: { color: c.muted, fontSize: 12, marginTop: 1 },
  quizBtn: { padding: 8, borderRadius: 8 },
  quizBtnText: { fontSize: 16 },
});
