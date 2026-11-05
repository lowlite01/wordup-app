import { useState } from "react";
import { useApp } from "../context";
import { useT } from "../i18n";
import {
  LEVELS, LEVEL_COLORS, LEVEL_NAMES, keyLabel, keyParts, knownSet, levelAllKeys,
  topicLevelKeys, topicsForLevel, wordsForKey,
} from "../lib/groups";
import { isTopicLocked, unlockCost } from "../lib/crystals";
import { topicEmoji } from "../lib/topicIcons";
import Emoji from "./Emoji";
import { askConfirm } from "../lib/telegram";

type Mode = "flashcards" | "quiz" | "list";

interface Props {
  onStart: (key: string, mode: Mode) => void;
}

// One study group inside an opened level: core words or a topic.
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
          <span className="journey-sub-badge"><Emoji char="🔒" /></span>
          <span className="journey-sub-mid">
            <span className="journey-sub-title">{label}</span>
            <span className="journey-sub-sum">{total} words · tap to unlock</span>
          </span>
        </button>
        <span className="journey-unlock">{cost} <Emoji char="💎" /></span>
      </div>
    );
  }

  return (
    <div className="journey-sub">
      <button className="journey-sub-main" onClick={() => onStart(groupKey, "flashcards")}>
        <span className={"journey-sub-badge" + (emoji ? " emoji" : "")}>{emoji ? <Emoji char={emoji} /> : letter}</span>
        <span className="journey-sub-mid">
          <span className="journey-sub-title">{label}</span>
          <span className="journey-sub-sum">{known} / {total}{pct ? ` · ${pct}%` : ""}</span>
        </span>
      </button>
      <button className="journey-sub-mode" title="Quiz" onClick={() => onStart(groupKey, "quiz")}><Emoji char="❓" /></button>
      <button className="journey-sub-mode" title="Word list" onClick={() => onStart(groupKey, "list")}><Emoji char="📋" /></button>
    </div>
  );
}

// "Levels" tab: the CEFR staircase A1 → C2. Each level opens to its core
// vocabulary and the topics that belong to it.
export default function LevelsScreen({ onStart }: Props) {
  const { progress, crystals, unlockTopic, openPro } = useApp();
  const t = useT();
  const [openLevel, setOpenLevel] = useState<string | null>(null);

  const toggle = (level: string) => setOpenLevel(l => (l === level ? null : level));
  const handleUnlock = (topic: string) => {
    if (!unlockTopic(topic)) askConfirm(t.notEnoughCrystalsPro(unlockCost(topic))).then(ok => { if (ok) openPro(); });
  };

  return (
    <section>
      <h2 className="screen-title">{t.levelsTitle}</h2>
      <p className="muted">{t.levelsHint}</p>
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
                    return (
                      <SubRow
                        key={key}
                        groupKey={key}
                        label={keyLabel(key)}
                        emoji={topicEmoji(name)}
                        locked={isTopicLocked(crystals, name)}
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
    </section>
  );
}
