import { isTelegram, telegramInitData } from "./telegram";

// Tutor chat (WordUp Pro, Telegram only). The server checks Pro and the daily
// limit; the conversation itself is kept on this device.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const KEY = "wordup-tutor-v1";
const KEEP = 60; // messages kept on the device

export interface TutorTurn { role: "user" | "assistant"; text: string }
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
export async function askTutor(turns: TutorTurn[], lang: string, level?: string | null):
  Promise<{ reply: string; left: number; refused: boolean } | { error: TutorError }> {
  try {
    const res = await fetch(API_URL + "/tg/tutor", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ turns: turns.slice(-16), lang, ...(level ? { level } : {}) }),
    });
    if (res.status === 402) return { error: "pro" };
    if (res.status === 429) return { error: "limit" };
    if (!res.ok) return { error: "busy" };
    return (await res.json()) as { reply: string; left: number; refused: boolean };
  } catch {
    return { error: "network" };
  }
}
