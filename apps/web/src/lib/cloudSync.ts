import { isTelegram, telegramInitData } from "./telegram";

// Cloud save for the Telegram Mini App: everything the learner has done
// (words, path, streak, crystals, plan…) lives in the phone's
// storage, which Telegram may clear and which another device doesn't have.
// So we keep a copy on the server under the Telegram account:
//   - on start: if the server's copy is newer than what this device last
//     synced, it replaces the local data (new phone, cleared cache);
//   - while the app is open: upload every 20 s if anything changed, and when
//     the app goes to the background.
// The server stamps each copy with its own clock, so phones with wrong
// clocks can't confuse the order.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const SYNCED_AT = "wordup-sync-at"; // server time of the copy this device has

// What is the learner's own data (caches and server-owned things are not).
const INCLUDE = [
  // (settings — theme, language — stay per device: a desktop in English
  // shouldn't switch the phone's Russian interface)
  /^wordup-(progress|quiz-stats|recent|streak|crystals|custom-lists|hearts|word-times)-v\d+$/,
  /^wordup-(path|plan)-v1-en$/,
  /^wordup-lesson-/,
];
const isSynced = (k: string) => INCLUDE.some(r => r.test(k));

// How much has been learned in a copy (to pick the right one on a first sync).
function learned(state: Record<string, string>): number {
  try {
    const p = JSON.parse(state["wordup-progress-v2"] || "{}") as { known?: Record<string, string[]> };
    return Object.values(p.known || {}).reduce((n, l) => n + (l?.length || 0), 0);
  } catch { return 0; }
}

function snapshot(): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && isSynced(k)) out[k] = localStorage.getItem(k) ?? "";
  }
  return out;
}

const headers = () => ({ "Content-Type": "application/json", Authorization: `tma ${telegramInitData}` });

let lastSent = "";

/** Upload the current data if it changed since the last upload. */
export async function pushState(keepalive = false): Promise<void> {
  if (!isTelegram) return;
  const state = snapshot();
  const json = JSON.stringify(state);
  if (json === lastSent) return;
  try {
    const res = await fetch(`${API_URL}/tg/state`, {
      method: "PUT", headers: headers(), body: JSON.stringify({ state }), keepalive,
    });
    if (!res.ok) return;
    const { at } = (await res.json()) as { at: number };
    lastSent = json;
    localStorage.setItem(SYNCED_AT, String(at));
  } catch { /* offline — next time */ }
}

/**
 * On start (Telegram only). Returns true when the local data was replaced by
 * a newer copy from the server — the app should reload to show it.
 */
export async function pullState(): Promise<boolean> {
  if (!isTelegram) return false;
  try {
    const res = await fetch(`${API_URL}/tg/state`, { headers: headers() });
    if (!res.ok) return false;
    const { state, at } = (await res.json()) as { state: Record<string, string> | null; at: number | null };
    const localAt = Number(localStorage.getItem(SYNCED_AT) || 0);
    // First sync on this device while it already has its own progress: keep
    // whichever copy has learned more (don't wipe a phone with a fresh desktop).
    if (state && at && localAt === 0 && learned(snapshot()) > learned(state)) {
      await pushState();
      return false;
    }
    if (state && at && at > localAt) {
      // newer progress from another device: take it
      for (const k of Object.keys(snapshot())) localStorage.removeItem(k);
      for (const [k, v] of Object.entries(state)) if (isSynced(k)) localStorage.setItem(k, v);
      localStorage.setItem(SYNCED_AT, String(at));
      lastSent = JSON.stringify(snapshot());
      return true;
    }
    if (!state) await pushState(); // first time: upload what this device has
    else lastSent = localAt === at ? JSON.stringify(snapshot()) : "";
  } catch { /* offline */ }
  return false;
}

let started = false;
export function startAutoSync() {
  if (!isTelegram || started) return;
  started = true;
  setInterval(() => { void pushState(); }, 20_000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void pushState(true);
  });
}
