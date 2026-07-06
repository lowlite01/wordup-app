import { useEffect } from "react";
import { useApp } from "../context";
import { useT } from "../i18n";
import { filteredLevelWords, keyLabel } from "../lib/groups";
import WordRow from "./WordRow";

interface Props {
  groupKey: string;
  posFilter: string;
  onBack: () => void;
}

export default function WordListScreen({ groupKey, posFilter, onBack }: Props) {
  const { recordRecent } = useApp();
  const t = useT();
  useEffect(() => {
    recordRecent(groupKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section>
      <button className="back-btn" onClick={onBack}>{t.back}</button>
      <h2 className="screen-title">{keyLabel(groupKey)}</h2>
      <div className="word-table">
        {filteredLevelWords(groupKey, posFilter).map(w => (
          <WordRow key={w.word} w={{ ...w, key: groupKey }} showStatus />
        ))}
      </div>
    </section>
  );
}
