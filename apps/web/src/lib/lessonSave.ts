// Remembers an unfinished lesson (which exercise you were on, the queue with
// retries, the score) so closing the app or leaving the lesson doesn't send
// you back to the first question.
const PREFIX = "wordup-lesson-";

export function loadLesson<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(PREFIX + key) as string) as T | null;
  } catch {
    return null;
  }
}
export function saveLesson(key: string, state: unknown) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(state)); } catch { /* storage full / private mode */ }
}
export function clearLesson(key: string) {
  try { localStorage.removeItem(PREFIX + key); } catch { /* ignore */ }
}
