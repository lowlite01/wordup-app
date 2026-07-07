import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import * as Speech from "expo-speech";

// IPA transcription + real audio come from the Free Dictionary API and are
// cached on the device; browser-style TTS covers words the API doesn't know.
export interface DictEntry {
  ipa: string;
  audio: string;
}

const CACHE_KEY = "wordup-dict";
let cache: Record<string, DictEntry> = {};
let loaded = false;
const misses = new Set<string>();

async function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) cache = JSON.parse(raw);
  } catch {
    // ignore
  }
}

export function cachedEntry(word: string): DictEntry | null {
  return cache[word.toLowerCase()] || null;
}

export async function fetchDict(word: string): Promise<DictEntry | null> {
  const w = word.toLowerCase();
  await ensureLoaded();
  if (cache[w]) return cache[w];
  if (misses.has(w)) return null;
  try {
    const res = await fetch("https://api.dictionaryapi.dev/api/v2/entries/en/" + encodeURIComponent(w));
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
    cache[w] = { ipa, audio };
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache)).catch(() => {});
    return cache[w];
  } catch {
    misses.add(w);
    return null;
  }
}

function speakTTS(word: string) {
  Speech.stop();
  Speech.speak(word, { language: "en-US", rate: 0.9 });
}

export async function pronounce(word: string) {
  const d = await fetchDict(word);
  if (d && d.audio) {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: d.audio });
      sound.setOnPlaybackStatusUpdate(s => {
        if (s.isLoaded && s.didJustFinish) sound.unloadAsync().catch(() => {});
      });
      await sound.playAsync();
      return;
    } catch {
      // fall through to TTS
    }
  }
  speakTTS(word);
}

export function youglishUrl(phrase: string) {
  return "https://youglish.com/pronounce/" + encodeURIComponent(phrase) + "/english";
}
