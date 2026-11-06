import { useState } from "react";
import { useT } from "../i18n";
import { BASICS } from "../lib/basics";
import { speakWord } from "../lib/dict";
import ExerciseRunner, { LessonResult } from "./ExerciseRunner";
import Emoji from "./Emoji";

const PASS = 0.7; // share of exercises right on the first try

// A "Basics" lesson: the rule in Russian with examples, then practice.
export default function BasicsLessonScreen({ lessonId, alreadyDone, onComplete, onBack }: {
  lessonId: string; alreadyDone: boolean; onComplete: () => void; onBack: () => void;
}) {
  const t = useT();
  const lesson = BASICS.find(l => l.id === lessonId);
  const [phase, setPhase] = useState<"rules" | "practice" | "done">("rules");
  const [round, setRound] = useState(0);
  const [score, setScore] = useState({ right: 0, total: 0 });

  if (!lesson) return null;

  if (phase === "rules") {
    return (
      <section className="basics">
        <button className="back-btn" onClick={onBack}>{t.back}</button>
        <div className="basics-card">
          <Emoji char={lesson.emoji} className="basics-icon" />
          <h2>{lesson.title}</h2>
          <ul className="basics-rules">
            {lesson.rules.map(r => <li key={r}>{r}</li>)}
          </ul>
          <div className="basics-examples">
            {lesson.examples.map(([en, ru]) => (
              <button key={en} className="basics-example" onClick={() => speakWord(en)}>
                <Emoji char="🔊" className="basics-sound" />
                <span><b>{en}</b><small>{ru}</small></span>
              </button>
            ))}
          </div>
        </div>
        <button className="today-go" onClick={() => setPhase("practice")}>{t.basicsGo}</button>
      </section>
    );
  }

  if (phase === "practice") {
    return (
      <ExerciseRunner
        key={round}
        exercises={lesson.exercises()}
        onClose={onBack}
        onFinish={(right, total) => {
          setScore({ right, total });
          setPhase("done");
          if (right / total >= PASS && !alreadyDone) onComplete();
        }}
      />
    );
  }

  return (
    <LessonResult
      right={score.right} total={score.total} passed={score.right / score.total >= PASS}
      onRetry={() => { setRound(r => r + 1); setPhase("rules"); }}
      onDone={onBack}
    />
  );
}
