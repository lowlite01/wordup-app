import { WORD_GROUPS as STATIC_WG, TOPIC_LEVEL2 as STATIC_T2 } from "../data/words";
import type { KeyedWord, Progress, Word } from "../types";

export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

// Per-level accent colours for the journey-path badges.
export const LEVEL_COLORS: Record<string, string> = {
  A1: "#4ADE80", A2: "#2DD4BF", B1: "#3B82F6", B2: "#60A5FA", C1: "#A78BFA", C2: "#F472B6",
};
export const LEVEL_NAMES: Record<string, string> = {
  A1: "Beginner", A2: "Elementary", B1: "Intermediate",
  B2: "Upper-Intermediate", C1: "Advanced", C2: "Mastery",
};

// Which CEFR level each topic belongs to (curriculum grouping); unmapped
// topics fall back to B1 so admin-added topics still appear.
export const TOPIC_LEVEL: Record<string, string> = {
  Food: "A1", Clothes: "A1", Animals: "A1",
  City: "A2", Weather: "A2", Sports: "A2",
  Travel: "B1", School: "B1", Music: "B1",
  Health: "B2", Nature: "B2", Emotions: "B2",
  Technology: "C1", Business: "C1",
  Museum: "C2", Law: "C2",
};

export function topicsForLevel(level: string): string[] {
  return TOPICS.filter(t => (TOPIC_LEVEL[t] || "B1") === level);
}

// All study keys under a level: its own core words + its topics' keys.
export function levelAllKeys(level: string): string[] {
  const keys = [level];
  for (const t of topicsForLevel(level)) keys.push(...topicLevelKeys(t));
  return keys;
}

// Content starts as the bundled static data (instant + offline), then gets
// replaced by the server's copy via setContent() once /content loads, so
// admin edits appear in the app. TOPICS is mutated in place so existing
// imports keep pointing at the live list.
let wgData: Record<string, Word[]> = STATIC_WG;
let t2Data: Record<string, Word[]> = STATIC_T2;
export const TOPICS: string[] = Object.keys(wgData).filter(g => !LEVELS.includes(g));

export function setContent(wordGroups: Record<string, Word[]>, topicLevel2: Record<string, Word[]>) {
  wgData = wordGroups;
  t2Data = topicLevel2;
  TOPICS.length = 0;
  TOPICS.push(...Object.keys(wgData).filter(g => !LEVELS.includes(g)));
  searchIndex = null; // rebuilt lazily from the new content
}

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
  if (level === 1) return wgData[name] || [];
  return t2Data[name] || [];
}

export function topicLevelKeys(name: string) {
  const keys = [name];
  if (t2Data[name]) keys.push(name + "@2");
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
