import type { KeyedWord, Progress } from "../types";
import { LEVELS, keyParts, knownSet, learningSet, levelAllKeys, wordsForKey } from "./groups";
import { isTopicLocked, type CrystalState } from "./crystals";

// Daily plan: every day the user gets a small set of cards — a few words
// they are still learning (review) plus a few brand-new words from their
// path. Finishing the whole plan counts the day towards the streak.
// Everything is stored on the device, so it works without an account.

export const NEW_PER_DAY = 5;
export const REVIEW_PER_DAY = 5;
export const PLAN_BONUS = 5; // crystals for finishing the day's plan

export interface PlanItem { key: string; word: string; kind: "new" | "review" }

export interface DailyPlan {
  date: string;      // YYYY-MM-DD (local time)
  items: PlanItem[];
  done: string[];    // "key|word" of cards answered today
  completed: boolean;
}

export interface Streak {
  count: number;          // days in a row the plan was finished
  best: number;
  lastDate: string | null; // last day the plan was finished
  days: string[];         // recent finished days (for the week dots)
}

// ---- dates (local time, not UTC, so "today" matches the user's clock) ----
export function dayStr(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
function shiftDay(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return dayStr(d);
}
export const today = () => dayStr();
export const yesterday = () => shiftDay(-1);

// Last 7 days, oldest first — used to draw the week dots.
export function lastWeek(): string[] {
  return [-6, -5, -4, -3, -2, -1, 0].map(shiftDay);
}

// ---- storage ----
const planKey = (lang: string) => `wordup-plan-v1-${lang}`;
const STREAK_KEY = "wordup-streak-v1";

function read<T>(key: string): T | null {
  try { return JSON.parse(localStorage.getItem(key) as string); } catch { return null; }
}

export const itemId = (key: string, word: string) => `${key}|${word}`;

// Small deterministic hash so the review pick changes from day to day
// but stays the same if the page is reloaded.
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Words that are not started yet, walking the path from A1 upwards:
// each level's core words first, then its open topics.
function newWords(progress: Progress, crystals: CrystalState, count: number): PlanItem[] {
  const out: PlanItem[] = [];
  for (const level of LEVELS) {
    for (const key of levelAllKeys(level)) {
      const isTopic = key !== level;
      if (isTopic && isTopicLocked(crystals, keyParts(key).name)) continue;
      const known = knownSet(progress, key);
      const learning = learningSet(progress, key);
      for (const w of wordsForKey(key)) {
        if (known.has(w.word) || learning.has(w.word)) continue;
        out.push({ key, word: w.word, kind: "new" });
        if (out.length >= count) return out;
      }
    }
  }
  return out;
}

function reviewWords(progress: Progress, count: number, date: string): PlanItem[] {
  const all: PlanItem[] = [];
  for (const [key, words] of Object.entries(progress.learning)) {
    if (!wordsForKey(key).length) continue; // list/group no longer exists
    for (const word of words) all.push({ key, word, kind: "review" });
  }
  all.sort((a, b) => hash(date + a.word) - hash(date + b.word));
  return all.slice(0, count);
}

export function buildPlan(progress: Progress, crystals: CrystalState): DailyPlan {
  const date = today();
  const items = [...reviewWords(progress, REVIEW_PER_DAY, date), ...newWords(progress, crystals, NEW_PER_DAY)];
  return { date, items, done: [], completed: false };
}

// Today's plan: reuse the saved one if it's from today and still valid,
// otherwise build a fresh one.
export function loadPlan(lang: string, progress: Progress, crystals: CrystalState): DailyPlan {
  const saved = read<DailyPlan>(planKey(lang));
  if (saved && saved.date === today()) {
    // drop cards whose word disappeared (e.g. content reloaded from the server)
    const items = saved.items.filter(i => wordsForKey(i.key).some(w => w.word === i.word));
    if (items.length || saved.completed) return { ...saved, items };
  }
  const fresh = buildPlan(progress, crystals);
  savePlan(lang, fresh);
  return fresh;
}
export function savePlan(lang: string, plan: DailyPlan) {
  localStorage.setItem(planKey(lang), JSON.stringify(plan));
}

// Cards still to do today, as full word objects for the flashcard deck.
export function planDeck(plan: DailyPlan): (KeyedWord & { kind: PlanItem["kind"] })[] {
  return plan.items
    .filter(i => !plan.done.includes(itemId(i.key, i.word)))
    .map(i => {
      const w = wordsForKey(i.key).find(x => x.word === i.word)!;
      return { ...w, key: i.key, kind: i.kind };
    })
    .filter(w => w.word);
}

export function markPlanItem(plan: DailyPlan, key: string, word: string): DailyPlan {
  const id = itemId(key, word);
  if (plan.done.includes(id)) return plan;
  const done = [...plan.done, id];
  const completed = plan.items.length > 0 && plan.items.every(i => done.includes(itemId(i.key, i.word)));
  return { ...plan, done, completed };
}

// ---- streak ----
export function loadStreak(): Streak {
  const s = read<Streak>(STREAK_KEY);
  return s && typeof s.count === "number"
    ? { ...s, days: s.days ?? [] }
    : { count: 0, best: 0, lastDate: null, days: [] };
}
export function saveStreak(s: Streak) {
  localStorage.setItem(STREAK_KEY, JSON.stringify(s));
}

// The streak only survives if the plan was finished today or yesterday.
export function liveStreak(s: Streak): number {
  return s.lastDate === today() || s.lastDate === yesterday() ? s.count : 0;
}

// Call when today's plan is finished. Safe to call twice on the same day.
export function completeDay(s: Streak): Streak {
  const t = today();
  if (s.lastDate === t) return s;
  const count = s.lastDate === yesterday() ? s.count + 1 : 1;
  const days = [...s.days.filter(d => d >= shiftDay(-30)), t];
  return { count, best: Math.max(s.best, count), lastDate: t, days };
}
