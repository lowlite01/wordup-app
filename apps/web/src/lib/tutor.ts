import { isTelegram, telegramInitData } from "./telegram";
import type { LearnerProfile } from "./tutorProfile";

// Tutor chat (WordUp Pro, Telegram only). The server checks Pro and the daily
// limit; the conversation itself is kept on this device.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const KEY = "wordup-tutor-v1";
const KEEP = 60; // messages kept on the device

export interface TutorTurn { role: "user" | "assistant"; text: string; tr?: string }
export interface TutorQuota { pro: boolean; limit: number; left: number; enabled: boolean }
export type TutorError = "pro" | "limit" | "busy" | "network";

export function loadChat(): TutorTurn[] {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) as string);
    if (Array.isArray(s)) return s.filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.text === "string");
  } catch { /* ignore */ }
  return [];
}
export function saveChat(turns: TutorTurn[]) {
  try { localStorage.setItem(KEY, JSON.stringify(turns.slice(-KEEP))); } catch { /* ignore */ }
}

const headers = () => ({ "Content-Type": "application/json", Authorization: `tma ${telegramInitData}` });

export async function fetchQuota(): Promise<TutorQuota | null> {
  if (!isTelegram) return null;
  try {
    const res = await fetch(API_URL + "/tg/tutor", { headers: headers() });
    return res.ok ? ((await res.json()) as TutorQuota) : null;
  } catch { return null; }
}

/** Send the conversation, get the tutor's answer (or the reason it failed). */
export async function askTutor(turns: TutorTurn[], lang: string, profile: LearnerProfile):
  Promise<{ reply: string; left: number; refused: boolean } | { error: TutorError }> {
  try {
    const res = await fetch(API_URL + "/tg/tutor", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ turns: turns.slice(-16), lang, profile }),
    });
    if (res.status === 402) return { error: "pro" };
    if (res.status === 429) return { error: "limit" };
    if (!res.ok) return { error: "busy" };
    return (await res.json()) as { reply: string; left: number; refused: boolean };
  } catch {
    return { error: "network" };
  }
}

// ---- Dialogue lessons (role-play with tasks) ----
export interface DialogueInfo {
  id: string;
  emoji: string;
  level: string;
  title: { ru: string; en: string };
  opener: string;
  tasks: { ru: string; en: string }[];
}
export interface DialogueTurn extends TutorTurn { correction?: string | null; explanation?: string | null }
export interface DialogueRun { turns: DialogueTurn[]; completed: number[]; finished: boolean }

const LIST_KEY = "wordup-dialogues-v1";
const RUN_KEY = "wordup-dialogue-runs-v1";

export function cachedDialogues(): DialogueInfo[] {
  try { const s = JSON.parse(localStorage.getItem(LIST_KEY) as string); if (Array.isArray(s)) return s; } catch { /* ignore */ }
  return [];
}
export async function fetchDialogues(): Promise<DialogueInfo[] | null> {
  try {
    const res = await fetch(API_URL + "/tg/tutor/dialogues");
    if (!res.ok) return null;
    const list = (await res.json()) as DialogueInfo[];
    try { localStorage.setItem(LIST_KEY, JSON.stringify(list)); } catch { /* ignore */ }
    return list;
  } catch { return null; }
}

export function loadRuns(): Record<string, DialogueRun> {
  try { const s = JSON.parse(localStorage.getItem(RUN_KEY) as string); if (s && typeof s === "object") return s; } catch { /* ignore */ }
  return {};
}
export function saveRun(id: string, run: DialogueRun | null) {
  const all = loadRuns();
  if (run) all[id] = { ...run, turns: run.turns.slice(-40) }; else delete all[id];
  try { localStorage.setItem(RUN_KEY, JSON.stringify(all)); } catch { /* ignore */ }
}
const DONE_KEY = "wordup-dialogues-done-v1";
export function loadDoneDialogues(): string[] {
  try { const s = JSON.parse(localStorage.getItem(DONE_KEY) as string); if (Array.isArray(s)) return s; } catch { /* ignore */ }
  return [];
}
export function markDialogueDone(id: string) {
  const s = new Set(loadDoneDialogues()); s.add(id);
  try { localStorage.setItem(DONE_KEY, JSON.stringify([...s])); } catch { /* ignore */ }
}

export interface DialogueStep {
  refused: boolean; left: number;
  correction?: string | null; explanation?: string | null; reply?: string; completed?: number[]; finished?: boolean;
}
/** One learner message in a dialogue lesson. `turns` has no opener line. */
export async function askDialogue(id: string, turns: TutorTurn[], done: number[], lang: string, profile: LearnerProfile):
  Promise<DialogueStep | { error: TutorError }> {
  try {
    const res = await fetch(API_URL + "/tg/tutor/dialogue", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ id, done, lang, profile, turns: turns.slice(-16).map(t => ({ role: t.role, text: t.text })) }),
    });
    if (res.status === 402) return { error: "pro" };
    if (res.status === 429) return { error: "limit" };
    if (!res.ok) return { error: "busy" };
    return (await res.json()) as DialogueStep;
  } catch {
    return { error: "network" };
  }
}

// ---- Hints (own daily cap on the server) ----
export async function translateText(text: string, lang: string): Promise<string | { error: TutorError }> {
  try {
    const res = await fetch(API_URL + "/tg/tutor/translate", {
      method: "POST", headers: headers(), body: JSON.stringify({ text: text.slice(0, 2000), lang }),
    });
    if (res.status === 402) return { error: "pro" };
    if (res.status === 429) return { error: "limit" };
    if (!res.ok) return { error: "busy" };
    return ((await res.json()) as { translation: string }).translation;
  } catch { return { error: "network" }; }
}

export interface TutorHint {
  idea: string;                              // what to say, in the learner's language
  start: string;                             // the first 1-3 English words
  words: { en: string; native: string }[];   // useful words for the answer
  grammar: string | null;                    // a grammar tip
}
export async function suggestReplies(
  turns: TutorTurn[], lang: string, profile: LearnerProfile, dialogue?: { id: string; done: number[] },
): Promise<TutorHint | null | { error: TutorError }> {
  try {
    const res = await fetch(API_URL + "/tg/tutor/suggest", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        turns: turns.slice(-10).map(t => ({ role: t.role, text: t.text })),
        lang, profile,
        ...(dialogue ? { dialogueId: dialogue.id, done: dialogue.done } : {}),
      }),
    });
    if (res.status === 402) return { error: "pro" };
    if (res.status === 429) return { error: "limit" };
    if (!res.ok) return { error: "busy" };
    return (await res.json()) as TutorHint | null;
  } catch { return { error: "network" }; }
}
