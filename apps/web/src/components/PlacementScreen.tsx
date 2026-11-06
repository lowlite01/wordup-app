import { useMemo, useState } from "react";
import { useT } from "../i18n";
import { LEVEL_COLORS, LEVEL_NAMES } from "../lib/groups";
import { PASS, PER_LEVEL, PLACEMENT_LEVELS, placementQuestions, type PlacementQ } from "../lib/placementBank";
import { haptic } from "../lib/telegram";
import Confetti from "./Confetti";
import Emoji from "./Emoji";

interface Props {
  onDone: (level: string | null) => void; // null = "start from scratch"
}

// Adaptive placement test. Each level asks 6 hand-written questions: grammar
// gaps, "which sentence is correct", translating a sentence and the meaning
// of a phrase. 5 of 6 passes the level; the second mistake ends it early.
// "I don't know" counts as a mistake, so guessing doesn't inflate the result.
export default function PlacementScreen({ onDone }: Props) {
  const t = useT();
  const [phase, setPhase] = useState<"intro" | "quiz" | "result">("intro");
  const [levelIdx, setLevelIdx] = useState(0);
  const [qIdx, setQIdx] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [picked, setPicked] = useState<number | null>(null); // -1 = "don't know"
  const [result, setResult] = useState("A1");
  const [asked, setAsked] = useState(0);

  const level = PLACEMENT_LEVELS[levelIdx];
  const questions: PlacementQ[] = useMemo(() => placementQuestions(level), [level]);
  const q = questions[qIdx];
  const totalEstimate = PLACEMENT_LEVELS.length * PER_LEVEL;
  const allowedWrong = PER_LEVEL - PASS;

  const finish = (lvl: string) => { setResult(lvl); setPhase("result"); };

  const answer = (i: number) => {
    if (picked !== null || !q) return;
    setPicked(i);
    const ok = i === q.answer;
    haptic(ok ? "success" : "error");
    setTimeout(() => {
      const nextWrong = wrong + (ok ? 0 : 1);
      setAsked(a => a + 1);
      setPicked(null);
      if (nextWrong > allowedWrong) return finish(level); // this level is too hard → start here
      if (qIdx + 1 < questions.length) { setWrong(nextWrong); setQIdx(qIdx + 1); return; }
      // level passed
      if (levelIdx + 1 >= PLACEMENT_LEVELS.length) return finish("C2");
      setLevelIdx(levelIdx + 1);
      setQIdx(0);
      setWrong(0);
    }, ok ? 550 : 1100); // a wrong answer stays a moment longer so the right one can be seen
  };

  if (phase === "intro") {
    return (
      <section className="placement">
        <div className="placement-card">
          <Emoji char="🎯" className="placement-icon" />
          <h2>{t.placementTitle}</h2>
          <p className="muted">{t.placementSub}</p>
          <button className="today-go" onClick={() => setPhase("quiz")}>{t.placementStart}</button>
          <button className="btn wide" onClick={() => onDone(null)}>{t.placementSkip}</button>
        </div>
      </section>
    );
  }

  if (phase === "result") {
    return (
      <section className="placement">
        <div className="placement-card result-box">
          <Confetti />
          <div className="placement-level" style={{ background: LEVEL_COLORS[result] }}>{result}</div>
          <h2>{t.placementResult(LEVEL_NAMES[result] || result)}</h2>
          <p className="muted">{result === "A1" ? t.placementResultBasics : t.placementResultSub(result)}</p>
          <button className="today-go" onClick={() => onDone(result)}>{t.toPath}</button>
        </div>
      </section>
    );
  }

  if (!q) return null;
  const kindLabel = q.kind === "gap" ? t.placementQGap
    : q.kind === "correct" ? t.placementQCorrect
    : q.kind === "translate" ? t.placementQTranslate
    : t.placementQMeaning;

  return (
    <section className="placement">
      <div className="placement-top">
        <span className="placement-badge" style={{ background: LEVEL_COLORS[level] }}>{level}</span>
        <div className="plan-bar placement-bar">
          <span style={{ width: `${Math.min(100, (asked / totalEstimate) * 100)}%` }} />
        </div>
      </div>
      <div className="quiz-question" key={level + qIdx}>
        <p className="muted">{kindLabel}</p>
        {q.prompt && <p className="quiz-def placement-prompt">{q.prompt}</p>}
      </div>
      <div className={"quiz-options" + (q.kind === "correct" ? " placement-sentences" : "")} key={"o" + level + qIdx}>
        {q.options.map((o, i) => (
          <button
            key={i}
            className={"quiz-option" + (picked !== null && i === q.answer ? " correct" : "") +
              (picked === i && i !== q.answer ? " wrong" : "")}
            disabled={picked !== null}
            onClick={() => answer(i)}
          >{o}</button>
        ))}
      </div>
      <button className="btn wide placement-dontknow" disabled={picked !== null} onClick={() => answer(-1)}>
        {t.placementDontKnow}
      </button>
    </section>
  );
}
