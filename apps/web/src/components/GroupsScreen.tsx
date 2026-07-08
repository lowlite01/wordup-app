import { useMemo, useState } from "react";
import { useApp } from "../context";
import { useT } from "../i18n";
import {
  LEVELS, LEVEL_COLORS, LEVEL_NAMES, keyLabel, knownSet, levelAllKeys,
  searchWords, topicLevelKeys, topicsForLevel, wordsForKey,
} from "../lib/groups";
import { topicEmoji } from "../lib/topicIcons";
import WordRow from "./WordRow";

type Mode = "flashcards" | "quiz" | "list";

interface Props {
  onStart: (key: string, mode: Mode) => void;
}

function SubRow({ groupKey, label, emoji, letter, onStart }: {
  groupKey: string; label: string; emoji?: string; letter?: string;
  onStart: (key: string, mode: Mode) => void;
}) {
  const { progress } = useApp();
  const total = wordsForKey(groupKey).length;
  const known = knownSet(progress, groupKey).size;
  const pct = total ? Math.round((known / total) * 100) : 0;
  return (
    <div className="journey-sub">
      <button className="journey-sub-main" onClick={() => onStart(groupKey, "flashcards")}>
        <span className={"journey-sub-badge" + (emoji ? " emoji" : "")}>{emoji || letter}</span>
        <span className="journey-sub-mid">
          <span className="journey-sub-title">{label}</span>
          <span className="journey-sub-sum">{known} / {total}{pct ? ` · ${pct}%` : ""}</span>
        </span>
      </button>
      <button className="journey-sub-mode" title="Quiz" onClick={() => onStart(groupKey, "quiz")}>❓</button>
      <button className="journey-sub-mode" title="Word list" onClick={() => onStart(groupKey, "list")}>📋</button>
    </div>
  );
}

export default function GroupsScreen({ onStart }: Props) {
  const { recent, gamification } = useApp();
  const t = useT();
  const [query, setQuery] = useState("");
  const [openLevel, setOpenLevel] = useState<string | null>(null);
  const matches = useMemo(() => searchWords(query), [query]);
  const searching = query.trim().length > 0;
  const validRecent = recent.filter(r => wordsForKey(r.key).length > 0);
  const { progress } = useApp();

  const toggle = (level: string) => setOpenLevel(l => (l === level ? null : level));

  return (
    <section>
      <div className="search-box">
        <input
          type="search"
          placeholder={t.searchPlaceholder}
          value={query}
          autoComplete="off"
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      {searching ? (
        <div className="word-table">
          {matches.length === 0 && <p className="muted">{t.noWordsFound(query.trim())}</p>}
          {matches.slice(0, 40).map(w => (
            <WordRow key={w.key + w.word} w={w} showGroup showStatus onOpenGroup={(_n, key) => onStart(key, "flashcards")} />
          ))}
          {matches.length > 40 && <p className="muted">{t.moreResults(matches.length - 40)}</p>}
        </div>
      ) : (
        <>
          {gamification && (
            <div className="stat-header">
              <div className="stat-top">
                <span className="stat-streak">🔥 <b>{gamification.streak}</b> <span>{t.streakWord.toLowerCase()}</span></span>
                <span className="stat-level">{t.levelWord} {gamification.level}</span>
              </div>
              <div className="stat-xp">{gamification.levelXp} / {gamification.levelSpan} XP</div>
              <div className="stat-track">
                <span style={{ width: `${Math.round((gamification.levelXp / gamification.levelSpan) * 100)}%` }} />
              </div>
            </div>
          )}

          {validRecent.length > 0 && (
            <>
              <div className="journey-section">{t.recentlyStudied}</div>
              <div className="recent-list">
                {validRecent.map(r => (
                  <button key={r.key} className="recent-chip" onClick={() => onStart(r.key, "flashcards")}>
                    {keyLabel(r.key)}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="journey-section">{t.yourPath}</div>
          <div className="journey-list">
            {LEVELS.map(level => {
              const allKeys = levelAllKeys(level);
              const total = allKeys.reduce((n, k) => n + wordsForKey(k).length, 0);
              const known = allKeys.reduce((n, k) => n + knownSet(progress, k).size, 0);
              const pct = total ? Math.round((known / total) * 100) : 0;
              const open = openLevel === level;
              return (
                <div key={level} className={"journey-row" + (open ? " open" : "")}>
                  <button className="journey-head" onClick={() => toggle(level)}>
                    <span className="journey-badge" style={{ background: LEVEL_COLORS[level], color: "#08120e" }}>{level}</span>
                    <span className="journey-mid">
                      <span className="journey-title">{LEVEL_NAMES[level] || level}</span>
                      <span className="journey-sub-count">{known} / {total} words{pct ? ` · ${pct}%` : ""}</span>
                    </span>
                    <span className="journey-chev">{open ? "▾" : "›"}</span>
                  </button>
                  <div className="journey-track"><span style={{ width: `${pct}%` }} /></div>
                  {open && (
                    <div className="journey-sublist">
                      <SubRow groupKey={level} label="Core vocabulary" letter={level} onStart={onStart} />
                      {topicsForLevel(level).flatMap(topicLevelKeys).map(key => (
                        <SubRow key={key} groupKey={key} label={keyLabel(key)} emoji={topicEmoji(key.split("@")[0])} onStart={onStart} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
