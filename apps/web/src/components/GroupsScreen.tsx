import { useMemo, useState } from "react";
import { useApp } from "../context";
import { useT } from "../i18n";
import {
  LEVELS, LEVEL_COLORS, LEVEL_NAMES, keyLabel, keyParts, knownSet, levelAllKeys,
  searchWords, topicLevelKeys, topicsForLevel, wordOfDay, wordsForKey,
} from "../lib/groups";
import { isTopicLocked, unlockCost } from "../lib/crystals";
import { customKey, listToJson, listToText } from "../lib/customLists";
import { topicEmoji } from "../lib/topicIcons";
import { itemId, lastWeek, liveStreak, today } from "../lib/dailyPlan";
import WordRow from "./WordRow";
import ImportListModal from "./ImportListModal";

type Mode = "flashcards" | "quiz" | "list";

interface Props {
  onStart: (key: string, mode: Mode) => void;
  onStartPlan: () => void;
}

// The "Today" hero: streak, the last 7 days and the daily plan.
function TodayCard({ onStartPlan }: { onStartPlan: () => void }) {
  const { plan, streak, gamification, settings } = useApp();
  const t = useT();
  const n = liveStreak(streak);
  const total = plan.items.length;
  const done = plan.done.length;
  const pct = total ? done / total : 0;
  const newCount = plan.items.filter(i => i.kind === "new").length;
  const reviewCount = total - newCount;
  const left = plan.items.filter(i => !plan.done.includes(itemId(i.key, i.word))).length;
  const days = lastWeek();
  const locale = settings.lang === "ru" ? "ru-RU" : settings.lang === "de" ? "de-DE" : "en-US";
  const R = 34;
  const C = 2 * Math.PI * R;

  return (
    <div className={"today" + (plan.completed ? " done" : "") + (n === 0 ? " cold" : "")}>
      <div className="today-top">
        <div className="today-streak">
          <span className="today-flame" aria-hidden>🔥</span>
          <div>
            <div className="today-num">{n}</div>
            <div className="today-label">{t.streakDays(n)}</div>
          </div>
        </div>
        <div className="today-ring" aria-label={t.planProgress(done, total)}>
          <svg viewBox="0 0 80 80">
            <circle className="ring-bg" cx="40" cy="40" r={R} />
            <circle
              className="ring-fg" cx="40" cy="40" r={R}
              strokeDasharray={C} strokeDashoffset={C * (1 - pct)}
            />
          </svg>
          <span className="today-ring-text">{plan.completed ? "✓" : `${done}/${total}`}</span>
        </div>
      </div>

      <div className="week">
        {days.map(d => {
          const lit = streak.days.includes(d);
          const isToday = d === today();
          const label = new Date(d + "T12:00:00").toLocaleDateString(locale, { weekday: "short" });
          return (
            <div key={d} className={"week-day" + (lit ? " lit" : "") + (isToday ? " now" : "")}>
              <span className="week-dot">{lit ? "🔥" : ""}</span>
              <span className="week-name">{label.slice(0, 2)}</span>
            </div>
          );
        })}
      </div>

      <div className="today-plan">
        <div className="today-plan-title">{t.planTitle}</div>
        <div className="today-plan-sub">
          {total === 0 ? t.planEmptySub
            : plan.completed ? t.planDoneSub(n)
            : t.planSummary(newCount, reviewCount)}
        </div>
        {total > 0 && (
          <button className={"today-go" + (plan.completed ? " ghost" : "")} onClick={onStartPlan}>
            {plan.completed ? t.planAgain : done ? t.planContinue(left) : t.planStart}
          </button>
        )}
        {!plan.completed && n > 0 && total > 0 && <div className="today-warn">{t.planKeepStreak}</div>}
      </div>

      {gamification && (
        <div className="today-xp">
          <span>{t.levelWord} {gamification.level}</span>
          <div className="stat-track">
            <span style={{ width: `${Math.round((gamification.levelXp / gamification.levelSpan) * 100)}%` }} />
          </div>
          <span className="muted">{gamification.levelXp}/{gamification.levelSpan} XP</span>
        </div>
      )}
    </div>
  );
}

