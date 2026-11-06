import { useState } from "react";
import { useApp } from "../context";
import { useT } from "../i18n";
import { BASICS } from "../lib/basics";
import { GRAMMAR } from "../data/grammar";
import { isStepDone, type PathState, type Step } from "../lib/roadmap";
import BasicsRule, { say } from "./BasicsRule";
import Emoji from "./Emoji";

// Notes: the rules of every topic already passed on the path — a cheat sheet
// to look back at (no exercises). Tap a topic to open it.
export default function NotesScreen({ steps, path, onBack }: { steps: Step[]; path: PathState; onBack: () => void }) {
  const { progress } = useApp();
  const t = useT();
  const [open, setOpen] = useState<string | null>(null);

  const done = steps.filter(s => (s.kind === "basics" || s.kind === "grammar") && isStepDone(s, progress, path));
  const basics = done.filter(s => s.kind === "basics").map(s => BASICS.find(l => l.id === s.lesson)).filter(Boolean);
  const grammarItems = GRAMMAR.flatMap(sec => sec.items);
  const grammar = done.filter(s => s.kind === "grammar").map(s => grammarItems.find(i => i.title === s.grammar)).filter(Boolean);
  const toggle = (id: string) => setOpen(o => (o === id ? null : id));

  return (
    <section className="notes">
      <button className="back-btn" onClick={onBack}>{t.back}</button>
      <div className="notes-hero">
        <Emoji char="📝" className="notes-icon" />
        <div>
          <h2 className="screen-title">{t.notesTitle}</h2>
          <p className="muted">{done.length ? t.notesSub(done.length) : t.notesEmpty}</p>
        </div>
      </div>

      {basics.length > 0 && <h3 className="notes-section">{t.basicsName}</h3>}
      {basics.map(l => l && (
        <div key={l.id} className={"notes-card" + (open === l.id ? " open" : "")}>
          <button className="notes-head" onClick={() => toggle(l.id)}>
            <Emoji char={l.emoji} className="notes-emoji" />
            <span>{l.title}</span>
            <span className="notes-chev">›</span>
          </button>
          {open === l.id && <div className="notes-body"><BasicsRule lesson={l} compact /></div>}
        </div>
      ))}

      {grammar.length > 0 && <h3 className="notes-section">{t.tabGrammar}</h3>}
      {grammar.map(g => g && (
        <div key={g.title} className={"notes-card" + (open === g.title ? " open" : "")}>
          <button className="notes-head" onClick={() => toggle(g.title)}>
            <Emoji char="💡" className="notes-emoji" />
            <span>{g.title}</span>
            <span className="notes-chev">›</span>
          </button>
          {open === g.title && (
            <div className="notes-body">
              <p className="gram-formula">{g.formula}</p>
              <ul className="gram-use">{g.use.map(u => <li key={u}>{u}</li>)}</ul>
              {g.signals && <p className="gram-signals">{t.signalWords}{g.signals.map(s => <span key={s}>{s}</span>)}</p>}
              {g.examples.map(([en, note]) => (
                <button key={en} className="basics-example" onClick={() => say(en)}>
                  <Emoji char="🔊" className="basics-sound" />
                  <span><b>{en}</b>{note && <small>{note}</small>}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
