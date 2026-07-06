import { WORD_GROUPS, TOPIC_LEVEL2 } from "../data/words";
import type { KeyedWord, Progress, Word } from "../types";

export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
export const TOPICS = Object.keys(WORD_GROUPS).filter(g => !LEVELS.includes(g));

// Group keys: CEFR levels use their name ("B1"); topic levels use
// "Topic" for level 1 and "Topic@2" for level 2.
export function keyParts(key: string) {
  const [name, lvl] = key.split("@");
  return { name, level: lvl ? parseInt(lvl, 10) : 1 };
}

export function keyLabel(key: string) {
  const { name, level } = keyParts(key);
  if (LEVELS.includes(name)) return name;
  return `${name} · Level ${level}`;
}

export function wordsForKey(key: string): Word[] {
  const { name, level } = keyParts(key);
  if (level === 1) return WORD_GROUPS[name] || [];
  return TOPIC_LEVEL2[name] || [];
}

export function topicLevelKeys(name: string) {
  const keys = [name];
  if (TOPIC_LEVEL2[name]) keys.push(name + "@2");
  return keys;
}

export function allKeys() {
  const keys = [...LEVELS];
  TOPICS.forEach(t => keys.push(...topicLevelKeys(t)));
  return keys;
}

export const POS_CATS: [string, string][] = [
  ["verb", "Verbs"],
  ["noun", "Nouns"],
  ["adj", "Adjectives"],
  ["adverb", "Adverbs"],
];

export function matchesPos(w: Word, cat: string) {
  return cat === "all" || w.pos.split("/").map(s => s.trim()).includes(cat);
}

export function filteredLevelWords(key: string, posFilter: string): Word[] {
  const words = wordsForKey(key);
  if (!LEVELS.includes(key)) return words;
  return words.filter(w => matchesPos(w, posFilter));
}

export function knownSet(p: Progress, key: string) {
  return new Set(p.known[key] || []);
}
export function learningSet(p: Progress, key: string) {
  return new Set(p.learning[key] || []);
}

export function isKeyComplete(p: Progress, key: string) {
  return knownSet(p, key).size >= wordsForKey(key).length;
}

export function isKeyUnlocked(p: Progress, key: string) {
  const { name, level } = keyParts(key);
  if (level === 1) return true;
  const prevKey = level === 2 ? name : `${name}@${level - 1}`;
  return isKeyComplete(p, prevKey);
}

export function nextLevelKey(key: string): string | null {
  const { name } = keyParts(key);
  if (LEVELS.includes(name)) return null;
  const keys = topicLevelKeys(name);
  const idx = keys.indexOf(key);
  return idx >= 0 && idx + 1 < keys.length ? keys[idx + 1] : null;
}

export function collectWords(p: Progress, kind: "known" | "learning"): KeyedWord[] {
  const out: KeyedWord[] = [];
  allKeys().forEach(key => {
    const set = kind === "known" ? knownSet(p, key) : learningSet(p, key);
    wordsForKey(key).forEach(w => {
      if (set.has(w.word)) out.push({ ...w, key });
    });
  });
  return out;
}

export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

let searchIndex: KeyedWord[] | null = null;
export function buildSearchIndex(): KeyedWord[] {
  if (!searchIndex) {
    searchIndex = [];
    allKeys().forEach(key =>
      wordsForKey(key).forEach(w => searchIndex!.push({ ...w, key })));
  }
  return searchIndex;
}

export function searchWords(q: string): KeyedWord[] {
  const query = q.trim().toLowerCase();
  if (!query) return [];
  const matches = buildSearchIndex().filter(w =>
    w.word.toLowerCase().includes(query) || w.def.toLowerCase().includes(query));
  matches.sort((a, b) => {
    const aw = a.word.toLowerCase().startsWith(query);
    const bw = b.word.toLowerCase().startsWith(query);
    if (aw !== bw) return aw ? -1 : 1;
    return a.word.localeCompare(b.word);
  });
  return matches;
}
