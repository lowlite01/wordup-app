import { useMemo, useState } from "react";
import { useApp } from "../context";
import { useT } from "../i18n";
import { buildTiles, norm, type Exercise } from "../lib/exercises";
import { haptic } from "../lib/telegram";
import { pronounceWord, speakWord } from "../lib/dict";
import HeartsBadge from "./HeartsBadge";
import Confetti from "./Confetti";
import Emoji from "./Emoji";

// Runs a list of exercises Duolingo-style: one at a time, "Check", green/red
// feedback with the right answer, a mistake costs a heart and the exercise
// comes back at the end. Reports how many were right on the first try.

interface Item { ex: Exercise; idx: number; retry: boolean }

// "**word**" → highlighted, "\n" → line break.
function Prompt({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => (
        <span key={i} className="ex-line">
          {line.split(/\*\*(.+?)\*\*/).map((part, k) => (k % 2 ? <mark key={k}>{part}</mark> : part))}
        </span>
      ))}
    </>
  );
}

const answerText = (ex: Exercise) =>
  ex.type === "choice" ? ex.options[ex.answer] : ex.answer;

export default function ExerciseRunner({ exercises, onClose, onFinish }: {
  exercises: Exercise[];
  onClose: () => void;
  onFinish: (right: number, total: number) => void;
}) {
  const t = useT();
  const { loseHeart } = useApp();
  const [queue, setQueue] = useState<Item[]>(() => exercises.map((ex, idx) => ({ ex, idx, retry: false })));
  const [pos, setPos] = useState(0);
  const [status, setStatus] = useState<null | "ok" | "bad">(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [built, setBuilt] = useState<number[]>([]);
  const [typed, setTyped] = useState("");
  const [right, setRight] = useState(0);

  const item = queue[pos];
  const ex = item?.ex;
  const tiles = useMemo(() => (ex?.type === "build" ? buildTiles(ex) : []), [ex]);

  const judge = (ok: boolean) => {
    setStatus(ok ? "ok" : "bad");
    haptic(ok ? "success" : "error");
    if (ok) {
      if (!item.retry) setRight(r => r + 1);
      if (ex.type !== "choice") {
        // hear the right answer: a recording for single words, the voice for sentences
        const a = answerText(ex);
        if (a.includes(" ")) speakWord(a); else pronounceWord(a);
      }
    } else {
      loseHeart();
      setQueue(q => [...q, { ex: item.ex, idx: item.idx, retry: true }]);
    }
  };

  const check = () => {
    if (!ex || status) return;
    if (ex.type === "build") {
      judge(norm(built.map(i => tiles[i]).join(" ")) === norm(ex.answer));
    } else if (ex.type === "type") {
      const got = norm(typed);
      judge(!!got && [ex.answer, ...(ex.alts ?? [])].some(a => norm(a) === got));
    }
  };

  const next = () => {
    setStatus(null); setPicked(null); setBuilt([]); setTyped("");
    if (pos + 1 >= queue.length) { onFinish(right, exercises.length); return; }
    setPos(pos + 1);
  };

  if (!ex) return null;
  const task = ex.task ?? (ex.type === "choice" ? t.exChoose : ex.type === "build" ? t.exBuild : t.exType);

  return (
    <section className="wl">
      <div className="wl-top">
        <button className="wl-close" onClick={onClose} aria-label={t.back}>✕</button>
        <div className="plan-bar wl-bar"><span style={{ width: `${(pos / queue.length) * 100}%` }} /></div>
        <HeartsBadge />
      </div>

      <div className="wl-body" key={pos}>
        <p className="wl-task">{task}</p>

        {ex.type === "choice" && (
          <>
            {ex.prompt && <div className="ex-prompt"><Prompt text={ex.prompt} /></div>}
            {ex.hint && <p className="ex-hint">{ex.hint}</p>}
            <div className="wl-options">
              {ex.options.map((o, i) => {
                const state = status ? (i === ex.answer ? " correct" : picked === i ? " wrong" : " dim") : "";
                return (
                  <button key={i} className={"wl-option" + state} disabled={!!status}
                    onClick={() => { setPicked(i); judge(i === ex.answer); }}>{o}</button>
                );
              })}
            </div>
          </>
        )}

        {ex.type === "build" && (
          <>
            <p className="ex-ru">{ex.hint}</p>
            <div className={"sent-built" + (status === "ok" ? " ok" : status === "bad" ? " bad" : "")}>
              {built.length === 0 && <span className="sent-placeholder">{t.sentencesTapWords}</span>}
              {built.map((ti, k) => (
                <button key={k} className="sent-chip in" disabled={!!status}
                  onClick={() => setBuilt(b => b.filter((_, j) => j !== k))}>{tiles[ti]}</button>
              ))}
            </div>
            <div className="sent-options">
              {tiles.map((w, i) => (
                <button key={i} className={"sent-chip" + (built.includes(i) ? " used" : "")}
                  disabled={built.includes(i) || !!status} onClick={() => setBuilt(b => [...b, i])}>{w}</button>
              ))}
            </div>
          </>
        )}

        {ex.type === "type" && (
          <>
            <div className="ex-prompt"><Prompt text={ex.prompt} /></div>
            {ex.hint && <p className="ex-hint">{ex.hint}</p>}
            <input
              className={"ex-input" + (status === "ok" ? " ok" : status === "bad" ? " bad" : "")}
              value={typed}
              disabled={!!status}
              autoFocus
              autoCapitalize="off" autoCorrect="off" spellCheck={false}
              placeholder={t.exTypePlaceholder}
              onChange={e => setTyped(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") check(); }}
            />
          </>
        )}
      </div>

      {!status && ex.type !== "choice" && (
        <div className="wl-footer">
          <button className="today-go" onClick={check}
            disabled={ex.type === "build" ? built.length === 0 : !typed.trim()}>{t.check}</button>
        </div>
      )}
      {status && (
        <div className={"wl-footer feedback " + status}>
          <div className="wl-feedback">
            <b>{status === "ok" ? t.lessonRight : t.lessonWrong}</b>
            {status === "bad" && <span>{answerText(ex)}</span>}
            {status === "bad" && ex.explain && <span className="ex-explain">💡 {ex.explain}</span>}
          </div>
          <button className="today-go" onClick={next}>{t.lessonContinue}</button>
        </div>
      )}
    </section>
  );
}

// Finish screen shared by Basics and Practice.
export function LessonResult({ right, total, passed, onRetry, onDone }: {
  right: number; total: number; passed: boolean; onRetry: () => void; onDone: () => void;
}) {
  const t = useT();
  return (
    <section>
      <div className="result-box lesson-finish">
        {passed && <Confetti />}
        <Emoji char={passed ? "🏆" : "💡"} className="lesson-result-icon" />
        <h2>{passed ? t.lessonDoneTitle : t.lessonFailed}</h2>
        <div className="lesson-stats">
          <div><b>{right}/{total}</b><span>{t.exFirstTry}</span></div>
          <div><b>{Math.round((right / Math.max(1, total)) * 100)}%</b><span>{t.lessonAccuracy}</span></div>
        </div>
        {passed
          ? <button className="today-go" onClick={onDone}>{t.toPath}</button>
          : <>
              <button className="today-go" onClick={onRetry}>{t.tryAgain}</button>
              <button className="btn wide" onClick={onDone}>{t.toPath}</button>
            </>}
      </div>
    </section>
  );
}
