import { useEffect, useMemo, useState } from "react";
import { useApp } from "../context";
import { useT } from "../i18n";
import type { Word } from "../types";
import { knownSet, progressKey, shuffle, wordsForKey } from "../lib/groups";
import { preloadWord, pronounceWord, useIpa } from "../lib/dict";
import { haptic } from "../lib/telegram";
import Confetti from "./Confetti";
import Emoji from "./Emoji";
import { HeartsBadge } from "./ProScreen";

// Duolingo-style word lesson used by the "words" steps of the path:
// new words are introduced in groups of four (word + sound + translation +
// example), then practised in mixed exercises — pick the translation, pick
// the English word, listen and pick, match the pairs. A wrong answer sends
// the exercise to the back of the queue. Finishing marks the words known.

type Ex =
  | { type: "intro"; w: Word }
  | { type: "toTr" | "toEn" | "listen"; w: Word; options: Word[] }
  | { type: "match"; words: Word[] };

const CHUNK = 4;

export default function WordLessonScreen({ groupKey, onBack }: { groupKey: string; onBack: () => void }) {
  const { progress, setWordState, settings, loseHeart } = useApp();
  const t = useT();
  const ru = settings.lang === "ru";
  // translation shown to the learner: Russian when available, otherwise the English definition
  const tr = (w: Word) => (ru && w.ru ? w.ru : w.def);

  const lessonWords = useMemo(() => {
    const all = wordsForKey(groupKey);
    const known = knownSet(progress, groupKey);
    const fresh = all.filter(w => !known.has(w.word));
    return fresh.length ? fresh : all; // all known → practise them all again
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupKey]);

  // distractors come from the whole level so options aren't too obvious
  const pool = useMemo(() => {
    const base = wordsForKey(progressKey(groupKey));
    return base.length >= 4 ? base : wordsForKey(groupKey);
  }, [groupKey]);
  const optionsFor = (w: Word): Word[] =>
    shuffle([w, ...shuffle(pool.filter(o => o.word !== w.word && tr(o) !== tr(w))).slice(0, 3)]);

  const initial = useMemo<Ex[]>(() => {
    const q: Ex[] = [];
    for (let i = 0; i < lessonWords.length; i += CHUNK) {
      const chunk = lessonWords.slice(i, i + CHUNK);
      chunk.forEach(w => q.push({ type: "intro", w }));
      const kinds: ("toTr" | "toEn" | "listen")[] = ["toTr", "toEn", "listen"];
      shuffle(chunk.map((w, k) => ({ type: kinds[(i + k) % 3], w, options: optionsFor(w) }) as Ex))
        .forEach(e => q.push(e));
      if (chunk.length >= 3) q.push({ type: "match", words: chunk });
    }
    return q;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonWords]);

  const [queue, setQueue] = useState<Ex[]>(initial);
  const [pos, setPos] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [finished, setFinished] = useState(false);

  const ex = queue[pos];
  const total = initial.length;
  const progressPct = Math.min(100, (Math.min(pos, total) / total) * 100);

  // play the word automatically on intro / listening screens
  useEffect(() => {
    if (!ex) return;
    if (ex.type === "intro" || ex.type === "listen") pronounceWord(ex.w.word);
    const nxt = queue[pos + 1];
    if (nxt && "w" in nxt) preloadWord(nxt.w.word);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos]);

  const advance = () => {
    setPicked(null);
    if (pos + 1 >= queue.length) {
      lessonWords.forEach(w => setWordState(groupKey, w.word, "known"));
      setFinished(true);
      haptic("success");
      return;
    }
    setPos(pos + 1);
  };

  const choose = (opt: Word) => {
    if (picked || !ex || !("w" in ex) || ex.type === "intro") return;
    setPicked(opt.word);
    setAnswered(a => a + 1);
    if (opt.word === ex.w.word) haptic("success");
    else {
      haptic("error");
      setMistakes(m => m + 1);
      loseHeart();
      // try it again at the end of the lesson
      setQueue(q => [...q, { ...ex, options: optionsFor(ex.w) }]);
    }
  };

  if (!lessonWords.length) return null;

  if (finished) {
    const accuracy = answered ? Math.round(((answered - mistakes) / answered) * 100) : 100;
    return (
      <section>
        <div className="result-box lesson-finish">
          <Confetti />
          <Emoji char="🏆" className="lesson-result-icon" />
          <h2>{t.lessonDoneTitle}</h2>
          <div className="lesson-stats">
            <div><b>{lessonWords.length}</b><span>{t.lessonWordsLearned}</span></div>
            <div><b>{accuracy}%</b><span>{t.lessonAccuracy}</span></div>
          </div>
          <button className="today-go" onClick={onBack}>{t.toPath}</button>
        </div>
      </section>
    );
  }

  return (
    <section className="wl">
      <div className="wl-top">
        <button className="wl-close" onClick={onBack} aria-label={t.back}>✕</button>
        <div className="plan-bar wl-bar"><span style={{ width: `${progressPct}%` }} /></div>
        <HeartsBadge />
      </div>

      <div className="wl-body" key={pos}>
        {ex.type === "intro" && <Intro w={ex.w} tr={tr(ex.w)} label={t.lessonNewWord} />}

        {(ex.type === "toTr" || ex.type === "toEn" || ex.type === "listen") && (
          <>
            <p className="wl-task">
              {ex.type === "toTr" ? t.lessonPickTranslation : ex.type === "toEn" ? t.lessonPickWord : t.lessonListen}
            </p>
            {ex.type === "toTr" && (
              <div className="wl-prompt">
                <button className="wl-sound" onClick={() => pronounceWord(ex.w.word)}><Emoji char="🔊" /></button>
                <span className="wl-word">{ex.w.word}</span>
              </div>
            )}
            {ex.type === "toEn" && <div className="wl-prompt"><span className="wl-word tr">{tr(ex.w)}</span></div>}
            {ex.type === "listen" && (
              <div className="wl-prompt">
                <button className="wl-sound big" onClick={() => pronounceWord(ex.w.word)}><Emoji char="🔊" /></button>
              </div>
            )}
            <div className="wl-options">
              {ex.options.map(o => {
                const isRight = o.word === ex.w.word;
                const state = picked ? (isRight ? " correct" : picked === o.word ? " wrong" : " dim") : "";
                return (
                  <button key={o.word} className={"wl-option" + state} disabled={!!picked} onClick={() => choose(o)}>
                    {ex.type === "toTr" ? tr(o) : o.word}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {ex.type === "match" && (
          <Match words={ex.words} tr={tr} title={t.lessonMatch} onDone={advance}
            onMistake={() => { setMistakes(m => m + 1); setAnswered(a => a + 1); loseHeart(); }}
            onHit={() => setAnswered(a => a + 1)} />
        )}
      </div>

      {ex.type === "intro" && (
        <div className="wl-footer"><button className="today-go" onClick={advance}>{t.lessonContinue}</button></div>
      )}
      {picked && "w" in ex && (
        <div className={"wl-footer feedback " + (picked === ex.w.word ? "ok" : "bad")}>
          <div className="wl-feedback">
            <b>{picked === ex.w.word ? t.lessonRight : t.lessonWrong}</b>
            {picked !== ex.w.word && <span>{ex.w.word} — {tr(ex.w)}</span>}
          </div>
          <button className="today-go" onClick={advance}>{t.lessonContinue}</button>
        </div>
      )}
    </section>
  );
}

function Intro({ w, tr, label }: { w: Word; tr: string; label: string }) {
  const ipa = useIpa(w.word);
  return (
    <div className="wl-intro">
      <span className="wl-new">{label}</span>
      <div className="wl-intro-word">{w.word}</div>
      {ipa && <div className="wl-ipa">{ipa}</div>}
      <button className="wl-sound" onClick={() => pronounceWord(w.word)}><Emoji char="🔊" /></button>
      <div className="wl-intro-tr">{tr}</div>
      {w.example && <div className="wl-example">“{w.example}”</div>}
    </div>
  );
}

// Tap a word on the left and its translation on the right; pairs disappear.
function Match({ words, tr, title, onDone, onMistake, onHit }: {
  words: Word[]; tr: (w: Word) => string; title: string;
  onDone: () => void; onMistake: () => void; onHit: () => void;
}) {
  const left = useMemo(() => shuffle([...words]), [words]);
  const right = useMemo(() => shuffle([...words]), [words]);
  const [sel, setSel] = useState<{ side: "l" | "r"; word: string } | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [bad, setBad] = useState<string | null>(null);

  const tap = (side: "l" | "r", word: string) => {
    if (done.includes(word)) return;
    if (side === "l") pronounceWord(word);
    if (!sel || sel.side === side) { setSel({ side, word }); return; }
    if (sel.word === word) {
      haptic("success");
      onHit();
      const next = [...done, word];
      setDone(next);
      setSel(null);
      if (next.length === words.length) setTimeout(onDone, 450);
    } else {
      haptic("error");
      onMistake();
      setBad(side + word);
      setTimeout(() => setBad(null), 450);
      setSel(null);
    }
  };
  const cls = (side: "l" | "r", word: string) =>
    "wl-match-item" + (done.includes(word) ? " done" : "") +
    (sel?.side === side && sel.word === word ? " sel" : "") + (bad === side + word ? " bad" : "");

  return (
    <>
      <p className="wl-task">{title}</p>
      <div className="wl-match">
        <div>{left.map(w => <button key={w.word} className={cls("l", w.word)} onClick={() => tap("l", w.word)}>{w.word}</button>)}</div>
        <div>{right.map(w => <button key={w.word} className={cls("r", w.word)} onClick={() => tap("r", w.word)}>{tr(w)}</button>)}</div>
      </div>
    </>
  );
}
