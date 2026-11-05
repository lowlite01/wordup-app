// When each word was last answered (marked known / still learning), so the
// Review tab can sort by "recent" and "not reviewed for a while".
// Stored on the device as { "key|word": timestamp }.

const KEY = "wordup-word-times-v1";
let times: Record<string, number> = {};
try { times = JSON.parse(localStorage.getItem(KEY) as string) || {}; } catch { times = {}; }

export function touchWord(key: string, word: string) {
  times[`${key}|${word}`] = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(times)); } catch { /* storage full — not critical */ }
}

/** Last time the word was answered, or 0 if never recorded. */
export function wordTime(key: string, word: string): number {
  return times[`${key}|${word}`] || 0;
}

export function clearWordTimes() {
  times = {};
  localStorage.removeItem(KEY);
}
