import type { Progress } from "../types";
import { LEVELS, PART_SIZE, knownCount, partKey, wordsForKey } from "./groups";
import { GRAMMAR_DRILLS, LEVEL_GRAMMAR } from "./grammarDrills";
import { BASICS } from "./basics";

// The learning path ("roadmap"): a long chain of small steps.
//   basics   — "A0" unit for complete beginners: a rule in Russian + practice
//   words    — learn a part (12 words) of a level's core vocabulary
//   practice — right after: the same words in sentences (meaning, gap, build, type)
//   grammar  — read a rule, then a short practice quiz (every second part)
// A placement test sets a starting level; everything below it counts as done.

export type StepKind = "basics" | "words" | "practice" | "grammar" | "chest" | "trophy";

// Crystals for each kind of step: a chest every few steps, a trophy per level.
export const STEP_REWARD: Partial<Record<StepKind, number>> = { basics: 3, practice: 2, grammar: 3, chest: 5, trophy: 15 };

/** The beginners' unit before A1. */
export const BASICS_LEVEL = "A0";

export interface Step {
  id: string;          // stable id, also used to remember finished steps
  kind: StepKind;
  level: string;
  title: string;
  emoji: string;
  key?: string;        // words / practice: the part key
  grammar?: string;    // grammar: topic title
  lesson?: string;     // basics: lesson id
}

export interface PathState {
  placed: string | null;   // starting level from the placement test (null = not taken)
  skippedTest: boolean;    // chose "start from scratch"
  done: string[];          // finished step ids (basics, practice, grammar, rewards)
  v?: number;              // path version (2 = basics + practice steps)
}

const KEY = (lang: string) => `wordup-path-v1-${lang}`;
export const PATH_VERSION = 2;

export function loadPath(lang: string): PathState {
  try {
    const s = JSON.parse(localStorage.getItem(KEY(lang)) as string);
    if (s && Array.isArray(s.done)) return { placed: s.placed ?? null, skippedTest: !!s.skippedTest, done: s.done, v: s.v };
  } catch { /* fresh */ }
  return { placed: null, skippedTest: false, done: [], v: PATH_VERSION };
}
export function savePath(lang: string, s: PathState) {
  localStorage.setItem(KEY(lang), JSON.stringify(s));
}

/** Build the whole path for the current course content. */
export function buildSteps(): Step[] {
  const steps: Step[] = [];
  let sinceChest = 0;
  // every 5 learning steps a treasure chest
  const push = (st: Step) => {
    steps.push(st);
    if (++sinceChest === 5) {
      sinceChest = 0;
      steps.push({ id: `c:${st.id}`, kind: "chest", level: st.level, title: "Chest", emoji: "🎁" });
    }
  };

  // Basics: the very first steps for learners starting from zero
  for (const l of BASICS) {
    push({ id: `b:${l.id}`, kind: "basics", level: BASICS_LEVEL, lesson: l.id, title: l.title, emoji: l.emoji });
  }
  steps.push({ id: `t:${BASICS_LEVEL}`, kind: "trophy", level: BASICS_LEVEL, title: BASICS_LEVEL, emoji: "🏆" });
  sinceChest = 0;

  for (const level of LEVELS) {
    const total = wordsForKey(level).length;
    if (!total) continue;
    const parts = Math.ceil(total / PART_SIZE);
    const grammar = [...(LEVEL_GRAMMAR[level] || [])].filter(g => GRAMMAR_DRILLS[g]);
    for (let i = 0; i < parts; i++) {
      const key = partKey(level, i);
      push({ id: `w:${level}:${i}`, kind: "words", level, key, title: `${level} · ${i + 1}`, emoji: "📘" });
      // the same words, used in sentences
      push({ id: `p:${level}:${i}`, kind: "practice", level, key, title: `${level} · ${i + 1}`, emoji: "🧩" });
      // after every second part: a grammar lesson (while there are any)
      if (i % 2 === 1) {
        const g = grammar.shift();
        if (g) push({ id: `g:${g}`, kind: "grammar", level, grammar: g, title: g, emoji: "💡" });
      }
    }
    // any grammar topics left for this level go at its end
    for (const g of grammar) push({ id: `g:${g}`, kind: "grammar", level, grammar: g, title: g, emoji: "💡" });
    // level finished: a trophy
    steps.push({ id: `t:${level}`, kind: "trophy", level, title: level, emoji: "🏆" });
    sinceChest = 0;
  }
  return steps;
}

const WORDS_DONE = 0.8; // a word step counts as done at 80% known

export function isStepDone(step: Step, p: Progress, s: PathState): boolean {
  if (step.level === BASICS_LEVEL) {
    // placed at A2 or higher: the basics are clearly known already
    if (s.placed && s.placed !== "A1") return true;
    return s.done.includes(step.id);
  }
  if (s.placed && LEVELS.indexOf(step.level) < LEVELS.indexOf(s.placed)) return true;
  if (step.kind === "words" && step.key) {
    const total = wordsForKey(step.key).length;
    return total > 0 && knownCount(p, step.key) / total >= WORDS_DONE;
  }
  return s.done.includes(step.id);
}

/** Index of the first unfinished step (the "current" one). */
export function currentStepIndex(steps: Step[], p: Progress, s: PathState): number {
  const i = steps.findIndex(st => !isStepDone(st, p, s));
  return i === -1 ? steps.length : i;
}

/**
 * Paths saved before the Basics / Practice steps existed: don't send learners
 * back. Practice steps of word lessons already learned count as done, and so
 * do the Basics if they have learned any words at all.
 */
export function migratePath(steps: Step[], p: Progress, s: PathState): PathState {
  if (s.v === PATH_VERSION) return s;
  const done = new Set(s.done);
  let learnedAny = false;
  for (const st of steps) {
    if (st.kind !== "words" || !st.key) continue;
    if (isStepDone(st, p, s)) {
      learnedAny = true;
      done.add(st.id.replace(/^w:/, "p:"));
    }
  }
  if (learnedAny) for (const st of steps) if (st.level === BASICS_LEVEL) done.add(st.id);
  return { ...s, done: [...done], v: PATH_VERSION };
}
