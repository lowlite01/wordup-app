import type { Progress, QuizStats } from "../types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

const TOKEN_KEY = "wordup-token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}
export function isLoggedIn() {
  return Boolean(getToken());
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(API_URL + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401) {
    setToken(null); // token expired/invalid — drop it
    throw new Error("unauthorized");
  }
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<T>;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: "USER" | "ADMIN";
  xp: number;
  streakCount: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  threshold: number;
  earnedAt: string;
}

export interface Gamification {
  level: number;
  xp: number;
  levelXp: number;
  levelSpan: number;
  nextLevelXp: number;
  streak: number;
  knownCount: number;
  achievements: Achievement[];
}

export interface LeaderRow {
  rank: number;
  level: number;
  xp: number;
  name: string | null;
  avatarUrl: string | null;
  streak: number;
}

export const api = {
  loginWithGoogle: (credential: string) =>
    request<{ token: string; user: AuthUser }>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential }),
    }),
  me: () => request<AuthUser>("/auth/me"),
  getProgress: () => request<Progress>("/progress"),
  setWordState: (groupKey: string, word: string, state: "known" | "learning" | "none") =>
    request<{ ok: boolean; gamification: Gamification }>("/progress", {
      method: "PUT",
      body: JSON.stringify({ groupKey, word, state }),
    }),
  syncProgress: (entries: { groupKey: string; word: string; state: "known" | "learning" }[]) =>
    request<Progress>("/progress/sync", {
      method: "POST",
      body: JSON.stringify({ entries }),
    }),
  clearProgress: () => request<Progress>("/progress", { method: "DELETE" }),
  getStats: () => request<QuizStats>("/stats"),
  recordQuiz: (word: string, picked: string) =>
    request<{ ok: boolean }>("/stats", {
      method: "POST",
      body: JSON.stringify({ word, picked }),
    }),
  syncStats: (stats: QuizStats) =>
    request<QuizStats>("/stats/sync", {
      method: "POST",
      body: JSON.stringify({ stats }),
    }),
  clearStats: () => request<{ ok: boolean }>("/stats", { method: "DELETE" }),
  gamification: () => request<Gamification>("/gamification/me"),
  leaderboard: () => request<LeaderRow[]>("/leaderboard"),
};

// Flattens the { known:{key:[w]}, learning:{...} } shape into sync entries.
export function progressToEntries(p: Progress) {
  const entries: { groupKey: string; word: string; state: "known" | "learning" }[] = [];
  for (const [groupKey, words] of Object.entries(p.known)) {
    for (const word of words) entries.push({ groupKey, word, state: "known" });
  }
  for (const [groupKey, words] of Object.entries(p.learning)) {
    for (const word of words) entries.push({ groupKey, word, state: "learning" });
  }
  return entries;
}
