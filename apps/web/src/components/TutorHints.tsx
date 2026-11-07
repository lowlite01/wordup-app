import { useState } from "react";
import { useApp } from "../context";
import { useT } from "../i18n";
import { haptic } from "../lib/telegram";
import { suggestReplies, translateText, type TutorError, type TutorHint, type TutorTurn } from "../lib/tutor";
import type { LearnerProfile } from "../lib/tutorProfile";

// A tutor message with a "Translate" link under it. The translation is kept
// with the message (onTranslated) so it is not asked for twice.
export function BotMessage({ text, tr, onTranslated, onError }: {
  text: string;
  tr?: string;
  onTranslated?: (tr: string) => void;
  onError: (e: TutorError) => void;
}) {
  const { settings } = useApp();
  const t = useT();
  const [shown, setShown] = useState(false);
  const [local, setLocal] = useState<string | undefined>(tr);
  const [busy, setBusy] = useState(false);
  const translation = tr ?? local;

  const toggle = async () => {
    if (translation) { setShown(s => !s); return; }
    if (busy) return;
    setBusy(true);
    const r = await translateText(text, settings.lang);
    setBusy(false);
    if (typeof r !== "string") { haptic("error"); onError(r.error); return; }
    if (!r) return;
    setLocal(r); setShown(true); onTranslated?.(r);
  };

  return (
    <div className="tutor-bot">
      <div className="tutor-msg bot">{text}</div>
      {shown && translation && <div className="tutor-tr">{translation}</div>}
      <button className="tutor-hint-link" onClick={toggle} disabled={busy}>
        {busy ? t.tutorTranslating : shown ? t.tutorHideTr : t.tutorTranslate}
      </button>
    </div>
  );
}

// Hint (💡 by the input): what to say, how to start, useful words and a grammar
// tip — never a ready answer, so the learner still builds the sentence.
export function useHint(profile: LearnerProfile, onError: (e: TutorError) => void) {
  const { settings } = useApp();
  const [hint, setHint] = useState<TutorHint | null | undefined>(undefined); // undefined = closed
  const [busy, setBusy] = useState(false);

  const ask = async (turns: TutorTurn[], dialogue?: { id: string; done: number[] }) => {
    if (hint !== undefined) { setHint(undefined); return; }
    if (busy) return;
    setBusy(true);
    const r = await suggestReplies(turns, settings.lang, profile, dialogue);
    setBusy(false);
    if (r && "error" in r) { haptic("error"); onError(r.error); return; }
    setHint(r);
  };
  return { hint, open: hint !== undefined, busy, ask, close: () => setHint(undefined) };
}

export function HintPanel({ hint, onUse, onClose }: {
  hint: TutorHint | null;
  onUse: (piece: string) => void; // adds a piece of text to the input
  onClose: () => void;
}) {
  const t = useT();
  return (
    <div className="tutor-suggest">
      <div className="tutor-suggest-head">
        <span>💡 {t.tutorHintTitle}</span>
        <button onClick={onClose} aria-label={t.tutorClose}>✕</button>
      </div>
      {!hint ? <p className="muted">{t.tutorBusy}</p> : (
        <>
          <p className="hint-idea">{hint.idea}</p>
          {hint.start && (
            <button className="hint-start" onClick={() => onUse(hint.start)}>
              <small>{t.tutorHintStart}</small>
              <b>{hint.start}…</b>
            </button>
          )}
          {hint.words.length > 0 && (
            <div className="hint-words">
              {hint.words.map(w => (
                <button key={w.en} className="hint-word" onClick={() => onUse(w.en)}>
                  <b>{w.en}</b> <small>{w.native}</small>
                </button>
              ))}
            </div>
          )}
          {hint.grammar && <p className="hint-grammar">📘 {hint.grammar}</p>}
          <p className="hint-note">{t.tutorHintNote}</p>
        </>
      )}
    </div>
  );
}
