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
  const w = word.toLowerCase().trim();
  if (!w) return null; // nothing to look up (e.g. an empty deck)
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

// ---- Text-to-speech fallback ----
// Setting lang="en-US" alone isn't enough: on a phone whose system language
// is Russian, iOS/Telegram keeps the Russian voice and reads "appetite" as
// "апетите". So we pick an English voice explicitly.
let englishVoice: SpeechSynthesisVoice | null = null;
function pickEnglishVoice() {
  if (!("speechSynthesis" in window)) return;
  const voices = speechSynthesis.getVoices();
  const en = voices.filter(v => v.lang.toLowerCase().replace("_", "-").startsWith("en"));
  englishVoice =
    en.find(v => /en-us/i.test(v.lang.replace("_", "-")) && /samantha|google us|aria|jenny|ava/i.test(v.name)) ||
    en.find(v => /en-us/i.test(v.lang.replace("_", "-"))) ||
    en.find(v => /en-gb/i.test(v.lang.replace("_", "-"))) ||
    en[0] || null;
}
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  pickEnglishVoice();
  // voices load asynchronously in most browsers
  speechSynthesis.addEventListener?.("voiceschanged", pickEnglishVoice);
}

export function speakWord(word: string) {
  if (!("speechSynthesis" in window)) return;
  if (!englishVoice) pickEnglishVoice();
  // No English voice installed (e.g. Windows with only a Russian voice):
  // better silence than reading "appetite" as "апетите".
  if (!englishVoice && speechSynthesis.getVoices().length > 0) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(word);
  u.lang = englishVoice?.lang || "en-US";
  if (englishVoice) u.voice = englishVoice;
  u.rate = 0.9;
  speechSynthesis.speak(u);
}

// Audio elements kept per URL, so a recording downloaded once (or preloaded
// while the card is on screen) starts instantly on tap.
const audioCache = new Map<string, HTMLAudioElement>();
const fullUrl = (url: string) => (url.startsWith("//") ? "https:" + url : url);
function audioFor(url: string): HTMLAudioElement {
  const u = fullUrl(url);
  let a = audioCache.get(u);
  if (!a) {
    a = new Audio(u);
    a.preload = "auto";
    audioCache.set(u, a);
  }
  return a;
}
function playAudio(url: string): Promise<void> {
  const a = audioFor(url);
  a.currentTime = 0;
  return a.play();
}

/** Look the word up and start downloading its recording in the background. */
export function preloadWord(word: string) {
  if (!word) return;
  fetchDict(word).then(d => { if (d?.audio) audioFor(d.audio).load(); });
}

// Plays the real recording when we have one, otherwise English TTS.
// iPhones only allow sound that starts *immediately* inside the tap, so when
// the recording is already cached (flashcards pre-fetch it) we start it
// right away without awaiting anything first.
export function pronounceWord(word: string): Promise<void> {
  const cached = dictEntry(word);
  if (cached) {
    if (cached.audio) return playAudio(cached.audio).catch(() => speakWord(word));
    speakWord(word);
    return Promise.resolve();
  }
  // Not looked up yet.
  if (IS_IOS) {
    // iOS: sound must start inside the tap, so speak now and cache the
    // recording for next time.
    speakWord(word);
    return fetchDict(word).then(() => undefined);
  }
  // Desktop/Android may start audio after a short wait: prefer the real
  // recording, TTS only if there is none.
  return fetchDict(word).then(d =>
    d?.audio ? playAudio(d.audio).catch(() => speakWord(word)) : speakWord(word));
}

const IS_IOS = typeof navigator !== "undefined" &&
  (/iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

export function youglishUrl(phrase: string) {
  return "https://youglish.com/pronounce/" + encodeURIComponent(phrase) + "/english";
}

// Eagerly fetches IPA for the given word (used on flashcards).
export function useIpa(word: string): string {
  const [ipa, setIpa] = useState(() => dictEntry(word)?.ipa || "");
  useEffect(() => {
    const cached = dictEntry(word);
    setIpa(cached?.ipa || "");
    preloadWord(word); // also downloads the recording so the first tap is instant
    if (cached) return;
    let alive = true;
    fetchDict(word).then(d => {
      if (alive && d?.ipa) setIpa(d.ipa);
    });
    return () => { alive = false; };
  }, [word]);
  return ipa;
}
