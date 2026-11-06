import type { Word } from "../types";
import { shuffle, wordsForKey } from "./groups";

// One exercise format shared by the "Basics" lessons and the "Practice"
// steps of the path (both run in ExerciseRunner).
//   choice — pick one option (prompt may mark a word as **word**)
//   build  — tap word tiles to build a sentence (from a Russian hint)
//   type   — type the missing word yourself
export type Exercise =
  | { type: "choice"; task?: string; prompt: string; hint?: string; options: string[]; answer: number; explain?: string }
  | { type: "build"; task?: string; hint: string; answer: string; extra?: string[]; explain?: string }
  | { type: "type"; task?: string; prompt: string; hint?: string; answer: string; alts?: string[]; explain?: string };

/** Lower-case, no punctuation, single spaces — for comparing answers. */
export const norm = (s: string) =>
  s.toLowerCase().replace(/[’`]/g, "'").replace(/[^\p{L}\p{N}' ]/gu, " ").replace(/\s+/g, " ").trim();

/** Choice exercise with the right option first in `options` → shuffled copy. */
export function choice(prompt: string, options: string[], extra: Partial<Extract<Exercise, { type: "choice" }>> = {}): Exercise {
  const right = options[0];
  const shuffled = shuffle([...options]);
  return { type: "choice", prompt, options: shuffled, answer: shuffled.indexOf(right), ...extra };
}

// Tiles for a build exercise: the sentence's words + a few distractors.
export function buildTiles(ex: Extract<Exercise, { type: "build" }>): string[] {
  const words = ex.answer.replace(/[.,!?]/g, "").split(/\s+/).filter(Boolean);
  let tiles = shuffle([...words, ...(ex.extra ?? [])]);
  if (tiles.join(" ") === words.join(" ")) tiles = [...tiles].reverse();
  return tiles;
}

// ---------------- "Practice" step: the words of one lesson in context ----------------

function escapeRe(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

// Find the word (or a form of it: achieve → achieved) inside its example.
function findInExample(w: Word): RegExpMatchArray | null {
  const exact = w.example.match(new RegExp(`\\b${escapeRe(w.word)}\\b`, "i"));
  if (exact) return exact;
  if (w.word.includes(" ") || w.word.length < 4) return null;
  return w.example.match(new RegExp(`\\b${escapeRe(w.word.slice(0, -1))}\\w*`, "i"));
}

/**
 * 8 exercises with the words of a path part, rotating the kinds:
 * meaning in a sentence → pick the word for the gap → build the sentence →
 * type the word yourself. `tr` gives the learner-facing translation.
 */
export function practiceExercises(key: string, tr: (w: Word) => string, t: {
  context: string; gap: string; build: string; typeIt: string;
}, count = 8): Exercise[] {
  const words = wordsForKey(key).filter(w => w.example && findInExample(w));
  if (words.length < 4) return [];
  const kinds = ["context", "gap", "build", "type"] as const;
  const out: Exercise[] = [];
  const pool = shuffle([...words]);
  for (let i = 0; out.length < count && i < pool.length * 2; i++) {
    const w = pool[i % pool.length];
    const m = findInExample(w)!;
    const before = w.example.slice(0, m.index);
    const after = w.example.slice(m.index! + m[0].length);
    // other words of the lesson as wrong options — no two with the same translation
    const seen = new Set([tr(w), w.word.toLowerCase()]);
    const others = shuffle(words.filter(o => o.word !== w.word)).filter(o => {
      const k = tr(o);
      if (seen.has(k) || seen.has(o.word.toLowerCase())) return false;
      seen.add(k); seen.add(o.word.toLowerCase());
      return true;
    });
    const kind = kinds[out.length % kinds.length];
    if (kind === "context") {
      out.push(choice(`${before}**${m[0]}**${after}`, [tr(w), ...others.slice(0, 3).map(tr)], { task: t.context }));
    } else if (kind === "gap") {
      let opts = others.slice(0, 3).map(o => o.word);
      // gap at the start of a sentence: capitalise all options so none stands out
      if (/^[A-Z]/.test(m[0])) opts = opts.map(o => o[0].toUpperCase() + o.slice(1));
      out.push(choice(`${before}___${after}`, [m[0], ...opts], { task: t.gap, hint: tr(w) }));
    } else if (kind === "build") {
      const n = w.example.split(/\s+/).length;
      if (n < 3 || n > 10) { out.push(choice(`${before}**${m[0]}**${after}`, [tr(w), ...others.slice(0, 3).map(tr)], { task: t.context })); continue; }
      out.push({ type: "build", task: t.build, hint: `${w.word} — ${tr(w)}`, answer: w.example });
    } else {
      out.push({
        type: "type", task: t.typeIt, prompt: `${before}___${after}`,
        hint: `${tr(w)} · ${m[0][0]}…`, answer: m[0], alts: [w.word],
      });
    }
  }
  return out;
}
