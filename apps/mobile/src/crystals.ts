import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppContent, LEVELS, TOPIC_LEVEL, topicNames, wordsForKey } from "./api";
import { Progress, knownCount } from "./storage";

// Local crystal economy: master groups to earn crystals, spend them to
// unlock locked topics. Kept on-device (works without an account).
export interface CrystalState {
  crystals: number;
  unlocked: string[];
  awarded: string[];
}

const KEY = "wordup-crystals";
const START = 20;
const COST: Record<string, number> = { A2: 15, B1: 20, B2: 25, C1: 30, C2: 35 };

export function unlockCost(topic: string): number {
  return COST[TOPIC_LEVEL[topic] || "B1"] ?? 20;
}
export function isTopicLocked(state: CrystalState, topic: string): boolean {
  if ((TOPIC_LEVEL[topic] || "B1") === "A1") return false;
  return !state.unlocked.includes(topic);
}

export function emptyCrystals(): CrystalState {
  return { crystals: START, unlocked: [], awarded: [] };
}
export async function loadCrystals(): Promise<CrystalState> {
  try {
    const s = await AsyncStorage.getItem(KEY);
    if (s) return JSON.parse(s);
  } catch { /* ignore */ }
  return emptyCrystals();
}
export function saveCrystals(s: CrystalState) {
  AsyncStorage.setItem(KEY, JSON.stringify(s)).catch(() => {});
}

const reward = (total: number) => Math.max(5, Math.round(total / 4));

export function awardMastery(state: CrystalState, content: AppContent, progress: Progress): { state: CrystalState; gained: number } {
  const awarded = [...state.awarded];
  let gained = 0;
  for (const key of [...LEVELS, ...topicNames(content)]) {
    const total = wordsForKey(content, key).length;
    if (total > 0 && knownCount(progress, key) >= total && !awarded.includes(key)) {
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
