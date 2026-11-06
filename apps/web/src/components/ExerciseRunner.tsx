import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { clearLesson, loadLesson, saveLesson } from "../lib/lessonSave";
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

// tiles are shuffled once per item, so the preview of the next exercise
// (shown while swiping) looks exactly like the real one
interface Item { ex: Exercise; idx: number; retry: boolean; tiles: string[] }
const mkItem = (ex: Exercise, idx: number, retry: boolean): Item =>
  ({ ex, idx, retry, tiles: ex.type === "build" ? buildTiles(ex) : [] });

// "**word**" → highlighted, "\n" → line break.
export function Prompt({ text }: { text: string }) {
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

function taskOf(ex: Exercise, t: ReturnType<typeof useT>) {
  return ex.task ?? (ex.type === "choice" ? t.exChoose : ex.type === "build" ? t.exBuild : t.exType);
}

function ExercisePreview({ item }: { item: Item }) {
  const t = useT();
  const { ex, tiles } = item;
  return (
    <>
      {ex.review && <span className="ex-review">🔁 {ex.review}</span>}
      <p className="wl-task">{taskOf(ex, t)}</p>
      {ex.type === "choice" && (
        <>
          {ex.prompt && <div className="ex-prompt"><Prompt text={ex.prompt} /></div>}
          {ex.hint && <p className="ex-hint">{ex.hint}</p>}
          <div className="wl-options">{ex.options.map((o, i) => <div key={i} className="wl-option">{o}</div>)}</div>
        </>
      )}
      {ex.type === "build" && (
        <>
          <p className="ex-ru">{ex.hint}</p>
          <div className="sent-built"><span className="sent-placeholder">{t.sentencesTapWords}</span></div>
          <div className="sent-options">{tiles.map((w, i) => <span key={i} className="sent-chip">{w}</span>)}</div>
        </>
      )}
      {ex.type === "type" && (
        <>
          <div className="ex-prompt"><Prompt text={ex.prompt} /></div>
          {ex.hint && <p className="ex-hint">{ex.hint}</p>}
          <div className="ex-input ex-input-fake">{t.exTypePlaceholder}</div>
        </>
      )}
    </>
  );
}

const answerText = (ex: Exercise) =>
  ex.type === "choice" ? ex.options[ex.answer] : ex.answer;

interface Saved { queue: Item[]; pos: number; right: number; total: number }

/** Is there an unfinished run saved under this key? (question number, total) */
export function savedProgress(saveKey: string): { at: number; total: number } | null {
  const s = loadLesson<Saved>(saveKey);
  return s && s.queue?.length ? { at: s.pos + 1, total: s.queue.length } : null;
}

export default function ExerciseRunner({ exercises, onClose, onFinish, saveKey }: {
  exercises: Exercise[];
  onClose: () => void;
  onFinish: (right: number, total: number) => void;
  saveKey?: string; // remember progress under this key (resume after leaving)
}) {
  const t = useT();
  const { loseHeart } = useApp();
  const [saved] = useState(() => (saveKey ? loadLesson<Saved>(saveKey) : null));
  const [queue, setQueue] = useState<Item[]>(() => saved?.queue ?? exercises.map((ex, idx) => mkItem(ex, idx, false)));
  const [pos, setPos] = useState(saved?.pos ?? 0);
  const total = saved?.total ?? exercises.length;
  const [status, setStatus] = useState<null | "ok" | "bad">(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [built, setBuilt] = useState<number[]>([]);
  const [typed, setTyped] = useState("");
  const [right, setRight] = useState(saved?.right ?? 0);
  // save after every step (the current exercise is asked again if you leave mid-way)
  const finished = useRef(false);
  useEffect(() => {
    if (saveKey && !finished.current) saveLesson(saveKey, { queue, pos, right, total } satisfies Saved);
  }, [saveKey, queue, pos, right, total]);

  const item = queue[pos];
  const ex = item?.ex;
  const tiles = item?.tiles ?? [];

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
      setQueue(q => [...q, mkItem(item.ex, item.idx, true)]);
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
    if (pos + 1 >= queue.length) {
      finished.current = true;
      if (saveKey) clearLesson(saveKey);
      onFinish(right, total);
      return;
    }
    setPos(pos + 1);
  };

  // After answering, drag the exercise to the left like a card: it follows
  // the finger, the next one peeks in from the right, and letting go past
  // the threshold flips to it (otherwise it springs back).
  const [drag, setDragState] = useState(0);
  const dragRef = useRef(0); // the latest offset, readable right away in pointerup
  const setDrag = (v: number) => { dragRef.current = v; setDragState(v); };
  const [dragging, setDragging] = useState(false);
  const [noEnter, setNoEnter] = useState(false); // swapped in by a swipe: no entrance animation
  const stageRef = useRef<HTMLDivElement>(null);
  const flipping = useRef(false);
  const finishFlip = () => {
    if (!flipping.current) return;
    flipping.current = false;
    setNoEnter(true);
    next();
    setDrag(0);
  };
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
    if (dragRef.current < -80) {
      // the page flies out and the preview slides exactly into its place…
      setDrag(-((stageRef.current?.offsetWidth ?? window.innerWidth) + 24));
      // …then (when it has arrived) the real exercise replaces the identical preview
      flipping.current = true;
      setTimeout(finishFlip, 450); // fallback if transitionend doesn't fire
    } else setDrag(0);
  };
  const nextItem = queue[pos + 1];

  if (!ex) return null;
  const task = taskOf(ex, t);

  return (
    <section className="wl" onPointerDown={onPointerDown} onPointerMove={onPointerMove}
      onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      <div className="wl-top">
        <button className="wl-close" onClick={onClose} aria-label={t.back}>✕</button>
        <div className="plan-bar wl-bar"><span style={{ width: `${(pos / queue.length) * 100}%` }} /></div>
        <HeartsBadge />
      </div>

      <div className="ex-stage" ref={stageRef}>
      {status && (
        <div className="ex-peek" onTransitionEnd={e => { if (e.propertyName === "transform") finishFlip(); }} style={{ transform: `translateX(calc(100% + 24px + ${drag}px))`, transition: dragging ? "none" : undefined }}>
          {nextItem
            ? <ExercisePreview item={nextItem} />
            : <p className="wl-task ex-finish">🏁 {t.exFinish}</p>}
        </div>
      )}
      <div className={"wl-body ex-page" + (noEnter ? " no-enter" : "")} key={pos}
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
          <button className="today-go" onClick={() => { setNoEnter(false); next(); }}>{t.lessonContinue}</button>
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
