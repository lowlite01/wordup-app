// Phrasal verbs, collocations and synonyms via the Datamuse API.
// rel_syn = synonyms, rel_bgb = frequent predecessors, rel_bga = frequent
// followers; phrasal verbs are followers that happen to be particles.
export interface WordCtx {
  phrasal: string[];
  colloc: string[];
  synonyms: string[];
}

const CTX_CACHE_KEY = "wordup-context-v1";
let ctxCache: Record<string, WordCtx> = {};
try {
  ctxCache = JSON.parse(localStorage.getItem(CTX_CACHE_KEY) as string) || {};
} catch {
  ctxCache = {};
}
const ctxMisses = new Set<string>();

const PARTICLES = new Set(["up", "down", "out", "off", "in", "on", "away", "back",
  "over", "through", "around", "along", "into", "about", "for", "after", "at",
  "forward", "apart", "without", "by", "with", "to"]);
const STOPWORDS = new Set(["the", "a", "an", "of", "to", "and", "or", "is", "am",
  "was", "be", "been", "being", "it", "that", "this", "these", "those", "his",
  "her", "their", "its", "my", "your", "our", "as", "at", "by", "he", "she",
  "they", "we", "i", "you", "not", "are", "were", "have", "has", "had", "but",
  "with", "from", "in", "on", "so", "if", "than", "then", "there", "who",
  "which", "what", "when", "will", "would", "can", "could", "do", "does", "did",
  "for", "any", "some", "no", "one", "two", "all", "more", "most", "other",
  "such", "own", "very", "how", "why", "where", "also", "just", "about"]);

const EMPTY: WordCtx = { phrasal: [], colloc: [], synonyms: [] };

export async function fetchWordContext(word: string, pos?: string): Promise<WordCtx> {
  const w = word.toLowerCase();
  if (ctxCache[w]) return ctxCache[w];
  if (ctxMisses.has(w)) return EMPTY;

  const get = (url: string) =>
    fetch(url).then(r => (r.ok ? r.json() : [])).catch(() => null);
  const q = encodeURIComponent(w);
  const [syn, before, after] = await Promise.all([
    get(`https://api.datamuse.com/words?rel_syn=${q}&max=10`),
    get(`https://api.datamuse.com/words?rel_bgb=${q}&max=15`),
    get(`https://api.datamuse.com/words?rel_bga=${q}&max=30`),
  ]);
  if (!syn && !before && !after) {
    ctxMisses.add(w); // network down — don't cache permanently
    return EMPTY;
  }
  const clean = (list: { word: string }[] | null) =>
    (list || []).map(x => x.word).filter(x => /^[a-z'-]+$/.test(x));

  const phrasal = (pos || "").includes("verb")
    ? clean(after).filter(x => PARTICLES.has(x)).slice(0, 6).map(x => `${w} ${x}`)
    : [];
  const colloc = [
    ...clean(before).filter(x => !STOPWORDS.has(x)).slice(0, 5).map(x => `${x} ${w}`),
    ...clean(after).filter(x => !STOPWORDS.has(x) && !PARTICLES.has(x)).slice(0, 5).map(x => `${w} ${x}`),
  ];
  const synonyms = clean(syn).slice(0, 10);

  ctxCache[w] = { phrasal, colloc, synonyms };
  localStorage.setItem(CTX_CACHE_KEY, JSON.stringify(ctxCache));
  return ctxCache[w];
}
