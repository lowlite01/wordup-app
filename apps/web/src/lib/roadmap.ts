import type { Progress, Word } from "../types";
import { LEVELS, PART_SIZE, knownCount, partKey, shuffle, wordsForKey } from "./groups";
import { GRAMMAR_DRILLS, LEVEL_GRAMMAR } from "./grammarDrills";

// The learning path ("roadmap"): a long chain of small steps, level by level.
//   words     — learn a part (12 words) of the level's core vocabulary
//   grammar   — read a rule, then a short practice quiz
//   sentences — fill gaps / build sentences from the examples of recent words
// A placement test sets a starting level; everything below it counts as done.

export type StepKind = "words" | "grammar" | "sentences" | "chest" | "trophy";

// Crystals for reward steps: a chest every few steps, a trophy per level.
export const STEP_REWARD: Partial<Record<StepKind, number>> = { grammar: 3, sentences: 3, chest: 5, trophy: 15 };

export interface Step {
  id: string;          // stable id, also used to remember finished steps
  kind: StepKind;
  level: string;
  title: string;
  emoji: string;
  key?: string;        // words: the part key to study
  grammar?: string;    // grammar: topic title
  sourceKeys?: string[]; // sentences: parts whose examples are used
}

export interface PathState {
  placed: string | null;   // starting level from the placement test (null = not taken)
  skippedTest: boolean;    // chose "start from scratch"
  done: string[];          // finished grammar / sentence step ids
}

const KEY = (lang: string) => `wordup-path-v1-${lang}`;

export function loadPath(lang: string): PathState {
  try {
    const s = JSON.parse(localStorage.getItem(KEY(lang)) as string);
    if (s && Array.isArray(s.done)) return { placed: s.placed ?? null, skippedTest: !!s.skippedTest, done: s.done };
  } catch { /* fresh */ }
  return { placed: null, skippedTest: false, done: [] };
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
  for (const level of LEVELS) {
    const total = wordsForKey(level).length;
    if (!total) continue;
    const parts = Math.ceil(total / PART_SIZE);
    const grammar = [...(LEVEL_GRAMMAR[level] || [])].filter(g => GRAMMAR_DRILLS[g]);
    for (let i = 0; i < parts; i++) {
      push({
        id: `w:${level}:${i}`, kind: "words", level, key: partKey(level, i),
        title: `${level} · ${i + 1}`, emoji: "📘",
      });
      // after every second part: a grammar lesson (if any left) + sentence practice
      const pairEnd = i % 2 === 1 || i === parts - 1;
      if (pairEnd) {
        const g = grammar.shift();
        if (g) push({ id: `g:${g}`, kind: "grammar", level, grammar: g, title: g, emoji: "💡" });
        const from = i % 2 === 1 ? i - 1 : i;
        push({
          id: `s:${level}:${i}`, kind: "sentences", level,
          sourceKeys: Array.from({ length: i - from + 1 }, (_, k) => partKey(level, from + k)),
          title: "Sentences", emoji: "💬",
        });
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

// ---------------- Sentence exercises ----------------
export type SentenceEx =
  | { type: "gap"; before: string; after: string; answer: string; options: string[]; def: string }
  | { type: "order"; words: string[]; answer: string; def: string };

function escapeRe(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

// Find the word (or a form of it: achieve → achieved) inside its example.
function findInExample(w: Word): RegExpMatchArray | null {
  const exact = w.example.match(new RegExp(`\\b${escapeRe(w.word)}\\b`, "i"));
  if (exact) return exact;
  if (w.word.includes(" ") || w.word.length < 4) return null;
  return w.example.match(new RegExp(`\\b${escapeRe(w.word.slice(0, -1))}\\w*`, "i"));
}

export function buildSentenceExercises(keys: string[], count = 6): SentenceEx[] {
  const words = keys.flatMap(k => wordsForKey(k)).filter(w => w.example);
  const pool = shuffle([...words]);
  const out: SentenceEx[] = [];
  for (const w of pool) {
    if (out.length >= count) break;
    const wantOrder = out.length % 2 === 1;
    const tokens = w.example.split(/\s+/).filter(Boolean);
    if (wantOrder && tokens.length >= 3 && tokens.length <= 9) {
      let shuffled = shuffle([...tokens]);
      if (shuffled.join(" ") === tokens.join(" ")) shuffled = [...tokens].reverse();
      out.push({ type: "order", words: shuffled, answer: tokens.join(" "), def: w.def });
      continue;
    }
    const m = findInExample(w);
    if (!m || m.index === undefined) continue;
    let others = shuffle(words.filter(o => o.word !== w.word)).slice(0, 3).map(o => o.word);
    if (others.length < 3) continue;
    // Gap at the start of the sentence: capitalise every option, otherwise the
    // only capitalised one gives the answer away.
    if (/^[A-Z]/.test(m[0])) others = others.map(o => o[0].toUpperCase() + o.slice(1));
    out.push({
      type: "gap",
      before: w.example.slice(0, m.index),
      after: w.example.slice(m.index + m[0].length),
      answer: m[0],
      options: shuffle([m[0], ...others]),
      def: w.def,
    });
  }
  return out;
}

// ---------------- Placement test ----------------
export interface PlacementQ {
  level: string;
  prompt: string;      // the word, or a gapped sentence
  kind: "word" | "grammar";
  options: string[];
  answer: number;
}

// 3 questions per level: 2 "what does this word mean?" + 1 grammar (if any).
export function placementQuestions(level: string): PlacementQ[] {
  const words = wordsForKey(level).filter(w => w.def);
  const qs: PlacementQ[] = [];
  const picks = shuffle([...words]).slice(0, LEVEL_GRAMMAR[level]?.length ? 2 : 3);
  for (const w of picks) {
    const wrong = shuffle(words.filter(o => o.word !== w.word && o.def !== w.def)).slice(0, 3).map(o => o.def);
    const options = shuffle([w.def, ...wrong]);
    qs.push({ level, prompt: w.word, kind: "word", options, answer: options.indexOf(w.def) });
  }
  const g = LEVEL_GRAMMAR[level]?.[0];
  if (g) {
    const drill = shuffle([...GRAMMAR_DRILLS[g]])[0];
    qs.push({ level, prompt: drill.q, kind: "grammar", options: drill.options, answer: drill.answer });
  }
  return qs;
}

/** Levels the test walks through, easiest first. */
export const PLACEMENT_LEVELS = ["A1", "A2", "B1", "B2", "C1"];
