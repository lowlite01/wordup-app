import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppContent, KeyedWord, LEVELS, keyParts, levelAllKeys, wordsForKey } from "./api";
import { Progress } from "./storage";
import { CrystalState, isTopicLocked } from "./crystals";

// Daily plan + streak — same rules as the website (apps/web/src/lib/dailyPlan.ts):
// every day up to 5 "still learning" words to review + 5 new words from the
// path. Finishing the whole plan counts the day towards the streak; missing a
// day resets it. Stored on the phone, works without an account.

export const NEW_PER_DAY = 5;
export const REVIEW_PER_DAY = 5;
export const PLAN_BONUS = 5;

export interface PlanItem { key: string; word: string; kind: "new" | "review" }
export interface DailyPlan { date: string; items: PlanItem[]; done: string[]; completed: boolean }
export interface Streak { count: number; best: number; lastDate: string | null; days: string[] }

export function dayStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function shiftDay(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return dayStr(d);
}
export const today = () => dayStr();
export const yesterday = () => shiftDay(-1);
export const lastWeek = () => [-6, -5, -4, -3, -2, -1, 0].map(shiftDay);
export const itemId = (key: string, word: string) => `${key}|${word}`;

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function newWords(content: AppContent, progress: Progress, crystals: CrystalState, count: number): PlanItem[] {
  const out: PlanItem[] = [];
  for (const level of LEVELS) {
    for (const key of levelAllKeys(content, level)) {
      if (key !== level && isTopicLocked(crystals, keyParts(key).name)) continue;
      const known = new Set(progress.known[key] || []);
      const learning = new Set(progress.learning[key] || []);
      for (const w of wordsForKey(content, key)) {
        if (known.has(w.word) || learning.has(w.word)) continue;
        out.push({ key, word: w.word, kind: "new" });
        if (out.length >= count) return out;
      }
    }
  }
  return out;
}

function reviewWords(content: AppContent, progress: Progress, count: number, date: string): PlanItem[] {
  const all: PlanItem[] = [];
  for (const [key, words] of Object.entries(progress.learning)) {
    if (!wordsForKey(content, key).length) continue;
    for (const word of words) all.push({ key, word, kind: "review" });
  }
  all.sort((a, b) => hash(date + a.word) - hash(date + b.word));
  return all.slice(0, count);
}

export function buildPlan(content: AppContent, progress: Progress, crystals: CrystalState): DailyPlan {
  const date = today();
  return {
    date,
    items: [...reviewWords(content, progress, REVIEW_PER_DAY, date), ...newWords(content, progress, crystals, NEW_PER_DAY)],
    done: [],
    completed: false,
  };
}

const planKey = (lang: string) => `wordup-plan-${lang}`;
const STREAK_KEY = "wordup-streak";

// Today's saved plan if it's still valid, otherwise a fresh one.
export async function loadPlan(lang: string, content: AppContent, progress: Progress, crystals: CrystalState): Promise<DailyPlan> {
  try {
    const s = await AsyncStorage.getItem(planKey(lang));
    const saved: DailyPlan | null = s ? JSON.parse(s) : null;
    if (saved && saved.date === today()) {
      const items = saved.items.filter(i => wordsForKey(content, i.key).some(w => w.word === i.word));
      if (items.length || saved.completed) return { ...saved, items };
    }
  } catch { /* build a new one */ }
  const fresh = buildPlan(content, progress, crystals);
  savePlan(lang, fresh);
  return fresh;
}
export function savePlan(lang: string, plan: DailyPlan) {
  AsyncStorage.setItem(planKey(lang), JSON.stringify(plan)).catch(() => {});
}

export function planDeck(content: AppContent, plan: DailyPlan): (KeyedWord & { kind: PlanItem["kind"] })[] {
  const out: (KeyedWord & { kind: PlanItem["kind"] })[] = [];
  for (const i of plan.items) {
    if (plan.done.includes(itemId(i.key, i.word))) continue;
    const w = wordsForKey(content, i.key).find(x => x.word === i.word);
    if (w) out.push({ ...w, key: i.key, kind: i.kind });
  }
  return out;
}

export function markPlanItem(plan: DailyPlan, key: string, word: string): DailyPlan {
  const id = itemId(key, word);
  if (plan.done.includes(id)) return plan;
  const done = [...plan.done, id];
  const completed = plan.items.length > 0 && plan.items.every(i => done.includes(itemId(i.key, i.word)));
  return { ...plan, done, completed };
}

export async function loadStreak(): Promise<Streak> {
  try {
    const s = await AsyncStorage.getItem(STREAK_KEY);
    if (s) {
      const v = JSON.parse(s);
      if (typeof v.count === "number") return { ...v, days: v.days ?? [] };
    }
  } catch { /* ignore */ }
  return { count: 0, best: 0, lastDate: null, days: [] };
}
export function saveStreak(s: Streak) {
  AsyncStorage.setItem(STREAK_KEY, JSON.stringify(s)).catch(() => {});
}
export function liveStreak(s: Streak): number {
  return s.lastDate === today() || s.lastDate === yesterday() ? s.count : 0;
}
export function completeDay(s: Streak): Streak {
  const t = today();
  if (s.lastDate === t) return s;
  const count = s.lastDate === yesterday() ? s.count + 1 : 1;
  return { count, best: Math.max(s.best, count), lastDate: t, days: [...s.days.filter(d => d >= shiftDay(-30)), t] };
}
