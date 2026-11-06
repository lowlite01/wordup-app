import { useLayoutEffect, useMemo, useRef, useState } from "react";
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

  // Word tiles fly between the bank and the answer line (FLIP: measure where
  // the tile was, render it in its new place, animate from old to new).
  const builtRef = useRef<HTMLDivElement>(null);
  const bankRef = useRef<HTMLDivElement>(null);
  const fly = useRef<{ from: DOMRect; to: "built" | number } | null>(null);
  useLayoutEffect(() => {
    const f = fly.current;
    fly.current = null;
    if (!f) return;
    const el = (f.to === "built"
      ? builtRef.current?.lastElementChild
      : bankRef.current?.querySelector(`[data-i="${f.to}"]`)) as HTMLElement | null;
    if (!el?.animate) return;
    const to = el.getBoundingClientRect();
    el.animate(
      [{ transform: `translate(${f.from.left - to.left}px, ${f.from.top - to.top}px)` }, { transform: "translate(0, 0)" }],
      { duration: 280, easing: "cubic-bezier(.2, .8, .2, 1)" },
    );
  }, [built]);
  const addTile = (i: number, from: DOMRect) => { fly.current = { from, to: "built" }; setBuilt(b => [...b, i]); };
  const removeTile = (k: number, from: DOMRect) => {
    fly.current = { from, to: built[k] };
    setBuilt(b => b.filter((_, j) => j !== k));
  };

  const judge = (ok: boolean) => {
    setStatus(ok ? "ok" : "bad");
    haptic(ok ? "success" : "error");
    // hear the right answer: the whole sentence when we have it,
    // a recording for single words, the voice for sentences
    const say = ex.full?.[0] ?? (ex.type !== "choice" ? answerText(ex) : "");
    if (say) { if (say.includes(" ")) speakWord(say); else pronounceWord(say); }
    if (ok) {
      if (!item.retry) setRight(r => r + 1);
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

  // After answering, drag the exercise to the left like a card: it follows
  // the finger, the next one peeks in from the right, and letting go past
  // the threshold flips to it (otherwise it springs back).
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const swipe = useRef<{ x: number; y: number; active: boolean } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    swipe.current = status ? { x: e.clientX, y: e.clientY, active: false } : null;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s0 = swipe.current;
    if (!s0) return;
    const dx = e.clientX - s0.x, dy = e.clientY - s0.y;
    if (!s0.active) {
      if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy)) return; // a tap or a scroll
      s0.active = true;
      setDragging(true);
    }
    setDrag(dx < 0 ? dx : dx * 0.15); // to the right it only gives a little
  };
  const onPointerUp = () => {
    const s0 = swipe.current;
    swipe.current = null;
    if (!s0?.active) return;
    setDragging(false);
    if (drag < -80) {
      setDrag(-window.innerWidth); // fly out, then show the next one
      setTimeout(() => { next(); setDrag(0); }, 200);
    } else setDrag(0);
  };
  const nextItem = queue[pos + 1];
  const nextTask = (x: Exercise) => x.task ?? (x.type === "choice" ? t.exChoose : x.type === "build" ? t.exBuild : t.exType);
  const nextText = (x: Exercise) => (x.type === "build" ? x.hint : x.prompt).replace(/\*\*/g, "").split("\n")[0];

  if (!ex) return null;
  const task = ex.task ?? (ex.type === "choice" ? t.exChoose : ex.type === "build" ? t.exBuild : t.exType);

  return (
    <section className="wl" onPointerDown={onPointerDown} onPointerMove={onPointerMove}
      onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      <div className="wl-top">
        <button className="wl-close" onClick={onClose} aria-label={t.back}>✕</button>
        <div className="plan-bar wl-bar"><span style={{ width: `${(pos / queue.length) * 100}%` }} /></div>
        <HeartsBadge />
      </div>

      <div className="ex-stage">
      {status && (
        <div className="ex-peek" style={{ transform: `translateX(calc(100% + 24px + ${drag}px))`, transition: dragging ? "none" : undefined }}>
          {nextItem
            ? <><p className="wl-task">{nextTask(nextItem.ex)}</p><p className="ex-peek-text">{nextText(nextItem.ex)}</p></>
            : <p className="wl-task">🏁 {t.exFinish}</p>}
        </div>
      )}
      <div className="wl-body ex-page" key={pos}
        style={drag ? { transform: `translateX(${drag}px) rotate(${drag / 50}deg)`, transition: dragging ? "none" : undefined } : undefined}>
        {ex.review && <span className="ex-review">🔁 {ex.review}</span>}
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
            <div ref={builtRef} className={"sent-built" + (status === "ok" ? " ok" : status === "bad" ? " bad" : "")}>
              {built.length === 0 && <span className="sent-placeholder">{t.sentencesTapWords}</span>}
              {built.map((ti, k) => (
                <button key={k} className="sent-chip in" disabled={!!status}
                  onClick={e => removeTile(k, e.currentTarget.getBoundingClientRect())}>{tiles[ti]}</button>
              ))}
            </div>
            <div ref={bankRef} className="sent-options">
              {tiles.map((w, i) => (
                <button key={i} data-i={i} className={"sent-chip" + (built.includes(i) ? " used" : "")}
                  disabled={built.includes(i) || !!status}
                  onClick={e => addTile(i, e.currentTarget.getBoundingClientRect())}>{w}</button>
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
            {ex.full
              ? <span className="ex-full"><b>{ex.full[0]}</b><small>{ex.full[1]}</small></span>
              : status === "bad" && <span>{answerText(ex)}</span>}
            {status === "bad" && ex.explain && <span className="ex-explain">💡 {ex.explain}</span>}
          </div>
          <button className="today-go" onClick={next}>{t.lessonContinue}</button>
          <small className="ex-swipe">{t.swipeNext}</small>
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
