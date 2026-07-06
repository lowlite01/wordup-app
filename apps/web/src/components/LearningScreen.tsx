import { useMemo } from "react";
import { useApp } from "../context";
import { useT } from "../i18n";
import { collectWords } from "../lib/groups";
import WordRow from "./WordRow";

interface Props {
  onPractice: () => void;
  onOpenGroup: (name: string, key: string) => void;
}

export default function LearningScreen({ onPractice, onOpenGroup }: Props) {
  const { progress } = useApp();
  const t = useT();
  const words = useMemo(() => collectWords(progress, "learning"), [progress]);

  return (
    <section>
      <h2 className="screen-title">{t.learningTitle}</h2>
      <p className="muted">
        {words.length ? t.learningSummary(words.length) : t.learningEmpty}
      </p>
      {words.length > 0 && (
        <button className="btn primary" onClick={onPractice}>{t.practiceBtn}</button>
      )}
      <div className="word-table">
        {words.map(w => (
          <WordRow key={w.key + w.word} w={w} showGroup onOpenGroup={onOpenGroup} />
        ))}
      </div>
    </section>
  );
}
