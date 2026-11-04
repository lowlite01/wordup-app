import { useApp } from "../context";
import { useT } from "../i18n";
import { knownSet } from "../lib/groups";
import { IELTS_TOPICS, ieltsKey } from "../lib/ielts";
import Emoji from "./Emoji";

type Mode = "flashcards" | "quiz" | "list";

// IELTS tab: exam-focused topic decks (English course only).
export default function IeltsScreen({ onStart }: { onStart: (key: string, mode: Mode) => void }) {
  const { progress } = useApp();
  const t = useT();
  const total = IELTS_TOPICS.reduce((n, x) => n + x.items.length, 0);
  const known = IELTS_TOPICS.reduce((n, x) => n + knownSet(progress, ieltsKey(x.topic)).size, 0);

  return (
    <section>
      <div className="ielts-hero">
        <Emoji char="🎓" className="ielts-hero-icon" />
        <div>
          <h2 className="screen-title">IELTS</h2>
          <p className="muted">{t.ieltsHint}</p>
          <div className="ielts-hero-stat">{t.topicCount(known, total)}</div>
        </div>
      </div>

      <div className="ielts-grid">
        {IELTS_TOPICS.map(x => {
          const key = ieltsKey(x.topic);
          const k = knownSet(progress, key).size;
          const pct = Math.round((k / x.items.length) * 100);
          return (
            <div key={x.topic} className={"topic-card ielts-card" + (pct === 100 ? " mastered" : "")}>
              <button className="ielts-card-main" onClick={() => onStart(key, "flashcards")}>
                <Emoji char={x.emoji} className="topic-emoji" />
                <span className="topic-name">{x.topic}</span>
                <span className="topic-count">{x.hint}</span>
                <span className="topic-count">{pct === 100 ? "✓ " : ""}{t.topicCount(k, x.items.length)}</span>
                <span className="topic-bar"><span style={{ width: `${pct}%` }} /></span>
              </button>
              <div className="ielts-card-actions">
                <button className="btn" onClick={() => onStart(key, "flashcards")}>{t.flashcards}</button>
                <button className="btn" onClick={() => onStart(key, "quiz")}>{t.quiz}</button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
