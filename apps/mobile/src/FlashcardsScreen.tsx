import { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "./theme";
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
  const known = progress.known[groupKey] || [];
  // Deck = words not yet known. Built once; marking known drops the card.
  const [deck, setDeck] = useState(() =>
    wordsForKey(content, groupKey).filter(w => !known.includes(w.word)));
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const total = useMemo(() => wordsForKey(content, groupKey).length, [content, groupKey]);
  const card = deck.length ? deck[Math.min(idx, deck.length - 1)] : null;

  const move = (delta: number) => {
    if (!deck.length) return;
    setIdx(i => (i + delta + deck.length) % deck.length);
    setRevealed(false);
  };

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
            <Text style={styles.btnPrimaryText}>Back to groups</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={styles.progress}>
            Card {Math.min(idx, deck.length - 1) + 1} / {deck.length} · {total - deck.length} known
          </Text>

          <TouchableOpacity
            style={styles.cardBox}
            activeOpacity={0.9}
            onPress={() => setRevealed(r => !r)}
          >
            <Text style={styles.pos}>{card.pos}</Text>
            <Text style={styles.word}>{card.word}</Text>
            {revealed ? (
              <>
                <Text style={styles.def}>{card.def}</Text>
                <Text style={styles.example}>{card.example}</Text>
              </>
            ) : (
              <Text style={styles.hint}>Tap to reveal</Text>
            )}
          </TouchableOpacity>

          <View style={styles.row}>
            <TouchableOpacity style={styles.btn} onPress={() => move(-1)}>
              <Text style={styles.btnText}>‹ Prev</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btn} onPress={() => move(1)}>
              <Text style={styles.btnText}>Next ›</Text>
            </TouchableOpacity>
          </View>
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

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  back: { color: colors.muted, fontSize: 15, marginBottom: 6 },
  title: { fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: 4 },
  progress: { color: colors.muted, fontSize: 13, marginBottom: 12 },
  cardBox: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 28,
    minHeight: 240,
    alignItems: "center",
    justifyContent: "center",
  },
  pos: {
    color: colors.accent2Strong,
    backgroundColor: colors.accent2Soft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 3,
    fontSize: 12,
    textTransform: "uppercase",
    overflow: "hidden",
    marginBottom: 12,
  },
  word: { fontSize: 30, fontWeight: "700", color: colors.text, textAlign: "center" },
  def: { fontSize: 17, color: colors.text, marginTop: 16, textAlign: "center" },
  example: { fontSize: 14, color: colors.muted, fontStyle: "italic", marginTop: 10, textAlign: "center" },
  hint: { color: colors.muted, fontSize: 13, marginTop: 18 },
  row: { flexDirection: "row", gap: 10, marginTop: 12 },
  btn: {
    flex: 1,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnText: { fontSize: 15, fontWeight: "600", color: colors.text },
  btnDanger: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  btnSuccess: { backgroundColor: colors.accent, borderColor: colors.accent },
  done: { alignItems: "center", marginTop: 60 },
  doneEmoji: { fontSize: 44 },
  doneText: { fontSize: 17, color: colors.text, marginTop: 12, textAlign: "center" },
  btnPrimary: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 20,
  },
  btnPrimaryText: { color: colors.onAccent, fontWeight: "700", fontSize: 15 },
});
