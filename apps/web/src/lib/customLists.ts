import type { Word } from "../types";

// User-created word lists, stored on-device. A list studies exactly like a
// built-in group: it gets a "list:<id>" key that wordsForKey()/keyLabel()
// understand, so flashcards, quiz and the word list all work unchanged.
export interface CustomList {
  id: string;
  name: string;
  words: Word[];
  createdAt: number;
}

const KEY = "wordup-custom-lists-v1";
export const LIST_PREFIX = "list:";

let lists: CustomList[] = load();

function load(): CustomList[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) as string);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function persist() {
  localStorage.setItem(KEY, JSON.stringify(lists));
}
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function getCustomLists(): CustomList[] {
  return lists;
}
export function isCustomKey(key: string): boolean {
  return key.startsWith(LIST_PREFIX);
}
export function customKey(id: string): string {
  return LIST_PREFIX + id;
}
function byKey(key: string): CustomList | undefined {
  return lists.find(l => l.id === key.slice(LIST_PREFIX.length));
}
export function customWordsForKey(key: string): Word[] {
  return byKey(key)?.words ?? [];
}
export function customLabelForKey(key: string): string {
  return byKey(key)?.name ?? "List";
}
export function customListKeys(): string[] {
  return lists.map(l => customKey(l.id));
}

export function addCustomList(name: string, words: Word[]): CustomList {
  const list: CustomList = {
    id: genId(),
    name: name.trim() || "My list",
    words,
    createdAt: Date.now(),
  };
  lists = [list, ...lists];
  persist();
  return list;
}
export function deleteCustomList(id: string) {
  lists = lists.filter(l => l.id !== id);
  persist();
}
export function renameCustomList(id: string, name: string) {
  const n = name.trim();
  if (!n) return;
  lists = lists.map(l => (l.id === id ? { ...l, name: n } : l));
  persist();
}

// ---- Import parsing ----------------------------------------------------
// Accepts either a JSON array of objects, or one word per line separated by
// tab / | / — / – / -> / → / - / ; / , with an optional example as a 3rd field.
const SEPARATORS = ["\t", "|", " — ", " – ", " -> ", " → ", " - ", ";", ",", " = ", ":"];

function pick(o: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function normalizeObj(o: unknown): Word | null {
  if (!o || typeof o !== "object") return null;
  const r = o as Record<string, unknown>;
  const word = pick(r, ["word", "term", "front", "de", "german", "original"]);
  if (!word) return null;
  return {
    word,
    pos: pick(r, ["pos", "partOfSpeech", "type"]),
    def: pick(r, ["def", "definition", "translation", "meaning", "back", "en", "english", "ru"]),
    example: pick(r, ["example", "sentence", "sample", "usage"]),
  };
}

function parseLine(raw: string): Word | null {
  let s = raw.trim();
  if (!s || s.startsWith("#") || s.startsWith("//")) return null;
  // Strip a leading bullet or "1." / "1)" numbering.
  s = s.replace(/^[-*•]\s+/, "").replace(/^\d+[.)]\s+/, "").trim();
  if (!s) return null;
  for (const sep of SEPARATORS) {
    const i = s.indexOf(sep);
    if (i > 0) {
      const parts = s.split(sep).map(p => p.trim()).filter((_, idx) => idx < 3 || true);
      return { word: parts[0], pos: "", def: parts[1] || "", example: parts.slice(2).join(" ").trim() };
    }
  }
  return { word: s, pos: "", def: "", example: "" };
}

export function parseWords(raw: string): Word[] {
  const text = raw.trim();
  if (!text) return [];
  if (text[0] === "[" || text[0] === "{") {
    try {
      const data = JSON.parse(text);
      const arr = Array.isArray(data) ? data : Array.isArray((data as { words?: unknown[] }).words) ? (data as { words: unknown[] }).words : [data];
      const out = arr.map(normalizeObj).filter((w): w is Word => !!w);
      if (out.length) return out;
    } catch {
      // not valid JSON — fall through to line parsing
    }
  }
  const out: Word[] = [];
  for (const line of text.split(/\r?\n/)) {
    const w = parseLine(line);
    if (w && w.word) out.push(w);
  }
  return out;
}

// ---- Export ------------------------------------------------------------
export function listToJson(list: CustomList): string {
  return JSON.stringify(
    list.words.map(w => ({ word: w.word, pos: w.pos, def: w.def, example: w.example })),
    null,
    2,
  );
}
export function listToText(list: CustomList): string {
  return list.words
    .map(w => [w.word, w.def, w.example].filter(Boolean).join(" | "))
    .join("\n");
}
