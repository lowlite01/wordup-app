import { useMemo, useState } from "react";
import { useT } from "../i18n";
import { GRAMMAR } from "../data/grammar";
import { GRAMMAR_DRILLS } from "../lib/grammarDrills";
import { shuffle } from "../lib/groups";
import { haptic } from "../lib/telegram";
import Confetti from "./Confetti";
import Emoji from "./Emoji";

const PASS = 4; // of 5

interface Props {
  topic: string;
  alreadyDone: boolean;
  onComplete: () => void;
  onBack: () => void;
}

// Grammar step on the path: the rule first, then a short practice quiz.
export default function LessonScreen({ topic, alreadyDone, onComplete, onBack }: Props) {
  const t = useT();
  const rule = useMemo(() => GRAMMAR.flatMap(s => s.items).find(i => i.title === topic), [topic]);
  const [phase, setPhase] = useState<"rule" | "quiz" | "done">("rule");
  const [round, setRound] = useState(0);
  const qs = useMemo(() => shuffle([...(GRAMMAR_DRILLS[topic] || [])]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [topic, round]);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  const q = qs[i];
  const pick = (k: number) => {
    if (picked !== null) return;
    setPicked(k);
    const ok = k === q.answer;
    haptic(ok ? "success" : "error");
    if (ok) setScore(s => s + 1);
  };
  const next = () => {
    setPicked(null);
    if (i + 1 < qs.length) { setI(i + 1); return; }
    setPhase("done");
    if (score >= PASS && !alreadyDone) onComplete();
  };
  const retry = () => { setRound(r => r + 1); setI(0); setScore(0); setPicked(null); setPhase("quiz"); };

  if (phase === "rule") {
    return (
      <section>
        <button className="back-btn" onClick={onBack}>{t.back}</button>
        <div className="lesson-head">
          <Emoji char="💡" className="lesson-icon" />
          <h2 className="screen-title">{topic}</h2>
        </div>
        {rule && (
          <div className="gram-card open lesson-rule">
            <div className="gram-body">
              <p className="gram-formula">{rule.formula}</p>
              <ul className="gram-use">{rule.use.map(u => <li key={u}>{u}</li>)}</ul>
              {rule.signals && (
                <p className="gram-signals">{t.signalWords}{rule.signals.map(s => <span key={s}>{s}</span>)}</p>
              )}
              {rule.examples.map(([en, note]) => (
                <p key={en} className="gram-example">“{en}”{note ? <span className="gram-note"> — {note}</span> : null}</p>
              ))}
            </div>
          </div>
        )}
        <button className="today-go" onClick={() => setPhase("quiz")}>{t.lessonPractice}</button>
      </section>
    );
  }

  if (phase === "done") {
    const passed = score >= PASS;
    return (
      <section>
        <button className="back-btn" onClick={onBack}>{t.back}</button>
        <div className="result-box">
          {passed && <Confetti />}
          <Emoji char={passed ? "🎉" : "💡"} className="lesson-result-icon" />
          <h2>{passed ? t.lessonPassed : t.lessonFailed}</h2>
          <p className="result-score">{score} / {qs.length}</p>
          {passed
            ? <button className="today-go" onClick={onBack}>{t.toPath}</button>
            : <>
                <button className="today-go" onClick={retry}>{t.tryAgain}</button>
                <button className="btn wide" onClick={() => setPhase("rule")}>{t.lessonReread}</button>
              </>}
        </div>
      </section>
    );
  }

  return (
    <section>
      <button className="back-btn" onClick={onBack}>{t.back}</button>
      <div className="progress-row"><span>{topic}</span><span>{i + 1} / {qs.length}</span></div>
      <div className="plan-bar"><span style={{ width: `${(i / qs.length) * 100}%` }} /></div>
      <div className="quiz-question" key={round + ":" + i}>
        <p className="muted">{t.placementQGrammar}</p>
        <p className="quiz-def">{q.q}</p>
      </div>
      <div className="quiz-options" key={"o" + round + ":" + i}>
        {q.options.map((o, k) => (
          <button
            key={k}
            className={"quiz-option" + (picked !== null && k === q.answer ? " correct" : "") +
              (picked === k && k !== q.answer ? " wrong" : "")}
            disabled={picked !== null}
            onClick={() => pick(k)}
          >{o}</button>
        ))}
      </div>
      {picked !== null && <button className="btn primary wide" onClick={next}>{t.next}</button>}
    </section>
  );
}
