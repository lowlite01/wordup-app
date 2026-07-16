import { useState } from "react";
import { useApp } from "../context";
import { useT } from "../i18n";
import { knownSet } from "../lib/groups";
import { PHRASAL_VERBS, pvKey } from "../lib/phrasalVerbs";

interface Props {
  onStart: (key: string, mode: "flashcards" | "quiz") => void;
}

export default function PhrasalVerbsScreen({ onStart }: Props) {
  const { progress } = useApp();
  const t = useT();
  const [open, setOpen] = useState<string | null>(PHRASAL_VERBS[0]?.verb ?? null);

  return (
    <section>
      <h2 className="screen-title">{t.phrasalTitle}</h2>
      <p className="muted">{t.phrasalHint}</p>

      {PHRASAL_VERBS.map(group => {
        const key = pvKey(group.verb);
        const total = group.items.length;
        const known = knownSet(progress, key).size;
        const isOpen = open === group.verb;
        return (
          <div className={"pv-card" + (isOpen ? " open" : "")} key={group.verb}>
            <button className="pv-head" onClick={() => setOpen(o => (o === group.verb ? null : group.verb))}>
              <span className="pv-verb">{group.verb}</span>
              <span className="pv-count">{known ? `${known} / ${total}` : t.phrasalCount(total)}</span>
              <span className="pv-chev">{isOpen ? "▾" : "›"}</span>
            </button>
            {isOpen && (
              <div className="pv-body">
                {group.items.map(w => (
                  <div className="pv-item" key={w.word}>
                    <span className="pv-word">{w.word}</span>
                    <span className="pv-def">{w.def}</span>
                    <span className="pv-example">“{w.example}”</span>
                  </div>
                ))}
                <div className="pv-actions">
                  <button className="btn primary" onClick={() => onStart(key, "flashcards")}>🃏 {t.flashcards}</button>
                  <button className="btn" onClick={() => onStart(key, "quiz")}>❓ {t.quiz}</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
