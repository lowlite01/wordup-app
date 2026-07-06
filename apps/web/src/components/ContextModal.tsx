import { useEffect, useState } from "react";
import { useApp } from "../context";
import { useT } from "../i18n";
import type { Word } from "../types";
import { pronounceWord, useIpa, youglishUrl } from "../lib/dict";
import { fetchWordContext, type WordCtx } from "../lib/wordContext";

interface Props {
  word: Word;
  onClose: () => void;
}

export default function ContextModal({ word, onClose }: Props) {
  const { openContext } = useApp();
  const t = useT();
  const [ctx, setCtx] = useState<WordCtx | null>(null);
  const ipa = useIpa(word.word);

  useEffect(() => {
    setCtx(null);
    let alive = true;
    fetchWordContext(word.word, word.pos).then(c => {
      if (alive) setCtx(c);
    });
    return () => { alive = false; };
  }, [word.word, word.pos]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const empty = ctx && !ctx.phrasal.length && !ctx.colloc.length && !ctx.synonyms.length;

  const sections: [string, string[], "phrase" | "syn"][] = ctx
    ? [
        [t.phrasalVerbs, ctx.phrasal, "phrase"],
        [t.collocations, ctx.colloc, "phrase"],
        [t.synonyms, ctx.synonyms, "syn"],
      ]
    : [];

  return (
    <div className="ctx-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ctx-modal">
        <button className="ctx-close" title={t.closeTooltip} onClick={onClose}>✕</button>
        <div className="ctx-head">
          <span className="ctx-word">{word.word}</span>
          {ipa && <span className="w-ipa">{ipa}</span>}
          {word.pos && <span className="w-pos">{word.pos}</span>}
        </div>
        {word.def && <div className="w-def">{word.def}</div>}
        {word.example && <div className="w-example">{word.example}</div>}
        <div className="w-actions">
          <button className="chip-btn" title={t.playTooltip} onClick={() => pronounceWord(word.word)}>🔊</button>
          <a
            className="chip-btn"
            href={youglishUrl(word.word)}
            target="_blank"
            rel="noopener noreferrer"
            title={t.ytTooltip}
          >▶ YouTube</a>
        </div>

        {!ctx && <p className="muted">{t.ctxLoading}</p>}
        {empty && <p className="muted">{t.ctxEmpty}</p>}
        {sections.map(([title, items, kind]) =>
          items.length ? (
            <div key={title}>
              <h3 className="ctx-title">{title}</h3>
              <div className="ctx-chips">
                {items.map(text =>
                  kind === "phrase" ? (
                    <a
                      key={text}
                      className="ctx-chip"
                      href={youglishUrl(text)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={t.ctxChipTooltip}
                    >{text}</a>
                  ) : (
                    <button
                      key={text}
                      className="ctx-chip"
                      title={t.synTooltip}
                      onClick={() => openContext({ word: text, pos: "", def: "", example: "" })}
                    >{text}</button>
                  )
                )}
              </div>
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}
