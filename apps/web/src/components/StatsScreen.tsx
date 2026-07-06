import { useApp } from "../context";
import { useT } from "../i18n";

export default function StatsScreen() {
  const { stats, clearStats } = useApp();
  const t = useT();
  const entries = Object.entries(stats)
    .filter(([, s]) => s.wrong > 0)
    .sort((a, b) => b[1].wrong - a[1].wrong || a[1].right - b[1].right);

  return (
    <section>
      <h2 className="screen-title">{t.statsTitle}</h2>
      <p className="muted">{entries.length ? t.statsSummary : t.statsEmpty}</p>
      <div className="word-table">
        {entries.map(([word, s]) => {
          const total = s.right + s.wrong;
          const confused = Object.entries(s.confused)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([w, n]) => `«${w}»${n > 1 ? ` ×${n}` : ""}`)
            .join(", ");
          return (
            <div className="word-row" key={word}>
              <div className="w-top">
                <span className="w-word">{word}</span>
                <span className="stat-wrong">✗ {s.wrong}</span>
                <span className="stat-right">✓ {s.right}</span>
                <span className="w-group-tag">{t.pctCorrect(Math.round((s.right / total) * 100))}</span>
              </div>
              {confused && <div className="w-def muted">{t.pickedInstead(confused)}</div>}
            </div>
          );
        })}
      </div>
      {entries.length > 0 && (
        <button
          className="reset-btn"
          onClick={() => {
            if (confirm(t.clearStatsConfirm)) clearStats();
          }}
        >{t.clearStats}</button>
      )}
    </section>
  );
}
