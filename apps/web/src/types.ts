export interface Word {
  word: string;
  pos: string;
  def: string;
  example: string;
}

export interface KeyedWord extends Word {
  key: string;
}

export type WordState = "known" | "learning" | "none";

export interface Progress {
  known: Record<string, string[]>;
  learning: Record<string, string[]>;
}

export interface QuizStat {
  right: number;
  wrong: number;
  confused: Record<string, number>;
}
export type QuizStats = Record<string, QuizStat>;

export interface RecentEntry {
  key: string;
  ts: number;
}

export type ThemeName = "playful" | "dark" | "minimal";
export type Lang = "en" | "ru";

export interface Settings {
  theme: ThemeName;
  lang: Lang;
  autoSpeak: boolean;
}

export interface GrammarItem {
  title: string;
  formula: string;
  use: string[];
  signals?: string[];
  examples: [string, string?][];
}
export interface GrammarSection {
  section: string;
  items: GrammarItem[];
}

export type FlashMode = "group" | "all" | "learning-mix";
