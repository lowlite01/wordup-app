import { useEffect, useMemo, useRef } from "react";
import {
  Alert, Animated, Easing, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Colors, LEVEL_COLORS, useTheme } from "./theme";
import { AppContent, LEVELS, keyLabel, topicsForLevel, wordOfDay, wordsForKey } from "./api";
import { Progress, RecentEntry, knownCount } from "./storage";
import { Gamification } from "./session";
import { CrystalState, isTopicLocked, unlockCost } from "./crystals";
import { CustomList, customKey, listToText } from "./customLists";
import { topicEmoji } from "./topicIcons";
import { IELTS_TOPICS, ieltsKey } from "./ielts";
import { DailyPlan, Streak, itemId, lastWeek, liveStreak, today } from "./dailyPlan";
import Emoji from "./Emoji";
import FadeIn from "./FadeIn";

type Mode = "flash" | "quiz";

interface Props {
  content: AppContent;
  courseLang: "en" | "de";
  progress: Progress;
  recent: RecentEntry[];
  game: Gamification | null;
  crystals: CrystalState;
  plan: DailyPlan | null;
  streak: Streak;
  onStartPlan: () => void;
  onUnlock: (topic: string) => boolean;
  onStart: (key: string, mode: Mode) => void;
  onOpenLevels: () => void;
  onOpenIelts: () => void;
  onOpenPhrasal: () => void;
  customLists: CustomList[];
  onImportList: () => void;
  onDeleteList: (id: string) => void;
}

const SHELF_TITLES: Record<string, string> = {
  A1: "Start here", A2: "Everyday life", B1: "Level up", B2: "Confident", C1: "Advanced", C2: "For pros",
};
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// Flame that gently flickers (scale + tilt loop).
function Flame({ size, lit }: { size: number; lit: boolean }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!lit) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [lit, v]);
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const rotate = v.interpolate({ inputRange: [0, 1], outputRange: ["-3deg", "3deg"] });
  return (
    <Animated.View style={{ opacity: lit ? 1 : 0.35, transform: [{ scale }, { rotate }] }}>
      <Emoji char="🔥" size={size} />
    </Animated.View>
  );
}

