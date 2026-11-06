import { useMemo, useState } from "react";
import { useApp } from "../context";
import { useT } from "../i18n";
import {
  LEVELS, LEVEL_COLORS, keyLabel, knownSet, searchWords, topicsForLevel, wordOfDay, wordsForKey,
} from "../lib/groups";
import { isTopicLocked, unlockCost } from "../lib/crystals";
import { customKey, listToJson, listToText } from "../lib/customLists";
import { topicEmoji } from "../lib/topicIcons";
import { itemId, lastWeek, liveStreak, today, nextMilestone } from "../lib/dailyPlan";
import WordRow from "./WordRow";
import Emoji from "./Emoji";
import { IELTS_TOPICS, ieltsKey } from "../lib/ielts";
import ImportListModal from "./ImportListModal";
import { askConfirm } from "../lib/telegram";

type Mode = "flashcards" | "quiz" | "list";

interface Props {
  onStart: (key: string, mode: Mode) => void;
  onStartPlan: () => void;
  onOpenLevels: () => void;
  onOpenIelts: () => void;
  roadmap?: React.ReactNode; // the learning-path preview shown under "Today"
}

// A topic card on a home "shelf": big emoji, name and progress. Locked
// topics show their crystal price instead and unlock on tap.
function TopicCard({ topic, level, onStart, onUnlock, label, emoji, free, tint }: {
  topic: string; level: string;
  onStart: (key: string, mode: Mode) => void;
  onUnlock: (topic: string) => void;
  label?: string; emoji?: string; free?: boolean; tint?: string; // for non-course decks (IELTS)
}) {
  const { progress, crystals } = useApp();
  const t = useT();
  const total = wordsForKey(topic).length;
  const known = knownSet(progress, topic).size;
  const locked = !free && isTopicLocked(crystals, topic);
  const pct = total ? Math.round((known / total) * 100) : 0;
  return (
    <button
      className={"topic-card" + (locked ? " locked" : "") + (pct === 100 ? " mastered" : "")}
      style={{ "--tint": tint || LEVEL_COLORS[level] } as React.CSSProperties}
      onClick={() => (locked ? onUnlock(topic) : onStart(topic, "flashcards"))}
    >
      <Emoji char={emoji || topicEmoji(topic)} className="topic-emoji" />
      <span className="topic-name">{label || keyLabel(topic)}</span>
      {locked ? (
        <span className="topic-lock"><Emoji char="🔒" /> {unlockCost(topic)} <Emoji char="💎" /></span>
      ) : (
        <>
          <span className="topic-count">{pct === 100 ? "✓ " : ""}{t.topicCount(known, total)}</span>
          <span className="topic-bar"><span style={{ width: `${pct}%` }} /></span>
        </>
      )}
    </button>
  );
}

// The "Today" hero: streak, the last 7 days and the daily plan.
function TodayCard({ onStartPlan }: { onStartPlan: () => void }) {
  const { plan, streak, gamification, settings } = useApp();
  const t = useT();
  const n = liveStreak(streak);
  const next = nextMilestone(n);
  const total = plan.items.length;
  const done = plan.done.length;
  const pct = total ? done / total : 0;
  const newCount = plan.items.filter(i => i.kind === "new").length;
  const reviewCount = total - newCount;
  const left = plan.items.filter(i => !plan.done.includes(itemId(i.key, i.word))).length;
  const days = lastWeek();
  const locale = settings.lang === "ru" ? "ru-RU" : "en-US";
  const R = 34;
  const C = 2 * Math.PI * R;

  return (
    <div className={"today" + (plan.completed ? " done" : "") + (n === 0 ? " cold" : "")}>
      <div className="today-top">
        <div className="today-streak">
          <Emoji char="🔥" className="today-flame" />
          <div>
            <div className="today-num">{n}</div>
            <div className="today-label">{t.streakDays(n)}</div>
            {next && <div className="today-next">{t.streakNext(next.days, next.reward)}</div>}
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
          const frozen = !lit && (streak.frozen ?? []).includes(d);
          const isToday = d === today();
          const label = new Date(d + "T12:00:00").toLocaleDateString(locale, { weekday: "short" });
          return (
            <div key={d} className={"week-day" + (lit ? " lit" : "") + (frozen ? " frozen" : "") + (isToday ? " now" : "")}>
              <span className="week-dot">{lit ? <Emoji char="🔥" /> : frozen ? <Emoji char="❄️" /> : ""}</span>
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

// Home screen: today's plan, word of the day, topic shelves and own lists.
// (The CEFR level staircase lives in its own "Levels" tab.)
export default function GroupsScreen({ onStart, onStartPlan, onOpenLevels, onOpenIelts, roadmap }: Props) {
  const { recent, progress, unlockTopic, customLists, removeCustomList, openPro } = useApp();
  const t = useT();
  const [query, setQuery] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const matches = useMemo(() => searchWords(query), [query]);
  const searching = query.trim().length > 0;
  const validRecent = recent.filter(r => wordsForKey(r.key).length > 0);

  const handleUnlock = (topic: string) => {
    if (!unlockTopic(topic)) askConfirm(t.notEnoughCrystalsPro(unlockCost(topic))).then(ok => { if (ok) openPro(); });
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

          {roadmap}

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

          {/* IELTS shelf */}
          {(
            <div className="shelf">
              <div className="journey-section shelf-head">
                <span>{t.shelfIelts}</span>
                <button className="shelf-more" onClick={onOpenIelts}>{t.seeAll} ›</button>
              </div>
              <div className="shelf-row">
                {IELTS_TOPICS.map(x => (
                  <TopicCard
                    key={x.topic} topic={ieltsKey(x.topic)} level="B2"
                    label={x.topic} emoji={x.emoji} free tint="#f59e0b"
                    onStart={onStart} onUnlock={handleUnlock}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Topic shelves: one row per level, friendly names instead of A1/B2 */}
          {LEVELS.map(level => {
            const topics = topicsForLevel(level).filter(tp => wordsForKey(tp).length > 0);
            if (!topics.length) return null;
            return (
              <div key={level} className="shelf">
                <div className="journey-section shelf-head">
                  <span>{t.shelfTitle(level)}</span>
                  <span className="shelf-level" style={{ color: LEVEL_COLORS[level] }}>{level}</span>
                </div>
                <div className="shelf-row">
                  {topics.map(tp => (
                    <TopicCard key={tp} topic={tp} level={level} onStart={onStart} onUnlock={handleUnlock} />
                  ))}
                </div>
              </div>
            );
          })}

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
                      <span className="my-list-badge"><Emoji char="📝" /></span>
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
                      onClick={async () => { if (await askConfirm(t.deleteListConfirm(list.name))) removeCustomList(list.id); }}
                    >🗑</button>
                  </div>
                );
              })}
            </div>
          )}

          <button className="levels-link" onClick={onOpenLevels}>
            <span className="levels-link-badges">
              {LEVELS.map(l => <span key={l} style={{ background: LEVEL_COLORS[l] }}>{l}</span>)}
            </span>
            <span className="levels-link-text">
              <b>{t.levelsTitle}</b>
              <span>{t.levelsLinkSub}</span>
            </span>
            <span className="levels-link-go">›</span>
          </button>
        </>
      )}

      {showImport && (
        <ImportListModal onClose={() => setShowImport(false)} onImported={() => setShowImport(false)} />
      )}
    </section>
  );
}
