import type { Progress } from "../types";
import { LEVELS, TOPIC_LEVEL, TOPICS, knownSet, wordsForKey } from "./groups";

// Local crystal economy: master groups to earn crystals, spend them to
// unlock locked topics. Kept on-device (works without an account).
export interface CrystalState {
  crystals: number;
  unlocked: string[]; // topics unlocked beyond the defaults
  awarded: string[];  // group keys already rewarded (so mastery pays once)
}

const KEY = "wordup-crystals-v1";
const START = 20;

// Unlock cost by the topic's CEFR level. A1 topics are free (open by default).
const COST: Record<string, number> = { A2: 15, B1: 20, B2: 25, C1: 30, C2: 35 };

export function unlockCost(topic: string): number {
  return COST[TOPIC_LEVEL[topic] || "B1"] ?? 20;
}

export function isTopicLocked(state: CrystalState, topic: string): boolean {
  if ((TOPIC_LEVEL[topic] || "B1") === "A1") return false;
  return !state.unlocked.includes(topic);
}

export function loadCrystals(): CrystalState {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) as string);
    if (s && typeof s.crystals === "number") return s;
  } catch { /* ignore */ }
  return { crystals: START, unlocked: [], awarded: [] };
}
export function saveCrystals(s: CrystalState) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

function reward(total: number): number {
  return Math.max(5, Math.round(total / 4));
}

// Award crystals for any group newly mastered (100% known). Returns the next
// state and how many crystals were gained.
export function awardMastery(state: CrystalState, progress: Progress): { state: CrystalState; gained: number } {
  const awarded = [...state.awarded];
  let gained = 0;
  for (const key of [...LEVELS, ...TOPICS]) {
    const total = wordsForKey(key).length;
    if (total > 0 && knownSet(progress, key).size >= total && !awarded.includes(key)) {
      awarded.push(key);
      gained += reward(total);
    }
  }
  if (!gained) return { state, gained: 0 };
  return { state: { ...state, crystals: state.crystals + gained, awarded }, gained };
}

export function unlockTopic(state: CrystalState, topic: string): CrystalState | null {
  const cost = unlockCost(topic);
  if (state.crystals < cost) return null;
  return { ...state, crystals: state.crystals - cost, unlocked: [...state.unlocked, topic] };
}
