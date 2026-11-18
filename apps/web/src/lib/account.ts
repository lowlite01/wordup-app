import { isTelegram, telegramInitData } from "./telegram";

// Which Telegram account the cloud save belongs to.
// Inside Telegram it's known from Telegram's signed launch data. On the
// website (e.g. on a computer) the learner pastes the personal key from
// /reverso in the bot, and the site uses the same account with it.
// The key is kept on this device only (it is not part of the cloud save).
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const LINK_KEY = "wordup-link-key";
const SYNCED_AT = "wordup-sync-at";

export function linkKey(): string {
  try { return localStorage.getItem(LINK_KEY) || ""; } catch { return ""; }
}

/** Is there an account to sync with? */
export function hasAccount(): boolean {
  return isTelegram || Boolean(linkKey());
}

export function accountHeaders(): Record<string, string> {
  return isTelegram
    ? { "Content-Type": "application/json", Authorization: `tma ${telegramInitData}` }
    : { "Content-Type": "application/json", "X-Link-Key": linkKey() };
}

/** Checks the key with the server and remembers it. "bad" = wrong key, "offline" = no answer. */
export async function connectLinkKey(key: string): Promise<"ok" | "bad" | "offline"> {
  const k = key.trim();
  if (!k) return "bad";
  try {
    const res = await fetch(`${API_URL}/tg/state`, { headers: { "X-Link-Key": k } });
    if (res.status === 401) return "bad";
    if (!res.ok) return "offline";
  } catch {
    return "offline";
  }
  localStorage.setItem(LINK_KEY, k);
  localStorage.removeItem(SYNCED_AT); // first sync: keep whichever copy has learned more
  return "ok";
}

export function disconnectLinkKey() {
  localStorage.removeItem(LINK_KEY);
  localStorage.removeItem(SYNCED_AT);
}
