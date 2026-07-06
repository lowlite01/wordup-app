import { useEffect, useState } from "react";

// IPA + real audio from the Free Dictionary API, cached in localStorage;
// browser TTS covers words the API doesn't know.
const DICT_CACHE_KEY = "wordup-dict-v1";

interface DictEntry {
  ipa: string;
  audio: string;
}

let dictCache: Record<string, DictEntry> = {};
try {
  dictCache = JSON.parse(localStorage.getItem(DICT_CACHE_KEY) as string) || {};
} catch {
  dictCache = {};
}
const dictMisses = new Set<string>();

export function dictEntry(word: string): DictEntry | null {
  return dictCache[word.toLowerCase()] || null;
}

export async function fetchDict(word: string): Promise<DictEntry | null> {
  const w = word.toLowerCase();
  if (dictCache[w]) return dictCache[w];
  if (dictMisses.has(w)) return null;
  try {
    const res = await fetch(
      "https://api.dictionaryapi.dev/api/v2/entries/en/" + encodeURIComponent(w));
    if (!res.ok) throw new Error("lookup failed");
    const data = await res.json();
    let ipa = "";
    let audio = "";
    for (const entry of data) {
      if (!ipa && entry.phonetic) ipa = entry.phonetic;
      for (const p of entry.phonetics || []) {
        if (!ipa && p.text) ipa = p.text;
        if (!audio && p.audio) audio = p.audio;
      }
    }
    dictCache[w] = { ipa, audio };
    localStorage.setItem(DICT_CACHE_KEY, JSON.stringify(dictCache));
    return dictCache[w];
  } catch {
    dictMisses.add(w);
    return null;
  }
}

export function speakWord(word: string) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(word);
  u.lang = "en-US";
  u.rate = 0.9;
  speechSynthesis.speak(u);
}

export async function pronounceWord(word: string) {
  const d = await fetchDict(word);
  if (d && d.audio) {
    try {
      await new Audio(d.audio).play();
      return;
    } catch {
      // fall back to TTS
    }
  }
  speakWord(word);
}

export function youglishUrl(phrase: string) {
  return "https://youglish.com/pronounce/" + encodeURIComponent(phrase) + "/english";
}

// Eagerly fetches IPA for the given word (used on flashcards).
export function useIpa(word: string): string {
  const [ipa, setIpa] = useState(() => dictEntry(word)?.ipa || "");
  useEffect(() => {
    const cached = dictEntry(word);
    setIpa(cached?.ipa || "");
    if (cached) return;
    let alive = true;
    fetchDict(word).then(d => {
      if (alive && d?.ipa) setIpa(d.ipa);
    });
    return () => { alive = false; };
  }, [word]);
  return ipa;
}
