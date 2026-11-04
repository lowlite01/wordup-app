import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated, PanResponder, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { Colors, useTheme } from "./theme";
import { AppContent, KeyedWord, keyLabel, wordsForKey } from "./api";
import { Progress, setWordState } from "./storage";
import { cachedEntry, fetchDict, pronounce } from "./dict";
import Confetti from "./Confetti";
import Emoji from "./Emoji";

type DeckCard = KeyedWord & { kind?: "new" | "review" };

interface Props {
  content: AppContent;
  groupKey: string;
  progress: Progress;
  onChangeProgress: (p: Progress) => void;
  onBack: () => void;
  // Daily-plan mode: a fixed deck from several groups. Both answers count the
  // card as done for today.
  plan?: {
    deck: DeckCard[];
    done: number;
    total: number;
    completed: boolean;
    streak: number;
    onAnswer: (key: string, word: string) => void;
  };
}

const SWIPE_THRESHOLD = 110;

export default function FlashcardsScreen({ content, groupKey, progress, onChangeProgress, onBack, plan }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const known = progress.known[groupKey] || [];
  const [deck, setDeck] = useState<DeckCard[]>(() =>
    plan ? plan.deck
      : wordsForKey(content, groupKey).filter(w => !known.includes(w.word)).map(w => ({ ...w, key: groupKey })));
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const total = useMemo(() => wordsForKey(content, groupKey).length, [content, groupKey]);
  const card = deck.length ? deck[Math.min(idx, deck.length - 1)] : null;

  const [ipa, setIpa] = useState("");
  useEffect(() => {
    if (!card) { setIpa(""); return; }
    setIpa(cachedEntry(card.word)?.ipa || "");
    let alive = true;
    fetchDict(card.word).then(d => { if (alive && d?.ipa) setIpa(d.ipa); });
    return () => { alive = false; };
  }, [card?.word]);

  const pos = useRef(new Animated.Value(0)).current;       // horizontal drag
  const scale = useRef(new Animated.Value(1)).current;     // "pop-in" of a new card
  const flip = useRef(new Animated.Value(0)).current;      // 0 = front, 1 = back

  useEffect(() => {
    Animated.timing(flip, { toValue: revealed ? 1 : 0, duration: 260, useNativeDriver: true }).start();
  }, [revealed, flip]);

  const popIn = () => {
    scale.setValue(0.92);
    Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: true }).start();
  };

  const advanceLearning = () => {
    setDeck(d => {
      if (d.length) setIdx(i => (i + 1) % d.length);
      return d;
    });
    setRevealed(false);
    popIn();
  };
  const removeKnown = (word: string) => {
    setDeck(d => {
      const next = d.filter(w => w.word !== word);
      setIdx(i => (i >= next.length ? 0 : i));
      return next;
    });
    setRevealed(false);
    popIn();
  };

  // Refs so the once-created PanResponder always sees the latest card/handlers.
  const cardRef = useRef(card);
  cardRef.current = card;
  const actRef = useRef({ advanceLearning, removeKnown });
  actRef.current = { advanceLearning, removeKnown };
  const isPlanRef = useRef(!!plan);

  // Each card carries its own group key (needed in plan mode, where cards come
  // from several groups).
  const mark = (state: "known" | "learning", word: string) => {
    const key = cardRef.current?.key ?? groupKey;
    onChangeProgress(setWordState(progressRef.current, key, word, state));
    if (plan) plan.onAnswer(key, word);
  };
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const markRef = useRef(mark);
  markRef.current = mark;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6,
      onPanResponderMove: (_, g) => pos.setValue(g.dx),
      onPanResponderRelease: (_, g) => {
        const w = cardRef.current?.word;
        const flyOff = (dir: number, after: () => void) =>
          Animated.timing(pos, { toValue: dir * 600, duration: 220, useNativeDriver: true })
            .start(() => { after(); pos.setValue(0); });
        if (g.dx > SWIPE_THRESHOLD && w) {
          markRef.current("known", w);
          flyOff(1, () => actRef.current.removeKnown(w));
        } else if (g.dx < -SWIPE_THRESHOLD && w) {
          markRef.current("learning", w);
          // in the daily plan a "still learning" card is also done for today
          flyOff(-1, () => (isPlanRef.current ? actRef.current.removeKnown(w) : actRef.current.advanceLearning()));
        } else {
          if (Math.abs(g.dx) < 8 && Math.abs(g.dy) < 8) setRevealed(r => !r);
          Animated.spring(pos, { toValue: 0, friction: 6, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  const rotate = pos.interpolate({ inputRange: [-300, 0, 300], outputRange: ["-11deg", "0deg", "11deg"] });
  const cardOpacity = pos.interpolate({ inputRange: [-400, -220, 0, 220, 400], outputRange: [0, 1, 1, 1, 0] });
  const knowOpacity = pos.interpolate({ inputRange: [0, SWIPE_THRESHOLD], outputRange: [0, 1], extrapolate: "clamp" });
  const learnOpacity = pos.interpolate({ inputRange: [-SWIPE_THRESHOLD, 0], outputRange: [1, 0], extrapolate: "clamp" });
  const frontRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const backRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "360deg"] });

  if (!card && plan) {
    return (
      <View style={styles.container}>
        {plan.completed && <Confetti />}
        <TouchableOpacity onPress={onBack}><Text style={styles.back}>‹ Back</Text></TouchableOpacity>
        <View style={styles.done}>
          <Emoji char="🔥" size={84} />
          <Text style={styles.doneStreak}>{plan.streak}</Text>
          <Text style={styles.doneTitle}>{plan.completed ? "Plan done!" : "Nothing to study today"}</Text>
          <Text style={styles.doneText}>
            {plan.completed
              ? `Streak: ${plan.streak} ${plan.streak === 1 ? "day" : "days"} in a row. Come back tomorrow for a new plan.`
              : "You've learned every word available. Unlock a new topic to get fresh words."}
          </Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={onBack}>
            <Text style={styles.btnPrimaryText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!card) {
    return (
      <View style={styles.container}>
        <Confetti />
        <TouchableOpacity onPress={onBack}><Text style={styles.back}>‹ Back</Text></TouchableOpacity>
        <View style={styles.done}>
          <Emoji char="🎉" size={64} />
          <Text style={styles.doneText}>You know every word in this deck!</Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={onBack}>
            <Text style={styles.btnPrimaryText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onBack}><Text style={styles.back}>‹ Back</Text></TouchableOpacity>
      <Text style={styles.title}>{plan ? "Today's plan" : keyLabel(groupKey)}</Text>
      <Text style={styles.progress}>
        {plan ? `${plan.done} / ${plan.total} today · ${keyLabel(card.key)}` : `Card ${Math.min(idx, deck.length - 1) + 1} / ${deck.length}`}
      </Text>
      {plan && (
        <View style={styles.planTrack}>
          <View style={[styles.planFill, { width: `${plan.total ? (plan.done / plan.total) * 100 : 0}%` }]} />
        </View>
      )}

      <View style={styles.stage}>
        <View style={[styles.face, styles.peek]} />
        <Animated.View
          style={[styles.cardWrap, { opacity: cardOpacity, transform: [{ translateX: pos }, { rotate }, { scale }] }]}
          {...pan.panHandlers}
        >
          <Animated.View style={[styles.badge, styles.badgeKnow, { opacity: knowOpacity }]}>
            <Text style={styles.badgeKnowText}>KNOW ✓</Text>
          </Animated.View>
          <Animated.View style={[styles.badge, styles.badgeLearn, { opacity: learnOpacity }]}>
            <Text style={styles.badgeLearnText}>LEARN</Text>
          </Animated.View>

          <Animated.View style={[styles.face, { transform: [{ perspective: 1000 }, { rotateY: frontRotate }] }]}>
            <Text style={styles.pos}>{card.pos}</Text>
            {card.kind && (
              <Text style={[styles.kind, card.kind === "review" && styles.kindReview]}>
                {card.kind === "new" ? "NEW" : "REVIEW"}
              </Text>
            )}
            <Text style={styles.word}>{card.word}</Text>
            {ipa ? <Text style={styles.ipa}>{ipa}</Text> : null}
            <Text style={styles.hint}>Tap to flip · swipe to sort</Text>
          </Animated.View>
          <Animated.View style={[styles.face, styles.faceBack, { transform: [{ perspective: 1000 }, { rotateY: backRotate }] }]}>
            <Text style={styles.def}>{card.def}</Text>
            <Text style={styles.example}>{card.example}</Text>
          </Animated.View>
        </Animated.View>
      </View>

      <TouchableOpacity style={styles.speak} onPress={() => pronounce(card.word)}>
        <Emoji char="🔊" size={20} />
        <Text style={styles.speakText}>Pronounce</Text>
      </TouchableOpacity>

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.btn, styles.btnDanger]}
          onPress={() => { mark("learning", card.word); if (plan) removeKnown(card.word); else advanceLearning(); }}
        >
          <Text style={[styles.btnText, { color: colors.danger }]}>Still learning</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnSuccess]}
          onPress={() => { mark("known", card.word); removeKnown(card.word); }}
        >
          <Text style={[styles.btnText, { color: colors.onAccent }]}>I know it ✓</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { flex: 1, padding: 16 },
  back: { color: c.muted, fontSize: 15, marginBottom: 6 },
  title: { fontSize: 20, fontWeight: "700", color: c.text },
  progress: { color: c.muted, fontSize: 13, marginBottom: 12 },
  stage: { height: 300, alignItems: "center", justifyContent: "center" },
  cardWrap: { width: "100%", height: 280 },
  face: {
    position: "absolute", top: 0, left: 0, right: 0, height: 280,
    backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 18,
    padding: 24, alignItems: "center", justifyContent: "center", backfaceVisibility: "hidden",
  },
  faceBack: { backgroundColor: c.card2 },
  peek: {
    height: 280, backgroundColor: c.card2, transform: [{ scale: 0.94 }, { translateY: 10 }], opacity: 0.6,
  },
  pos: {
    color: c.accent2Strong, backgroundColor: c.accent2Soft, borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 3, fontSize: 12, textTransform: "uppercase",
    overflow: "hidden", marginBottom: 14,
  },
  word: { fontSize: 32, fontWeight: "700", color: c.text, textAlign: "center" },
  ipa: { color: c.muted, fontSize: 15, marginTop: 8 },
  hint: { color: c.muted, fontSize: 12, marginTop: 20 },
  def: { fontSize: 18, color: c.text, textAlign: "center" },
  example: { fontSize: 14, color: c.muted, fontStyle: "italic", marginTop: 12, textAlign: "center" },
  badge: {
    position: "absolute", top: 18, zIndex: 5, borderWidth: 3, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  badgeKnow: { right: 18, borderColor: c.success, transform: [{ rotate: "14deg" }] },
  badgeKnowText: { color: c.success, fontWeight: "800", fontSize: 18 },
  badgeLearn: { left: 18, borderColor: c.danger, transform: [{ rotate: "-14deg" }] },
  badgeLearnText: { color: c.danger, fontWeight: "800", fontSize: 18 },
  speak: {
    alignSelf: "center", marginTop: 8, backgroundColor: c.accentSoft, borderColor: c.border,
    borderWidth: 1, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 18,
    flexDirection: "row", alignItems: "center", gap: 8,
  },
  kind: {
    color: c.accentStrong, backgroundColor: c.accentSoft, borderRadius: 999, overflow: "hidden",
    paddingHorizontal: 10, paddingVertical: 2, fontSize: 11, fontWeight: "800", letterSpacing: 1,
    marginTop: -6, marginBottom: 10,
  },
  kindReview: { color: "#FF9A5C", backgroundColor: "#FF8C3C22" },
  planTrack: { height: 6, backgroundColor: c.card2, borderRadius: 999, overflow: "hidden", marginBottom: 10 },
  planFill: { height: 6, backgroundColor: "#FF7A45", borderRadius: 999 },
  doneStreak: { color: "#FF7A45", fontSize: 56, fontWeight: "900", letterSpacing: -2, marginTop: 4 },
  doneTitle: { color: c.text, fontSize: 22, fontWeight: "800", marginTop: 4 },
  speakText: { color: c.accentStrong, fontWeight: "600", fontSize: 14 },
  row: { flexDirection: "row", gap: 10, marginTop: 14 },
  btn: {
    flex: 1, backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 12,
    paddingVertical: 14, alignItems: "center",
  },
  btnText: { fontSize: 15, fontWeight: "600", color: c.text },
  btnDanger: { borderColor: c.danger, backgroundColor: c.dangerSoft },
  btnSuccess: { backgroundColor: c.accent, borderColor: c.accent },
  done: { alignItems: "center", marginTop: 60 },
  doneEmoji: { fontSize: 44 },
  doneText: { fontSize: 17, color: c.text, marginTop: 12, textAlign: "center" },
  btnPrimary: {
    backgroundColor: c.accent, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24, marginTop: 20,
  },
  btnPrimaryText: { color: c.onAccent, fontWeight: "700", fontSize: 15 },
});