function TodayCard({ plan, streak, game, onStartPlan, styles, colors }: {
  plan: DailyPlan | null; streak: Streak; game: Gamification | null; onStartPlan: () => void;
  styles: ReturnType<typeof makeStyles>; colors: Colors;
}) {
  const n = liveStreak(streak);
  const total = plan?.items.length ?? 0;
  const done = plan?.done.length ?? 0;
  const completed = !!plan?.completed;
  const newCount = plan?.items.filter(i => i.kind === "new").length ?? 0;
  const reviewCount = total - newCount;
  const left = plan ? plan.items.filter(i => !plan.done.includes(itemId(i.key, i.word))).length : 0;
  const R = 30;
  const C = 2 * Math.PI * R;

  // Animate the ring from its previous value.
  const ring = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(ring, { toValue: total ? done / total : 0, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [done, total, ring]);
  const AnimatedCircle = useMemo(() => Animated.createAnimatedComponent(Circle), []);
  const offset = ring.interpolate({ inputRange: [0, 1], outputRange: [C, 0] });

  const summary = total === 0
    ? "You've learned every word available — unlock a topic for fresh words."
    : completed
      ? `Streak: ${n} ${n === 1 ? "day" : "days"} in a row. Come back tomorrow for a new plan.`
      : [newCount ? `${newCount} new` : "", reviewCount ? `${reviewCount} to review` : ""].filter(Boolean).join(" · ")
        + " — finish it to keep your streak";

  return (
    <View style={[styles.today, completed && { borderColor: colors.success }]}>
      <View style={styles.todayTop}>
        <View style={styles.todayStreak}>
          <Flame size={52} lit={n > 0} />
          <View>
            <Text style={[styles.todayNum, n === 0 && { color: colors.muted }]}>{n}</Text>
            <Text style={styles.todayLabel}>{n === 1 ? "day streak" : "days streak"}</Text>
          </View>
        </View>
        <View style={styles.ring}>
          <Svg width={76} height={76} viewBox="0 0 76 76" style={{ transform: [{ rotate: "-90deg" }] }}>
            <Circle cx={38} cy={38} r={R} stroke={colors.card2} strokeWidth={8} fill="none" />
            <AnimatedCircle
              cx={38} cy={38} r={R} fill="none" strokeWidth={8} strokeLinecap="round"
              stroke={completed ? colors.success : colors.accent}
              strokeDasharray={`${C} ${C}`} strokeDashoffset={offset}
            />
          </Svg>
          <Text style={styles.ringText}>{completed ? "✓" : `${done}/${total}`}</Text>
        </View>
      </View>

      <View style={styles.week}>
        {lastWeek().map(d => {
          const lit = streak.days.includes(d);
          const isToday = d === today();
          return (
            <View key={d} style={styles.weekDay}>
              <View style={[styles.weekDot, lit && styles.weekDotLit, isToday && !lit && { borderColor: colors.accent }]}>
                {lit ? <Emoji char="🔥" size={16} /> : null}
              </View>
              <Text style={[styles.weekName, isToday && { color: colors.text }]}>
                {WEEKDAYS[new Date(d + "T12:00:00").getDay()]}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.planTitle}>Today's plan</Text>
      <Text style={styles.planSub}>{summary}</Text>
      {total > 0 && (
        <TouchableOpacity
          style={[styles.planBtn, completed && styles.planBtnDone]}
          onPress={onStartPlan}
          activeOpacity={0.85}
        >
          <Text style={[styles.planBtnText, completed && { color: colors.success }]}>
            {completed ? "Plan done ✓" : done ? `Continue · ${left} left` : "Start today's plan"}
          </Text>
        </TouchableOpacity>
      )}
      {!completed && n > 0 && total > 0 && (
        <Text style={styles.warn}>Finish today's plan or the streak resets tomorrow</Text>
      )}

      {game ? (
        <View style={styles.xpRow}>
          <Text style={styles.xpLevel}>Level {game.level}</Text>
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${Math.round((game.levelXp / game.levelSpan) * 100)}%` }]} />
          </View>
          <Text style={styles.xpText}>{game.levelXp}/{game.levelSpan} XP</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function GroupsScreen(props: Props) {
  const {
    content, courseLang, progress, recent, game, crystals, plan, streak, onStartPlan,
    onUnlock, onStart, onOpenLevels, onOpenIelts, onOpenPhrasal, customLists, onImportList, onDeleteList,
  } = props;
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const handleUnlock = (topic: string) => {
    if (!onUnlock(topic)) Alert.alert("Not enough crystals", `You need ${unlockCost(topic)} 💎 to unlock this topic.`);
  };
  const confirmDelete = (list: CustomList) => {
    Alert.alert("Delete list", `Delete the list "${list.name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => onDeleteList(list.id) },
    ]);
  };
  const validRecent = recent.filter(r => wordsForKey(content, r.key).length > 0);
  const wotd = wordOfDay(content);

  // A big topic card on a shelf; locked topics show their crystal price.
  const TopicCard = ({ groupKey, label, emoji, tint, free }: {
    groupKey: string; label: string; emoji: string; tint: string; free?: boolean;
  }) => {
    const total = wordsForKey(content, groupKey).length;
    const known = knownCount(progress, groupKey);
    const locked = !free && isTopicLocked(crystals, groupKey);
    const pct = total ? Math.round((known / total) * 100) : 0;
    return (
      <TouchableOpacity
        style={[styles.topic, { borderColor: locked ? colors.border : tint + "66" }, pct === 100 && { borderColor: colors.success }]}
        activeOpacity={0.8}
        onPress={() => (locked ? handleUnlock(groupKey) : onStart(groupKey, "flash"))}
      >
        <View style={[styles.topicGlow, { backgroundColor: tint }]} />
        <View style={{ opacity: locked ? 0.45 : 1 }}><Emoji char={emoji} size={44} /></View>
        <View style={{ flex: 1 }} />
        <Text style={[styles.topicName, locked && { color: colors.muted }]} numberOfLines={1}>{label}</Text>
        {locked ? (
          <View style={styles.lockPill}>
            <Emoji char="🔒" size={13} />
            <Text style={styles.lockText}>{unlockCost(groupKey)}</Text>
            <Emoji char="💎" size={13} />
          </View>
        ) : (
          <>
            <Text style={[styles.topicCount, pct === 100 && { color: colors.success }]}>
              {pct === 100 ? "✓ " : ""}{known ? `${known} / ${total}` : `${total}`} words
            </Text>
            <View style={styles.topicTrack}><View style={[styles.topicFill, { width: `${pct}%`, backgroundColor: tint }]} /></View>
          </>
        )}
      </TouchableOpacity>
    );
  };

  let fade = 0; // running index for staggered entrance

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <FadeIn index={fade++}>
        <TodayCard plan={plan} streak={streak} game={game} onStartPlan={onStartPlan} styles={styles} colors={colors} />
      </FadeIn>

      <FadeIn index={fade++} style={styles.homeRow}>
        {wotd ? (
          <TouchableOpacity style={styles.daily} activeOpacity={0.85} onPress={() => onStart(wotd.key, "flash")}>
            <Text style={styles.dailyLabel}>✦ Word of the day</Text>
            <Text style={styles.dailyWord} numberOfLines={1}>{wotd.word}</Text>
            <Text style={styles.dailyDef} numberOfLines={2}>{wotd.def}</Text>
            <Text style={styles.dailyGroup}>{keyLabel(wotd.key)} · Learn ›</Text>
          </TouchableOpacity>
        ) : <View style={{ flex: 1 }} />}
        <View style={styles.crystalCard}>
          <Emoji char="💎" size={34} />
          <Text style={styles.crystalNum}>{crystals.crystals}</Text>
          <Text style={styles.crystalCap}>crystals</Text>
        </View>
      </FadeIn>

      {validRecent.length > 0 && (
        <FadeIn index={fade++}>
          <Text style={styles.section}>Recently studied</Text>
          <View style={styles.recentRow}>
            {validRecent.map(r => (
              <TouchableOpacity key={r.key} style={styles.recentChip} onPress={() => onStart(r.key, "flash")}>
                <Text style={styles.recentText}>{keyLabel(r.key)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </FadeIn>
      )}

      {courseLang === "en" && (
        <FadeIn index={fade++}>
          <View style={styles.shelfHead}>
            <Text style={styles.section}>IELTS prep</Text>
            <TouchableOpacity onPress={onOpenIelts}><Text style={styles.shelfMore}>All ›</Text></TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelf}>
            {IELTS_TOPICS.map(x => (
              <TopicCard key={x.topic} groupKey={ieltsKey(x.topic)} label={x.topic} emoji={x.emoji} tint="#F59E0B" free />
            ))}
          </ScrollView>
        </FadeIn>
      )}

      {LEVELS.map(level => {
        const topics = topicsForLevel(content, level).filter(t => wordsForKey(content, t).length > 0);
        if (!topics.length) return null;
        const tint = LEVEL_COLORS[level] || colors.accent;
        return (
          <FadeIn key={level} index={fade++}>
            <View style={styles.shelfHead}>
              <Text style={styles.section}>
                {SHELF_TITLES[level]}  <Text style={{ color: tint }}>{level}</Text>
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelf}>
              {topics.map(tp => (
                <TopicCard key={tp} groupKey={tp} label={keyLabel(tp)} emoji={topicEmoji(tp)} tint={tint} />
              ))}
            </ScrollView>
          </FadeIn>
        );
      })}

      <FadeIn index={fade++}>
        <View style={styles.listsHead}>
          <Text style={styles.section}>My lists</Text>
          <TouchableOpacity style={styles.importBtn} onPress={onImportList} activeOpacity={0.8}>
            <Text style={styles.importBtnText}>＋ Import</Text>
          </TouchableOpacity>
        </View>
        {customLists.length === 0 ? (
          <Text style={styles.listsEmpty}>
            No lists yet — import words (e.g. a list you prepared elsewhere) and study them as flashcards.
          </Text>
        ) : (
          customLists.map(list => (
            <View style={styles.myList} key={list.id}>
              <TouchableOpacity style={styles.myListMain} onPress={() => onStart(customKey(list.id), "flash")} activeOpacity={0.7}>
                <View style={styles.myListBadge}><Emoji char="📝" size={22} /></View>
                <View style={styles.myListMid}>
                  <Text style={styles.myListName} numberOfLines={1}>{list.name}</Text>
                  <Text style={styles.myListSum}>{knownCount(progress, customKey(list.id))} / {list.words.length}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.listAct} onPress={() => Share.share({ message: listToText(list) }).catch(() => {})}>
                <Text style={styles.listActIcon}>⤴</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.listAct} onPress={() => confirmDelete(list)}>
                <Text style={styles.listActIcon}>🗑</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </FadeIn>

      <FadeIn index={fade++}>
        {courseLang === "en" && (
          <TouchableOpacity style={styles.linkCard} onPress={onOpenPhrasal} activeOpacity={0.8}>
            <Emoji char="🧩" size={32} />
            <View style={styles.linkMid}>
              <Text style={styles.linkTitle}>Phrasal verbs</Text>
              <Text style={styles.linkSub}>get up, look after, give in…</Text>
            </View>
            <Text style={styles.linkGo}>›</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.linkCard} onPress={onOpenLevels} activeOpacity={0.8}>
          <View style={styles.levelBadges}>
            {LEVELS.map((l, i) => (
              <View key={l} style={[styles.levelMini, { backgroundColor: LEVEL_COLORS[l], marginLeft: i ? -8 : 0 }]}>
                <Text style={styles.levelMiniText}>{l}</Text>
              </View>
            ))}
          </View>
          <View style={styles.linkMid}>
            <Text style={styles.linkTitle}>All levels</Text>
            <Text style={styles.linkSub}>Core vocabulary and topics, A1 → C2</Text>
          </View>
          <Text style={styles.linkGo}>›</Text>
        </TouchableOpacity>
      </FadeIn>
    </ScrollView>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },

  today: {
    backgroundColor: c.card, borderColor: "#FF8A4C55", borderWidth: 1, borderRadius: 24, padding: 18,
    shadowColor: "#FF6A3D", shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 4,
  },
  todayTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  todayStreak: { flexDirection: "row", alignItems: "center", gap: 12 },
  todayNum: { color: "#FF7A45", fontSize: 40, fontWeight: "900", letterSpacing: -1.5, lineHeight: 44 },
  todayLabel: { color: c.muted, fontSize: 13, fontWeight: "600" },
  ring: { width: 76, height: 76, alignItems: "center", justifyContent: "center" },
  ringText: { position: "absolute", color: c.text, fontWeight: "800", fontSize: 15 },
  week: { flexDirection: "row", justifyContent: "space-between", marginVertical: 18 },
  weekDay: { alignItems: "center", gap: 6, flex: 1 },
  weekDot: {
    width: 36, height: 36, borderRadius: 11, backgroundColor: c.card2,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "transparent",
  },
  weekDotLit: { backgroundColor: "#FF7A45", borderColor: "#FFD29A" },
  weekName: { color: c.muted, fontSize: 11, fontWeight: "600" },
  planTitle: { color: c.text, fontSize: 18, fontWeight: "800" },
  planSub: { color: c.muted, fontSize: 14, marginTop: 4, lineHeight: 20 },
  planBtn: {
    marginTop: 16, backgroundColor: c.accent, borderRadius: 16, paddingVertical: 16, alignItems: "center",
    shadowColor: c.accent, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3,
  },
  planBtnDone: { backgroundColor: c.card2, borderWidth: 1, borderColor: c.success, shadowOpacity: 0, elevation: 0 },
  planBtnText: { color: c.onAccent, fontWeight: "800", fontSize: 16 },
  warn: { color: "#FF8A4C", fontSize: 12, fontWeight: "600", textAlign: "center", marginTop: 10 },
  xpRow: {
    flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: c.border,
  },
  xpLevel: { color: c.text, fontWeight: "800", fontSize: 13 },
  xpTrack: { flex: 1, height: 8, backgroundColor: c.card2, borderRadius: 999, overflow: "hidden" },
  xpFill: { height: 8, backgroundColor: c.accent, borderRadius: 999 },
  xpText: { color: c.muted, fontSize: 12, fontWeight: "600" },

  homeRow: { flexDirection: "row", gap: 12, marginTop: 12 },
  daily: {
    flex: 1, backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 20, padding: 16,
  },
  dailyLabel: { color: c.accentStrong, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1 },
  dailyWord: { color: c.text, fontSize: 24, fontWeight: "800", marginTop: 6, letterSpacing: -0.5 },
  dailyDef: { color: c.muted, fontSize: 13, marginTop: 2 },
  dailyGroup: { color: c.accentStrong, fontSize: 12, fontWeight: "700", marginTop: 8 },
  crystalCard: {
    width: 104, backgroundColor: c.card, borderColor: "#7DD3FC55", borderWidth: 1, borderRadius: 20,
    alignItems: "center", justifyContent: "center", gap: 2,
  },
  crystalNum: { color: c.text, fontSize: 24, fontWeight: "900" },
  crystalCap: { color: c.muted, fontSize: 11, fontWeight: "600" },

  section: {
    fontSize: 12, fontWeight: "800", color: c.muted, textTransform: "uppercase",
    letterSpacing: 1, marginTop: 24, marginBottom: 10,
  },
  shelfHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  shelfMore: { color: c.accentStrong, fontWeight: "800", fontSize: 13 },
  shelf: { gap: 12, paddingRight: 16 },
  topic: {
    width: 148, height: 168, backgroundColor: c.card, borderWidth: 1, borderRadius: 22,
    padding: 14, overflow: "hidden",
  },
  topicGlow: { position: "absolute", top: -50, right: -50, width: 130, height: 130, borderRadius: 65, opacity: 0.18 },
  topicName: { color: c.text, fontSize: 16, fontWeight: "800", letterSpacing: -0.3 },
  topicCount: { color: c.muted, fontSize: 12, fontWeight: "600", marginTop: 2 },
  topicTrack: { height: 5, backgroundColor: c.card2, borderRadius: 999, marginTop: 8, overflow: "hidden" },
  topicFill: { height: 5, borderRadius: 999 },
  lockPill: {
    flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", marginTop: 6,
    backgroundColor: c.card2, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4,
  },
  lockText: { color: c.text, fontWeight: "800", fontSize: 12 },

  recentRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  recentChip: {
    backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 999,
    paddingVertical: 8, paddingHorizontal: 14,
  },
  recentText: { color: c.text, fontWeight: "600", fontSize: 13 },

  listsHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  importBtn: { backgroundColor: c.accentSoft, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 5, marginTop: 14 },
  importBtnText: { color: c.accentStrong, fontWeight: "700", fontSize: 13 },
  listsEmpty: { color: c.muted, fontSize: 13, lineHeight: 19, marginBottom: 4 },
  myList: {
    flexDirection: "row", alignItems: "center", backgroundColor: c.card,
    borderColor: c.border, borderWidth: 1, borderRadius: 14, marginBottom: 8, paddingRight: 4,
  },
  myListMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  myListBadge: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: c.accentSoft, alignItems: "center", justifyContent: "center",
  },
  myListMid: { flex: 1, minWidth: 0 },
  myListName: { color: c.text, fontSize: 15, fontWeight: "700" },
  myListSum: { color: c.muted, fontSize: 12, marginTop: 2 },
  listAct: { padding: 9 },
  listActIcon: { fontSize: 16, color: c.muted },

  linkCard: {
    flexDirection: "row", alignItems: "center", gap: 14, marginTop: 12, padding: 16,
    backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 20,
  },
  linkMid: { flex: 1 },
  linkTitle: { color: c.text, fontSize: 16, fontWeight: "800" },
  linkSub: { color: c.muted, fontSize: 13, marginTop: 2 },
  linkGo: { color: c.accent, fontSize: 24, fontWeight: "700" },
  levelBadges: { flexDirection: "row" },
  levelMini: {
    width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: c.card,
  },
  levelMiniText: { color: "#08120E", fontSize: 8, fontWeight: "900" },
});
