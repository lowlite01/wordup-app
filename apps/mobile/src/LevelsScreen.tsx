import { useMemo, useState } from "react";
import {
  Alert, LayoutAnimation, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, UIManager, View,
} from "react-native";
import { Colors, LEVEL_COLORS, useTheme } from "./theme";
import {
  AppContent, LEVELS, keyLabel, keyParts, levelAllKeys, topicLevelKeys, topicsForLevel, wordsForKey,
} from "./api";
import { Progress, knownCount } from "./storage";
import { CrystalState, isTopicLocked, unlockCost } from "./crystals";
import { topicEmoji } from "./topicIcons";
import Emoji from "./Emoji";
import FadeIn from "./FadeIn";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Mode = "flash" | "quiz";

const LEVEL_NAMES: Record<string, string> = {
  A1: "Beginner", A2: "Elementary", B1: "Intermediate",
  B2: "Upper-Intermediate", C1: "Advanced", C2: "Mastery",
};

interface Props {
  content: AppContent;
  progress: Progress;
  crystals: CrystalState;
  onUnlock: (topic: string) => boolean;
  onStart: (key: string, mode: Mode) => void;
}

// "Levels" tab: the CEFR staircase A1 → C2. A level opens to its core words
// and the topics that belong to it.
export default function LevelsScreen({ content, progress, crystals, onUnlock, onStart }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [openLevel, setOpenLevel] = useState<string | null>(null);

  const handleUnlock = (topic: string) => {
    if (!onUnlock(topic)) Alert.alert("Not enough crystals", `You need ${unlockCost(topic)} 💎 to unlock this topic.`);
  };
  const toggle = (level: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenLevel(l => (l === level ? null : level));
  };
  const levelTotal = (level: string) =>
    levelAllKeys(content, level).reduce((n, k) => n + wordsForKey(content, k).length, 0);
  const levels = LEVELS.filter(l => levelTotal(l) > 0);

  const SubRow = ({ groupKey, label, emoji, letter, locked, cost }: {
    groupKey: string; label: string; emoji?: string; letter?: string; locked?: boolean; cost?: number;
  }) => {
    const total = wordsForKey(content, groupKey).length;
    const known = knownCount(progress, groupKey);
    const pct = total ? Math.round((known / total) * 100) : 0;
    if (locked) {
      return (
        <View style={styles.sub}>
          <TouchableOpacity style={styles.subMain} onPress={() => handleUnlock(groupKey)} activeOpacity={0.7}>
            <View style={styles.subBadge}><Emoji char="🔒" size={20} /></View>
            <View style={styles.subMid}>
              <Text style={styles.subTitle}>{label}</Text>
              <Text style={styles.subSum}>{total} words · unlock</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.costRow}>
            <Text style={styles.unlockCost}>{cost}</Text>
            <Emoji char="💎" size={15} />
          </View>
        </View>
      );
    }
    return (
      <View style={styles.sub}>
        <TouchableOpacity style={styles.subMain} onPress={() => onStart(groupKey, "flash")} activeOpacity={0.7}>
          <View style={styles.subBadge}>
            {emoji ? <Emoji char={emoji} size={22} /> : <Text style={styles.subBadgeText}>{letter}</Text>}
          </View>
          <View style={styles.subMid}>
            <Text style={styles.subTitle}>{label}</Text>
            <Text style={styles.subSum}>{known} / {total}{pct ? ` · ${pct}%` : ""}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quizBtn} onPress={() => onStart(groupKey, "quiz")}>
          <Emoji char="❓" size={20} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <FadeIn>
        <Text style={styles.title}>All levels</Text>
        <Text style={styles.hint}>The full path from A1 to C2. Open a level to see its core words and topics.</Text>
      </FadeIn>
      {levels.map((level, i) => {
        const allKeys = levelAllKeys(content, level);
        const total = allKeys.reduce((n, k) => n + wordsForKey(content, k).length, 0);
        const known = allKeys.reduce((n, k) => n + knownCount(progress, k), 0);
        const pct = total ? Math.round((known / total) * 100) : 0;
        const isOpen = openLevel === level;
        return (
          <FadeIn key={level} index={i + 1}>
            <View style={[styles.row, isOpen && styles.rowOpen]}>
              <TouchableOpacity style={styles.rowHead} onPress={() => toggle(level)} activeOpacity={0.75}>
                <View style={[styles.badge, { backgroundColor: LEVEL_COLORS[level] || colors.accent }]}>
                  <Text style={styles.badgeText}>{level}</Text>
                </View>
                <View style={styles.rowMid}>
                  <Text style={styles.rowTitle}>{LEVEL_NAMES[level] || level}</Text>
                  <Text style={styles.rowSub}>{known} / {total} words{pct ? ` · ${pct}%` : ""}</Text>
                </View>
                <Text style={[styles.chev, isOpen && { color: colors.accent }]}>{isOpen ? "▾" : "›"}</Text>
              </TouchableOpacity>
              <View style={styles.track}><View style={[styles.fill, { width: `${pct}%` }]} /></View>
              {isOpen && (
                <View style={styles.subList}>
                  {wordsForKey(content, level).length > 0 && (
                    <SubRow groupKey={level} label="Core vocabulary" letter={level} />
                  )}
                  {topicsForLevel(content, level).flatMap(t => topicLevelKeys(content, t)).map(key => {
                    const name = keyParts(key).name;
                    return (
                      <SubRow
                        key={key} groupKey={key} label={keyLabel(key)} emoji={topicEmoji(name)}
                        locked={isTopicLocked(crystals, name)} cost={unlockCost(name)}
                      />
                    );
                  })}
                </View>
              )}
            </View>
          </FadeIn>
        );
      })}
    </ScrollView>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  title: { color: c.text, fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  hint: { color: c.muted, fontSize: 14, marginTop: 4, marginBottom: 16, lineHeight: 20 },
  row: {
    backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 18,
    marginBottom: 10, overflow: "hidden",
  },
  rowOpen: { borderColor: c.accent },
  rowHead: { flexDirection: "row", alignItems: "center", padding: 14, gap: 14 },
  badge: { width: 50, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  badgeText: { color: "#08120E", fontWeight: "900", fontSize: 16 },
  rowMid: { flex: 1 },
  rowTitle: { color: c.text, fontSize: 17, fontWeight: "800" },
  rowSub: { color: c.muted, fontSize: 13, marginTop: 2 },
  chev: { color: c.muted, fontSize: 20, fontWeight: "700" },
  track: { height: 5, backgroundColor: c.card2, marginHorizontal: 14, borderRadius: 999, marginBottom: 14 },
  fill: { height: 5, backgroundColor: c.accent, borderRadius: 999 },
  subList: { paddingHorizontal: 10, paddingBottom: 10, gap: 6 },
  sub: {
    flexDirection: "row", alignItems: "center", backgroundColor: c.bg,
    borderColor: c.border, borderWidth: 1, borderRadius: 12, paddingRight: 8,
  },
  subMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, padding: 10 },
  subBadge: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: c.card2,
    alignItems: "center", justifyContent: "center",
  },
  subBadgeText: { color: c.accentStrong, fontWeight: "800", fontSize: 12 },
  subMid: { flex: 1 },
  subTitle: { color: c.text, fontSize: 14, fontWeight: "700" },
  subSum: { color: c.muted, fontSize: 12, marginTop: 1 },
  quizBtn: { padding: 8 },
  costRow: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6 },
  unlockCost: { color: c.accentStrong, fontWeight: "800", fontSize: 13 },
});
