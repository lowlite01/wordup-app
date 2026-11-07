import { useEffect, useRef, useState } from "react";
import { useApp } from "../context";
import { useT } from "../i18n";
import { askConfirm, haptic } from "../lib/telegram";
import {
  askDialogue, cachedDialogues, fetchDialogues, loadDoneDialogues, loadRuns, markDialogueDone, saveRun,
  type DialogueInfo, type DialogueRun, type DialogueTurn, type TutorQuota,
} from "../lib/tutor";
import type { LearnerProfile } from "../lib/tutorProfile";
import Emoji from "./Emoji";

const EMPTY: DialogueRun = { turns: [], completed: [], finished: false };

// Dialogue lessons: pick a situation, then chat with the character, typing the
// answers yourself. Mistakes are corrected under each message.
export default function TutorDialogues({ profile, quota, setQuota, onPro }: {
  profile: LearnerProfile;
  quota: TutorQuota | null;
  setQuota: (f: (q: TutorQuota | null) => TutorQuota | null) => void;
  onPro: () => void;
}) {
  const { settings } = useApp();
  const t = useT();
  const [list, setList] = useState<DialogueInfo[]>(cachedDialogues);
  const [openId, setOpenId] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>(loadDoneDialogues);
  const [failed, setFailed] = useState(false);

  useEffect(() => { fetchDialogues().then(l => { if (l) setList(l); else setFailed(true); }); }, []);

  const open = list.find(d => d.id === openId);
  if (open) {
    return (
      <DialogueRunView
        d={open}
        profile={profile}
        quota={quota}
        setQuota={setQuota}
        onPro={onPro}
        onClose={() => setOpenId(null)}
        onFinished={() => { markDialogueDone(open.id); setDone(loadDoneDialogues()); }}
      />
    );
  }

  const runs = loadRuns();
  const mine = profile.level === "A0" || profile.level === "A1" ? "A1" : profile.level === "A2" ? "A2" : "B1";
  const sorted = [...list.filter(d => d.level === mine), ...list.filter(d => d.level !== mine)];
  if (!list.length) return <p className="muted tutor-note">{failed ? t.tutorOffline : t.loading}</p>;
  return (
    <div className="dlg-list">
      <p className="muted">{t.dlgHint}</p>
      {sorted.map((d, i) => {
        const run = runs[d.id];
        const isDone = done.includes(d.id);
        return (
          <button key={d.id} className={"dlg-card" + (isDone ? " done" : "")} style={{ animationDelay: `${i * 40}ms` }} onClick={() => setOpenId(d.id)}>
            <Emoji char={d.emoji} className="dlg-emoji" />
            <span className="dlg-text">
              <b>{settings.lang === "ru" ? d.title.ru : d.title.en}</b>
              <small>{d.level === mine && !isDone ? t.dlgForYou + " · " : ""}{d.level} · {isDone ? t.dlgDone : run && run.turns.length && !run.finished ? t.dlgInProgress(run.completed.length, d.tasks.length) : t.dlgTasks(d.tasks.length)}</small>
            </span>
            <span className="dlg-mark">{isDone ? "✓" : "›"}</span>
          </button>
        );
      })}
    </div>
  );
}

function DialogueRunView({ d, profile, quota, setQuota, onPro, onClose, onFinished }: {
  d: DialogueInfo;
  profile: LearnerProfile;
  quota: TutorQuota | null;
  setQuota: (f: (q: TutorQuota | null) => TutorQuota | null) => void;
  onPro: () => void;
  onClose: () => void;
  onFinished: () => void;
}) {
  const { settings } = useApp();
  const t = useT();
  const [run, setRun] = useState<DialogueRun>(() => loadRuns()[d.id] ?? EMPTY);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const ru = settings.lang === "ru";

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [run, busy]);

  const update = (r: DialogueRun) => { setRun(r); saveRun(d.id, r); };

  const send = async () => {
    const msg = text.trim().slice(0, 2000);
    if (!msg || busy || run.finished) return;
    const turns: DialogueTurn[] = [...run.turns, { role: "user", text: msg }];
    update({ ...run, turns }); setText(""); setNote(null); setBusy(true);
    const r = await askDialogue(d.id, turns, run.completed, settings.lang, profile);
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
    // the correction belongs to the learner's message it fixes
    const fixed = turns.map((m, i) => (i === turns.length - 1 ? { ...m, correction: r.correction, explanation: r.explanation } : m));
    const finished = Boolean(r.finished);
    const gained = (r.completed ?? []).length > run.completed.length;
    update({ turns: [...fixed, { role: "assistant", text: r.reply }], completed: r.completed ?? run.completed, finished });
    haptic(finished || gained ? "success" : r.correction ? "error" : "tap");
    if (finished) onFinished();
  };

  const restart = async () => {
    if (run.turns.length && !run.finished && !(await askConfirm(t.dlgRestartConfirm))) return;
    update(EMPTY); setNote(null);
  };

  const out = quota !== null && quota.left <= 0;
  return (
    <div className="dlg-run">
      <div className="tutor-top">
        <button className="back-btn" onClick={onClose}>{t.dlgAll}</button>
        {run.turns.length > 0 && <button className="tutor-clear" onClick={restart}>{t.dlgRestart}</button>}
      </div>
      <div className="dlg-head">
        <Emoji char={d.emoji} className="dlg-emoji" />
        <b>{ru ? d.title.ru : d.title.en}</b>
      </div>
      <ul className="dlg-tasks">
        {d.tasks.map((task, i) => (
          <li key={i} className={run.completed.includes(i) ? "ok" : ""}>
            <span className="dlg-check">{run.completed.includes(i) ? "✓" : i + 1}</span>
            {ru ? task.ru : task.en}
          </li>
        ))}
      </ul>

      <div className="tutor-chat">
        <div className="tutor-msg bot">{d.opener}</div>
        {run.turns.map((m, i) => (
          <div key={i} className={"dlg-turn " + (m.role === "user" ? "me" : "bot")}>
            <div className={"tutor-msg " + (m.role === "user" ? "me" : "bot")}>{m.text}</div>
            {m.correction && (
              <div className="dlg-fix">
                <span className="dlg-fix-label">{t.dlgBetter}</span>
                <b>{m.correction}</b>
                {m.explanation && <span>{m.explanation}</span>}
              </div>
            )}
          </div>
        ))}
        {busy && <div className="tutor-msg bot typing"><span /><span /><span /></div>}
        {note && <p className="tutor-note">{note}</p>}
        {run.finished && (
          <div className="dlg-finish">
            <Emoji char="🏆" className="dlg-finish-icon" />
            <b>{t.dlgFinished}</b>
            <div className="dlg-finish-btns">
              <button className="btn" onClick={() => { update(EMPTY); setNote(null); }}>{t.dlgAgain}</button>
              <button className="btn primary" onClick={onClose}>{t.dlgNext}</button>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {!run.finished && (
        <form className="tutor-input" onSubmit={e => { e.preventDefault(); send(); }}>
          <textarea
            value={text}
            rows={1}
            maxLength={2000}
            placeholder={out ? t.tutorLimit : t.dlgPlaceholder}
            disabled={out}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          />
          <button type="submit" className="tutor-send" disabled={busy || out || !text.trim()} aria-label={t.tutorSend}>➤</button>
        </form>
      )}
      {quota && <p className="tutor-quota">{t.tutorLeft(quota.left, quota.limit)}</p>}
    </div>
  );
}
