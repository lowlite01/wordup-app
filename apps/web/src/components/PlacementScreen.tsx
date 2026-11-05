import { useEffect, useMemo, useState } from "react";
import { useT } from "../i18n";
import { LEVEL_COLORS, LEVEL_NAMES } from "../lib/groups";
import { PLACEMENT_LEVELS, placementQuestions, type PlacementQ } from "../lib/roadmap";
import { haptic } from "../lib/telegram";
import Confetti from "./Confetti";
import Emoji from "./Emoji";

interface Props {
  withGrammar: boolean;                 // English course: also ask grammar
  onDone: (level: string | null) => void; // null = "start from scratch"
}

// Short adaptive placement test: 3 questions per level, easiest first.
// A level counts as passed with 2 of 3 right; the first failed level is
// where the learner starts (passing everything up to C1 → start at C2).
export default function PlacementScreen({ withGrammar, onDone }: Props) {
  const t = useT();
  const [phase, setPhase] = useState<"intro" | "quiz" | "result">("intro");
  const [levelIdx, setLevelIdx] = useState(0);
  const [qIdx, setQIdx] = useState(0);
  const [right, setRight] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState("A1");
  const [asked, setAsked] = useState(0);

  const level = PLACEMENT_LEVELS[levelIdx];
  const questions: PlacementQ[] = useMemo(
    () => placementQuestions(level, withGrammar),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [level],
  );
  const q = questions[qIdx];
  const totalEstimate = PLACEMENT_LEVELS.length * 3;

  const finish = (lvl: string) => {
    setResult(lvl);
    setPhase("result");
  };

  // A level with no words in this course: skip past it.
  useEffect(() => {
    if (phase !== "quiz" || questions.length) return;
    if (levelIdx + 1 < PLACEMENT_LEVELS.length) { setLevelIdx(levelIdx + 1); setQIdx(0); setRight(0); }
    else finish(level);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, questions.length, levelIdx]);

  const pick = (i: number) => {
    if (picked !== null || !q) return;
    setPicked(i);
    const ok = i === q.answer;
    haptic(ok ? "success" : "error");
    setTimeout(() => {
      const nextRight = right + (ok ? 1 : 0);
      setAsked(a => a + 1);
      setPicked(null);
      if (qIdx + 1 < questions.length) {
        setRight(nextRight);
        setQIdx(qIdx + 1);
        return;
      }
      // level finished
      const passed = nextRight >= Math.ceil(questions.length * 2 / 3);
      if (!passed) return finish(level);
      if (levelIdx + 1 >= PLACEMENT_LEVELS.length) return finish("C2");
      setLevelIdx(levelIdx + 1);
      setQIdx(0);
      setRight(0);
    }, 650);
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
          <p className="muted">{t.placementResultSub(result)}</p>
          <button className="today-go" onClick={() => onDone(result)}>{t.toPath}</button>
        </div>
      </section>
    );
  }

  if (!q) return null;

  return (
    <section className="placement">
      <div className="placement-top">
        <span className="placement-badge" style={{ background: LEVEL_COLORS[level] }}>{level}</span>
        <div className="plan-bar placement-bar">
          <span style={{ width: `${Math.min(100, (asked / totalEstimate) * 100)}%` }} />
        </div>
      </div>
      <div className="quiz-question" key={level + qIdx}>
        <p className="muted">{q.kind === "word" ? t.placementQWord : t.placementQGrammar}</p>
        <p className="quiz-def placement-prompt">{q.prompt}</p>
      </div>
      <div className="quiz-options" key={"o" + level + qIdx}>
        {q.options.map((o, i) => (
          <button
            key={i}
            className={"quiz-option" + (picked !== null && i === q.answer ? " correct" : "") +
              (picked === i && i !== q.answer ? " wrong" : "")}
            disabled={picked !== null}
            onClick={() => pick(i)}
          >{o}</button>
        ))}
      </div>
    </section>
  );
}
