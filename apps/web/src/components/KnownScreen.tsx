import { useMemo, useState } from "react";
import { useApp } from "../context";
import { useT } from "../i18n";
import { collectWords, keyLabel, keyParts } from "../lib/groups";

export default function KnownScreen() {
  const { progress, openContext } = useApp();
  const t = useT();
  const [filter, setFilter] = useState("all");
  const all = useMemo(() => collectWords(progress, "known"), [progress]);

  const names: string[] = [];
  all.forEach(w => {
    const n = keyParts(w.key).name;
    if (!names.includes(n)) names.push(n);
  });
  const active = filter !== "all" && !names.includes(filter) ? "all" : filter;
  const words = active === "all" ? all : all.filter(w => keyParts(w.key).name === active);

  return (
    <section>
      <h2 className="screen-title">{t.knownTitle}</h2>
      {names.length > 0 && (
        <div className="level-chips">
          {[["all", t.allCount(all.length)] as [string, string],
            ...names.map(n =>
              [n, `${n} (${all.filter(w => keyParts(w.key).name === n).length})`] as [string, string])
          ].map(([value, label]) => (
            <button
              key={value}
              className={"level-chip" + (active === value ? " active" : "")}
              onClick={() => setFilter(value)}
            >{label}</button>
          ))}
        </div>
      )}
      <p className="muted">
        {all.length === 0
          ? t.knownEmpty
          : active === "all"
            ? t.knownSummaryAll(all.length)
            : t.knownSummaryGroup(words.length, active)}
      </p>
      <div className="word-table">
        {words.map(w => (
          <div className="word-row compact" key={w.key + w.word}>
            <div className="w-top">
              <span
                className="w-word w-clickable"
                title={t.ctxTooltip}
                onClick={() => openContext(w)}
              >{w.word}</span>
              <span className="w-dash">—</span>
              <span className="w-def-inline">{w.def}</span>
              <span className="w-group-tag">{keyLabel(w.key)}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
