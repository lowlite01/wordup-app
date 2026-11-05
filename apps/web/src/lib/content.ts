import { api } from "./api";
import { CONTENT_CACHE_KEY, hasCachedContent, setContent } from "./groups";

// Word content comes from the server (so admin edits show up) and is cached
// on the device; groups.ts applies that cache synchronously at start-up.
// Only on the very first launch (no cache yet) the bundled word list is
// fetched — as a separate chunk, so it doesn't weigh down every start.
export async function loadContent(onUpdate: () => void): Promise<void> {
  let fromServer = false;
  if (hasCachedContent) onUpdate();
  else {
    import("../data/words")
      .then(m => { if (!fromServer) { setContent(m.WORD_GROUPS, m.TOPIC_LEVEL2); onUpdate(); } })
      .catch(() => { /* offline and no cache: built-in topics only */ });
  }
  // leftovers of the removed German course
  for (const k of ["wordup-content-de", "wordup-plan-v1-de", "wordup-path-v1-de"]) localStorage.removeItem(k);
  try {
    const c = await api.getContent();
    if (c?.wordGroups) {
      fromServer = true;
      setContent(c.wordGroups, c.topicLevel2 || {});
      localStorage.setItem(CONTENT_CACHE_KEY, JSON.stringify(c));
      onUpdate();
    }
  } catch {
    // offline — keep the cache / bundled copy
  }
}
