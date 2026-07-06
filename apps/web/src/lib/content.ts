import { api } from "./api";
import { setContent } from "./groups";

// Loads word content from the server so admin edits show up in the app.
// Applies any cached copy immediately, then refreshes from the API. If the
// API is unreachable, the bundled static data (already in groups.ts) stays.
const CACHE_KEY = "wordup-content-v1";

export async function loadContent(): Promise<void> {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) as string);
    if (cached?.wordGroups) setContent(cached.wordGroups, cached.topicLevel2 || {});
  } catch {
    // no/invalid cache — ignore
  }
  try {
    const c = await api.getContent();
    if (c?.wordGroups) {
      setContent(c.wordGroups, c.topicLevel2 || {});
      localStorage.setItem(CACHE_KEY, JSON.stringify(c));
    }
  } catch {
    // offline — keep cache/static
  }
}
