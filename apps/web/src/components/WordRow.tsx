import { useState } from "react";
import { useApp } from "../context";
import { useT } from "../i18n";
import type { KeyedWord } from "../types";
import { keyLabel, keyParts, knownSet, learningSet } from "../lib/groups";
import { dictEntry, pronounceWord, youglishUrl } from "../lib/dict";

interface Props {
  w: KeyedWord;
  showGroup?: boolean;
  showStatus?: boolean;
  onOpenGroup?: (name: string, key: string) => void;
}

export default function WordRow({ w, showGroup, showStatus, onOpenGroup }: Props) {
  const { progress, openContext } = useApp();
  const t = useT();
  const [ipa, setIpa] = useState(() => dictEntry(w.word)?.ipa || "");

  let status: "known" | "learning" | null = null;
  if (showStatus) {
    if (knownSet(progress, w.key).has(w.word)) status = "known";
    else if (learningSet(progress, w.key).has(w.word)) status = "learning";
  }

  const speak = async () => {
    await pronounceWord(w.word);
    const d = dictEntry(w.word);
    if (d?.ipa) setIpa(d.ipa);
  };

  return (
    <div className="word-row">
      <div className="w-top">
        <span
          className="w-word w-clickable"
          title={t.ctxTooltip}
          onClick={() => openContext(w)}
        >{w.word}</span>
        {ipa && <span className="w-ipa">{ipa}</span>}
        <span className="w-pos">{w.pos}</span>
        {status === "known" && <span className="tag-known">{t.tagKnown}</span>}
        {status === "learning" && <span className="tag-learning">{t.tagLearning}</span>}
        {showGroup && (
          <span
            className={"w-group-tag" + (onOpenGroup ? " w-group-link" : "")}
            title={onOpenGroup ? t.openGroupTooltip : undefined}
            onClick={onOpenGroup ? () => onOpenGroup(keyParts(w.key).name, w.key) : undefined}
          >{keyLabel(w.key)}</span>
        )}
      </div>
      <div className="w-def">{w.def}</div>
      <div className="w-example">{w.example}</div>
      <div className="w-actions">
        <button className="chip-btn" title={t.playTooltip} onClick={speak}>🔊</button>
        <a
          className="chip-btn"
          href={youglishUrl(w.word)}
          target="_blank"
          rel="noopener noreferrer"
          title={t.ytTooltip}
        >▶ YouTube</a>
      </div>
    </div>
  );
}
