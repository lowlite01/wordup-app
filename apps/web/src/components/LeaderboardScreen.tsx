import { useEffect, useState } from "react";
import { useT } from "../i18n";
import { pushState } from "../lib/cloudSync";
import { telegramInitData } from "../lib/telegram";
import Emoji from "./Emoji";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

interface Row { rank: number; name: string; photoUrl: string | null; words: number; streak: number; me: boolean }
interface Board { top: Row[]; me: { rank: number | null; words: number; streak: number }; total: number }

const MEDALS = ["🥇", "🥈", "🥉"];

// Telegram leaderboard: who has learned the most words (from cloud saves).
export default function LeaderboardScreen({ onBack }: { onBack: () => void }) {
  const t = useT();
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await pushState(); // count today's words too
        const res = await fetch(`${API_URL}/tg/leaderboard`, { headers: { Authorization: `tma ${telegramInitData}` } });
        if (!res.ok) throw new Error(String(res.status));
        setBoard(await res.json());
      } catch {
        setError(true);
      }
    })();
  }, []);

  return (
    <section className="lb">
      <button className="back-btn" onClick={onBack}>{t.back}</button>
      <div className="lb-hero">
        <Emoji char="🏆" className="lb-cup" />
        <h2>{t.lbTitle}</h2>
        <p className="muted">{t.lbSub}</p>
      </div>

      {error && <p className="muted">{t.lbError}</p>}
      {!board && !error && <div className="lb-loading">…</div>}

      {board && (
        <>
          <div className="lb-me">
            {board.me.rank
              ? <><b>{t.lbYourPlace(board.me.rank, board.total)}</b><span>{t.lbWords(board.me.words)}</span></>
              : <span>{t.lbNotYet}</span>}
          </div>
          {board.top.length === 0 && <p className="muted">{t.lbEmpty}</p>}
          <div className="lb-list">
            {board.top.map((r, i) => (
              <div key={r.rank} className={"lb-row" + (r.me ? " me" : "")} style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}>
                <span className="lb-rank">{MEDALS[r.rank - 1] ?? r.rank}</span>
                {r.photoUrl
                  ? <img className="lb-avatar" src={r.photoUrl} alt="" referrerPolicy="no-referrer" />
                  : <span className="lb-avatar letter">{r.name[0]}</span>}
                <span className="lb-name">{r.name}{r.me ? ` · ${t.lbYou}` : ""}</span>
                {r.streak > 0 && <span className="lb-streak"><Emoji char="🔥" /> {r.streak}</span>}
                <b className="lb-words">{r.words}</b>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
