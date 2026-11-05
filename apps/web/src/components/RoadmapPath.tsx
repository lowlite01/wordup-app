import { Fragment, useEffect, useRef } from "react";
import { useApp } from "../context";
import { useT } from "../i18n";
import { LEVEL_COLORS, LEVEL_NAMES, knownCount, wordsForKey } from "../lib/groups";
import { isStepDone, type PathState, type Step } from "../lib/roadmap";
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

// The learning path: a winding column of round steps.
export default function RoadmapPath({ steps, path, current, compact, onOpen }: Props) {
  const { progress } = useApp();
  const t = useT();
  const currentRef = useRef<HTMLButtonElement>(null);

  // full path: scroll the current step into view
  useEffect(() => {
    if (!compact) currentRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [compact]);

  const from = compact ? Math.max(0, current - 2) : 0;
  const to = compact ? Math.min(steps.length, current + 5) : steps.length;
  const shown = steps.slice(from, to);

  const label = (s: Step) =>
    s.kind === "words" ? t.stepWords(s.title)
    : s.kind === "grammar" ? s.title
    : t.stepSentences;

  return (
    <div className={"roadmap" + (compact ? " compact" : "")}>
      {shown.map((s, k) => {
        const idx = from + k;
        const done = isStepDone(s, progress, path);
        const isCurrent = idx === current;
        const locked = !done && !isCurrent;
        const offset = WAVE[idx % WAVE.length];
        const newLevel = !compact && (idx === 0 || steps[idx - 1].level !== s.level);
        const pct = s.kind === "words" && s.key
          ? Math.round((knownCount(progress, s.key) / Math.max(1, wordsForKey(s.key).length)) * 100) : 0;
        return (
          <Fragment key={s.id}>
            {newLevel && (
              <div className="roadmap-level" style={{ "--lvl": LEVEL_COLORS[s.level] } as React.CSSProperties}>
                <span>{s.level}</span> {LEVEL_NAMES[s.level]}
              </div>
            )}
            <div className="roadmap-row" style={{ left: offset }}>
              {isCurrent && <div className="roadmap-start">{t.pathStart}</div>}
              <button
                ref={isCurrent ? currentRef : undefined}
                className={"roadmap-node " + s.kind + (done ? " done" : "") + (isCurrent ? " current" : "") + (locked ? " locked" : "")}
                style={{ "--lvl": LEVEL_COLORS[s.level] } as React.CSSProperties}
                onClick={() => !locked && onOpen(s)}
                disabled={locked}
                title={label(s)}
              >
                {isCurrent && pct > 0 && (
                  <svg className="roadmap-ring" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="37" style={{ strokeDasharray: 232.5, strokeDashoffset: 232.5 * (1 - pct / 100) }} />
                  </svg>
                )}
                {done ? <span className="roadmap-check">✓</span> : <Emoji char={s.emoji} className="roadmap-emoji" />}
              </button>
              <div className="roadmap-label">{label(s)}</div>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
