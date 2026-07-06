import { useEffect, useState } from "react";
import { useApp } from "../context";
import { useT } from "../i18n";
import { api, type AdminGroup, type AdminWord } from "../lib/api";

export default function AdminScreen() {
  const { refreshContent } = useApp();
  const t = useT();
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [words, setWords] = useState<AdminWord[]>([]);
  const [newGroup, setNewGroup] = useState({ key: "", category: "topic" as "level" | "topic" });
  const [newWord, setNewWord] = useState({ word: "", pos: "", def: "", example: "" });

  const loadGroups = () => api.adminGroups().then(setGroups).catch(() => setGroups([]));
  useEffect(() => { loadGroups(); }, []);

  const openGroup = async (key: string) => {
    setSelected(key);
    setWords(await api.adminWords(key));
  };

  const afterChange = async () => {
    await refreshContent();
    await loadGroups();
    if (selected) setWords(await api.adminWords(selected));
  };

  const addGroup = async () => {
    if (!newGroup.key.trim()) return;
    await api.adminCreateGroup(newGroup.key.trim(), newGroup.category);
    setNewGroup({ key: "", category: "topic" });
    await afterChange();
  };

  const deleteGroup = async (key: string) => {
    if (!confirm(t.adminDeleteGroupConfirm(key))) return;
    await api.adminDeleteGroup(key);
    if (selected === key) { setSelected(null); setWords([]); }
    await afterChange();
  };

  const addWord = async () => {
    if (!selected || !newWord.word.trim()) return;
    await api.adminCreateWord({ groupKey: selected, ...newWord });
    setNewWord({ word: "", pos: "", def: "", example: "" });
    await afterChange();
  };

  const saveWord = async (w: AdminWord) => {
    await api.adminUpdateWord(w.id, { word: w.word, pos: w.pos, def: w.def, example: w.example });
    await afterChange();
  };

  const deleteWord = async (w: AdminWord) => {
    if (!confirm(t.adminDeleteWordConfirm(w.word))) return;
    await api.adminDeleteWord(w.id);
    await afterChange();
  };

  const patchWord = (id: string, field: keyof AdminWord, value: string) =>
    setWords(ws => ws.map(w => (w.id === id ? { ...w, [field]: value } : w)));

  return (
    <section>
      <h2 className="screen-title">{t.adminTitle}</h2>
      <div className="admin-layout">
        <div className="admin-groups">
          <h3 className="settings-group">{t.adminGroupsHead}</h3>
          <div className="admin-group-list">
            {groups.map(g => (
              <div
                key={g.key}
                className={"admin-group-row" + (selected === g.key ? " active" : "")}
                onClick={() => openGroup(g.key)}
              >
                <span className="admin-group-key">{g.key}</span>
                <span className="muted">{g._count.words}</span>
                <button className="admin-x" onClick={e => { e.stopPropagation(); deleteGroup(g.key); }} title={t.adminDelete}>✕</button>
              </div>
            ))}
          </div>
          <div className="admin-add-group">
            <input
              placeholder={t.adminNewGroupKey}
              value={newGroup.key}
              onChange={e => setNewGroup({ ...newGroup, key: e.target.value })}
            />
            <select value={newGroup.category} onChange={e => setNewGroup({ ...newGroup, category: e.target.value as "level" | "topic" })}>
              <option value="topic">{t.adminTopic}</option>
              <option value="level">{t.adminLevel}</option>
            </select>
            <button className="btn" onClick={addGroup}>{t.adminAddGroup}</button>
          </div>
        </div>

        <div className="admin-words">
          {!selected ? (
            <p className="muted">{t.adminSelectGroup}</p>
          ) : (
            <>
              <h3 className="settings-group">{t.adminWordsHead(selected)}</h3>
              <div className="admin-add-word">
                <input placeholder={t.adminWord} value={newWord.word} onChange={e => setNewWord({ ...newWord, word: e.target.value })} />
                <input placeholder={t.adminPos} value={newWord.pos} onChange={e => setNewWord({ ...newWord, pos: e.target.value })} />
                <input placeholder={t.adminDef} value={newWord.def} onChange={e => setNewWord({ ...newWord, def: e.target.value })} />
                <input placeholder={t.adminExample} value={newWord.example} onChange={e => setNewWord({ ...newWord, example: e.target.value })} />
                <button className="btn primary" onClick={addWord}>{t.adminAddWord}</button>
              </div>
              <div className="admin-word-list">
                {words.map(w => (
                  <div className="admin-word-card" key={w.id}>
                    <input value={w.word} onChange={e => patchWord(w.id, "word", e.target.value)} />
                    <input value={w.pos} onChange={e => patchWord(w.id, "pos", e.target.value)} />
                    <input value={w.def} onChange={e => patchWord(w.id, "def", e.target.value)} />
                    <input value={w.example} onChange={e => patchWord(w.id, "example", e.target.value)} />
                    <div className="admin-word-actions">
                      <button className="btn" onClick={() => saveWord(w)}>{t.adminSave}</button>
                      <button className="btn danger" onClick={() => deleteWord(w)}>{t.adminDelete}</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
