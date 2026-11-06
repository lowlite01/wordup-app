import { Fragment, useEffect, useRef } from "react";
import { useApp } from "../context";
import { useT } from "../i18n";
import { LEVEL_COLORS, LEVEL_NAMES, knownCount, wordsForKey } from "../lib/groups";
import { STEP_REWARD, isStepDone, type PathState, type Step } from "../lib/roadmap";
import Emoji from "./Emoji";

interface Props {
  steps: Step[];
  path: PathState;
  current: number;            // index of the current step
  compact?: boolean;          // home: only a window around the current step
  onOpen: (step: Step) => void;
}

// Horizontal offsets that make the column of nodes snake left and right.
const WAVE = [0, 46, 72, 46, 0, -46, -72, -46];
// Characters / props drawn beside the path, on the side away from the bend.
const DECOS = ["🦉", "📚", "🌍", "🎧", "✏️", "🚀", "☕", "🌱", "🎒", "⛰️", "🍎", "🎶"];

// The learning path: a winding column of round steps, Duolingo style.
export default function RoadmapPath({ steps, path, current, compact, onOpen }: Props) {
  const { progress } = useApp();
  const t = useT();
  const currentRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!compact) currentRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [compact]);

  const from = compact ? Math.max(0, current - 2) : 0;
  const to = compact ? Math.min(steps.length, current + 6) : steps.length;
  const shown = steps.slice(from, to);

  const label = (s: Step) =>
    s.kind === "words" ? t.stepWords(s.title)
    : s.kind === "grammar" ? s.title
    : s.kind === "basics" ? s.title
    : s.kind === "practice" ? t.stepPractice(s.title)
    : s.kind === "chest" ? t.stepChest
    : s.kind === "trophy" ? t.stepTrophy(s.level === "A0" ? t.basicsName : s.level)
    : s.title;

  // Unit banner: level, what it covers and how far along it is.
  const Banner = ({ level }: { level: string }) => {
    const lvlSteps = steps.filter(st => st.level === level);
    const done = lvlSteps.filter(st => isStepDone(st, progress, path)).length;
    return (
      <div className="roadmap-unit" style={{ "--lvl": LEVEL_COLORS[level] } as React.CSSProperties}>
        <div className="roadmap-unit-top">
          <span className="roadmap-unit-badge">{level === "A0" ? "★" : level}</span>
          <span className="roadmap-unit-name">{level === "A0" ? t.basicsName : LEVEL_NAMES[level]}</span>
          <span className="roadmap-unit-count">{done}/{lvlSteps.length}</span>
        </div>
        <div className="roadmap-unit-desc">{t.unitDesc(level)}</div>
        <div className="roadmap-unit-bar"><span style={{ width: `${(done / Math.max(1, lvlSteps.length)) * 100}%` }} /></div>
      </div>
    );
  };

  return (
    <div className={"roadmap" + (compact ? " compact" : "")}>
      {compact && shown[0] && <Banner level={steps[current]?.level ?? shown[0].level} />}
      {shown.map((s, k) => {
        const idx = from + k;
        const done = isStepDone(s, progress, path);
        const isCurrent = idx === current;
        const locked = !done && !isCurrent;
        const offset = WAVE[idx % WAVE.length];
        const newLevel = !compact && (idx === 0 || steps[idx - 1].level !== s.level);
        const pct = s.kind === "words" && s.key
          ? Math.round((knownCount(progress, s.key) / Math.max(1, wordsForKey(s.key).length)) * 100) : 0;
        const reward = s.kind === "chest" || s.kind === "trophy";
        // decoration on every 4th row, on the opposite side of the bend
        const deco = idx % 4 === 1 ? DECOS[Math.floor(idx / 4) % DECOS.length] : null;
        return (
          <Fragment key={s.id}>
            {newLevel && <Banner level={s.level} />}
            <div className={"roadmap-row" + (reward ? " reward" : "")} style={{ left: offset }}>
              {deco && (
                <Emoji char={deco} className={"roadmap-deco " + (offset >= 0 ? "on-left" : "on-right")} />
              )}
              {isCurrent && <div className="roadmap-start">{reward ? t.pathOpen : t.pathStart}</div>}
              <button
                ref={isCurrent ? currentRef : undefined}
                className={"roadmap-node " + s.kind + (done ? " done" : "") + (isCurrent ? " current" : "") + (locked ? " locked" : "")}
                style={{ "--lvl": LEVEL_COLORS[s.level] } as React.CSSProperties}
                onClick={() => !locked && onOpen(s)}
                disabled={locked || (reward && done)}
                title={label(s)}
              >
                {isCurrent && pct > 0 && (
                  <svg className="roadmap-ring" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="37" style={{ strokeDasharray: 232.5, strokeDashoffset: 232.5 * (1 - pct / 100) }} />
                  </svg>
                )}
                {done && !reward
                  ? <span className="roadmap-check">✓</span>
                  : <Emoji char={s.emoji} className="roadmap-emoji" />}
              </button>
              <div className="roadmap-label">
                {label(s)}
                {reward && !done && <span className="roadmap-reward">+{STEP_REWARD[s.kind]} <Emoji char="💎" /></span>}
              </div>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
