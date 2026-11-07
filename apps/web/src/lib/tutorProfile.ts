import type { Progress, QuizStats } from "../types";
import { currentStepIndex, isStepDone, type PathState, type Step } from "./roadmap";
import { wordTime } from "./wordTimes";

// A short picture of where the learner is, sent with every tutor message so
// the tutor talks at the right level and reuses the learner's own words.
export interface LearnerProfile {
  level: string;          // level of the current path step (A0…C2)
  knownCount: number;     // words marked as known
  recentWords: string[];  // last learned words
  learningWords: string[];// words still being learned
  weakWords: string[];    // words most often answered wrong
  topics: string[];       // grammar / basics topics passed (latest last)
  nextTopic: string | null;
}

const recentFirst = (map: Record<string, string[]>) =>
  Object.entries(map)
    .flatMap(([key, words]) => words.map(w => ({ w, ts: wordTime(key, w) })))
    .sort((a, b) => b.ts - a.ts)
    .map(x => x.w);

const uniq = (a: string[]) => [...new Set(a)];

export function learnerProfile(steps: Step[], path: PathState, progress: Progress, stats: QuizStats): LearnerProfile {
  const cur = currentStepIndex(steps, progress, path);
  const step = steps[Math.min(cur, steps.length - 1)];
  const known = recentFirst(progress.known);
  const weak = Object.entries(stats)
    .filter(([, s]) => s.wrong > s.right)
    .sort(([, a], [, b]) => (b.wrong - b.right) - (a.wrong - a.right))
    .map(([w]) => w);
  const topics = steps
    .filter(s => (s.kind === "grammar" || s.kind === "basics") && isStepDone(s, progress, path))
    .map(s => s.title);
  return {
    level: step?.level ?? path.placed ?? "A1",
    knownCount: known.length,
    recentWords: uniq(known).slice(0, 15),
    learningWords: uniq(recentFirst(progress.learning)).slice(0, 10),
    weakWords: weak.slice(0, 8),
    topics: topics.slice(-6),
    nextTopic: step && (step.kind === "grammar" || step.kind === "basics") ? step.title : null,
  };
}

export interface Starter { label: string; text: string }

/** Conversation starters that fit the learner: label in the UI language, the message in English. */
export function startersFor(p: LearnerProfile, ru: boolean): Starter[] {
  const beginner = p.level === "A0" || p.level === "A1";
  const out: Starter[] = [];
  out.push({
    label: ru ? "Просто поболтать" : "Just chat",
    text: beginner ? "Hi! How are you?" : "Hi! Let's talk about my day.",
  });
  const words = (p.weakWords.length >= 3 ? p.weakWords : p.recentWords).slice(0, 4);
  if (words.length >= 3) {
    out.push({
      label: ru ? "Потренировать мои слова" : "Practise my words",
      text: `Help me practise these words: ${words.join(", ")}.`,
    });
  }
  const topic = p.topics[p.topics.length - 1];
  if (topic && /^[A-Za-z]/.test(topic)) {
    out.push({ label: ru ? `Повторить: ${topic}` : `Review: ${topic}`, text: `Give me a short exercise on ${topic}.` });
  } else {
    out.push({
      label: ru ? "Проверить моё предложение" : "Check my sentence",
      text: beginner ? "Check my sentence: She have a cat." : "Check my sentence: Yesterday I go to the cinema.",
    });
  }
  out.push({
    label: ru ? "Новые слова на мой уровень" : "New words for my level",
    text: beginner ? "Teach me 5 easy words about food." : `Teach me 5 useful ${p.level} words about travelling.`,
  });
  return out;
}
