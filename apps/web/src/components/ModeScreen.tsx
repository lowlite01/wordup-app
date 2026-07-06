import { useApp } from "../context";
import { useT } from "../i18n";
import {
  LEVELS, POS_CATS, filteredLevelWords, isKeyComplete, isKeyUnlocked, keyLabel,
  knownSet, learningSet, matchesPos, topicLevelKeys, wordsForKey,
} from "../lib/groups";

interface Props {
  topic: string;
  groupKey: string;
  setGroupKey: (k: string) => void;
  posFilter: string;
  setPosFilter: (f: string) => void;
  onBack: () => void;
  onStart: (mode: "flashcards" | "quiz" | "list") => void;
}

export default function ModeScreen(props: Props) {
  const { topic, groupKey, setGroupKey, posFilter, setPosFilter, onBack, onStart } = props;
  const { progress } = useApp();
  const t = useT();
  const isLevel = LEVELS.includes(topic);
  const keys = isLevel ? [topic] : topicLevelKeys(topic);

  const posLabels: Record<string, string> = {
    all: t.posAll, verb: t.posVerb, noun: t.posNoun, adj: t.posAdj, adverb: t.posAdverb,
  };

  const words = filteredLevelWords(groupKey, posFilter);
  const knownN = words.filter(w => knownSet(progress, groupKey).has(w.word)).length;
  const learnN = words.filter(w => learningSet(progress, groupKey).has(w.word)).length;
  const posCats = [
    "all",
    ...POS_CATS.filter(([c]) => wordsForKey(groupKey).some(w => matchesPos(w, c))).map(([c]) => c),
  ];

  return (
    <section>
      <button className="back-btn" onClick={onBack}>{t.backGroups}</button>
      <h2 className="screen-title">{topic}</h2>

      {isLevel ? (
        <div className="level-chips">
          {posCats.map(cat => (
            <button
              key={cat}
              className={"level-chip" + (posFilter === cat ? " active" : "")}
              onClick={() => setPosFilter(cat)}
            >
              {posLabels[cat]} ({wordsForKey(groupKey).filter(w => matchesPos(w, cat)).length})
            </button>
          ))}
        </div>
      ) : keys.length > 1 && (
        <div className="level-chips">
          {keys.map((key, i) => {
            const unlocked = isKeyUnlocked(progress, key);
            const complete = isKeyComplete(progress, key);
            return (
              <button
                key={key}
                className={"level-chip" + (key === groupKey ? " active" : "") + (unlocked ? "" : " locked")}
                disabled={!unlocked}
                title={unlocked ? undefined : t.unlockHint}
                onClick={() => setGroupKey(key)}
              >
                {t.levelN(i + 1)}{complete ? " ✓" : unlocked ? "" : " 🔒"}
              </button>
            );
          })}
        </div>
      )}

      <p className="muted">
        {keyLabel(groupKey)}
        {isLevel && posFilter !== "all" ? ` (${posLabels[posFilter].toLowerCase()})` : ""}
        {" — "}{t.modeInfo(words.length, knownN, learnN)}
      </p>

      <div className="mode-buttons">
        <button className="mode-btn" onClick={() => onStart("flashcards")}>
          <span className="mode-icon">🗂️</span>
          <span>{t.flashcards}</span>
        </button>
        <button className="mode-btn" onClick={() => onStart("quiz")}>
          <span className="mode-icon">❓</span>
          <span>{t.quiz}</span>
        </button>
        <button className="mode-btn" onClick={() => onStart("list")}>
          <span className="mode-icon">📋</span>
          <span>{t.wordList}</span>
        </button>
      </div>
    </section>
  );
}