function SubRow({ groupKey, label, emoji, letter, locked, cost, onUnlock, onStart }: {
  groupKey: string; label: string; emoji?: string; letter?: string;
  locked?: boolean; cost?: number; onUnlock?: () => void;
  onStart: (key: string, mode: Mode) => void;
}) {
  const { progress } = useApp();
  const total = wordsForKey(groupKey).length;
  const known = knownSet(progress, groupKey).size;
  const pct = total ? Math.round((known / total) * 100) : 0;

  if (locked) {
    return (
      <div className="journey-sub locked">
        <button className="journey-sub-main" onClick={onUnlock}>
          <span className="journey-sub-badge">🔒</span>
          <span className="journey-sub-mid">
            <span className="journey-sub-title">{label}</span>
            <span className="journey-sub-sum">{total} words · tap to unlock</span>
          </span>
        </button>
        <span className="journey-unlock">{cost} 💎</span>
      </div>
    );
  }

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

export default function GroupsScreen({ onStart, onStartPlan }: Props) {
  const { recent, progress, crystals, unlockTopic, customLists, removeCustomList } = useApp();
  const t = useT();
  const [query, setQuery] = useState("");
  const [openLevel, setOpenLevel] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const matches = useMemo(() => searchWords(query), [query]);
  const searching = query.trim().length > 0;
  const validRecent = recent.filter(r => wordsForKey(r.key).length > 0);

  const toggle = (level: string) => setOpenLevel(l => (l === level ? null : level));
  const handleUnlock = (topic: string) => {
    if (!unlockTopic(topic)) alert(`Not enough crystals — you need ${unlockCost(topic)} 💎.`);
  };

  const downloadList = (list: (typeof customLists)[number]) => {
    const blob = new Blob([listToJson(list)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${list.name.replace(/[^\w\- ]+/g, "").trim() || "list"}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  const copyList = (list: (typeof customLists)[number]) => {
    navigator.clipboard?.writeText(listToText(list)).then(() => {
      setCopiedId(list.id);
      setTimeout(() => setCopiedId(c => (c === list.id ? null : c)), 1500);
    });
  };

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
          <TodayCard onStartPlan={onStartPlan} />

          <div className="home-row">
            {(() => {
              const wotd = wordOfDay();
              return wotd ? (
                <button className="daily-card" onClick={() => onStart(wotd.key, "flashcards")}>
                  <span className="daily-label">✦ {t.wordOfDay}</span>
                  <span className="daily-word">{wotd.word}</span>
                  <span className="daily-def">{wotd.def}</span>
                  <span className="daily-group">{keyLabel(wotd.key)} · {t.learn} ›</span>
                </button>
              ) : null;
            })()}
            <div className="crystal-card">
              <span className="crystal-big">💎</span>
              <span className="crystal-num">{crystals.crystals}</span>
              <span className="crystal-cap">{t.crystalsCap}</span>
            </div>
          </div>

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

          <div className="journey-section list-section-head">
            <span>{t.myLists}</span>
            <button className="list-import-btn" onClick={() => setShowImport(true)}>{t.importOpen}</button>
          </div>
          {customLists.length === 0 ? (
            <p className="lists-empty">{t.listsEmptyHint}</p>
          ) : (
            <div className="my-lists">
              {customLists.map(list => {
                const total = list.words.length;
                const known = knownSet(progress, customKey(list.id)).size;
                return (
                  <div className="my-list" key={list.id}>
                    <button className="my-list-main" onClick={() => onStart(customKey(list.id), "flashcards")}>
                      <span className="my-list-badge">📝</span>
                      <span className="my-list-mid">
                        <span className="my-list-name">{list.name}</span>
                        <span className="my-list-sum">{known} / {total}</span>
                      </span>
                    </button>
                    <button className="my-list-act" title={t.exportCopyText} onClick={() => copyList(list)}>
                      {copiedId === list.id ? "✓" : "⧉"}
                    </button>
                    <button className="my-list-act" title={t.exportDownload} onClick={() => downloadList(list)}>⤓</button>
                    <button
                      className="my-list-act danger"
                      title={t.deleteListTitle}
                      onClick={() => { if (confirm(t.deleteListConfirm(list.name))) removeCustomList(list.id); }}
                    >🗑</button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="journey-section">{t.yourPath}</div>
          <div className="journey-list">
            {LEVELS.map(level => {
              const allKeys = levelAllKeys(level);
              const total = allKeys.reduce((n, k) => n + wordsForKey(k).length, 0);
              if (total === 0) return null; // hide levels with no content for this course
              const coreCount = wordsForKey(level).length;
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
                      {coreCount > 0 && (
                        <SubRow groupKey={level} label="Core vocabulary" letter={level} onStart={onStart} />
                      )}
                      {topicsForLevel(level).flatMap(topicLevelKeys).map(key => {
                        const name = keyParts(key).name;
                        const locked = isTopicLocked(crystals, name);
                        return (
                          <SubRow
                            key={key}
                            groupKey={key}
                            label={keyLabel(key)}
                            emoji={topicEmoji(name)}
                            locked={locked}
                            cost={unlockCost(name)}
                            onUnlock={() => handleUnlock(name)}
                            onStart={onStart}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {showImport && (
        <ImportListModal onClose={() => setShowImport(false)} onImported={() => setShowImport(false)} />
      )}
    </section>
  );
}
