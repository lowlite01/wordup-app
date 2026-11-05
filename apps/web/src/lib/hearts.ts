// Hearts: mistakes in path lessons cost one. They come back over time,
// can be refilled with crystals, refill fully when the daily plan is done,
// and are unlimited with WordUp Pro. Flashcards / review never cost hearts.
export const MAX_HEARTS = 5;
export const REFILL_COST = 30; // crystals
const REGEN_MS = 30 * 60 * 1000; // one heart every 30 minutes
const KEY = "wordup-hearts-v1";

export interface Hearts {
  count: number;
  since: number; // when the current regeneration period started
}

// Add the hearts that have grown back since `since`.
export function regen(h: Hearts, now = Date.now()): Hearts {
  if (h.count >= MAX_HEARTS) return { count: MAX_HEARTS, since: now };
  const grown = Math.floor((now - h.since) / REGEN_MS);
  if (grown <= 0) return h;
  const count = Math.min(MAX_HEARTS, h.count + grown);
  return { count, since: count >= MAX_HEARTS ? now : h.since + grown * REGEN_MS };
}

/** Minutes until the next heart grows back (0 when full). */
export function minutesToNext(h: Hearts, now = Date.now()): number {
  if (h.count >= MAX_HEARTS) return 0;
  return Math.max(1, Math.ceil((h.since + REGEN_MS - now) / 60000));
}

export function loadHearts(): Hearts {
  try {
    const h = JSON.parse(localStorage.getItem(KEY) as string);
    if (h && typeof h.count === "number") return regen(h);
  } catch { /* ignore */ }
  return { count: MAX_HEARTS, since: Date.now() };
}
export function saveHearts(h: Hearts) {
  try { localStorage.setItem(KEY, JSON.stringify(h)); } catch { /* ignore */ }
}

export function loseOne(h: Hearts, now = Date.now()): Hearts {
  const cur = regen(h, now);
  // start the regeneration clock when dropping below full
  return { count: Math.max(0, cur.count - 1), since: cur.count >= MAX_HEARTS ? now : cur.since };
}
export const fullHearts = (): Hearts => ({ count: MAX_HEARTS, since: Date.now() });
