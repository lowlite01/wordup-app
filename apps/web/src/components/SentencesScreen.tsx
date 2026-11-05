import { useMemo, useState } from "react";
import { useT } from "../i18n";
import { buildSentenceExercises } from "../lib/roadmap";
import { haptic } from "../lib/telegram";
import Confetti from "./Confetti";
import Emoji from "./Emoji";
import { HeartsBadge } from "./ProScreen";
import { useApp } from "../context";

interface Props {
  sourceKeys: string[];
  alreadyDone: boolean;
  onComplete: () => void;
  onBack: () => void;
}

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}' ]/gu, "").replace(/\s+/g, " ").trim();

// Sentence step on the path: fill the gap / put the words in order, using
// the example sentences of the words learned in the previous steps.
export default function SentencesScreen({ sourceKeys, alreadyDone, onComplete, onBack }: Props) {
  const t = useT();
  const { loseHeart } = useApp();
  const [round, setRound] = useState(0);
  const exercises = useMemo(() => buildSentenceExercises(sourceKeys),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sourceKeys.join(","), round]);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);      // gap answer
  const [built, setBuilt] = useState<number[]>([]);                // order: indexes of used tiles
  const [checked, setChecked] = useState<null | boolean>(null);    // order: result after "Check"
  const [finished, setFinished] = useState(false);

  const pass = Math.ceil(exercises.length * 0.65);
  const ex = exercises[i];

  const next = () => {
    setPicked(null); setBuilt([]); setChecked(null);
    if (i + 1 < exercises.length) { setI(i + 1); return; }
    setFinished(true);
    if (score >= pass && !alreadyDone) onComplete();
  };
  const retry = () => { setRound(r => r + 1); setI(0); setScore(0); setFinished(false); setPicked(null); setBuilt([]); setChecked(null); };

  if (!exercises.length) {
    return (
      <section>
        <button className="back-btn" onClick={onBack}>{t.back}</button>
        <p className="muted">{t.sentencesEmpty}</p>
      </section>
    );
  }

  if (finished) {
    const passed = score >= pass;
    return (
      <section>
        <button className="back-btn" onClick={onBack}>{t.back}</button>
        <div className="result-box">
          {passed && <Confetti />}
          <Emoji char={passed ? "🎉" : "💬"} className="lesson-result-icon" />
          <h2>{passed ? t.lessonPassed : t.lessonFailed}</h2>
          <p className="result-score">{score} / {exercises.length}</p>
          {passed
            ? <button className="today-go" onClick={onBack}>{t.toPath}</button>
            : <button className="today-go" onClick={retry}>{t.tryAgain}</button>}
        </div>
      </section>
    );
  }

  const answered = ex.type === "gap" ? picked !== null : checked !== null;

  return (
    <section>
      <button className="back-btn" onClick={onBack}>{t.back}</button>
      <div className="progress-row"><span>{t.sentencesTitle}</span><span className="progress-right">{i + 1} / {exercises.length} <HeartsBadge /></span></div>
      <div className="plan-bar"><span style={{ width: `${(i / exercises.length) * 100}%` }} /></div>

      <div className="sent-card" key={round + ":" + i}>
        <p className="muted sent-task">{ex.type === "gap" ? t.sentencesGap : t.sentencesOrder}</p>
        <p className="sent-hint">{ex.def}</p>

        {ex.type === "gap" ? (
          <>
            <p className="sent-text">
              {ex.before}
              <span className={"sent-gap" + (picked ? (norm(picked) === norm(ex.answer) ? " ok" : " bad") : "")}>
                {picked ? (norm(picked) === norm(ex.answer) ? ex.answer : picked) : "_____"}
              </span>
              {ex.after}
            </p>
            {picked && norm(picked) !== norm(ex.answer) && <p className="sent-correct">✓ {ex.answer}</p>}
            <div className="sent-options">
              {ex.options.map(o => (
                <button
                  key={o}
                  className={"sent-chip" + (picked && norm(o) === norm(ex.answer) ? " ok" : "") + (picked === o && norm(o) !== norm(ex.answer) ? " bad" : "")}
                  disabled={picked !== null}
                  onClick={() => {
                    setPicked(o);
                    const ok = norm(o) === norm(ex.answer);
                    haptic(ok ? "success" : "error");
                    if (ok) setScore(s => s + 1);
                    else loseHeart();
                  }}
                >{o}</button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className={"sent-built" + (checked === true ? " ok" : checked === false ? " bad" : "")}>
              {built.length === 0 && <span className="sent-placeholder">{t.sentencesTapWords}</span>}
              {built.map((idx, pos) => (
                <button key={pos} className="sent-chip in" disabled={checked !== null}
                  onClick={() => setBuilt(b => b.filter((_, p) => p !== pos))}>{ex.words[idx]}</button>
              ))}
            </div>
            {checked === false && <p className="sent-correct">✓ {ex.answer}</p>}
            <div className="sent-options">
              {ex.words.map((w, idx) => (
                <button key={idx} className={"sent-chip" + (built.includes(idx) ? " used" : "")}
                  disabled={built.includes(idx) || checked !== null}
                  onClick={() => setBuilt(b => [...b, idx])}>{w}</button>
              ))}
            </div>
            {checked === null && (
              <button className="btn primary wide" disabled={built.length !== ex.words.length}
                onClick={() => {
                  const ok = norm(built.map(k => ex.words[k]).join(" ")) === norm(ex.answer);
                  setChecked(ok);
                  haptic(ok ? "success" : "error");
                  if (ok) setScore(s => s + 1);
                  else loseHeart();
                }}>{t.check}</button>
            )}
          </>
        )}
      </div>

      {answered && <button className="btn primary wide" onClick={next}>{t.next}</button>}
    </section>
  );
}
