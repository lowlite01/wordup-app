import { useMemo, useState } from "react";
import { useApp } from "../context";
import { useT } from "../i18n";
import { parseWords } from "../lib/customLists";

interface Props {
  onClose: () => void;
  onImported: (key: string) => void;
}

// Paste (or upload) a word list, preview how many words were detected, and
// save it as a studyable custom list.
export default function ImportListModal({ onClose, onImported }: Props) {
  const { importCustomList } = useApp();
  const t = useT();
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState(false);

  const count = useMemo(() => parseWords(text).length, [text]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setText(String(reader.result || ""));
      setError(false);
      if (!name.trim()) setName(file.name.replace(/\.[^.]+$/, ""));
    };
    reader.readAsText(file);
  };

  const doImport = () => {
    const n = importCustomList(name, text);
    if (!n) { setError(true); return; }
    onImported("");
    onClose();
  };

  return (
    <div className="ctx-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ctx-modal import-modal">
        <button className="ctx-close" title={t.closeTooltip} onClick={onClose}>✕</button>
        <h3 className="import-title">{t.importListTitle}</h3>

        <input
          className="import-name"
          placeholder={t.listNamePh}
          value={name}
          onChange={e => setName(e.target.value)}
          aria-label={t.listNameLabel}
        />
        <textarea
          className="import-area"
          placeholder={t.importPastePh}
          value={text}
          rows={8}
          onChange={e => { setText(e.target.value); setError(false); }}
        />
        <p className="import-hint">{t.importFormatHint}</p>

        <label className="import-file">
          <input type="file" accept=".txt,.csv,.json,.md,.tsv,text/plain" onChange={handleFile} />
          <span>📎 {t.importFilePick}</span>
        </label>

        {error
          ? <p className="import-status err">{t.importEmpty}</p>
          : <p className={"import-status" + (count ? " ok" : "")}>{t.importPreview(count)}</p>}

        <button className="btn primary wide import-go" disabled={!count} onClick={doImport}>
          {t.importDoBtn}
        </button>
      </div>
    </div>
  );
}
