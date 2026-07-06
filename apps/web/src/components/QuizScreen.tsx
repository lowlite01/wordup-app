import { useEffect, useMemo, useState } from "react";
import { useApp } from "../context";
import { useT } from "../i18n";
import type { Word } from "../types";
import { filteredLevelWords, shuffle, wordsForKey } from "../lib/groups";

interface Props {
  groupKey: string;
  posFilter: string;
  onBack: () => void;
  onRetry: () => void;
  onGroups: () => void;
}

export default function QuizScreen({ groupKey, posFilter, onBack, onRetry, onGroups }: Props) {
  const { setWordState, recordQuiz, recordRecent } = useApp();
  const t = useT();
  const [words] = useState<Word[]>(() => shuffle([...filteredLevelWords(groupKey, posFilter)]));
  const [qi, setQi] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    recordRecent(groupKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const correct = words[qi];

  const options = useMemo(() => {
    if (!correct) return [];
    // prefer distractors of the same part of speech; top up from the whole group
    let pool = filteredLevelWords(groupKey, posFilter).filter(w => w.word !== correct.word);
    if (pool.length < 3) {
      const inPool = new Set(pool.map(w => w.word));
      pool = pool.concat(wordsForKey(groupKey)
        .filter(w => w.word !== correct.word && !inPool.has(w.word)));
    }
    const distractors = shuffle([...pool]).slice(0, Math.min(3, pool.length));
    return shuffle([correct, ...distractors]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qi]);

  if (!words.length) {
    return (
      <section>
        <button className="back-btn" onClick={onBack}>{t.back}</button>
        <p className="muted">{t.noQuizWords}</p>
      </section>
    );
  }

  if (finished) {
    return (
      <section>
        <div className="result-box">
          <h2>{t.quizComplete}</h2>
          <p className="result-score">{t.quizScore(score, words.length)}</p>
          <button className="btn primary wide" onClick={onRetry}>{t.tryAgain}</button>
          <button className="btn wide" onClick={onGroups}>{t.chooseAnother}</button>
        </div>
      </section>
    );
  }

  const answer = (opt: Word) => {
    if (picked) return;
    setPicked(opt.word);
    recordQuiz(correct.word, opt.word);
    if (opt.word === correct.word) {
      setScore(s => s + 1);
      setWordState(groupKey, correct.word, "known");
    } else {
      setWordState(groupKey, correct.word, "learning");
    }
  };

  const next = () => {
    setPicked(null);
    if (qi + 1 >= words.length) setFinished(true);
    else setQi(i => i + 1);
  };

  const isCorrectPick = picked === correct.word;

  return (
    <section>
      <button className="back-btn" onClick={onBack}>{t.back}</button>
      <div className="progress-row">
        <span>{t.questionN(qi + 1, words.length)}</span>
        <span>{t.scoreN(score)}</span>
      </div>
      <div className="quiz-question">
        <p className="muted">{t.quizPrompt}</p>
        <p className="quiz-def">{correct.def}</p>
      </div>
      <div className="quiz-options">
        {options.map(opt => {
          let cls = "quiz-option";
          if (picked) {
            if (opt.word === correct.word) cls += " correct";
            else if (opt.word === picked) cls += " wrong";
          }
          return (
            <button key={opt.word} className={cls} disabled={!!picked} onClick={() => answer(opt)}>
              {opt.word}
            </button>
          );
        })}
      </div>
      {picked && (
        <>
          <div className={"quiz-feedback " + (isCorrectPick ? "correct-text" : "wrong-text")}>
            {isCorrectPick ? t.correctFb : t.notQuite(correct.word)}
          </div>
          <button className="btn primary wide" onClick={next}>{t.nextQuestion}</button>
        </>
      )}
    </section>
  );
}
