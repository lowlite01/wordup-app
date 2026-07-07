import { useMemo, useState } from "react";
import { useApp } from "../context";
import { useT } from "../i18n";
import type { LucideIcon } from "lucide-react";
import {
  LEVELS, LEVEL_COLORS, LEVEL_NAMES, TOPICS, keyLabel, keyParts, knownSet,
  searchWords, topicLevelKeys, wordsForKey,
} from "../lib/groups";
import { topicIcon } from "../lib/topicIcons";
import WordRow from "./WordRow";

type Mode = "flashcards" | "quiz" | "list";

interface Props {
  onStart: (key: string, mode: Mode) => void;
}

function JourneyRow({ groupKey, badge, Icon, badgeColor, badgeText, title, open, onToggle, onStart }: {
  groupKey: string; badge: string; Icon?: LucideIcon; badgeColor: string; badgeText: string; title: string;
  open: boolean; onToggle: () => void; onStart: (key: string, mode: Mode) => void;
}) {
  const { progress } = useApp();
  const t = useT();
  const total = wordsForKey(groupKey).length;
  const known = knownSet(progress, groupKey).size;
  const pct = total ? Math.round((known / total) * 100) : 0;

  return (
    <div className={"journey-row" + (open ? " open" : "")}>
      <button className="journey-head" onClick={onToggle}>
        <span className="journey-badge" style={{ background: badgeColor, color: badgeText }}>
          {Icon ? <Icon size={22} strokeWidth={2} /> : badge}
        </span>
        <span className="journey-mid">
          <span className="journey-title">{title}</span>
          <span className="journey-sub">{known} / {total} words{pct ? ` · ${pct}%` : ""}</span>
        </span>
        <span className="journey-chev">{open ? "▾" : "›"}</span>
      </button>
      {total > 0 && <div className="journey-track"><span style={{ width: `${pct}%` }} /></div>}
      {open && (
        <div className="journey-modes">
          <button className="btn" onClick={() => onStart(groupKey, "flashcards")}>🗂️ {t.flashcards}</button>
          <button className="btn primary" onClick={() => onStart(groupKey, "quiz")}>❓ {t.quiz}</button>
          <button className="btn" onClick={() => onStart(groupKey, "list")}>📋 {t.wordList}</button>
        </div>
      )}
    </div>
  );
}

export default function GroupsScreen({ onStart }: Props) {
  const { recent, gamification } = useApp();
  const t = useT();
  const [query, setQuery] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const matches = useMemo(() => searchWords(query), [query]);
  const searching = query.trim().length > 0;
  const validRecent = recent.filter(r => wordsForKey(r.key).length > 0);
  const topicRowKeys = TOPICS.flatMap(topicLevelKeys);

  const toggle = (key: string) => setOpenKey(k => (k === key ? null : key));

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

          <div className="journey-section">{t.byLevel}</div>
          <div className="journey-list">
            {LEVELS.map(key => (
              <JourneyRow
                key={key}
                groupKey={key}
                badge={key}
                badgeColor={LEVEL_COLORS[key] || "var(--accent)"}
                badgeText="#08120e"
                title={LEVEL_NAMES[key] || key}
                open={openKey === key}
                onToggle={() => toggle(key)}
                onStart={onStart}
              />
            ))}
          </div>

          <div className="journey-section">{t.byTopic}</div>
          <div className="journey-list">
            {topicRowKeys.map(key => (
              <JourneyRow
                key={key}
                groupKey={key}
                badge={keyParts(key).name[0]}
                Icon={topicIcon(keyParts(key).name)}
                badgeColor="var(--accent-soft)"
                badgeText="var(--accent-strong)"
                title={keyLabel(key)}
                open={openKey === key}
                onToggle={() => toggle(key)}
                onStart={onStart}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
