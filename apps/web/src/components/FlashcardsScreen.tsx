import { useEffect, useRef, useState } from "react";
import { useApp } from "../context";
import { useT } from "../i18n";
import type { FlashMode, KeyedWord } from "../types";
import {
  collectWords, filteredLevelWords, keyLabel, knownSet, nextLevelKey,
} from "../lib/groups";
import { pronounceWord, useIpa, youglishUrl } from "../lib/dict";
import { liveStreak, planDeck } from "../lib/dailyPlan";
import Confetti from "./Confetti";

interface Props {
  mode: FlashMode;
  groupKey: string;
  posFilter: string;
  onBack: () => void;
  onNextLevel: (key: string) => void;
}

type Mic =
  | { status: "idle" | "listening" | "good" | "blocked" | "fail" }
  | { status: "heard"; heard: string };

export default function FlashcardsScreen({ mode, groupKey, posFilter, onBack, onNextLevel }: Props) {
  const { progress, setWordState, resetKey, recordRecent, settings, plan, streak, answerPlan } = useApp();
  const t = useT();
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const isPlan = mode === "plan";

  const buildGroupDeck = (includeKnown: boolean): KeyedWord[] => {
    const known = knownSet(progressRef.current, groupKey);
    return filteredLevelWords(groupKey, posFilter)
      .filter(w => includeKnown || !known.has(w.word))
      .map(w => ({ ...w, key: groupKey }));
  };

  const [deck, setDeck] = useState<KeyedWord[]>(() =>
    isPlan ? planDeck(plan)
    : mode === "learning-mix" ? collectWords(progress, "learning")
    : buildGroupDeck(false));
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [studyAll, setStudyAll] = useState(false);
  const [mic, setMic] = useState<Mic>({ status: "idle" });
  const recognizing = useRef(false);

  useEffect(() => {
    if (mode !== "learning-mix" && !isPlan) recordRecent(groupKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = deck.length ? deck[Math.min(idx, deck.length - 1)] : null;
  const ipa = useIpa(current?.word ?? "");

  useEffect(() => {
    setMic({ status: "idle" });
    if (current && settings.autoSpeak) pronounceWord(current.word);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.word]);

  const micText = mic.status === "listening" ? t.micListening
    : mic.status === "good" ? t.micGood
    : mic.status === "blocked" ? t.micBlocked
    : mic.status === "fail" ? t.micFail
    : mic.status === "heard" ? t.micHeard(mic.heard)
    : "";
  const micClass = mic.status === "good" ? "good"
    : mic.status === "listening" || mic.status === "idle" ? ""
    : "bad";

  const move = (delta: number) => {
    if (!deck.length) return;
    setIdx(i => (i + delta + deck.length) % deck.length);
    setFlipped(false);
  };

  const dropCurrent = () => {
    if (!current) return;
    setDeck(d => {
      const next = d.filter(w => !(w.key === current.key && w.word === current.word));
      if (idx >= next.length) setIdx(0);
      return next;
    });
    setFlipped(false);
  };

  const markKnown = () => {
    if (!current) return;
    setWordState(current.key, current.word, "known");
    if (isPlan) answerPlan(current.key, current.word);
    dropCurrent();
  };

  // In the daily plan both answers count the card as done for today
  // (otherwise the plan could never be finished).
  const markLearning = () => {
    if (!current) return;
    setWordState(current.key, current.word, "learning");
    if (isPlan) {
      answerPlan(current.key, current.word);
      dropCurrent();
    } else move(1);
  };

  const reset = () => {
    if (!confirm(t.resetGroupConfirm(keyLabel(groupKey)))) return;
    resetKey(groupKey);
    setDeck(filteredLevelWords(groupKey, posFilter).map(w => ({ ...w, key: groupKey })));
    setIdx(0);
    setFlipped(false);
    setStudyAll(false);
  };

  const startMic = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec || recognizing.current || !current) return;
    const target = current.word;
    const rec = new SpeechRec();
    rec.lang = "en-US";
    rec.maxAlternatives = 5;
    recognizing.current = true;
    setMic({ status: "listening" });
    rec.onresult = (ev: any) => {
      const alts = ev.results[0];
      const heard: string[] = [];
      for (let i = 0; i < alts.length; i++) heard.push(alts[i].transcript.trim().toLowerCase());
      const norm = (s: string) => s.toLowerCase().replace(/[^a-z' ]/g, "");
      if (heard.some(h => norm(h) === norm(target))) setMic({ status: "good" });
      else setMic({ status: "heard", heard: heard[0] || "…" });
    };
    rec.onerror = (ev: any) => {
      setMic({ status: ev.error === "not-allowed" ? "blocked" : "fail" });
    };
    rec.onend = () => {
      recognizing.current = false;
      setMic(m => (m.status === "listening" ? { status: "idle" } : m));
    };
    try {
      rec.start();
    } catch {
      recognizing.current = false;
      setMic({ status: "idle" });
    }
  };

  const hasMic = Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  if (!current && isPlan) {
    const n = liveStreak(streak);
    return (
      <section>
        <button className="back-btn" onClick={onBack}>{t.back}</button>
        <div className="result-box plan-done">
          {plan.completed && <Confetti />}
          <div className="plan-done-flame">🔥</div>
          <div className="plan-done-count">{n}</div>
          <h2>{plan.completed ? t.planDoneTitle : t.planEmptyTitle}</h2>
          <p className="muted">{plan.completed ? t.planDoneSub(n) : t.planEmptySub}</p>
          <button className="btn primary wide" onClick={onBack}>{t.backBtn}</button>
        </div>
      </section>
    );
  }

  if (!current) {
    const nextKey = mode === "group" && !studyAll ? nextLevelKey(groupKey) : null;
    return (
      <section>
        <button className="back-btn" onClick={onBack}>{t.back}</button>
        <div className="result-box">
          <Confetti />
          <h2>{t.deckComplete}</h2>
          <p className="muted">
            {nextKey ? t.deckCompleteNext(keyLabel(nextKey)) : t.deckCompleteAll}
          </p>
          {nextKey && (
            <button className="btn primary wide" onClick={() => onNextLevel(nextKey)}>
              {t.startNextLevel}
            </button>
          )}
          {mode !== "learning-mix" && (
            <button
              className="btn wide"
              onClick={() => {
                setDeck(buildGroupDeck(true));
                setIdx(0);
                setStudyAll(true);
              }}
            >{t.studyAllAgain}</button>
          )}
          <button className="btn wide" onClick={onBack}>{t.backBtn}</button>
        </div>
      </section>
    );
  }

  const counter = isPlan
    ? t.planProgress(plan.done.length, plan.items.length)
    : mode === "learning-mix"
    ? t.stillLearningCount(collectWords(progress, "learning").length)
    : t.knownCount(knownSet(progress, groupKey).size);
  const kind = isPlan ? (current as KeyedWord & { kind?: string }).kind : undefined;

  return (
    <section>
      <button className="back-btn" onClick={onBack}>{t.back}</button>
      <div className="progress-row">
        <span>{t.cardProgress(Math.min(idx, deck.length - 1) + 1, deck.length)}</span>
        <span>{counter}</span>
      </div>
      {isPlan && (
        <div className="plan-bar">
          <span style={{ width: `${plan.items.length ? (plan.done.length / plan.items.length) * 100 : 0}%` }} />
        </div>
      )}

      <div className="card-stage">
        <div
          className={"flashcard" + (flipped ? " flipped" : "")}
          onClick={() => setFlipped(f => !f)}
        >
          <div className="flashcard-face flashcard-front">
            <div className="pos-tag">
              {current.pos}{mode === "learning-mix" || isPlan ? ` · ${keyLabel(current.key)}` : ""}
            </div>
            {kind && (
              <div className={"plan-kind " + kind}>{kind === "new" ? t.planNew : t.planReview}</div>
            )}
            <div className="fc-word">{current.word}</div>
            <div className="fc-ipa">{ipa}</div>
            <div className="fc-actions">
              <button
                className="round-btn"
                title={t.playTooltip}
                onClick={e => { e.stopPropagation(); pronounceWord(current.word); }}
              >🔊</button>
              {hasMic && (
                <button
                  className={"round-btn" + (mic.status === "listening" ? " listening" : "")}
                  title={t.micTooltip}
                  onClick={e => { e.stopPropagation(); startMic(); }}
                >🎤</button>
              )}
            </div>
            <div className={"mic-feedback " + micClass}>{micText}</div>
            <div className="flip-hint">{t.clickToFlip}</div>
          </div>
          <div className="flashcard-face flashcard-back">
            <div className="fc-def">{current.def}</div>
            <div className="fc-example">{current.example}</div>
            <a
              className="fc-youglish"
              href={youglishUrl(current.word)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
            >{t.youglishFc}</a>
          </div>
        </div>
      </div>

      <div className="flash-controls">
        <button className="btn" onClick={() => move(-1)}>{t.prev}</button>
        <button className="btn danger" onClick={markLearning}>{t.stillLearningBtn}</button>
        <button className="btn success" onClick={markKnown}>{t.knowItBtn}</button>
        <button className="btn" onClick={() => move(1)}>{t.next}</button>
      </div>

      {mode === "group" && !studyAll && (
        <button className="reset-btn" onClick={reset}>{t.resetGroup}</button>
      )}
    </section>
  );
}
