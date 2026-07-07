import AsyncStorage from "@react-native-async-storage/async-storage";

// Per-group sets of known / still-learning words, kept on the device.
export interface Progress {
  known: Record<string, string[]>;
  learning: Record<string, string[]>;
}

const KEY = "wordup-progress";

export async function loadProgress(): Promise<Progress> {
  try {
    const s = await AsyncStorage.getItem(KEY);
    if (s) return JSON.parse(s);
  } catch {
    // ignore
  }
  return { known: {}, learning: {} };
}

export async function saveProgress(p: Progress): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}

export function setWordState(
  p: Progress,
  key: string,
  word: string,
  state: "known" | "learning" | "none",
): Progress {
  const known = new Set(p.known[key] || []);
  const learning = new Set(p.learning[key] || []);
  known.delete(word);
  learning.delete(word);
  if (state === "known") known.add(word);
  if (state === "learning") learning.add(word);
  return {
    known: { ...p.known, [key]: [...known] },
    learning: { ...p.learning, [key]: [...learning] },
  };
}

export function knownCount(p: Progress, key: string): number {
  return (p.known[key] || []).length;
}
