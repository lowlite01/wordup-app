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

// ---- Recently studied groups ----
export interface RecentEntry { key: string; ts: number; }
const RECENT_KEY = "wordup-recent";

export async function loadRecent(): Promise<RecentEntry[]> {
  try {
    const s = await AsyncStorage.getItem(RECENT_KEY);
    if (s) return JSON.parse(s);
  } catch { /* ignore */ }
  return [];
}
export function pushRecent(list: RecentEntry[], key: string): RecentEntry[] {
  const next = [{ key, ts: Date.now() }, ...list.filter(r => r.key !== key)].slice(0, 6);
  AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
  return next;
}

// ---- Quiz mistake stats ----
export interface QuizStat { right: number; wrong: number; confused: Record<string, number>; }
export type QuizStats = Record<string, QuizStat>;
const STATS_KEY = "wordup-quiz-stats";

export async function loadStats(): Promise<QuizStats> {
  try {
    const s = await AsyncStorage.getItem(STATS_KEY);
    if (s) return JSON.parse(s);
  } catch { /* ignore */ }
  return {};
}
export function recordQuiz(stats: QuizStats, word: string, picked: string): QuizStats {
  const cur = stats[word] || { right: 0, wrong: 0, confused: {} };
  const upd: QuizStat = picked === word
    ? { ...cur, right: cur.right + 1 }
    : { ...cur, wrong: cur.wrong + 1, confused: { ...cur.confused, [picked]: (cur.confused[picked] || 0) + 1 } };
  const next = { ...stats, [word]: upd };
  AsyncStorage.setItem(STATS_KEY, JSON.stringify(next)).catch(() => {});
  return next;
}
