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

export async function fetchContent(lang: string = "en"): Promise<AppContent> {
  const res = await fetch(`${API_URL}/content?lang=${lang}`);
  if (!res.ok) throw new Error(`content ${res.status}`);
  const c: AppContent = await res.json();
  // Merge each topic's level-2 words into the single topic so the home shows
  // one entry per topic (no "Level 1 / Level 2" split).
  for (const [name, l2] of Object.entries(c.topicLevel2)) {
    c.wordGroups[name] = [...(c.wordGroups[name] || []), ...l2];
  }
  return { wordGroups: c.wordGroups, topicLevel2: {} };
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

export function topicNames(content: AppContent): string[] {
  return Object.keys(content.wordGroups).filter(k => !LEVELS.includes(k));
}

export function topicKeys(content: AppContent): string[] {
  const keys: string[] = [];
  for (const t of topicNames(content)) {
    keys.push(t);
    if (content.topicLevel2[t]) keys.push(`${t}@2`);
  }
  return keys;
}

export function topicLevelKeys(content: AppContent, name: string): string[] {
  return content.topicLevel2[name] ? [name, `${name}@2`] : [name];
}

// Which CEFR level each topic belongs to (curriculum grouping). Unmapped
// topics fall back to B1 so admin-added topics still appear.
export const TOPIC_LEVEL: Record<string, string> = {
  Food: "A1", Clothes: "A1", Animals: "A1", Colors: "A1", Family: "A1", Home: "A1",
  City: "A2", Weather: "A2", Sports: "A2",
  Travel: "B1", School: "B1", Music: "B1", Work: "B1",
  Health: "B2", Nature: "B2", Emotions: "B2", Space: "B2",
  Technology: "C1", Business: "C1",
  Museum: "C2", Law: "C2",
};

export function topicsForLevel(content: AppContent, level: string): string[] {
  return topicNames(content).filter(t => (TOPIC_LEVEL[t] || "B1") === level);
}

// All study keys under a level: the level's own core words + its topics' keys.
export function levelAllKeys(content: AppContent, level: string): string[] {
  const keys = [level];
  for (const t of topicsForLevel(content, level)) keys.push(...topicLevelKeys(content, t));
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

function dateHash(): number {
  const d = new Date();
  const s = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Deterministic "word of the day": same all day, rotates each date.
export function wordOfDay(content: AppContent): KeyedWord | null {
  const all = allWords(content);
  if (!all.length) return null;
  return all[dateHash() % all.length];
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
