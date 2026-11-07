import { useEffect, useRef, useState } from "react";
import { useApp } from "../context";
import { useT } from "../i18n";
import { BOT_LINK } from "../lib/pro";
import { askConfirm, haptic, isTelegram, openTelegramLink } from "../lib/telegram";
import { askTutor, fetchQuota, loadChat, saveChat, type TutorError, type TutorQuota, type TutorTurn } from "../lib/tutor";
import { startersFor, type LearnerProfile } from "../lib/tutorProfile";
import Emoji from "./Emoji";
import TutorDialogues from "./TutorDialogues";
import { BotMessage, HintPanel, useHint } from "./TutorHints";

// Tutor chat: write in English, get corrections and explanations (WordUp Pro).
export default function TutorScreen({ profile, onBack, onPro }: { profile: LearnerProfile; onBack: () => void; onPro: () => void }) {
  const { isPro, settings } = useApp();
  const t = useT();
  const [turns, setTurns] = useState<TutorTurn[]>(loadChat);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [quota, setQuota] = useState<TutorQuota | null>(null);
  const [mode, setMode] = useState<"dialogues" | "chat">(() => (loadChat().length ? "chat" : "dialogues"));
  const endRef = useRef<HTMLDivElement>(null);
  const hintError = (e: TutorError) => {
    if (e === "pro") { onPro(); return; }
    setNote(e === "limit" ? t.tutorHintLimit : e === "network" ? t.tutorOffline : t.tutorBusy);
  };
  const hints = useHint(profile, hintError);

  useEffect(() => { if (isTelegram && isPro) fetchQuota().then(setQuota); }, [isPro]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [turns, busy]);

  const send = async (raw: string) => {
    const msg = raw.trim().slice(0, 2000);
    if (!msg || busy) return;
    const next: TutorTurn[] = [...turns, { role: "user", text: msg }];
    setTurns(next); saveChat(next); setText(""); setNote(null); setBusy(true); hints.close();
    const r = await askTutor(next, settings.lang, profile);
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

  const tabs = (
    <div className="tutor-tabs">
      <button className={mode === "dialogues" ? "on" : ""} onClick={() => setMode("dialogues")}>{t.dlgTab}</button>
      <button className={mode === "chat" ? "on" : ""} onClick={() => setMode("chat")}>{t.tutorChatTab}</button>
    </div>
  );

  if (mode === "dialogues") {
    return (
      <section className="tutor">
        <button className="back-btn" onClick={onBack}>{t.back}</button>
        {hero}
        {tabs}
        <TutorDialogues profile={profile} quota={quota} setQuota={setQuota} onPro={onPro} />
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
      {tabs}

      <div className="tutor-chat">
        {turns.length === 0 && (
          <div className="tutor-starters">
            <p className="muted">{t.tutorStartHint}</p>
            {startersFor(profile, settings.lang === "ru").map(s => (
              <button key={s.text} className="tutor-starter" disabled={busy || out} onClick={() => send(s.text)}>
                <b>{s.label}</b>
                <small>{s.text}</small>
              </button>
            ))}
          </div>
        )}
        {turns.map((m, i) => m.role === "user"
          ? <div key={i} className="tutor-msg me">{m.text}</div>
          : (
            <BotMessage
              key={i}
              text={m.text}
              tr={m.tr}
              onError={hintError}
              onTranslated={tr => {
                const next = turns.map((x, j) => (j === i ? { ...x, tr } : x));
                setTurns(next); saveChat(next);
              }}
            />
          ))}
        {busy && <div className="tutor-msg bot typing"><span /><span /><span /></div>}
        {note && <p className="tutor-note">{note}</p>}
        <div ref={endRef} />
      </div>

      {hints.open && <HintPanel hint={hints.hint ?? null} onUse={(piece: string) => setText(cur => (cur.trim() ? cur.replace(/\s*$/, " ") + piece : piece + " "))} onClose={hints.close} />}
      <form className="tutor-input" onSubmit={e => { e.preventDefault(); send(text); }}>
        <button
          type="button"
          className={"tutor-lamp" + (hints.open ? " on" : "")}
          disabled={hints.busy || out}
          onClick={() => hints.ask(turns)}
          aria-label={t.tutorHintTitle}
        >{hints.busy ? "…" : "💡"}</button>
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
