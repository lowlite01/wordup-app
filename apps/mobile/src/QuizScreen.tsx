import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors, useTheme } from "./theme";
import { AppContent, Word, keyLabel, wordsForKey } from "./api";
import { Progress, setWordState } from "./storage";

interface Props {
  content: AppContent;
  groupKey: string;
  progress: Progress;
  onChangeProgress: (p: Progress) => void;
  onBack: () => void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function QuizScreen({ content, groupKey, progress, onChangeProgress, onBack }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const all = useMemo(() => wordsForKey(content, groupKey), [content, groupKey]);
  const [words] = useState(() => shuffle(all));
  const [qi, setQi] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const correct = words[qi];
  const options = useMemo(() => {
    if (!correct) return [];
    const distractors = shuffle(all.filter(w => w.word !== correct.word)).slice(0, 3);
    return shuffle([correct, ...distractors]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qi]);

  if (all.length < 2) {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={onBack}><Text style={styles.back}>‹ Back</Text></TouchableOpacity>
        <Text style={styles.muted}>Not enough words here for a quiz.</Text>
      </View>
    );
  }

  if (done) {
    return (
      <View style={styles.container}>
        <View style={styles.result}>
          <Text style={styles.resultTitle}>Quiz complete!</Text>
          <Text style={styles.resultScore}>{score} / {words.length} correct</Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={onBack}>
            <Text style={styles.btnPrimaryText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const answer = (opt: Word) => {
    if (picked) return;
    setPicked(opt.word);
    if (opt.word === correct.word) {
      setScore(s => s + 1);
      onChangeProgress(setWordState(progress, groupKey, correct.word, "known"));
    } else {
      onChangeProgress(setWordState(progress, groupKey, correct.word, "learning"));
    }
  };

  const next = () => {
    setPicked(null);
    if (qi + 1 >= words.length) setDone(true);
    else setQi(i => i + 1);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={onBack}><Text style={styles.back}>‹ Back</Text></TouchableOpacity>
      <View style={styles.row}>
        <Text style={styles.muted}>{keyLabel(groupKey)} · {qi + 1} / {words.length}</Text>
        <Text style={styles.muted}>Score: {score}</Text>
      </View>

      <Text style={styles.prompt}>What word matches this definition?</Text>
      <Text style={styles.def}>{correct.def}</Text>

      {options.map(opt => {
        let extra = null;
        if (picked) {
          if (opt.word === correct.word) extra = styles.optCorrect;
          else if (opt.word === picked) extra = styles.optWrong;
        }
        return (
          <TouchableOpacity
            key={opt.word}
            style={[styles.opt, extra]}
            onPress={() => answer(opt)}
            activeOpacity={0.8}
            disabled={!!picked}
          >
            <Text style={styles.optText}>{opt.word}</Text>
          </TouchableOpacity>
        );
      })}

      {picked && (
        <>
          <Text style={picked === correct.word ? styles.fbGood : styles.fbBad}>
            {picked === correct.word ? "Correct!" : `Answer: ${correct.word}`}
          </Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={next}>
            <Text style={styles.btnPrimaryText}>Next ›</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { padding: 16, flexGrow: 1 },
  back: { color: c.muted, fontSize: 15, marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  muted: { color: c.muted, fontSize: 14 },
  prompt: { color: c.muted, fontSize: 14 },
  def: { fontSize: 20, fontWeight: "700", color: c.text, marginTop: 6, marginBottom: 18 },
  opt: {
    backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 12,
    paddingVertical: 16, paddingHorizontal: 16, marginBottom: 10,
  },
  optText: { fontSize: 16, color: c.text },
  optCorrect: { borderColor: c.success, backgroundColor: c.accentSoft },
  optWrong: { borderColor: c.danger, backgroundColor: c.dangerSoft },
  fbGood: { color: c.success, fontWeight: "700", fontSize: 16, marginTop: 8 },
  fbBad: { color: c.danger, fontWeight: "700", fontSize: 16, marginTop: 8 },
  btnPrimary: {
    backgroundColor: c.accent, borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 16,
  },
  btnPrimaryText: { color: c.onAccent, fontWeight: "700", fontSize: 15 },
  result: { alignItems: "center", marginTop: 60 },
  resultTitle: { fontSize: 22, fontWeight: "700", color: c.text },
  resultScore: { fontSize: 20, color: c.text, marginTop: 12, marginBottom: 20 },
});
