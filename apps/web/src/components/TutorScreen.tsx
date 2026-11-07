import { useEffect, useRef, useState } from "react";
import { useApp } from "../context";
import { useT } from "../i18n";
import { BOT_LINK } from "../lib/pro";
import { askConfirm, haptic, isTelegram, openTelegramLink } from "../lib/telegram";
import { askTutor, fetchQuota, loadChat, saveChat, type TutorQuota, type TutorTurn } from "../lib/tutor";
import Emoji from "./Emoji";

// Tutor chat: write in English, get corrections and explanations (WordUp Pro).
export default function TutorScreen({ level, onBack, onPro }: { level: string | null; onBack: () => void; onPro: () => void }) {
  const { isPro, settings } = useApp();
  const t = useT();
  const [turns, setTurns] = useState<TutorTurn[]>(loadChat);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [quota, setQuota] = useState<TutorQuota | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (isTelegram && isPro) fetchQuota().then(setQuota); }, [isPro]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [turns, busy]);

  const send = async (raw: string) => {
    const msg = raw.trim().slice(0, 2000);
    if (!msg || busy) return;
    const next: TutorTurn[] = [...turns, { role: "user", text: msg }];
    setTurns(next); saveChat(next); setText(""); setNote(null); setBusy(true);
    const r = await askTutor(next, settings.lang, level);
    setBusy(false);
    if ("error" in r) {
      haptic("error");
      if (r.error === "pro") { onPro(); return; }
      setNote(r.error === "limit" ? t.tutorLimit : r.error === "network" ? t.tutorOffline : t.tutorBusy);
      if (r.error === "limit") setQuota(q => q && { ...q, left: 0 });
      return;
    }
    setQuota(q => q && { ...q, left: r.left });
    if (r.refused || !r.reply) { setNote(t.tutorRefused); return; }
    const done: TutorTurn[] = [...next, { role: "assistant", text: r.reply }];
    setTurns(done); saveChat(done); haptic("tap");
  };

  const clear = async () => {
    if (!(await askConfirm(t.tutorClearConfirm))) return;
    setTurns([]); saveChat([]); setNote(null);
  };

  const hero = (
    <div className="tutor-hero">
      <Emoji char="🦉" className="tutor-icon" />
      <div>
        <h2 className="screen-title">{t.tutorTitle}</h2>
        <p className="muted">{t.tutorSub}</p>
      </div>
    </div>
  );

  // Website or no Pro: explain and lead to the right place.
  if (!isTelegram || !isPro) {
    return (
      <section className="tutor">
        <button className="back-btn" onClick={onBack}>{t.back}</button>
        {hero}
        <div className="tutor-lock">
          <p>{isTelegram ? t.tutorProOnly : t.tutorOnlyTelegram}</p>
          <button className="today-go" onClick={() => (isTelegram ? onPro() : openTelegramLink(BOT_LINK))}>
            {isTelegram ? t.tutorGetPro : t.proOpenTelegram}
          </button>
        </div>
      </section>
    );
  }

  const out = quota !== null && quota.left <= 0;
  return (
    <section className="tutor">
      <div className="tutor-top">
        <button className="back-btn" onClick={onBack}>{t.back}</button>
        {turns.length > 0 && <button className="tutor-clear" onClick={clear}>{t.tutorClear}</button>}
      </div>
      {hero}

      <div className="tutor-chat">
        {turns.length === 0 && (
          <div className="tutor-starters">
            <p className="muted">{t.tutorStartHint}</p>
            {t.tutorStarters.map(s => (
              <button key={s} className="tutor-starter" disabled={busy || out} onClick={() => send(s)}>{s}</button>
            ))}
          </div>
        )}
        {turns.map((m, i) => (
          <div key={i} className={"tutor-msg " + (m.role === "user" ? "me" : "bot")}>{m.text}</div>
        ))}
        {busy && <div className="tutor-msg bot typing"><span /><span /><span /></div>}
        {note && <p className="tutor-note">{note}</p>}
        <div ref={endRef} />
      </div>

      <form className="tutor-input" onSubmit={e => { e.preventDefault(); send(text); }}>
        <textarea
          value={text}
          rows={1}
          maxLength={2000}
          placeholder={out ? t.tutorLimit : t.tutorPlaceholder}
          disabled={out}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(text); } }}
        />
        <button type="submit" className="tutor-send" disabled={busy || out || !text.trim()} aria-label={t.tutorSend}>➤</button>
      </form>
      {quota && <p className="tutor-quota">{t.tutorLeft(quota.left, quota.limit)}</p>}
    </section>
  );
}
