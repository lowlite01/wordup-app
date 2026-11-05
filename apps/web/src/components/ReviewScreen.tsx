import { useMemo, useState } from "react";
import { useApp } from "../context";
import { useT } from "../i18n";
import type { KeyedWord } from "../types";
import { LEVELS, collectWords, keyLabel, keyParts } from "../lib/groups";
import { isCustomKey } from "../lib/customLists";
import { isPhrasalKey } from "../lib/phrasalVerbs";
import { isIeltsKey } from "../lib/ielts";
import { pronounceWord } from "../lib/dict";
import { wordTime } from "../lib/wordTimes";
import Emoji from "./Emoji";

type Status = "all" | "learning" | "known" | "mistakes";
type Sort = "oldest" | "recent" | "hard" | "az";

// Filters survive leaving the tab (e.g. to practise and come back).
const saved: { status: Status; section: string; sort: Sort; query: string } = {
  status: "all", section: "all", sort: "oldest", query: "",
};

export interface ReviewWord extends KeyedWord { status: "learning" | "known"; wrong: number; time: number }

// Which section a word belongs to, for the filter chips.
function sectionOf(key: string): string {
  if (isCustomKey(key)) return "lists";
  if (isPhrasalKey(key)) return "phrasal";
  if (isIeltsKey(key)) return "ielts";
  return keyParts(key).name; // level (A1…) or topic name
}

// "Review" tab: everything you've studied, with filters, sorting and a
// button to practise exactly the filtered set as flashcards.
export default function ReviewScreen({ onPractice }: { onPractice: (words: KeyedWord[]) => void }) {
  const { progress, stats, openContext } = useApp();
  const t = useT();
  const [status, setStatusS] = useState<Status>(saved.status);
  const [section, setSectionS] = useState(saved.section);
  const [sort, setSortS] = useState<Sort>(saved.sort);
  const [query, setQueryS] = useState(saved.query);
  const setStatus = (v: Status) => { saved.status = v; setStatusS(v); };
  const setSection = (v: string) => { saved.section = v; setSectionS(v); };
  const setSort = (v: Sort) => { saved.sort = v; setSortS(v); };
  const setQuery = (v: string) => { saved.query = v; setQueryS(v); };

  const all: ReviewWord[] = useMemo(() => {
    const mk = (kind: "learning" | "known") => collectWords(progress, kind).map(w => ({
      ...w, status: kind, wrong: stats[w.word]?.wrong ?? 0, time: wordTime(w.key, w.word),
    }));
    return [...mk("learning"), ...mk("known")];
  }, [progress, stats]);

  // filter chips: only sections that actually have words
  const sections = useMemo(() => {
    const set = new Set(all.map(w => sectionOf(w.key)));
    const order = [...LEVELS, ...[...set].filter(s => !LEVELS.includes(s) && !["lists", "phrasal", "ielts"].includes(s)).sort(), "ielts", "phrasal", "lists"];
    return order.filter(s => set.has(s));
  }, [all]);
  const sectionLabel = (s: string) =>
    s === "lists" ? t.myLists : s === "phrasal" ? t.tabPhrasal : s === "ielts" ? "IELTS" : s;

  const words = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = all.filter(w =>
      (status === "all" || (status === "mistakes" ? w.wrong > 0 : w.status === status)) &&
      (section === "all" || sectionOf(w.key) === section) &&
      (!q || w.word.toLowerCase().includes(q) || (w.def || "").toLowerCase().includes(q)));
    const by: Record<Sort, (a: ReviewWord, b: ReviewWord) => number> = {
      oldest: (a, b) => a.time - b.time,
      recent: (a, b) => b.time - a.time,
      hard: (a, b) => b.wrong - a.wrong || (a.status === "learning" ? -1 : 1),
      az: (a, b) => a.word.localeCompare(b.word),
    };
    return [...list].sort(by[sort]);
  }, [all, status, section, sort, query]);

  const counts = {
    all: all.length,
    learning: all.filter(w => w.status === "learning").length,
    known: all.filter(w => w.status === "known").length,
    mistakes: all.filter(w => w.wrong > 0).length,
  };

  if (all.length === 0) {
    return (
      <section>
        <h2 className="screen-title">{t.reviewTitle}</h2>
        <div className="review-empty">
          <Emoji char="🧠" className="review-empty-icon" />
          <p className="muted">{t.reviewEmpty}</p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="screen-title">{t.reviewTitle}</h2>

      <div className="review-status">
        {(["all", "learning", "known", "mistakes"] as Status[]).map(s => (
          <button key={s} className={"review-seg" + (status === s ? " active" : "")} onClick={() => setStatus(s)}>
            {s === "all" ? t.reviewAll : s === "learning" ? t.tabLearning : s === "known" ? t.tabKnown : t.reviewMistakes}
            <span>{counts[s]}</span>
          </button>
        ))}
      </div>

      <div className="review-tools">
        <input
          className="review-search" type="search" value={query} placeholder={t.reviewSearch}
          onChange={e => setQuery(e.target.value)}
        />
        <select className="review-sort" value={sort} onChange={e => setSort(e.target.value as Sort)}>
          <option value="oldest">{t.sortOldest}</option>
          <option value="recent">{t.sortRecent}</option>
          <option value="hard">{t.sortHard}</option>
          <option value="az">{t.sortAZ}</option>
        </select>
      </div>

      {sections.length > 1 && (
        <div className="review-chips">
          <button className={"level-chip" + (section === "all" ? " active" : "")} onClick={() => setSection("all")}>{t.reviewAll}</button>
          {sections.map(s => (
            <button key={s} className={"level-chip" + (section === s ? " active" : "")} onClick={() => setSection(s)}>
              {sectionLabel(s)}
            </button>
          ))}
        </div>
      )}

      <button className="today-go review-go" disabled={!words.length} onClick={() => onPractice(words)}>
        {t.reviewPractice(words.length)}
      </button>

      <div className="review-list">
        {words.length === 0 && <p className="muted">{t.reviewNothing}</p>}
        {words.slice(0, 200).map(w => (
          <div key={w.key + "|" + w.word} className={"review-row " + w.status}>
            <button className="review-word" onClick={() => openContext(w)}>
              <b>{w.word}</b>
              <span className="review-def">{w.ru || w.def}</span>
            </button>
            <div className="review-meta">
              {w.wrong > 0 && <span className="review-wrong">✗ {w.wrong}</span>}
              <span className="review-tag">{keyLabel(w.key)}</span>
              <span className={"review-dot " + w.status} title={w.status === "known" ? t.tabKnown : t.tabLearning} />
            </div>
            <button className="review-speak" onClick={() => pronounceWord(w.word)} aria-label="🔊">
              <Emoji char="🔊" />
            </button>
          </div>
        ))}
        {words.length > 200 && <p className="muted">{t.moreResults(words.length - 200)}</p>}
      </div>
    </section>
  );
}
