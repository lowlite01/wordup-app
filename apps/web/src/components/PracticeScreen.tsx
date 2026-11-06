import { useEffect, useMemo, useState } from "react";
import { useApp } from "../context";
import { useT } from "../i18n";
import { practiceExercises } from "../lib/exercises";
import type { Word } from "../types";
import ExerciseRunner, { LessonResult } from "./ExerciseRunner";

const PASS = 0.6;

// "Practice" step: the words of the previous lesson used in real sentences —
// meaning in context, fill the gap, build the sentence, type the word.
export default function PracticeScreen({ partKey, alreadyDone, onComplete, onBack }: {
  partKey: string; alreadyDone: boolean; onComplete: () => void; onBack: () => void;
}) {
  const t = useT();
  const { settings } = useApp();
  const ru = settings.lang === "ru";
  const tr = (w: Word) => (ru && w.ru ? w.ru : w.def);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState<{ right: number; total: number } | null>(null);

  const exercises = useMemo(
    () => practiceExercises(partKey, tr, {
      context: t.exContext, gap: t.exGap, build: t.exBuildWith, typeIt: t.exTypeWord,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [partKey, round],
  );

  // not enough example sentences for this part — nothing to practise
  useEffect(() => {
    if (!exercises.length && !alreadyDone) onComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercises.length]);

  if (!exercises.length) {
    return (
      <section>
        <button className="back-btn" onClick={onBack}>{t.back}</button>
        <p className="muted">{t.sentencesEmpty}</p>
      </section>
    );
  }

  if (score) {
    const passed = score.right / score.total >= PASS;
    return (
      <LessonResult
        right={score.right} total={score.total} passed={passed}
        onRetry={() => { setScore(null); setRound(r => r + 1); }}
        onDone={onBack}
      />
    );
  }

  return (
    <ExerciseRunner
      key={round}
      exercises={exercises}
      onClose={onBack}
      onFinish={(right, total) => {
        setScore({ right, total });
        if (right / total >= PASS && !alreadyDone) onComplete();
      }}
    />
  );
}
