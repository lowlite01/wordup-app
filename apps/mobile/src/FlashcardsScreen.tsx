import { useMemo, useRef, useState } from "react";
import {
  Animated, PanResponder, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import * as Speech from "expo-speech";
import { Colors, useTheme } from "./theme";
import { AppContent, keyLabel, wordsForKey } from "./api";
import { Progress, setWordState } from "./storage";

interface Props {
  content: AppContent;
  groupKey: string;
  progress: Progress;
  onChangeProgress: (p: Progress) => void;
  onBack: () => void;
}

export default function FlashcardsScreen({ content, groupKey, progress, onChangeProgress, onBack }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const known = progress.known[groupKey] || [];
  const [deck, setDeck] = useState(() =>
    wordsForKey(content, groupKey).filter(w => !known.includes(w.word)));
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const total = useMemo(() => wordsForKey(content, groupKey).length, [content, groupKey]);
  const card = deck.length ? deck[Math.min(idx, deck.length - 1)] : null;

  const speak = (word: string) => {
    Speech.stop();
    Speech.speak(word, { language: "en-US", rate: 0.9 });
  };

  const move = (delta: number) => {
    setDeck(d => {
      if (!d.length) return d;
      setIdx(i => (i + delta + d.length) % d.length);
      return d;
    });
    setRevealed(false);
  };

  // Swipe gestures: left → next card, right → previous. A small movement is a tap → reveal.
  const translateX = useRef(new Animated.Value(0)).current;
  const moveRef = useRef(move);
  moveRef.current = move;
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6,
      onPanResponderMove: (_, g) => translateX.setValue(g.dx),
      onPanResponderRelease: (_, g) => {
        const fly = (dir: number, delta: number) =>
          Animated.timing(translateX, { toValue: dir * 600, duration: 180, useNativeDriver: true })
            .start(() => { moveRef.current(delta); translateX.setValue(0); });
        if (g.dx > 80) fly(1, -1);
        else if (g.dx < -80) fly(-1, 1);
        else {
          if (Math.abs(g.dx) < 8 && Math.abs(g.dy) < 8) setRevealed(r => !r);
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  const mark = (state: "known" | "learning") => {
    if (!card) return;
    onChangeProgress(setWordState(progress, groupKey, card.word, state));
    if (state === "known") {
      setDeck(d => {
        const next = d.filter(w => w.word !== card.word);
        if (idx >= next.length) setIdx(0);
        return next;
      });
      setRevealed(false);
    } else {
      move(1);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.back}>‹ Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{keyLabel(groupKey)}</Text>

      {!card ? (
        <View style={styles.done}>
          <Text style={styles.doneEmoji}>🎉</Text>
          <Text style={styles.doneText}>You know every word in this deck!</Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={onBack}>
            <Text style={styles.btnPrimaryText}>Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={styles.progress}>
            Card {Math.min(idx, deck.length - 1) + 1} / {deck.length} · swipe or tap
          </Text>

          <Animated.View
            style={[styles.cardBox, { transform: [{ translateX }] }]}
            {...pan.panHandlers}
          >
            <Text style={styles.pos}>{card.pos}</Text>
            <Text style={styles.word}>{card.word}</Text>
            {revealed ? (
              <>
                <Text style={styles.def}>{card.def}</Text>
                <Text style={styles.example}>{card.example}</Text>
              </>
            ) : (
              <Text style={styles.hint}>Tap to reveal · swipe to move</Text>
            )}
          </Animated.View>

          <TouchableOpacity style={styles.speak} onPress={() => speak(card.word)}>
            <Text style={styles.speakText}>🔊 Pronounce</Text>
          </TouchableOpacity>

          <View style={styles.row}>
            <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={() => mark("learning")}>
              <Text style={[styles.btnText, { color: colors.danger }]}>Still learning</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnSuccess]} onPress={() => mark("known")}>
              <Text style={[styles.btnText, { color: colors.onAccent }]}>I know it ✓</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { flex: 1, padding: 16 },
  back: { color: c.muted, fontSize: 15, marginBottom: 6 },
  title: { fontSize: 20, fontWeight: "700", color: c.text, marginBottom: 4 },
  progress: { color: c.muted, fontSize: 13, marginBottom: 12 },
  cardBox: {
    backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 16,
    padding: 28, minHeight: 240, alignItems: "center", justifyContent: "center",
  },
  pos: {
    color: c.accent2Strong, backgroundColor: c.accent2Soft, borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 3, fontSize: 12, textTransform: "uppercase",
    overflow: "hidden", marginBottom: 12,
  },
  word: { fontSize: 30, fontWeight: "700", color: c.text, textAlign: "center" },
  def: { fontSize: 17, color: c.text, marginTop: 16, textAlign: "center" },
  example: { fontSize: 14, color: c.muted, fontStyle: "italic", marginTop: 10, textAlign: "center" },
  hint: { color: c.muted, fontSize: 13, marginTop: 18 },
  speak: {
    alignSelf: "center", marginTop: 14, backgroundColor: c.accentSoft, borderColor: c.border,
    borderWidth: 1, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 18,
  },
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
