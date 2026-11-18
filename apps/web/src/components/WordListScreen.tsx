import { useEffect } from "react";
import { useApp } from "../context";
import { useT } from "../i18n";
import { isCustomKey, LIST_PREFIX } from "../lib/customLists";
import { filteredLevelWords, keyLabel, knownSet } from "../lib/groups";
import { askConfirm } from "../lib/telegram";
import WordRow from "./WordRow";

interface Props {
  groupKey: string;
  posFilter: string;
  onBack: () => void;
}

export default function WordListScreen({ groupKey, posFilter, onBack }: Props) {
  const { recordRecent, progress, removeListWords } = useApp();
  const t = useT();
  useEffect(() => {
    recordRecent(groupKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const words = filteredLevelWords(groupKey, posFilter);
  // Own lists (imported, from Reverso) can be cleaned up: one word at a time,
  // or all the words already learned at once.
  const ownList = isCustomKey(groupKey);
  const listId = groupKey.slice(LIST_PREFIX.length);
  const known = ownList ? words.filter(w => knownSet(progress, groupKey).has(w.word)).map(w => w.word) : [];

  const removeKnown = async () => {
    if (await askConfirm(t.removeKnownConfirm(known.length))) removeListWords(listId, known);
  };

  return (
    <section>
      <button className="back-btn" onClick={onBack}>{t.back}</button>
      <h2 className="screen-title">{keyLabel(groupKey)}</h2>
      {ownList && known.length > 0 && (
        <div className="list-tools">
          <button className="btn" onClick={removeKnown}>{t.removeKnown(known.length)}</button>
        </div>
      )}
      <div className="word-table">
        {words.map(w => (
          <WordRow
            key={w.word}
            w={{ ...w, key: groupKey }}
            showStatus
            onRemove={ownList ? () => removeListWords(listId, [w.word]) : undefined}
          />
        ))}
      </div>
    </section>
  );
}
