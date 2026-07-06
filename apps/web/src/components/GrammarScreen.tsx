import { useState } from "react";
import { useT } from "../i18n";
import { GRAMMAR } from "../data/grammar";

export default function GrammarScreen() {
  const t = useT();
  const [open, setOpen] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setOpen(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section>
      <h2 className="screen-title">{t.grammarTitle}</h2>
      <p className="muted">{t.grammarHint}</p>
      {GRAMMAR.map(section => (
        <div key={section.section}>
          <h3 className="gram-section">{section.section}</h3>
          {section.items.map(item => {
            const id = section.section + "|" + item.title;
            const isOpen = open.has(id);
            return (
              <div className={"gram-card" + (isOpen ? " open" : "")} key={id}>
                <button className="gram-head" onClick={() => toggle(id)}>
                  <span>{item.title}</span>
                  <span className="gram-chev">▾</span>
                </button>
                {isOpen && (
                  <div className="gram-body">
                    <p className="gram-formula">{item.formula}</p>
                    <ul className="gram-use">
                      {item.use.map(u => <li key={u}>{u}</li>)}
                    </ul>
                    {item.signals && (
                      <p className="gram-signals">
                        {t.signalWords}{item.signals.map(s => <span key={s}>{s}</span>)}
                      </p>
                    )}
                    {item.examples.map(([en, note]) => (
                      <p className="gram-example" key={en}>
                        “{en}”{note ? <span className="gram-note"> — {note}</span> : null}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </section>
  );
}
