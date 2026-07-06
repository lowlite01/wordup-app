// XP & level math, kept pure so it's easy to test and reuse on the client.

export const XP_PER_KNOWN_WORD = 10;

// Cumulative XP needed to *reach* a given level.
// level 1 = 0, 2 = 100, 3 = 300, 4 = 600, 5 = 1000 ... (50 * L * (L-1))
export function xpForLevel(level: number): number {
  return 50 * level * (level - 1);
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

// Progress within the current level, for a progress bar.
export function levelProgress(xp: number) {
  const level = levelFromXp(xp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return {
    level,
    xp,
    levelXp: xp - base,
    levelSpan: next - base,
    nextLevelXp: next,
  };
}

// Days between two dates at local-midnight granularity.
export function dayDiff(a: Date, b: Date): number {
  const da = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const db = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((db - da) / 86400000);
}
