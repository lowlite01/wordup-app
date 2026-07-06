import type { Progress, QuizStats, RecentEntry, Settings } from "../types";

function load<T>(key: string, fallback: T): T {
  try {
    const v = JSON.parse(localStorage.getItem(key) as string);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

const PROGRESS_KEY = "wordup-progress-v2";

export function loadProgress(): Progress {
  const p = load<Progress | null>(PROGRESS_KEY, null);
  if (p && p.known) return { known: p.known, learning: p.learning || {} };
  return { known: {}, learning: {} };
}
export const saveProgress = (p: Progress) => save(PROGRESS_KEY, p);

const STATS_KEY = "wordup-quiz-stats-v1";
export const loadStats = () => load<QuizStats>(STATS_KEY, {});
export const saveStats = (s: QuizStats) => save(STATS_KEY, s);
export const clearStatsStorage = () => localStorage.removeItem(STATS_KEY);

const RECENT_KEY = "wordup-recent-v1";
export const loadRecent = () => load<RecentEntry[]>(RECENT_KEY, []);
export const saveRecent = (r: RecentEntry[]) => save(RECENT_KEY, r);

const SETTINGS_KEY = "wordup-settings-v1";
const DEFAULT_SETTINGS: Settings = { theme: "playful", lang: "ru", autoSpeak: false };
export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...load<Partial<Settings>>(SETTINGS_KEY, {}) };
}
export const saveSettings = (s: Settings) => save(SETTINGS_KEY, s);
