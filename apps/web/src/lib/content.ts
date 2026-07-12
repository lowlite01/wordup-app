import { api } from "./api";
import { setContent } from "./groups";

// Loads word content from the server so admin edits show up in the app.
// Applies any cached copy immediately, then refreshes from the API. If the
// API is unreachable, the bundled static data (already in groups.ts) stays.
// setContent() merges topic level-2 words into the topic, so the app shows a
// single entry per topic. Content is cached per course language so switching
// between English and German is instant.
const CACHE_PREFIX = "wordup-content-";

export async function loadContent(lang: "en" | "de" = "en"): Promise<void> {
  const cacheKey = CACHE_PREFIX + lang;
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) as string);
    if (cached?.wordGroups) setContent(cached.wordGroups, cached.topicLevel2 || {});
  } catch {
    // no/invalid cache — ignore
  }
  try {
    const c = await api.getContent(lang);
    if (c?.wordGroups) {
      setContent(c.wordGroups, c.topicLevel2 || {});
      localStorage.setItem(cacheKey, JSON.stringify(c));
    }
  } catch {
    // offline — keep cache/static
  }
}
