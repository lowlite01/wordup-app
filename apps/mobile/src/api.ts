// Thin client to the deployed WordUp API — the phone fetches words from the
// same server the website uses, so there's no word data bundled in the app.
export const API_URL = "https://wordup-api.onrender.com/api";

export interface Word {
  word: string;
  pos: string;
  def: string;
  example: string;
}

export interface AppContent {
  wordGroups: Record<string, Word[]>;
  topicLevel2: Record<string, Word[]>;
}

export async function fetchContent(): Promise<AppContent> {
  const res = await fetch(`${API_URL}/content`);
  if (!res.ok) throw new Error(`content ${res.status}`);
  return res.json();
}

export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export function keyParts(key: string) {
  const [name, lvl] = key.split("@");
  return { name, level: lvl ? parseInt(lvl, 10) : 1 };
}

export function keyLabel(key: string) {
  const { name, level } = keyParts(key);
  if (LEVELS.includes(name)) return name;
  return level > 1 ? `${name} · ${level}` : name;
}

export function wordsForKey(content: AppContent, key: string): Word[] {
  const { name, level } = keyParts(key);
  return level === 1 ? content.wordGroups[name] || [] : content.topicLevel2[name] || [];
}

export function levelKeys(content: AppContent): string[] {
  return LEVELS.filter(l => content.wordGroups[l]);
}

export function topicKeys(content: AppContent): string[] {
  const topics = Object.keys(content.wordGroups).filter(k => !LEVELS.includes(k));
  const keys: string[] = [];
  for (const t of topics) {
    keys.push(t);
    if (content.topicLevel2[t]) keys.push(`${t}@2`);
  }
  return keys;
}

export interface KeyedWord extends Word {
  key: string;
}

export function allWords(content: AppContent): KeyedWord[] {
  const out: KeyedWord[] = [];
  for (const key of [...levelKeys(content), ...topicKeys(content)]) {
    for (const w of wordsForKey(content, key)) out.push({ ...w, key });
  }
  return out;
}

export function searchWords(content: AppContent, query: string): KeyedWord[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const matches = allWords(content).filter(
    w => w.word.toLowerCase().includes(q) || w.def.toLowerCase().includes(q),
  );
  matches.sort((a, b) => {
    const aw = a.word.toLowerCase().startsWith(q);
    const bw = b.word.toLowerCase().startsWith(q);
    if (aw !== bw) return aw ? -1 : 1;
    return a.word.localeCompare(b.word);
  });
  return matches;
}
