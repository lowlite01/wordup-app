import { useMemo, useState } from "react";
import { useApp } from "../context";
import { timeAgoText, useT } from "../i18n";
import {
  LEVELS, TOPICS, isKeyComplete, keyLabel, keyParts, knownSet, searchWords,
  topicLevelKeys, wordsForKey,
} from "../lib/groups";
import WordRow from "./WordRow";

interface Props {
  onOpenGroup: (name: string, preferredKey?: string) => void;
}

function GroupCard({ name, onOpen }: { name: string; onOpen: () => void }) {
  const { progress } = useApp();
  const t = useT();
  const keys = LEVELS.includes(name) ? [name] : topicLevelKeys(name);
  const total = keys.reduce((n, k) => n + wordsForKey(k).length, 0);
  const known = keys.reduce((n, k) => n + knownSet(progress, k).size, 0);
  const levelsDone = keys.filter(k => isKeyComplete(progress, k)).length;
  const pct = total ? Math.round((known / total) * 100) : 0;

  return (
    <button className="group-card" onClick={onOpen}>
      <span className="g-name">{name}</span>
      <span className="g-count">
        {t.wordsCount(total)}{keys.length > 1 ? t.levelsSuffix(keys.length) : ""}
      </span>
      {known > 0 && (
        <>
          <span className="g-progress"><span style={{ width: `${pct}%` }} /></span>
          <span className="g-mastered">
            {t.knownCount(known)}{keys.length > 1 && levelsDone ? t.doneSuffix(levelsDone, keys.length) : ""}
          </span>
        </>
      )}
    </button>
  );
}

export default function GroupsScreen({ onOpenGroup }: Props) {
  const { recent } = useApp();
  const t = useT();
  const [query, setQuery] = useState("");
  const matches = useMemo(() => searchWords(query), [query]);
  const searching = query.trim().length > 0;
  const validRecent = recent.filter(r => wordsForKey(r.key).length > 0);

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
            <WordRow
              key={w.key + w.word}
              w={w}
              showGroup
              showStatus
              onOpenGroup={(name, key) => onOpenGroup(name, key)}
            />
          ))}
          {matches.length > 40 && (
            <p className="muted">{t.moreResults(matches.length - 40)}</p>
          )}
        </div>
      ) : (
        <>
          {validRecent.length > 0 && (
            <div className="group-section">
              <h2>{t.recentlyStudied}</h2>
              <div className="recent-list">
                {validRecent.map(r => (
                  <button
                    key={r.key}
                    className="recent-chip"
                    onClick={() => onOpenGroup(keyParts(r.key).name, r.key)}
                  >
                    {keyLabel(r.key)} <span>{timeAgoText(r.ts, t)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="group-section">
            <h2>{t.byLevel}</h2>
            <div className="group-grid">
              {LEVELS.map(name => (
                <GroupCard key={name} name={name} onOpen={() => onOpenGroup(name)} />
              ))}
            </div>
          </div>
          <div className="group-section">
            <h2>{t.byTopic}</h2>
            <div className="group-grid">
              {TOPICS.map(name => (
                <GroupCard key={name} name={name} onOpen={() => onOpenGroup(name)} />
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
