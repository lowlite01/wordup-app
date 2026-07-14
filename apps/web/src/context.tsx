import { createContext, useContext } from "react";
import type { Progress, QuizStats, RecentEntry, Settings, Word, WordState } from "./types";
import type { AuthUser, Gamification, LeaderRow } from "./lib/api";
import type { CrystalState } from "./lib/crystals";
import type { CustomList } from "./lib/customLists";

export interface AppApi {
  progress: Progress;
  setWordState: (key: string, word: string, state: WordState) => void;
  resetKey: (key: string) => void;
  resetAllProgress: () => void;
  stats: QuizStats;
  recordQuiz: (word: string, picked: string) => void;
  clearStats: () => void;
  recent: RecentEntry[];
  recordRecent: (key: string) => void;
  settings: Settings;
  updateSettings: (s: Partial<Settings>) => void;
  openContext: (w: Word) => void;

  // Auth & gamification (null when not signed in)
  user: AuthUser | null;
  gamification: Gamification | null;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => void;
  loadLeaderboard: () => Promise<LeaderRow[]>;
  refreshContent: () => Promise<void>;

  crystals: CrystalState;
  unlockTopic: (topic: string) => boolean;

  // User-created word lists (import from Claude/anywhere, then study).
  customLists: CustomList[];
  importCustomList: (name: string, text: string) => number; // returns words imported
  removeCustomList: (id: string) => void;
  renameCustomList: (id: string, name: string) => void;
}

export const AppContext = createContext<AppApi>(null!);
export const useApp = () => useContext(AppContext);
