import { useMemo, useState } from "react";
import { useT } from "../i18n";
import { LEVEL_COLORS, LEVEL_NAMES } from "../lib/groups";
import {
  LEVEL_FAIL, LEVEL_PARTIAL, PER_LEVEL, PLACEMENT_LEVELS, TOTAL_WRONG_LIMIT, placementQuestions, type PlacementQ,
} from "../lib/placementBank";
import { haptic } from "../lib/telegram";
import Confetti from "./Confetti";
import Emoji from "./Emoji";

interface Props {
  onDone: (level: string | null) => void; // null = "start from scratch"
}

interface LevelScore { level: string; right: number; asked: number }

// The outcome: a range when the learner is between two levels.
interface Outcome {
  from: string | null; // the highest level that is clearly yours (null = beginner)
  to: string | null;   // the level you're partly at (null = not between levels)
  start: string;       // where the path starts
}

// Adaptive placement test, A1 → C2, 5 hand-written questions per level
// (grammar gaps, "which sentence is correct", translating, meanings).
//   0–1 mistakes on a level → it's yours, go on;
//   2 mistakes → you're between this level and the previous one;
//   3 mistakes → too hard, stop.
// Mistakes also add up over the whole test: the 4th one ends it, so a few
// slips spread over many levels can't add up to C2. "I don't know" counts
// as a mistake, so guessing doesn't inflate the result.
export default function PlacementScreen({ onDone }: Props) {
  const t = useT();
  const [phase, setPhase] = useState<"intro" | "quiz" | "result">("intro");
  const [levelIdx, setLevelIdx] = useState(0);
  const [qIdx, setQIdx] = useState(0);
  const [wrongHere, setWrongHere] = useState(0);
  const [wrongTotal, setWrongTotal] = useState(0);
  const [scores, setScores] = useState<LevelScore[]>([]);
  const [picked, setPicked] = useState<number | null>(null); // -1 = "don't know"
  const [outcome, setOutcome] = useState<Outcome>({ from: null, to: null, start: "A1" });
  const [asked, setAsked] = useState(0);

  const level = PLACEMENT_LEVELS[levelIdx];
  const prev = levelIdx > 0 ? PLACEMENT_LEVELS[levelIdx - 1] : null;
  const questions: PlacementQ[] = useMemo(() => placementQuestions(level), [level]);
  const q = questions[qIdx];
  const totalEstimate = PLACEMENT_LEVELS.length * PER_LEVEL;

  const finish = (o: Outcome, levelScore: LevelScore) => {
    setScores(s => [...s, levelScore]);
    setOutcome(o);
    setPhase("result");
  };

  const answer = (i: number) => {
    if (picked !== null || !q) return;
    setPicked(i);
    const ok = i === q.answer;
    haptic(ok ? "success" : "error");
    setTimeout(() => {
      const wHere = wrongHere + (ok ? 0 : 1);
      const wTotal = wrongTotal + (ok ? 0 : 1);
      const levelScore = { level, right: qIdx + 1 - wHere, asked: qIdx + 1 };
      setAsked(a => a + 1);
      setPicked(null);
      // too hard: the previous level is yours, study from this one
      if (wHere >= LEVEL_FAIL) return finish({ from: prev, to: null, start: level }, levelScore);
      // too many slips overall: somewhere between the previous level and this one
      if (wTotal >= TOTAL_WRONG_LIMIT) return finish({ from: prev, to: level, start: level }, levelScore);
      if (qIdx + 1 < questions.length) { setWrongHere(wHere); setWrongTotal(wTotal); setQIdx(qIdx + 1); return; }
      // level finished
      if (wHere >= LEVEL_PARTIAL) return finish({ from: prev, to: level, start: level }, levelScore);
      setScores(s => [...s, levelScore]);
      if (levelIdx + 1 >= PLACEMENT_LEVELS.length) {
        setOutcome({ from: level, to: null, start: level });
        setPhase("result");
        return;
      }
      setLevelIdx(levelIdx + 1);
      setQIdx(0);
      setWrongHere(0);
      setWrongTotal(wTotal);
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
    const { from, to, start } = outcome;
    const name = (l: string | null) => (l ? LEVEL_NAMES[l] : t.placementBeginner);
    const badge = from && to ? `${from}–${to}` : from ?? to ?? "A0";
    const bg = from && to
      ? `linear-gradient(135deg, ${LEVEL_COLORS[from]}, ${LEVEL_COLORS[to]})`
      : LEVEL_COLORS[from ?? to ?? "A0"] ?? "#FBBF24";
    return (
      <section className="placement">
        <div className="placement-card result-box">
          <Confetti />
          <div className="placement-level" style={{ background: bg }}>{badge}</div>
          <h2>{from && to ? t.placementBetween(name(from), name(to)) : t.placementResult(name(from ?? to))}</h2>
          <p className="muted">{!from || start === "A1" ? t.placementResultBasics : t.placementStartAt(start)}</p>

          <div className="placement-scores">
            {scores.map(s => (
              <div key={s.level} className="placement-score">
                <span className="placement-score-lvl" style={{ background: LEVEL_COLORS[s.level] }}>{s.level}</span>
                <span className="placement-score-bar"><span style={{ width: `${(s.right / PER_LEVEL) * 100}%`, background: LEVEL_COLORS[s.level] }} /></span>
                <b>{s.right}/{s.asked}</b>
              </div>
            ))}
          </div>
          <p className="placement-note">{t.placementNote}</p>

          <button className="today-go" onClick={() => onDone(start)}>{t.toPath}</button>
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
            onClick={e => { e.currentTarget.blur(); answer(i); }}
          >{o}</button>
        ))}
      </div>
      <button className="btn wide placement-dontknow" disabled={picked !== null} onClick={() => answer(-1)}>
        {t.placementDontKnow}
      </button>
    </section>
  );
}
