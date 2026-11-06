import { useState } from "react";
import { useT } from "../i18n";
import { BASICS } from "../lib/basics";
import { pronounceWord, speakWord } from "../lib/dict";
import { withReview, type Exercise } from "../lib/exercises";
import { shuffle } from "../lib/groups";
import ExerciseRunner, { LessonResult, Prompt, savedProgress } from "./ExerciseRunner";
import { clearLesson } from "../lib/lessonSave";
import Emoji from "./Emoji";

const PASS = 0.7; // share of exercises right on the first try

// One word → the real recording (louder and clearer); a phrase → the voice.
// "Hello / Hi" → "Hello, Hi".
const say = (en: string) => {
  const text = en.replace(/ \/ /g, ", ");
  if (/^[A-Za-z']+$/.test(text)) pronounceWord(text); else speakWord(text);
};

// A "Basics" lesson: the idea in plain Russian, a small table of key phrases
// (tap to hear), a tip, examples — then practice with one review question
// from the previous lesson so it doesn't get forgotten.
export default function BasicsLessonScreen({ lessonId, alreadyDone, onComplete, onBack }: {
  lessonId: string; alreadyDone: boolean; onComplete: () => void; onBack: () => void;
}) {
  const t = useT();
  const idx = BASICS.findIndex(l => l.id === lessonId);
  const lesson = BASICS[idx];
  const prev = idx > 0 ? BASICS[idx - 1] : null;
  const [phase, setPhase] = useState<"rules" | "practice" | "done">("rules");
  const [round, setRound] = useState(0);
  const [score, setScore] = useState({ right: 0, total: 0 });

  if (!lesson) return null;
  const saveKey = `b:${lesson.id}`;
  const resume = phase === "rules" ? savedProgress(saveKey) : null;

  const exercises = (): Exercise[] => {
    const review = prev ? shuffle(prev.exercises())[0] : undefined;
    return withReview(lesson.exercises(), review, t.reviewPrev(prev?.title ?? ""));
  };

  if (phase === "rules") {
    return (
      <section className="basics">
        <button className="back-btn" onClick={onBack}>{t.back}</button>
        <div className="basics-card">
          <Emoji char={lesson.emoji} className="basics-icon" />
          <h2>{lesson.title}</h2>
          <p className="basics-intro">{lesson.intro}</p>

          <div className="basics-table">
            {lesson.pairs.map(([en, ru], i) => (
              <button key={en} className="basics-row" style={{ animationDelay: `${i * 55}ms` }} onClick={() => say(en)}>
                <b>{en}</b>
                <span>{ru}</span>
              </button>
            ))}
          </div>
          <p className="basics-tap">{t.basicsTapHint}</p>

          {lesson.schemes && (
            <div className="basics-schemes">
              <h3 className="basics-sub">{t.basicsSchemes}</h3>
              {lesson.schemes.map((sc, i) => (
                <div key={sc.label} className="basics-scheme" style={{ animationDelay: `${300 + i * 150}ms` }}>
                  <span className="basics-scheme-label">{sc.label}</span>
                  <button className="basics-scheme-line" onClick={() => say(sc.from.replace(/\*\*/g, ""))}><Prompt text={sc.from} /></button>
                  <span className="basics-scheme-arrow">↓</span>
                  <button className="basics-scheme-line to" onClick={() => say(sc.to.replace(/\*\*/g, ""))}><Prompt text={sc.to} /></button>
                  {sc.note && <span className="basics-scheme-note">{sc.note}</span>}
                </div>
              ))}
            </div>
          )}

          {lesson.tip && <div className="basics-tip"><Emoji char="💡" /> <span>{lesson.tip}</span></div>}

          {lesson.examples.length > 0 && (
            <>
              <h3 className="basics-sub">{t.basicsExamples}</h3>
              <div className="basics-examples">
                {lesson.examples.map(([en, ru]) => (
                  <button key={en} className="basics-example" onClick={() => say(en)}>
                    <Emoji char="🔊" className="basics-sound" />
                    <span><b>{en}</b><small>{ru}</small></span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        {resume ? (
          <>
            <button className="today-go" onClick={() => setPhase("practice")}>{t.lessonResume(resume.at, resume.total)}</button>
            <button className="btn wide" onClick={() => { clearLesson(saveKey); setRound(r => r + 1); setPhase("practice"); }}>{t.lessonRestart}</button>
          </>
        ) : (
          <button className="today-go" onClick={() => setPhase("practice")}>{t.basicsGo}</button>
        )}
      </section>
    );
  }

  if (phase === "practice") {
    return (
      <ExerciseRunner
        key={round}
        exercises={exercises()}
        saveKey={saveKey}
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
